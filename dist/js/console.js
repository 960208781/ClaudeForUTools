/**
 * 终端控制台页面 — 完整的命令行终端能力
 * 支持执行 shell 命令和 Claude CLI 命令，带快捷指令面板
 */

const ConsolePage = {
  workDir: null,
  history: [],
  historyIndex: -1,
  cmdPopupOpen: false,

  render(container) {
    this.workDir = App.currentWorkDir || Utils.store.get("defaultWorkDir", "") || Utils.apiSync("getHomeDir");
    container.innerHTML = `
      <div class="console-container">
        <div class="console-toolbar">
          <button class="btn sm" id="consoleDirBtn">📁 ${this.workDir ? this.workDir.split("/").pop() : "选择目录"}</button>
          <span class="console-cwd font-mono text-xs text-muted" id="consoleCwd">${Utils.escapeHtml(this.workDir || "未选择")}</span>
          <button class="btn sm" id="consoleClearBtn">🧹 清屏</button>
        </div>
        <div class="console-output" id="consoleOutput">
          <div class="console-welcome">
            <div class="console-welcome-title">💻 终端</div>
            <div class="console-welcome-desc">输入命令并回车执行，支持所有 shell 命令和 Claude CLI</div>
          </div>
        </div>
        <div class="console-input-area">
          <div class="cmd-popup-overlay" id="consoleCmdPopup">
            <div class="cmd-popup-header">
              <span class="cmd-popup-title">快捷命令</span>
              <input class="cmd-popup-search" id="consoleCmdSearch" placeholder="搜索命令..." />
              <button class="cmd-popup-close" id="consoleCmdClose">✕</button>
            </div>
            <div class="cmd-popup-grid" id="consoleCmdGrid">
              ${App.slashCommands.map((c) => `
                <div class="cmd-item" data-cmd="${c.cmd}" data-desc="${Utils.escapeHtml(c.desc)}">
                  <div class="cmd-item-icon">${c.icon}</div>
                  <div class="cmd-item-name">${c.cmd}</div>
                  <div class="cmd-item-desc">${Utils.escapeHtml(c.desc)}</div>
                </div>
              `).join("")}
            </div>
          </div>
          <div class="console-input-wrapper">
            <button class="chat-cmd-toggle" id="consoleCmdToggle" title="快捷命令">⚡</button>
            <span class="console-prompt">❯</span>
            <input class="console-input" id="consoleInput" placeholder="输入命令... (Enter 执行, ↑↓ 历史)" autocomplete="off" spellcheck="false" />
          </div>
        </div>
      </div>
    `;
    this.bindEvents();
    document.getElementById("consoleInput")?.focus();
  },

  bindEvents() {
    document.getElementById("consoleDirBtn")?.addEventListener("click", async () => {
      const result = await Utils.showOpenDialog({
        title: "选择工作目录",
        properties: ["openDirectory"],
      });
      if (result && result[0]) {
        this.workDir = result[0];
        App.setWorkDir(result[0]);
        document.getElementById("consoleDirBtn").textContent = "📁 " + result[0].split("/").pop();
        document.getElementById("consoleCwd").textContent = result[0];
        this.appendOutput(`\n📁 切换到: ${result[0]}\n`, "info");
      }
    });

    document.getElementById("consoleClearBtn")?.addEventListener("click", () => {
      document.getElementById("consoleOutput").innerHTML = "";
    });

    // 快捷命令弹窗
    const toggle = document.getElementById("consoleCmdToggle");
    const popup = document.getElementById("consoleCmdPopup");
    const search = document.getElementById("consoleCmdSearch");
    const closeBtn = document.getElementById("consoleCmdClose");

    toggle?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.cmdPopupOpen = !this.cmdPopupOpen;
      popup.classList.toggle("show", this.cmdPopupOpen);
      toggle.classList.toggle("active", this.cmdPopupOpen);
      if (this.cmdPopupOpen) {
        search.value = "";
        this._filterCommands("");
        setTimeout(() => search.focus(), 50);
      }
    });

    closeBtn?.addEventListener("click", () => {
      this.cmdPopupOpen = false;
      popup.classList.remove("show");
      toggle.classList.remove("active");
    });

    search?.addEventListener("input", () => this._filterCommands(search.value));
    search?.addEventListener("click", (e) => e.stopPropagation());

    document.querySelectorAll("#consoleCmdGrid .cmd-item").forEach((item) => {
      item.addEventListener("click", () => {
        const cmd = item.dataset.cmd;
        this.cmdPopupOpen = false;
        popup.classList.remove("show");
        toggle.classList.remove("active");
        this.executeCommand(cmd);
      });
    });

    // 命令输入
    const input = document.getElementById("consoleInput");
    input?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const cmd = input.value.trim();
        if (cmd) {
          this.history.push(cmd);
          this.historyIndex = this.history.length;
          input.value = "";
          this.executeCommand(cmd);
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (this.historyIndex > 0) {
          this.historyIndex--;
          input.value = this.history[this.historyIndex];
        }
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (this.historyIndex < this.history.length - 1) {
          this.historyIndex++;
          input.value = this.history[this.historyIndex];
        } else {
          this.historyIndex = this.history.length;
          input.value = "";
        }
      } else if (e.key === "Escape") {
        input.value = "";
      }
    });
  },

  _filterCommands(query) {
    const q = query.toLowerCase().trim();
    document.querySelectorAll("#consoleCmdGrid .cmd-item").forEach((item) => {
      const cmd = item.dataset.cmd.toLowerCase();
      const desc = (item.dataset.desc || "").toLowerCase();
      item.style.display = (!q || cmd.includes(q) || desc.includes(q)) ? "" : "none";
    });
  },

  async executeCommand(cmd) {
    // 显示命令
    this.appendOutput(`❯ ${cmd}\n`, "command");

    // 判断是否是 Claude 斜杠命令
    if (cmd.startsWith("/")) {
      await this.executeClaudeCommand(cmd);
      return;
    }

    // 普通命令通过 execShellCommand 执行
    this.appendOutput("⏳ 执行中...\r", "info");
    const result = await Utils.api("execShellCommand", cmd, this.workDir);
    
    // 清除"执行中"提示
    const output = document.getElementById("consoleOutput");
    const lastInfo = output.lastElementChild;
    if (lastInfo && lastInfo.textContent.includes("执行中")) lastInfo.remove();

    if (result.error && !result.stdout) {
      this.appendOutput(`❌ ${result.error}\n`, "stderr");
    } else {
      if (result.stdout) this.appendOutput(result.stdout, "stdout");
      if (result.stderr) this.appendOutput(result.stderr, "stderr");
      if (result.code !== 0 && !result.stdout && !result.stderr) {
        this.appendOutput(`[退出码: ${result.code}]\n`, "muted");
      }
    }
  },

  async executeClaudeCommand(cmd) {
    // Claude 斜杠命令通过 claude -p 执行
    const claudePath = Utils.apiSync("findClaudePath");
    if (!claudePath) {
      this.appendOutput("❌ Claude CLI 未安装\n", "stderr");
      return;
    }

    // 对于斜杠命令，我们用 claude -p "命令内容" 执行
    // 但斜杠命令只在交互式会话中有意义，这里直接执行
    const result = await Utils.api("runClaudeCommand", cmd, this.workDir, {});
    if (result.error) {
      this.appendOutput(`❌ ${result.error}\n`, "stderr");
    } else {
      if (result.stdout) this.appendOutput(result.stdout, "stdout");
      if (result.stderr) this.appendOutput(result.stderr, "stderr");
    }
  },

  appendOutput(text, className = "stdout") {
    const output = document.getElementById("consoleOutput");
    if (!output) return;

    // 清除欢迎信息
    const welcome = output.querySelector(".console-welcome");
    if (welcome) welcome.remove();

    const el = document.createElement("div");
    el.className = `console-line console-${className}`;
    el.textContent = text;
    output.appendChild(el);
    output.scrollTop = output.scrollHeight;
  },
};
