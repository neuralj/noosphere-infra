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

## License

MIT
