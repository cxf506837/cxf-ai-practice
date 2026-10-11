import test from 'node:test';
import assert from 'node:assert/strict';
import { extract } from '../server/extract.ts';
import type { AnalysisInput } from '../shared/types.ts';
import { LIMITS } from '../shared/limits.ts';
import { Store } from '../server/store.ts';
import { AppError } from '../server/validation.ts';

const input: AnalysisInput = { sourceId: 'never-send-source-id', text: '家长明天提交报名表。', referenceDate: null, role: '家长' };
function response(content: string, reason = 'stop') {
  return Response.json({ choices: [{ finish_reason: reason, message: { content } }], usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 } });
}
test('只发当前预览字段，真实结构化内容和用量被解析', async () => {
  let calls = 0;
  const fakeFetch: typeof fetch = async (_url, options) => {
    calls++;
    const body = JSON.parse(options?.body as string);
    assert.equal(body.model, 'deepseek-flash');
    assert.deepEqual(body.response_format, { type: 'json_object' });
    assert.deepEqual(body.thinking, { type: 'disabled' });
    assert.equal(body.messages[1].content, JSON.stringify({ text: input.text, referenceDate: input.referenceDate, role: input.role }));
    assert.ok(!JSON.stringify(body).includes(input.sourceId));
    return response(JSON.stringify({ tasks: [{ title: '提交报名表', audience: '家长', deadlineText: '明天', deadlineDate: null, materials: ['报名表'], evidence: ['家长明天提交报名表'], uncertainties: [] }] }));
  };
  const result = await extract(input, 'synthetic-test-key', fakeFetch);
  assert.equal(calls, 1);
  assert.equal(result.candidates[0]?.title, '提交报名表');
  assert.equal(result.usage.totalTokens, 150);
});
test('模型截断、空内容、非法JSON、失败均不冒充成功且没有自动重试', async () => {
  const cases: Response[] = [response('{"tasks":[]}', 'length'), response(''), response('not-json'), Response.json({ error: 'synthetic-secret-that-must-not-leak' }, { status: 401 })];
  for (const result of cases) {
    let calls = 0;
    await assert.rejects(extract(input, 'synthetic-test-key', async () => { calls++; return result; }), error => {
      assert.ok(error instanceof Error);
      assert.ok(!error.message.includes('synthetic-secret-that-must-not-leak'));
      return true;
    });
    assert.equal(calls, 1);
  }
});
test('模型响应大小有界，网络异常只显示安全错误', async () => {
  await assert.rejects(extract(input, 'synthetic-test-key', async () => new Response('x'.repeat(LIMITS.modelBytes + 1))));
  await assert.rejects(extract(input, 'synthetic-test-key', async () => { throw new Error('synthetic-secret'); }), error => error instanceof Error && !error.message.includes('synthetic-secret'));
});
test('响应头已返回但正文不结束时仍报504超时，只请求一次且不保存成功记录', async context => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  const store = new Store(':memory:');
  const source = store.createSource('合成正文超时');
  let calls = 0;
  const fakeFetch: typeof fetch = async (_url, options) => {
    calls++;
    return new Response(new ReadableStream({
      start(controller) { options?.signal?.addEventListener('abort', () => controller.error(new DOMException('Aborted', 'AbortError')), { once: true }); },
    }));
  };
  try {
    const request = { ...input, sourceId: source.id };
    const pending = (async () => { const result = await extract(request, 'synthetic-test-key', fakeFetch); store.saveImport(request, result.candidates, result.usage); })();
    await Promise.resolve();
    context.mock.timers.tick(LIMITS.timeoutMs);
    await assert.rejects(pending, error => error instanceof AppError && error.status === 504 && error.message.includes('超过45秒'));
    assert.equal(calls, 1);
    assert.equal(store.state().imports.length, 0);
    assert.equal(store.state().tasks.length, 0);
  } finally { store.close(); context.mock.timers.reset(); }
});
