import { randomUUID } from 'node:crypto';
import { LIMITS } from '../shared/limits.ts';
import type { Candidate, AnalysisInput, TaskFields } from '../shared/types.ts';

export class AppError extends Error {
  status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; }
}
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new AppError('请求字段格式不正确。');
  return value as Record<string, unknown>;
}
export function string(value: unknown, label: string, max: number = LIMITS.field, required = false): string {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) throw new AppError(`${label}为空、格式不正确或超过${max}字。`);
  return value;
}
function list(value: unknown, label: string, max: number = LIMITS.field): string[] {
  if (!Array.isArray(value) || value.length > LIMITS.listItems) throw new AppError(`${label}应为最多${LIMITS.listItems}项的列表。`);
  return value.map(item => string(item, label, max, true));
}
export function date(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new AppError('日期需为有效的 YYYY-MM-DD 或留空。');
  const parsed = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw new AppError('日期不存在。');
  return value;
}
export function validateInput(value: unknown): AnalysisInput {
  const v = object(value);
  return { sourceId: string(v.sourceId, '来源', 80, true), text: string(v.text, '消息', LIMITS.text, true), referenceDate: date(v.referenceDate), role: v.role === null ? null : string(v.role, '角色', LIMITS.field) };
}
export function validateEdited(value: unknown): TaskFields {
  const v = object(value);
  return { title: string(v.title, '标题', LIMITS.field, true), audience: string(v.audience, '适用对象'), deadlineText: string(v.deadlineText, '截止时间原文'), deadlineDate: date(v.deadlineDate), materials: list(v.materials, '材料'), uncertainties: list(v.uncertainties, '疑点', 500) };
}
export function validateCandidates(value: unknown, input: AnalysisInput): Candidate[] {
  const v = object(value);
  if (!Array.isArray(v.tasks) || v.tasks.length > LIMITS.candidates) throw new AppError('模型任务列表无效。', 502);
  return v.tasks.map(item => {
    const raw = object(item);
    const fields = validateEdited(raw);
    const evidence = list(raw.evidence, '出处', LIMITS.evidence);
    if (!evidence.length || evidence.some(quote => !input.text.includes(quote))) throw new AppError('模型出处无法在原文定位，请重试或调整输入。', 502);
    if (fields.deadlineText && !input.text.includes(fields.deadlineText)) throw new AppError('截止时间原文无法在消息中定位。', 502);
    // 日期依据限于这个候选的截止原文，其他任务的日期不能作基准。
    const match = fields.deadlineText.match(/(\d{4})[-年/]\s*(\d{1,2})[-月/]\s*(\d{1,2})/);
    const explicitDate = match ? `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}` : null;
    if (!fields.deadlineText) fields.deadlineDate = null;
    if ((!input.referenceDate && !explicitDate && fields.deadlineText) || (explicitDate && fields.deadlineDate !== explicitDate)) {
      fields.deadlineDate = null;
      const doubt = explicitDate ? '模型日期与截止时间原文不一致，请人工确认。' : '缺少消息日期背景，截止日期待确认。';
      fields.uncertainties = [...new Set([...fields.uncertainties, doubt])];
    }
    if (!fields.audience) fields.uncertainties = [...new Set([...fields.uncertainties, '适用对象不明确，请确认是否与你有关。'])];
    return { ...fields, id: randomUUID(), evidence };
  });
}
