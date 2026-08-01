FROM docker.m.daocloud.io/library/node:22-bookworm-slim AS builder

LABEL maintainer="travis"
LABEL description="Opensheeta — AI agent daemon"

ENV DEBIAN_FRONTEND=noninteractive \
    TZ=Asia/Shanghai

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    tzdata \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build

ARG SHEETA_REPO=https://github.com/neuralj/opensheeta.git
ARG SHEETA_BRANCH=main
RUN git clone --depth=1 --branch=${SHEETA_BRANCH} ${SHEETA_REPO} .

RUN npm ci && npm cache clean --force
RUN npm run build:backend

# Production stage
FROM docker.m.daocloud.io/library/node:22-bookworm-slim

LABEL maintainer="travis"
LABEL description="Opensheeta — AI agent daemon"

ENV DEBIAN_FRONTEND=noninteractive \
    TZ=Asia/Shanghai \
    NODE_ENV=production \
    OS_PORT=8765 \
    OC_PORT=4096 \
    OS_STANDALONE=false

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    tzdata \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN useradd -m -s /bin/bash opensheeta

WORKDIR /app

COPY --from=builder /build/package.json /build/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /build/dist/ ./dist/
COPY --from=builder /build/mcp-servers/ ./mcp-servers/
COPY --from=builder /build/plugins/ ./plugins/

RUN mkdir -p /data /home/opensheeta/.config/opensheeta \
    && chown -R opensheeta:opensheeta /app /data /home/opensheeta

USER opensheeta

ENV OS_INBOX_DB=/data/inbox.db \
    OS_CONV_DB=/data/conversations.db \
    OS_TASKS_DB=/data/tasks.db \
    OW_MEMORY_DB=/data/memory.db \
    OS_SECRETS_PATH=/data/secrets.json

EXPOSE 8765 8766 4096

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8765/health || exit 1

ENTRYPOINT ["node", "dist/daemon.js"]
# Trigger build 20260728-184025
