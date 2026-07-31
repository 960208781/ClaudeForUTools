/**
 * 仪表盘页面
 */

const Dashboard = {
  async render(container) {
    // 检查是否有活动会话
    var hasActive = (typeof Terminal !== "undefined" && Terminal.projects && Terminal.projects.length > 0);

    var activeSessionsHtml = hasActive ? `
      <div class="card mb-3" id="activeSessionsCard">
        <div class="card-header">
          <div class="card-title">🔄 活动会话 (${Terminal.projects.length})</div>
          <button class="btn sm" id="goToChat">进入对话 →</button>
        </div>
        <div id="activeSessionsList"></div>
      </div>` : '';

    container.innerHTML = `
      ${activeSessionsHtml}

      <div class="grid grid-2 mb-3">
        <div class="card" id="installCard">
          <div class="card-header">
            <div class="card-title">🤖 Claude Code 状态</div>
          </div>
          <div id="installInfo">
            <div class="flex items-center gap-3">
              <div class="spinner"></div>
              <span class="text-muted">检测中...</span>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div class="card-title">⚡ 快速操作</div>
          </div>
          <div class="flex flex-wrap gap-2">
            <button class="btn primary" id="quickNewSession">💬 新建对话</button>
            <button class="btn" id="quickResume">▶️ 恢复会话</button>
            <button class="btn" id="quickConfig">⚙️ 配置</button>
            <button class="btn" id="quickModel">🧠 模型</button>
            <button class="btn" id="quickDoctor">🩺 诊断</button>
          </div>
        </div>
      </div>

      <div class="grid grid-2">
        <div class="card">
          <div class="card-header">
            <div class="card-title">💬 最近会话</div>
            <button class="btn ghost sm" id="viewAllSessions">查看全部 →</button>
          </div>
          <div id="recentSessions">
            <div class="text-muted text-sm">加载中...</div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div class="card-title">📊 快捷信息</div>
          </div>
          <div id="quickInfo">
            <div class="text-muted text-sm">加载中...</div>
          </div>
        </div>
      </div>
    `;

    if (hasActive) {
      this.loadActiveSessions();
    }
    this.loadInstallInfo();
    this.loadRecentSessions();
    this.loadQuickInfo();
    this.bindEvents();
  },

  bindEvents() {
    document.getElementById("quickNewSession")?.addEventListener("click", () => {
      App.navigate("terminal");
      setTimeout(() => {
        Terminal.newSession(App.currentWorkDir || Utils.store.get("defaultWorkDir", ""));
      }, 200);
    });

    document.getElementById("quickResume")?.addEventListener("click", () => App.navigate("sessions"));
    document.getElementById("quickConfig")?.addEventListener("click", () => App.navigate("config"));
    document.getElementById("quickModel")?.addEventListener("click", () => App.navigate("model"));
    document.getElementById("quickDoctor")?.addEventListener("click", () => App.navigate("setup"));
    document.getElementById("viewAllSessions")?.addEventListener("click", () => App.navigate("sessions"));
    document.getElementById("goToChat")?.addEventListener("click", () => App.navigate("terminal"));
  },

  loadActiveSessions() {
    const el = document.getElementById("activeSessionsList");
    if (!el) return;

    // 从 Terminal 获取所有活动的项目
    if (typeof Terminal === "undefined" || !Terminal.projects || Terminal.projects.length === 0) {
      el.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🔄</div>
          <div class="empty-text">暂无活动会话</div>
          <div class="text-xs text-muted mt-2">点击"进入对话"开始新的对话</div>
        </div>
      `;
      return;
    }

    const projects = Terminal.projects;
    el.innerHTML = projects.map((p) => {
      const isActive = p.id === Terminal.activeProjectId;
      const lastMsg = p.messages.length > 0 ? p.messages[p.messages.length - 1] : null;
      const lastMsgPreview = lastMsg ? (lastMsg.text || lastMsg.html || "").substring(0, 50) : "无消息";
      const msgCount = p.messages.length;
      const cost = p.totalCost || 0;
      const cny = (cost * 7.2).toFixed(2);
      const statusBadge = p.busy
        ? '<span class="status-badge warning"><span class="dot"></span>思考中</span>'
        : p.procId
          ? '<span class="status-badge success"><span class="dot"></span>就绪</span>'
          : '<span class="status-badge danger"><span class="dot"></span>已断开</span>';

      return `
        <div class="list-item ${isActive ? "active" : ""}" data-project="${p.id}">
          <div class="list-item-icon">${p.busy ? "🔄" : "📁"}</div>
          <div class="list-item-content">
            <div class="list-item-title">${Utils.escapeHtml(p.name)}</div>
            <div class="list-item-subtitle">
              ${msgCount} 条消息 · 💰$${cost.toFixed(4)}/¥${cny}
              ${p.model ? " · 🧠 " + Utils.escapeHtml(p.model) : ""}
            </div>
          </div>
          ${statusBadge}
          <div class="list-item-actions">
            <button class="btn ghost sm" data-switch="${p.id}" title="切换到此会话">→</button>
            ${p.procId ? '<button class="btn ghost sm" data-kill="' + p.id + '" title="终止会话">⏹️</button>' : ""}
          </div>
        </div>
      `;
    }).join("");

    // 绑定切换按钮 — 导航到 terminal 后渲染完成再切换
    el.querySelectorAll("[data-switch]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const pid = btn.dataset.switch;
        App.navigate("terminal");
        // 等待 terminal render 完成后再切换项目
        setTimeout(() => {
          if (Terminal.projects.find((p) => p.id === pid)) {
            // 确保 historySessions 已加载
            var proj = Terminal.projects.find((p) => p.id === pid);
            if (proj && (!proj.historySessions || proj.historySessions.length === 0)) {
              proj.historySessions = Terminal._loadProjectHistory(proj.workDir);
            }
            Terminal.activeProjectId = pid;
            Terminal.switchProject(pid);
            Terminal.renderTabsBar();
            Terminal.renderProjectList();
          }
        }, 400);
      });
    });

    // 绑定终止按钮
    el.querySelectorAll("[data-kill]").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const pid = btn.dataset.kill;
        const project = Terminal.projects.find((p) => p.id === pid);
        if (!project) return;
        if (await Utils.confirm("确定终止会话 \"" + project.name + "\"？")) {
          if (project.procId) Utils.apiSync("killProcess", project.procId);
          project.procId = null;
          project.busy = false;
          this.loadActiveSessions();
          Utils.toast("会话已终止", "success");
        }
      });
    });

    // 点击列表项也切换
    el.querySelectorAll("[data-project]").forEach((item) => {
      item.addEventListener("click", () => {
        const pid = item.dataset.project;
        App.navigate("terminal");
        setTimeout(() => {
          if (Terminal.projects.find((p) => p.id === pid)) {
            Terminal.activeProjectId = pid;
            Terminal.switchProject(pid);
            Terminal.renderTabsBar();
            Terminal.renderProjectList();
          }
        }, 400);
      });
    });
  },

  async loadInstallInfo() {
    const el = document.getElementById("installInfo");
    const status = await Utils.api("checkInstall");

    App.installStatus = status;
    App.updateTopbarStatus();

    if (status.installed) {
      el.innerHTML = `
        <div class="flex items-center gap-3 mb-2">
          <span class="status-badge success"><span class="dot"></span>已安装</span>
          <span class="text-sm font-mono text-secondary">${Utils.escapeHtml(status.version || "")}</span>
        </div>
        <div class="text-xs text-muted font-mono break-all">${Utils.escapeHtml(status.path || "")}</div>
      `;
    } else {
      el.innerHTML = `
        <div class="flex items-center gap-3 mb-2">
          <span class="status-badge danger"><span class="dot"></span>未安装</span>
          <button class="btn sm primary" id="installBtn">立即安装</button>
        </div>
        <div class="text-xs text-muted">点击安装 Claude Code CLI</div>
      `;
      document.getElementById("installBtn")?.addEventListener("click", () => App.navigate("setup"));
    }
  },

  loadRecentSessions() {
    const el = document.getElementById("recentSessions");
    const sessions = Utils.apiSync("listSessions");

    if (!sessions || sessions.length === 0) {
      el.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">💬</div>
          <div class="empty-text">暂无会话历史</div>
        </div>
      `;
      return;
    }

    const recent = sessions.slice(0, 5);
    el.innerHTML = recent.map((s) => `
      <div class="list-item" data-session="${Utils.escapeHtml(s.filePath)}">
        <div class="list-item-icon">💬</div>
        <div class="list-item-content">
          <div class="list-item-title">${Utils.escapeHtml(s.summary || s.id)}</div>
          <div class="list-item-subtitle">${Utils.escapeHtml(s.project)} · ${Utils.formatTime(s.lastModified)} · ${s.messageCount}条消息</div>
        </div>
      </div>
    `).join("");

    el.querySelectorAll(".list-item").forEach((item) => {
      item.addEventListener("click", () => {
        App.navigate("sessions");
      });
    });
  },

  loadQuickInfo() {
    const el = document.getElementById("quickInfo");
    const envVars = Utils.apiSync("getEnvVars");
    const userConfig = Utils.apiSync("readConfig", "user");

    const model = userConfig?.model || envVars?.ANTHROPIC_MODEL || "默认 (Sonnet)";
    const useBedrock = envVars?.CLAUDE_CODE_USE_BEDROCK === "1";
    const useVertex = envVars?.CLAUDE_CODE_USE_VERTEX === "1";

    el.innerHTML = `
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm text-muted">当前模型</span>
        <span class="status-badge accent">${Utils.escapeHtml(model)}</span>
      </div>
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm text-muted">API 提供商</span>
        <span class="status-badge">${useBedrock ? "AWS Bedrock" : useVertex ? "Vertex AI" : "Anthropic"}</span>
      </div>
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm text-muted">配置文件</span>
        <span class="status-badge ${userConfig ? "success" : "warning"}">
          <span class="dot"></span>${userConfig ? "已配置" : "未配置"}
        </span>
      </div>
      <div class="flex items-center justify-between">
        <span class="text-sm text-muted">环境变量</span>
        <span class="status-badge info">${Object.keys(envVars).length} 个</span>
      </div>
    `;
  },
};
