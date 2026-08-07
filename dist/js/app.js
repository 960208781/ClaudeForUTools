/**
 * 主应用逻辑
 * 统一 scope 管理 + 专业 IDE 壳层（活动栏/命令面板/状态栏）
 */

const App = {
  currentPage: "dashboard",
  installStatus: null,
  currentWorkDir: null,

  // === 统一 scope 管理 ===
  scope: "global",
  projectDir: null,
  scopeAwarePages: ["mcp", "hooks", "commands", "skills", "market", "config", "sessions"],

  // 命令面板索引
  paletteItems: [],

  slashCommands: [
    { cmd: "/init", icon: "🚀", desc: "初始化项目" },
    { cmd: "/compact", icon: "📦", desc: "压缩上下文" },
    { cmd: "/context", icon: "📊", desc: "查看上下文" },
    { cmd: "/clear", icon: "🧹", desc: "清除对话" },
    { cmd: "/cost", icon: "💰", desc: "查看费用" },
    { cmd: "/model", icon: "🧠", desc: "切换模型" },
    { cmd: "/review", icon: "👀", desc: "代码审查" },
    { cmd: "/doctor", icon: "🩺", desc: "环境诊断" },
    { cmd: "/help", icon: "❓", desc: "帮助" },
    { cmd: "/plan", icon: "📋", desc: "计划模式" },
    { cmd: "/rewind", icon: "⏪", desc: "回退" },
    { cmd: "/resume", icon: "▶️", desc: "恢复会话" },
    { cmd: "/status", icon: "📈", desc: "状态" },
    { cmd: "/export", icon: "📤", desc: "导出" },
    { cmd: "/agents", icon: "🤖", desc: "子代理" },
    { cmd: "/config", icon: "⚙️", desc: "配置" },
    { cmd: "/memory", icon: "💾", desc: "记忆" },
    { cmd: "/hooks", icon: "🪝", desc: "Hooks" },
    { cmd: "/mcp", icon: "🔌", desc: "MCP" },
    { cmd: "/tasks", icon: "✅", desc: "任务" },
    { cmd: "/fast", icon: "⚡", desc: "快速模式" },
    { cmd: "/effort", icon: "🎛️", desc: "努力级别" },
    { cmd: "/vim", icon: "✏️", desc: "Vim模式" },
    { cmd: "/theme", icon: "🎨", desc: "主题" },
    { cmd: "/insights", icon: "🔍", desc: "使用洞察" },
    { cmd: "/usage", icon: "📉", desc: "用量" },
    { cmd: "/security-review", icon: "🔒", desc: "安全审查" },
    { cmd: "/output-style", icon: "📝", desc: "输出风格" },
    { cmd: "/ultrareview", icon: "🔬", desc: "深度审查" },
    { cmd: "/recap", icon: "📖", desc: "会话回顾" },
    { cmd: "/tui", icon: "🖥️", desc: "全屏模式" },
    { cmd: "/focus", icon: "🎯", desc: "专注模式" },
  ],

  pageTitles: {
    dashboard: "仪表盘",
    terminal: "对话",
    model: "模型管理",
    config: "配置管理",
    mcp: "MCP 服务器",
    hooks: "Hooks 管理",
    commands: "自定义命令",
    skills: "Skills",
    market: "市场",
    sessions: "会话历史",
    gateway: "网关信息",
    monitor: "监控",
    tips: "最佳实践",
    setup: "安装与诊断",
  },

  // 页面图标（命令面板用）
  pageIcons: {
    dashboard: "🏠", terminal: "💬", model: "🧠", config: "⚙️",
    mcp: "🔌", hooks: "🪝", commands: "📝", skills: "✨",
    market: "🏪", sessions: "📂", gateway: "🌐", monitor: "📊",
    tips: "💡", setup: "🔧",
  },

  init() {
    Utils.applyTheme();

    const expanded = Utils.store.get("sidebarExpanded", false);
    if (expanded) document.getElementById("activityBar")?.classList.add("expanded");

    this.bindActivityBar();
    this.bindScope();
    this.bindPalette();
    this.bindMarkdownLinks();

    utools.onPluginEnter(({ code, type, payload }) => {
      this.handlePluginEnter(code, type, payload);
    });

    utools.onPluginOut(() => {
      if (typeof Terminal !== "undefined" && Terminal.cleanup) Terminal.cleanup();
    });

    this.checkInstallStatus();

    if (typeof Terminal !== "undefined" && Terminal._restoreProjects && !Terminal._restored) {
      Terminal._restored = true;
      Terminal._restoreProjects();
    }

    // 状态栏时钟
    this.startClock();

    this.navigate(this.currentPage);
  },

  // === 活动栏导航 ===
  bindActivityBar() {
    document.querySelectorAll(".activity-item").forEach((item) => {
      item.addEventListener("click", () => this.navigate(item.dataset.page));
    });

    document.getElementById("activityCollapse")?.addEventListener("click", () => {
      const bar = document.getElementById("activityBar");
      bar.classList.toggle("expanded");
      const expanded = bar.classList.contains("expanded");
      Utils.store.set("sidebarExpanded", expanded);
      document.getElementById("collapseIcon").textContent = expanded ? "›" : "‹";
    });
  },

  // === Scope 管理 ===
  bindScope() {
    document.getElementById("scopeToggleGlobal")?.addEventListener("click", () => this.setScope("global"));
    document.getElementById("scopeToggleProject")?.addEventListener("click", () => {
      if (!this.projectDir) this.selectProject();
      else this.setScope("project");
    });
    document.getElementById("scopeSelectProject")?.addEventListener("click", () => this.selectProject());

    // 主题切换
    document.getElementById("themeToggle")?.addEventListener("click", () => this.toggleTheme());
  },

  toggleTheme() {
    const isLight = document.body.classList.contains("light-theme");
    Utils.store.set("theme", isLight ? "dark" : "light");
    Utils.applyTheme();
    Utils.toast(isLight ? "已切换为暗色主题" : "已切换为亮色主题", "success");
  },

  async selectProject() {
    const result = await Utils.showOpenDialog({ title: "选择项目目录", properties: ["openDirectory"] });
    if (result && result[0]) {
      this.projectDir = result[0];
      this.setScope("project");
    }
  },

  setScope(scope) {
    this.scope = scope;
    this.updateTopbarScope();
    this.navigate(this.currentPage);
  },

  setProjectDir(dir) {
    this.projectDir = dir;
    if (dir) this.setScope("project");
    else this.setScope("global");
  },

  getConfigScope() { return this.scope === "project" ? "project" : "user"; },
  getMcpScope() { return this.scope === "project" ? "project" : "global"; },

  updateTopbarScope() {
    const sGlobal = document.getElementById("scopeToggleGlobal");
    const sProject = document.getElementById("scopeToggleProject");
    const label = document.getElementById("scopeProjectLabel");
    const selBtn = document.getElementById("scopeSelectProject");
    const tag = document.getElementById("scopeTag");
    const sbScope = document.getElementById("sbScope");
    const sbProject = document.getElementById("sbProject");

    const isProject = this.scope === "project" && this.projectDir;
    const scopeText = isProject ? "📁 项目级" : "🌍 全局";

    if (sGlobal) sGlobal.classList.toggle("active", !isProject);
    if (sProject) sProject.classList.toggle("active", isProject);

    if (label) {
      if (isProject) { label.textContent = Utils.baseName(this.projectDir); label.title = this.projectDir; label.style.display = ""; }
      else { label.textContent = ""; label.style.display = "none"; }
    }
    if (selBtn) selBtn.style.display = isProject ? "" : "none";

    // 标题旁 scope 标签
    if (tag) {
      tag.textContent = scopeText;
      tag.className = "scope-tag " + (isProject ? "project" : "global");
    }

    // 状态栏 scope
    if (sbScope) sbScope.textContent = scopeText;
    if (sbProject) {
      if (isProject) { sbProject.textContent = "📁 " + Utils.baseName(this.projectDir); sbProject.title = this.projectDir; sbProject.style.display = ""; }
      else sbProject.style.display = "none";
    }
  },

  handlePluginEnter(code, type, payload) {
    switch (code) {
      case "claude-manager": this.navigate("dashboard"); break;
      case "claude-terminal": this.navigate("terminal"); break;
      case "claude-config": this.navigate("config"); break;
      case "claude-session": this.navigate("sessions"); break;
      case "claude-open-dir":
        if (type === "window") {
          const workDir = payload?.dir || payload?.path || Utils.store.get("defaultWorkDir", "");
          if (workDir) {
            this.currentWorkDir = workDir;
            this.setProjectDir(workDir);
            this.navigate("terminal");
            setTimeout(() => { if (typeof Terminal !== "undefined" && Terminal.newSession) Terminal.newSession(workDir); }, 300);
          } else { this.navigate("terminal"); }
        }
        break;
      case "claude-open-file":
        if (type === "files" && payload && payload.length > 0) {
          const filePath = payload[0].path;
          const sep = filePath.includes("/") ? "/" : "\\";
          const lastSep = filePath.lastIndexOf(sep);
          const workDir = lastSep > 0 ? filePath.substring(0, lastSep) : "";
          if (workDir) { this.currentWorkDir = workDir; this.setProjectDir(workDir); }
          this.navigate("terminal");
          setTimeout(() => { if (typeof Terminal !== "undefined" && Terminal.newSession) Terminal.newSession(workDir, `分析文件: ${filePath}`); }, 300);
        }
        break;
    }
    utools.setExpendHeight(600);
  },

  async checkInstallStatus() {
    this.installStatus = await Utils.api("checkInstall");
    this.updateTopbarStatus();
  },

  updateTopbarStatus() {
    // Claude 状态（状态栏）
    const sbClaude = document.getElementById("sbClaude");
    if (sbClaude) {
      if (this.installStatus) {
        if (this.installStatus.installed) {
          sbClaude.className = "status-item success";
          sbClaude.innerHTML = `<span class="dot"></span>Claude ${this.installStatus.version || ""}`;
        } else {
          sbClaude.className = "status-item danger";
          sbClaude.innerHTML = '<span class="dot"></span>未安装';
        }
      } else {
        sbClaude.className = "status-item";
        sbClaude.innerHTML = '<span class="dot"></span>检测中…';
      }
    }

    // 会话数
    const sbSessions = document.getElementById("sbSessions");
    if (sbSessions) {
      const count = (typeof Terminal !== "undefined" && Terminal.projects) ? Terminal.projects.length : 0;
      sbSessions.textContent = "💬 " + count;
    }

    this.updateTopbarScope();
  },

  // === 状态栏时钟 ===
  startClock() {
    const update = () => {
      const el = document.getElementById("sbTime");
      if (el) {
        const d = new Date();
        el.textContent = d.toLocaleTimeString("zh-CN", { hour12: false });
      }
    };
    update();
    setInterval(update, 1000);
  },

  // === Markdown 链接点击处理（本地文件预览 / 外部链接打开） ===
  bindMarkdownLinks() {
    document.addEventListener("click", (e) => {
      const link = e.target.closest("a.md-link");
      if (!link) return;
      const href = link.getAttribute("href");
      if (!href) return;

      e.preventDefault();
      this._openMarkdownLink(href);
    });
  },

  _openMarkdownLink(href) {
    // 外部 URL — 打开系统浏览器
    if (/^https?:\/\//i.test(href)) {
      utools.shellOpenExternal(href);
      return;
    }
    // mailto / tel
    if (/^(mailto:|tel:)/i.test(href)) {
      utools.shellOpenExternal(href);
      return;
    }

    // 本地文件路径 — 去掉可能的前缀（file://）
    let localPath = href;
    if (/^file:\/\//i.test(href)) {
      try { localPath = decodeURIComponent(href.replace(/^file:\/\//i, "")); }
      catch (err) { localPath = href.replace(/^file:\/\//i, ""); }
    }
    // 规范化 ~ 开头
    if (localPath.startsWith("~")) {
      localPath = Utils.apiSync("getHomeDir") + localPath.slice(1);
    }
    // 处理相对路径 → 结合当前工作目录
    if (!/^[\/\\]|[A-Za-z]:/.test(localPath)) {
      const base = App.projectDir || App.currentWorkDir || "";
      if (base) localPath = base + "/" + localPath;
    }

    // 判断文件是否存在并打开
    const exists = typeof Utils.apiSync === "function" && Utils.apiSync("fileExists", localPath);
    if (exists) {
      // 是文件 → 直接打开；是目录 → 在文件管理器中显示
      try {
        utools.shellOpenPath(localPath);
      } catch (err) {
        utools.shellShowItemInFolder(localPath);
      }
    } else {
      // 可能是目录编码或不存在，尝试在文件管理器显示父级
      try {
        utools.shellShowItemInFolder(localPath);
      } catch (err) {
        Utils.toast("无法打开: " + localPath, "error");
      }
    }
  },

  // === 页面导航 ===
  navigate(page) {
    this.currentPage = page;

    document.querySelectorAll(".activity-item").forEach((item) => {
      item.classList.toggle("active", item.dataset.page === page);
    });

    // 页面标题 + scope 标签
    const titleEl = document.getElementById("pageTitle");
    if (titleEl) titleEl.textContent = this.pageTitles[page] || page;
    this.updateTopbarScope();

    const content = document.getElementById("content");
    content.innerHTML = "";
    content.className = (page === "terminal" || page === "sessions") ? "content no-padding" : "content";

    const pages = {
      dashboard: () => Dashboard.render(content),
      terminal: () => Terminal.render(content),
      model: () => ModelPage.render(content),
      config: () => ConfigPage.render(content),
      mcp: () => McpPage.render(content),
      hooks: () => HooksPage.render(content),
      commands: () => CommandsPage.render(content),
      skills: () => SkillsPage.render(content),
      market: () => MarketPage.render(content),
      sessions: () => SessionsPage.render(content),
      gateway: () => GatewayPage.render(content),
      monitor: () => MonitorPage.render(content),
      tips: () => TipsPage.render(content),
      setup: () => SetupPage.render(content),
    };

    if (pages[page]) pages[page]();
  },

  setWorkDir(dir) {
    this.currentWorkDir = dir;
    this.updateTopbarStatus();
  },

  // === 命令面板 ===
  buildPaletteIndex() {
    const items = [];
    // 页面
    Object.entries(this.pageTitles).forEach(([key, title]) => {
      items.push({ type: "page", icon: this.pageIcons[key] || "📄", label: title, desc: "跳转页面", action: () => this.navigate(key) });
    });
    // scope 操作
    items.push({ type: "action", icon: "🌍", label: "切换到全局模式", desc: "Scope", action: () => this.setScope("global") });
    items.push({ type: "action", icon: "📁", label: "选择项目目录", desc: "Scope", action: () => this.selectProject() });
    // 斜杠命令（发送到终端）
    this.slashCommands.forEach((c) => {
      items.push({ type: "slash", icon: c.icon, label: c.cmd, desc: c.desc, action: () => this.sendSlash(c.cmd) });
    });
    return items;
  },

  sendSlash(cmd) {
    this.navigate("terminal");
    setTimeout(() => {
      if (typeof Terminal !== "undefined" && Terminal.activeTabId) Terminal.sendCommand(cmd);
    }, 300);
  },

  bindPalette() {
    const overlay = document.getElementById("paletteOverlay");
    const input = document.getElementById("paletteInput");
    const results = document.getElementById("paletteResults");

    // 触发
    document.getElementById("paletteTrigger")?.addEventListener("click", () => this.openPalette());

    // 快捷键 Ctrl+P / Cmd+P / Ctrl+K
    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "p" || e.key === "k")) {
        e.preventDefault();
        this.openPalette();
      }
      if (e.key === "Escape" && overlay.style.display !== "none") {
        this.closePalette();
      }
    });

    // 点击遮罩关闭
    overlay?.addEventListener("click", (e) => { if (e.target === overlay) this.closePalette(); });

    // 搜索
    let selectedIdx = 0;
    input?.addEventListener("input", () => {
      const q = input.value.toLowerCase().trim();
      const items = this.buildPaletteIndex();
      const filtered = q ? items.filter((it) => it.label.toLowerCase().includes(q) || it.desc.toLowerCase().includes(q)) : items;
      selectedIdx = 0;
      this.renderPaletteResults(results, filtered, selectedIdx);

      // 键盘选择
      input.onkeydown = (ev) => {
        if (ev.key === "ArrowDown") { ev.preventDefault(); selectedIdx = Math.min(selectedIdx + 1, filtered.length - 1); this.renderPaletteResults(results, filtered, selectedIdx); }
        else if (ev.key === "ArrowUp") { ev.preventDefault(); selectedIdx = Math.max(selectedIdx - 1, 0); this.renderPaletteResults(results, filtered, selectedIdx); }
        else if (ev.key === "Enter") { ev.preventDefault(); if (filtered[selectedIdx]) { filtered[selectedIdx].action(); this.closePalette(); } }
      };
    });
  },

  openPalette() {
    const overlay = document.getElementById("paletteOverlay");
    const input = document.getElementById("paletteInput");
    const results = document.getElementById("paletteResults");
    if (!overlay) return;
    overlay.style.display = "flex";
    input.value = "";
    const items = this.buildPaletteIndex();
    this.renderPaletteResults(results, items, 0);
    setTimeout(() => input.focus(), 50);
  },

  closePalette() {
    const overlay = document.getElementById("paletteOverlay");
    if (overlay) overlay.style.display = "none";
  },

  renderPaletteResults(container, items, selectedIdx) {
    if (!container) return;
    if (items.length === 0) {
      container.innerHTML = '<div class="palette-empty">未找到匹配项</div>';
      return;
    }
    container.innerHTML = items.map((it, i) => `
      <div class="palette-result ${i === selectedIdx ? "selected" : ""}" data-idx="${i}">
        <span class="pr-icon">${it.icon}</span>
        <span class="pr-label">${Utils.escapeHtml(it.label)}</span>
        <span class="pr-desc">${Utils.escapeHtml(it.desc)}</span>
      </div>
    `).join("");

    container.querySelectorAll(".palette-result").forEach((el, i) => {
      el.addEventListener("click", () => { items[i].action(); this.closePalette(); });
      el.addEventListener("mouseenter", () => { selectedIdx = i; });
    });

    // 滚动到选中项
    const sel = container.querySelector(".palette-result.selected");
    if (sel) sel.scrollIntoView({ block: "nearest" });
  },
};

document.addEventListener("DOMContentLoaded", () => {
  App.init();
});
