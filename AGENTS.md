# Noosphere Infrastructure

Single CI workflow (`build.yml`) triggers on `images/**`, `.github/workflows/**`, or `workflow_dispatch`. Uses `GHCR_PAT` secret. Builds AMD64 + ARM64 via matrix, pushes arch-specific tags, then merges into multi-arch manifests.

## Images

- `images/devshell` — fat container: Python 3.12 + Go + SSH + zsh/Oh My Zsh/Powerlevel10k + code-server + opencode + Jupyter + scrapling + Playwright + supervisord
- `images/postgres` — `FROM postgres:17` with `TZ=Asia/Shanghai`
- `images/webtest` — `FROM mcr.microsoft.com/playwright:v1.52.0-jammy` with Chromium/Firefox/WebKit pre-installed, plus pixelmatch + pngjs + ImageMagick for visual regression & E2E testing
- `images/ollama` — `FROM ollama/ollama:0.23.2` with `TZ=Asia/Shanghai`, NVIDIA GPU support

## Registry

`ghcr.io/neuralj/{devshell,postgres:17,webtest,ollama}:latest` (also tagged with SHA)

## Manual trigger

```bash
gh workflow run build.yml -R neuralj/noosphere-infra
```
