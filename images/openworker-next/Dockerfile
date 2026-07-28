FROM docker.m.daocloud.io/library/node:22-bookworm-slim AS builder

LABEL maintainer="travis"
LABEL description="OpenWorker Next — AI agent daemon"

ENV DEBIAN_FRONTEND=noninteractive \
    TZ=Asia/Shanghai

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    tzdata \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build
COPY . /build/

RUN npm ci && npm cache clean --force
RUN npm run build

# Production stage
FROM docker.m.daocloud.io/library/node:22-bookworm-slim

LABEL maintainer="travis"
LABEL description="OpenWorker Next — AI agent daemon"

ENV DEBIAN_FRONTEND=noninteractive \
    TZ=Asia/Shanghai \
    NODE_ENV=production \
    OW_PORT=8765 \
    OC_PORT=4096 \
    OW_STANDALONE=false

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    tzdata \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Try to install opencode CLI (optional - daemon can run in standalone mode without it)
# Skipping for now due to network issues - use standalone mode instead
# RUN curl -fsSL "https://github.com/anomalyco/opencode/releases/download/v${OPENCODE_VERSION}/opencode-linux-arm64.tar.gz" \
#     -o /tmp/opencode.tar.gz \
#     && tar -xzf /tmp/opencode.tar.gz -C /usr/local/bin \
#     && chmod +x /usr/local/bin/opencode \
#     && rm /tmp/opencode.tar.gz \
#     || echo "OpenCode not installed, will run in standalone mode"

RUN useradd -m -s /bin/bash openworker

WORKDIR /app

COPY --from=builder /build/package.json /build/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /build/dist/ ./dist/
COPY --from=builder /build/mcp-servers/ ./mcp-servers/
COPY --from=builder /build/plugins/ ./plugins/

RUN mkdir -p /data /home/openworker/.config/openworker-next \
    && chown -R openworker:openworker /app /data /home/openworker

USER openworker

ENV OW_STATE_DIR=/data \
    OW_INBOX_DB=/data/inbox.db \
    OW_CONV_DB=/data/conversations.db \
    OW_SECRETS_PATH=/data/secrets.json

EXPOSE 8765 8766 4096

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8765/health || exit 1

ENTRYPOINT ["node", "dist/daemon.js"]
