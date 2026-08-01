# Noosphere Infrastructure

Single CI workflow (`build.yml`) triggers on `images/**`, `.github/workflows/**`, or `workflow_dispatch`. Uses `GHCR_PAT` secret. Builds AMD64 + ARM64 via matrix, pushes arch-specific tags, then merges into multi-arch manifests.

## Images

- `images/devshell` — fat container: Python 3.12 + Go + SSH + zsh/Oh My Zsh/Powerlevel10k + code-server + opencode + Jupyter + scrapling + Playwright + supervisord
- `images/postgres` — `FROM postgres:17` with `TZ=Asia/Shanghai`
- `images/webtest` — `FROM mcr.microsoft.com/playwright:v1.52.0-jammy` with Chromium/Firefox/WebKit pre-installed, plus pixelmatch + pngjs + ImageMagick for visual regression & E2E testing
- `images/ollama` — `FROM ollama/ollama:0.23.2` with `TZ=Asia/Shanghai`, NVIDIA GPU support
- `images/mineru` — `FROM vllm/vllm-openai:v0.21.0` with MinerU PDF parsing engine, VLM + OCR, NVIDIA GPU required
- `images/mongodb` — `FROM mongo:6` with `TZ=Asia/Shanghai`
- `images/grafana` — `FROM grafana/grafana:latest` with `TZ=Asia/Shanghai`
- `images/qdrant` — `FROM qdrant/qdrant:v1.18.2` with `TZ=Asia/Shanghai`
- `images/openworker-next` — `FROM node:22-bookworm-slim` with opencode CLI, TypeScript daemon for AI agent orchestration

## Registry

`ghcr.io/neuralj/{devshell,postgres:17,webtest,ollama,mineru,mongodb,grafana,qdrant}:latest` (also tagged with SHA)

## CI Optimization

Uses `dorny/paths-filter` to detect which images changed. Only changed images are built (plus all images when workflow file changes or `workflow_dispatch` is triggered).

## Pulling Images

All GHCR packages are **public**. The canonical image name is always `ghcr.io/neuralj/<name>:<tag>`.

### Quick Start

```bash
# Pull all images
./scripts/pull-all

# Pull single image
./scripts/ghcr-pull ghcr.io/neuralj/devshell:latest
```

### How it works

`scripts/ghcr-pull` performs these steps:

1. **Query GHCR** for source digest (source of truth)
2. **Pull from mirror** (`ghcr.nju.edu.cn` by default)
3. **Re-tag** to `ghcr.io/neuralj/<name>:<tag>`
4. **Verify** local digest matches GHCR digest
5. **Clean up** mirror-prefixed image

If verification fails, the script exits with error.

### Image Registry

`scripts/images.yml` defines all available images:

```yaml
registry: ghcr.io/neuralj
mirror: ghcr.nju.edu.cn

images:
  devshell:  { tag: latest }
  postgres:  { tag: "17" }
  webtest:   { tag: latest }
  ollama:    { tag: latest }
  mineru:    { tag: latest }
  mongodb:   { tag: latest }
  grafana:   { tag: latest }
  qdrant:    { tag: latest }
```

### China Network Notes

- `registry-mirrors` in `daemon.json` only works for Docker Hub, NOT ghcr.io
- For ghcr.io, use `ghcr-pull` which goes through NJU mirror
- Direct `docker pull ghcr.io/...` may hang due to packet loss to `pkg-containers.githubusercontent.com`

### Verified mirrors (2026-07)

| Mirror | Status |
|---|---|
| `ghcr.nju.edu.cn` | ✅ Available |
| `ghcr.m.daocloud.io` | ❌ 403 Forbidden |
| `ghcr.dockerproxy.com` | ❌ Dead |

## Manual trigger

```bash
gh workflow run build.yml -R neuralj/openlaputa
```

## macOS 本地基础设施

openlaputa 仓库作为本地开发环境的**基础设施中心**，统一管理所有 `*.neuralj.com` 服务。

### 架构

```
launchd (系统级, 1 个 plist)
└── supervisord (用户态进程管理器)
    ├── caddy              → :443
    ├── viewer             → :3000
    ├── opensheeta-dash    → :3099
    └── bulletin-monitor   → :3093
```

- **进程管理**: supervisord (`brew install supervisor`)
- **配置位置**: `supervisor/supervisord.conf` + `supervisor/programs/*.conf`
- **launchd plist**: `scripts/com.neuralj.openlaputa.plist` → `~/Library/LaunchAgents/`
- **日志目录**: `logs/` (统一管理所有服务日志)
- **运行时目录**: `run/` (supervisor socket, pid file)

### 管理命令

```bash
./scripts/services status              # 查看所有服务状态
./scripts/services start [service]     # 启动服务
./scripts/services stop [service]      # 停止服务
./scripts/services restart [service]   # 重启服务
./scripts/services logs [service]      # 查看日志 (tail -f)
./scripts/services reload              # 重新加载配置
./scripts/services build viewer        # 构建 viewer
```

### Caddy 反向代理

- **配置位置**: `caddy/Caddyfile` + `caddy/sites/*`
- **SSL 证书**: `caddy/ssl/{fullchain.pem,privkey.pem}` (mkcert 生成)

### 代理的域名

| 域名 | 后端 | 端口 | 项目 |
|------|------|------|------|
| `openlaputa.neuralj.com` | localhost | 3000 | openlaputa/viewer |
| `opensheeta.neuralj.com` | localhost | 3099 | opensheeta/dashboard |
| `bulletin-monitor.neuralj.com` | localhost | 3093 | a-bulletin/monitor |

### 添加新服务

1. 在 `supervisor/programs/` 创建 `<service>.conf`
2. 如需反向代理，在 `caddy/sites/` 创建对应配置
3. 在 `/etc/hosts` 添加域名映射（如需要）
4. 运行 `./scripts/services reload`

### 服务列表

| 服务 | 端口 | 代码位置 |
|------|------|----------|
| caddy | 443 | homebrew |
| openlaputa-panel | 3000 | openlaputa/panel |
| opensheeta-panel | 3099 | opensheeta/panel |
| a-bulletin-panel | 3093 | a-bulletin/panel |


