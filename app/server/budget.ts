import { randomUUID } from 'node:crypto';
import { AppError } from './validation.ts';

export const STAGE_CAPS = { experiment: 60, recording: 3, acceptance: 2, public: 30, fault: 5 } as const;
export type BudgetStage = keyof typeof STAGE_CAPS;
const VERSION = 'cxf-fen-v1';
export const INIT_SCRIPT = `
if redis.call('EXISTS',KEYS[1]) ~= 0 then return {'exists'} end
redis.call('HSET',KEYS[1],'version',ARGV[1],'spent',0,'total',0,'experiment',0,'recording',0,'acceptance',0,'public',0,'fault',0,'endAt',0)
return {'initialized'}
`;
export const ACTIVATE_SCRIPT = `
if redis.call('TYPE',KEYS[1]).ok ~= 'hash' or redis.call('HGET',KEYS[1],'version') ~= ARGV[1] then return {'missing_or_corrupt'} end
if redis.call('HGET',KEYS[1],'endAt') ~= '0' then return {'already_activated'} end
local now=redis.call('TIME'); local ending=tonumber(now[1])*1000+math.floor(tonumber(now[2])/1000)+604800000
redis.call('HSET',KEYS[1],'endAt',string.format('%.0f',ending))
return {'activated',ending}
`;
export const RESERVE_SCRIPT = `
if redis.call('TYPE',KEYS[1]).ok ~= 'hash' then return {'missing_or_corrupt'} end
local function integer(v,max) local n=tonumber(v); if not n or n<0 or n~=math.floor(n) or n>max then return nil end; return n end
if redis.call('HGET',KEYS[1],'version') ~= ARGV[1] then return {'corrupt'} end
local spent=integer(redis.call('HGET',KEYS[1],'spent'),2000)
local total=integer(redis.call('HGET',KEYS[1],'total'),100)
local caps={experiment=60,recording=3,acceptance=2,public=30,fault=5}
if not caps[ARGV[2]] or not spent or not total or spent~=total*20 then return {'corrupt'} end
local sum=0; local counts={}
for name,cap in pairs(caps) do local n=integer(redis.call('HGET',KEYS[1],name),cap); if not n then return {'corrupt'} end; counts[name]=n; sum=sum+n end
if sum~=total then return {'corrupt'} end
local ending=integer(redis.call('HGET',KEYS[1],'endAt'),9007199254740991)
if not ending then return {'corrupt'} end
local time=redis.call('TIME'); local now=tonumber(time[1])*1000+math.floor(tonumber(time[2])/1000)
if ARGV[2]=='public' and (ending==0 or ending~=tonumber(ARGV[5]) or now>=ending) then return {'expired'} end
if spent+20>2000 or total>=100 or counts[ARGV[2]]>=caps[ARGV[2]] then return {'exhausted'} end
if redis.call('EXISTS',KEYS[2])~=0 then return {'busy'} end
local day='day:'..math.floor(now/86400000); local session='session:'..ARGV[3]
local d=0; local s=0
if ARGV[2]=='public' then
 local dv=redis.call('HGET',KEYS[1],day); local sv=redis.call('HGET',KEYS[1],session)
 d=integer(dv or '0',10); s=integer(sv or '0',3)
 if not d or not s then return {'corrupt'} end
 if d>=10 or s>=3 then return {'public_limit'} end
end
redis.call('HSET',KEYS[1],'spent',spent+20,'total',total+1,ARGV[2],counts[ARGV[2]]+1)
if ARGV[2]=='public' then redis.call('HSET',KEYS[1],day,d+1,session,s+1) end
redis.call('SET',KEYS[2],ARGV[4],'PX',100000)
return {'reserved',ARGV[4],spent+20,total+1}
`;
export const RELEASE_SCRIPT = `if redis.call('GET',KEYS[1]) == ARGV[1] then return redis.call('DEL',KEYS[1]) end return 0`;
export class BudgetLedger {
  url: string; token: string; id: string; endAt: number; fetcher: typeof fetch;
  constructor(config: { url?: string; token?: string; id?: string; endAt?: string }, fetcher: typeof fetch = fetch) {
    const endAt = config.endAt ? Date.parse(config.endAt) : 0;
    let url: URL;
    try { url = new URL(config.url ?? ''); } catch { throw new AppError('持久预算未配置，付费分析已关闭。', 503); }
    if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || !config.token || !config.id || !/^[a-zA-Z0-9_-]{1,64}$/.test(config.id) || !Number.isSafeInteger(endAt) || endAt < 0) throw new AppError('持久预算配置无效，付费分析已关闭。', 503);
    this.url = url.origin; this.token = config.token; this.id = config.id; this.endAt = endAt; this.fetcher = fetcher;
  }
  static fromEnv(env: NodeJS.ProcessEnv = process.env) { return new BudgetLedger({ url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN, id: env.BUDGET_ID, endAt: env.PUBLIC_DEMO_END_AT }); }
  key() { return `cxf:{${this.id}}:budget`; }
  async command(command: (string | number)[]) {
    try {
      const response = await this.fetcher(this.url, { method: 'POST', headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(command), signal: AbortSignal.timeout(5_000) });
      if (!response.ok) { await response.body?.cancel(); throw new Error(); }
      const text = await response.text(); if (text.length > 8192) throw new Error();
      const envelope = JSON.parse(text) as { result?: unknown; error?: unknown };
      if (envelope.error || envelope.result === undefined) throw new Error(); return envelope.result;
    } catch { throw new AppError('持久预算服务不可用，已停止付费调用。', 503); }
  }
  async initialize() {
    const result = await this.command(['EVAL', INIT_SCRIPT, 1, this.key(), VERSION]);
    if (!Array.isArray(result) || result[0] !== 'initialized') throw new AppError('预算初始化被拒绝；已有账本绝不能重置。', 409);
  }
  async activate() {
    const result = await this.command(['EVAL', ACTIVATE_SCRIPT, 1, this.key(), VERSION]);
    if (!Array.isArray(result) || result[0] !== 'activated' || !Number.isSafeInteger(result[1])) throw new AppError('公开窗口激活被拒绝；只允许一次，已有额度保持。', 409);
    this.endAt = result[1] as number; return new Date(this.endAt).toISOString();
  }
  async reserve(stage: BudgetStage, session: string) {
    if (!Object.hasOwn(STAGE_CAPS, stage) || !/^[a-zA-Z0-9_-]{1,80}$/.test(session)) throw new AppError('预算调用标识无效。', 400);
    const lease = randomUUID();
    const result = await this.command(['EVAL', RESERVE_SCRIPT, 2, this.key(), `cxf:{${this.id}}:lease`, VERSION, stage, session, lease, this.endAt]);
    if (!Array.isArray(result) || result[0] !== 'reserved' || result[1] !== lease || !Number.isSafeInteger(result[2]) || !Number.isSafeInteger(result[3])) throw new AppError('演示额度不可用或已有分析在进行；未发起模型调用。', 503);
    return lease;
  }
  async release(lease: string) { await this.command(['EVAL', RELEASE_SCRIPT, 1, `cxf:{${this.id}}:lease`, lease]); }
}
