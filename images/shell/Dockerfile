# shell - AI Agent 时代的轻量级基础镜像
# 替代 devshell，提供语言运行时和工具链，移除 GUI 工具

FROM ubuntu:24.04

LABEL maintainer="travis"
LABEL description="AI Agent workspace: Python + Go + Node.js + zsh + SSH"

# 版本锁定
ARG NODE_MAJOR=20
ARG YQ_VERSION=4.40.5
ARG USERNAME=travis
ARG USER_PASSWORD=neural

ENV DEBIAN_FRONTEND=noninteractive \
    TZ=Asia/Shanghai \
    TERM=xterm-256color \
    LANG=en_US.UTF-8 \
    LC_ALL=en_US.UTF-8 \
    UMASK=002

# 系统包（单个 RUN 最小化层数）
RUN apt-get update && apt-get install -y --no-install-recommends \
    # 语言运行时
    python3 python3-pip python3-venv \
    golang \
    # 基础工具
    git curl wget ca-certificates \
    vim jq tmux \
    ripgrep fd-find \
    # Shell 环境
    zsh \
    # 网络
    openssh-server \
    # 系统
    locales tzdata sudo \
    && locale-gen en_US.UTF-8 \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# 安装 Node.js 20 LTS
RUN curl -fsSL https://deb.nodesource.com/setup_${NODE_MAJOR}.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# 安装 yq
RUN curl -fsSL "https://github.com/mikefarah/yq/releases/download/v${YQ_VERSION}/yq_linux_amd64" \
    -o /usr/local/bin/yq \
    && chmod +x /usr/local/bin/yq

# 创建用户和组
RUN useradd -m -s /usr/bin/zsh ${USERNAME} \
    && echo "${USERNAME}:${USER_PASSWORD}" | chpasswd \
    && usermod -aG sudo ${USERNAME} \
    && echo "${USERNAME} ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# 切换到用户
USER ${USERNAME}
WORKDIR /home/${USERNAME}

# 安装 Oh My Zsh + 插件
RUN sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended \
    && git clone --depth=1 https://github.com/romkatv/powerlevel10k.git ${ZSH_CUSTOM:-$HOME/.oh-my-zsh/custom}/themes/powerlevel10k \
    && git clone --depth=1 https://github.com/zsh-users/zsh-autosuggestions ${ZSH_CUSTOM:-$HOME/.oh-my-zsh/custom}/plugins/zsh-autosuggestions \
    && git clone --depth=1 https://github.com/zdharma-continuum/fast-syntax-highlighting ${ZSH_CUSTOM:-$HOME/.oh-my-zsh/custom}/plugins/fast-syntax-highlighting

# 复制配置文件
COPY --chown=${USERNAME}:${USERNAME} files/.zshrc .zshrc
COPY --chown=${USERNAME}:${USERNAME} files/.p10k.zsh .p10k.zsh
COPY --chown=${USERNAME}:${USERNAME} files/.gitconfig .gitconfig
COPY --chown=${USERNAME}:${USERNAME} files/.tmux.conf .tmux.conf

# 安装 Python 包（使用 requirements.txt 锁定版本）
COPY files/requirements.txt /tmp/requirements.txt
RUN python3 -m pip install --no-cache-dir --break-system-packages -r /tmp/requirements.txt

# SSH 配置
USER root
RUN mkdir -p /var/run/sshd \
    && sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config \
    && sed -i 's/#PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config \
    && mkdir -p /var/log/supervisor

# supervisord 配置
COPY files/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# 启动脚本
COPY files/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD pgrep sshd || exit 1

EXPOSE 22

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
