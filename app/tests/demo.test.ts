import test from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { BudgetLedger, type BudgetStage } from '../server/budget.ts';
import { AppError } from '../server/validation.ts';
import type { AddressInfo } from 'node:net';
import { loadMode } from '../server/mode.ts';
import { DemoSessions, PRESETS } from '../server/demo.ts';
import { createApp } from '../server/http.ts';

test('模式缺省local，demo固定HTTPS origin；非法配置启动拒绝', () => {
  assert.equal(loadMode({}).mode, 'local');
  for (const env of [{ APP_MODE: 'oops' }, { APP_MODE: 'demo', PUBLIC_ORIGIN: 'http://example.com' }, { APP_MODE: 'demo', PUBLIC_ORIGIN: 'https://example.com/path' }]) assert.throws(() => loadMode(env));
  assert.equal(loadMode({ APP_MODE: 'demo', PUBLIC_ORIGIN: 'https://example.com', DEMO_ACCESS_CODE: 'synthetic-code' }).host, '0.0.0.0');
});

test('会话30分钟idle/2小时最大/20上限，inflight过期不提前关闭SQLite', () => {
  let now = 0;
  const sessions = new DemoSessions(() => now);
  const session = sessions.create();
  session.inFlight = { fingerprint: 'x', promise: Promise.resolve(null as never) };
  now = 31 * 60_000;
  assert.equal(sessions.get(session.id), undefined);
  assert.equal(session.closed, false);
  session.inFlight = null; sessions.sweep(); assert.equal(session.closed, true);
  for (let i = 0; i < 20; i++) sessions.create();
  assert.throws(() => sessions.create()); sessions.close();
});

test('demo鉴权与两会话隔离，严格preset，缓存零调用，更正done/初始出处', async () => {
  const sessions = new DemoSessions();
  let calls = 0;
  const server = createApp({ key: 'synthetic-key', dist: '.', demo: { origin: 'https://demo.example', accessCode: 'synthetic-code', sessions }, extractor: async input => {
    calls++;
    return { candidates: [{ id: 'candidate', title: '交表', audience: '家长', deadlineText: '', deadlineDate: null, materials: [], evidence: [input.text], uncertainties: [] }], usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2, elapsedMs: 1 } };
  } });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as AddressInfo).port;
  const send = (path: string, body?: unknown, cookie = '', origin = 'https://demo.example', host = 'demo.example') => new Promise<{ status: number; body: any; cookie: string }>((resolve, reject) => {
    const req = request({ host: '127.0.0.1', port, path, method: body === undefined ? 'GET' : 'POST', headers: { Host: host, Origin: origin, Cookie: cookie, 'Content-Type': 'application/json' } }, res => {
      let data = ''; res.on('data', chunk => data += chunk); res.on('end', () => resolve({ status: res.statusCode!, body: JSON.parse(data), cookie: res.headers['set-cookie']?.[0] ?? '' }));
    }); req.on('error', reject); req.end(body === undefined ? undefined : JSON.stringify(body));
  });
  try {
    assert.equal((await send('/health')).status, 200);
    assert.equal((await send('/api/state')).status, 401);
    assert.equal((await send('/api/export')).status, 401);
    assert.equal((await send('/api/demo/login', { code: 'bad' })).status, 401);
    const a = await send('/api/demo/login', { code: 'synthetic-code' });
    const b = await send('/api/demo/login', { code: 'synthetic-code' });
    assert.match(a.cookie, /HttpOnly; Secure; SameSite=Strict/); assert.ok(!a.cookie.includes('Domain='));
    const ca = a.cookie.split(';')[0]; const cb = b.cookie.split(';')[0];
    assert.equal((await send('/api/analyze', { text: 'custom' }, ca)).status, 403);
    assert.equal((await send('/api/demo/analyze', { presetId: PRESETS[0].id, text: 'custom' }, ca)).status, 400);
    assert.equal((await send('/api/demo/analyze', { presetId: 'custom' }, ca)).status, 400);
    assert.equal((await send('/api/state', undefined, ca, 'https://evil.example')).status, 403);
    assert.equal((await send('/api/state', undefined, ca, 'https://demo.example', 'evil.example')).status, 403);
    const record = (await send('/api/demo/analyze', { presetId: PRESETS[0].id }, ca)).body;
    assert.equal(record.delivery, 'live');
    assert.equal((await send('/api/demo/analyze', { presetId: PRESETS[0].id }, ca)).body.delivery, 'cached'); assert.equal(calls, 1);
    const fields = record.candidates[0];
    const task = (await send('/api/tasks/confirm', { importId: record.id, candidateId: fields.id, edited: fields }, ca)).body;
    assert.equal((await send('/api/tasks/confirm', { importId: record.id, candidateId: fields.id, edited: fields }, cb)).status, 404);
    assert.equal((await send('/api/tasks/status', { taskId: task.id, expectedRevision: 0, status: 'done' }, cb)).status, 404);
    await send('/api/tasks/status', { taskId: task.id, expectedRevision: 0, status: 'done' }, ca);
    const correction = (await send('/api/demo/analyze', { presetId: PRESETS[1].id }, ca)).body;
    const corrected = (await send('/api/tasks/correct', { taskId: task.id, expectedRevision: 1, importId: correction.id, candidateId: 'candidate', edited: correction.candidates[0] }, ca)).body;
    assert.equal(corrected.status, 'done'); assert.equal(corrected.importId, record.id); assert.equal(corrected.corrections.length, 1);
    assert.equal((await send('/api/export', undefined, cb)).body.tasks.length, 0);
    assert.equal((await send('/api/export', undefined, ca)).body.tasks.length, 1);
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); sessions.close(); }
});


test('服务端预算stage缺省public，仅接受验收/录制/公众；local忽略此部署选项', () => {
  const env = { APP_MODE: 'demo', PUBLIC_ORIGIN: 'https://demo.example', DEMO_ACCESS_CODE: 'synthetic-code' };
  const config = loadMode(env); assert.equal(config.mode === 'demo' && config.budgetStage, 'public');
  for (const stage of ['public', 'acceptance', 'recording']) {
    const selected = loadMode({ ...env, DEMO_BUDGET_STAGE: stage });
    assert.equal(selected.mode === 'demo' && selected.budgetStage, stage);
  }
  for (const stage of ['', 'experiment', 'fault', 'Public', ' acceptance ']) assert.throws(() => loadMode({ ...env, DEMO_BUDGET_STAGE: stage }), /DEMO_BUDGET_STAGE/);
  assert.deepEqual(loadMode({ APP_MODE: 'local', DEMO_BUDGET_STAGE: 'invalid' }), loadMode({}));
});

test('非法预算stage在服务启动前拒绝，不创建账本或监听服务', () => {
  const result = spawnSync(process.execPath, [fileURLToPath(new URL('../server/index.ts', import.meta.url))], {
    env: { APP_MODE: 'demo', PORT: '54876', PUBLIC_ORIGIN: 'https://demo.example', DEMO_ACCESS_CODE: 'synthetic-code', DEMO_BUDGET_STAGE: 'experiment' },
    encoding: 'utf8', timeout: 1500,
  });
  assert.equal(result.status, 1); assert.match(result.stderr, /DEMO_BUDGET_STAGE/); assert.ok(!result.stderr.includes('持久预算'));
});

for (const stage of [undefined, 'public', 'acceptance', 'recording'] as const) {
  test('HTTP预算stage使用服务端' + (stage ?? '缺省public') + '，客户端不能覆盖、缓存不占额、拒付不调用模型', async t => {
    const sessions = new DemoSessions();
    const reservations: { stage: BudgetStage; session: string }[] = [];
    let denied = false; let modelCalls = 0; let releases = 0;
    const ledger = new BudgetLedger({ url: 'https://budget.example', token: 'synthetic-token', id: 'test' }, async () => { throw new Error('unexpected Redis request'); });
    t.mock.method(ledger, 'reserve', async (value: BudgetStage, session: string) => { reservations.push({ stage: value, session }); if (denied) throw new AppError('合成预算拒绝。', 503); return 'synthetic-lease'; });
    t.mock.method(ledger, 'release', async (lease: string) => { assert.equal(lease, 'synthetic-lease'); releases++; });
    const fetcher: typeof fetch = async (url, options) => {
      assert.equal(String(url), 'https://api.deepseek.com/chat/completions'); modelCalls++;
      const payload = JSON.parse(String(options?.body)) as { messages: { content: string }[] };
      const input = JSON.parse(payload.messages[1].content) as { text: string };
      return Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({ tasks: [{ title: '交报名表', audience: '二年级家长', deadlineText: '', deadlineDate: null, materials: [], evidence: [input.text], uncertainties: [] }] }) } }], usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 } });
    };
    t.mock.method(globalThis, 'fetch', fetcher);
    const server = createApp({ key: 'synthetic-key', dist: '.', demo: { origin: 'https://demo.example', accessCode: 'synthetic-code', sessions, ledger, budgetStage: stage } });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const port = (server.address() as AddressInfo).port;
    const send = (path: string, body: unknown, cookie = '', headers: Record<string, string> = {}) => new Promise<{ status: number; body: Record<string, unknown>; cookie: string }>((resolve, reject) => {
      const req = request({ host: '127.0.0.1', port, path, method: 'POST', headers: { Host: 'demo.example', Origin: 'https://demo.example', Cookie: cookie, 'Content-Type': 'application/json', ...headers } }, res => {
        let data = ''; res.on('data', chunk => data += chunk); res.on('end', () => resolve({ status: res.statusCode!, body: JSON.parse(data), cookie: res.headers['set-cookie']?.[0] ?? '' }));
      }); req.on('error', reject); req.end(JSON.stringify(body));
    });
    try {
      const login = await send('/api/demo/login', { code: 'synthetic-code' }); assert.equal(login.status, 200);
      const cookie = login.cookie.split(';')[0]; const expectedStage = stage ?? 'public';
      assert.equal((await send('/api/demo/analyze', { presetId: PRESETS[0].id, stage: 'fault' }, cookie)).status, 400);
      assert.equal(reservations.length, 0); assert.equal(modelCalls, 0);
      const result = await send('/api/demo/analyze', { presetId: PRESETS[0].id }, cookie, { 'X-Demo-Budget-Stage': 'fault' });
      assert.equal(result.status, 200); assert.equal(result.body.delivery, 'live');
      assert.equal(reservations[0].stage, expectedStage); assert.equal(reservations[0].session, cookie.slice('cxf_demo='.length));
      assert.equal(modelCalls, 1); assert.equal(releases, 1);
      assert.equal((await send('/api/demo/analyze', { presetId: PRESETS[0].id }, cookie)).body.delivery, 'cached');
      assert.equal(reservations.length, 1); assert.equal(modelCalls, 1);
      denied = true;
      assert.equal((await send('/api/demo/analyze', { presetId: PRESETS[1].id }, cookie)).status, 503);
      assert.equal(reservations[1].stage, expectedStage); assert.equal(modelCalls, 1); assert.equal(releases, 1);
    } finally { await new Promise<void>(resolve => server.close(() => resolve())); sessions.close(); }
  });
}
