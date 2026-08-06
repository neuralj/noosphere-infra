# Noosphere Infrastructure

Docker images, compose files, and CI/CD workflows for the Noosphere project.

## Overview

This repository manages the container infrastructure for Noosphere:

- **DevShell Image**: Fat container with all development tools (Python, Go, SSH, zsh, code-server, opencode, Jupyter, scrapling)
- **Compose Files**: Docker Compose configurations for workspace and services
- **GitHub Actions**: Automated multi-arch image builds (AMD64 + ARM64)

## Images

### DevShell Image

Single fat container containing:
- Python 3.12 + Go
- SSH server
- zsh + Oh My Zsh + Powerlevel10k
- code-server (Web IDE)
- opencode (AI coding assistant)
- Jupyter Lab
- scrapling + Playwright (web scraping)

**Image**: `ghcr.io/xtin59s/devshell:latest`

### WebTest Image

Official Playwright image with visual regression testing tools:
- Chromium, Firefox, WebKit pre-installed
- `@playwright/test` — Playwright test framework
- pixelmatch — Pixel-level image comparison
- pngjs — PNG encode/decode
- ImageMagick — Image processing

**Image**: `ghcr.io/neuralj/webtest:latest`

> The `e2etest` image has been merged into `webtest`.

## Usage

### Pull the image

```bash
docker pull ghcr.io/xtin59s/devshell:latest
```

### Start workspace

```bash
docker compose -f compose/workspace.yml up -d
```

This starts:
- `noosphere-workspace` - Fat container with all dev tools
- `noosphere-postgres` - PostgreSQL 17

### Ports

| Service | Port | Description |
|---------|------|-------------|
| SSH | 8022 | Remote login |
| code-server | 8080 | Web IDE |
| opencode | 8096 | AI coding assistant |
| Jupyter | 8088 | Notebook |
| PostgreSQL | 5432 | Database |

## Build Locally

```bash
docker build -t devshell:latest images/devshell/
```

## CI/CD

GitHub Actions automatically builds and pushes images to GHCR on every push to `main`.

**Triggers**:
- Push to `main` (when `images/**` or `.github/workflows/**` changes)
- Manual trigger via `workflow_dispatch`

**Platforms**: AMD64 + ARM64

## Data Directories

The workspace container mounts:
- `/noosphere` → NVMe data disk
- `/home/travis/noosphere_space/noosphere` → Code repository

## Pack to LLM Context

The panel embeds a TypeScript port of [code2llm](https://github.com/example/code2llm)
(`panel/src/lib/server/code2llm/`) — package any allowed codebase into LLM-ready
context with token-aware segmentation:

- **Formats**: Markdown (segmented / single), JSONL (RAG / fine-tune), XML (large context)
- **Profiles**: `review` / `rag` / `finetune` / `context`
- **Discovery**: recursive `.gitignore`, binary sniffing, `@LLM_IGNORE` stripping (line-count preserving)
- **Review → apply**: paste an LLM review with a ```review-patch block, parse findings, insert TODO comments at the cited lines
- **Token counting**: exact tokenizer for short text, heuristic (`chars/4`) above 2 KB — bounded, fast, stable

Use it from the panel at **`/pack`** (sidebar → Pack). Outputs land in
`run/pack-out/<project>-<ts>/` (gitignored). Packs are restricted to the repo
root; extend with the `ALLOWED_PACK_DIRS` env var (comma-separated paths) and
bound history with `PACK_KEEP_MAX` (default 30, auto-pruned on each pack).
Filters (`include`/`exclude` globs) are supported in the form and API. History
can be deleted or cleaned from the UI.

### Tests

```bash
cd panel && npm test    # vitest: tokenize / format / discovery / packer / apply
```

## License

MIT
