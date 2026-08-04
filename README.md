# ClaudeManager — Claude Code CLI 管理器

> 🤖 一款功能强大的 uTools 插件，让你在 uTools 中完整管理 Claude Code CLI 的所有功能。

[![Version](https://img.shields.io/badge/version-1.0.0-blue)](https://github.com/960208781/ClaudeForUTools)
[![uTools](https://img.shields.io/badge/uTools-7.0%2B-green)](https://www.u-tools.cn)
[![License](https://img.shields.io/badge/license-MIT-orange)](LICENSE)

---

## ✨ 功能概览

ClaudeManager 将 Claude Code CLI 的全部能力集成到 uTools 中，提供可视化界面和增强交互体验。

### 📊 功能地图

| 模块 | 功能 | 描述 |
|------|------|------|
| 💬 对话 | 多项目并行对话 | 同时打开多个项目，每个项目独立 Claude 会话，标签栏快速切换 |
| 💬 对话 | Markdown 渲染 | 自动解析 Claude 回复中的 Markdown，支持代码块、表格、列表等 |
| 💬 对话 | 流式输出 | 实时显示 Claude 的思考过程、工具调用、工具结果 |
| 💬 对话 | 交互式问答 | 自动检测 Claude 回复中的选项列表，渲染为可点击的选择卡片 |
| 💬 对话 | 模型切换 | 内置 Sonnet/Opus/Haiku 切换，支持自定义模型 |
| 💬 对话 | 图片输入 | 支持 Ctrl+V 粘贴剪贴板图片，自动保存并发送给 Claude |
| 💬 对话 | 状态栏 | 实时显示模型、Token 用量、累计费用 |
| 💬 对话 | 会话持久化 | 关闭插件后项目列表自动保存，重新打开恢复 |
| 📂 会话历史 | 项目分组 | 按项目目录自动分组，可折叠/展开 |
| 📂 会话历史 | 统计面板 | 每个会话显示耗时、Token 消耗、工具调用分布、费用估算 |
| 📂 会话历史 | 活动折线图 | Canvas 绘制 Token 活动趋势，可点击定位消息 |
| 📂 会话历史 | 节点检查器 | 点击图表节点显示 Token 分解、工具调用详情、原始 JSONL |
| 📂 会话历史 | 会话管理 | 恢复/重命名/删除/定位/导出 Markdown |
| 📂 会话历史 | 右键菜单 | 会话列表支持右键重命名、定位、删除 |
| 📂 会话历史 | 费用估算 | 基于 Token 用量按官方定价估算 USD/CNY 费用 |
| 🧠 模型 | 模型管理 | Opus 5 / Sonnet 5 / Haiku 4.5 / Fable 5 切换 |
| 🧠 模型 | Fast 模式 | 2.5x 速度开关 |
| 🧠 模型 | Effort 控制 | 低到最大 5 级努力程度调节 |
| ⚙️ 配置 | 分层配置 | 用户级/项目级/本地级/状态文件 4 层配置编辑 |
| ⚙️ 配置 | 权限管理 | allow / deny / ask 权限规则可视化编辑 |
| ⚙️ 配置 | CLAUDE.md | 内置编辑器，支持用户级和项目级 |
| ⚙️ 配置 | 环境变量 | 自动检测并展示 Claude 相关环境变量 |
| 🔌 MCP | 服务器管理 | MCP 服务器增删改查，全局/项目级配置 |
| 🪝 Hooks | 事件管理 | 8 种 Hook 事件类型，4 个模板 |
| 📝 命令 | 自定义命令 | 全局/项目级命令管理，6 个模板 |
| ✨ Skills | 技能管理 | 已安装 Skills 查看，5 个模板，可创建/编辑/保存 |
| 🌐 网关 | 网关信息 | 自动检测 API 网关配置，显示状态和连接信息 |
| 🌐 网关 | 模型列表 | 按运营商分组折叠，支持搜索和复制 |
| 🌐 网关 | 配置展示 | Base URL、API Key（脱敏）、环境变量，一键复制 |
| 💡 最佳实践 | 使用技巧 | 6 大分类的 Claude Code 实战经验总结 |
| 🔧 诊断 | 安装检测 | 自动检测 Claude CLI 安装路径（nvm/fnm/brew/native） |
| 🔧 诊断 | 一键安装 | 支持 native / Homebrew / npm / winget 四种安装方式 |
| 🔧 诊断 | 环境诊断 | 运行 `claude doctor` 展示结果 |
| 🔧 诊断 | 设置管理 | 主题、CLI 路径、默认工作目录、自定义模型 |
| 🤖 AI Agent | 工具注册 | 通过 `utools.registerTool` 向 AI Agent 暴露 4 个工具 |
| 🏠 仪表盘 | 活动会话 | 统一管理所有正在进行的 Claude 会话，一键切换/终止 |

---

## 🚀 快速开始

### 安装

1. 下载 `ClaudeManager.upx` 离线安装包
2. 双击安装到 uTools
3. 在 uTools 搜索框输入 `Claude` 或 `claude` 即可打开

### 前置要求

- **uTools** v7.0+
- **Claude Code CLI** 已安装（`claude` 命令可用）
- macOS / Windows / Linux

### 安装 Claude Code CLI（如未安装）

在插件的「安装与诊断」页面，点击对应平台的一键安装按钮：

```bash
# macOS / Linux (原生安装)
curl -fsSL https://claude.ai/install.sh | bash

# macOS (Homebrew)
brew install --cask claude-code

# npm
npm install -g @anthropic-ai/claude-code
```

---

## 📖 使用指南

### 对话

1. 点击侧边栏 💬 对话
2. 点击左侧「+ 项目」选择项目目录
3. 在输入框输入消息，Enter 发送
4. 使用 ⚡ 按钮打开斜杠命令快捷面板
5. 点击模型按钮切换模型

### 会话历史

1. 点击侧边栏 📂 会话历史
2. 按项目分组浏览所有历史会话
3. 点击会话查看详情：统计、图表、对话内容
4. 点击折线图节点查看 Token 消耗详情
5. 右键会话可重命名、定位、删除

### 配置管理

1. 点击侧边栏 ⚙️ 配置
2. 切换用户级 / 项目级 / 本地级标签
3. 编辑 JSON 配置
4. 使用权限管理面板可视化编辑 allow/deny 规则

### 网关信息

1. 点击侧边栏 🌐 网关
2. 自动从 `~/.claude/settings.json` 读取网关配置
3. 查看可用模型列表（按运营商分组）
4. 点击 📋 按钮复制 URL 或 API Key

---

## 🏗️ 技术架构

```
┌─────────────────────────────────────────────────┐
│                  uTools 插件                      │
├─────────────────────────────────────────────────┤
│  dist/index.html  ←  主界面入口                    │
│  dist/css/        ←  main.css + terminal.css       │
│  dist/js/         ←  17 个模块化 JS 文件             │
│  dist/preload.js  ←  Node.js 原生能力桥接           │
│  dist/plugin.json ←  插件配置 + AI Agent 工具定义     │
├─────────────────────────────────────────────────┤
│  preload.js 暴露的 API：                          │
│  • findClaudePath()  — 自动检测 CLI 路径           │
│  • startClaudeSession() — 启动 Claude 会话        │
│  • sendInput()  — 发送消息（支持模型选择）          │
│  • startShell()  — 启动 Shell 终端                 │
│  • queryGateway()  — 查询网关模型列表              │
│  • getSessionStats()  — 提取会话统计               │
│  • registerTool()  — AI Agent 工具注册            │
└─────────────────────────────────────────────────┘
```

### Claude CLI 交互方式

插件使用 `claude -p --output-format stream-json --verbose` 模式与 Claude CLI 交互：
- 每条用户消息触发一次独立的 Claude 调用
- 通过 `--resume <sessionId>` 保持多轮对话上下文
- 实时解析 stream-json 输出：assistant 文本、tool_use、tool_result、thinking、usage 等
- 自动检测 ANSI 控制序列并转换为 HTML 颜色

### 支持的 uTools API

| API | 用途 |
|-----|------|
| `utools.dbStorage` | 项目持久化、设置存储 |
| `utools.showOpenDialog` | 目录选择 |
| `utools.shellShowItemInFolder` | 文件定位 |
| `utools.isDarkColors` | 主题跟随系统 |
| `utools.registerTool` | AI Agent 工具注册 |
| `utools.onPluginEnter` | 插件入口事件 |

---

## 🔧 插件配置

### plugin.json 功能入口

| 指令 | 功能 |
|------|------|
| `Claude` / `claude` / `AI编程` | 打开管理器主页 |
| `Claude对话` / `claude chat` | 直接进入对话页面 |
| `Claude配置` / `claude config` | 直接进入配置页面 |
| `Claude会话` / `claude session` | 直接进入会话历史 |
| 右键窗口「用 Claude 打开」 | 用当前窗口目录打开对话 |
| 右键文件「用 Claude 打开」 | 用文件所在目录打开对话 |

### AI Agent 工具

插件通过 `tools` 配置向 AI Agent 暴露 4 个工具：

| 工具名 | 功能 |
|--------|------|
| `claude_run` | 在指定目录执行 Claude 编程任务 |
| `claude_session_list` | 列出所有历史会话 |
| `claude_config_read` | 读取 Claude 配置文件 |
| `claude_status` | 检查 CLI 安装状态 |

---

## 📦 版本说明

### v1.0.0 (2026-07-30)

🎉 首次发布！

#### 核心功能
- ✅ 多项目并行 Claude 对话（带 dbStorage 持久化）
- ✅ Markdown 渲染对话内容（标题/代码块/列表/表格/引用/链接）
- ✅ 流式输出：思考过程、工具调用、工具结果、Token 用量、停止原因
- ✅ 交互式问答检测：自动渲染 Claude 回复中的选项列表为可点击卡片
- ✅ 图片粘贴支持（Ctrl+V）
- ✅ 模型切换（Sonnet/Opus/Haiku + 自定义）

#### 会话历史
- ✅ 按项目分组折叠
- ✅ 统计面板（耗时/Token/工具调用/费用估算）
- ✅ Canvas 折线图（点击定位消息）
- ✅ 节点检查器（Token 分解/工具详情/原始 JSONL）
- ✅ 会话管理（恢复/重命名/删除/定位/导出）
- ✅ 右键菜单
- ✅ 费用估算（USD + CNY，基于 Token 用量）

#### 配置管理
- ✅ 4 层配置编辑（用户/项目/本地/状态）
- ✅ 权限可视化（allow/deny/ask）
- ✅ CLAUDE.md 编辑器
- ✅ MCP/Hooks/Commands/Skills 管理（含模板）
- ✅ 网关信息页（运营商分组/模型列表/配置展示）

#### 其他
- ✅ 仪表盘活动会话管理
- ✅ 最佳实践页面
- ✅ 安装诊断（nvm/fnm/brew/native 自动检测）
- ✅ 一键安装 CLI
- ✅ AI Agent 工具注册（4 个工具）
- ✅ 可拖拽分隔条
- ✅ 暗色/亮色主题
- ✅ 窗口/文件匹配入口

#### 技术规格
- 17 个 JS 模块 + 2 个 CSS + 1 个 HTML + plugin.json
- 约 9000 行代码
- 零外部依赖（纯 vanilla JS/CSS/HTML）
- 支持 macOS / Windows / Linux

---

## 📋 系统要求

| 项目 | 要求 |
|------|------|
| uTools | v7.0 或更高 |
| Claude Code CLI | 已安装并可用 |
| 操作系统 | macOS 13+ / Windows 10+ / Linux |
| Node.js | 由 Claude CLI 自带，无需单独安装 |

---

## 🔗 相关链接

- [uTools 官网](https://www.u-tools.cn)
- [Claude Code 文档](https://code.claude.com/docs)
- [Anthropic 官网](https://www.anthropic.com)

---

## 📄 许可证

MIT License

---

## 🙏 致谢

- [uTools](https://www.u-tools.cn) — 提供插件运行平台
- [Anthropic](https://www.anthropic.com) — Claude Code CLI

---

<div align="center">

**如果这个插件对你有帮助，请给个 ⭐ Star！**

Made with ❤️ by chaoyang

</div>
