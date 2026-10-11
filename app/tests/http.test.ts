import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { request } from 'node:http';
import { createApp } from '../server/http.ts';
import { Store } from '../server/store.ts';
import { LIMITS } from '../shared/limits.ts';

test('同源API完整链路、无效来源、敏感路径与超大body', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'chat-http-test-'));
  writeFileSync(join(dir, 'index.html'), '<!doctype html><p>test</p>');
  const store = new Store(':memory:');
  let calls = 0;
  const server = createApp({ store, key: 'synthetic-test-key', dist: dir, extractor: async () => {
    calls++;
    return { candidates: [{ id: 'candidate-http', title: '提交报名表', audience: '家长', deadlineText: '', deadlineDate: null, materials: [], evidence: ['提交报名表'], uncertainties: [] }], usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2, elapsedMs: 1 } };
  } });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const post = (path: string, body: unknown, origin = base) => fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin }, body: JSON.stringify(body) });
  try {
    assert.equal((await fetch(base)).status, 200);
    assert.equal((await post('/api/sources', { name: '班级群' }, 'https://evil.example')).status, 403);
    const badHostStatus = await new Promise<number | undefined>((resolve, reject) => {
      const req = request(base + '/api/state', { headers: { Host: 'evil.example' } }, res => { res.resume(); resolve(res.statusCode); });
      req.on('error', reject); req.end();
    });
    assert.equal(badHostStatus, 403);
    for (const path of ['/.env', '/data/tasks.sqlite', '/server/index.ts', '/../.env', '/%2e%2e/.env']) assert.equal((await fetch(base + path)).status, 404);
    const sourceResponse = await post('/api/sources', { name: '班级群' });
    assert.equal(sourceResponse.status, 201);
    const source = await sourceResponse.json();
    const input = { sourceId: source.id, text: '家长提交报名表。', referenceDate: null, role: null };
    assert.equal((await post('/api/analyze', { ...input, sourceId: 'forged-source' })).status, 400);
    assert.equal(calls, 0);
    assert.equal((await post('/api/analyze', { ...input, text: 'x'.repeat(LIMITS.bodyBytes + 1) })).status, 413);
    const chunkedStatus = await new Promise<number | undefined>((resolve, reject) => {
      const req = request(base + '/api/analyze', { method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json', 'Transfer-Encoding': 'chunked' } }, res => { res.resume(); resolve(res.statusCode); });
      req.on('error', reject); req.end(JSON.stringify({ ...input, text: 'x'.repeat(LIMITS.bodyBytes + 1) }));
    });
    assert.equal(chunkedStatus, 413);
    assert.equal((await fetch(base + '/api/sources', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"name":"无Origin"}' })).status, 403);
    const analyzed = await post('/api/analyze', input);
    assert.equal(analyzed.status, 200);
    const record = await analyzed.json();
    await post('/api/analyze', input);
    assert.equal(calls, 1);
    const edited = { title: '编辑后的任务', audience: '家长', deadlineText: '', deadlineDate: null, materials: [], uncertainties: [] };
    assert.equal((await post('/api/tasks/confirm', { importId: record.id, candidateId: 'candidate-http', edited: { ...edited, title: '' } })).status, 400);
    const confirmed = await post('/api/tasks/confirm', { importId: record.id, candidateId: 'candidate-http', edited });
    assert.equal(confirmed.status, 200);
    await post('/api/tasks/confirm', { importId: record.id, candidateId: 'candidate-http', edited });
    const state = await (await fetch(base + '/api/state')).json();
    assert.equal(state.tasks.length, 1);
    assert.equal(state.tasks[0].title, edited.title);
    assert.ok(!JSON.stringify(state).includes('synthetic-test-key'));
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); store.close(); rmSync(dir, { recursive: true }); }
});

test('任务HTTP状态/编辑/更正/删除边界与实际JSON导出一致', async () => {
  const store = new Store(':memory:');
  const source = store.createSource('合成S2来源');
  const fields = { title: '交表', audience: '家长', deadlineText: '', deadlineDate: null, materials: ['表'], uncertainties: [] };
  const usage = { promptTokens: 1, completionTokens: 1, totalTokens: 2, elapsedMs: 1 };
  const record = store.saveImport({ sourceId: source.id, text: '交表', referenceDate: null, role: null }, [{ ...fields, id: 'old', evidence: ['交表'] }], usage);
  const correction = store.saveImport({ sourceId: source.id, text: '周六交表', referenceDate: null, role: null }, [{ ...fields, id: 'new', deadlineText: '周六', evidence: ['周六交表'] }], usage);
  const task = store.confirm(record.id, 'old', fields);
  const { status: _status, revision: _revision, corrections: _corrections, ...legacy } = task;
  store.db.prepare('UPDATE tasks SET data = ? WHERE id = ?').run(JSON.stringify(legacy), task.id);
  const server = createApp({ store, key: 'synthetic-export-secret', dist: '.' });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const post = (path: string, body: unknown) => fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base }, body: JSON.stringify(body) });
  try {
    const legacyExport = await (await fetch(base + '/api/export')).json();
    assert.equal(legacyExport.tasks[0].status, 'pending'); assert.equal(legacyExport.tasks[0].revision, 0); assert.deepEqual(legacyExport.tasks[0].corrections, []);
    const done = await post('/api/tasks/status', { taskId: task.id, expectedRevision: 0, status: 'done' });
    assert.equal(done.status, 200); assert.equal((await done.json()).status, 'done');
    assert.equal((await post('/api/tasks/update', { taskId: task.id, expectedRevision: 0, edited: fields })).status, 409);
    assert.equal((await post('/api/tasks/update', { taskId: 'missing', expectedRevision: 0, edited: fields })).status, 404);
    const before = store.state();
    assert.equal((await post('/api/tasks/correct', { taskId: task.id, expectedRevision: 1, importId: correction.id, candidateId: 'forged', edited: fields })).status, 400);
    assert.deepEqual(store.state(), before);
    const corrected = await post('/api/tasks/correct', { taskId: task.id, expectedRevision: 1, importId: correction.id, candidateId: 'new', edited: { ...fields, deadlineText: '周六', sourceId: 'forged', evidence: ['forged'] } });
    assert.equal(corrected.status, 200);
    assert.equal(store.state().tasks[0].sourceId, source.id); assert.deepEqual(store.state().tasks[0].evidence, ['交表']);
    assert.equal((await post('/api/tasks/update', { taskId: task.id, expectedRevision: 2, edited: { ...fields, title: '人工编辑' } })).status, 200);
    const download = await fetch(base + '/api/export');
    assert.equal(download.status, 200); assert.match(download.headers.get('content-type') ?? '', /application\/json/);
    assert.match(download.headers.get('content-disposition') ?? '', /^attachment; filename="chat-tasks-.*\.json"$/);
    const exported = await download.json();
    assert.equal(exported.version, 1); assert.deepEqual(exported.sources, store.state().sources);
    assert.deepEqual(exported.imports, store.state().imports); assert.deepEqual(exported.tasks, store.state().tasks);
    assert.deepEqual(Object.keys(exported).sort(), ['version', 'exportedAt', 'sources', 'imports', 'tasks'].sort());
    assert.ok(!JSON.stringify(exported).includes('synthetic-export-secret'));
    assert.equal((await fetch(base + '/api/export', { headers: { Origin: 'https://evil.example' } })).status, 403);
    assert.equal((await fetch(base + '/api/tasks/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ taskId: task.id, expectedRevision: 3 }) })).status, 403);
    assert.equal((await post('/api/tasks/delete', { taskId: task.id, expectedRevision: 2 })).status, 409);
    assert.equal((await post('/api/tasks/delete', { taskId: task.id, expectedRevision: 3 })).status, 200);
    assert.equal(store.state().tasks.length, 0); assert.equal(store.state().imports.length, 2);
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); store.close(); }
});
