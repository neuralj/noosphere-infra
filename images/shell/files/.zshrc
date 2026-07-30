# Oh My Zsh 配置
export ZSH="$HOME/.oh-my-zsh"
ZSH_THEME="powerlevel10k/powerlevel10k"
plugins=(git zsh-autosuggestions fast-syntax-highlighting)
source $ZSH/oh-my-zsh.sh

# Powerlevel10k 配置
[[ -f ~/.p10k.zsh ]] && source ~/.p10k.zsh

# 别名
alias ll="ls -alF"
alias la="ls -A"
alias l="ls -CF"
alias cls="clear"

# PATH 配置
export PATH="$HOME/.local/bin:$PATH"

# 编辑器
export EDITOR=vim
