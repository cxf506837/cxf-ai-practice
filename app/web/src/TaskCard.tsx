import { useState } from 'react';
import type { FormEvent } from 'react';
import type { ImportRecord, Task, TaskFields } from '../../shared/types.ts';
import { LIMITS } from '../../shared/limits.ts';

export function errorMessage(error: unknown) { return error instanceof Error ? error.message : '操作失败，请重试。'; }
export function isConflict(error: unknown) { return error instanceof Error && 'status' in error && error.status === 409; }
export function Evidence({ record, quotes }: { record: ImportRecord; quotes: string[] }) {
  return <details className="evidence"><summary>查看出处与原消息</summary><div className="detail-content"><p className="label">精确原文引用</p>{quotes.map((quote, index) => <blockquote key={index}>{quote}</blockquote>)}<p className="label">完整原消息</p><pre>{record.text}</pre><p className="muted">消息日期背景：{record.referenceDate ?? '未提供'} · 我的角色：{record.role || '未提供'}</p></div></details>;
}
export function TaskSummary({ fields }: { fields: TaskFields }) {
  return <><h3>{fields.title}</h3><dl><dt>适用对象</dt><dd>{fields.audience || '待确认'}</dd><dt>截止时间原文</dt><dd>{fields.deadlineText || '未说明'}</dd><dt>确认日期</dt><dd>{fields.deadlineDate ?? '未确定'}</dd></dl><p className="label">材料清单</p>{fields.materials.length > 0 ? <ul>{fields.materials.map((item, index) => <li key={index}>{item}</li>)}</ul> : <p className="muted">未说明需要提交的材料</p>}{fields.uncertainties.length > 0 && <div className="notice"><strong>仍需确认</strong><ul>{fields.uncertainties.map((item, index) => <li key={index}>{item}</li>)}</ul></div>}</>;
}
export function TaskCard({ task, source, imports, onUpdate, onStatus, onDelete, onReload }: {
  task: Task; source: string; imports: ImportRecord[];
  onUpdate: (snapshot: Task, fields: TaskFields) => Promise<void>;
  onStatus: (snapshot: Task) => Promise<void>;
  onDelete: (snapshot: Task) => Promise<void>;
  onReload: () => Promise<void>;
}) {
  const [snapshot, setSnapshot] = useState<Task | null>(null);
  const [fields, setFields] = useState<TaskFields>(task);
  const [materials, setMaterials] = useState(task.materials.join('\n'));
  const [uncertainties, setUncertainties] = useState(task.uncertainties.join('\n'));
  const [deleting, setDeleting] = useState<Task | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);
  const [refreshed, setRefreshed] = useState(false);
  const original = imports.find(item => item.id === task.importId);
  const prefix = `task-${task.id}`;
  let statusLabel = task.status === 'done' ? '重新打开' : '标记完成';
  if (busy) statusLabel = '正在处理…';
  function startEdit() {
    setSnapshot(task); setFields(task); setMaterials(task.materials.join('\n')); setUncertainties(task.uncertainties.join('\n'));
    setDeleting(null); setError(''); setConflict(false); setRefreshed(false);
  }
  async function run(action: () => Promise<void>, close = false) {
    setBusy(true); setError('');
    try { await action(); if (close) { setSnapshot(null); setDeleting(null); } }
    catch (error) { setError(errorMessage(error)); setConflict(isConflict(error)); setRefreshed(false); }
    finally { setBusy(false); }
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!snapshot) return;
    await run(() => onUpdate(snapshot, { ...fields, materials: materials.split('\n').map(item => item.trim()).filter(Boolean), uncertainties: uncertainties.split('\n').map(item => item.trim()).filter(Boolean) }), true);
  }
  return <article className="card saved-card"><div className="card-heading"><span className="tag">{task.status === 'done' ? '已完成' : '待办'}</span><span className="muted">{source}</span></div><TaskSummary fields={task}/>
    {snapshot && <form onSubmit={submit} className="task-edit"><h4>编辑草稿</h4><p className="muted">依据打开编辑时的版本 {snapshot.revision}。下方草稿在失败时保留。</p><fieldset disabled={busy || conflict}>
      <label htmlFor={`${prefix}-title`}>任务标题</label><input id={`${prefix}-title`} required maxLength={LIMITS.field} value={fields.title} onChange={e => setFields({ ...fields, title: e.target.value })}/>
      <label htmlFor={`${prefix}-audience`}>适用对象</label><input id={`${prefix}-audience`} maxLength={LIMITS.field} value={fields.audience} onChange={e => setFields({ ...fields, audience: e.target.value })}/>
      <div className="two-fields"><div><label htmlFor={`${prefix}-deadlineText`}>截止时间原文</label><input id={`${prefix}-deadlineText`} maxLength={LIMITS.field} value={fields.deadlineText} onChange={e => setFields({ ...fields, deadlineText: e.target.value })}/></div><div><label htmlFor={`${prefix}-deadlineDate`}>确认后的日期（可留空）</label><input id={`${prefix}-deadlineDate`} type="date" value={fields.deadlineDate ?? ''} onChange={e => setFields({ ...fields, deadlineDate: e.target.value || null })}/></div></div>
      <label htmlFor={`${prefix}-materials`}>材料清单（每行一项）</label><textarea id={`${prefix}-materials`} rows={3} value={materials} onChange={e => setMaterials(e.target.value)}/>
      <label htmlFor={`${prefix}-uncertainties`}>需确认的疑点（每行一项）</label><textarea id={`${prefix}-uncertainties`} rows={2} value={uncertainties} onChange={e => setUncertainties(e.target.value)}/>
      <button className="primary" type="submit" disabled={!fields.title.trim()}>{busy ? '正在保存…' : '保存编辑'}</button>
    </fieldset><button type="button" className="quiet" disabled={busy} onClick={() => { setSnapshot(null); setError(''); setConflict(false); }}>取消编辑</button></form>}
    {!snapshot && !deleting && <div className="actions"><button disabled={busy || conflict} onClick={() => run(() => onStatus(task))}>{statusLabel}</button><button className="quiet" disabled={busy || conflict} onClick={startEdit}>编辑任务</button><button className="quiet danger" disabled={busy || conflict} onClick={() => { setDeleting(task); setError(''); }}>删除任务…</button></div>}
    {deleting && <div className="delete-confirm"><p>只删除“{deleting.title}”这项待办。原消息和分析记录保留，其他任务不受影响。</p><div className="actions"><button className="danger" disabled={busy || conflict} onClick={() => run(() => onDelete(deleting), true)}>{busy ? '正在删除…' : '确认删除这项任务'}</button><button className="quiet" disabled={busy} onClick={() => { setDeleting(null); setError(''); setConflict(false); }}>取消删除</button></div></div>}
    {error && <p className="error" role="alert">{error}</p>}
    {conflict && <div className="notice"><p>旧草稿保留。重新读取只更新上方当前任务，不会提交旧草稿。</p><button disabled={busy} onClick={() => run(async () => { await onReload(); setRefreshed(true); })}>重新读取当前数据</button>{refreshed && <><p>已读取最新任务。重新核对会清除旧草稿，并以当前任务重新开始。</p><button disabled={busy} onClick={startEdit}>放弃旧草稿，按最新版本重新核对</button></>}</div>}
    {original && <section><p className="label">初始出处</p><Evidence record={original} quotes={task.evidence}/></section>}
    {task.corrections.map((correction, index) => {
      const record = imports.find(item => item.id === correction.importId);
      return record && <section key={`${correction.importId}-${correction.candidateId}`}><p className="label">更正出处 {index + 1} · {new Date(correction.appliedAt).toLocaleString('zh-CN')}</p><Evidence record={record} quotes={correction.evidence}/></section>;
    })}
  </article>;
}
