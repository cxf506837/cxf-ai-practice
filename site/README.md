# cxf 个人作品网站

以用户提供的 Kage 完整源码为视觉参考，保留京都寺院、红月、3D 场景与滚动氛围，改为中文实习求职作品集。展示群聊待办助手和拾光收集箱两个 AI 辅助实践作品，代码主要由 Codex 完成。目前仅在本地验证，公开服务尚待完成。

## 本地预览

在此目录运行 `node serve.mjs`，打开 [http://127.0.0.1:4173](http://127.0.0.1:4173)。可通过环境变量 `PORT` 指定端口。服务仅监听本机回环地址，不需要构建或模型服务。

案例入口为 `/works/chat-task-assistant.html` 与 `/works/ribbon-inbox.html`，新增 `/works/context-experiment.html` 记录实验准备与未知结果；返回链接分别落到 `/#gate` 和 `/#pathways`，跳过首页入场。视频为本地 WebM，可通过原生播放器控制；演示使用合成通知和历史模型结果回放，录像不实时调用模型。

运行 `node build.mjs` 将站点生成到 `dist/`，其中 `index.html` 是首页、素材与案例页保持原相对位置。免费静态托管发布此目录。`public/landing-pages/public-links.json` 的真实 HTTPS 地址核实后才启用试用、源码和实时录像；空值显示待完成。

## 文件

- `public/landing-pages/kage.html`：可直接运行和编辑的首页。
- `public/landing-pages/portfolio.css`、`portfolio.js`：中文布局、案例共享样式与邮箱复制反馈。
- `public/landing-pages/works/`：两个作品页与上下文实验页。
- `public/landing-pages/portfolio-assets/`：精选展示媒体，不含项目数据、私人简历或凭证。
- `public/landing-pages/secret-pathways-assets/`：字体、图片及原版 Three.js 运行时，均使用本地资源。
- `src/shaders/`：粘贴文件中的原始 React 包装组件及样式，作为参考保留；独立首页无需编译这些文件。

作品展示媒体来自用户授权的本地项目：群聊待办助手的 `docs/assets/demo.webm`（封面从录像抽帧），以及拾光收集箱的 `evidence/personal-ai/codex-mobile.png`。手机截图是合成资料的浏览器预览，不是 Android 真机验收。本网站不会调用两个项目的付费模型接口。

视觉与资产沿用 Kage 参考，不宣称原创设计。联系邮箱经用户授权公开；教育详情、手机号、原简历、访问凭证和临时项目地址没有加入页面。

原粘贴文件中的 HTML 与字体已改写为远程资源地址，其标注的两个源文件哈希与实际粘贴内容不符。图片下载后按原文件清单逐项验证 SHA-256；Three.js 与另外五个源文件按粘贴文件标注校验。运行页面只将资源地址改为本地地址。
