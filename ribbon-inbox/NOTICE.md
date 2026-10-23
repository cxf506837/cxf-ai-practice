# 公开范围与素材说明

2026-10-23 从用户授权的本地拾光收集箱工程按白名单导出核心源码；原工程、数据和 Git 历史不复制。

- 包含：`web/src/features/collection/*.ts`、`android/app/src/main/java/com/ribboninbox/app/*.kt`、开发 AI 网关、三份离线 Node 测试和可移植测试加载器。
- 不包含：完整 Next.js UI、第三方 Ribbon Glow / Semantic Bloom / Glass AI Button 源素材、Android 资源与构建工程、APK、签名私钥、环境配置、收藏数据、证书、原运行日志和设备驱动。
- 原设计来自用户提供的参考组件，不声明原创视觉。尚未补齐相关素材再分发许可记录，因此不随此快照再分发。
- 此仓库公开不自动授予第三方素材或依赖的额外许可，也没有为全部代码添加统一开源许可证。已安装的 TypeScript 依赖遵循其包内许可证。
- 除 `tests/modules.cjs` 将机器绝对 TypeScript 路径改为 `require('typescript')` 外，导出业务、网关与原生源码保持原字节。文件哈希见仓库根 `SOURCE-MANIFEST.json`。
