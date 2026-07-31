/**
 * 安装与诊断页面
 */

const SetupPage = {
  render(container) {
    container.innerHTML = `
      <div class="card mb-4" id="installStatusCard">
        <div class="card-header">
          <div class="card-title">🤖 Claude Code 安装状态</div>
          <button class="btn sm" id="refreshInstall">🔄 重新检测</button>
        </div>
        <div id="installStatus">
          <div class="flex items-center gap-3">
            <div class="spinner"></div>
            <span class="text-muted">检测中...</span>
          </div>
        </div>
      </div>

      <div class="card mb-4" id="authCard">
        <div class="card-header">
          <div class="card-title">🔐 登录状态</div>
          <button class="btn sm" id="checkAuth">🔄 检查</button>
        </div>
        <div id="authStatus">
          <div class="text-muted text-sm">点击检查登录状态</div>
        </div>
      </div>

      <div class="card mb-4">
        <div class="card-header">
          <div class="card-title">🩺 环境诊断</div>
          <button class="btn sm primary" id="runDoctor">🩺 运行诊断</button>
        </div>
        <div id="doctorResult">
          <div class="text-muted text-sm">点击运行 claude doctor 进行环境诊断</div>
        </div>
      </div>

      <div class="card mb-4">
        <div class="card-header">
          <div class="card-title">📦 安装 Claude Code</div>
        </div>
        <div class="text-sm text-secondary mb-3">
          如果尚未安装 Claude Code CLI，请选择以下方式之一：
        </div>
        <div class="grid grid-2">
          <div class="card">
            <div class="font-bold text-sm mb-1">🚀 原生安装 (推荐)</div>
            <div class="text-xs text-muted mb-2">无需 Node.js 依赖</div>
            <div class="font-mono text-xs p-2" style="background:var(--bg-tertiary); border-radius:6px; user-select:text">
              macOS / Linux:<br>
              curl -fsSL https://claude.ai/install.sh | bash<br><br>
              Windows PowerShell:<br>
              irm https://claude.ai/install.ps1 | iex
            </div>
            <button class="btn sm primary mt-2" id="installNative">一键安装</button>
          </div>
          <div class="card">
            <div class="font-bold text-sm mb-1">🍺 Homebrew (macOS)</div>
            <div class="text-xs text-muted mb-2">macOS Homebrew 安装</div>
            <div class="font-mono text-xs p-2" style="background:var(--bg-tertiary); border-radius:6px; user-select:text">
              brew install --cask claude-code
            </div>
            <button class="btn sm primary mt-2" id="installBrew">一键安装</button>
          </div>
          <div class="card">
            <div class="font-bold text-sm mb-1">📦 npm (传统方式)</div>
            <div class="text-xs text-muted mb-2">需要 Node.js 18+</div>
            <div class="font-mono text-xs p-2" style="background:var(--bg-tertiary); border-radius:6px; user-select:text">
              npm install -g @anthropic-ai/claude-code
            </div>
            <button class="btn sm primary mt-2" id="installNpm">一键安装</button>
          </div>
          <div class="card">
            <div class="font-bold text-sm mb-1">🪟 winget (Windows)</div>
            <div class="text-xs text-muted mb-2">Windows 包管理器</div>
            <div class="font-mono text-xs p-2" style="background:var(--bg-tertiary); border-radius:6px; user-select:text">
              winget install Anthropic.ClaudeCode
            </div>
            <button class="btn sm primary mt-2" id="installWinget">一键安装</button>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div class="card-title">⚙️ 插件设置</div>
        </div>
        <div class="flex flex-col gap-3">
          <div>
            <label class="text-sm text-muted">Claude CLI 路径 (留空自动检测)</label>
            <div class="input-group mt-1">
              <input class="input" id="claudePathInput" placeholder="自动检测" value="${Utils.escapeHtml(Utils.store.get("claudePath", ""))}" />
              <button class="btn sm" id="browseClaudePath">浏览</button>
            </div>
          </div>
          <div>
            <label class="text-sm text-muted">默认工作目录</label>
            <div class="input-group mt-1">
              <input class="input" id="defaultWorkDirInput" placeholder="如 ~/Projects" value="${Utils.escapeHtml(Utils.store.get("defaultWorkDir", ""))}" />
              <button class="btn sm" id="browseWorkDir">浏览</button>
            </div>
          </div>
          <div>
            <label class="text-sm text-muted">主题</label>
            <select class="select mt-1" id="themeSelect" style="width:200px">
              <option value="auto" ${Utils.store.get("theme", "auto") === "auto" ? "selected" : ""}>跟随系统</option>
              <option value="dark" ${Utils.store.get("theme") === "dark" ? "selected" : ""}>暗色</option>
              <option value="light" ${Utils.store.get("theme") === "light" ? "selected" : ""}>亮色</option>
            </select>
          </div>
          <div>
            <label class="text-sm text-muted">自定义模型列表 (每行一个)</label>
            <textarea class="textarea mt-1" id="customModelsInput" placeholder="fable&#10;opusplan&#10;custom-model-name" style="min-height:60px">${Utils.escapeHtml(Utils.store.get("customModels", ""))}</textarea>
          </div>
          <button class="btn primary" id="saveSettings">💾 保存设置</button>
        </div>
      </div>
    `;

    this.bindEvents();
    this.checkInstall();
  },

  bindEvents() {
    document.getElementById("refreshInstall")?.addEventListener("click", () => this.checkInstall());
    document.getElementById("checkAuth")?.addEventListener("click", () => this.checkAuth());
    document.getElementById("runDoctor")?.addEventListener("click", () => this.runDoctor());

    document.getElementById("installNative")?.addEventListener("click", () => this.install("curl -fsSL https://claude.ai/install.sh | bash"));
    document.getElementById("installBrew")?.addEventListener("click", () => this.install("brew install --cask claude-code"));
    document.getElementById("installNpm")?.addEventListener("click", () => this.install("npm install -g @anthropic-ai/claude-code"));
    document.getElementById("installWinget")?.addEventListener("click", () => this.install("winget install Anthropic.ClaudeCode"));

    document.getElementById("browseClaudePath")?.addEventListener("click", async () => {
      const result = await Utils.showOpenDialog({
        title: "选择 Claude CLI",
        properties: ["openFile"],
      });
      if (result && result[0]) {
        document.getElementById("claudePathInput").value = result[0];
      }
    });

    document.getElementById("browseWorkDir")?.addEventListener("click", async () => {
      const result = await Utils.showOpenDialog({
        title: "选择默认工作目录",
        properties: ["openDirectory"],
      });
      if (result && result[0]) {
        document.getElementById("defaultWorkDirInput").value = result[0];
      }
    });

    document.getElementById("saveSettings")?.addEventListener("click", () => {
      Utils.store.set("claudePath", document.getElementById("claudePathInput").value.trim());
      Utils.store.set("defaultWorkDir", document.getElementById("defaultWorkDirInput").value.trim());
      Utils.store.set("theme", document.getElementById("themeSelect").value);
      Utils.store.set("customModels", document.getElementById("customModelsInput").value.trim());
      Utils.applyTheme();
      Utils.toast("设置已保存", "success");
      this.checkInstall();
    });
  },

  async checkInstall() {
    const el = document.getElementById("installStatus");
    const status = await Utils.api("checkInstall");

    App.installStatus = status;
    App.updateTopbarStatus();

    if (status.installed) {
      el.innerHTML = `
        <div class="flex items-center gap-3 mb-2">
          <span class="status-badge success"><span class="dot"></span>已安装</span>
          <span class="font-mono text-sm font-bold">${Utils.escapeHtml(status.version || "")}</span>
        </div>
        <div class="text-xs text-muted font-mono break-all">路径: ${Utils.escapeHtml(status.path || "")}</div>
        <div class="text-xs text-muted mt-1">平台: ${Utils.apiSync("platform")} · 架构: ${Utils.apiSync("arch")} · Node: ${Utils.apiSync("nodeVersion")}</div>
      `;
    } else {
      el.innerHTML = `
        <div class="flex items-center gap-3 mb-2">
          <span class="status-badge danger"><span class="dot"></span>未安装</span>
        </div>
        <div class="text-xs text-muted">请使用下方安装方法安装 Claude Code CLI</div>
      `;
    }
  },

  async checkAuth() {
    const el = document.getElementById("authStatus");
    el.innerHTML = `<div class="flex items-center gap-2"><div class="spinner"></div><span class="text-muted">检查中...</span></div>`;

    const result = await Utils.api("checkAuthStatus");
    if (result.loggedIn) {
      el.innerHTML = `
        <div class="flex items-center gap-2 mb-2">
          <span class="status-badge success"><span class="dot"></span>已登录</span>
        </div>
        <pre class="text-xs font-mono p-2" style="background:var(--bg-tertiary); border-radius:6px; white-space:pre-wrap; user-select:text">${Utils.escapeHtml(result.result || "")}</pre>
      `;
    } else {
      el.innerHTML = `
        <div class="flex items-center gap-2 mb-2">
          <span class="status-badge danger"><span class="dot"></span>未登录</span>
          <button class="btn sm primary" id="loginBtn">登录</button>
        </div>
        <div class="text-xs text-muted">${Utils.escapeHtml(result.error || "")}</div>
      `;
      document.getElementById("loginBtn")?.addEventListener("click", () => {
        App.navigate("terminal");
        setTimeout(() => {
          const dir = App.currentWorkDir || Utils.store.get("defaultWorkDir", "");
          Terminal.newSession(dir);
          setTimeout(() => {
            if (Terminal.activeTabId) {
              Terminal.sendCommand("/login");
            }
          }, 800);
        }, 300);
      });
    }
  },

  async runDoctor() {
    const el = document.getElementById("doctorResult");
    el.innerHTML = `<div class="flex items-center gap-2"><div class="spinner"></div><span class="text-muted">诊断中... (可能需要一些时间)</span></div>`;

    const result = await Utils.api("runDoctor");
    if (result.error) {
      el.innerHTML = `
        <div class="text-danger text-sm mb-2">❌ ${Utils.escapeHtml(result.error)}</div>
        ${result.result ? `<pre class="text-xs font-mono p-2" style="background:var(--bg-tertiary); border-radius:6px; white-space:pre-wrap; user-select:text">${Utils.escapeHtml(result.result)}</pre>` : ""}
      `;
    } else {
      el.innerHTML = `
        <pre class="text-xs font-mono p-3" style="background:var(--bg-tertiary); border-radius:8px; white-space:pre-wrap; max-height:400px; overflow:auto; user-select:text">${Utils.escapeHtml(result.result || "")}</pre>
      `;
    }
  },

  async install(command) {
    if (!await Utils.confirm(`将执行: ${command}\n\n确定要安装吗？`)) return;

    const el = document.getElementById("installStatus");
    el.innerHTML = `<div class="flex items-center gap-2"><div class="spinner"></div><span class="text-muted">安装中... 请稍候</span></div>`;

    Utils.apiSync("execCommand", command, (result) => {
      if (result.error) {
        el.innerHTML = `
          <div class="text-danger text-sm mb-2">❌ 安装失败: ${Utils.escapeHtml(result.error)}</div>
          <pre class="text-xs font-mono p-2" style="background:var(--bg-tertiary); border-radius:6px; white-space:pre-wrap; user-select:text">${Utils.escapeHtml(result.stderr || "")}</pre>
        `;
      } else {
        el.innerHTML = `
          <div class="text-success text-sm mb-2">✅ 安装成功!</div>
          <pre class="text-xs font-mono p-2" style="background:var(--bg-tertiary); border-radius:6px; white-space:pre-wrap; user-select:text">${Utils.escapeHtml(result.stdout || "")}</pre>
        `;
        this.checkInstall();
      }
    });
  },
};
