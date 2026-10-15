# LibreTV 镜像仓库

本仓库镜像自 [LibreSpark/LibreTV](https://github.com/LibreSpark/LibreTV)。

- 上游分支：`LibreSpark/LibreTV:main`
- 同步方式：GitHub Actions 每周一自动检查，也可在 Actions 中手动运行 `Sync upstream LibreTV`
- 本地密码、点播源和 Cloudflare 运行时变量只在部署平台配置，不写入仓库

使用前请阅读上游项目的许可证和部署说明。
## Cloudflare

仓库包含 Cloudflare Workers/OpenNext 配置。需要在 GitHub 仓库 Secrets 添加：

- CLOUDFLARE_API_TOKEN：具备 Workers Scripts 编辑权限的 API Token
- CLOUDFLARE_ACCOUNT_ID：Cloudflare 账户 ID

添加后，推送到 main 会自动构建并部署。
