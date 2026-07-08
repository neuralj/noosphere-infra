FROM ubuntu:24.04

LABEL maintainer="travis"
LABEL description="Noosphere workspace: Python + Go + SSH + zsh + code-server + Jupyter + scrapling"

ARG USERNAME=travis
ARG USER_PASSWORD=neural

ENV DEBIAN_FRONTEND=noninteractive \
    TZ=Asia/Shanghai \
    TERM=xterm-256color \
    LANG=en_US.UTF-8 \
    LC_ALL=en_US.UTF-8 \
    VIRTUAL_ENV=/opt/pyvenv \
    PATH="/opt/pyvenv/bin:${PATH}" \
    PLAYWRIGHT_BROWSERS_PATH=/home/${USERNAME}/.cache/ms-playwright

# System packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip python3-venv build-essential golang \
    zsh wget curl git vim ca-certificates locales tzdata \
    fontconfig sudo openssh-server \
    supervisor postgresql-client xz-utils \
    libnss3 libatk-bridge2.0-0 libdrm2 libxkbcommon0 libxcomposite1 \
    libxdamage1 libxrandr2 libgbm1 libasound2t64 libpango-1.0-0 libcairo2 \
    fonts-liberation fonts-noto-cjk \
    && locale-gen en_US.UTF-8 \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean \
    && mkdir -p /var/log/supervisor

# Create user
RUN useradd -m -s /usr/bin/zsh ${USERNAME} \
    && echo "${USERNAME}:${USER_PASSWORD}" | chpasswd \
    && usermod -aG sudo ${USERNAME} \
    && echo "${USERNAME} ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

RUN mkdir -p /opt/pyvenv && chown ${USERNAME}:${USERNAME} /opt/pyvenv

USER ${USERNAME}
WORKDIR /home/${USERNAME}

# Python venv
RUN python3 -m venv /opt/pyvenv \
    && pip install --no-cache-dir --upgrade pip setuptools wheel

# Oh My Zsh + plugins
RUN sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended \
    && git clone --depth=1 https://github.com/romkatv/powerlevel10k.git ${ZSH_CUSTOM:-$HOME/.oh-my-zsh/custom}/themes/powerlevel10k \
    && git clone --depth=1 https://github.com/zsh-users/zsh-autosuggestions ${ZSH_CUSTOM:-$HOME/.oh-my-zsh/custom}/plugins/zsh-autosuggestions \
    && git clone --depth=1 https://github.com/zdharma-continuum/fast-syntax-highlighting ${ZSH_CUSTOM:-$HOME/.oh-my-zsh/custom}/plugins/fast-syntax-highlighting

# Zsh config
RUN echo 'export ZSH="$HOME/.oh-my-zsh"' > ~/.zshrc \
    && echo 'ZSH_THEME="powerlevel10k/powerlevel10k"' >> ~/.zshrc \
    && echo 'plugins=(git zsh-autosuggestions fast-syntax-highlighting)' >> ~/.zshrc \
    && echo 'source $ZSH/oh-my-zsh.sh' >> ~/.zshrc \
    && echo 'source /opt/pyvenv/bin/activate' >> ~/.zshrc \
    && echo 'alias ll="ls -alF"' >> ~/.zshrc \
    && echo 'alias la="ls -A"' >> ~/.zshrc \
    && echo 'alias l="ls -CF"' >> ~/.zshrc \
    && echo 'alias cls="clear"' >> ~/.zshrc

# Jupyter config
RUN mkdir -p ~/.jupyter \
    && echo "c.ServerApp.disable_check_xsrf = True" > ~/.jupyter/jupyter_server_config.py \
    && echo "c.ServerApp.token = ''" >> ~/.jupyter/jupyter_server_config.py \
    && echo "c.ServerApp.password = ''" >> ~/.jupyter/jupyter_server_config.py \
    && echo "c.ServerApp.ip = '0.0.0.0'" >> ~/.jupyter/jupyter_server_config.py \
    && echo "c.ServerApp.port = 8888" >> ~/.jupyter/jupyter_server_config.py \
    && echo "c.ServerApp.open_browser = False" >> ~/.jupyter/jupyter_server_config.py

# Python packages (Jupyter + scrapling)
RUN pip install --no-cache-dir ipykernel jupyterlab "scrapling[all]" \
    && python3 -m ipykernel install --user --name python3 --display-name "Python 3"

# code-server
USER root
RUN curl -fsSL https://code-server.dev/install.sh | sh

USER ${USERNAME}

# Playwright browsers
RUN playwright install --with-deps chromium

# SSH setup
USER root
RUN mkdir -p /var/run/sshd \
    && sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config \
    && sed -i 's/#PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config

# supervisord config
COPY files/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

EXPOSE 22 8080 8888

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
