# Noosphere Infrastructure

Single CI workflow (`build.yml`) triggers on `images/**`, `.github/workflows/**`, or `workflow_dispatch`. Uses `GHCR_PAT` secret. Builds AMD64 + ARM64 via matrix, pushes arch-specific tags, then merges into multi-arch manifests.

## Images

- `images/devshell` — fat container: Python 3.12 + Go + SSH + zsh/Oh My Zsh/Powerlevel10k + code-server + opencode + Jupyter + scrapling + Playwright + supervisord
- `images/postgres` — `FROM postgres:17` with `TZ=Asia/Shanghai`
- `images/webtest` — devshell + Playwright + pixelmatch + pngjs + ImageMagick for visual regression testing

## Registry

`ghcr.io/xtin59s/{devshell,postgres:17,webtest}:latest` (also tagged with SHA)

## Compose (`compose/workspace.yml`)

- `noosphere-workspace` — uses `ghcr.io/xtin59s/devshell:latest`, ports 8022/8080/8088
- `noosphere-postgres` — uses `ghcr.io/xtin59s/postgres:17`, port 5432, password `bad`, db `meta`
- Mounts `/noosphere` (data) and `/home/travis/noosphere_space/noosphere` (code)
- `TZ=Asia/Shanghai`

## Manual trigger

```bash
gh workflow run build.yml -R neuralj/noosphere-infra
```
