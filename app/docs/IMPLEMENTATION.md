# 群聊待办助手 S1 Implementation Plan

> For agentic workers: 使用subagent-driven-development、测试驱动开发及项目AGENTS.md。用户已批准连续实施，普通细节无需再确认；S1价值试用闸门保留。

**Goal:** 本地浏览器粘贴合成消息，真实Flash提取有来源的候选，人工编辑确认、SQLite保存、刷新后可查。

**Architecture:** React/Vite客户端只访问同源/api。Node24.19原生HTTP服务绑定127.0.0.1，服务端读取.env并fetch模型，JSON校验后保存分析记录；确认候选才生成任务。node:sqlite存储source/import/candidate/task，不暴露密钥，不自动执行群消息。

**Tech Stack:** React、Vite、TypeScript、Node.js24.19的原生HTTP/fetch/SQLite/test runner。锁文件与精确包版本，不使用最新版本通配符。用pnpm安装，无需额外Node下载。

## 本阶段边界与接口

- 只完成S1四项，不提前实现S2状态管理/导出/更正UI。来源选择、相同输入复用和确认幂等属于基础一致性，可在S1实现。
- 类型：Candidate { id,title,audience,deadlineText,deadlineDate:string|null,materials:string[],evidence:string[],uncertainties:string[] }。Import {id,sourceId,text,referenceDate:string|null,role:string|null,candidates,usage,createdAt}。Task保存编辑字段及不可更换的原import/candidate绑定。
- 每条evidence为非空精确原文子串，日期没有基准不自动推测；引文存在只证明可定位，语义正确由模型测试/人工确认保证。无关闲聊允许空候选。模型响应非法、截断、超时不得作为成功。
- GET /api/state → sources/imports/tasks与非敏感模型配置状态；POST /api/sources {name}；POST /api/analyze {sourceId,text,referenceDate,role}；POST /api/tasks/confirm {importId,candidateId,edited}。输入界限写成命名常量和前后端可读提示。
- HTTP仅同源JSON mutation；拒绝跨源Origin/Host异常与超大body，.env/private/data不通过静态路径暴露。正常请求不记录原文或模型密钥。
- 单次分析最多一次模型请求，明确超时/取消、输入上限、响应上限；同来源相同文本/日期/角色复用，失败不缓存成成功。不同来源隔离；重复确认返回同任务而非新建。

## Task 1：测试驱动的数据与提取边界

Files: package.json, tsconfig.json, vite.config.ts; shared/types.ts; server/validation.ts, server/store.ts, server/extract.ts; tests/core.test.ts。

- [ ] 写行为测试：不能接受伪造出处；无基准的“明天”保持待确认；空候选合法；失败/截断不是成功；两个来源隔离；候选确认两次只生成一项；关闭重开数据库保留数据。
- [ ] 先运行node --test tests/*.test.ts，保存有效失败原因，不把缺环境当作业务失败。
- [ ] 实现最小校验、模型调用、存储与事务；以测试覆盖实际业务不变量，不添加通用插件系统。
- [ ] 运行npm等价pnpm test、typecheck，保存结果。

测试意图示例（实现者按真实接口写完整测试，不照抄占位函数）：
```ts
assert.throws(() => validateCandidates({tasks:[{evidence:['不存在的引文']}]}, '周五提交报名表'));
assert.equal(store.confirm(candidateId, edited).id, store.confirm(candidateId, edited).id);
assert.equal(reopenedStore.tasks().length, 1);
```

## Task 2：同源服务和可用页面

Files: server/index.ts; web/index.html, web/src/main.tsx, web/src/App.tsx, web/src/styles.css; tests/http.test.ts。

- [ ] 先补API非法来源/过大输入/确认字段及静态敏感路径测试，观察真实失败。
- [ ] 实现页面：清晰三步“粘贴消息→确认提取→保存待办”，来源/日期/角色标签、合成例子、发送预览、加载/错误/重试、空结果、可编辑候选、可展开出处、已保存待办。禁用不可能完成的按钮，不放假数据状态。
- [ ] 风格：浅暖底色、深绿主操作、大字清楚、克制卡片和留白；本地中文字体，44px触摸目标、可见焦点、手机纵向布局、reduced-motion。UI使用ui-ux-pro-max技能。
- [ ] build后Node同一端口提供dist与API；无dev依赖下运行入口清楚，监听127.0.0.1:4317，端口占用报错不杀其他项目。
- [ ] pnpm test/typecheck/build及真实Flash合成案例验证，记录模型、用量、耗时；不输出密钥。

## Task 3：独立验收与可回滚交付

Files: README.md, docs/STATUS.md, docs/reviews/s1.md；本地证据放tmp或private。

- [ ] 实际浏览器执行来源创建、输入预览、Flash分析、编辑确认、刷新持久化，核对结果与原文；检查手机宽度和无横向溢出。标记测试新增数据，不混入用户资料。
- [ ] Astra/medium只读对抗审查全部S1新增代码及行为证据；根因按预期→复现→定位→最小修复→回归，两轮失败升级。
- [ ] OCR preview补齐被过滤的测试/配置，必要敏感检查只报告布尔结果，不打印凭证。
- [ ] S1四项通过且高级审查闭环后才更新35%权重为完成，创建必要文件本地commit；提供链接和三组试用建议，等待用户价值判断后进入S2。

## 已核实环境与文档

- Node v24.19.0；pnpm位于C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm.cmd；bundled node packages同运行时dependencies/node/node_modules。
- 官方模型/models已确认deepseek-flash；JSON输出文档https://api-docs.deepseek.com/guides/json_mode/（response_format=json_object、提示需含json、检查空内容和截断）。React https://react.dev/learn；Vite https://vite.dev/guide/；SQLite https://nodejs.org/api/sqlite.html（只使用24版本已有的DatabaseSync/prepare/run/get/all，不使用26版本专有API）。Context7无工具，采用官方文档。
- S1开始2026-10-09 20:06北京时间，预计主动4–8小时，低置信度；审查/测试实测后重估。不得因为测试数量多报告功能完成。
