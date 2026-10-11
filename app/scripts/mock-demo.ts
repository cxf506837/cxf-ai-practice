// Loopback-only browser fixture. Never loads .env, touches disk data or calls a provider.
import { createServer, request } from 'node:http';
import type { AddressInfo } from 'node:net';
import { fileURLToPath } from 'node:url';
import { createApp } from '../server/http.ts';
import { DemoSessions, PRESETS } from '../server/demo.ts';
import { validateCandidates } from '../server/validation.ts';

const sessions = new DemoSessions();
const origin = 'https://demo.example';
const upstream = createApp({ key: 'synthetic-mock-no-provider', dist: fileURLToPath(new URL('../dist/', import.meta.url)), demo: { origin, accessCode: 'mock-only-access-code', sessions }, extractor: async input => {
  const index = PRESETS.findIndex(item => item.text === input.text);
  const fields = [
    { title: '提交秋游报名材料', audience: '二年级家长', deadlineText: '2026年10月12日17:00前', deadlineDate: '2026-10-12', materials: ['填写好的秋游报名表', '缴费凭证'], uncertainties: [] },
    { title: '更正秋游报名材料', audience: '二年级家长', deadlineText: '2026年10月13日17:00前', deadlineDate: '2026-10-13', materials: ['家长签字的报名表', '缴费凭证'], uncertainties: ['请人工选择并核对同来源旧任务，再决定是否应用更正。'] },
    { title: '提交秋游意向表', audience: '二年级家长', deadlineText: '这几天', deadlineDate: null, materials: ['秋游意向表'], uncertainties: ['具体截止时间尚未通知。'] },
  ][index];
  if (!fields) throw new Error('Unknown synthetic preset');
  return { candidates: validateCandidates({ tasks: [{ ...fields, evidence: [input.text] }] }, input), usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0, elapsedMs: 1 } };
} });
await new Promise<void>(resolve => upstream.listen(0, '127.0.0.1', resolve));
const proxy = createServer((req, res) => {
  const forwarded = request({ host: '127.0.0.1', port: (upstream.address() as AddressInfo).port, method: req.method, path: req.url, headers: { ...req.headers, host: 'demo.example', origin, 'sec-fetch-site': 'same-origin' } }, result => {
    const chunks: Buffer[] = [];
    result.on('data', chunk => chunks.push(chunk));
    result.on('end', () => {
      let content = Buffer.concat(chunks);
      if (req.url === '/' || req.url === '/index.html') content = Buffer.from(content.toString().replace('<body>', '<body><p role="status">MOCK 本地验收 · 合成输出 · 零模型调用 · 非上线演示</p>'));
      const headers = { ...result.headers }; delete headers['content-length'];
      res.writeHead(result.statusCode ?? 502, headers); res.end(content);
    });
  });
  forwarded.on('error', () => { res.writeHead(502).end('MOCK fixture unavailable'); }); req.pipe(forwarded);
});
proxy.listen(4319, '127.0.0.1', () => console.log('MOCK http://localhost:4319 · 访问码mock-only-access-code · 绝不调用模型'));
const shutdown = () => proxy.close(() => upstream.close(() => { sessions.close(); process.exit(0); }));
process.once('SIGINT', shutdown); process.once('SIGTERM', shutdown);
