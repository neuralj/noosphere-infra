# Noosphere Infrastructure

Docker images for the [Noosphere](https://github.com/neuralj/noosphere) project.

## Image Hierarchy

```
ubuntu:24.04
  └── shell (Python 3.12 + Go + SSH)
        └── dev (+ code-server + Jupyter + opencode + supervisord)
              └── scrapling (+ scrapling + playwright + chromium)
```

## Images

| Image | Description | Ports |
|-------|-------------|-------|
| `ghcr.io/neuralj/noosphere/shell` | Base image with Python, Go, SSH | 22 |
| `ghcr.io/neuralj/noosphere/dev` | Development environment | 22, 8080, 8088, 8096 |
| `ghcr.io/neuralj/noosphere/scrapling` | Web scraping with browser automation | 22, 8080, 8088, 8096 |

## Build

Images are automatically built on push to `main` when `docker/**` changes.

Manual trigger: `gh workflow run -R neuralj/noosphere-infra build-images.yml`

## Usage

```bash
# Pull latest scrapling image
docker pull ghcr.io/neuralj/noosphere/scrapling:latest

# Run dev container
docker run -d -p 8080:8080 -p 8088:8088 ghcr.io/neuralj/noosphere/dev:latest
```
