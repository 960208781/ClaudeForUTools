/**
 * 主应用逻辑
 * 统一 scope 管理 — 全局/项目级切换贯穿所有页面
 */

const App = {
  currentPage: "dashboard",
  installStatus: null,
  currentWorkDir: null,

  // === 统一 scope 管理 ===
  scope: "global",       // "global" | "project"
  projectDir: null,      // 选中的项目目录

  // scope 依赖的页面列表（这些页面会根据 scope 读取不同配置）
  scopeAwarePages: ["mcp", "hooks", "commands", "skills", "market", "config"],

  // 斜杠命令快捷列表
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

  // 页面标题映射
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

  init() {
    Utils.applyTheme();

    const sidebarExpanded = Utils.store.get("sidebarExpanded", false);
    if (sidebarExpanded) document.getElementById("sidebar").classList.add("expanded");

    document.querySelectorAll(".nav-item").forEach((item) => {
      item.addEventListener("click", () => this.navigate(item.dataset.page));
    });

    document.getElementById("sidebarToggle").addEventListener("click", () => {
      const sidebar = document.getElementById("sidebar");
      sidebar.classList.toggle("expanded");
      const expanded = sidebar.classList.contains("expanded");
      Utils.store.set("sidebarExpanded", expanded);
      document.getElementById("toggleIcon").textContent = expanded ? "▶" : "◀";
    });

    // 绑定 topbar scope 控件
    this.bindTopbarScope();

    utools.onPluginEnter(({ code, type, payload }) => {
      this.handlePluginEnter(code, type, payload);
    });

    utools.onPluginOut(() => {
      if (typeof Terminal !== "undefined" && Terminal.cleanup) {
        Terminal.cleanup();
      }
    });

    this.checkInstallStatus();

    if (typeof Terminal !== "undefined" && Terminal._restoreProjects && !Terminal._restored) {
      Terminal._restored = true;
      Terminal._restoreProjects();
    }

    this.navigate(this.currentPage);
  },

  // === Scope 管理方法 ===

  bindTopbarScope() {
    document.getElementById("scopeToggleGlobal")?.addEventListener("click", () => {
      this.setScope("global");
    });
    document.getElementById("scopeToggleProject")?.addEventListener("click", () => {
      if (!this.projectDir) {
        this.selectProject();
      } else {
        this.setScope("project");
      }
    });
    document.getElementById("scopeSelectProject")?.addEventListener("click", () => {
      this.selectProject();
    });
  },

  async selectProject() {
    const result = await Utils.showOpenDialog({
      title: "选择项目目录",
      properties: ["openDirectory"],
    });
    if (result && result[0]) {
      this.projectDir = result[0];
      this.setScope("project");
    }
  },

  setScope(scope) {
    this.scope = scope;
    this.updateTopbarScope();
    // 重新渲染当前页面（如果是 scope 依赖页面）
    this.navigate(this.currentPage);
  },

  setProjectDir(dir) {
    this.projectDir = dir;
    if (dir) {
      this.setScope("project");
    } else {
      this.setScope("global");
    }
  },

  // 获取当前 scope 对应的配置读取参数
  getConfigScope() {
    return this.scope === "project" ? "project" : "user";
  },

  // 获取当前 scope 对应的 MCP scope key
  getMcpScope() {
    return this.scope === "project" ? "project" : "global";
  },

  updateTopbarScope() {
    const scopeGlobal = document.getElementById("scopeToggleGlobal");
    const scopeProject = document.getElementById("scopeToggleProject");
    const projectLabel = document.getElementById("scopeProjectLabel");
    const selectBtn = document.getElementById("scopeSelectProject");

    if (!scopeGlobal || !scopeProject) return;

    if (this.scope === "project" && this.projectDir) {
      scopeGlobal.classList.remove("active");
      scopeProject.classList.add("active");
      if (projectLabel) {
        projectLabel.textContent = Utils.baseName(this.projectDir);
        projectLabel.title = this.projectDir;
        projectLabel.style.display = "";
      }
      if (selectBtn) selectBtn.style.display = "";
    } else {
      scopeGlobal.classList.add("active");
      scopeProject.classList.remove("active");
      if (projectLabel) {
        projectLabel.textContent = "";
        projectLabel.style.display = "none";
      }
      if (selectBtn) selectBtn.style.display = "none";
    }
  },

  handlePluginEnter(code, type, payload) {
    switch (code) {
      case "claude-manager":
        this.navigate("dashboard");
        break;
      case "claude-terminal":
        this.navigate("terminal");
        break;
      case "claude-config":
        this.navigate("config");
        break;
      case "claude-session":
        this.navigate("sessions");
        break;
      case "claude-open-dir":
        if (type === "window") {
          const workDir = payload?.dir || payload?.path || Utils.store.get("defaultWorkDir", "");
          if (workDir) {
            this.currentWorkDir = workDir;
            this.setProjectDir(workDir);
            this.navigate("terminal");
            setTimeout(() => {
              if (typeof Terminal !== "undefined" && Terminal.newSession) {
                Terminal.newSession(workDir);
              }
            }, 300);
          } else {
            this.navigate("terminal");
          }
        }
        break;
      case "claude-open-file":
        if (type === "files" && payload && payload.length > 0) {
          const filePath = payload[0].path;
          const sep = filePath.includes("/") ? "/" : "\\";
          const lastSep = filePath.lastIndexOf(sep);
          const workDir = lastSep > 0 ? filePath.substring(0, lastSep) : "";
          if (workDir) {
            this.currentWorkDir = workDir;
            this.setProjectDir(workDir);
          }
          this.navigate("terminal");
          setTimeout(() => {
            if (typeof Terminal !== "undefined" && Terminal.newSession) {
              Terminal.newSession(workDir, `分析文件: ${filePath}`);
            }
          }, 300);
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
    const statusEl = document.getElementById("topbarStatus");
    const parts = [];

    if (this.installStatus) {
      if (this.installStatus.installed) {
        parts.push(`<span class="status-badge success"><span class="dot"></span>Claude ${this.installStatus.version || ""}</span>`);
      } else {
        parts.push(`<span class="status-badge danger"><span class="dot"></span>未安装</span>`);
      }
    }

    if (this.currentWorkDir) {
      const dirName = Utils.baseName(this.currentWorkDir);
      parts.push(`<span class="status-badge"><span class="dot"></span>${Utils.escapeHtml(dirName)}</span>`);
    }

    statusEl.innerHTML = parts.join("");
    this.updateTopbarScope();
  },

  navigate(page) {
    this.currentPage = page;

    document.querySelectorAll(".nav-item").forEach((item) => {
      item.classList.toggle("active", item.dataset.page === page);
    });

    // 页面标题带 scope 标识
    let title = this.pageTitles[page] || page;
    if (this.scopeAwarePages.includes(page)) {
      title += this.scope === "project" && this.projectDir
        ? ` <span class="scope-tag project">📁 ${Utils.baseName(this.projectDir)}</span>`
        : ` <span class="scope-tag global">🌍 全局</span>`;
    }
    document.getElementById("pageTitle").innerHTML = title;

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

    if (pages[page]) {
      pages[page]();
    }
  },

  setWorkDir(dir) {
    this.currentWorkDir = dir;
    this.updateTopbarStatus();
  },
};

document.addEventListener("DOMContentLoaded", () => {
  App.init();
});
