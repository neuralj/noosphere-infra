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
    PLAYWRIGHT_BROWSERS_PATH=/home/${USERNAME}/.cache/ms-playwright

# System packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 build-essential golang \
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

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Create user
RUN useradd -m -s /usr/bin/zsh ${USERNAME} \
    && echo "${USERNAME}:${USER_PASSWORD}" | chpasswd \
    && usermod -aG sudo ${USERNAME} \
    && echo "${USERNAME} ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

USER ${USERNAME}
WORKDIR /home/${USERNAME}

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
    && echo '[[ -f ~/.p10k.zsh ]] && source ~/.p10k.zsh' >> ~/.zshrc \
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
USER root
RUN uv pip install --system --break-system-packages ipykernel jupyterlab "scrapling[all]" \
    && python3 -m ipykernel install --prefix /usr/local --name python3 --display-name "Python 3"

USER ${USERNAME}

# code-server
RUN curl -fsSL https://code-server.dev/install.sh | sh

USER ${USERNAME}

# code-server extensions
RUN for ext in \
        "bungcip.better-toml" \
        "charliermarsh.ruff" \
        "eamodio.gitlens" \
        "editorconfig.editorconfig" \
        "ms-python.black-formatter" \
        "ms-toolsai.jupyter-keymap" \
        "ms-toolsai.jupyter" \
        "oderwat.indent-rainbow" \
        "redhat.vscode-yaml" \
        "usernamehw.errorlens" \
        "vscodevim.vim"; do \
        code-server --install-extension "$ext" || true; \
    done

# code-server settings
RUN mkdir -p ~/.local/share/code-server/User \
    && echo '{' > ~/.local/share/code-server/User/settings.json \
    && echo '  "editor.fontFamily": "'\''Fira Code'\'', '\''JetBrains Mono'\'', '\''MesloLGS NF'\'', Consolas, '\''Courier New'\'', monospace",' >> ~/.local/share/code-server/User/settings.json \
    && echo '  "editor.fontSize": 14,' >> ~/.local/share/code-server/User/settings.json \
    && echo '  "editor.lineHeight": 1.6,' >> ~/.local/share/code-server/User/settings.json \
    && echo '  "editor.fontWeight": "400",' >> ~/.local/share/code-server/User/settings.json \
    && echo '  "editor.fontLigatures": true,' >> ~/.local/share/code-server/User/settings.json \
    && echo '  "editor.letterSpacing": 0.2,' >> ~/.local/share/code-server/User/settings.json \
    && echo '  "editor.fontSmoothing": "antialiased",' >> ~/.local/share/code-server/User/settings.json \
    && echo '  "terminal.integrated.fontFamily": "'\''MesloLGS NF'\'', '\''Fira Code'\'', '\''JetBrains Mono'\'', monospace",' >> ~/.local/share/code-server/User/settings.json \
    && echo '  "terminal.integrated.fontSize": 14,' >> ~/.local/share/code-server/User/settings.json \
    && echo '  "terminal.integrated.lineHeight": 1.5,' >> ~/.local/share/code-server/User/settings.json \
    && echo '  "editor.wordWrapColumn": 120,' >> ~/.local/share/code-server/User/settings.json \
    && echo '  "editor.smoothScrolling": true,' >> ~/.local/share/code-server/User/settings.json \
    && echo '  "editor.codeActionsOnSave": {},' >> ~/.local/share/code-server/User/settings.json \
    && echo '  "telemetry.telemetryLevel": "off",' >> ~/.local/share/code-server/User/settings.json \
    && echo '  "telemetry.enableTelemetry": false,' >> ~/.local/share/code-server/User/settings.json \
    && echo '  "telemetry.enableCrashReporter": false,' >> ~/.local/share/code-server/User/settings.json \
    && echo '  "telemetry.feedback.enabled": false,' >> ~/.local/share/code-server/User/settings.json \
    && echo '  "chat.disableAIFeatures": true,' >> ~/.local/share/code-server/User/settings.json \
    && echo '  "workbench.secondarySideBar.enabled": false,' >> ~/.local/share/code-server/User/settings.json \
    && echo '  "workbench.secondarySideBar.defaultVisibility": "hidden",' >> ~/.local/share/code-server/User/settings.json \
    && echo '  "github.copilot.enabled": false,' >> ~/.local/share/code-server/User/settings.json \
    && echo '  "chat.enabled": false,' >> ~/.local/share/code-server/User/settings.json \
    && echo '  "workbench.chat.enabled": false,' >> ~/.local/share/code-server/User/settings.json \
    && echo '  "ai.enableCodeLens": false,' >> ~/.local/share/code-server/User/settings.json \
    && echo '  "ai.enableInlineCompletions": false,' >> ~/.local/share/code-server/User/settings.json \
    && echo '  "workbench.settings.enableNaturalLanguageSearch": false,' >> ~/.local/share/code-server/User/settings.json \
    && echo '  "settingsSync.enabled": false,' >> ~/.local/share/code-server/User/settings.json \
    && echo '  "settingsSync.keybindingsPerPlatform": false,' >> ~/.local/share/code-server/User/settings.json \
    && echo '  "settingsSync.ignoredSettings": [],' >> ~/.local/share/code-server/User/settings.json \
    && echo '  "extensions.showRecommendations": false,' >> ~/.local/share/code-server/User/settings.json \
    && echo '  "extensions.ignoreRecommendations": true,' >> ~/.local/share/code-server/User/settings.json \
    && echo '  "update.showReleaseNotes": false,' >> ~/.local/share/code-server/User/settings.json \
    && echo '  "workbench.startupEditor": "none",' >> ~/.local/share/code-server/User/settings.json \
    && echo '  "search.exclude": {' >> ~/.local/share/code-server/User/settings.json \
    && echo '    "**/node_modules": true,' >> ~/.local/share/code-server/User/settings.json \
    && echo '    "**/.git": true' >> ~/.local/share/code-server/User/settings.json \
    && echo '  },' >> ~/.local/share/code-server/User/settings.json \
    && echo '  "files.autoSave": "off",' >> ~/.local/share/code-server/User/settings.json \
    && echo '  "network.trace": "off",' >> ~/.local/share/code-server/User/settings.json \
    && echo '  "workbench.colorTheme": "Visual Studio Dark"' >> ~/.local/share/code-server/User/settings.json \
    && echo '}' >> ~/.local/share/code-server/User/settings.json

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
