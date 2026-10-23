# cxf · AI 应用开发实践

我正在寻找 **AI 应用开发实习机会**，学习方向是 Vibe Coding。这里展示从需求选择、AI 辅助实现到验证、演示与部署的实践。

**[访问个人作品网站](https://cxf-portfolio.onrender.com/) · [群聊助手演示视频](https://cxf-portfolio.onrender.com/works/chat-task-assistant.html#live-demo-video) · [上下文实验结果](app/experiments/context/RESULTS.md)**

## 先看哪个项目

| 项目 | 解决的问题 | 源码与说明 |
| --- | --- | --- |
| [群聊待办助手](https://cxf-portfolio.onrender.com/works/chat-task-assistant.html) | 群通知中的任务、截止日期、材料容易遗漏；模型提取后由人核对、修改和确认 | [完整应用 README](app/README.md) |
| [拾光收集箱](https://cxf-portfolio.onrender.com/works/ribbon-inbox.html) | 收藏文字、链接和图片后，用关键词找回，并对选定资料整理和问答 | [核心源码 README](ribbon-inbox/README.md)，含离线测试；第三方视觉素材不在此快照 |
| [上下文对照实验](https://cxf-portfolio.onrender.com/works/context-experiment.html) | 加入相关历史是否补全通知信息？过期历史会不会造成错误关联？ | [实验设计](app/experiments/context/README.md) · [全部结果](app/experiments/context/RESULTS.md) |
| 个人作品网站 | 把视频、案例、源码集中呈现 | [站点运行说明](site/README.md) |

网络配置助手不在本次 README 整理范围。

## 可以检查的证据

- **群聊助手：** 2026-10-12 的云端验收包含 37 项 HTTPS 断言与 2 次真实模型调用；工程测试、类型检查和构建见[交付记录](app/docs/RECRUITMENT-DELIVERY.md)。历史结果不是当前服务可用性保证。
- **上下文实验：** 10 个合成案例 × A/B 两组 × 3 轮，共 60 次真实调用；60 次结构成功、0 次请求失败。结构成功不等于语义正确，遗漏与原始输出一并公开，不写成真实场景准确率。
- **拾光收集箱：** 2026-10-11 项目记录有 22 项 Node 业务/接口测试（覆盖基础及 AI）、11 项浏览器图片与问答流程、25 项仓储断言及 7 项 Android JUnit。测试层级和本次复现结果见[项目说明](ribbon-inbox/README.md)，不把各阶段计数相加成覆盖率。

## 我的参与和 AI 的参与

我提出需求、选择设计参考、试用并反馈；核对了两例修订答案，查看五份指定实验输出并暂不修改。主要代码、测试工具和部署工作由 Codex 辅助完成；独立模型复核使用 GPT-6 Astra / Medium。这些材料不证明我独立编写了全部代码，也不代表已经掌握 Agent 框架、RAG 或多智能体工程。

## 快速复现

从本仓库根目录分别执行，勿混用两个项目的依赖和数据：

```powershell
# 群聊助手：不填 API Key 也可做本地数据管理和离线工程测试
cd app
pnpm install --frozen-lockfile
ppnpm test
pnpm typecheck
pnpm build
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
pnpm start
```

应用地址为 http://127.0.0.1:4317；真实分析需自行配置 API Key，会产生供应商费用。[配置与边界](app/README.md#启动)。验证环境为 Node 24.19.0、pnpm 11.25.0。

```powershell
# 另开终端，从仓库根目录复现拾光的核心离线测试
cd ribbon-inbox
pnpm install --frozen-lockfile
pnpm test
```

此测试入口不需要模型密钥，不会向供应商发请求；它不启动完整 UI，也不构建 APK。

## 当前展示状态（2026-10-23）

静态网站、视频和公开源码继续用于展示。群聊助手的七天付费试用窗口已于 **2026-10-19 15:30（北京时间）**结束，网站入口标记为“试用已结束”；本次没有延期、重置额度或新增付费调用。本地仍可运行源码。

第二台手机异网业务验收、拾光 Android 真机密钥库/系统选图/升级保留/性能仍未形成完成证据。视频的实时调用、缓存、历史回放与低帧率采样均保留各自标签。

## 目录、数据与素材

- `app/`：群聊助手完整公开应用、测试及合成实验资料。
- `ribbon-inbox/`：拾光核心业务、AI 网关、Android 原生适配源码与离线测试。
- `site/`：已上线静态站源码及精选展示媒体。
- `docs/`：部署和交付说明；[本次范围与验证](docs/README-UPDATE-20261023.md)。

`SOURCE-MANIFEST.json` 记录快照文件 SHA-256；安装后的依赖与构建目录不在清单内。冻结实验及历史日志按原字节保留。没有导出私人收藏、数据库、`.env`、签名密钥、访问码或原始简历。

首页沿用用户提供的 Kage 设计参考，不宣称原创视觉；拾光第三方视觉组件未包含在核心快照中。各素材不因本仓库公开而自动获得额外许可，见[拾光快照边界](ribbon-inbox/NOTICE.md)。联系：974250837@qq.com。
