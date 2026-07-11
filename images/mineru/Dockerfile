FROM vllm/vllm-openai:v0.21.0

LABEL maintainer="travis"
LABEL description="MinerU PDF parsing — VLM + OCR, GPU-accelerated"

ENV TZ=Asia/Shanghai

RUN apt-get update && \
    apt-get install -y \
        fonts-noto-core \
        fonts-noto-cjk \
        fontconfig \
        libgl1 && \
    fc-cache -fv && \
    rm -rf /var/lib/apt/lists/*

ARG MINERU_VERSION=3.4.3
ARG MODELS_VERSION=20260711

RUN python3 -m pip install "mineru[core]==${MINERU_VERSION}" --break-system-packages && \
    python3 -m pip cache purge

RUN mineru-models-download -s modelscope -m all

ENV MINERU_MODEL_SOURCE=local
