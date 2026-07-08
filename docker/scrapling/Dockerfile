FROM ghcr.io/neuralj/noosphere/dev:latest

ENV DEBIAN_FRONTEND=noninteractive

RUN pip3 install "scrapling[all]" playwright && \
    playwright install chromium && \
    playwright install-deps chromium

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
