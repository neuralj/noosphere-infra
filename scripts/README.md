# Scripts

本目录包含 openlaputa 仓库的所有运维脚本。

## 服务管理

### services

supervisord 服务管理入口，封装 supervisorctl。

```bash
./scripts/services status              # 查看所有服务状态
./scripts/services start [service]     # 启动服务
./scripts/services stop [service]      # 停止服务
./scripts/services restart [service]   # 重启服务
./scripts/services logs [service]      # 查看日志 (tail -f)
./scripts/services reload              # 重载配置
./scripts/services build openlaputa-panel  # 构建 panel
```

**管理服务**：
- `caddy` - 反向代理 (端口 443)
- `openlaputa-panel` - 本仓库面板 (端口 3000)
- `opensheeta-panel` - opensheeta 面板 (端口 3099)
- `a-bulletin-panel` - a-bulletin 面板 (端口 3093)

### com.neuralj.openlaputa.plist

launchd 配置，用于开机启动 supervisord。

```bash
# 安装
cp scripts/com.neuralj.openlaputa.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.neuralj.openlaputa.plist

# 卸载
launchctl unload ~/Library/LaunchAgents/com.neuralj.openlaputa.plist
```

---

## Docker 镜像管理

### ghcr-pull

通过镜像拉取 ghcr.io 镜像并验证完整性。

```bash
./scripts/ghcr-pull ghcr.io/neuralj/devshell:latest
```

**流程**：
1. 查询 GHCR 源 digest
2. 通过镜像拉取（默认 ghcr.nju.edu.cn）
3. Re-tag 为 ghcr.io 名称
4. 验证本地 digest 与 GHCR 一致
5. 清理镜像前缀镜像

**环境变量**：
- `GHCR_MIRROR` - 覆盖默认镜像（默认 ghcr.nju.edu.cn）

### pull-all

批量拉取 images.yml 中定义的所有镜像。

```bash
./scripts/pull-all
```

### image-prune

清理旧 Docker 镜像（dangling、旧 tag、未使用）。

```bash
./scripts/image-prune              # 执行清理
./scripts/image-prune --dry-run    # 预览模式
```

### image-status

检查本地 vs 远程镜像版本。

```bash
./scripts/image-status             # 检查所有镜像
./scripts/image-status devshell    # 检查单个镜像
```

**输出字段**：
- `LOCAL` - 本地镜像 ID
- `REMOTE` - 远程镜像 ID
- `STATUS` - up-to-date / outdated / missing

---

## 配置文件

### images.yml

Docker 镜像注册表配置。

```yaml
registry: ghcr.io/neuralj
mirror: ghcr.nju.edu.cn

images:
  devshell:    { tag: latest }
  postgres:    { tag: "17" }
  webtest:     { tag: latest }
  # ... 更多镜像
```

**被以下脚本使用**：
- `pull-all`
- `image-prune`
- `image-status`

---

## 工具脚本

### sync-images-yml.js

同步 images.yml 与 CI workflow。

```bash
node scripts/sync-images-yml.js
```

**作用**：
- 从 `.github/workflows/build.yml` 的 `dorny/paths-filter` 提取镜像列表
- 更新 images.yml 保持与 CI 一致
- 自动排序：基础镜像在前，依赖镜像在后

---

## 依赖关系

```
pull-all
  ├── ghcr-pull
  └── images.yml

image-status
  └── images.yml

image-prune
  └── images.yml

sync-images-yml.js
  ├── .github/workflows/build.yml
  └── images.yml

services
  └── supervisor/supervisord.conf

com.neuralj.openlaputa.plist
  └── supervisor/supervisord.conf
```

---

## 快速参考

| 场景 | 命令 |
|------|------|
| 查看所有服务状态 | `./scripts/services status` |
| 重启某个服务 | `./scripts/services restart caddy` |
| 查看服务日志 | `./scripts/services logs openlaputa-panel` |
| 拉取所有镜像 | `./scripts/pull-all` |
| 检查镜像版本 | `./scripts/image-status` |
| 清理旧镜像 | `./scripts/image-prune --dry-run` |
| 同步 CI 配置 | `node scripts/sync-images-yml.js` |
