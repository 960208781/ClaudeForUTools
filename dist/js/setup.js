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

      <div class="card mb-4" id="networkConfigCard">
        <div class="card-header">
          <div class="card-title">🌐 网络设置 (国内环境)</div>
        </div>
        <div class="text-sm text-secondary mb-3">
          国内网络环境下，直连 claude.ai / npmjs.org 可能超时。配置代理或镜像可大幅提升安装成功率。
        </div>
        <div class="flex flex-col gap-3">
          <div>
            <label class="text-sm text-muted">HTTP 代理地址 (可选)</label>
            <input class="input mt-1" id="proxyInput" placeholder="如 http://127.0.0.1:7890 或 http://127.0.0.1:10809" value="${Utils.escapeHtml(Utils.store.get("installProxy", ""))}" />
            <div class="text-xs text-muted mt-1">留空则使用系统环境变量 HTTP_PROXY / HTTPS_PROXY。支持 Clash/v2rayN 等本地代理。</div>
          </div>
          <div class="flex items-center gap-2">
            <input type="checkbox" id="useNpmMirror" ${Utils.store.get("useNpmMirror", false) ? "checked" : ""} />
            <label for="useNpmMirror" class="text-sm">npm 安装时使用国内镜像 (registry.npmmirror.com)</label>
          </div>
        </div>
      </div>

      <div class="card mb-4">
        <div class="card-header">
          <div class="card-title">📦 安装 Claude Code</div>
        </div>
        <div class="text-sm text-secondary mb-3">
          如果尚未安装 Claude Code CLI，请选择以下方式之一：
        </div>
        <div class="grid grid-2" id="installCards">
          <div class="card">
            <div class="font-bold text-sm mb-1">🚀 原生安装 (推荐)</div>
            <div class="text-xs text-muted mb-2">无需 Node.js 依赖</div>
            <div class="font-mono text-xs p-2" id="nativeInstallCmd" style="background:var(--bg-tertiary); border-radius:6px; user-select:text"></div>
            <button class="btn sm primary mt-2" id="installNative">一键安装</button>
          </div>
          <div class="card" id="brewCard">
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
            <div class="font-mono text-xs p-2" id="npmInstallCmd" style="background:var(--bg-tertiary); border-radius:6px; user-select:text">
              npm install -g @anthropic-ai/claude-code
            </div>
            <button class="btn sm primary mt-2" id="installNpm">一键安装</button>
          </div>
          <div class="card" id="wingetCard">
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

    // 根据平台显示/隐藏安装卡片和命令
    this.updateInstallCards();

    document.getElementById("installNative")?.addEventListener("click", () => this.installNative());
    document.getElementById("installBrew")?.addEventListener("click", () => this.install("brew install --cask claude-code", { prereq: "brew", networkUrl: "https://brew.sh" }));
    document.getElementById("installNpm")?.addEventListener("click", () => this.installNpm());
    document.getElementById("installWinget")?.addEventListener("click", () => this.install("winget install Anthropic.ClaudeCode --accept-package-agreements --accept-source-agreements", { prereq: "winget", networkUrl: "https://downloads.claude.ai" }));

    // npm 镜像切换时更新命令显示
    document.getElementById("useNpmMirror")?.addEventListener("change", () => this.updateNpmCmd());

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

  /**
   * 根据平台更新安装卡片显示
   */
  updateInstallCards() {
    const platform = Utils.apiSync("platform");
    const isWin = platform === "win32";
    const isMac = platform === "darwin";

    // 原生安装命令文本
    const nativeCmdEl = document.getElementById("nativeInstallCmd");
    if (nativeCmdEl) {
      if (isWin) {
        nativeCmdEl.innerHTML = "irm https://claude.ai/install.ps1 | iex";
      } else {
        nativeCmdEl.innerHTML = "curl -fsSL https://claude.ai/install.sh | bash";
      }
    }

    // Homebrew 卡片仅在 macOS 显示
    const brewCard = document.getElementById("brewCard");
    if (brewCard) brewCard.style.display = isMac ? "" : "none";

    // winget 卡片仅在 Windows 显示
    const wingetCard = document.getElementById("wingetCard");
    if (wingetCard) wingetCard.style.display = isWin ? "" : "none";

    // npm 命令文本
    this.updateNpmCmd();
  },

  updateNpmCmd() {
    const npmCmdEl = document.getElementById("npmInstallCmd");
    if (!npmCmdEl) return;
    const useMirror = document.getElementById("useNpmMirror")?.checked;
    if (useMirror) {
      npmCmdEl.innerHTML = "npm install -g @anthropic-ai/claude-code --registry=https://registry.npmmirror.com";
    } else {
      npmCmdEl.innerHTML = "npm install -g @anthropic-ai/claude-code";
    }
  },

  getProxyEnv() {
    const proxy = document.getElementById("proxyInput")?.value.trim();
    const env = {};
    if (proxy) {
      env.HTTP_PROXY = proxy;
      env.HTTPS_PROXY = proxy;
      env.http_proxy = proxy;
      env.https_proxy = proxy;
    }
    return env;
  },

  saveNetworkSettings() {
    const proxy = document.getElementById("proxyInput")?.value.trim() || "";
    const useMirror = document.getElementById("useNpmMirror")?.checked || false;
    Utils.store.set("installProxy", proxy);
    Utils.store.set("useNpmMirror", useMirror);
  },

  installNative() {
    const platform = Utils.apiSync("platform");
    if (platform === "win32") {
      this.install("irm https://claude.ai/install.ps1 | iex", { shell: "powershell", prereq: "powershell", networkUrl: "https://claude.ai" });
    } else {
      this.install("curl -fsSL https://claude.ai/install.sh | bash", { prereq: "curl", networkUrl: "https://claude.ai" });
    }
  },

  installNpm() {
    const useMirror = document.getElementById("useNpmMirror")?.checked;
    let cmd = "npm install -g @anthropic-ai/claude-code";
    let networkUrl = "https://registry.npmjs.org";
    if (useMirror) {
      cmd += " --registry=https://registry.npmmirror.com";
      networkUrl = "https://registry.npmmirror.com";
    }
    this.install(cmd, { prereq: "npm", networkUrl });
  },

  /**
   * 追加日志到安装输出区域
   */
  appendLog(el, text, type) {
    const line = document.createElement("div");
    line.style.color = type === "stderr" ? "var(--color-danger, #f7768e)" : type === "success" ? "var(--color-success, #9ece6a)" : type === "info" ? "var(--color-muted, #565f89)" : "inherit";
    line.textContent = text;
    el.appendChild(line);
    el.scrollTop = el.scrollHeight;
  },

  /**
   * 核心安装方法 — 带预检、流式输出、错误诊断
   */
  async install(command, options) {
    options = options || {};
    this.saveNetworkSettings();

    const proxyEnv = this.getProxyEnv();
    const proxyHint = proxyEnv.HTTP_PROXY ? `\n🌐 已配置代理: ${proxyEnv.HTTP_PROXY}` : "";

    if (!await Utils.confirm(`将执行:\n${command}${proxyHint}\n\n确定要安装吗？`)) return;

    const el = document.getElementById("installStatus");
    el.innerHTML = "";

    // 创建日志区域
    const logArea = document.createElement("pre");
    logArea.style.cssText = "background:var(--bg-tertiary);border-radius:8px;padding:12px;max-height:350px;overflow:auto;font-size:12px;line-height:1.6;white-space:pre-wrap;word-break:break-all;font-family:monospace;user-select:text;";

    const setStatus = (html) => {
      const wrapper = document.createElement("div");
      wrapper.innerHTML = html;
      el.appendChild(wrapper);
      el.appendChild(logArea);
    };

    // === 步骤 1: 前置检查 ===
    setStatus(`<div class="flex items-center gap-2 mb-2"><div class="spinner"></div><span class="text-muted">步骤 1/3 — 环境检查...</span></div>`);

    // 检查命令是否存在
    if (options.prereq) {
      this.appendLog(logArea, `[预检] 检查 ${options.prereq} 是否可用...`, "info");
      const check = Utils.apiSync("checkCommandExists", options.prereq);
      if (!check.found) {
        this.appendLog(logArea, `[预检] ✗ 未找到 ${options.prereq}`, "stderr");
        const platform = Utils.apiSync("platform");
        let hint = "";
        if (options.prereq === "npm") {
          hint = platform === "win32"
            ? "请先安装 Node.js: https://nodejs.org/  或使用 winget:  winget install OpenJS.NodeJS"
            : "请先安装 Node.js: https://nodejs.org/  或使用 nvm:  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash";
        } else if (options.prereq === "winget") {
          hint = "winget 是 Windows 10 1703+ 自带的包管理器。请确认 Windows 版本，或从 Microsoft Store 安装「应用安装程序」。";
        } else if (options.prereq === "curl") {
          hint = "macOS/Linux 通常自带 curl。如果没有，请安装: brew install curl 或 apt install curl";
        } else if (options.prereq === "powershell") {
          hint = "Windows 10+ 自带 PowerShell。如果没有，请安装: winget install Microsoft.PowerShell";
        }
        setStatus(`<div class="text-danger text-sm mb-2">❌ 前置检查失败: 系统未安装 <b>${options.prereq}</b></div><div class="text-xs text-muted">${Utils.escapeHtml(hint)}</div>`);
        return;
      }
      this.appendLog(logArea, `[预检] ✓ ${options.prereq} 已找到: ${check.path}`, "success");
    }

    // === 步骤 2: 网络连通性检查 ===
    el.querySelector(".text-muted").textContent = "步骤 2/3 — 网络连通性检查...";

    if (options.networkUrl) {
      this.appendLog(logArea, `[网络] 测试连接 ${options.networkUrl} ...`, "info");
      const netResult = await Utils.api("testNetworkUrl", options.networkUrl, 10000, proxyEnv.HTTP_PROXY || null);

      if (netResult.ok) {
        this.appendLog(logArea, `[网络] ✓ 连接成功 (延迟 ${netResult.latency}ms, HTTP ${netResult.status})`, "success");
      } else {
        this.appendLog(logArea, `[网络] ✗ 连接失败: ${netResult.error || "未知错误"}`, "stderr");
        const hasProxy = !!proxyEnv.HTTP_PROXY;
        let hint = "";
        if (!hasProxy) {
          hint = `无法连接到 ${options.networkUrl}。\n\n可能原因:\n• 国内网络无法直连 — 请在上方「网络设置」中配置代理地址\n• 防火墙拦截 — 请检查系统防火墙设置\n• DNS 解析失败 — 尝试更换 DNS (如 223.5.5.5)`;
        } else {
          hint = `已配置代理但仍无法连接 ${options.networkUrl}。\n\n可能原因:\n• 代理地址不正确或代理未运行\n• 目标服务器暂时不可用\n• 代理不支持 HTTPS`;
        }

        // 如果是 npm 直连失败，提示用镜像
        if (options.prereq === "npm" && !document.getElementById("useNpmMirror")?.checked) {
          hint += "\n\n💡 建议: 勾选「npm 安装时使用国内镜像」可绕过 npmjs.org 连接问题";
        }

        setStatus(`<div class="text-danger text-sm mb-2">❌ 网络连接失败</div><pre class="text-xs p-2" style="background:var(--bg-tertiary);border-radius:6px;white-space:pre-wrap;user-select:text">${Utils.escapeHtml(hint)}</pre>`);
        return;
      }
    }

    // === 步骤 3: 执行安装 ===
    const statusText = el.querySelector(".text-muted");
    const installStartTime = Date.now();

    // Windows 原生安装特殊提示
    const currentPlatform = Utils.apiSync("platform");
    if (currentPlatform === "win32" && options.shell === "powershell") {
      this.appendLog(logArea, "[提示] Windows 原生安装将通过 PowerShell 下载并执行安装脚本", "info");
      this.appendLog(logArea, "[提示] 此过程可能需要 1-3 分钟，期间可能无输出，请耐心等待", "info");
    }

    // 实时计时器 — 每秒更新状态栏显示已耗时
    const updateTimer = () => {
      const elapsed = Math.floor((Date.now() - installStartTime) / 1000);
      const mins = Math.floor(elapsed / 60);
      const secs = elapsed % 60;
      const timeStr = mins > 0 ? `${mins}分${secs}秒` : `${secs}秒`;
      if (statusText) statusText.textContent = `步骤 3/3 — 正在安装... (${timeStr})`;
    };
    updateTimer();
    const timerInterval = setInterval(updateTimer, 1000);

    // 心跳消息 — 安装过程长时间无输出时追加进度提示
    let lastOutputTime = Date.now();
    const heartbeatInterval = setInterval(() => {
      if (Date.now() - lastOutputTime >= 10000) {
        const elapsed = Math.floor((Date.now() - installStartTime) / 1000);
        const mins = Math.floor(elapsed / 60);
        const secs = elapsed % 60;
        const timeStr = mins > 0 ? `${mins}分${secs}秒` : `${secs}秒`;
        this.appendLog(logArea, `⏳ 仍在安装中... 已耗时 ${timeStr}`, "info");
        lastOutputTime = Date.now();
      }
    }, 5000);

    const execOptions = {
      ...options,
      env: proxyEnv,
    };

    this.appendLog(logArea, `[安装] 执行: ${command}`, "info");
    this.appendLog(logArea, "─────────────────────────────", "info");

    Utils.apiSync("execCommandStream", command, execOptions, (event) => {
      if (event.type === "stdout") {
        lastOutputTime = Date.now();
        const lines = event.data.replace(/\r/g, "").split("\n");
        for (const line of lines) {
          if (line.trim()) this.appendLog(logArea, line, "stdout");
        }
      } else if (event.type === "stderr") {
        lastOutputTime = Date.now();
        const lines = event.data.replace(/\r/g, "").split("\n");
        for (const line of lines) {
          if (line.trim()) this.appendLog(logArea, line, "stderr");
        }
      } else if (event.type === "error") {
        this.appendLog(logArea, `[错误] ${event.data}`, "stderr");
      } else if (event.type === "done") {
        // 清除计时器和心跳
        clearInterval(timerInterval);
        clearInterval(heartbeatInterval);

        // 清除 spinner
        const spinnerEl = el.querySelector(".spinner");
        if (spinnerEl) spinnerEl.parentElement.remove();

        if (event.code === 0) {
          this.appendLog(logArea, "─────────────────────────────", "info");
          this.appendLog(logArea, "[完成] ✓ 安装成功!", "success");

          const successDiv = document.createElement("div");
          successDiv.innerHTML = `<div class="text-success text-sm mb-2">✅ 安装命令已执行成功!</div><div class="text-xs text-muted mt-2">正在重新检测 Claude Code 安装状态...</div>`;
          el.insertBefore(successDiv, logArea);

          setTimeout(() => this.checkInstall(), 2000);
        } else {
          this.appendLog(logArea, "─────────────────────────────", "info");
          this.appendLog(logArea, `[完成] ✗ 安装失败 (退出码: ${event.code})`, "stderr");

          // 诊断错误
          const fullOutput = (event.stdout + "\n" + event.stderr).toLowerCase();
          let diagnosis = "";
          if (fullOutput.includes("eacces") || fullOutput.includes("permission denied") || fullOutput.includes("权限")) {
            diagnosis = "权限不足。请尝试以管理员身份运行 uTools，或手动在管理员终端执行该命令。";
          } else if (fullOutput.includes("etimedout") || fullOutput.includes("timeout") || fullOutput.includes("超时")) {
            diagnosis = "操作超时。可能网络较慢或被墙，请配置代理后重试。";
          } else if (fullOutput.includes("enotfound") || fullOutput.includes("getaddrinfo")) {
            diagnosis = "DNS 解析失败。无法解析域名，请检查网络/DNS设置或配置代理。";
          } else if (fullOutput.includes("econnrefused") || fullOutput.includes("connection refused")) {
            diagnosis = "连接被拒绝。目标服务器或代理不可达，请检查代理设置。";
          } else if (fullOutput.includes("econnreset") || fullOutput.includes("socket hang up")) {
            diagnosis = "连接被重置。可能是网络不稳定或被 GFW 干扰，请配置代理后重试。";
          } else if (fullOutput.includes("certificate") || fullOutput.includes("ssl") || fullOutput.includes("tls")) {
            diagnosis = "SSL/TLS 证书错误。可能是代理中间人或系统时间不正确。";
          } else if (event.code === -1) {
            diagnosis = "进程异常终止。可能命令不存在或被系统拦截。";
          } else {
            diagnosis = `安装失败 (退出码 ${event.code})。请查看上方日志获取详细信息。`;
          }

          const failDiv = document.createElement("div");
          failDiv.innerHTML = `<div class="text-danger text-sm mb-2">❌ 安装失败</div><div class="text-xs text-muted mb-2">📋 诊断: ${Utils.escapeHtml(diagnosis)}</div>`;
          el.insertBefore(failDiv, logArea);
        }
      }
    });
  },
};
