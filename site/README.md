# cxf 个人作品网站

**[访问已部署网站](https://cxf-portfolio.onrender.com/) · [群聊待办案例](https://cxf-portfolio.onrender.com/works/chat-task-assistant.html) · [拾光收集箱案例](https://cxf-portfolio.onrender.com/works/ribbon-inbox.html)**

面向 AI 应用实习求职的中文作品集，保留用户提供的 Kage 首页构图、色彩和动效。项目各自放在详情页，避免不同应用的视觉影响首页。

## 本地预览与构建

需要 Node；在本目录执行，不需要模型密钥或前端依赖安装：

```powershell
node serve.mjs
```

打开 http://127.0.0.1:4173/，可用环境变量 `PORT` 改端口。服务只监听本机回环地址。

```powershell
node build.mjs
```

生成 `dist/`；首页、案例与素材保持相对路径。Render 静态站配置为 Root Directory `site`、Build Command `node build.mjs`、Publish Directory `dist`，自动部署关闭，需单独触发部署。本机关闭不影响已经部署的静态站。

## 阅读与修改入口

| 路径 | 内容 |
| --- | --- |
| `public/landing-pages/kage.html` | 中文首页 |
| `public/landing-pages/works/` | 群聊、拾光、上下文实验及补充实践案例 |
| `public/landing-pages/portfolio.css`、`portfolio.js` | 共享布局、邮箱复制与公开链接接入 |
| `public/landing-pages/public-links.json` | 群聊视频、源码与试用入口；到期时清空 `tryUrl` |
| `public/landing-pages/portfolio-assets/` | 精选公开截图、录像及录像说明 |
| `public/landing-pages/secret-pathways-assets/` | 本地字体、图片与原版 Three.js 运行时 |

`src/shaders/` 是原参考包装组件，独立静态首页不依赖它编译。

## 展示事实与状态（2026-10-23）

- [群聊助手 README](../app/README.md) 说明完整应用运行；[拾光 README](../ribbon-inbox/README.md) 说明核心快照和第三方素材排除范围。
- 群聊付费试用窗口于 2026-10-19 15:30（北京时间）结束，站点标记“试用已结束”；不因此下线静态网站、视频或源码，不新增模型调用或延长预算。
- 新群聊 MP4 为三次真实调用、两次预算拦截的低帧率截图采样剪辑，非连续录屏；旧 WebM 是历史结果回放。界面分析时间不等于完整录像等待时间。
- 拾光截图来自合成资料的手机尺寸浏览器预览，不代表 Android 真机验收。第二台手机异网业务验收仍待本人完成。
- 网络配置助手补充视频保持原入口和既有报错/限制说明，本轮不修改该项目内容。

## 视觉、数据与权限

网站视觉与资产沿用用户提供的 Kage 参考，不宣称原创设计；精选媒体不赋予额外第三方许可。群聊原始历史录像和拾光合成截图来自用户授权项目。本站不直接调用付费模型接口。

公开联系方式仅使用获准邮箱；教育详情、手机号、简历、访问码和私人数据未加入网页。模型运行、预算和访客会话由独立 Demo 后端控制，修改静态入口不能延长服务端窗口。
