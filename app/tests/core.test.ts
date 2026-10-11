import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateCandidates, validateInput, validateEdited } from '../server/validation.ts';
import { Store } from '../server/store.ts';
import type { AnalysisInput, Candidate, Usage } from '../shared/types.ts';

const input: AnalysisInput = { sourceId: 'source-a', text: '各位家长，请明天提交报名表。', referenceDate: null, role: null };
const fields = { title: '提交报名表', audience: '家长', deadlineText: '明天', deadlineDate: null, materials: ['报名表'], uncertainties: [] };
const raw = () => ({ ...fields, evidence: ['请明天提交报名表'] });
const usage: Usage = { promptTokens: 1, completionTokens: 1, totalTokens: 2, elapsedMs: 1 };

test('伪造或空白出处不能进入候选', () => {
  for (const evidence of [['不存在的引文'], [], [' ']]) {
    assert.throws(() => validateCandidates({ tasks: [{ ...raw(), evidence }] }, input));
  }
});
test('没有日期基准时不能把明天编造为确定日期', () => {
  const [candidate] = validateCandidates({ tasks: [{ ...raw(), deadlineDate: '2030-01-02' }] }, input);
  assert.equal(candidate.deadlineDate, null);
  assert.ok(candidate.uncertainties.length > 0);
});
test('其他任务的完整日期不能替明天建立基准，空日期原文不能有确定日期', () => {
  const mixed = { ...input, text: '会议定于2026年10月12日。家长明天提交报名表。' };
  const [relative] = validateCandidates({ tasks: [{ ...raw(), evidence: ['家长明天提交报名表'], deadlineDate: '2026-10-13' }] }, mixed);
  assert.equal(relative.deadlineDate, null);
  const [missing] = validateCandidates({ tasks: [{ ...raw(), deadlineText: '', deadlineDate: '2026-10-13' }] }, { ...input, referenceDate: '2026-10-12' });
  assert.equal(missing.deadlineDate, null);
});
test('无关闲聊允许空候选，非任务数组及超量候选失败', () => {
  assert.deepEqual(validateCandidates({ tasks: [] }, input), []);
  assert.throws(() => validateCandidates({}, input));
  assert.throws(() => validateCandidates({ tasks: Array.from({ length: 21 }, raw) }, input));
});
test('不合法输入与编辑字段被拒绝，真实日历日期才合法', () => {
  assert.throws(() => validateInput({ ...input, text: ' ' }));
  assert.throws(() => validateInput({ ...input, referenceDate: '2026-02-30' }));
  assert.throws(() => validateEdited({ ...fields, title: '' }));
  assert.throws(() => validateEdited({ ...fields, materials: '报名表' }));
});
test('候选确认幂等，不能跨导入伪绑定，数据库关闭重开保留原文和编辑', () => {
  const dir = mkdtempSync(join(tmpdir(), 'chat-assistant-test-'));
  const path = join(dir, 'test.sqlite');
  let store = new Store(path);
  try {
    const first = store.createSource('班级群');
    const second = store.createSource('社团群');
    assert.notEqual(first.id, second.id);
    const candidate: Candidate = { ...raw(), id: 'candidate-a' };
    const a = store.saveImport({ ...input, sourceId: first.id }, [candidate], usage);
    const b = store.saveImport({ ...input, sourceId: second.id }, [{ ...candidate, id: 'candidate-b' }], usage);
    assert.notEqual(a.id, b.id);
    assert.throws(() => store.confirm(b.id, candidate.id, fields));
    const edited = { ...fields, title: '核对后提交报名表' };
    const task = store.confirm(a.id, candidate.id, edited);
    assert.equal(store.confirm(a.id, candidate.id, fields).id, task.id);
    assert.equal(store.state().tasks.length, 1);
    store.close();
    store = new Store(path);
    assert.equal(store.state().tasks[0].title, edited.title);
    assert.equal(store.state().imports[0].text, input.text);
  } finally { store.close(); rmSync(dir, { recursive: true }); }
});
test('旧配置空结果允许重新分析并保留旧记录，同配置空结果继续幂等', () => {
  const dir = mkdtempSync(join(tmpdir(), 'chat-cache-test-'));
  const path = join(dir, 'test.sqlite');
  let store = new Store(path, 'test-config-before');
  try {
    const source = store.createSource('合成配置回归');
    const request = { ...input, sourceId: source.id };
    const old = store.saveImport(request, [], usage);
    assert.equal(store.saveImport(request, [], usage).id, old.id);
    store.close(); store = new Store(path, 'test-config-after');
    assert.equal(store.findImport(request), undefined);
    const next = store.saveImport(request, [], usage);
    assert.notEqual(next.id, old.id);
    assert.equal(next.extractionConfig, 'test-config-after');
    assert.equal(store.findImport(request)?.id, next.id);
    assert.equal(store.state().imports.length, 2);
    assert.deepEqual(store.state().imports.find(record => record.id === old.id)?.candidates, []);
    assert.equal(store.saveImport(request, [], usage).id, next.id);
  } finally { store.close(); rmSync(dir, { recursive: true }); }
});
test('配置变化继续复用已有非空候选及确认任务，不重建任务', () => {
  const dir = mkdtempSync(join(tmpdir(), 'chat-cache-tasks-'));
  const path = join(dir, 'test.sqlite');
  let store = new Store(path, 'test-config-before');
  try {
    const source = store.createSource('合成任务版本回归');
    const request = { ...input, sourceId: source.id };
    const original = store.saveImport(request, [{ ...raw(), id: 'candidate-version' }], usage);
    const task = store.confirm(original.id, original.candidates[0].id, fields);
    store.close(); store = new Store(path, 'test-config-after');
    assert.equal(store.findImport(request)?.id, original.id);
    assert.equal(store.saveImport(request, [], usage).id, original.id);
    assert.equal(store.confirm(original.id, original.candidates[0].id, fields).id, task.id);
    assert.equal(store.state().imports.length, 1);
    assert.equal(store.state().tasks.length, 1);
  } finally { store.close(); rmSync(dir, { recursive: true }); }
});
test('旧版无配置指纹记录兼容：空结果可重分析，非空及已确认任务保持原样', () => {
  const dir = mkdtempSync(join(tmpdir(), 'chat-legacy-cache-'));
  try {
    for (const hasCandidate of [false, true]) {
      const path = join(dir, `${hasCandidate}.sqlite`);
      let store = new Store(path, 'test-config-before');
      try {
        const source = store.createSource('旧版合成数据');
        const request = { ...input, sourceId: source.id };
        const old = store.saveImport(request, hasCandidate ? [{ ...raw(), id: 'legacy-candidate' }] : [], usage);
        const task = hasCandidate ? store.confirm(old.id, old.candidates[0].id, fields) : null;
        const legacy = { ...old };
        delete legacy.extractionConfig;
        // 按已发布S1初版格式建立数据：无配置字段，fingerprint仅含输入。
        store.db.prepare('UPDATE imports SET fingerprint = ?, data = ? WHERE id = ?').run(store.fingerprint(request), JSON.stringify(legacy), old.id);
        store.close(); store = new Store(path, 'test-config-after');
        assert.equal(store.findImport(request)?.id, hasCandidate ? old.id : undefined);
        const next = store.saveImport(request, [{ ...raw(), id: 'reanalysis-candidate' }], usage);
        assert.equal(next.id === old.id, hasCandidate);
        assert.deepEqual(store.state().imports.find(record => record.id === old.id), legacy);
        assert.equal(store.state().imports.length, hasCandidate ? 1 : 2);
        if (task) assert.equal(store.confirm(old.id, old.candidates[0].id, fields).id, task.id);
        assert.equal(store.state().tasks.length, hasCandidate ? 1 : 0);
      } finally { store.close(); }
    }
  } finally { rmSync(dir, { recursive: true }); }
});
