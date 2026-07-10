FROM mcr.microsoft.com/playwright:v1.52.0-jammy

LABEL maintainer="travis"
LABEL description="Playwright + pixelmatch + ImageMagick — Visual regression & E2E testing"

ARG PLAYWRIGHT_VERSION=1.52.0
ARG PIXELMATCH_VERSION=5.3.0
ARG PNGS_VERSION=7.0.0

# ── System tools (ImageMagick for diff images, CJK fonts for rendering) ──
RUN apt-get update && apt-get install -y --no-install-recommends \
    imagemagick \
    fonts-noto-cjk fonts-noto-color-emoji \
    && rm -rf /var/lib/apt/lists/*

# ── Node.js test tools ──
# @playwright/test matches the pre-installed browser version
# pixelmatch: pixel-level image comparison
# pngjs: PNG encode/decode (companion to pixelmatch)
RUN npm install -g \
    @playwright/test@${PLAYWRIGHT_VERSION} \
    pixelmatch@${PIXELMATCH_VERSION} \
    pngjs@${PNGS_VERSION} \
    && npm cache clean --force

# ── Environment ──
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

WORKDIR /tests

# ── Use existing pwuser from base image ──
RUN chown -R pwuser:pwuser /tests /ms-playwright
USER pwuser

# NODE_PATH must be AFTER USER directive (base image may override ENV in later layers)
ENV NODE_PATH=/usr/lib/node_modules
