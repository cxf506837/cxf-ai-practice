# 群聊待办助手 S2 Implementation Plan

> For agentic workers: 按subagent-driven-development及项目AGENTS.md执行；Sol/high唯一产品写入者，Astra/medium阶段只读验收。用户已回答“继续吧”，普通实现无需再批准；仅阶段验收后由主线程本地提交。

**Goal:** 保存的任务可完成/重开、编辑删除、导出；新通知候选由用户选择同来源旧任务，比对并确认更正，不新增重复待办。

**Architecture:** 延续React/Vite与Node原生HTTP/SQLite。在已有JSON任务记录追加向后兼容的状态、版本和更正出处记录；不迁移/清空用户数据库，不引入依赖或新服务。更正使用已有模型候选，本地比对，无额外模型调用、隐式历史发送或自动关联。

**Tech Stack:** 当前锁定React19.3.0、Vite8.3.4、TypeScript7.0.2、Node24.19原生node:sqlite/fetch/test。Context7不可发现；涉及库API时以现有官方资料为基础并查询官方当前文档，不假称调用Context7。

## 冻结要求和起始状态

- 起点2f9ff18；已有dirty仅docs/STATUS.md和docs/TRIAL.md，是主线程本次记录用户反馈；执行者不覆盖这两份文档，不提交、不重启服务。
- S2四项：来源内重复处理；更正建议；完成重开编辑删除；导出与移动布局。相同来源完全相同text/referenceDate/role继续复用，来源不同隔离；不加入自动相似匹配。
- 首版更正由用户显式选择旧任务与当前候选，本地展示旧字段/原文、新字段/原文；候选可先编辑再应用。原始import/candidate/evidence绑定保持不可变，补存更正出处以解释当前字段。已完成任务更正后保持完成，撤销候选不会自动删除。
- 新任务状态默认pending、版本0；无新字段的S1记录读取时等价处理，写入后持久化。每次保存、更正、状态变更增加revision；多标签页旧版本修改/删除返回409，保留草稿并提示重新读取，不静默覆盖。
- 删除只删选择的待办，确认框说明原消息和分析记录保留。删除后候选可由用户再次明确保存；不做批量清空或自动重建任务。
- 更正必须同sourceId，候选不能已经是另一个任务的原始/更正绑定；重复应用同候选为完整no-op，字段/status/revision/出处都不变，不能回滚后续人工编辑。先核对expectedRevision，过期仍409；当前版本重复应用则返回当前任务。更正前校验ID/版本/字段，失败不得改变任务。确定性绑定记录用于防止该更正候选随后“保存成新待办”造成重复。
- 前端expectedRevision绑定打开编辑/更正时的旧字段快照。409后的“重新读取”要明确重建快照、保留/放弃草稿的选择，不能只换新revision让旧草稿覆盖新数据。
- JSON导出由同源GET提供，包含版本、来源、导入原文/候选和当前任务/更正出处；无密钥、环境配置、源码。当前未实现导入恢复，页面不称导出为一键恢复。用户主动下载；页面提示包含原文。
- 保留输入预览、大小/45秒上限、Host/Origin限制、无外部写入工具。页面新增操作有加载/错误、44px目标、390手机无横向溢出。

## Task 1：数据行为与HTTP接口

Files: shared/types.ts；server/store.ts、validation.ts、http.ts；tests/tasks.test.ts及必要tests/http.test.ts。现有提取提示/模型无需修改。

接口按已有POST JSON风格：

```ts
// Task追加向后兼容字段，revision读取默认0，status默认pending。
type TaskStatus = 'pending' | 'done';
// 更正出处条目含importId,candidateId,evidence,appliedAt；原Task绑定不变。
// mutation参数均显式传旧版本，不接受body里的sourceId/evidence替换。
POST('/api/tasks/update', {taskId, expectedRevision, edited});
POST('/api/tasks/status', {taskId, expectedRevision, status});
POST('/api/tasks/delete', {taskId, expectedRevision});
POST('/api/tasks/correct', {taskId, expectedRevision, importId, candidateId, edited});
GET('/api/export'); // application/json, Attachment，文件名不含用户原文
```

- [x] 在生产方法前写并跑红测，保存退出码和最早失败断言。使用合成内存/临时SQLite，不读取真实.env或data。
- [x] 覆盖S1旧记录默认值、完成重开重启持久化、编辑不改原文、同版本并发第二次409、无效字段/伪绑定无写入、未知任务404。
- [x] 覆盖更正同来源成功/跨来源拒绝、原文和原绑定保留、新出处正确、重复应用不新增、已完成状态保持、更正候选不能另存重复任务。
- [x] 覆盖删除只删目标任务/保留imports及其他任务、删除与旧版本冲突、导出parsed JSON与state业务字段一致且不含敏感配置。

验收断言示意（以最终实际方法名展开，不用空assert）：

```ts
assert.equal(reopened.state().tasks[0].status, 'done');
assert.equal(updated.importId, original.importId);
assert.throws(() => store.update(task.id, 0, edited), e => e instanceof AppError && e.status === 409);
assert.equal(corrected.status, 'done');
assert.equal(corrected.corrections.length, 1);
assert.equal(store.state().tasks.length, 1);
assert.equal(store.state().imports.length, importsBeforeDelete);
```

- [x] 实现最小同步SQLite操作；只在确有多次相互依赖写入时事务。校验完成再写，错误仍为安全AppError。
- [x] 补HTTP层同源/Origin、404/409、导出Content-Disposition、非法更正无状态改变测试。既有路径边界和14项测试保持。
- [x] 跑pnpm test、pnpm typecheck；不得用修改断言掩盖已批准业务不变量。

## Task 2：可操作页面

Files: web/src/App.tsx、web/src/styles.css；可新增web/src/TaskCard.tsx（只提取保存任务相关组件，避免整个页面重构）。README.md更新真实操作与导出限制。

- [x] 保存任务卡显示待办/完成，支持标记完成/重新打开、保存后编辑/取消、明确二次删除确认；错误不丢草稿。旧版本冲突给重新读取入口。
- [x] 候选可选择同来源已保存任务，展示旧任务字段/旧原文与新候选字段/新原文，明确“确认更正此任务”；没有选择不自动更正。应用后卡片标为已关联，原“另存”按钮不得产生重复；原出处与更正出处均可查。
- [x] JSON导出按钮下载实际服务结果；明确“含原消息，妥善保管”，不把供应商密钥传客户端。
- [x] 维持现有中文浅暖/深绿界面，44px触摸目标、键盘焦点、手机纵向布局及reduced-motion，ui-ux-pro-max沿用已批准风格。
- [x] pnpm test/typecheck/build，OCR delegate preview补审过滤文件；停止源码写入，向主线程报改变的文件、红绿测试和剩余疑点。无付费调用、无自主提交/重启。

## Task 3：主线程真实验收与高级闭环

Files: docs/STATUS.md、docs/TRIAL.md、docs/reviews/s2.md；合成浏览器证据仅tmp/s2/。

- [x] 先核实本项目服务进程，重启加载冻结代码，保留data。Chrome建立明确S2合成来源/通知，不操作用户试用任务。
- [x] 浏览器实际生成一项/确认，重复分析复用；编辑→完成→刷新→重开；新更正通知真实Flash提取→人工关联→比对确认→仅一项任务且旧/新原文可查；已完成状态不被更正改变。
- [x] 真实下载JSON，解析并核对合成任务/原文/来源及无密钥；删除合成目标任务，确认其原消息和其他任务仍在；1440/390宽度无横向溢出、pageerror为空。
- [x] Astra/medium实际只读审查完整S2修改、旧版兼容、状态/绑定/并发/更正/导出/输入边界；复现意见后最小修正。两轮失败按AGENTS升级，不扩大功能。
- [x] 最终相关工程检查、OCR全清单直接补审、敏感检查、安全阶段提交。四项及高级闭环前S2正式进度0/4；通过为4/4，项目70%。S3质量评测另计，不宣称已过。

## 时间记录

S2开始2026-10-09 21:12北京时间，预估主动4–8h，条件结束10月10日01:12–05:12；低置信度，包含一次有限高级审查及修正复查。首次口头估算用了约21:15，台账以上述实际读取时刻校正。阶段结束比较实测，不用写代码速度替代完整验收。
