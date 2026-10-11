import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { AnalysisInput, Candidate, ImportRecord, Source, State, Task, TaskFields } from '../../shared/types.ts';
import { LIMITS } from '../../shared/limits.ts';
import { Evidence, TaskCard, TaskSummary, isConflict } from './TaskCard.tsx';

const EXAMPLE = '【合成演示】请二年级家长于2026年10月12日17:00前，将填写好的秋游报名表和缴费凭证交给班主任。未确定是否参加的家庭，请先联系班主任确认。';
async function api<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, { method: body === undefined ? 'GET' : 'POST', headers: body === undefined ? undefined : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body), signal: signal ?? AbortSignal.timeout(60_000) });
  const value = await response.json();
  if (response.status === 401) window.dispatchEvent(new Event('demo-expired'));
  if (!response.ok) throw Object.assign(new Error(value.error ?? '请求失败，请重试。'), { status: response.status });
  return value as T;
}
function message(error: unknown) { return error instanceof Error ? error.message : '请求失败，输入已保留，请重试。'; }
function lines(value: string) { return value.split('\n').map(item => item.trim()).filter(Boolean); }
function sourceName(state: State, id: string) { return state.sources.find(source => source.id === id)?.name ?? '来源不可用'; }

function CandidateCard({ candidate, record, saved, tasks, imports, onConfirm, onCorrect, onReload, onIgnore }: { candidate: Candidate; record: ImportRecord; saved: boolean; tasks: Task[]; imports: ImportRecord[]; onConfirm: (candidate: Candidate, fields: TaskFields) => Promise<void>; onCorrect: (snapshot: Task, candidate: Candidate, fields: TaskFields) => Promise<void>; onReload: () => Promise<void>; onIgnore: () => void }) {
  const [fields, setFields] = useState<TaskFields>(candidate);
  const [materials, setMaterials] = useState(candidate.materials.join('\n'));
  const [uncertainties, setUncertainties] = useState(candidate.uncertainties.join('\n'));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [snapshot, setSnapshot] = useState<Task | null>(null);
  const [conflict, setConflict] = useState(false);
  const [refreshed, setRefreshed] = useState(false);
  const prefix = `candidate-${candidate.id}`;
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const edited = { ...fields, materials: lines(materials), uncertainties: lines(uncertainties) };
      if (snapshot) await onCorrect(snapshot, candidate, edited); else await onConfirm(candidate, edited);
    }
    catch (error) { setError(message(error)); setConflict(isConflict(error)); setRefreshed(false); }
    finally { setBusy(false); }
  }
  const oldRecord = imports.find(item => item.id === snapshot?.importId);
  const latest = tasks.find(item => item.id === snapshot?.id);
  let submitLabel = snapshot ? '确认更正此任务' : '确认并保存待办';
  if (busy) submitLabel = '正在保存…';
  return <article className="card candidate-card"><div className="card-heading"><span className="tag">{saved ? '已保存 / 已关联' : '待你确认'}</span><span className="muted">模型候选</span></div>
    {candidate.uncertainties.length > 0 && <div className="notice"><strong>先核对疑点</strong><ul>{candidate.uncertainties.map((item, index) => <li key={index}>{item}</li>)}</ul></div>}
    <form onSubmit={submit}><fieldset disabled={busy || saved || conflict}><label htmlFor={`${prefix}-title`}>任务标题</label><input id={`${prefix}-title`} value={fields.title} required maxLength={LIMITS.field} onChange={e => setFields({ ...fields, title: e.target.value })}/>
      <label htmlFor={`${prefix}-audience`}>适用对象</label><input id={`${prefix}-audience`} value={fields.audience} maxLength={LIMITS.field} onChange={e => setFields({ ...fields, audience: e.target.value })}/>
      <div className="two-fields"><div><label htmlFor={`${prefix}-deadlineText`}>截止时间原文</label><input id={`${prefix}-deadlineText`} value={fields.deadlineText} maxLength={LIMITS.field} onChange={e => setFields({ ...fields, deadlineText: e.target.value })}/></div><div><label htmlFor={`${prefix}-deadlineDate`}>确认后的日期（可留空）</label><input id={`${prefix}-deadlineDate`} type="date" value={fields.deadlineDate ?? ''} onChange={e => setFields({ ...fields, deadlineDate: e.target.value || null })}/></div></div>
      <label htmlFor={`${prefix}-materials`}>材料清单（每行一项）</label><textarea id={`${prefix}-materials`} rows={3} value={materials} onChange={e => setMaterials(e.target.value)}/>
      <label htmlFor={`${prefix}-uncertainties`}>需确认的疑点（每行一项）</label><textarea id={`${prefix}-uncertainties`} rows={2} value={uncertainties} onChange={e => setUncertainties(e.target.value)}/>
      <p className="muted">保存前请核对原文。日期不明确时可留空，系统不会替你猜测。</p>
      <label htmlFor={`${prefix}-link`}>这是已有任务的更正吗？</label><select id={`${prefix}-link`} value={snapshot?.id ?? ''} onChange={e => setSnapshot(tasks.find(item => item.id === e.target.value) ?? null)}><option value="">保存成新的待办</option>{tasks.map(task => <option key={task.id} value={task.id}>{task.title} · {task.status === 'done' ? '已完成' : '待办'}</option>)}</select><p className="muted">仅显示同来源任务，需你主动选择。更正会更新字段并保留原状态；撤销通知也不会自动删除任务。</p>
      {snapshot && <div className="correction-compare"><section><h4>更正前 · 版本 {snapshot.revision} · {snapshot.status === 'done' ? '已完成' : '待办'}</h4><TaskSummary fields={snapshot}/>{oldRecord && <Evidence record={oldRecord} quotes={snapshot.evidence}/>} {snapshot.corrections.map((item, index) => { const previous = imports.find(record => record.id === item.importId); return previous && <section key={`${item.importId}-${item.candidateId}`}><p className="label">已应用更正出处 {index + 1}</p><Evidence record={previous} quotes={item.evidence}/></section>; })}</section><section><h4>更正后 · 当前候选草稿</h4><TaskSummary fields={{ ...fields, materials: lines(materials), uncertainties: lines(uncertainties) }}/><Evidence record={record} quotes={candidate.evidence}/></section></div>}
      <div className="actions"><button className="primary" type="submit" disabled={!fields.title.trim()}>{submitLabel}</button><button type="button" className="quiet" onClick={onIgnore}>忽略这条候选</button></div>
    </fieldset></form>{error && <p className="error" role="alert">{error}</p>}{conflict && !saved && <div className="notice"><p>更正草稿与旧任务快照已保留，需先重新读取再核对。</p><button disabled={busy} onClick={async () => { setBusy(true); try { await onReload(); setRefreshed(true); } catch (error) { setError(message(error)); } finally { setBusy(false); } }}>重新读取当前数据</button>{refreshed && <><p>最新任务：</p>{latest ? <TaskSummary fields={latest}/> : <p>原任务已删除或候选已被其他任务关联。</p>}<button disabled={busy} onClick={() => { setSnapshot(latest ?? null); setConflict(false); setError(''); setRefreshed(false); }}>按最新版本重新核对</button></>}</div>}<Evidence record={record} quotes={candidate.evidence}/></article>;
}

export function App() {
  const [presets, setPresets] = useState<{ id: string; label: string; text: string; referenceDate: string | null; role: string | null }[]>([]);
  const [presetId, setPresetId] = useState('');
  const [state, setState] = useState<State | null>(null);
  const [sourceId, setSourceId] = useState('');
  const [newSource, setNewSource] = useState('');
  const [text, setText] = useState('');
  const [referenceDate, setReferenceDate] = useState('');
  const [role, setRole] = useState('');
  const [preview, setPreview] = useState<AnalysisInput | null>(null);
  const [record, setRecord] = useState<ImportRecord | null>(null);
  const [ignored, setIgnored] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [reload, setReload] = useState(0);
  const [exporting, setExporting] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    api<State>('/api/state', undefined, controller.signal).then(value => { setState(value); setSourceId(previous => previous || value.sources[0]?.id || ''); setError(''); }).catch(error => { if (!controller.signal.aborted) setError(message(error)); });
    return () => controller.abort();
  }, [reload]);
  useEffect(() => {
    if (state?.mode !== 'demo') return;
    const controller = new AbortController();
    api<typeof presets>('/api/demo/presets', undefined, controller.signal).then(setPresets).catch(error => { if (!controller.signal.aborted) setError(message(error)); });
    return () => controller.abort();
  }, [state?.mode]);
  function invalidate() { setPreview(null); setFeedback(''); }
  async function createSource(event: FormEvent) {
    event.preventDefault(); if (!state) return; setBusy(true); setError('');
    try {
      const source = await api<Source>('/api/sources', { name: newSource });
      setState(previous => previous ? { ...previous, sources: previous.sources.some(item => item.id === source.id) ? previous.sources : [...previous.sources, source] } : previous);
      setSourceId(source.id); setNewSource(''); invalidate(); setFeedback(`已选择来源“${source.name}”。`);
    } catch (error) { setError(message(error)); } finally { setBusy(false); }
  }
  function prepare(event: FormEvent) {
    event.preventDefault(); setError(''); setFeedback('');
    if (state?.mode === 'demo') {
      const preset = presets.find(item => item.id === presetId);
      if (!preset) { setError('请选择固定合成样例。'); return; }
      setPreview({ sourceId: state.sources[0].id, text: preset.text, referenceDate: preset.referenceDate, role: preset.role }); return;
    }
    setPreview({ sourceId, text, referenceDate: referenceDate || null, role: role.trim() || null });
  }
  async function analyze() {
    if (!preview || !state) return;
    setBusy(true); setError(''); setFeedback('正在分析当前消息，最长45秒…');
    try {
      const result = await api<ImportRecord>(state.mode === 'demo' ? '/api/demo/analyze' : '/api/analyze', state.mode === 'demo' ? { presetId } : preview);
      setRecord(result); setIgnored([]); setPreview(null);
      setState(previous => previous ? { ...previous, imports: previous.imports.some(item => item.id === result.id) ? previous.imports : [...previous.imports, result] } : previous);
      setFeedback(`${result.delivery === 'cached' ? '缓存结果 · 本次未调用模型' : '实时分析 · 本次调用模型'}：${result.candidates.length}条候选，等待人工确认。`);
    } catch (error) { setError(message(error)); setFeedback('分析未完成。消息和发送预览已保留，可再次点击分析。'); }
    finally { setBusy(false); }
  }
  async function confirm(candidate: Candidate, edited: TaskFields) {
    if (!record) return;
    const task = await api<Task>('/api/tasks/confirm', { importId: record.id, candidateId: candidate.id, edited });
    acceptTask(task);
    setFeedback(state?.mode === 'demo' ? '已保存到当前临时会话。可下载JSON保留结果。' : '已保存到本机待办。刷新页面后仍可查看任务与原文。');
  }
  function acceptTask(task: Task) {
    setState(previous => {
      if (!previous) return previous;
      const exists = previous.tasks.some(item => item.id === task.id);
      const tasks = exists ? previous.tasks.map(item => item.id === task.id ? task : item) : [task, ...previous.tasks];
      return { ...previous, tasks };
    });
  }
  async function reloadState() { const value = await api<State>('/api/state'); setState(value); setFeedback('已读取当前数据，请核对最新字段。'); }
  async function updateTask(snapshot: Task, edited: TaskFields) { acceptTask(await api<Task>('/api/tasks/update', { taskId: snapshot.id, expectedRevision: snapshot.revision, edited })); setFeedback('编辑已保存。原消息和出处保持可查。'); }
  async function statusTask(snapshot: Task) { acceptTask(await api<Task>('/api/tasks/status', { taskId: snapshot.id, expectedRevision: snapshot.revision, status: snapshot.status === 'done' ? 'pending' : 'done' })); setFeedback('任务状态已更新。'); }
  async function deleteTask(snapshot: Task) { await api('/api/tasks/delete', { taskId: snapshot.id, expectedRevision: snapshot.revision }); setState(previous => previous ? { ...previous, tasks: previous.tasks.filter(item => item.id !== snapshot.id) } : previous); setFeedback('所选任务已删除，原消息和分析记录保留。'); }
  async function correctTask(snapshot: Task, candidate: Candidate, edited: TaskFields) {
    if (!record) return;
    acceptTask(await api<Task>('/api/tasks/correct', { taskId: snapshot.id, expectedRevision: snapshot.revision, importId: record.id, candidateId: candidate.id, edited }));
    setFeedback('已更正所选任务，初始出处与更正出处均保留，完成状态保持。');
  }
  async function exportData() {
    setExporting(true); setError('');
    try {
      const response = await fetch('/api/export', { signal: AbortSignal.timeout(60_000) });
      if (response.status === 401) window.dispatchEvent(new Event('demo-expired'));
      if (!response.ok) throw new Error('导出失败，请手动重试。');
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a'); link.href = url; link.download = 'chat-tasks.json'; document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000); setFeedback('已发起JSON下载，其中包含原消息，请妥善保管。');
    } catch (error) { setError(message(error)); } finally { setExporting(false); }
  }
  if (!state) return <main className="shell"><h1>群聊待办助手</h1>{error ? <div className="error" role="alert"><p>{error}</p><button onClick={() => setReload(reload + 1)}>重新连接本地服务</button></div> : <p role="status">正在读取本地数据…</p>}</main>;
  return <div className="shell"><header className="topbar"><a className="brand" href="/">群聊待办助手<span>把通知变成可核对的待办</span></a><span className="local-badge">{state.mode === 'demo' ? '合成演示 · 临时会话' : '本机运行 · 数据本地保存'}</span></header>
    <main><section className="intro"><p className="eyebrow">每一项待办，都有原文可查</p><h1>消息太长？<br/>先看清，再记下。</h1><p>粘贴通知，核对模型提取的任务。由你确认后，才进入待办列表。</p><ol className="steps"><li><span>1</span>粘贴消息</li><li><span>2</span>核对候选</li><li><span>3</span>保存待办</li></ol></section>
    {error && <div className="error" role="alert">{error}</div>}{feedback && <p className="feedback" role="status">{feedback}</p>}
    <div className="workspace"><section className="input-section card" aria-labelledby="input-heading"><div className="section-heading"><h2 id="input-heading">1. 粘贴消息</h2><span className="tag neutral">你主动提供的内容</span></div>
      <fieldset disabled={busy}>{state.mode === 'demo' ? <><label htmlFor="demo-preset">选择合成通知</label><select id="demo-preset" value={presetId} onChange={e => { const preset = presets.find(item => item.id === e.target.value); setPresetId(e.target.value); setText(preset?.text ?? ''); setReferenceDate(preset?.referenceDate ?? ''); setRole(preset?.role ?? ''); invalidate(); }}><option value="">请选择一组样例</option>{presets.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select><p className="muted">第二例可主动关联第一例已保存任务进行更正。样例由服务器固定，不上传自定义聊天。</p></> : <form onSubmit={createSource} className="source-create"><label htmlFor="new-source">新建来源名称</label><div className="input-row"><input id="new-source" value={newSource} placeholder="例如：二年级家长群" maxLength={LIMITS.sourceName} onChange={e => setNewSource(e.target.value)}/><button type="submit" disabled={!newSource.trim()}>新建来源</button></div></form>}
      <form onSubmit={prepare}><label htmlFor="source">消息来源</label><select id="source" value={sourceId} disabled={state.mode === 'demo'} required onChange={e => { setSourceId(e.target.value); invalidate(); }}><option value="">请选择或先新建来源</option>{state.sources.map(source => <option key={source.id} value={source.id}>{source.name}</option>)}</select>
        <div className="label-row"><label htmlFor="message">群聊文字</label>{state.mode !== 'demo' && <button type="button" className="text-button" onClick={() => { setText(EXAMPLE); setReferenceDate(''); setRole('二年级家长'); invalidate(); }}>填入合成例子</button>}</div><textarea id="message" className="message-input" value={text} readOnly={state.mode === 'demo'} required maxLength={LIMITS.text} placeholder="在这里粘贴通知原文…" onChange={e => { setText(e.target.value); invalidate(); }}/><p className="muted counter">{text.length} / {LIMITS.text}字 · 先用合成或脱敏消息试用</p>
        <div className="two-fields"><div><label htmlFor="reference-date">消息日期背景（可选）</label><input id="reference-date" type="date" readOnly={state.mode === 'demo'} value={referenceDate} onChange={e => { setReferenceDate(e.target.value); invalidate(); }}/></div><div><label htmlFor="role">我的称呼 / 角色（可选）</label><input id="role" readOnly={state.mode === 'demo'} value={role} maxLength={LIMITS.field} placeholder="例如：二年级家长" onChange={e => { setRole(e.target.value); invalidate(); }}/></div></div><p className="muted">日期背景用于理解“明天”等表达。未提供时，模糊日期会留待确认。</p>
        <button className="primary full" type="submit" disabled={!sourceId || !text.trim() || !state.model.configured}>预览将发送的内容</button>
      </form></fieldset>{!state.model.configured && <p className="error">{state.mode === 'demo' ? '实时演示暂未开放，请稍后再来。' : '模型未配置，请在服务端.env设置DEEPSEEK_API_KEY后重启。'}</p>}
      {preview && <section className="preview" aria-labelledby="preview-heading"><h3 id="preview-heading">发送前，再看一眼</h3><p>点击下方按钮后，将这些内容发送给 DeepSeek Flash 分析。请确认其中没有需要保密的信息。</p><dl><dt>消息日期背景</dt><dd>{preview.referenceDate ?? '未提供'}</dd><dt>我的角色</dt><dd>{preview.role || '未提供'}</dd></dl><pre>{preview.text}</pre><p className="muted">模型还会收到固定的任务提取规则。此处没有附加历史消息或已保存待办；来源名称只在本地使用。</p><div className="actions"><button className="primary" onClick={analyze} disabled={busy}>{busy ? '正在分析…' : '确认发送并分析'}</button><button className="quiet" onClick={() => setPreview(null)} disabled={busy}>返回修改</button></div></section>}
    </section>
    <section className="results-section" aria-labelledby="results-heading"><div className="section-heading"><h2 id="results-heading">2. 核对候选</h2>{record && <span className="tag neutral">{sourceName(state, record.sourceId)}</span>}</div>
      {state.imports.length > 0 && <div className="history-picker"><label htmlFor="analysis-history">查看已分析的消息</label><select id="analysis-history" value={record?.id ?? ''} disabled={busy} onChange={e => { setRecord(state.imports.find(item => item.id === e.target.value) ?? null); setIgnored([]); }}><option value="">请选择分析记录</option>{[...state.imports].reverse().map(item => <option key={item.id} value={item.id}>{sourceName(state, item.sourceId)} · {new Date(item.createdAt).toLocaleString('zh-CN')} · {item.text.slice(0, 24)}</option>)}</select></div>}
      {!record && <div className="empty-state"><div className="empty-mark" aria-hidden="true">待核对</div><h3>分析后，任务会出现在这里</h3><p>每条候选都包含对象、时间、材料、原文出处和疑点。先核对，再保存。</p></div>}
      {record && <><p className="muted">{record.delivery === 'cached' ? '缓存结果 · 零新增调用' : '已保存分析结果'} · {record.candidates.length}条候选 · 原分析 {Math.round(record.usage.elapsedMs / 100) / 10}秒 · {record.usage.totalTokens} tokens</p>{record.candidates.length === 0 && <div className="empty-state"><h3>这段消息没有提取出待办</h3><p>闲聊或信息不足时，空结果是正常情况。可核对原文后调整输入。</p><Evidence record={record} quotes={[]}/></div>}{record.candidates.filter(item => !ignored.includes(item.id)).map(candidate => <CandidateCard key={candidate.id} candidate={candidate} record={record} saved={state.tasks.some(task => (task.importId === record.id && task.candidateId === candidate.id) || task.corrections.some(item => item.importId === record.id && item.candidateId === candidate.id))} tasks={state.tasks.filter(task => task.sourceId === record.sourceId)} imports={state.imports} onCorrect={correctTask} onReload={reloadState} onConfirm={confirm} onIgnore={() => { setIgnored([...ignored, candidate.id]); setFeedback('候选已从当前视图忽略，没有保存为待办。'); }}/>) }{ignored.length > 0 && <button className="quiet" onClick={() => setIgnored([])}>重新显示已忽略的{ignored.length}条候选</button>}</>}
    </section></div>
    <section className="saved-section" aria-labelledby="saved-heading"><div className="section-heading"><h2 id="saved-heading">3. 已保存待办</h2><span className="tag neutral">{state.tasks.length}项</span></div><div className="export-row"><button disabled={exporting} onClick={exportData}>{exporting ? '正在导出…' : '下载当前数据 JSON'}</button><p className="muted">包含来源、原消息、候选和当前任务，请妥善保管。当前不支持导入恢复。</p></div>{state.tasks.length === 0 ? <div className="saved-empty"><p>待办列表还是空的。确认候选后，你的任务会保存在这里。</p></div> : <div className="task-grid">{state.tasks.map(task => <TaskCard key={task.id} task={task} source={sourceName(state, task.sourceId)} imports={state.imports} onUpdate={updateTask} onStatus={statusTask} onDelete={deleteTask} onReload={reloadState}/>)}</div>}</section></main><footer><p>人工确认后保存 · 不自动监听群聊或执行任务</p><p>{state.mode === 'demo' ? '演示数据仅保留于当前临时会话；实时分析使用合成通知，缓存不产生新增模型调用。' : '已保存数据位于本机 data/ 目录；发送给模型的内容会由服务商处理。'}</p></footer></div>;
}
