# 自有账户的免费部署

静态作品站已上线，后端已完成37项真实HTTPS断言及2次模型调用验收，真实Redis已检查；公众七天窗口已一次激活，结束于北京时间10月19日15:30。此说明保留复验与关闭步骤，不应重新初始化或重跑已完成的付费阶段。使用白名单导出的新目录app/、site/和根render.yaml；不要将整个工作区或原Git历史上传。

## 账户与环境

1. 账户持有者在自己的GitHub、Render、Upstash登录。GitHub源码库只加入导出清单；不要上传.env、SQLite、raw resume或私人聊天。部署前可以先保持私有库，真实sourceURL公开后再启用站点入口。
2. Upstash新建自己拥有的免费Redis；不选择付费升级或自动付费功能。REST URL/token只在本地安全环境文件和Render服务Environment设置，不粘贴到聊天或命令行，不从浏览器cookie抽取。
3. 使用同一个BUDGET_ID。安全环境文件设置UPSTASH_REDIS_REST_URL、UPSTASH_REDIS_REST_TOKEN、BUDGET_ID，执行 `node --env-file=<安全环境文件> scripts/budget-setup.ts init`。这是原子一次创建；已存在拒绝，任何故障都不得换ID或重置额度。init不会启动公开窗口。
4. 如要验证Redis脚本，在安全文件中设置BUDGET_TEST_READY=yes，再运行 `node --env-file=<安全环境文件> scripts/check-budget.ts`。它仅操作随机test_键，检查竞争、重启/重复初始化、限次、损坏和过期，不调用模型；完成后清理测试键，不动正式账本。
5. 上线准备就绪时执行 `node --env-file=<安全环境文件> scripts/budget-setup.ts activate`。它只允许一次，并从Redis服务器时间起七天返回PUBLIC_DEMO_END_AT；不改变预留计数。把返回的UTC时间设置到Render及本轮其他入口的安全环境中。

## Render配置

根render.yaml定义一个Docker Web Service，plan:free；另一个runtime:static静态站。autoDeployTrigger:off，所有访问码、key、token及固定origin字段使用sync:false。不要创建收费数据库或磁盘。Docker固定Node24.19.0，安装pnpm11.25.0；原生HTTP+node:sqlite不需要生产node_modules。

Demo环境：APP_MODE=demo；PORT由平台使用10000；PUBLIC_ORIGIN为实际服务HTTPS origin（没有路径或尾斜线）；DEMO_ACCESS_CODE是12–128字符安全访问码；DEEPSEEK_API_KEY及Upstash字段只在服务端；PUBLIC_DEMO_END_AT须与账本一致。先建服务得到真实地址，再填PUBLIC_ORIGIN并部署。初次缺固定origin会启动失败，属于关闭状态，不能临时信任任意Host/代理头。

Demo预算阶段仅由服务端部署环境DEMO_BUDGET_STAGE设置，缺省public；合法值为acceptance、recording、public，其他值在启动时拒绝，APP_MODE=local忽略该选项。云验收先设acceptance并重新部署，按既定2次分配验收；录制前改recording并重新部署，按既定3次分配录制；完成后切回public并重新部署、核验生效，再分享访问码。阶段切换不初始化或重置账本，不接受客户端body/header指定阶段，也不新增维护API。公众阶段原有每日10次、每会话3次和七天到期限制保持。

静态站rootDir=site，buildCommand=node build.mjs，发布dist。构建把kage.html同时放为index.html，保留案例页和素材相对路径。得到真实URL后，修改site/public/landing-pages/public-links.json的tryUrl/sourceUrl；真实调用采样视频已核验，liveVideoUrl接入MP4文件。未填写保持明确不可用标签，不放示例域名。

[Render免费实例说明](https://render.com/docs/free)：闲置15分钟会休眠，唤醒可能约一分钟；免费实例本地文件不持久。因此Demo只用每会话:memory:，重启会清空任务；Upstash账本独立持久，不随服务重启重置。体验前提示等待，下载JSON可保留合成结果。本地SQLite版仍用于用户电脑。

## 上线后检查与关闭

- 实际HTTPS同源登录并跑完整通知→编辑确认→done→更正保留出处→export；第二会话看不到第一会话、复制ID不能读写；其他Origin/Host拒绝。
- 本轮付费入口共用一个账本，预算20元(2000分)、每次保守预留20分，共100次：实验60、录制3、验收2、公众30、故障5。公众全站UTC每天最多10次、每会话3次，全局并发租约。失败与未知结果不退预留，缓存零调用。
- 这是本轮软件保守预留，不是DeepSeek账户发票硬上限；旧local、旧S3入口和账户其他应用不能拿此账本证明限额。完整模型body≤16KiB，输出4096，45秒有界请求不等于保证供应商已停止计费。官方2026-10-11核验Flash峰值cache-miss输入2元/百万、输出8元/百万，实际价格/账单以后仍需核对。
- 七天到期自动拒绝新增公众模型调用，缓存和静态案例仍可读。账户持有者可手动停止Render服务，或移除服务key立即关闭付费；不删除历史证据，不重置账本。源码回滚不能恢复临时会话或返还预留。

资料来自[Render Blueprint官方参考](https://render.com/docs/blueprint-spec)、[Upstash REST官方参考](https://upstash.com/docs/redis/features/restapi)、[DeepSeek官方价格页](https://api-docs.deepseek.com/zh-cn/quick_start/pricing/)。当前Context7工具不可用，使用官方文档；没有假称调用Context7。

本轮真实调用视频：[采样MP4](../site/public/landing-pages/portfolio-assets/cxf-recruitment-demo-20261012.mp4)与[说明](../site/public/landing-pages/portfolio-assets/cxf-recruitment-demo-20261012/video-notes.md)。录制源版本66a39f3；Codex自动化操作，低帧率截图采样剪辑，非连续录屏。三次真实调用、两次预算拦截；界面分析显示1.9/1.7/1.4秒，不是视频等待时长或独立供应商响应计时。当前账本65次、1300分（13元）软件预留：experiment60、acceptance2、recording3、public0；实际费用仅保守token估算，未新增请求。公开窗口结束于2026-10-19T07:30:03.858Z（北京时间10月19日15:30），不重复激活、不重置预算；手机异网业务验收仍待本人完成。
