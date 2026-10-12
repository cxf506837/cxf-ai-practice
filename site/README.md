# cxf 个人作品网站

以用户提供的 Kage 完整源码为视觉参考，保留京都寺院、红月、3D 场景与滚动氛围，改为中文实习求职作品集。展示群聊待办助手和拾光收集箱两个 AI 辅助实践作品，代码主要由 Codex 完成。静态作品站已上线：[cxf-portfolio.onrender.com](https://cxf-portfolio.onrender.com/)。公开源码位于[cxf506837/cxf-ai-practice](https://github.com/cxf506837/cxf-ai-practice)；后端已完成37项HTTPS断言与2次真实调用验收，60次实验与独立复核已完成；公众窗口已一次激活，结束于北京时间10月19日15:30，新录制的低帧率采样剪辑已接入。

## 本地预览

在此目录运行 `node serve.mjs`，打开 [http://127.0.0.1:4173](http://127.0.0.1:4173)。可通过环境变量 `PORT` 指定端口。服务仅监听本机回环地址，不需要构建或模型服务。

案例入口为 `/works/chat-task-assistant.html` 与 `/works/ribbon-inbox.html`，新增 `/works/context-experiment.html` 记录真实实验结果、原证据与评分限制；返回链接分别落到 `/#gate` 和 `/#pathways`，跳过首页入场。案例页同时保留新的MP4采样剪辑和历史WebM回放，均可通过原生播放器控制。新视频含三次真实模型调用；历史录像使用模型结果回放，未实时调用模型。

运行 `node build.mjs` 将站点生成到 `dist/`，其中 `index.html` 是首页、素材与案例页保持原相对位置。Render已发布此目录；Root Directory为site，Build Command为node build.mjs，Publish Directory为dist，AutoDeploy关闭。本次云构建使用平台默认Node24.21.0，不代表后端Docker运行版本。`public/landing-pages/public-links.json` 的sourceUrl已接入核实后的公开GitHub源码地址；liveVideoUrl指向新的MP4采样剪辑，tryUrl已接入实际HTTPS试用入口，public阶段健康、登录、Secure Cookie及demo配置检查通过；未新增模型调用。

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

本轮真实调用视频：[采样MP4](public/landing-pages/portfolio-assets/cxf-recruitment-demo-20261012.mp4)与[说明](public/landing-pages/portfolio-assets/cxf-recruitment-demo-20261012/video-notes.md)。录制源版本66a39f3；Codex自动化操作，低帧率截图采样剪辑，非连续录屏。三次真实调用、两次预算拦截；界面分析显示1.9/1.7/1.4秒，不是视频等待时长或独立供应商响应计时。当前账本65次、1300分（13元）软件预留：experiment60、acceptance2、recording3、public0；实际费用仅保守token估算，未新增请求。公开窗口结束于2026-10-19T07:30:03.858Z（北京时间10月19日15:30），不重复激活、不重置预算；手机异网业务验收仍待本人完成。
