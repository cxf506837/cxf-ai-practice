import { createHash, randomUUID } from 'node:crypto';
import { closeSync, fsyncSync, mkdirSync, openSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extract, EXTRACTION_CONFIG, MODEL } from '../server/extract.ts';
import { AppError, object, validateInput } from '../server/validation.ts';
import { LIMITS } from '../shared/limits.ts';
import type { AnalysisInput, Usage } from '../shared/types.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_PATHS = ['server/extract.ts', 'server/validation.ts', 'shared/types.ts', 'shared/limits.ts', 'scripts/evaluate.ts'];
const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
type EvaluationCase = { id: string; input: AnalysisInput; inputHash: string };
type Progress = { round: number; caseId: string; status: 'ok' | 'error'; candidateCount: number; elapsedMs: number; usage: Usage | null };
type Options = { fetcher?: typeof fetch; outputDir?: string; onProgress?: (progress: Progress) => void };

function identifier(value: unknown): string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/.test(value)) throw new AppError('评测ID需为1–80位字母、数字、点、下划线或连字符。');
  return value;
}

export async function runEvaluation(suitePath: string, rounds: number, key: string, options: Options = {}): Promise<string> {
  if (!Number.isInteger(rounds) || rounds < 1 || rounds > 3) throw new AppError('评测轮数必须为1–3。');
  if (!key.trim()) throw new AppError('未配置模型密钥，不执行请求。', 503);
  const stat = statSync(suitePath);
  if (!stat.isFile() || stat.size > 1_048_576) throw new AppError('评测集必须是最多1MiB的JSON文件。');
  const bytes = readFileSync(suitePath);
  const suite = object(JSON.parse(bytes.toString('utf8')));
  const suiteId = identifier(suite.suiteId);
  if (!Array.isArray(suite.cases) || suite.cases.length < 1 || suite.cases.length > 10) throw new AppError('每个评测集必须包含1–10例。');
  const ids = new Set<string>();
  // 全集预验证，避免先收费才发现后面的输入无效；gold只参与原字节hash。
  const cases: EvaluationCase[] = suite.cases.map(value => {
    const entry = object(value);
    const id = identifier(entry.id);
    if (ids.has(id)) throw new AppError('评测case ID不能重复。');
    ids.add(id);
    const input = validateInput(entry.input);
    return { id, input, inputHash: hash(JSON.stringify(input)) };
  });
  const containsKey = (value: unknown) => {
    const serialized = JSON.stringify(value);
    return serialized.includes(key) || serialized.includes(JSON.stringify(key).slice(1, -1));
  };
  if (containsKey({ suiteId, cases })) throw new AppError('评测输入含敏感密钥，已拒绝执行。');
  const sourceFiles = Object.fromEntries(SOURCE_PATHS.map(path => [path, hash(readFileSync(join(ROOT, path)))]));
  const sourceHash = hash(JSON.stringify(sourceFiles));
  const outputDir = options.outputDir ?? join(ROOT, 'tmp', 's3');
  mkdirSync(outputDir, { recursive: true });
  const outputPath = join(outputDir, `evaluation-${randomUUID()}.jsonl`);
  const fd = openSync(outputPath, 'wx', 0o600);
  const checkpoint = (record: unknown) => { writeFileSync(fd, `${JSON.stringify(record)}\n`); fsyncSync(fd); };
  const startedAt = new Date().toISOString();
  const started = performance.now();
  const counts = { attempted: 0, succeeded: 0, failed: 0 };
  const totals = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
  try {
    checkpoint({ type: 'header', formatVersion: 1, runId: randomUUID(), suiteId, suiteHash: hash(bytes), extractionConfig: EXTRACTION_CONFIG,
      sourceHash, sourceFiles, model: MODEL, nodeVersion: process.version, rounds, caseCount: cases.length, startedAt,
      limits: { timeoutMs: LIMITS.timeoutMs, maxRequests: cases.length * rounds },
      inputs: cases.map(({ id, input, inputHash }) => ({ caseId: id, sourceId: input.sourceId, inputHash })) });
    for (let round = 1; round <= rounds; round++) {
      for (const entry of cases) {
        const caseStarted = performance.now();
        const caseStartedAt = new Date().toISOString();
        let result: Awaited<ReturnType<typeof extract>> | undefined;
        let error: { code: string; status: number; message: string } | undefined;
        try {
          result = await extract(entry.input, key, options.fetcher);
          if (containsKey(result)) { result = undefined; throw new AppError('模型结果含敏感密钥，未保存候选。', 502); }
        } catch (cause) {
          // 不记录原始异常、请求体、响应体或凭证；现有提取器的安全消息可用于诊断。
          const message = cause instanceof AppError ? cause.message : '评测提取失败，原始错误未记录。';
          error = { code: 'EXTRACTION_FAILED', status: cause instanceof AppError ? cause.status : 502, message: containsKey(message) ? '评测提取失败，敏感错误未记录。' : message };
        }
        const elapsedMs = Math.round(performance.now() - caseStarted);
        const status = result ? 'ok' : 'error';
        counts.attempted++;
        if (result) {
          counts.succeeded++;
          totals.promptTokens += result.usage.promptTokens;
          totals.completionTokens += result.usage.completionTokens;
          totals.totalTokens += result.usage.totalTokens;
        } else counts.failed++;
        checkpoint({ type: 'case', round, caseId: entry.id, sourceId: entry.input.sourceId, inputHash: entry.inputHash,
          startedAt: caseStartedAt, finishedAt: new Date().toISOString(), elapsedMs, status, candidates: result?.candidates ?? null, usage: result?.usage ?? null, error: error ?? null });
        options.onProgress?.({ round, caseId: entry.id, status, candidateCount: result?.candidates.length ?? 0, elapsedMs, usage: result?.usage ?? null });
      }
    }
    checkpoint({ type: 'footer', finishedAt: new Date().toISOString(), elapsedMs: Math.round(performance.now() - started), counts, usage: totals,
      usageNote: '仅累计成功解析的用量；失败请求仍可能收费，未返回用量不能当作零。' });
  } finally { closeSync(fd); }
  return outputPath;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length !== 4) throw new AppError('用法：node --env-file=.env scripts/evaluate.ts <suite-path> <1–3>');
    await runEvaluation(process.argv[2], Number(process.argv[3]), process.env.DEEPSEEK_API_KEY ?? '', {
      onProgress: progress => console.log(JSON.stringify(progress)),
    });
  } catch {
    console.error('评测未完成：请检查输入集、轮数、密钥配置和输出目录；已写checkpoint保留，未自动重试。');
    process.exitCode = 1;
  }
}
