/**
 * 主应用逻辑
 */

const App = {
  currentPage: "dashboard",
  installStatus: null,
  currentWorkDir: null,

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
    sessions: "会话历史",
    gateway: "网关信息",
    monitor: "监控",
    tips: "最佳实践",
    setup: "安装与诊断",
  },

  init() {
    // 应用主题
    Utils.applyTheme();

    // 加载侧边栏展开状态
    const sidebarExpanded = Utils.store.get("sidebarExpanded", false);
    if (sidebarExpanded) document.getElementById("sidebar").classList.add("expanded");

    // 绑定导航事件
    document.querySelectorAll(".nav-item").forEach((item) => {
      item.addEventListener("click", () => {
        const page = item.dataset.page;
        this.navigate(page);
      });
    });

    // 侧边栏展开/收起
    document.getElementById("sidebarToggle").addEventListener("click", () => {
      const sidebar = document.getElementById("sidebar");
      sidebar.classList.toggle("expanded");
      const expanded = sidebar.classList.contains("expanded");
      Utils.store.set("sidebarExpanded", expanded);
      document.getElementById("toggleIcon").textContent = expanded ? "▶" : "◀";
    });

    // uTools 事件
    utools.onPluginEnter(({ code, type, payload }) => {
      this.handlePluginEnter(code, type, payload);
    });

    utools.onPluginOut(() => {
      // 清理资源
      if (typeof Terminal !== "undefined" && Terminal.cleanup) {
        Terminal.cleanup();
      }
    });

    // 初始检测安装状态
    this.checkInstallStatus();

    // 预先恢复 Terminal 项目（确保 dashboard 首次加载时就有活动会话数据）
    if (typeof Terminal !== "undefined" && Terminal._restoreProjects && !Terminal._restored) {
      Terminal._restored = true;
      Terminal._restoreProjects();
    }

    // 初始导航
    this.navigate(this.currentPage);
  },

  /**
   * 处理 uTools 进入事件
   */
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
        // 从窗口匹配进入
        if (type === "window") {
          const workDir = payload?.dir || payload?.path || Utils.store.get("defaultWorkDir", "");
          if (workDir) {
            this.currentWorkDir = workDir;
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
        // 从文件匹配进入
        if (type === "files" && payload && payload.length > 0) {
          const filePath = payload[0].path;
          const sep = filePath.includes("/") ? "/" : "\\";
          const lastSep = filePath.lastIndexOf(sep);
          const workDir = lastSep > 0 ? filePath.substring(0, lastSep) : "";
          if (workDir) this.currentWorkDir = workDir;
          this.navigate("terminal");
          setTimeout(() => {
            if (typeof Terminal !== "undefined" && Terminal.newSession) {
              Terminal.newSession(workDir, `分析文件: ${filePath}`);
            }
          }, 300);
        }
        break;
    }

    // 设置窗口高度
    utools.setExpendHeight(600);
  },

  /**
   * 检测 Claude 安装状态
   */
  async checkInstallStatus() {
    this.installStatus = await Utils.api("checkInstall");
    this.updateTopbarStatus();
  },

  /**
   * 更新顶部状态栏
   */
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

    // 当前工作目录
    if (this.currentWorkDir) {
      const dirName = Utils.baseName(this.currentWorkDir);
      parts.push(`<span class="status-badge"><span class="dot"></span>${Utils.escapeHtml(dirName)}</span>`);
    }

    statusEl.innerHTML = parts.join("");
  },

  /**
   * 页面导航
   */
  navigate(page) {
    this.currentPage = page;

    // 更新导航高亮
    document.querySelectorAll(".nav-item").forEach((item) => {
      item.classList.toggle("active", item.dataset.page === page);
    });

    // 更新标题
    document.getElementById("pageTitle").textContent = this.pageTitles[page] || page;

    // 渲染页面 — 先清空内容，再渲染
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

  /**
   * 设置工作目录
   */
  setWorkDir(dir) {
    this.currentWorkDir = dir;
    this.updateTopbarStatus();
  },
};

// 启动应用
document.addEventListener("DOMContentLoaded", () => {
  App.init();
});
