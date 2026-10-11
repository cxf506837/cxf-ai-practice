import { createServer } from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import type { AddressInfo } from 'node:net';
import type { Store } from './store.ts';
import { DemoSessions, PRESETS, accessMatches, readSessionCookie, sessionCookie } from './demo.ts';
import { BudgetLedger } from './budget.ts';
import { boundedFetch, paidCall } from './provider.ts';
import { extract, MODEL } from './extract.ts';
import { AppError, object, string, validateInput, validateEdited } from './validation.ts';
import { LIMITS } from '../shared/limits.ts';
import type { ImportRecord } from '../shared/types.ts';

function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body));
}
async function readBody(req: IncomingMessage): Promise<unknown> {
  if (req.headers['content-type']?.split(';')[0].trim() !== 'application/json') throw new AppError('请求需使用JSON。', 415);
  if (Number(req.headers['content-length']) > LIMITS.bodyBytes) { req.resume(); throw new AppError('消息过大，请缩短后重试。', 413); }
  let bytes = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > LIMITS.bodyBytes) throw new AppError('消息过大，请缩短后重试。', 413);
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new AppError('请求不是有效JSON。'); }
}
export function createApp(options: { store?: Store; key: string; dist: string; extractor?: typeof extract; demo?: { origin: string; accessCode: string; sessions: DemoSessions; ledger?: BudgetLedger } }) {
  const { key, demo } = options;
  if (!demo && !options.store) throw new Error('local需要本地Store。');
  if (demo && options.store) throw new Error('demo禁止连接本地Store。');
  if (demo && (new URL(demo.origin).protocol !== 'https:' || new URL(demo.origin).origin !== demo.origin)) throw new Error('demo需要固定HTTPS origin。');
  const extractor = options.extractor ?? ((input, apiKey) => demo ? extract(input, apiKey, boundedFetch()) : extract(input, apiKey));
  const dist = resolve(options.dist);
  let inFlight: { fingerprint: string; promise: Promise<ImportRecord> } | null = null;
  let demoBusy = false;
  let loginWindow = 0; let loginAttempts = 0;
  const server = createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'self'; connect-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    try {
      // Health probes carry no session/data and may use a platform-internal Host.
      if (req.url === '/health' && req.method === 'GET') { json(res, 200, { ok: true }); return; }
      const address = server.address() as AddressInfo;
      const host = demo ? new URL(demo.origin).host : `127.0.0.1:${address.port}`;
      const origin = demo?.origin ?? `http://${host}`;
      if (req.headers.host !== host || (req.headers.origin && req.headers.origin !== origin) || req.headers['sec-fetch-site'] === 'cross-site') throw new AppError('仅允许固定同源访问。', 403);
      const url = new URL(req.url ?? '/', origin);
      if (url.pathname === '/api/config' && req.method === 'GET') { json(res, 200, { mode: demo ? 'demo' : 'local' }); return; }
      if (demo && url.pathname === '/api/demo/login' && req.method === 'POST') {
        if (req.headers.origin !== origin) throw new AppError('操作需要同源Origin。', 403);
        if (Date.now() - loginWindow >= 60_000) { loginWindow = Date.now(); loginAttempts = 0; }
        if (++loginAttempts > 10) throw new AppError('登录尝试过多，请一分钟后再试。', 429);
        const body = object(await readBody(req));
        if (Object.keys(body).length !== 1 || !accessMatches(body.code, demo.accessCode)) throw new AppError('访问码不正确。', 401);
        const session = demo.sessions.create(); res.setHeader('Set-Cookie', sessionCookie(session.id)); json(res, 200, { ok: true }); return;
      }
      const session = demo?.sessions.get(readSessionCookie(req.headers.cookie));
      if (demo && url.pathname.startsWith('/api/') && !session) throw new AppError('演示会话已到期，请重新输入访问码。', 401);
      const store = session?.store ?? options.store!;
      if (demo && url.pathname === '/api/demo/presets' && req.method === 'GET') { json(res, 200, PRESETS); return; }
      if (req.method === 'POST') {
        if (req.headers.origin !== origin) throw new AppError('操作需要同源Origin。', 403);
        const body = object(await readBody(req));
        if (url.pathname === '/api/sources') { if (demo) throw new AppError('公开演示仅使用固定合成来源。', 403); json(res, 201, store.createSource(string(body.name, '来源名称', LIMITS.sourceName, true))); return; }
        if (demo && url.pathname === '/api/analyze') throw new AppError('公开演示只接受固定样例。', 403);
        if (url.pathname === '/api/analyze' || (demo && url.pathname === '/api/demo/analyze')) {
          let input;
          if (demo) {
            if (Object.keys(body).length !== 1 || typeof body.presetId !== 'string') throw new AppError('公开演示只接受presetId。');
            const preset = PRESETS.find(item => item.id === body.presetId);
            if (!preset) throw new AppError('样例不存在。');
            input = { sourceId: store.state().sources[0].id, text: preset.text, referenceDate: preset.referenceDate, role: preset.role };
          } else input = validateInput(body);
          store.assertSource(input.sourceId);
          const cached = store.findImport(input);
          if (cached) { json(res, 200, { ...cached, delivery: 'cached' }); return; }
          const fingerprint = `${input.sourceId}:${store.fingerprint(input)}`;
          let flight = session ? session.inFlight : inFlight;
          if (flight && flight.fingerprint !== fingerprint) throw new AppError('已有一条分析正在进行，请等待结束。', 409);
          if (!flight) {
            if (demo && demoBusy) throw new AppError('演示正在处理另一条分析，请稍后手动重试。', 409);
            if (demo) demoBusy = true;
            const promise = (async () => {
              try {
                const call = () => extractor(input, key);
                let result;
                if (demo && !options.extractor) {
                  if (!demo.ledger) throw new AppError('持久预算未配置，付费演示已关闭。', 503);
                  result = await paidCall(demo.ledger, 'public', session!.id, call);
                } else result = await call();
                return store.saveImport(input, result.candidates, result.usage);
              } finally { if (demo) demoBusy = false; }
            })();
            flight = { fingerprint, promise };
            if (session) session.inFlight = flight; else inFlight = flight;
          }
          const current = flight;
          try { json(res, 200, { ...await current.promise, delivery: 'live' }); } finally {
            if (session && session.inFlight === current) { session.inFlight = null; demo!.sessions.sweep(); }
            else if (inFlight === current) inFlight = null;
          }
          return;
        }
        if (url.pathname === '/api/tasks/confirm') {
          json(res, 200, store.confirm(string(body.importId, '分析记录ID', 80, true), string(body.candidateId, '候选ID', 80, true), validateEdited(body.edited))); return;
        }
        if (['/api/tasks/update', '/api/tasks/status', '/api/tasks/delete', '/api/tasks/correct'].includes(url.pathname)) {
          const taskId = string(body.taskId, '任务ID', 80, true);
          if (url.pathname === '/api/tasks/update') { json(res, 200, store.update(taskId, body.expectedRevision, body.edited)); return; }
          if (url.pathname === '/api/tasks/status') { json(res, 200, store.setStatus(taskId, body.expectedRevision, body.status)); return; }
          if (url.pathname === '/api/tasks/delete') { store.delete(taskId, body.expectedRevision); json(res, 200, { deleted: taskId }); return; }
          json(res, 200, store.correct(taskId, body.expectedRevision, string(body.importId, '分析记录ID', 80, true), string(body.candidateId, '候选ID', 80, true), body.edited)); return;
        }
        throw new AppError('接口不存在。', 404);
      }
      if (req.method !== 'GET' && req.method !== 'HEAD') throw new AppError('不支持此请求方式。', 405);
      if (url.pathname === '/api/state') { json(res, 200, { ...store.state(), mode: demo ? 'demo' : 'local', model: { name: MODEL, configured: Boolean(key) && (!demo || Boolean(demo.ledger || options.extractor)) } }); return; }
      if (url.pathname === '/api/export') {
        const exportedAt = new Date().toISOString();
        res.setHeader('Content-Disposition', `attachment; filename="chat-tasks-${exportedAt.slice(0, 10)}.json"`);
        json(res, 200, { version: 1, exportedAt, ...store.state() }); return;
      }
      // 只提供构建后的入口和assets；源码、配置、数据和任意其他路径不作SPA回退。
      const pathname = decodeURIComponent(url.pathname);
      if (pathname !== '/' && pathname !== '/index.html' && !pathname.startsWith('/assets/')) throw new AppError('文件不存在。', 404);
      const target = resolve(dist, '.' + (pathname === '/' ? '/index.html' : pathname));
      if (!target.startsWith(dist + sep)) throw new AppError('文件不存在。', 404);
      let content: Buffer;
      try { content = await readFile(target); } catch { throw new AppError('页面尚未构建或文件不存在。', 404); }
      const types: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
      res.writeHead(200, { 'Content-Type': types[extname(target)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' });
      res.end(req.method === 'HEAD' ? undefined : content);
    } catch (error) {
      if (!res.headersSent) json(res, error instanceof AppError ? error.status : 500, { error: error instanceof AppError ? error.message : '本地服务处理失败，输入已保留，请重试。' });
      else res.end();
    }
  });
  server.requestTimeout = 60_000;
  server.headersTimeout = 10_000;
  return server;
}
