import { DatabaseSync } from 'node:sqlite';
import { createHash, randomUUID } from 'node:crypto';
import type { AnalysisInput, Candidate, Usage, TaskFields, Source, ImportRecord, Task } from '../shared/types.ts';
import { AppError, string, validateEdited } from './validation.ts';
import { LIMITS } from '../shared/limits.ts';
import { EXTRACTION_CONFIG } from './extract.ts';

export class Store {
  db: DatabaseSync;
  extractionConfig: string;
  constructor(path: string, extractionConfig = EXTRACTION_CONFIG) {
    this.extractionConfig = extractionConfig;
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS sources (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS imports (id TEXT PRIMARY KEY, source_id TEXT NOT NULL REFERENCES sources(id), fingerprint TEXT NOT NULL, data TEXT NOT NULL, UNIQUE(source_id, fingerprint));
      CREATE TABLE IF NOT EXISTS tasks (id TEXT PRIMARY KEY, import_id TEXT NOT NULL REFERENCES imports(id), candidate_id TEXT NOT NULL, data TEXT NOT NULL, UNIQUE(import_id, candidate_id));`);
  }
  createSource(name: string): Source {
    name = string(name, '来源名称', LIMITS.sourceName, true).trim();
    const existing = this.db.prepare('SELECT data FROM sources WHERE name = ?').get(name);
    if (existing) return JSON.parse(existing.data as string) as Source;
    const source: Source = { id: randomUUID(), name, createdAt: new Date().toISOString() };
    this.db.prepare('INSERT INTO sources VALUES (?, ?, ?)').run(source.id, name, JSON.stringify(source));
    return source;
  }
  assertSource(id: string) {
    if (!this.db.prepare('SELECT id FROM sources WHERE id = ?').get(id)) throw new AppError('来源不存在，请先新建或选择来源。');
  }
  fingerprint(input: AnalysisInput) { return createHash('sha256').update(JSON.stringify([input.text, input.referenceDate, input.role])).digest('hex'); }
  findImport(input: AnalysisInput): ImportRecord | undefined {
    const fingerprint = this.fingerprint(input);
    const records = this.db.prepare('SELECT data FROM imports WHERE source_id = ? AND (fingerprint = ? OR fingerprint LIKE ?) ORDER BY rowid DESC').all(input.sourceId, fingerprint, `${fingerprint}:%`).map(row => JSON.parse(row.data as string) as ImportRecord);
    // 历史非空候选及其任务继续复用；只让旧配置的空结果重新分析，旧记录不覆盖。
    return records.find(record => record.candidates.length > 0) ?? records.find(record => record.extractionConfig === this.extractionConfig);
  }
  saveImport(input: AnalysisInput, candidates: Candidate[], usage: Usage): ImportRecord {
    this.assertSource(input.sourceId);
    const existing = this.findImport(input);
    if (existing) return existing;
    const record: ImportRecord = { ...input, id: randomUUID(), candidates, usage, createdAt: new Date().toISOString(), extractionConfig: this.extractionConfig };
    this.db.prepare('INSERT INTO imports VALUES (?, ?, ?, ?)').run(record.id, input.sourceId, `${this.fingerprint(input)}:${this.extractionConfig}`, JSON.stringify(record));
    return record;
  }
  confirm(importId: string, candidateId: string, edited: TaskFields): Task {
    const { record, candidate } = this.candidate(importId, candidateId);
    const fields = validateEdited(edited);
    const existing = this.boundTask(importId, candidateId);
    if (existing) return existing;
    const task: Task = { ...fields, id: randomUUID(), importId, candidateId, sourceId: record.sourceId, evidence: candidate.evidence, createdAt: new Date().toISOString(), status: 'pending', revision: 0, corrections: [] };
    // 一次同步插入和唯一约束确保重复确认不会产生第二个任务。
    this.db.prepare('INSERT INTO tasks VALUES (?, ?, ?, ?)').run(task.id, importId, candidateId, JSON.stringify(task));
    return task;
  }
  private candidate(importId: string, candidateId: string) {
    const row = this.db.prepare('SELECT data FROM imports WHERE id = ?').get(importId);
    if (!row) throw new AppError('分析记录不存在。', 404);
    const record = JSON.parse(row.data as string) as ImportRecord;
    const candidate = record.candidates.find(item => item.id === candidateId);
    if (!candidate) throw new AppError('候选不属于此分析记录。');
    return { record, candidate };
  }
  private readTask(data: string): Task {
    const task = JSON.parse(data) as Task;
    return { ...task, status: task.status ?? 'pending', revision: task.revision ?? 0, corrections: task.corrections ?? [] };
  }
  private tasks(): Task[] {
    return this.db.prepare('SELECT data FROM tasks ORDER BY rowid DESC').all().map(row => this.readTask(row.data as string));
  }
  private boundTask(importId: string, candidateId: string): Task | undefined {
    return this.tasks().find(task => (task.importId === importId && task.candidateId === candidateId) || task.corrections.some(item => item.importId === importId && item.candidateId === candidateId));
  }
  private current(taskId: string, expectedRevision: unknown): Task {
    if (typeof expectedRevision !== 'number' || !Number.isSafeInteger(expectedRevision) || expectedRevision < 0) throw new AppError('任务版本无效，请重新读取。');
    const row = this.db.prepare('SELECT data FROM tasks WHERE id = ?').get(taskId);
    if (!row) throw new AppError('任务不存在，可能已经删除。', 404);
    const task = this.readTask(row.data as string);
    if (task.revision !== expectedRevision) throw new AppError('任务已在其他页面修改。草稿已保留，请重新读取并核对最新任务。', 409);
    return task;
  }
  private write(task: Task): Task {
    const updated = { ...task, revision: task.revision + 1 };
    this.db.prepare('UPDATE tasks SET data = ? WHERE id = ?').run(JSON.stringify(updated), task.id);
    return updated;
  }
  update(taskId: string, expectedRevision: unknown, edited: unknown): Task {
    const task = this.current(taskId, expectedRevision);
    return this.write({ ...task, ...validateEdited(edited) });
  }
  setStatus(taskId: string, expectedRevision: unknown, status: unknown): Task {
    const task = this.current(taskId, expectedRevision);
    if (status !== 'pending' && status !== 'done') throw new AppError('任务状态无效。');
    return this.write({ ...task, status });
  }
  delete(taskId: string, expectedRevision: unknown): void {
    this.current(taskId, expectedRevision);
    this.db.prepare('DELETE FROM tasks WHERE id = ?').run(taskId);
  }
  correct(taskId: string, expectedRevision: unknown, importId: string, candidateId: string, edited: unknown): Task {
    const task = this.current(taskId, expectedRevision);
    const fields = validateEdited(edited);
    const { record, candidate } = this.candidate(importId, candidateId);
    if (record.sourceId !== task.sourceId) throw new AppError('只能关联同一来源的任务。');
    const bound = this.boundTask(importId, candidateId);
    if (bound && bound.id !== task.id) throw new AppError('候选已关联其他任务，请重新读取。', 409);
    // 当前版本重放已有绑定完全不写入，避免旧候选覆盖后来的人工编辑。
    if (bound) return task;
    return this.write({ ...task, ...fields, corrections: [...task.corrections, { importId, candidateId, evidence: candidate.evidence, appliedAt: new Date().toISOString() }] });
  }
  state(): { sources: Source[]; imports: ImportRecord[]; tasks: Task[] } {
    return {
      sources: this.db.prepare('SELECT data FROM sources ORDER BY rowid').all().map(row => JSON.parse(row.data as string) as Source),
      imports: this.db.prepare('SELECT data FROM imports ORDER BY rowid').all().map(row => JSON.parse(row.data as string) as ImportRecord),
      tasks: this.tasks(),
    };
  }
  close() { this.db.close(); }
}
