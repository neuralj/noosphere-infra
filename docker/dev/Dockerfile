FROM ghcr.io/neuralj/noosphere/shell:latest

ENV DEBIAN_FRONTEND=noninteractive

RUN curl -fsSL https://code-server.dev/install.sh | sh && \
    pip3 install jupyter notebook

RUN curl -fsSL https://opencode.ai/install | bash

RUN apt-get update && apt-get install -y supervisor && \
    rm -rf /var/lib/apt/lists/*

COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

EXPOSE 8080 8088 8096

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
