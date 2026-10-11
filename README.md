# cxf · Vibe Coding学习者 · 寻AI应用实习

**[查看已上线的个人作品网站 ↗](https://cxf-portfolio.onrender.com/)**

cxf提出需求、试用应用并核对助手整理的两例修订金标；代码主要由Codex完成。这里公开可核对的AI应用实践源码，未宣称独立完成全部工程或标注。

- [本轮交付与参与步骤](docs/RECRUITMENT-DELIVERY.md)
- [当前阶段与未完成项](docs/RECRUITMENT-STATUS.md)
- [自有账户免费部署](docs/DEPLOYMENT.md)
- [群聊待办助手](app/README.md)
- [上下文实验](app/experiments/context/README.md)
- [个人展示站](site/README.md)

应用与本地验真使用Node24.19.0、pnpm11.25.0。Render静态站本次构建使用平台默认Node24.21.0；后端Docker固定Node24.19.0，尚未部署。进入app，安装锁文件依赖，复制空白.env.example到不存在的.env，执行pnpm build与pnpm start。空key可运行本地合成数据管理，不调用模型。网站进入site运行node build.mjs，静态服务发布dist。

SOURCE-MANIFEST.json记录当前源码快照每个文件的SHA-256；生成物不在源码清单。根目录及app/.gitattributes关闭换行转换，保留原LF、CRLF和混合换行字节，避免clone后破坏冻结hash。未包含Git历史、真实环境、数据库、私人回复或原始简历。实验frozen.json已固定配置与源码，真实Redis验收和真实模型实验尚未完成；高级源码复核不等于上线验收。

公开源码已发布：[cxf506837/cxf-ai-practice](https://github.com/cxf506837/cxf-ai-practice)，默认分支为codex/recruitment-display；站点源码入口已接入该地址。静态作品站已上线；后端公开Demo、新实时录像与60次真实模型实验仍未完成，试用和实时录像地址保持空值。约70秒现有录像位于app/docs/assets/demo.webm及网站素材中，是历史模型输出回放；第二台手机另一网络验证也尚未完成。历史S0–S4的100%仅指2026-10-10本地版本，不代表本轮完成或现实准确率。

包内旧scripts/evaluate.ts与历史结果保留作版本证据，不可用于本轮60次实验代跑。上层工作区的白名单导出工具及其测试未加入应用包；应用tests均使用合成输入或mock，不需要真实密钥。
