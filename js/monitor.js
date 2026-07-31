/**
 * 监控页面 — /cost, /context, /insights
 */

const MonitorPage = {
  render(container) {
    container.innerHTML = `
      <div class="grid grid-2 mb-4">
        <div class="card">
          <div class="card-header">
            <div class="card-title">💰 费用统计</div>
            <button class="btn sm" id="refreshCost">🔄 刷新</button>
          </div>
          <div id="costInfo">
            <div class="text-muted text-sm">点击刷新或在终端中运行 /cost</div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div class="card-title">📊 上下文使用</div>
            <button class="btn sm" id="refreshContext">🔄 刷新</button>
          </div>
          <div id="contextInfo">
            <div class="text-muted text-sm">点击刷新或在终端中运行 /context</div>
          </div>
        </div>
      </div>

      <div class="card mb-4">
        <div class="card-header">
          <div class="card-title">🔍 使用洞察 (/insights)</div>
          <div class="flex gap-2">
            <button class="btn sm" id="genInsights">生成报告</button>
            <button class="btn sm" id="openInsights">📂 打开报告</button>
          </div>
        </div>
        <div class="text-xs text-muted">
          /insights 会分析你过去一个月的使用习惯，生成 HTML 报告，包含命令使用频率、常用模式、Skills 和 Hooks 建议。
          报告保存在 ~/.claude/usage-data/report.html
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div class="card-title">📈 快捷操作</div>
        </div>
        <div class="flex flex-wrap gap-2">
          <button class="btn" data-quick-cmd="/cost">💰 查看 /cost</button>
          <button class="btn" data-quick-cmd="/context">📊 查看 /context</button>
          <button class="btn" data-quick-cmd="/usage">📉 查看 /usage</button>
          <button class="btn" data-quick-cmd="/status">📈 查看 /status</button>
          <button class="btn" data-quick-cmd="/insights">🔍 生成 /insights</button>
        </div>
      </div>
    `;

    this.bindEvents();
  },

  bindEvents() {
    document.getElementById("refreshCost")?.addEventListener("click", () => this.runCommand("/cost"));
    document.getElementById("refreshContext")?.addEventListener("click", () => this.runCommand("/context"));
    document.getElementById("genInsights")?.addEventListener("click", () => this.runCommand("/insights"));
    document.getElementById("openInsights")?.addEventListener("click", () => this.openInsights());

    document.querySelectorAll("[data-quick-cmd]").forEach((btn) => {
      btn.addEventListener("click", () => this.runCommand(btn.dataset.quickCmd));
    });
  },

  runCommand(cmd) {
    if (Terminal.activeTabId) {
      Terminal.sendCommand(cmd);
      Utils.toast(`已发送 ${cmd}`, "info");
    } else {
      // 在非交互模式下执行
      Utils.toast("请在终端页面中运行此命令", "warning");
      App.navigate("terminal");
    }
  },

  openInsights() {
    const insightsPath = Utils.apiSync("pathJoin", Utils.apiSync("getClaudeDir"), "usage-data", "report.html");
    if (Utils.apiSync("fileExists", insightsPath)) {
      utools.shellOpenPath(insightsPath);
    } else {
      Utils.toast("报告不存在，请先生成", "warning");
    }
  },
};
