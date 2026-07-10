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
gh workflow run build.yml -R neuralj/noosphere-infra
```
