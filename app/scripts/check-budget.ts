// Explicit opt-in integration check: isolated Redis keys, no model request, no real budget mutation.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { BudgetLedger } from '../server/budget.ts';

if (process.env.BUDGET_TEST_READY !== 'yes') { console.error('未授权独立Redis检查：需BUDGET_TEST_READY=yes。不调用模型。'); process.exit(1); }
const ledger = new BudgetLedger({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN, id: `test_${randomUUID().replaceAll('-', '')}` });
const command = (args: (string | number)[]) => ledger.command(args);
let checks = 0;
try {
  await assert.rejects(ledger.reserve('experiment', 'test')); checks++;
  await ledger.initialize(); await assert.rejects(ledger.initialize()); checks++;
  await assert.rejects(ledger.reserve('public', 'test')); checks++;
  const ending = await ledger.activate(); await assert.rejects(ledger.activate()); checks++;
  const restarted = new BudgetLedger({ url: ledger.url, token: ledger.token, id: ledger.id, endAt: ending });
  const races = await Promise.allSettled(Array.from({ length: 12 }, () => restarted.reserve('experiment', 'test')));
  const successes = races.filter(result => result.status === 'fulfilled');
  assert.equal(successes.length, 1); assert.equal(await command(['HGET', ledger.key(), 'total']), '1'); checks++;
  await restarted.release('wrong-lease'); await assert.rejects(restarted.reserve('fault', 'test')); checks++;
  await restarted.release(successes[0].value);
  for (let i = 0; i < 3; i++) { const lease = await restarted.reserve('public', 'a'); await restarted.release(lease); }
  await assert.rejects(restarted.reserve('public', 'a')); checks++;
  for (let i = 0; i < 7; i++) { const lease = await restarted.reserve('public', `other${i}`); await restarted.release(lease); }
  await assert.rejects(restarted.reserve('public', 'another')); checks++;
  await command(['HSET', ledger.key(), 'spent', 'corrupt']); await assert.rejects(restarted.reserve('fault', 'test')); checks++;
  await command(['HSET', ledger.key(), 'spent', '220', 'fault', 'bad']); await assert.rejects(restarted.reserve('fault', 'test')); checks++;
  await command(['HSET', ledger.key(), 'fault', '0', 'endAt', '1']); await assert.rejects(restarted.reserve('public', 'another')); checks++;
  await command(['HSET', ledger.key(), 'endAt', Date.parse(ending), 'experiment', '60', 'total', '70', 'spent', '1400']);
  await assert.rejects(restarted.reserve('experiment', 'test')); checks++;
  console.log(JSON.stringify({ kind: 'real-redis-no-model', checks, passed: true, modelCalls: 0 }));
} finally {
  await command(['DEL', ledger.key(), `cxf:{${ledger.id}}:lease`]).catch(() => { console.error('独立测试key清理未完成，前缀test_，不含真实任务。'); });
}
