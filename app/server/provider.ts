import { AppError } from './validation.ts';
import type { BudgetStage } from './budget.ts';

export function boundedFetch(fetcher: typeof fetch = fetch): typeof fetch {
  return async (url, options) => {
    if (String(url) !== 'https://api.deepseek.com/chat/completions' || typeof options?.body !== 'string' || Buffer.byteLength(options.body, 'utf8') > 16_384) throw new AppError('完整模型请求超过16KiB或地址无效，未发送。', 413);
    const payload = JSON.parse(options.body) as { max_tokens?: unknown };
    if (payload.max_tokens !== 4096) throw new AppError('模型输出上限必须为4096。', 400);
    const signal = options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(45_000)]) : AbortSignal.timeout(45_000);
    return fetcher(url, { ...options, signal });
  };
}
export async function paidCall<T>(ledger: { reserve: (stage: BudgetStage, session: string) => Promise<string>; release: (lease: string) => Promise<unknown> }, stage: BudgetStage, session: string, call: () => Promise<T>): Promise<T> {
  const lease = await ledger.reserve(stage, session);
  try { return await call(); }
  finally {
    // Reservation never refunds, including network failure/unknown provider outcome.
    // Release failure keeps the persisted lease until its bounded expiry; do not retry.
    await ledger.release(lease).catch(() => {});
  }
}
