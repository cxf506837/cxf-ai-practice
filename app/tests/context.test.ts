import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateContext, scoreContext, schedule, requireLabels, type ContextCase } from '../experiments/context/core.ts';
import { executeContextPlan } from '../experiments/context/runner.ts';

const entry: ContextCase = { id: 'case', group: 'needs-history', history: [{ messageId: 'old', text: '家长提交报名表。' }], current: { messageId: 'new', text: '请上述人员2026年10月14日前交该表。' }, goldA: { actionTerms: ['交'], audience: '', deadlineDate: '2026-10-14', materialTerms: ['表'] }, goldB: { actionTerms: ['交'], audience: '家长', deadlineDate: '2026-10-14', materialTerms: ['报名表'] } };
const task = { title: '交表', audience: '家长', deadlineText: '2026年10月14日前', deadlineDate: '2026-10-14', materials: ['报名表'], uncertainties: [], provenance: [{ messageId: 'old', quote: '家长提交报名表。' }, { messageId: 'new', quote: '2026年10月14日前' }] };
test('history出处通过messageId+精确quote校验，A不能引用不可见history', () => {
  assert.equal(validateContext({ tasks: [task] }, entry, 'B').length, 1);
  assert.throws(() => validateContext({ tasks: [task] }, entry, 'A'));
  assert.throws(() => validateContext({ tasks: [{ ...task, provenance: [{ messageId: 'new', quote: '伪造出处' }] }] }, entry, 'B'));
});
test('A合理不确定不算幻觉，词项预检与人工语义结论分开', () => {
  const cautious = { ...task, audience: '', materials: ['该表'], uncertainties: ['对象和材料名称需历史确认。'], provenance: [{ messageId: 'new', quote: '请上述人员2026年10月14日前交该表。' }] };
  const a = scoreContext(entry, 'A', [cautious]);
  assert.equal(a.lexicalPrecheck.matchesVisibleGold, true); assert.equal(a.lexicalPrecheck.matchesFullGold, false); assert.equal(a.lexicalPrecheck.unsupportedFieldFlags, 0);
  const wrong = scoreContext(entry, 'A', [{ ...cautious, audience: '家长' }]); assert.equal(wrong.lexicalPrecheck.unsupportedFieldFlags, 1);
  assert.equal(scoreContext(entry, 'B', [task]).lexicalPrecheck.matchesFullGold, true);
  assert.equal(a.semanticReview, 'pending'); assert.equal(a.visibleFaithful, null); assert.equal(a.fullContextComplete, null);
});
test('伪造日期原文被拒；额外动作与否定词仅预检，不冒称语义裁判', () => {
  const suite = JSON.parse(readFileSync(new URL('../experiments/context/cases.json', import.meta.url), 'utf8')) as { cases: ContextCase[] };
  const n01 = suite.cases.find(entry => entry.id === 'N01')!;
  const nTask = { ...task, title: '提交电子签到表并缴纳999元', audience: '所有志愿者', deadlineDate: '2026-10-15', deadlineText: '明天中午', materials: ['电子签到表'], provenance: [{ messageId: 'N01-current', quote: '【合成】' }] };
  assert.throws(() => validateContext({ tasks: [nTask] }, n01, 'A'));
  const scored = scoreContext(n01, 'A', [{ ...nTask, deadlineText: '2026年10月15日前' }]);
  assert.equal(scored.semanticReview, 'pending'); assert.equal(scored.visibleFaithful, null); assert.equal(scored.wrongCertain, null);
  const s02 = suite.cases.find(entry => entry.id === 'S02')!;
  const negated = { ...task, title: '发送一张电子照片，不再收纸质版', audience: '摄影社成员', deadlineText: '2026年10月20日前', deadlineDate: '2026-10-20', materials: ['一张电子照片'], provenance: [{ messageId: 'S02-current', quote: s02.current.text }] };
  assert.equal(scoreContext(s02, 'B', [negated]).wrongAssociation, null);
});
test('固定10cases分组4/3/3、AB/BA/AB三轮60调用、用户未完成gold拒付费', () => {
  const suite = JSON.parse(readFileSync(new URL('../experiments/context/cases.json', import.meta.url), 'utf8')) as { cases: ContextCase[] };
  assert.deepEqual(['needs-history', 'no-history-needed', 'stale-or-conflicting'].map(group => suite.cases.filter(item => item.group === group).length), [4, 3, 3]);
  const plan = schedule(suite.cases); assert.equal(plan.length, 60);
  assert.deepEqual(plan.slice(0, 2).map(item => item.variant), ['A', 'B']); assert.deepEqual(plan.slice(20, 22).map(item => item.variant), ['B', 'A']);
  assert.throws(() => requireLabels({ hypothesisConfirmedByUser: true, goldConfirmedByUser: false, labels: [] }));
});

test('实验格式失败保留合成输出、用量与返回模型；预算拒绝不算模型请求', async () => {
  const config = { model: 'deepseek-flash', max_tokens: 4096 };
  const ledger = { reserve: async () => 'synthetic-lease', release: async () => {} };
  for (const content of ['{broken-json', JSON.stringify({ tasks: [{ ...task, deadlineText: '不存在的日期原文' }] })]) {
    const records: Record<string, unknown>[] = [];
    const fetcher: typeof fetch = async () => Response.json({ model: 'synthetic-returned-model', choices: [{ finish_reason: 'stop', message: { content } }], usage: { prompt_tokens: 12, completion_tokens: 8, total_tokens: 20 } });
    const report = await executeContextPlan([entry], config, 'synthetic-secret', ledger, value => records.push(value), 'synthetic-run', fetcher);
    assert.equal(report.modelRequestCount, 6); assert.equal(report.budgetReservedCount, 6);
    const result = records[0]; assert.equal(result.ok, false); assert.equal(result.responseContent, content); assert.equal(result.returnedModel, 'synthetic-returned-model');
    assert.deepEqual(result.usage, { prompt_tokens: 12, completion_tokens: 8, total_tokens: 20 });
    assert.equal(result.failureStage, content === '{broken-json' ? 'content-json' : 'schema');
  }
  let called = 0;
  const denied = { reserve: async (): Promise<string> => { throw new Error('synthetic budget denial'); }, release: async () => {} };
  const records: Record<string, unknown>[] = [];
  const report = await executeContextPlan([entry], config, 'synthetic-secret', denied, value => records.push(value), 'synthetic-run', async () => { called++; throw new Error('must not run'); });
  assert.equal(called, 0); assert.equal(report.modelRequestCount, 0); assert.equal(report.budgetReservedCount, 0); assert.equal(report.status, 'no-model-requests-recorded');
  assert.ok(records.every(value => value.failureStage === 'budget' && value.modelRequested === false));
});

test('成功响应记录返回模型；含密钥的合成响应只保留隔离标志', async () => {
  const config = { model: 'deepseek-flash', max_tokens: 4096 };
  const ledger = { reserve: async () => 'synthetic-lease', release: async () => {} };
  for (const sensitive of [false, true]) {
    const records: Record<string, unknown>[] = [];
    const content = sensitive ? 'synthetic-secret' : JSON.stringify({ tasks: [] });
    const fetcher: typeof fetch = async () => Response.json({ model: 'synthetic-returned-model', choices: [{ finish_reason: 'stop', message: { content } }], usage: { prompt_tokens: 12, completion_tokens: 8, total_tokens: 20 } });
    await executeContextPlan([entry], config, 'synthetic-secret', ledger, value => records.push(value), 'synthetic-run', fetcher);
    assert.equal(records[0].ok, !sensitive);
    if (sensitive) { assert.equal(records[0].sensitiveEvidenceBlocked, true); assert.equal(records[0].responseBody, undefined); assert.equal(records[0].responseContent, undefined); assert.equal(JSON.stringify(records).includes('synthetic-secret'), false); }
    else { assert.equal(records[0].returnedModel, 'synthetic-returned-model'); assert.equal(records[0].requestedModel, 'deepseek-flash'); }
  }
});
