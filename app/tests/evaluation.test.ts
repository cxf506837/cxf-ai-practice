import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { EXTRACTION_CONFIG } from '../server/extract.ts';

const runner = await import('../scripts/evaluate.ts').catch(() => null);
const key = 'synthetic-evaluation-key-never-real';
const input = { sourceId: 'synthetic-source', text: '家长明天提交报名表。', referenceDate: null, role: '家长' };
const candidate = { title: '提交报名表', audience: '家长', deadlineText: '明天', deadlineDate: null, materials: ['报名表'], evidence: ['家长明天提交报名表'], uncertainties: [] };
const suite = (count = 2) => ({ suiteId: 'synthetic-evaluation', cases: Array.from({ length: count }, (_, index) => ({ id: `case-${index + 1}`, input, gold: [{ action: '评测器不得读取评分依据' }] })) });
function fixture(value: unknown = suite()) {
  const dir = mkdtempSync(join(tmpdir(), 'chat-evaluation-test-'));
  const path = join(dir, 'suite.json');
  writeFileSync(path, JSON.stringify(value));
  return { dir, path, outputDir: join(dir, 'results'), cleanup() {
    const target = realpathSync(dir);
    assert.ok(target.startsWith(`${realpathSync(tmpdir())}${sep}`));
    rmSync(target, { recursive: true });
  } };
}
function response(tasks: unknown[] = [candidate]) {
  return Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({ tasks }) } }], usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 } });
}
function lines(path: string): Record<string, unknown>[] {
  return readFileSync(path, 'utf8').trim().split('\n').map(line => JSON.parse(line));
}
function evaluate() {
  assert.ok(runner, '评测器模块必须存在且导入不执行请求');
  return runner.runEvaluation;
}

test('导入评测器不执行CLI或模型请求', () => {
  assert.equal(typeof runner?.runEvaluation, 'function');
});

test('逐例顺序单次请求并checkpoint，保留候选/用量及冻结hash，不发送gold', async () => {
  const f = fixture();
  let calls = 0;
  const progress: unknown[] = [];
  const fetcher: typeof fetch = async (_url, options) => {
    calls++;
    if (calls > 1) {
      const checkpoints = readdirSync(f.outputDir).flatMap(name => lines(join(f.outputDir, name)));
      assert.equal(checkpoints.filter(line => line.type === 'case').length, calls - 1);
    }
    const body = JSON.parse(options?.body as string);
    assert.equal(body.messages[1].content, JSON.stringify({ text: input.text, referenceDate: input.referenceDate, role: input.role }));
    assert.ok(!JSON.stringify(body).includes('评测器不得读取评分依据'));
    return response();
  };
  try {
    const output = await evaluate()(f.path, 2, key, { outputDir: f.outputDir, fetcher, onProgress: value => progress.push(value) });
    const records = lines(output);
    const header = records[0];
    assert.equal(calls, 4);
    assert.equal(header.type, 'header');
    assert.equal(header.suiteHash, createHash('sha256').update(readFileSync(f.path)).digest('hex'));
    assert.equal(header.extractionConfig, EXTRACTION_CONFIG);
    assert.match(header.sourceHash as string, /^[a-f0-9]{64}$/);
    const sourceFiles = header.sourceFiles as Record<string, string>;
    for (const path of ['server/extract.ts', 'server/validation.ts', 'shared/types.ts', 'shared/limits.ts', 'scripts/evaluate.ts']) {
      assert.equal(sourceFiles[path], createHash('sha256').update(readFileSync(resolve(path))).digest('hex'));
    }
    const cases = records.filter(record => record.type === 'case');
    assert.deepEqual(cases.map(record => [record.round, record.caseId]), [[1, 'case-1'], [1, 'case-2'], [2, 'case-1'], [2, 'case-2']]);
    for (const record of cases) {
      assert.equal(record.status, 'ok');
      assert.equal((record.candidates as { title: string }[])[0].title, candidate.title);
      assert.equal((record.usage as { totalTokens: number }).totalTokens, 150);
      assert.equal(record.sourceId, input.sourceId);
      assert.match(record.inputHash as string, /^[a-f0-9]{64}$/);
      assert.ok(typeof record.startedAt === 'string' && typeof record.finishedAt === 'string');
    }
    assert.deepEqual(records.at(-1)?.counts, { attempted: 4, succeeded: 4, failed: 0 });
    assert.equal(progress.length, 4);
    assert.ok(!JSON.stringify(progress).includes(input.text));
    assert.ok(!JSON.stringify(progress).includes(key));
  } finally { f.cleanup(); }
});

test('单例失败安全记录且无重试，继续其他例并保留失败', async () => {
  const f = fixture();
  let calls = 0;
  try {
    const output = await evaluate()(f.path, 1, key, { outputDir: f.outputDir, fetcher: async () => {
      calls++;
      if (calls === 1) throw new Error(`synthetic-network-private-${key}`);
      return response([]);
    } });
    const records = lines(output);
    assert.equal(calls, 2);
    assert.deepEqual(records.filter(record => record.type === 'case').map(record => record.status), ['error', 'ok']);
    assert.ok(!readFileSync(output, 'utf8').includes(key));
    assert.ok(!readFileSync(output, 'utf8').includes('synthetic-network-private'));
    assert.deepEqual(records.at(-1)?.counts, { attempted: 2, succeeded: 1, failed: 1 });
  } finally { f.cleanup(); }
});

test('非法suite/轮数在任何请求和结果文件之前拒绝，包括后面的无效输入', async () => {
  const invalid: unknown[] = [suite(0), suite(11), { ...suite(), suiteId: '../unsafe' }, { ...suite(), cases: [{ id: 'same', input }, { id: 'same', input }] }, { ...suite(), cases: [{ id: 'valid', input }, { id: 'bad', input: { ...input, referenceDate: '2026-02-30' } }] }, { ...suite(), cases: [{ id: 'unsafe\nlog', input }] }];
  let calls = 0;
  for (const value of invalid) {
    const f = fixture(value);
    try {
      await assert.rejects(evaluate()(f.path, 1, key, { outputDir: f.outputDir, fetcher: async () => { calls++; return response(); } }));
      assert.deepEqual(readdirSync(f.dir), ['suite.json']);
    } finally { f.cleanup(); }
  }
  for (const rounds of [0, 4, 1.5, NaN]) {
    const f = fixture();
    try { await assert.rejects(evaluate()(f.path, rounds, key, { outputDir: f.outputDir, fetcher: async () => { calls++; return response(); } })); }
    finally { f.cleanup(); }
  }
  assert.equal(calls, 0);
});

test('缺密钥不发请求，源hash读取也不依赖suite所在目录', async () => {
  const f = fixture();
  let calls = 0;
  try {
    for (const missing of ['', '   ']) {
      await assert.rejects(evaluate()(f.path, 1, missing, { outputDir: f.outputDir, fetcher: async () => { calls++; return response(); } }));
    }
    assert.equal(calls, 0);
    assert.deepEqual(readdirSync(f.dir), ['suite.json']);
  } finally { f.cleanup(); }
});

test('重复运行生成不同文件，旧结果字节不变；gold可任意而输入结构必须有效', async () => {
  const value = suite(1);
  const f = fixture({ ...value, cases: value.cases.map(item => ({ ...item, gold: null })) });
  try {
    const first = await evaluate()(f.path, 1, key, { outputDir: f.outputDir, fetcher: async () => response([]) });
    const bytes = readFileSync(first);
    const second = await evaluate()(f.path, 1, key, { outputDir: f.outputDir, fetcher: async () => response([]) });
    assert.notEqual(first, second);
    assert.deepEqual(readFileSync(first), bytes);
    assert.equal(readdirSync(f.outputDir).length, 2);
  } finally { f.cleanup(); }
});

test('模型返回或输入含密钥时不泄漏，且敏感输入在发请求前拒绝', async () => {
  const f = fixture(suite(1));
  try {
    const output = await evaluate()(f.path, 1, key, { outputDir: f.outputDir, fetcher: async () => response([{ ...candidate, title: key }]) });
    assert.equal(lines(output)[1].status, 'error');
    assert.ok(!readFileSync(output, 'utf8').includes(key));
  } finally { f.cleanup(); }
  const sensitive = fixture({ ...suite(1), cases: [{ id: 'secret-input', input: { ...input, text: key } }] });
  let calls = 0;
  try {
    await assert.rejects(evaluate()(sensitive.path, 1, key, { outputDir: sensitive.outputDir, fetcher: async () => { calls++; return response(); } }));
    assert.equal(calls, 0);
  } finally { sensitive.cleanup(); }
});
