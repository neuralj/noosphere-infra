# Noosphere Infrastructure

Single CI workflow (`build.yml`) triggers on `images/**`, `.github/workflows/**`, or `workflow_dispatch`. Uses `GHCR_PAT` secret. Builds AMD64 + ARM64 via matrix, pushes arch-specific tags, then merges into multi-arch manifests.

## Images

- `images/devshell` — fat container: Python 3.12 + Go + SSH + zsh/Oh My Zsh/Powerlevel10k + code-server + opencode + Jupyter + scrapling + Playwright + supervisord
- `images/postgres` — `FROM postgres:17` with `TZ=Asia/Shanghai`
- `images/webtest` — `FROM mcr.microsoft.com/playwright:v1.52.0-jammy` with Chromium/Firefox/WebKit pre-installed, plus pixelmatch + pngjs + ImageMagick for visual regression & E2E testing
- `images/ollama` — `FROM ollama/ollama:0.23.2` with `TZ=Asia/Shanghai`, NVIDIA GPU support
- `images/mineru` — `FROM vllm/vllm-openai:v0.21.0` with MinerU PDF parsing engine, VLM + OCR, NVIDIA GPU required
- `images/mongodb` — `FROM mongo:6` with `TZ=Asia/Shanghai`

## Registry

`ghcr.io/neuralj/{devshell,postgres:17,webtest,ollama,mineru,mongodb}:latest` (also tagged with SHA)

## CI Optimization

Uses `dorny/paths-filter` to detect which images changed. Only changed images are built (plus all images when workflow file changes or `workflow_dispatch` is triggered).

## Pulling Images (China Network)

All GHCR packages are **public**. On machines with poor connectivity to `pkg-containers.githubusercontent.com`, use the NJU mirror:

```bash
# Direct (slow/unreliable from China)
docker pull ghcr.io/neuralj/postgres:17

# Via NJU mirror (fast)
docker pull ghcr.nju.edu.cn/neuralj/postgres:17
docker tag ghcr.nju.edu.cn/neuralj/postgres:17 ghcr.io/neuralj/postgres:17
```

### ghcr-pull helper script

Repo includes `scripts/ghcr-pull` — pulls via mirror and re-tags to original name:

```bash
./scripts/ghcr-pull ghcr.io/neuralj/webtest:latest
# → pulls from ghcr.nju.edu.cn, re-tags to ghcr.io

# Override mirror
GHCR_MIRROR=ghcr.nju.edu.cn ./scripts/ghcr-pull ghcr.io/neuralj/devshell:latest
```

Install globally (optional):
```bash
cp scripts/ghcr-pull ~/.local/bin/
```

### Verified mirrors (2026-07)

| Mirror | Status |
|---|---|
| `ghcr.nju.edu.cn` | ✅ Available |
| `ghcr.m.daocloud.io` | ❌ 403 Forbidden |
| `ghcr.dockerproxy.com` | ❌ Dead |

## Manual trigger

```bash
gh workflow run build.yml -R neuralj/noosphere-infra
```
