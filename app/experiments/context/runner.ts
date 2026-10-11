import { createHash, randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, openSync, writeSync, fsyncSync, closeSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname, join } from 'node:path';
import { BudgetLedger } from '../../server/budget.ts';
import { boundedFetch, paidCall } from '../../server/provider.ts';
import { AppError, object } from '../../server/validation.ts';
import { CONTEXT_PROMPT, requireLabels, schedule, scoreContext, validateContext, type ContextCase, type ContextTask, type Variant } from './core.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const FROZEN_PATHS = ['experiments/context/cases.json', 'experiments/context/config.json', 'experiments/context/user-labels.json', 'experiments/context/core.ts', 'experiments/context/runner.ts', 'server/provider.ts', 'server/budget.ts'];
const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const read = (path: string) => JSON.parse(readFileSync(join(root, path), 'utf8').replace(/^\uFEFF/, '')) as unknown;
export function prepareExperiment() {
  const labels = requireLabels(read('experiments/context/user-labels.json'));
  const suite = object(read('experiments/context/cases.json'));
  const cases = suite.cases as ContextCase[];
  if (!Array.isArray(cases) || cases.length !== 10 || new Set(cases.map(entry => entry.id)).size !== 10 || ['needs-history', 'no-history-needed', 'stale-or-conflicting'].some((group, i) => cases.filter(entry => entry.group === group).length !== [4, 3, 3][i])) throw new AppError('实验集必须固定为4/3/3共10例。');
  for (const raw of labels) {
    const label = object(raw); const entry = cases.find(entry => entry.id === label.caseId); const gold = object(label.yourGold);
    if (!entry || JSON.stringify(entry.goldA) !== JSON.stringify(gold.goldA) || JSON.stringify(entry.goldB) !== JSON.stringify(gold.goldB)) throw new AppError('用户核对gold与实验集不一致，拒绝付费。');
  }
  for (const entry of cases) {
    if (!entry.current?.messageId || !entry.current.text || !Array.isArray(entry.history) || entry.history.length < 1 || entry.history.length > 2 || new Set([entry.current.messageId, ...entry.history.map(message => message.messageId)]).size !== entry.history.length + 1) throw new AppError('实验可见消息ID或选中历史无效。');
  }
  const config = object(read('experiments/context/config.json'));
  if (config.rounds !== 3 || config.maxCalls !== 60 || config.max_tokens !== 4096 || config.requestBytes !== 16384 || config.model !== 'deepseek-flash' || config.stage !== 'experiment') throw new AppError('预注册配置无效。');
  const files = Object.fromEntries(FROZEN_PATHS.map(path => [path, hash(readFileSync(join(root, path)))]));
  return { cases, config, manifest: { version: 'context-freeze-v1', files, promptHash: hash(CONTEXT_PROMPT), planHash: hash(JSON.stringify(schedule(cases).map(({ round, entry, variant }) => ({ round, caseId: entry.id, variant })))) } };
}
type ResponseEvidence = { requestedModel: unknown; returnedModel: string | null; budgetReserved: boolean; modelRequested: boolean; failureStage: string; responseContent?: string; responseBody?: string; usage?: Record<string, unknown>; sensitiveEvidenceBlocked?: boolean };
async function analyze(entry: ContextCase, variant: Variant, key: string, config: Record<string, unknown>, evidence: ResponseEvidence, fetcher: typeof fetch) {
  const started = performance.now();
  const body = JSON.stringify({ model: config.model, temperature: config.temperature, max_tokens: config.max_tokens, thinking: config.thinking, response_format: config.response_format, stream: false, messages: [{ role: 'system', content: CONTEXT_PROMPT }, { role: 'user', content: JSON.stringify({ current: entry.current, selectedHistory: variant === 'B' ? entry.history : [] }) }] });
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 45_000);
  try {
    evidence.failureStage = 'request-validation';
    const response = await boundedFetch(async (url, options) => { evidence.modelRequested = true; evidence.failureStage = 'network'; return fetcher(url, options); })('https://api.deepseek.com/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body, signal: controller.signal });
    evidence.failureStage = 'http';
    if (!response.ok) { await response.body?.cancel(); throw new AppError('模型请求失败。', 502); }
    if (!response.body) throw new AppError('模型空响应。', 502);
    const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let bytes = 0;
    try {
      while (true) { const part = await reader.read(); if (part.done) break; bytes += part.value.byteLength; if (bytes > 262144) throw new AppError('模型响应过大。', 502); chunks.push(part.value); }
    } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
    const responseBody = Buffer.concat(chunks).toString('utf8');
    if (responseBody.includes(key)) { evidence.sensitiveEvidenceBlocked = true; evidence.failureStage = 'sensitive-evidence'; throw new AppError('响应含敏感信息，证据已隔离。', 502); }
    evidence.failureStage = 'envelope-json'; evidence.responseBody = responseBody;
    const envelope = object(JSON.parse(responseBody));
    evidence.failureStage = 'envelope';
    evidence.returnedModel = typeof envelope.model === 'string' ? envelope.model.slice(0, 200) : null;
    const usage = object(envelope.usage);
    if (['prompt_tokens', 'completion_tokens', 'total_tokens'].some(name => !Number.isSafeInteger(usage[name]) || Number(usage[name]) < 0)) throw new AppError('模型用量无效。', 502);
    evidence.usage = Object.fromEntries(['prompt_tokens', 'completion_tokens', 'total_tokens'].map(name => [name, usage[name]]));
    if (!Array.isArray(envelope.choices) || envelope.choices.length !== 1) throw new AppError('模型choices无效。', 502);
    const choice = object(envelope.choices[0]);
    if (choice.finish_reason !== 'stop') throw new AppError('模型输出未完整结束。', 502);
    const content = object(choice.message).content;
    if (typeof content !== 'string') throw new AppError('模型内容无效。', 502);
    evidence.responseContent = content;
    evidence.failureStage = 'content-json'; const parsed: unknown = JSON.parse(content);
    evidence.failureStage = 'schema'; const tasks: ContextTask[] = validateContext(parsed, entry, variant);
    evidence.failureStage = 'none';
    return { tasks, elapsedMs: Math.round(performance.now() - started) };
  } finally { clearTimeout(timer); }
}
export async function executeContextPlan(cases: ContextCase[], config: Record<string, unknown>, key: string, ledger: Parameters<typeof paidCall>[0], checkpoint: (data: Record<string, unknown>) => void, id: string, fetcher: typeof fetch = fetch) {
  const results: (ResponseEvidence & { caseId: string; round: number; variant: Variant; ok: boolean; elapsedMs: number; score?: ReturnType<typeof scoreContext> })[] = [];
    for (const item of schedule(cases)) {
      const started = performance.now();
      const evidence: ResponseEvidence = { requestedModel: config.model, returnedModel: null, budgetReserved: false, modelRequested: false, failureStage: 'budget' };
      try {
        const result = await paidCall(ledger, 'experiment', `context_${id}`, () => { evidence.budgetReserved = true; return analyze(item.entry, item.variant, key, config, evidence, fetcher); });
        const scored = { ...evidence, caseId: item.entry.id, round: item.round, variant: item.variant, ok: true, semanticReview: 'pending', elapsedMs: result.elapsedMs, score: scoreContext(item.entry, item.variant, result.tasks) };
        checkpoint({ type: 'result', ...scored, tasks: result.tasks }); results.push(scored);
      } catch {
        const failed = { ...evidence, caseId: item.entry.id, round: item.round, variant: item.variant, ok: false, elapsedMs: Math.round(performance.now() - started) };
        checkpoint({ type: 'result', ...failed, semanticReview: 'pending', error: '此计划项失败；阶段与安全合成响应证据已记录，不重试，不保存认证信息或原始异常。' }); results.push(failed);
      }
    }
    const latencies = results.map(result => result.elapsedMs).sort((a, b) => a - b);
    const report = {
      status: results.some(result => result.modelRequested) ? 'model-requests-recorded-semantics-pending' : 'no-model-requests-recorded', casePairs: cases.length, repetitions: 3, planned: results.length,
      modelRequestCount: results.filter(result => result.modelRequested).length, budgetReservedCount: results.filter(result => result.budgetReserved).length,
      succeeded: results.filter(result => result.ok).length, failed: results.filter(result => !result.ok).length,
      latencyAllAttemptsMedianMs: (latencies[Math.floor((latencies.length - 1) / 2)] + latencies[Math.floor(latencies.length / 2)]) / 2, latencyAllAttemptsP95Ms: latencies[Math.ceil(latencies.length * 0.95) - 1],
      budgetReservedFenUpperBound: results.filter(result => result.budgetReserved).length * 20, semanticReview: 'pending',
      groups: ['A', 'B'].map(variant => ({ variant, visibleFaithful: null, fullContextComplete: null, wrongCertain: null, wrongAssociation: null, denominator: cases.length * 3 })),
      lexicalPrecheckGroups: ['A', 'B'].map(variant => ({
        variant, matchesVisibleGold: results.filter(result => result.variant === variant && result.score?.lexicalPrecheck.matchesVisibleGold).length,
        matchesFullGold: results.filter(result => result.variant === variant && result.score?.lexicalPrecheck.matchesFullGold).length,
        unsupportedFieldFlags: results.filter(result => result.variant === variant).reduce((sum, result) => sum + (result.score?.lexicalPrecheck.unsupportedFieldFlags ?? 0), 0),
        forbiddenTermFlags: results.filter(result => result.variant === variant).reduce((sum, result) => sum + (result.score?.lexicalPrecheck.forbiddenTermFlags ?? 0), 0),
        note: 'Word matching only; cannot reliably judge extra actions or negation.'
      })),
      conservativeKnownCostYuan: results.reduce((sum, result) => sum + (Number(result.usage?.prompt_tokens ?? 0) * 2 + Number(result.usage?.completion_tokens ?? 0) * 8) / 1_000_000, 0),
      costNote: 'Missing usage and unknown failures excluded from token estimate; reservations do not refund. Not an invoice.',
      humanFiveOutputs: 'pending', advancedAllSixtyOutputs: 'pending', conclusion: '全部60份按10个case配对语义复核及5份用户核对未完成；最终语义指标未知，不宣称上下文更好。'
    };
    return report;
}
export async function runExperiment() {
  if (process.env.CONTEXT_REVIEW_READY !== 'yes') throw new AppError('高级预审尚未ready，拒绝付费。', 403);
  const prepared = prepareExperiment();
  const frozen = object(read('experiments/context/frozen.json'));
  if (JSON.stringify(frozen) !== JSON.stringify(prepared.manifest)) throw new AppError('冻结hash变化，拒绝付费。', 409);
  const key = process.env.DEEPSEEK_API_KEY ?? ''; if (!key) throw new AppError('模型密钥未配置。', 503);
  const ledger = BudgetLedger.fromEnv();
  const dir = join(root, 'experiments/context/runs'); mkdirSync(dir, { recursive: true });
  const id = randomUUID(); const fd = openSync(join(dir, `${id}.jsonl`), 'wx', 0o600);
  const checkpoint = (data: Record<string, unknown>) => { const text = JSON.stringify(data); if (text.includes(key)) throw new AppError('结果含敏感信息，未写入。'); writeSync(fd, text + '\n'); fsyncSync(fd); };
  try {
    checkpoint({ type: 'header', runId: id, startedAt: new Date().toISOString(), frozen, providerRate: prepared.config.rate, plan: schedule(prepared.cases).map(({ round, entry, variant }) => ({ round, caseId: entry.id, variant })), warning: '10 paired cases repeated, not 60 independent samples; failures retained, no retries.' });
    const report = await executeContextPlan(prepared.cases, prepared.config, key, ledger, checkpoint, id);
    checkpoint({ type: 'summary', ...report }); writeFileSync(join(dir, `${id}-report.json`), JSON.stringify(report, null, 2), { flag: 'wx' });
    console.log(JSON.stringify({ runId: id, succeeded: report.succeeded, failed: report.failed, report: `experiments/context/runs/${id}-report.json` }));
  } finally { closeSync(fd); }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv[2] === '--freeze') { if (process.env.CONTEXT_REVIEW_READY !== 'yes') throw new AppError('先完成高级只读预审。', 403); writeFileSync(join(root, 'experiments/context/frozen.json'), JSON.stringify(prepareExperiment().manifest, null, 2), { flag: 'wx' }); console.log('实验已冻结，尚未调用模型。'); }
    else if (process.argv[2] === '--run') await runExperiment();
    else console.log(JSON.stringify({ mode: 'plan-only', modelCalls: 0, labelsReady: prepareExperiment().cases.length === 10, maxCalls: 60 }));
  } catch (cause) { console.error(cause instanceof AppError ? cause.message : '实验准备或运行失败；原始错误未打印。'); process.exitCode = 1; }
}
