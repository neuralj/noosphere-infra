FROM ghcr.io/neuralj/devshell:latest

LABEL maintainer="travis"
LABEL description="devshell + Playwright + Visual regression testing"

ARG PLAYWRIGHT_VERSION=1.52.0

USER root

RUN apt-get update && apt-get install -y --no-install-recommends \
    nodejs npm imagemagick \
    fonts-noto-cjk fonts-liberation fonts-noto-color-emoji \
    libasound2t64 libatk-bridge2.0-0 libatk1.0-0 libcups2 \
    libdrm2 libgbm1 libgtk-3-0 libnspr4 libnss3 \
    libxcomposite1 libxdamage1 libxrandr2 xdg-utils \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g @playwright/test@${PLAYWRIGHT_VERSION} pixelmatch pngjs \
    && npm cache clean --force

USER travis

ENV PLAYWRIGHT_BROWSERS_PATH=/home/travis/.cache/ms-playwright
RUN npx playwright install chromium
