/**
 * 对话模块 — 多项目并行 Claude 对话
 * 左侧为项目列表(含历史会话)，右侧为当前对话
 */

const Terminal = {
  projects: [],
  activeProjectId: null,
  projectCounter: 0,
  container: null,

  render(container) {
    this.container = container;
    container.innerHTML = `
      <div class="chat-layout">
        <aside class="chat-sidebar" id="chatSidebar">
          <div class="chat-sidebar-header">
            <span class="chat-sidebar-title">项目</span>
            <button class="btn sm primary" id="newProjectBtn" title="添加项目">+ 项目</button>
          </div>
          <div class="chat-sidebar-list" id="projectList"></div>
        </aside>
        <div class="split-divider" id="chatSplitDivider"></div>
        <div class="chat-main" id="chatMain">
          <div class="chat-statusline" id="chatStatusline">就绪</div>
          <div class="chat-tabs-bar" id="chatTabsBar"></div>
          <div class="chat-panes-container" id="chatPanesContainer">
            <div class="chat-messages active-pane" id="termOutput">
              ${this._emptyStateHtml()}
            </div>
          </div>
          <div class="chat-input-area" id="termInputArea">
            <div class="cmd-popup-overlay" id="cmdPopup">
              <div class="cmd-popup-header">
                <span class="cmd-popup-title">快捷命令</span>
                <input class="cmd-popup-search" id="cmdSearch" placeholder="搜索命令..." />
                <button class="cmd-popup-close" id="cmdClose">✕</button>
              </div>
              <div class="cmd-popup-grid" id="cmdGrid">
                ${App.slashCommands.map((c) => `
                  <div class="cmd-item" data-cmd="${c.cmd}" data-desc="${Utils.escapeHtml(c.desc)}">
                    <div class="cmd-item-icon">${c.icon}</div>
                    <div class="cmd-item-name">${c.cmd}</div>
                    <div class="cmd-item-desc">${Utils.escapeHtml(c.desc)}</div>
                  </div>
                `).join("")}
              </div>
            </div>
            <div class="chat-input-wrapper">
              <button class="chat-cmd-toggle" id="cmdToggle" title="快捷命令">⚡</button>
              <textarea class="chat-input" id="termInput" placeholder="输入消息与 Claude 对话... (Enter 发送, Shift+Enter 换行)" rows="1"></textarea>
              <button class="btn primary" id="modelBtn" title="切换模型" style="height:30px;padding:0 10px;font-size:11px;flex-shrink:0">默认</button>
              <button class="btn primary chat-send-btn" id="sendBtn" title="发送" data-mode="send">➤</button>
            </div>
          </div>
        </div>
      </div>
    `;
    this.bindEvents();

    // 从存储恢复项目（如果还没恢复过）
    if (this.projects.length === 0 && !this._restored) {
      this._restored = true;
      this._restoreProjects();
    }

    if (this.projects.length > 0) {
      this.renderProjectList();
      if (this.activeProjectId) {
        this.switchProject(this.activeProjectId);
      }
    } else {
      this.renderProjectList();
    }
  },

  _emptyStateHtml() {
    return `
      <div class="chat-empty">
        <div class="chat-empty-icon">💬</div>
        <div class="chat-empty-title">开始与 Claude 对话</div>
        <div class="chat-empty-desc">点击左侧 "+ 项目" 选择项目目录</div>
      </div>
    `;
  },

  bindEvents() {
    document.getElementById("newProjectBtn").addEventListener("click", () => {
      this.addProject();
    });

    // 模型切换 — 弹出菜单
    document.getElementById("modelBtn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      this._showModelMenu(e);
    });

    // 恢复上次选择的模型
    const savedModel = Utils.store.get("defaultModel", "");
    this._currentModel = savedModel || "";
    this._updateModelBtn();

    // 可拖拽分隔条
    this._initChatSplit();

    const cmdToggle = document.getElementById("cmdToggle");
    const cmdPopup = document.getElementById("cmdPopup");
    const cmdSearch = document.getElementById("cmdSearch");
    const cmdClose = document.getElementById("cmdClose");

    if (cmdToggle) {
      cmdToggle.addEventListener("click", (e) => {
        e.stopPropagation();
        const isShow = cmdPopup.classList.contains("show");
        if (isShow) {
          cmdPopup.classList.remove("show");
          cmdToggle.classList.remove("active");
        } else {
          cmdPopup.classList.add("show");
          cmdToggle.classList.add("active");
          if (cmdSearch) { cmdSearch.value = ""; this._filterCommands(""); setTimeout(() => cmdSearch.focus(), 50); }
        }
      });
    }

    if (cmdClose) {
      cmdClose.addEventListener("click", () => {
        cmdPopup.classList.remove("show");
        cmdToggle?.classList.remove("active");
      });
    }

    if (cmdSearch) {
      cmdSearch.addEventListener("input", () => { this._filterCommands(cmdSearch.value); });
      cmdSearch.addEventListener("click", (e) => e.stopPropagation());
    }

    document.querySelectorAll(".cmd-item").forEach((item) => {
      item.addEventListener("click", () => {
        this.sendCommand(item.dataset.cmd);
        cmdPopup.classList.remove("show");
        cmdToggle?.classList.remove("active");
      });
    });

    const input = document.getElementById("termInput");
    const sendBtn = document.getElementById("sendBtn");

    if (input) {
      input.addEventListener("input", () => {
        input.style.height = "auto";
        input.style.height = Math.min(input.scrollHeight, 120) + "px";
      });
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          const text = input.value.trim();
          if (text) { this.sendCommand(text); input.value = ""; input.style.height = "auto"; }
        }
      });
    }
    if (sendBtn) {
      sendBtn.addEventListener("click", () => {
        // 检查是否在思考中 — 如果是则停止
        const project = this.projects.find((p) => p.id === this.activeProjectId);
        if (project && project.busy) {
          // 停止当前 Claude 进程
          if (project.procId) {
            // 发送中断信号 — 通过终止当前 Claude 进程
            Utils.apiSync("killProcess", project.procId);
            project.busy = false;
            this._hideTyping(project.id);
            this._updateMode("ready");
            this._updateSendBtn("send");
            this._addSystemMessage(project.id, "⏹️ 已停止");
          }
          return;
        }
        const text = input.value.trim();
        if (text) { this.sendCommand(text); input.value = ""; input.style.height = "auto"; }
      });
    }

    // 粘贴图片支持 — Ctrl+V / Cmd+V 粘贴剪贴板图片
    document.addEventListener("paste", (e) => {
      if (this.currentPage !== "terminal" && App.currentPage !== "terminal") return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const blob = item.getAsFile();
          if (!blob) return;
          const reader = new FileReader();
          reader.onload = () => {
            const base64 = reader.result;
            // 保存图片到临时文件
            const tmpPath = Utils.apiSync("pathJoin", Utils.apiSync("getHomeDir"), ".claude", "tmp_paste_" + Date.now() + ".png");
            const base64Data = base64.split(",")[1];
            Utils.apiSync("writeFile", tmpPath, "");
            // 显示图片消息
            this._addUserMessage(this.activeProjectId, `[图片已保存: ${tmpPath}]`);
            // 发送路径给 Claude
            if (this.activeProjectId) {
              const project = this.projects.find((p) => p.id === this.activeProjectId);
              if (project && project.procId && !project.busy) {
                Utils.apiSync("sendInput", project.procId, `请分析这个图片: ${tmpPath}`);
              }
            }
            Utils.toast("图片已粘贴", "success");
          };
          reader.readAsDataURL(blob);
        }
      }
    });
  },

  _initChatSplit() {
    var divider = document.getElementById("chatSplitDivider");
    if (!divider) return;
    var sidebar = document.getElementById("chatSidebar");
    var dragging = false;
    var startX = 0;
    var startWidth = 0;

    divider.addEventListener("mousedown", function(e) {
      dragging = true;
      startX = e.clientX;
      startWidth = sidebar.offsetWidth;
      document.body.style.cursor = "col-resize";
      e.preventDefault();
    });

    document.addEventListener("mousemove", function(e) {
      if (!dragging) return;
      var dx = e.clientX - startX;
      var newWidth = startWidth + dx;
      if (newWidth > 120 && newWidth < 500) {
        sidebar.style.width = newWidth + "px";
        sidebar.style.flex = "none";
      }
    });

    document.addEventListener("mouseup", function() {
      if (dragging) {
        dragging = false;
        document.body.style.cursor = "";
      }
    });
  },

  _filterCommands(query) {
    const q = query.toLowerCase().trim();
    document.querySelectorAll(".cmd-item").forEach((item) => {
      const cmd = item.dataset.cmd.toLowerCase();
      const desc = (item.dataset.desc || "").toLowerCase();
      const match = !q || cmd.includes(q) || desc.includes(q);
      item.style.display = match ? "" : "none";
    });
  },

  async addProject(workDir) {
    if (!workDir) {
      const result = await Utils.showOpenDialog({
        title: "选择项目目录",
        properties: ["openDirectory"],
      });
      if (!result || !result[0]) return;
      workDir = result[0];
    }

    const existing = this.projects.find((p) => p.workDir === workDir);
    if (existing) {
      this.switchProject(existing.id);
      return;
    }

    const result = Utils.apiSync("startClaudeSession", workDir, {});
    if (result.error) {
      Utils.toast(result.error, "error");
      return;
    }

    const projectId = `proj_${++this.projectCounter}`;
    const projectName = Utils.baseName(workDir) || "项目";
    const project = {
      id: projectId,
      workDir,
      name: projectName,
      procId: result.procId,
      messages: [],
      busy: false,
      sessionId: null,
      historySessions: [],
    };

    // 加载该项目的历史会话
    project.historySessions = this._loadProjectHistory(workDir);

    this.projects.push(project);
    this.activeProjectId = projectId;
    App.setWorkDir(workDir);
    this.renderProjectList();

    Utils.apiSync("onOutput", result.procId, (data) => {
      this.handleOutput(projectId, data);
    });

    const output = document.getElementById("termOutput");
    if (output) output.innerHTML = this._emptyStateHtml();

    const input = document.getElementById("termInput");
    if (input) input.focus();
  },

  _loadProjectHistory(workDir) {
    const allSessions = Utils.apiSync("listSessions") || [];
    const encodedDir = workDir.replace(/[^a-zA-Z0-9]/g, "-");
    const sessions = allSessions.filter((s) => s.projectDir === encodedDir || s.project === workDir);
    // 应用用户重命名的会话标题
    const renamed = Utils.store.get("renamedSessions", {});
    for (const s of sessions) {
      if (renamed[s.id]) {
        s.summary = renamed[s.id];
      }
    }
    return sessions;
  },

  newSession(workDir, initialPrompt) {
    this.addProject(workDir).then(() => {
      if (initialPrompt) {
        setTimeout(() => this.sendCommand(initialPrompt), 300);
      }
    });
  },

  handleOutput(projectId, data) {
    const project = this.projects.find((p) => p.id === projectId);
    if (!project) return;

    switch (data.stream) {
      case "init": {
        const info = data.data;
        if (info.sessionId) project.sessionId = info.sessionId;
        project.model = info.model;
        project.version = info.version;
        project.slashCommands = info.slashCommands;
        project.agents = info.agents;
        project.skills = info.skills;
        this._addSystemMessage(projectId, `✅ ${info.model || "Claude"} 已就绪 · v${info.version || "?"}`);
        this._updateStatusBar(projectId);
        break;
      }
      case "assistant": this._addAssistantMessage(projectId, data.data); break;
      case "tool_use": this._addToolUseMessage(projectId, data.data); break;
      case "tool_result": this._addToolResultMessage(projectId, data.data); break;
      case "thinking": this._addThinkingMessage(projectId, data.data); break;
      case "usage": this._updateUsage(projectId, data.data); break;
      case "model_info": project.model = data.data; this._updateStatusBar(projectId); break;
      case "assistant_stop": this._onAssistantComplete(projectId, data.data); break;
      case "cost": if (data.data?.cost !== undefined) this._addCostInfo(projectId, data.data); break;
      case "result": this._addResultMessage(projectId, data.data); this._onAssistantComplete(projectId, null); break;
      case "stop_reason": this._addSystemMessage(projectId, `🏁 ${data.data}`); break;
      case "status": {
        if (data.data === "thinking") { project.busy = true; this._showTyping(projectId); this._updateMode("thinking"); }
        else if (data.data === "idle") { project.busy = false; this._hideTyping(projectId); this._updateMode("ready"); }
        break;
      }
      case "stderr": {
        if (data.data && data.data.includes("Warning: no stdin")) break;
        if (data.data?.trim()) this._addSystemMessage(projectId, data.data.trim());
        break;
      }
      case "error": this._addSystemMessage(projectId, `❌ ${data.data}`); project.busy = false; this._hideTyping(projectId); this._updateMode("ready"); break;
      case "close": project.procId = null; project.busy = false; this._hideTyping(projectId); break;
    }
  },

  // === 项目侧边栏 ===
  renderProjectList() {
    const listEl = document.getElementById("projectList");
    if (!listEl) return;

    if (this.projects.length === 0) {
      listEl.innerHTML = `<div class="chat-sidebar-empty">暂无项目<br>点击上方添加</div>`;
      return;
    }

    let html = "";
    for (const p of this.projects) {
      const isActive = p.id === this.activeProjectId;
      html += `
        <div class="proj-group ${isActive ? "expanded" : ""}" data-proj="${p.id}">
          <div class="proj-group-header" data-proj-toggle="${p.id}">
            <span class="proj-group-icon">📁</span>
            <span class="proj-group-name">${Utils.escapeHtml(p.name)}</span>
            ${p.busy ? '<span class="proj-group-dot"></span>' : ""}
            <span class="proj-group-close" data-close="${p.id}">×</span>
          </div>
          <div class="proj-group-body">
            <div class="proj-session-new" data-new-session="${p.id}">+ 新对话</div>
            ${p.historySessions.map((s) => {
              const isCurrentSession = p.sessionId === s.id;
              return `
              <div class="proj-session-item ${isCurrentSession ? "current-session" : ""}" data-resume-id="${Utils.escapeHtml(s.id)}" data-resume-proj="${p.id}" title="${Utils.escapeHtml(s.summary || "")}">
                <span class="proj-session-icon">${isCurrentSession ? "▶️" : "💬"}</span>
                <span class="proj-session-title">${Utils.escapeHtml((s.summary || s.id).substring(0, 30))}</span>
                <span class="proj-session-time">${Utils.formatTime(s.lastModified)}</span>
              </div>
              `;
            }).join("")}
          </div>
        </div>
      `;
    }
    listEl.innerHTML = html;

    // 绑定事件
    listEl.querySelectorAll(".proj-group-header").forEach((el) => {
      el.addEventListener("click", (e) => {
        if (e.target.dataset.close) {
          this.closeProject(e.target.dataset.close);
        } else {
          this.switchProject(el.dataset.projToggle);
        }
      });
    });

    listEl.querySelectorAll("[data-new-session]").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        this._newChatForProject(el.dataset.newSession);
      });
    });

    listEl.querySelectorAll("[data-resume-id]").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        this._resumeHistorySession(el.dataset.resumeProj, el.dataset.resumeId);
      });
      // 右键菜单
      el.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this._showSessionContextMenu(e, el.dataset.resumeProj, el.dataset.resumeId, el);
      });
    });
  },

  _showSessionContextMenu(e, projectId, sessionId, itemEl) {
    // 移除已有菜单
    const existing = document.querySelector(".ctx-menu");
    if (existing) existing.remove();

    // 找到会话信息
    const project = this.projects.find((p) => p.id === projectId);
    if (!project) return;
    const session = project.historySessions.find((s) => s.id === sessionId);
    if (!session) return;

    const menu = document.createElement("div");
    menu.className = "ctx-menu";
    menu.style.left = e.clientX + "px";
    menu.style.top = e.clientY + "px";
    const self = this;
    menu.innerHTML =
      '<div class="ctx-menu-item" data-act="rename">✏️ 重命名</div>' +
      '<div class="ctx-menu-item" data-act="locate">📂 定位文件</div>' +
      '<div class="ctx-menu-divider"></div>' +
      '<div class="ctx-menu-item danger" data-act="delete">🗑️ 删除会话</div>';

    document.body.appendChild(menu);

    menu.querySelectorAll(".ctx-menu-item").forEach((mi) => {
      mi.addEventListener("click", () => {
        const act = mi.dataset.act;
        menu.remove();
        if (act === "rename") {
          self._renameSession(projectId, sessionId, itemEl);
        } else if (act === "locate") {
          utools.shellShowItemInFolder(session.filePath);
        } else if (act === "delete") {
          Utils.confirm("确定删除此会话？此操作不可恢复。").then((ok) => {
            if (ok) self._deleteSessionFromSidebar(projectId, sessionId);
          });
        }
      });
    });

    setTimeout(() => {
      document.addEventListener("click", function close() {
        menu.remove();
        document.removeEventListener("click", close);
      });
    }, 0);
  },

  _renameSession(projectId, sessionId, itemEl) {
    const project = this.projects.find((p) => p.id === projectId);
    if (!project) return;
    const session = project.historySessions.find((s) => s.id === sessionId);
    if (!session) return;

    // 内联编辑
    const titleEl = itemEl.querySelector(".proj-session-title");
    if (!titleEl) return;
    const oldTitle = session.summary || session.id.substring(0, 12);
    const input = document.createElement("input");
    input.type = "text";
    input.value = oldTitle;
    input.className = "rename-input";
    input.style.cssText = "width:100%;font-size:10px;background:var(--bg-input);border:1px solid var(--accent);border-radius:3px;color:var(--text-primary);padding:2px 4px;";
    titleEl.replaceWith(input);
    input.focus();
    input.select();

    const commit = () => {
      const newTitle = input.value.trim() || oldTitle;
      session.summary = newTitle;
      const span = document.createElement("span");
      span.className = "proj-session-title";
      span.textContent = newTitle.substring(0, 30);
      input.replaceWith(span);
      // 更新 tooltip
      itemEl.title = newTitle;
      // 持久化到 dbStorage
      const renamed = Utils.store.get("renamedSessions", {});
      renamed[sessionId] = newTitle;
      Utils.store.set("renamedSessions", renamed);
      Utils.toast("已重命名", "success");
    };

    input.addEventListener("blur", commit);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); input.blur(); }
      if (e.key === "Escape") { input.value = oldTitle; input.blur(); }
    });
  },

  _deleteSessionFromSidebar(projectId, sessionId) {
    const project = this.projects.find((p) => p.id === projectId);
    if (!project) return;
    const session = project.historySessions.find((s) => s.id === sessionId);
    if (!session) return;

    var isWin = Utils.apiSync("platform") === "win32";
    var delCmd = isWin ? 'del /q "' + session.filePath + '"' : 'rm "' + session.filePath + '"';
    Utils.apiSync("execCommand", delCmd, (res) => {
      if (res.error) {
        Utils.toast("删除失败", "error");
      } else {
        // 从列表中移除
        project.historySessions = project.historySessions.filter((s) => s.id !== sessionId);
        this.renderProjectList();
        Utils.toast("会话已删除", "success");
      }
    });
  },

  _newChatForProject(projectId) {
    const project = this.projects.find((p) => p.id === projectId);
    if (!project) return;

    // 如果当前进程忙，先终止
    if (project.procId) {
      Utils.apiSync("killProcess", project.procId);
    }

    // 启动新会话
    const result = Utils.apiSync("startClaudeSession", project.workDir, {});
    if (result.error) {
      Utils.toast(result.error, "error");
      return;
    }

    project.procId = result.procId;
    project.messages = [];
    project.busy = false;
    project.sessionId = null;
    this.activeProjectId = projectId;

    Utils.apiSync("onOutput", result.procId, (data) => {
      this.handleOutput(projectId, data);
    });

    const output = document.getElementById("termOutput");
    if (output) output.innerHTML = this._emptyStateHtml();

    const input = document.getElementById("termInput");
    if (input) input.focus();

    this.renderProjectList();
    Utils.toast("已开始新对话", "success");
  },

  _resumeHistorySession(projectId, sessionId) {
    const project = this.projects.find((p) => p.id === projectId);
    if (!project) return;

    // 找到历史会话信息
    const histSession = project.historySessions.find((s) => s.id === sessionId);

    // 终止旧进程
    if (project.procId) {
      Utils.apiSync("killProcess", project.procId);
    }

    // 启动 Claude 会话（带 --resume）
    const result = Utils.apiSync("startClaudeSession", project.workDir, { resume: sessionId });
    if (result.error) {
      Utils.toast(result.error, "error");
      return;
    }

    project.procId = result.procId;
    project.messages = [];
    project.busy = false;
    project.sessionId = sessionId;
    this.activeProjectId = projectId;

    // 注册输出回调
    Utils.apiSync("onOutput", result.procId, (data) => {
      this.handleOutput(projectId, data);
    });

    // 加载历史会话消息到聊天界面
    const output = document.getElementById("termOutput");
    if (output) {
      output.innerHTML = "";
      // 从 JSONL 文件加载历史消息
      if (histSession?.filePath) {
        const history = Utils.apiSync("getSessionHistory", histSession.filePath);
        if (history && history.length > 0) {
          for (const msg of history) {
            if (msg.role === "user") {
              project.messages.push({ role: "user", text: msg.text });
              output.insertAdjacentHTML("beforeend",
                `<div class="chat-msg chat-msg-user"><div class="chat-msg-avatar">👤</div><div class="chat-msg-bubble chat-msg-bubble-user"><div class="chat-msg-text md-content">${Utils.renderMarkdown(msg.text)}</div></div></div>`);
            } else if (msg.role === "assistant") {
              project.messages.push({ role: "assistant", text: msg.text, complete: true });
              output.insertAdjacentHTML("beforeend",
                `<div class="chat-msg chat-msg-assistant"><div class="chat-msg-avatar">🤖</div><div class="chat-msg-bubble chat-msg-bubble-assistant"><div class="chat-msg-text md-content">${Utils.renderMarkdown(msg.text)}</div></div></div>`);
            } else if (msg.role === "system") {
              project.messages.push({ role: "system", text: msg.text });
              output.insertAdjacentHTML("beforeend", `<div class="chat-msg-system">${Utils.escapeHtml(msg.text)}</div>`);
            }
          }
          output.scrollTop = output.scrollHeight;
        }
      }
      this._addSystemMessage(projectId, `📂 已恢复会话，继续输入消息对话`);
    }

    const input = document.getElementById("termInput");
    if (input) input.focus();

    this.renderProjectList();
    this.renderTabsBar();
  },

  // === 多标签栏 ===
  renderTabsBar() {
    const bar = document.getElementById("chatTabsBar");
    if (!bar) return;

    if (this.projects.length <= 1) {
      bar.style.display = "none";
      return;
    }

    bar.style.display = "flex";
    bar.innerHTML = this.projects.map((p) => {
      const isActive = p.id === this.activeProjectId;
      const statusIcon = p.busy ? "🔄" : p.procId ? "🟢" : "🔴";
      return `
        <div class="chat-tab ${isActive ? "active" : ""}" data-tab-proj="${p.id}">
          <span class="chat-tab-status">${statusIcon}</span>
          <span class="chat-tab-name">${Utils.escapeHtml(p.name)}</span>
          <span class="chat-tab-msgs">${p.messages.length}</span>
          <span class="chat-tab-close" data-close-tab="${p.id}">×</span>
        </div>
      `;
    }).join("");

    bar.querySelectorAll("[data-tab-proj]").forEach((el) => {
      el.addEventListener("click", (e) => {
        if (e.target.dataset.closeTab) {
          this.closeProject(e.target.dataset.closeTab);
        } else {
          this.switchProject(el.dataset.tabProj);
        }
      });
    });
  },

  switchProject(projectId) {
    this.activeProjectId = projectId;
    const project = this.projects.find((p) => p.id === projectId);
    if (!project) return;

    App.setWorkDir(project.workDir);

    // 确保 historySessions 已加载（首次进入对话页时可能未加载）
    if (!project.historySessions || project.historySessions.length === 0) {
      project.historySessions = this._loadProjectHistory(project.workDir);
    }

    const output = document.getElementById("termOutput");
    if (!output) return;
    if (project.messages.length === 0) {
      output.innerHTML = this._emptyStateHtml();
    } else {
      output.innerHTML = "";
      for (const msg of project.messages) {
        if (msg.role === "user") {
          output.insertAdjacentHTML("beforeend",
            `<div class="chat-msg chat-msg-user"><div class="chat-msg-avatar">👤</div><div class="chat-msg-bubble chat-msg-bubble-user"><div class="chat-msg-text">${Utils.escapeHtml(msg.text)}</div></div></div>`);
        } else if (msg.role === "assistant") {
          output.insertAdjacentHTML("beforeend",
            `<div class="chat-msg chat-msg-assistant"><div class="chat-msg-avatar">🤖</div><div class="chat-msg-bubble chat-msg-bubble-assistant"><div class="chat-msg-text">${Utils.escapeHtml(msg.text)}</div></div></div>`);
        } else if (msg.role === "system") {
          output.insertAdjacentHTML("beforeend", `<div class="chat-msg-system">${Utils.escapeHtml(msg.text)}</div>`);
        } else if (msg.role === "meta") {
          output.insertAdjacentHTML("beforeend", `<div class="chat-msg-meta">${msg.html}</div>`);
        }
      }
      output.scrollTop = output.scrollHeight;
    }
    this.renderProjectList();
    this.renderTabsBar();
    const input = document.getElementById("termInput");
    if (input) input.focus();
  },

  closeProject(projectId) {
    const project = this.projects.find((p) => p.id === projectId);
    if (project?.procId) Utils.apiSync("killProcess", project.procId);
    this.projects = this.projects.filter((p) => p.id !== projectId);

    if (this.activeProjectId === projectId) {
      if (this.projects.length > 0) {
        this.switchProject(this.projects[0].id);
      } else {
        this.activeProjectId = null;
        const output = document.getElementById("termOutput");
        if (output) output.innerHTML = this._emptyStateHtml();
      }
    }
    this.renderProjectList();
    this.renderTabsBar();
  },

  // === 消息渲染 ===
  _addUserMessage(projectId, text) {
    const p = this.projects.find((p) => p.id === projectId);
    if (!p) return;
    p.messages.push({ role: "user", text });
    if (projectId !== this.activeProjectId) return;
    const output = document.getElementById("termOutput");
    if (!output) return;
    if (output.querySelector(".chat-empty")) output.innerHTML = "";
    output.insertAdjacentHTML("beforeend",
      `<div class="chat-msg chat-msg-user"><div class="chat-msg-avatar">👤</div><div class="chat-msg-bubble chat-msg-bubble-user"><div class="chat-msg-text md-content">${Utils.renderMarkdown(text)}</div></div></div>`);
    output.scrollTop = output.scrollHeight;
  },

  _addAssistantMessage(projectId, text) {
    const p = this.projects.find((p) => p.id === projectId);
    if (!p) return;
    const last = p.messages[p.messages.length - 1];
    if (last && last.role === "assistant" && !last.complete) { last.text += text; }
    else { p.messages.push({ role: "assistant", text, complete: false }); }
    if (projectId !== this.activeProjectId) return;
    const output = document.getElementById("termOutput");
    if (!output) return;
    const typing = output.querySelector(".chat-typing");
    if (typing) typing.remove();
    let lastEl = output.lastElementChild;
    if (lastEl?.classList.contains("chat-msg-assistant")) {
      const textEl = lastEl.querySelector(".chat-msg-text");
      if (textEl) { textEl.innerHTML = Utils.renderMarkdown(last.text); output.scrollTop = output.scrollHeight; return; }
    }
    output.insertAdjacentHTML("beforeend",
      `<div class="chat-msg chat-msg-assistant"><div class="chat-msg-avatar">🤖</div><div class="chat-msg-bubble chat-msg-bubble-assistant"><div class="chat-msg-text md-content">${Utils.renderMarkdown(text)}</div></div></div>`);
    output.scrollTop = output.scrollHeight;
  },

  _addSystemMessage(projectId, text) {
    const p = this.projects.find((p) => p.id === projectId);
    if (!p) return;
    p.messages.push({ role: "system", text });
    if (projectId !== this.activeProjectId) return;
    const output = document.getElementById("termOutput");
    if (!output) return;
    if (output.querySelector(".chat-empty")) output.innerHTML = "";
    output.insertAdjacentHTML("beforeend", `<div class="chat-msg-system">${Utils.escapeHtml(text)}</div>`);
    output.scrollTop = output.scrollHeight;
  },

  _addCostInfo(projectId, data) {
    const p = this.projects.find((p) => p.id === projectId);
    if (!p) return;
    const cost = data.cost || 0;
    const cny = (cost * 7.2).toFixed(2);
    const duration = data.duration ? Utils.formatDuration(data.duration) : "—";
    const turns = data.turns || 0;
    const usage = data.usage || {};
    const inputToks = (usage.input_tokens || 0).toLocaleString();
    const outputToks = (usage.output_tokens || 0).toLocaleString();
    const cacheRead = (usage.cache_read_input_tokens || 0).toLocaleString();
    const html = `💰 $${cost.toFixed(4)} / ¥${cny} · ⏱ ${duration} · 🔄 ${turns}轮 · 📊 输入${inputToks} 输出${outputToks} 缓存${cacheRead}`;
    p.messages.push({ role: "meta", html });
    p.totalCost = (p.totalCost || 0) + cost;
    this._updateStatusBar(projectId);
    if (projectId !== this.activeProjectId) return;
    const output = document.getElementById("termOutput");
    if (!output) return;
    output.insertAdjacentHTML("beforeend", `<div class="chat-msg-meta">${html}</div>`);
    output.scrollTop = output.scrollHeight;
  },

  // Assistant 回复完成时调用 — 检测交互式提问并渲染选择框
  _onAssistantComplete(projectId, stopReason) {
    const p = this.projects.find((p) => p.id === projectId);
    if (!p) return;

    // 标记最后一条 assistant 消息为完成
    const lastMsg = p.messages[p.messages.length - 1];
    if (lastMsg && lastMsg.role === "assistant") {
      lastMsg.complete = true;
    }

    // 用完整的 assistant 文本检测提问
    const fullText = lastMsg ? lastMsg.text : "";
    this._renderQuestionCard(projectId, fullText);

    if (stopReason) {
      this._addSystemMessage(projectId, "⏹️ " + stopReason);
    }
  },

  // 渲染交互式选择卡片（支持方向键导航）
  _renderQuestionCard(projectId, text) {
    if (!text) return;
    const p = this.projects.find((p) => p.id === projectId);
    if (!p) return;
    if (projectId !== this.activeProjectId) return;
    const output = document.getElementById("termOutput");
    if (!output) return;

    // 先移除已有的选择卡片（防止重复）
    output.querySelectorAll(".chat-msg-question").forEach(el => el.remove());

    var lines = text.split("\n");
    var optionLines = [];
    var questionText = "";
    var inOptions = false;

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      var match = line.match(/^(\d+)[.)]\s+(.+)/);
      var matchAlpha = line.match(/^([A-D])[.)]\s+(.+)/);
      var matchParen = line.match(/^\((\d+)\)\s+(.+)/);

      if (match || matchAlpha || matchParen) {
        var num = match ? match[1] : (matchAlpha ? matchAlpha[1] : matchParen[1]);
        var content = match ? match[2] : (matchAlpha ? matchAlpha[2] : matchParen[2]);
        inOptions = true;
        optionLines.push({ num: num, content: content });
      } else if (inOptions) {
        break;
      } else {
        questionText += line + " ";
      }
    }

    if (optionLines.length < 2) return;

    var cleanQuestion = questionText.trim();
    if (cleanQuestion.length > 200) cleanQuestion = cleanQuestion.substring(0, 200) + "...";

    var cardHtml = '<div class="ask-user-card" id="askUserCard">';
    cardHtml += '<div class="ask-user-title">🤖 Claude 需要你的选择</div>';
    if (cleanQuestion) {
      cardHtml += '<div class="ask-user-question"><div class="ask-user-q-header">' + Utils.escapeHtml(cleanQuestion) + '</div></div>';
    }
    cardHtml += '<div class="ask-user-options" id="askUserOptions">';
    for (var j = 0; j < optionLines.length; j++) {
      var opt = optionLines[j];
      cardHtml += '<div class="ask-user-option" data-idx="' + j + '" data-reply="' + Utils.escapeHtml(opt.num) + '">';
      cardHtml += '<span class="ask-user-radio">○</span> ';
      cardHtml += '<span class="ask-user-label"><strong>' + Utils.escapeHtml(opt.num) + '.</strong> ' + Utils.escapeHtml(opt.content) + '</span>';
      cardHtml += '</div>';
    }
    cardHtml += '</div>';
    cardHtml += '<div class="ask-user-hint">⬆⬇ 方向键选择 · Enter 确认 · 点击也可选</div>';
    cardHtml += '</div>';

    output.insertAdjacentHTML("beforeend",
      '<div class="chat-msg chat-msg-question"><div class="chat-msg-avatar">❓</div><div class="chat-msg-bubble chat-msg-bubble-assistant"><div class="chat-msg-text">' + cardHtml + '</div></div></div>');
    output.scrollTop = output.scrollHeight;

    // 方向键导航
    var selectedIdx = -1;
    var options = output.querySelectorAll("#askUserOptions .ask-user-option");
    if (options.length === 0) return;

    var self = this;
    var input = document.getElementById("termInput");

    function highlight(idx) {
      options.forEach(function(o) {
        o.querySelector(".ask-user-radio").textContent = "○";
        o.style.background = "";
        o.classList.remove("selected");
      });
      if (idx >= 0 && idx < options.length) {
        var el = options[idx];
        el.querySelector(".ask-user-radio").textContent = "●";
        el.style.background = "var(--accent-bg)";
        el.classList.add("selected");
        el.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }

    function confirm() {
      if (selectedIdx < 0) return;
      var reply = options[selectedIdx].dataset.reply;
      if (reply) {
        // 移除卡片
        var card = output.querySelector(".chat-msg-question");
        if (card) card.remove();
        // 发送回复
        self._doSend(reply);
      }
    }

    // 默认高亮第一个
    selectedIdx = 0;
    highlight(0);

    // 点击选择
    options.forEach(function(el, idx) {
      el.addEventListener("click", function() {
        selectedIdx = idx;
        highlight(idx);
        confirm();
      });
    });

    // 键盘导航 — 拦截方向键和 Enter
    self._questionKeyHandler = function(e) {
      if (!output.querySelector("#askUserCard")) {
        // 卡片已不在，移除监听
        document.removeEventListener("keydown", self._questionKeyHandler);
        self._questionKeyHandler = null;
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        e.stopPropagation();
        selectedIdx = Math.min(selectedIdx + 1, options.length - 1);
        highlight(selectedIdx);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        e.stopPropagation();
        selectedIdx = Math.max(selectedIdx - 1, 0);
        highlight(selectedIdx);
      } else if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        confirm();
        document.removeEventListener("keydown", self._questionKeyHandler);
        self._questionKeyHandler = null;
      } else if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        highlight(-1);
        selectedIdx = -1;
      }
    };

    // 使用 capture 阶段拦截，确保在输入框的 keydown 之前处理
    document.addEventListener("keydown", self._questionKeyHandler, true);
  },

  _addToolUseMessage(projectId, data) {
    const p = this.projects.find((p) => p.id === projectId);
    if (!p) return;
    const toolName = data.name || "?";
    // 不截断 — 显示完整的工具输入
    const inputJson = data.input ? JSON.stringify(data.input, null, 2) : "";
    p.messages.push({ role: "tool_use", name: toolName, input: inputJson });
    if (projectId !== this.activeProjectId) return;
    const output = document.getElementById("termOutput");
    if (!output) return;

    // 特殊处理 AskUserQuestion — 渲染为交互式问答卡片
    if (toolName === "AskUserQuestion" || toolName === "ask_user") {
      var questions = [];
      try { questions = data.input?.questions || data.input || []; } catch(e) {}
      var qHtml = '<div class="ask-user-card"><div class="ask-user-title">❓ Claude 需要你的输入</div>';
      if (Array.isArray(questions)) {
        questions.forEach(function(q, idx) {
          qHtml += '<div class="ask-user-question"><div class="ask-user-q-header">' + Utils.escapeHtml(q.question || q.header || "问题 " + (idx+1)) + '</div>';
          if (q.options) {
            q.options.forEach(function(opt) {
              qHtml += '<div class="ask-user-option"><span class="ask-user-radio">○</span> <span class="ask-user-label">' + Utils.escapeHtml(opt.label || opt.description || "") + '</span>';
              if (opt.description) qHtml += ' <span class="ask-user-desc">' + Utils.escapeHtml(opt.description) + '</span>';
              qHtml += '</div>';
            });
          }
          if (q.placeholder) qHtml += '<div class="ask-user-placeholder">💡 ' + Utils.escapeHtml(q.placeholder) + '</div>';
          qHtml += '</div>';
        });
      } else if (typeof questions === "object") {
        qHtml += '<pre class="md-code-block"><code>' + Utils.escapeHtml(inputJson) + '</code></pre>';
      }
      qHtml += '</div>';
      output.insertAdjacentHTML("beforeend",
        '<div class="chat-msg chat-msg-tool"><div class="chat-msg-avatar">❓</div><div class="chat-msg-bubble chat-msg-bubble-assistant"><div class="chat-msg-text">' + qHtml + '</div></div></div>');
    } else {
      // 普通工具调用 — 完整显示输入
      output.insertAdjacentHTML("beforeend",
        '<div class="chat-msg chat-msg-tool"><div class="chat-msg-avatar">🔧</div><div class="chat-msg-bubble chat-msg-bubble-assistant"><div class="chat-msg-text"><strong>工具调用: ' + Utils.escapeHtml(toolName) + '</strong>' + (inputJson ? '<details><summary>输入参数</summary><pre class="md-code-block"><code>' + Utils.escapeHtml(inputJson) + '</code></pre></details>' : '') + '</div></div></div>');
    }
    output.scrollTop = output.scrollHeight;
  },

  _addResultMessage(projectId, result) {
    const p = this.projects.find((p) => p.id === projectId);
    if (!p) return;
    p.messages.push({ role: "result", text: result });
    if (projectId !== this.activeProjectId) return;
    const output = document.getElementById("termOutput");
    if (!output) return;
    output.insertAdjacentHTML("beforeend",
      `<div class="chat-msg chat-msg-result"><div class="chat-msg-avatar">✅</div><div class="chat-msg-bubble chat-msg-bubble-assistant"><div class="chat-msg-text md-content">${Utils.renderMarkdown(result)}</div></div></div>`);
    output.scrollTop = output.scrollHeight;
  },

  _addToolResultMessage(projectId, data) {
    const p = this.projects.find((p) => p.id === projectId);
    if (!p) return;
    const content = data.content || "";
    p.messages.push({ role: "tool_result", text: content });
    if (projectId !== this.activeProjectId) return;
    const output = document.getElementById("termOutput");
    if (!output) return;
    // 不截断 — 完整显示工具结果，用可折叠的 details 包裹
    output.insertAdjacentHTML("beforeend",
      '<div class="chat-msg chat-msg-tool-result"><div class="chat-msg-avatar">📋</div><div class="chat-msg-bubble chat-msg-bubble-assistant"><div class="chat-msg-text"><details><summary>工具结果</summary><pre class="md-code-block"><code>' + Utils.escapeHtml(content) + (content.length > 2000 ? '\n... (' + content.length + ' chars)' : '') + '</code></pre></details></div></div></div>');
    output.scrollTop = output.scrollHeight;
  },

  _addThinkingMessage(projectId, text) {
    const p = this.projects.find((p) => p.id === projectId);
    if (!p) return;
    p.messages.push({ role: "thinking", text: text });
    if (projectId !== this.activeProjectId) return;
    const output = document.getElementById("termOutput");
    if (!output) return;
    const preview = text.substring(0, 200);
    output.insertAdjacentHTML("beforeend",
      `<div class="chat-msg chat-msg-thinking"><div class="chat-msg-avatar">💭</div><div class="chat-msg-bubble chat-msg-bubble-assistant"><div class="chat-msg-text"><details><summary>思考过程</summary><div class="md-content">${Utils.renderMarkdown(preview)}${text.length > 200 ? '...' : ''}</div></details></div></div></div>`);
    output.scrollTop = output.scrollHeight;
  },

  _updateUsage(projectId, usage) {
    const p = this.projects.find((p) => p.id === projectId);
    if (!p) return;
    p.lastUsage = usage;
    this._updateStatusBar(projectId);
  },

  _updateStatusBar(projectId) {
    const p = this.projects.find((p) => p.id === projectId);
    if (!p || projectId !== this.activeProjectId) return;
    const modeEl = document.getElementById("termMode");
    if (!modeEl) return;
    let parts = [];
    if (p.model) parts.push("🧠 " + p.model);
    if (p.lastUsage) {
      const totalIn = (p.lastUsage.input_tokens || 0) + (p.lastUsage.cache_read_input_tokens || 0);
      const totalOut = p.lastUsage.output_tokens || 0;
      parts.push("📊 " + (totalIn/1000).toFixed(0) + "K↑" + (totalOut/1000).toFixed(0) + "K↓");
    }
    if (p.totalCost && p.totalCost > 0) parts.push("💰 $" + p.totalCost.toFixed(4));
    modeEl.textContent = parts.join(" · ") || "就绪";
  },

  _showTyping(projectId) {
    if (projectId !== this.activeProjectId) return;
    const output = document.getElementById("termOutput");
    if (!output || output.querySelector(".chat-typing")) return;
    output.insertAdjacentHTML("beforeend",
      `<div class="chat-msg chat-msg-assistant chat-typing"><div class="chat-msg-avatar">🤖</div><div class="chat-msg-bubble chat-msg-bubble-assistant"><div class="chat-typing-dots"><span></span><span></span><span></span></div></div></div>`);
    output.scrollTop = output.scrollHeight;
  },

  _hideTyping(projectId) {
    if (projectId !== this.activeProjectId) return;
    const output = document.getElementById("termOutput");
    const typing = output?.querySelector(".chat-typing");
    if (typing) typing.remove();
  },

  _updateMode(mode) {
    const sendBtn = document.getElementById("sendBtn");
    if (sendBtn) {
      if (mode === "thinking") {
        this._updateSendBtn("stop");
      } else {
        this._updateSendBtn("send");
      }
    }
    this.renderProjectList();
    this.renderTabsBar();
  },

  _updateSendBtn(mode) {
    const btn = document.getElementById("sendBtn");
    if (!btn) return;
    if (mode === "stop") {
      btn.textContent = "⏹";
      btn.title = "停止";
      btn.dataset.mode = "stop";
      btn.classList.add("danger");
      btn.classList.remove("primary");
    } else {
      btn.textContent = "➤";
      btn.title = "发送";
      btn.dataset.mode = "send";
      btn.classList.add("primary");
      btn.classList.remove("danger");
    }
  },

  _showModelMenu(e) {
    const existing = document.querySelector(".ctx-menu");
    if (existing) existing.remove();
    const self = this;
    const menu = document.createElement("div");
    menu.className = "ctx-menu";
    menu.style.left = e.clientX + "px";
    menu.style.top = (e.clientY - 100) + "px";
    const models = [
      ["", "默认"], ["sonnet", "Sonnet"], ["opus", "Opus"], ["haiku", "Haiku"],
    ];
    // 从设置加载自定义模型
    const customModelsStr = Utils.store.get("customModels", "");
    if (customModelsStr) {
      const customs = customModelsStr.split("\n").filter(function(s) { return s.trim(); });
      for (const cm of customs) {
        const trimmed = cm.trim();
        models.push([trimmed, trimmed]);
      }
    }
    menu.innerHTML = models.map(function(m) {
      return '<div class="ctx-menu-item" data-model="' + Utils.escapeHtml(m[0]) + '">' + Utils.escapeHtml(m[1]) + (self._currentModel === m[0] ? ' ✓' : '') + '</div>';
    }).join("") + '<div class="ctx-menu-divider"></div>' +
      '<div class="ctx-menu-item" data-model="__custom__">自定义模型...</div>';
    document.body.appendChild(menu);
    menu.querySelectorAll(".ctx-menu-item").forEach(function(mi) {
      mi.addEventListener("click", function() {
        const m = mi.dataset.model;
        menu.remove();
        if (m === "__custom__") {
          App.navigate("config");
          return;
        }
        self._currentModel = m;
        self._updateModelBtn();
        Utils.store.set("defaultModel", m);
        if (self.activeProjectId) {
          const project = self.projects.find(function(p) { return p.id === self.activeProjectId; });
          if (project) project.model = m || null;
        }
        Utils.toast(m ? "模型切换为 " + m : "已切换为默认模型", "info");
      });
    });
    setTimeout(function() {
      document.addEventListener("click", function close() {
        menu.remove();
        document.removeEventListener("click", close);
      });
    }, 0);
  },

  _updateModelBtn() {
    const btn = document.getElementById("modelBtn");
    if (!btn) return;
    const label = this._currentModel ? this._currentModel : "默认";
    btn.textContent = label;
  },

  sendCommand(text) {
    if (!this.activeProjectId) {
      Utils.toast("请先添加项目目录", "warning");
      return;
    }
    this._doSend(text);
  },

  _doSend(text) {
    const project = this.projects.find((p) => p.id === this.activeProjectId);
    if (!project || !project.procId) { Utils.toast("对话已结束", "warning"); return; }
    if (project.busy) { Utils.toast("Claude 正在思考中...", "warning"); return; }
    this._addUserMessage(this.activeProjectId, text);
    // 传入模型参数
    const model = this._currentModel || project.model || null;
    Utils.apiSync("sendInput", project.procId, text, model);
  },

  // === 兼容接口 ===
  get activeTabId() { return this.activeProjectId; },
  get tabCounter() { return this.projectCounter; },
  set tabCounter(v) { this.projectCounter = v; },
  get tabs() { return this.projects; },
  set tabs(v) { this.projects = v; },
  renderTabs() { return this.renderProjectList(); },
  renderProjectTabs() { return this.renderProjectList(); },

  // 持久化项目列表到 uTools 存储
  _saveProjects() {
    var saved = this.projects.map(function(p) {
      return { workDir: p.workDir, name: p.name, messages: p.messages.slice(-50) };
    });
    Utils.store.set("savedProjects", saved);
  },

  // 从存储恢复项目
  _restoreProjects() {
    var saved = Utils.store.get("savedProjects", []);
    if (!saved || saved.length === 0) return;
    for (var i = 0; i < saved.length; i++) {
      var s = saved[i];
      if (!Utils.apiSync("fileExists", s.workDir)) continue;
      // 重新启动 Claude 会话
      var result = Utils.apiSync("startClaudeSession", s.workDir, {});
      if (result.error) continue;
      var projectId = "proj_" + (++this.projectCounter);
      var project = {
        id: projectId, workDir: s.workDir, name: s.name || Utils.baseName(s.workDir),
        procId: result.procId, messages: s.messages || [], busy: false,
        sessionId: null, historySessions: Utils.apiSync("listSessions") ? (function() {
          var all = Utils.apiSync("listSessions");
          var encoded = s.workDir.replace(/[^a-zA-Z0-9]/g, "-");
          return all.filter(function(x) { return x.projectDir === encoded; });
        })() : [],
      };
      (function(pid) {
        Utils.apiSync("onOutput", result.procId, function(data) {
          // 静默注册回调，不渲染（用户可能不在对话页）
        });
      })(projectId);
      this.projects.push(project);
    }
    if (this.projects.length > 0) {
      this.activeProjectId = this.projects[0].id;
      App.setWorkDir(this.projects[0].workDir);
    }
  },

  cleanup() {
    this._saveProjects();
    for (const p of this.projects) {
      if (p.procId) Utils.apiSync("killProcess", p.procId);
    }
    this.projects = [];
    this.activeProjectId = null;
  },
};
