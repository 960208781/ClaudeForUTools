/**
 * 最佳实践页面 — Claude Code 使用技巧与最佳实践
 */

const TipsPage = {
  render(container) {
    container.innerHTML = `
      <div class="tips-container">
        <div class="card mb-3">
          <div class="card-header"><div class="card-title">💡 Claude Code 最佳实践</div></div>
          <div class="text-xs text-muted">来自社区和官方的实战经验总结</div>
        </div>

        <div class="card mb-3">
          <div class="card-header"><div class="card-title">🚀 高效使用技巧</div></div>
          <div class="tips-list">
            <div class="tip-item">
              <div class="tip-item-title">📌 善用 CLAUDE.md</div>
              <div class="tip-item-desc">在项目根目录创建 CLAUDE.md，写入项目架构、编码规范、构建命令等。Claude 每次会话都会自动读取，是最高杠杆的优化手段。</div>
            </div>
            <div class="tip-item">
              <div class="tip-item-title">📋 先规划再执行</div>
              <div class="tip-item-desc">复杂任务前按 Shift+Tab 进入 Plan Mode，让 Claude 先分析代码库生成实施方案，批准后再执行。大幅提升首次成功率。</div>
            </div>
            <div class="tip-item">
              <div class="tip-item-title">💾 定期 /compact</div>
              <div class="tip-item-desc">长会话中定期运行 /compact 压缩上下文，可指定保留内容如 "保留错误处理模式"。v2.0.64+ 压缩几乎瞬间完成。</div>
            </div>
            <div class="tip-item">
              <div class="tip-item-title">⏪ 善用 /rewind</div>
              <div class="tip-item-desc">实验性修改失败后，按 Esc+Esc 调出 /rewind 菜单，可选择只回退代码或只回退对话，不影响另一方。</div>
            </div>
            <div class="tip-item">
              <div class="tip-item-title">🧠 模型分级使用</div>
              <div class="tip-item-desc">简单任务用 Haiku（~$0.03/次），日常编码用 Sonnet（~$0.75/次），架构决策用 Opus（~$2/次）。子代理用 CLAUDE_CODE_SUBAGENT_MODEL=haiku 降低成本。</div>
            </div>
            <div class="tip-item">
              <div class="tip-item-title">🔍 每月运行 /insights</div>
              <div class="tip-item-desc">分析你的使用习惯，生成 HTML 报告，发现重复操作模式并建议创建自定义命令。是优化工作流的利器。</div>
            </div>
            <div class="tip-item">
              <div class="tip-item-title">📝 自定义斜杠命令</div>
              <div class="tip-item-desc">在 ~/.claude/commands/ 创建 .md 文件，用 $ARGUMENTS 接收参数。把重复操作变成一键命令，如 /unit-test、/deploy、/handover。</div>
            </div>
            <div class="tip-item">
              <div class="tip-item-title">🪝 Hooks 自动化</div>
              <div class="tip-item-desc">用 PostToolUse hook 在每次文件编辑后自动运行 prettier/eslint。用 PreToolUse hook 拦截危险命令如 rm -rf。Hooks 保证执行，不依赖模型行为。</div>
            </div>
          </div>
        </div>

        <div class="card mb-3">
          <div class="card-header"><div class="card-title">🔧 权限与安全</div></div>
          <div class="tips-list">
            <div class="tip-item">
              <div class="tip-item-title">🔐 配置权限规则</div>
              <div class="tip-item-desc">在 .claude/settings.json 中配置 permissions.allow 和 deny。如 allow: ["Bash(git:*)", "Read"], deny: ["Bash(rm -rf:*)", "Read(.env*)"]。</div>
            </div>
            <div class="tip-item">
              <div class="tip-item-title">🛡️ Auto Mode 安全</div>
              <div class="tip-item-desc">Max 订阅者可用 --permission-mode auto 启用自动模式。Sonnet 分类器审查每个操作，检查意图匹配和安全性。比 --dangerously-skip-permissions 更安全。</div>
            </div>
            <div class="tip-item">
              <div class="tip-item-title">📁 additionalDirectories</div>
              <div class="tip-item-desc">在 permissions.additionalDirectories 中添加共享库路径，让 Claude 能访问项目外的依赖代码。</div>
            </div>
          </div>
        </div>

        <div class="card mb-3">
          <div class="card-header"><div class="card-title">⚡ 高级工作流</div></div>
          <div class="tips-list">
            <div class="tip-item">
              <div class="tip-item-title">🤖 子代理 (Subagents)</div>
              <div class="tip-item-desc">用 /agents 创建专用代理。Opus 做指挥官，Sonnet 做执行者。最多 10 个并行，隔离上下文防止主会话膨胀。</div>
            </div>
            <div class="tip-item">
              <div class="tip-item-title">🔌 MCP 集成</div>
              <div class="tip-item-desc">连接 GitHub、数据库、Sentry 等 3000+ 工具。在 .mcp.json 中配置，Claude 自动发现并调用。uTools 插件也可以通过 tools 暴露能力给 AI Agent。</div>
            </div>
            <div class="tip-item">
              <div class="tip-item-title">⏱️ 后台任务</div>
              <div class="tip-item-desc">长时间命令用 run_in_background 标志在后台执行，Claude 轮询结果不阻塞对话。适合测试套件、构建等耗时操作。</div>
            </div>
            <div class="tip-item">
              <div class="tip-item-title">🔄 会话恢复</div>
              <div class="tip-item-desc">claude --resume <name> 恢复命名会话。/resume 从选择器恢复。claude -c 继续最近会话。/teleport 在本地和 Web 会话间迁移。</div>
            </div>
            <div class="tip-item">
              <div class="tip-item-title">📦 CI/CD 集成</div>
              <div class="tip-item-desc">用 claude -p "review this diff" --output-format json 在 CI 中自动审查 PR。--max-turns 限制轮次，--max-budget-usd 限制费用。</div>
            </div>
            <div class="tip-item">
              <div class="tip-item-title">🎯 Effort 控制</div>
              <div class="tip-item-desc">Opus 4.7+ 支持 /effort low|medium|high|xhigh|max。编码推荐 xhigh 起步，简单任务用 medium，最大质量用 max。</div>
            </div>
            <div class="tip-item">
              <div class="tip-item-title">⚡ Fast Mode</div>
              <div class="tip-item-desc">/fast 开启快速模式，2.5x 输出速度，2x 价格。适用于 Opus 5/4.8 迭代小改动。长任务和后台代理不建议开启。</div>
            </div>
          </div>
        </div>

        <div class="card mb-3">
          <div class="card-header"><div class="card-title">💰 成本优化</div></div>
          <div class="tips-list">
            <div class="tip-item">
              <div class="tip-item-title">📊 监控 /cost 和 /context</div>
              <div class="tip-item-desc">定期检查费用和上下文使用量。/usage 查看计划额度。设置 --max-budget-usd 硬限制。</div>
            </div>
            <div class="tip-item">
              <div class="tip-item-title">💾 Prompt Caching</div>
              <div class="tip-item-desc">缓存读取只需 0.1x 费用，节省 90%。保持 CLAUDE.md 稳定，避免频繁修改系统提示。ENABLE_PROMPT_CACHING_1H=1 开启 1 小时缓存。</div>
            </div>
            <div class="tip-item">
              <div class="tip-item-title">📦 Batch API</div>
              <div class="tip-item-desc">非紧急任务用 Batch API，50% 折扣，24 小时返回。适合夜间测试套件。</div>
            </div>
            <div class="tip-item">
              <div class="tip-item-title">🧹 /clear 切换任务</div>
              <div class="tip-item-desc">切换到新任务时运行 /clear 清空上下文，避免无关历史消耗 token。用 /rewind 选择性回退可节省更多。</div>
            </div>
          </div>
        </div>

        <div class="card mb-3">
          <div class="card-header"><div class="card-title">🤖 Agent 团队协作</div></div>
          <div class="tips-list">
            <div class="tip-item">
              <div class="tip-item-title">👥 Agent Teams (实验性)</div>
              <div class="tip-item-desc">设置 CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 启用。Lead agent 只协调不编辑代码，各 teammate 独立运行，共享任务列表。</div>
            </div>
            <div class="tip-item">
              <div class="tip-item-title">📋 /tasks 任务管理</div>
              <div class="tip-item-desc">v2.1.16+ 支持持久化任务列表，即使关闭会话也不丢失。Ctrl+T 切换显示。用自然语言创建任务。</div>
            </div>
            <div class="tip-item">
              <div class="tip-item-title">📤 会话交接</div>
              <div class="tip-item-desc">/export handover.md 导出会话。创建 ~/.claude/commands/handover.md 自定义交接命令，包含工作摘要、决策、未完成任务。</div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><div class="card-title">📚 参考资源</div></div>
          <div class="tips-list">
            <div class="tip-item">
              <div class="tip-item-title">📖 官方文档</div>
              <div class="tip-item-desc">code.claude.com/docs — 完整 API 参考、配置指南、最佳实践</div>
            </div>
            <div class="tip-item">
              <div class="tip-item-title">🖥️ GitHub</div>
              <div class="tip-item-desc">github.com/anthropics/claude-code — 源码、Issues、Release Notes</div>
            </div>
            <div class="tip-item">
              <div class="tip-item-title">💬 社区</div>
              <div class="tip-item-desc">Twitter @anthropic — 官方团队经常在此发布隐藏功能和更新提示</div>
            </div>
          </div>
        </div>
      </div>
    `;
  },
};
