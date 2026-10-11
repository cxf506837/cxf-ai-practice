import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from '../server/store.ts';
import { AppError } from '../server/validation.ts';
import type { TaskFields, Candidate } from '../shared/types.ts';

const fields: TaskFields = { title: '提交报名表', audience: '家长', deadlineText: '周五', deadlineDate: null, materials: ['报名表'], uncertainties: [] };
const usage = { promptTokens: 1, completionTokens: 1, totalTokens: 2, elapsedMs: 1 };
function fixture(path = ':memory:') {
  const store = new Store(path);
  const source = store.createSource('合成班级群');
  const candidate: Candidate = { ...fields, id: 'initial', evidence: ['提交报名表'] };
  const record = store.saveImport({ sourceId: source.id, text: '家长周五提交报名表', referenceDate: null, role: null }, [candidate], usage);
  const task = store.confirm(record.id, candidate.id, fields);
  return { store, source, record, candidate, task };
}
const status = (code: number) => (error: unknown) => error instanceof AppError && error.status === code;

test('S1旧记录读取默认值，完成和重开在关闭重启后仍保留', () => {
  const dir = mkdtempSync(join(tmpdir(), 'chat-s2-'));
  const path = join(dir, 'test.sqlite');
  let { store, task } = fixture(path);
  try {
    const { status: _status, revision: _revision, corrections: _corrections, ...legacy } = task;
    store.db.prepare('UPDATE tasks SET data = ? WHERE id = ?').run(JSON.stringify(legacy), task.id);
    assert.equal(store.state().tasks[0].status, 'pending');
    assert.equal(store.state().tasks[0].revision, 0);
    assert.deepEqual(store.state().tasks[0].corrections, []);
    const confirmedLegacy = store.confirm(task.importId, task.candidateId, fields);
    assert.equal(confirmedLegacy.status, 'pending'); assert.equal(confirmedLegacy.revision, 0); assert.deepEqual(confirmedLegacy.corrections, []);
    assert.equal(store.setStatus(task.id, 0, 'done').revision, 1);
    store.close(); store = new Store(path);
    assert.equal(store.state().tasks[0].status, 'done');
    store.setStatus(task.id, 1, 'pending');
    store.close(); store = new Store(path);
    assert.equal(store.state().tasks[0].status, 'pending');
    assert.equal(store.state().tasks[0].revision, 2);
  } finally { store.close(); rmSync(dir, { recursive: true }); }
});
test('编辑保留原绑定、出处和原文，旧版本/非法字段/未知ID不写入', () => {
  const { store, task, record } = fixture();
  try {
    const updated = store.update(task.id, 0, { ...fields, title: '人工编辑' });
    assert.equal(updated.title, '人工编辑'); assert.equal(updated.revision, 1);
    assert.equal(updated.importId, record.id); assert.equal(updated.candidateId, task.candidateId);
    assert.deepEqual(updated.evidence, task.evidence); assert.equal(store.state().imports[0].text, record.text);
    const before = store.state();
    assert.throws(() => store.update(task.id, 0, fields), status(409));
    assert.throws(() => store.update(task.id, 1, { ...fields, title: '' }), status(400));
    assert.throws(() => store.setStatus(task.id, 1, 'invalid'), status(400));
    for (const revision of [undefined, -1, 0.5, '1']) assert.throws(() => store.update(task.id, revision, fields), status(400));
    assert.throws(() => store.update('missing', 0, fields), status(404));
    assert.deepEqual(store.state(), before);
  } finally { store.close(); }
});
test('同来源更正保留初始绑定和done，追加可追溯出处并阻止重复另存', () => {
  const { store, task, source, record } = fixture();
  try {
    const correction = { ...fields, id: 'correction', deadlineText: '周六', evidence: ['改为周六提交'] };
    const next = store.saveImport({ sourceId: source.id, text: '报名表改为周六提交', referenceDate: null, role: null }, [correction], usage);
    store.setStatus(task.id, 0, 'done');
    const corrected = store.correct(task.id, 1, next.id, correction.id, { ...fields, deadlineText: '周六' });
    assert.equal(corrected.status, 'done'); assert.equal(corrected.revision, 2);
    assert.equal(corrected.importId, record.id); assert.equal(corrected.candidateId, task.candidateId);
    assert.deepEqual(corrected.evidence, task.evidence); assert.equal(corrected.corrections.length, 1);
    assert.equal(corrected.corrections[0].importId, next.id);
    assert.equal(corrected.corrections[0].candidateId, correction.id);
    assert.deepEqual(corrected.corrections[0].evidence, correction.evidence);
    assert.ok(Number.isFinite(Date.parse(corrected.corrections[0].appliedAt)));
    assert.deepEqual(store.correct(task.id, 2, next.id, correction.id, fields), corrected);
    assert.equal(store.confirm(next.id, correction.id, fields).id, task.id);
    assert.equal(store.state().tasks.length, 1); assert.equal(store.state().tasks[0].deadlineText, '周六');
    assert.equal(store.state().imports[0].text, record.text);
    const manual = store.update(task.id, 2, { ...fields, title: '后来人工编辑', deadlineText: '人工确认的周日' });
    assert.throws(() => store.correct(task.id, 2, next.id, correction.id, fields), status(409));
    assert.deepEqual(store.correct(task.id, 3, next.id, correction.id, fields), manual);
    const otherRecord = store.saveImport({ sourceId: source.id, text: '另一任务', referenceDate: null, role: null }, [{ ...correction, id: 'other-task', evidence: ['另一任务'] }], usage);
    const otherTask = store.confirm(otherRecord.id, 'other-task', fields);
    assert.throws(() => store.correct(otherTask.id, 0, next.id, correction.id, fields), status(409));
    store.delete(task.id, 3);
    assert.equal(store.state().imports.length, 3);
    assert.equal(store.state().tasks[0].id, otherTask.id);
    assert.notEqual(store.confirm(next.id, correction.id, fields).id, task.id);
  } finally { store.close(); }
});
test('更正跨来源、伪绑定、已绑定另一任务、旧版本和非法字段均无写入', () => {
  const { store, task, source } = fixture();
  try {
    const other = store.createSource('合成社团群');
    const candidate = { ...fields, id: 'other', evidence: ['提交报名表'] };
    const cross = store.saveImport({ sourceId: other.id, text: '提交报名表', referenceDate: null, role: null }, [candidate], usage);
    const same = store.saveImport({ sourceId: source.id, text: '再次提交报名表', referenceDate: null, role: null }, [candidate], usage);
    const second = store.confirm(same.id, candidate.id, fields);
    const before = store.state();
    assert.throws(() => store.correct(task.id, 0, cross.id, candidate.id, fields), status(400));
    assert.throws(() => store.correct(task.id, 0, same.id, 'forged', fields), status(400));
    assert.throws(() => store.correct(task.id, 0, same.id, candidate.id, fields), status(409));
    assert.throws(() => store.correct(second.id, 0, cross.id, candidate.id, { ...fields, title: '' }), status(400));
    assert.throws(() => store.correct(task.id, 5, same.id, candidate.id, fields), status(409));
    assert.deepEqual(store.state(), before);
  } finally { store.close(); }
});
test('删除仅移除目标任务，保留分析/其他任务，旧版本不能删；再次明确确认可保存', () => {
  const { store, task, source, record, candidate } = fixture();
  try {
    const next = store.saveImport({ sourceId: source.id, text: '另交照片', referenceDate: null, role: null }, [{ ...candidate, id: 'second', title: '交照片', evidence: ['另交照片'] }], usage);
    const second = store.confirm(next.id, 'second', { ...fields, title: '交照片' });
    store.setStatus(task.id, 0, 'done');
    assert.throws(() => store.delete(task.id, 0), status(409));
    store.delete(task.id, 1);
    assert.deepEqual(store.state().tasks.map(item => item.id), [second.id]);
    assert.equal(store.state().imports.length, 2);
    assert.throws(() => store.delete(task.id, 1), status(404));
    assert.notEqual(store.confirm(record.id, candidate.id, fields).id, task.id);
  } finally { store.close(); }
});
