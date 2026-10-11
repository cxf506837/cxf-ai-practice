import test from 'node:test';
import assert from 'node:assert/strict';
import { BudgetLedger, INIT_SCRIPT, RESERVE_SCRIPT } from '../server/budget.ts';
import { boundedFetch, paidCall } from '../server/provider.ts';

test('账本配置缺失拒付费、REST失败/损坏fail closed，不自动初始化或重试', async () => {
  assert.throws(() => new BudgetLedger({}));
  let calls = 0;
  const fetcher: typeof fetch = async () => { calls++; return Response.json({ result: ['corrupt'] }); };
  const ledger = new BudgetLedger({ url: 'https://budget.example', token: 'synthetic-token', id: 'test', endAt: '2026-10-18T00:00:00Z' }, fetcher);
  await assert.rejects(ledger.reserve('public', 's')); assert.equal(calls, 1);
  assert.match(INIT_SCRIPT, /EXISTS/); assert.match(RESERVE_SCRIPT, /redis.call\('TIME'\)/);
  assert.match(RESERVE_SCRIPT, /2000/); assert.match(RESERVE_SCRIPT, /20/);
});

test('provider最终body16KiB/maxoutput4096、deadline、失败不退预留', async () => {
  let actual = 0;
  const fetcher: typeof fetch = async () => { actual++; return Response.json({ ok: true }); };
  await assert.rejects(boundedFetch(fetcher)('https://api.deepseek.com/chat/completions', { body: JSON.stringify({ max_tokens: 4097 }) }));
  await assert.rejects(boundedFetch(fetcher)('https://api.deepseek.com/chat/completions', { body: JSON.stringify({ max_tokens: 4096, text: 'x'.repeat(16_384) }) }));
  assert.equal(actual, 0);
  let reservations = 0; let releases = 0;
  const ledger = { reserve: async () => { reservations++; return 'lease'; }, release: async () => { releases++; } };
  await assert.rejects(paidCall(ledger, 'fault', 's', async () => { throw new Error('synthetic failure'); }));
  assert.equal(reservations, 1); assert.equal(releases, 1);
});
