FROM ghcr.io/neuralj/devshell:latest

LABEL maintainer="travis"
LABEL description="devshell + Playwright E2E testing (Chromium only)"

ARG PLAYWRIGHT_VERSION=1.52.0

USER root

RUN apt-get update && apt-get install -y --no-install-recommends \
    nodejs npm \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g @playwright/test@${PLAYWRIGHT_VERSION} \
    && npm cache clean --force

USER travis

ENV PLAYWRIGHT_BROWSERS_PATH=/home/travis/.cache/ms-playwright
