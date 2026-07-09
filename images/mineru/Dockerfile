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

RUN python3 -m pip install -U 'mineru[core]>=3.4.0' --break-system-packages && \
    python3 -m pip cache purge

RUN mineru-models-download -s huggingface -m all

ENV MINERU_MODEL_SOURCE=local
