# cxf · Vibe Coding学习者 · 寻AI应用实习

这份材料记录AI辅助产品实践。cxf提出需求、选择参考设计、试用应用、核对结果并反馈；代码和技术实现主要由Codex完成。两例实验金标由cxf亲自核对助手整理的修订答案，不能称为独立完成全部标注或工程实现。

## 从源码使用

导出目录结构为app/、site/、docs/和render.yaml，SOURCE-MANIFEST.json逐文件记录SHA-256；根.gitignore排除本地依赖、环境、数据和实验runs。不要复制原项目.env或data。需要Node24.19.0、pnpm11.25.0。

```powershell
cd app
pnpm install --frozen-lockfile
Copy-Item .env.example .env
pnpm build
pnpm start
```

仅在新目录不存在.env时执行复制。空key仍可管理本地合成来源与任务；真实分析需自己在安全本地编辑器配置key。本地默认loopback http://127.0.0.1:4317，持久保存SQLite；demo固定HTTPS+访问码、临时隔离会话，不能用于真实群聊上传。

本轮Windows执行环境若拒绝pnpm junction，可在当前PowerShell设置 `$env:pnpm_config_node_linker='hoisted'` 后按上述原锁文件安装及运行检查；不改依赖版本。安装方式需在后续pnpm命令中保持一致，避免pnpm自动切回链接目录。本机pnpm11使用pnpm_config_前缀，npm_config_未生效；该差异已从安装的CLI实现核对，当前无Context7工具。

网站：`cd site`，`node build.mjs`输出dist/index.html；`node serve.mjs`仅本地预览4173。线上通过免费static服务发布dist，实际URL与源码未配置时显示待完成。保留原场景构图、字体和动效，不公开专业、年级、手机号或原始简历。联系邮箱974250837@qq.com已获授权。

## 看什么证据

- 演示：现有docs/assets/demo.webm及网站视频约70秒，为历史真实输出回放；不是本轮实时调用。新实时视频由真实服务流程录制后再启用，当前待录制。
- 应用：完整通知、同来源更正、模糊日期与闲聊三组固定合成preset。候选可编辑，确认后保存；完成状态和初始出处在更正后保留。页面区分live与cached，错误保留输入且不自动重试。
- 实验：experiments/context/含10组、A/B可见范围、provenance、固定评分器和三轮计划。实测尚未运行，没有结果。先高级预审和冻结，再由共同预算控制60次；cxf核对5份输出。
- 实验配置与源码已在高级有限复核后冻结，文件frozen.json随包提供。真实账本验收仍未通过，不能因冻结而开始付费；格式失败也保留安全合成响应与用量，并分别计实际请求和预留。
- 旧报告：docs/RESULTS.md、docs/STATUS.md及eval/results/属于2026-10-10本地版本历史。保留失败和小样本限制；历史100%是当时本地交付，不是本轮进度、现实准确率或新实验成绩。
- 模型：应用为DeepSeek Flash。开发为GPT-6.1 Sol/high唯一执行者；高级审查为实际GPT-6 Astra/medium，调用与范围以本轮台账/审查证据为准。Codex开发额度不等于应用API已付款或已部署。

## 用户尚需参与的具体步骤

1. 自有GitHub/Render/Upstash登录和部署资源确认；提供安全环境设置而非聊天粘贴凭证。无自动收费升级。
2. 两例修订金标已核对。真实结果出来后，核对H01 A/B、S01 A/B和一例无需历史共5份，写错在哪里、为何错、还需人工改几项，不预设上下文一定更好。
3. 在第二台手机、另一网络打开真实HTTPS，登录、选样例、核对确认、更正、下载；报告设备与网络和实际结果。390浏览器viewport只证明局部布局，不能替代这一项。
4. 录制新的实时流程时显式标live/cached，只计账本recording阶段最多3次。公众入口打开前，高级复核和验收阶段最多2次；其他故障总共最多5次，不调gold或补跑超限。

## 复验与限制

`pnpm test`、`pnpm typecheck`、`pnpm build`为工程检查。`node scripts/mock-demo.ts`为localhost:4319隔离fixture，不读取.env、不碰data、不调用模型，页面明确MOCK；固定测试码不是线上访问码。它仅帮助浏览器验证界面，不算真实模型演示。

Docker配置已准备，本机daemon未运行，镜像未构建。免费托管有休眠等待，服务重启清空临时任务，但预算账本不清空。JSON不支持导入恢复。来源引用可定位不保证语义正确。原子账本、真实模型实验、公开HTTPS、实时视频与手机异网验收需分别记录，未执行项不能计通过。

预算报告中的budgetReservedCount和金额仅计收到成功回执的已确认预留。reserve网络失败时Redis可能已经预留，不能据零确认数断言零费用；报告中由确认数计算的budgetReservedFenUpperBound只表示这部分预留，不含未知预留。全部计划预留的保守上界仍为60×20分，实际账本增量必须另核；这些数值均不是供应商发票或账户其他应用的费用上限。
