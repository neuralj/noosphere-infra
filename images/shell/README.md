# shell - AI Agent 时代的轻量级基础镜像

AI Agent 时代的轻量级运行时环境，替代 devshell 作为其他镜像的基础。

## 特性

- **轻量级**: ~900MB（相比 devshell 5.6GB 减少 84%）
- **AI Agent 优先**: 移除 GUI 工具（code-server, Jupyter），保留 Agent 需要的 shell 环境
- **版本锁定**: 所有关键组件固定版本，确保可重现性
- **最小化**: 只包含必要组件

## 包含组件

| 类别 | 组件 | 版本 |
|------|------|------|
| **基础** | ubuntu | 24.04 |
| **语言** | Python 3 | 3.12 |
| | Go | 1.22 |
| | Node.js | 20 LTS |
| **工具** | Git | latest |
| | ripgrep | latest |
| | fd-find | latest |
| | jq | latest |
| | yq | 4.40.5 |
| **Shell** | zsh | latest |
| | Oh My Zsh | latest |
| | Powerlevel10k | latest |

## 移除的组件

- ❌ code-server (500MB)
- ❌ Jupyter (200MB)
- ❌ Playwright (500MB)
- ❌ Docker CLI
- ❌ scrapling

## 使用

### 作为基础镜像

```dockerfile
FROM ghcr.io/neuralj/shell:latest

# 添加你的应用
COPY . /home/travis/app
WORKDIR /home/travis/app

# 安装额外依赖
RUN pip install -r requirements.txt

# 启动服务
CMD ["python", "app.py"]
```

## 构建

```bash
docker build -t ghcr.io/neuralj/shell:latest images/shell/
```

## 镜像层级

```
shell (基础镜像, ~900MB)
  ├── a-bulletin (应用镜像)
  ├── a-market (应用镜像)
  └── ... (其他应用镜像)

webtest (独立镜像, 基于 Playwright)
  └── 浏览器测试专用
```

## 与 devshell 的对比

| 特性 | devshell | shell |
|------|----------|-------|
| 大小 | 5.6GB | ~900MB |
| code-server | ✅ | ❌ |
| Jupyter | ✅ | ❌ |
| Playwright | ✅ | ❌ |
| Node.js | ❌ | ✅ |
| ripgrep/fd | ❌ | ✅ |
| yq | ❌ | ✅ |

## 迁移

从 devshell 迁移到 shell：

1. 修改 Dockerfile: `FROM ghcr.io/neuralj/shell:latest`
2. 移除 code-server 和 Jupyter 相关配置
3. 如果需要浏览器测试，使用 webtest 镜像
