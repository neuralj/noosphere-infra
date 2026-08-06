# 认知契约：OpenLaputa

> 本地基础设施管理中心，统一管理 Docker 镜像构建和本地常驻服务。

---

## 【1】Purpose（目的层）

### 核心定位
- **本项目是**：本地开发环境的基础设施即代码（IaC）管理中心
- **不做什么**：
  - 不处理业务逻辑（业务在 opensheeta/a-bulletin/a-market 等 repo）
  - 不运行生产环境（仅本地 macOS 开发）
  - 不管理远程服务器（仅本地服务编排）
- **优先级规则**：稳定性 > 可观测性 > 易用性 > 功能丰富

### 对齐原则
- **声明式优先**：配置即真相，所有状态通过配置文件定义
- **轻量稳定**：supervisord 而非 pm2，规避 Node.js 绑定和快照式依赖
- **统一管控**：所有服务通过 `./scripts/services` 统一管理
- **可观测性**：统一日志目录、统一状态查询、统一域名入口

### 演进目标
- [x] 确立核心定位和边界取舍
- [x] 确立优先级规则
- [ ] 补充决策记录（ADR），记录技术选型理由
- [ ] 定义与其他 repo 的协作边界

---

## 【2】Constraints（约束层）

### 硬约束
- **技术栈**：
  - Web 面板：Node.js + SvelteKit + Tailwind CSS
  - 进程管理：supervisord（brew install supervisor）
  - 反向代理：Caddy（brew install caddy）
  - 镜像构建：Docker + GitHub Actions
- **目录规范**：
  - `images/` - Docker 镜像定义（每个镜像一个子目录）
  - `panel/` - Web 管理面板（SvelteKit 应用）
  - `supervisor/` - supervisord 配置（supervisord.conf + programs/*.conf）
  - `caddy/` - Caddy 配置（Caddyfile + sites/*）
  - `scripts/` - 运维脚本（services、pull-all、ghcr-pull 等）
  - `logs/` - 统一日志目录
  - `run/` - 运行时目录（socket、pid）
- **命名规范**：
  - 服务名：小写 + 连字符（如 `openlaputa-panel`）
  - 域名：`*.neuralj.com`（如 `openlaputa.neuralj.com`）
  - 镜像名：`ghcr.io/neuralj/<name>:<tag>`

### 禁止行为
- **禁止使用 pm2**：统一使用 supervisord 管理进程
- **禁止手动操作 launchd**：~/Library/LaunchAgents/ 下只有 1 个 plist（com.neuralj.openlaputa.plist），仅用于启动 supervisord，无需手动管理
- **禁止绕过 services 脚本直接操作 supervisord**：所有服务操作统一通过 `./scripts/services`
- **禁止硬编码路径**：supervisor 配置中使用 `%(ENV_REPO_ROOT)s` 变量

### 异常处理
- **服务崩溃**：supervisord 自动重启（`autorestart=true`）
- **配置错误**：`./scripts/services reload` 前会验证配置
- **端口冲突**：启动前检查端口占用

### 演进目标
- [x] 确立技术栈约束
- [x] 确立目录规范
- [x] 确立命名规范
- [ ] 补充异常处理场景表（服务崩溃、证书过期、磁盘不足）
- [ ] 定义日志轮转规则

---

## 【3】Architecture（架构层）

### 依赖关系
- **上游依赖**：
  - GitHub Actions（镜像构建触发）
  - Docker（容器运行时）
  - Homebrew（supervisord、caddy 安装）
- **下游服务**：
  - opensheeta（AI Agent 守护进程）
  - a-bulletin（A 股公告系统）
  - a-market（A 股行情系统）
- **协作关系**：
  - 通过 Caddy 反向代理统一域名入口
  - 通过 supervisord 统一管理进程生命周期
  - 通过 `./scripts/services` 提供统一操作界面

### 启动时序
1. **launchd** 启动 `com.neuralj.openlaputa.plist`
2. **supervisord** 加载 `supervisor/supervisord.conf`
3. **supervisord** 启动所有服务（按 programs/*.conf 顺序）
   - caddy（:443）
   - openlaputa-panel（:3000）
   - opensheeta-panel（:3099）
   - a-bulletin-panel（:3093）
4. **Caddy** 加载 `caddy/Caddyfile` 和 `caddy/sites/*`
5. **反向代理** 生效，域名可访问

### 数据流向
```
用户请求 → Caddy (:443) → 路由匹配 → 反向代理 → 后端服务
                                        ↓
                              openlaputa-panel (:3000)
                              opensheeta-panel (:3099)
                              a-bulletin-panel (:3093)
```

### 演进目标
- [x] 确立启动时序文档
- [x] 确立数据流向图
- [ ] 补充决策记录 ADR（为什么选 supervisord、为什么选 Caddy）
- [ ] 补充与其他 repo 的接口约定
- [ ] 补充新增服务的标准接入流程

---

## 【4】Glossary（术语层）

### 核心术语

| 术语 | 定义 | 示例 |
|------|------|------|
| panel | openlaputa 的 Web 管理界面 | `https://openlaputa.neuralj.com` |
| alignment | 认知对齐系统，验证 AGENTS.md 完整性 | `/alignment` 页面 |
| cognitive-alignment | 认知对齐目录，存储模板和配置 | `cognitive-alignment/` |
| services | 统一服务管理脚本（supervisorctl 包装器） | `./scripts/services status` |

### 基础设施术语

| 术语 | 定义 | 示例 |
|------|------|------|
| supervisord | 进程管理守护进程，管理所有常驻服务 | `brew install supervisor` |
| supervisorctl | supervisord 命令行控制工具 | `supervisorctl status` |
| Caddy | 反向代理服务器，统一域名入口 | `brew install caddy` |
| Caddyfile | Caddy 主配置文件 | `caddy/Caddyfile` |
| reverse_proxy | Caddy 反向代理指令，将请求转发到后端 | `reverse_proxy localhost:3000` |
| launchd | macOS 系统级进程管理器，负责启动 supervisord | `launchctl list` |
| plist | macOS launchd 配置文件 | `scripts/com.neuralj.openlaputa.plist` |
| mkcert | 本地开发 SSL 证书生成工具 | `mkcert -install` |

### 目录结构术语

| 术语 | 定义 | 示例 |
|------|------|------|
| programs | supervisord 服务配置目录 | `supervisor/programs/*.conf` |
| sites | Caddy 站点配置目录 | `caddy/sites/*` |
| images | Docker 镜像定义目录 | `images/devshell/` |
| panel | Web 管理面板源码目录 | `panel/src/` |
| logs | 统一日志目录 | `logs/caddy.log` |
| run | 运行时目录（socket、pid） | `run/supervisor.sock` |

### 运维脚本术语

| 术语 | 定义 | 示例 |
|------|------|------|
| ghcr-pull | 通过镜像拉取 GHCR 镜像的脚本 | `./scripts/ghcr-pull ghcr.io/neuralj/devshell:latest` |
| pull-all | 批量拉取所有镜像的脚本 | `./scripts/pull-all` |
| image-prune | 清理旧镜像的脚本 | `./scripts/image-prune` |
| image-status | 查看镜像状态的脚本 | `./scripts/image-status` |
| validate-contract | 认知契约校验脚本 | `./scripts/validate-contract.sh` |

### 项目特定术语

| 术语 | 定义 | 示例 |
|------|------|------|
| openlaputa | 项目名称，源自《格列佛游记》中的空想乡 | `openlaputa.neuralj.com` |
| neuralj | 项目命名空间（GitHub: neuralj） | `ghcr.io/neuralj/*` |
| devshell | 开发环境 Docker 镜像（Python + Go + 工具链） | `ghcr.io/neuralj/devshell:latest` |
| webtest | E2E 测试 Docker 镜像（Playwright） | `ghcr.io/neuralj/webtest:latest` |
| pack | 面板打包功能：把仓库打包为 LLM-ready 上下文 | `/pack` 页面 |
| code2llm | 打包引擎（TypeScript 重构版），token-aware 分段 | `panel/src/lib/server/code2llm/` |
| LLM_IGNORE | 源码中的忽略标记，打包时剥离但保留行数 | `# @LLM_IGNORE_START` |
| review-patch | LLM 回写的机器可读 findings 块 | ` ```review-patch` |

### 认知架构术语

| 术语 | 定义 | 示例 |
|------|------|------|
| 五层认知架构 | 价值层/规则层/结构层/概念层/感知层的文档结构 | 本文档的章节结构 |
| 认知契约 | AGENTS.md 的别称，人机心智对齐的载体 | `AGENTS.md` |
| 元认知自检 | 文档更新时的自检流程（规划/监控/复盘） | 本文档末尾的自检记录 |
| 图式迭代 | 文档结构的同化（增量更新）/顺应（重构）过程 | 从初版到第二版的演进 |
| 知识三层网络 | 原则层/模式层/案例层的知识组织方式 | 本文档的知识网络部分 |

### 缩写对照

| 缩写 | 全称 | 含义 |
|------|------|------|
| IaC | Infrastructure as Code | 基础设施即代码 |
| GHCR | GitHub Container Registry | GitHub 容器镜像仓库 |
| E2E | End-to-End | 端到端测试 |
| SSL | Secure Sockets Layer | 安全套接字层（HTTPS 证书） |
| PID | Process ID | 进程标识符 |
| TUI | Terminal User Interface | 终端用户界面 |
| MCP | Model Context Protocol | 模型上下文协议（OpenCode 工具协议） |

### 演进目标
- [x] 定义核心术语
- [x] 定义基础设施术语
- [x] 定义目录结构术语
- [x] 定义运维脚本术语
- [x] 定义项目特定术语
- [x] 定义认知架构术语
- [x] 定义缩写对照

---

## 【5】Operations（操作层）

### 标准命令

```bash
# 服务管理
./scripts/services status              # 查看所有服务状态
./scripts/services start [service]     # 启动服务
./scripts/services stop [service]      # 停止服务
./scripts/services restart [service]   # 重启服务
./scripts/services logs [service]      # 查看日志（tail -f）
./scripts/services reload              # 重新加载配置

# 镜像管理
./scripts/pull-all                     # 拉取所有镜像
./scripts/ghcr-pull <image>            # 拉取单个镜像
./scripts/image-status                 # 查看镜像状态
./scripts/image-prune                  # 清理旧镜像

# 构建
./scripts/services build openlaputa-panel   # 构建面板（自动 stop → build → start）
```

### 禁止行为（部署流程）

- **禁止在服务运行时构建**：`services build openlaputa-panel` 内部已实现 stop → build → start 原子流程，手动 `cd panel && npm run build` 会因清空 `panel/build/` 导致运行中进程崩溃（ENOENT/MODULE_NOT_FOUND）。

### 关键文件

| 文件 | 用途 |
|------|------|
| `AGENTS.md` | 认知契约（本文档） |
| `supervisor/supervisord.conf` | supervisord 主配置 |
| `supervisor/programs/*.conf` | 服务配置 |
| `caddy/Caddyfile` | Caddy 主配置 |
| `caddy/sites/*` | 站点配置 |
| `scripts/com.neuralj.openlaputa.plist` | launchd 配置 |

### 端口分配

| 服务 | 端口 | 域名 |
|------|------|------|
| Caddy | 443 | `*.neuralj.com` |
| openlaputa-panel | 3000 | `openlaputa.neuralj.com` |
| opensheeta-panel | 3099 | `opensheeta.neuralj.com` |
| a-bulletin-panel | 3093 | `bulletin-monitor.neuralj.com` |

### 演进目标
- [x] 确立标准命令
- [x] 确立关键文件列表
- [x] 确立端口分配表
- [ ] 补充常用运维场景的命令组合
- [ ] 补充故障排查命令清单

---

## 元认知自检记录

### 最近一次更新
- **日期**：2026-08-04
- **意图**：记录 Pack 功能（code2llm TS 重构版）融入 panel 后的术语变更
- **解决的认知缺口**：pack/code2llm/LLM_IGNORE/review-patch 术语归属
- **杜绝的 AI 错误**：避免把打包功能实现为独立服务或外部进程依赖（已确定为 panel 内嵌库）

### 历史记录
- **日期**：2026-08-04（初次）
- **意图**：建立五层认知架构骨架，让 AI 理解项目本质
- **解决的认知缺口**：价值层定义、规则约束、结构关系
- **杜绝的 AI 错误**：避免 AI 使用 pm2、避免硬编码路径、避免直接操作 launchd

---

## 知识三层网络

### 原则层（不变）
- 声明式优先，配置即真相
- 轻量稳定，规避重资源依赖
- 统一管控，单一入口管理

### 模式层（可复用）
- supervisord 进程管理模式
- Caddy 反向代理模式
- 统一日志目录模式

### 案例层（场景落地）
- openlaputa-panel 服务配置
- opensheeta-panel 服务配置
- a-bulletin-panel 服务配置

---

## 认知级验收标准

- [x] 无隐性假设：所有默认规则全部显性写出
- [x] 五层完整：价值→规则→结构→概念→数据，无缺失层级
- [ ] 心智对齐：无需人类补充解释，AI 可独立完成合规开发（待验证）
- [x] 结构稳定：符合图式迭代规则，可长期同化迭代
- [x] 知识可沉淀：每条内容归属原则/模式/案例三层体系
- [x] 规避认知偏见：无直觉化模糊描述，全部可校验、可落地
