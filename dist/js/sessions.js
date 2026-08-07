/**
 * 会话历史页面 — 参考 CCExplorer 设计
 * 按项目折叠、会话统计、活动折线图、删除/定位/恢复
 */

const SessionsPage = {
  sessions: [],
  filteredSessions: [],
  selectedSession: null,
  collapsedProjects: {},
  autoRefresh: false,
  refreshTimer: null,

  render(container) {
    container.innerHTML = `
      <div class="sessions-layout">
        <div class="sessions-main" id="sessionsMain">
          <div class="sessions-toolbar">
            <input class="input" id="sessionSearch" placeholder="🔍 搜索会话内容..." style="flex:1" />
            <button class="btn sm" id="refreshBtn" title="刷新">🔄</button>
            <button class="btn sm" id="autoRefreshBtn" title="自动刷新">⏱️ 自动</button>
          </div>
          <div id="sessionStatsBar" class="sessions-stats-bar"></div>
          <div id="sessionsList"></div>
        </div>
        <div class="split-divider" id="sessionsDivider"></div>
        <div class="sessions-detail" id="sessionDetailPanel" style="display:none">
          <div class="sessions-detail-header">
            <span class="font-bold text-sm" id="detailTitle">会话详情</span>
            <div class="flex gap-1">
              <button class="btn sm" id="resumeBtn" title="恢复会话">▶️ 恢复</button>
              <button class="btn sm" id="locateBtn" title="在文件管理器中打开">📂 定位</button>
              <button class="btn sm" id="exportBtn" title="导出为 Markdown">📤</button>
              <button class="btn sm" id="maxBtn" title="最大化">⛶</button>
              <button class="btn sm" id="deleteBtn" title="删除会话">🗑️</button>
              <button class="btn sm" id="closeDetailBtn">✕</button>
            </div>
          </div>
          <div class="collapsible-section" id="statsSection">
            <div class="collapsible-header" data-collapse="detailStats">
              <span class="collapsible-arrow">▼</span>📊 统计信息
            </div>
            <div class="collapsible-body" id="detailStats"></div>
          </div>
          <div class="collapsible-section" id="chartSection">
            <div class="collapsible-header" data-collapse="detailChart">
              <span class="collapsible-arrow">▼</span>📈 活动趋势
            </div>
            <div class="collapsible-body" id="detailChart"></div>
          </div>
          <div class="collapsible-section" id="inspectorSection" style="display:none">
            <div class="collapsible-header" data-collapse="detailInspector">
              <span class="collapsible-arrow">▼</span>🔍 节点详情
            </div>
            <div class="collapsible-body" id="detailInspector"></div>
          </div>
          <div class="sessions-detail-messages" id="detailMessages"></div>
        </div>
      </div>
    `;
    this.bindEvents();
    this.loadSessions();
  },

  bindEvents() {
    document.getElementById("sessionSearch")?.addEventListener("input", Utils.debounce((e) => {
      this.filterSessions(e.target.value);
    }, 200));
    document.getElementById("refreshBtn")?.addEventListener("click", () => this.loadSessions());
    document.getElementById("autoRefreshBtn")?.addEventListener("click", () => this.toggleAutoRefresh());

    // 折叠/展开分区
    document.querySelectorAll(".collapsible-header").forEach((header) => {
      header.addEventListener("click", () => {
        const body = document.getElementById(header.dataset.collapse);
        if (!body) return;
        const isHidden = body.style.display === "none";
        body.style.display = isHidden ? "" : "none";
        header.querySelector(".collapsible-arrow").textContent = isHidden ? "▼" : "▶";
      });
    });
    document.getElementById("closeDetailBtn")?.addEventListener("click", () => {
      document.getElementById("sessionDetailPanel").style.display = "none";
    });
    document.getElementById("resumeBtn")?.addEventListener("click", () => {
      if (this.selectedSession) this._resumeSession(this.selectedSession);
    });
    document.getElementById("exportBtn")?.addEventListener("click", () => {
      if (this.selectedSession) this._exportSession(this.selectedSession);
    });
    document.getElementById("locateBtn")?.addEventListener("click", () => {
      if (this.selectedSession) {
        utools.shellShowItemInFolder(this.selectedSession.filePath);
      }
    });
    document.getElementById("deleteBtn")?.addEventListener("click", async () => {
      if (!this.selectedSession) return;
      const name = this.selectedSession.summary || this.selectedSession.id.substring(0, 8);
      if (await Utils.confirm("确定删除会话 \"" + name + "\"？\n\n此操作不可恢复。")) {
        this._deleteSession(this.selectedSession);
      }
    });
    document.getElementById("maxBtn")?.addEventListener("click", () => this._toggleMaximize());

    // 可拖拽分隔条
    this._initSplitDivider();
  },

  _toggleMaximize() {
    var main = document.getElementById("sessionsMain");
    var panel = document.getElementById("sessionDetailPanel");
    var divider = document.getElementById("sessionsDivider");
    var isMax = panel.classList.contains("maximized");
    if (isMax) {
      // 恢复
      panel.classList.remove("maximized");
      main.style.display = "";
      divider.style.display = "";
      document.getElementById("maxBtn").textContent = "⛶";
    } else {
      // 最大化
      panel.classList.add("maximized");
      main.style.display = "none";
      divider.style.display = "none";
      document.getElementById("maxBtn").textContent = "🗗";
    }
  },

  _initSplitDivider() {
    var divider = document.getElementById("sessionsDivider");
    if (!divider) return;
    var self = this;
    var dragging = false;
    var startX = 0;
    var startWidth = 0;
    var panel = document.getElementById("sessionDetailPanel");

    divider.addEventListener("mousedown", function(e) {
      dragging = true;
      startX = e.clientX;
      startWidth = panel.offsetWidth;
      document.body.style.cursor = "col-resize";
      e.preventDefault();
    });

    document.addEventListener("mousemove", function(e) {
      if (!dragging) return;
      var dx = startX - e.clientX;
      var newWidth = startWidth + dx;
      if (newWidth > 250 && newWidth < window.innerWidth - 250) {
        panel.style.width = newWidth + "px";
        panel.style.flex = "none";
      }
    });

    document.addEventListener("mouseup", function() {
      if (dragging) {
        dragging = false;
        document.body.style.cursor = "";
      }
    });
  },

  toggleAutoRefresh() {
    this.autoRefresh = !this.autoRefresh;
    const btn = document.getElementById("autoRefreshBtn");
    if (this.autoRefresh) {
      btn.classList.add("primary");
      btn.textContent = "⏱️ 自动 ✓";
      this.refreshTimer = setInterval(() => this.loadSessions(), 5000);
      Utils.toast("已开启自动刷新 (5秒)", "info");
    } else {
      btn.classList.remove("primary");
      btn.textContent = "⏱️ 自动";
      clearInterval(this.refreshTimer);
    }
  },

  loadSessions() {
    this.sessions = Utils.apiSync("listSessions") || [];
    // 根据 App scope 过滤：项目级时只显示该项目目录的会话
    if (App.scope === "project" && App.projectDir) {
      const target = App.projectDir;
      this.sessions = this.sessions.filter((s) =>
        s.project === target || s.projectDir === target
      );
    }
    this.filteredSessions = [...this.sessions];
    this.renderStatsBar();
    this.renderList();
  },

  renderStatsBar() {
    const el = document.getElementById("sessionStatsBar");
    if (!el) return;

    // 顶部显示当前过滤 scope
    let scopeBadge = '<span class="status-badge accent">🌍 全部会话</span>';
    if (App.scope === "project" && App.projectDir) {
      scopeBadge = '<span class="status-badge accent">📁 ' + Utils.escapeHtml(Utils.baseName(App.projectDir)) + '</span>';
    }

    const total = this.sessions.length;
    const totalMsgs = this.sessions.reduce((s, x) => s + (x.messageCount || 0), 0);
    const totalSize = this.sessions.reduce((s, x) => s + (x.size || 0), 0);
    const projects = new Set(this.sessions.map((s) => s.projectDir)).size;
    el.innerHTML =
      scopeBadge +
      '<span class="status-badge">📊 ' + total + ' 会话</span>' +
      '<span class="status-badge">💬 ' + totalMsgs + ' 消息</span>' +
      '<span class="status-badge">📁 ' + projects + ' 项目</span>' +
      '<span class="status-badge">💾 ' + Utils.formatSize(totalSize) + '</span>';
  },

  filterSessions(query) {
    if (!query) {
      this.filteredSessions = [...this.sessions];
    } else {
      const q = query.toLowerCase();
      this.filteredSessions = this.sessions.filter((s) =>
        (s.summary || "").toLowerCase().includes(q) ||
        (s.project || "").toLowerCase().includes(q) ||
        (s.id || "").toLowerCase().includes(q)
      );
    }
    this.renderList();
  },

  renderList() {
    const el = document.getElementById("sessionsList");
    if (!el) return;

    if (this.filteredSessions.length === 0) {
      el.innerHTML = '<div class="empty-state"><div class="empty-icon">💬</div><div class="empty-text">' + (this.sessions.length === 0 ? "暂无会话历史" : "未找到匹配的会话") + '</div></div>';
      return;
    }

    var groups = {};
    for (var i = 0; i < this.filteredSessions.length; i++) {
      var s = this.filteredSessions[i];
      var key = s.projectDir || "unknown";
      if (!groups[key]) groups[key] = { name: s.project || key, sessions: [] };
      groups[key].sessions.push(s);
    }

    var groupKeys = Object.keys(groups);
    var html = "";
    for (var gi = 0; gi < groupKeys.length; gi++) {
      var key = groupKeys[gi];
      var group = groups[key];
      var collapsed = this.collapsedProjects[key];
      var displayName = group.name;
      // 如果是编码路径，显示更友好的格式
      if (displayName.startsWith("-")) {
        displayName = displayName.replace(/-/g, " / ");
      }
      html += '<div class="session-project ' + (collapsed ? "collapsed" : "") + '">';
      html += '<div class="session-project-header" data-toggle="' + Utils.escapeHtml(key) + '">';
      html += '<span class="session-project-arrow">' + (collapsed ? "▶" : "▼") + '</span>';
      html += '<span class="session-project-icon">📁</span>';
      html += '<span class="session-project-name" title="' + Utils.escapeHtml(group.name) + '">' + Utils.escapeHtml(displayName) + '</span>';
      html += '<span class="session-project-count">' + group.sessions.length + '</span>';
      html += '</div>';
      html += '<div class="session-project-body"' + (collapsed ? ' style="display:none"' : "") + '>';
      for (var si = 0; si < group.sessions.length; si++) {
        html += this._renderSessionItem(group.sessions[si]);
      }
      html += '</div></div>';
    }
    el.innerHTML = html;

    var self = this;
    el.querySelectorAll("[data-toggle]").forEach(function(header) {
      header.addEventListener("click", function() {
        var key = header.dataset.toggle;
        self.collapsedProjects[key] = !self.collapsedProjects[key];
        self.renderList();
      });
    });

    el.querySelectorAll("[data-session-idx]").forEach(function(item) {
      item.addEventListener("click", function() {
        var idx = parseInt(item.dataset.sessionIdx);
        var session = self.filteredSessions[idx];
        if (session) {
          self.showDetail(session);
          el.querySelectorAll("[data-session-idx]").forEach(function(li) { li.classList.remove("active"); });
          item.classList.add("active");
        }
      });
      // 右键菜单
      item.addEventListener("contextmenu", function(e) {
        e.preventDefault();
        var idx = parseInt(item.dataset.sessionIdx);
        var session = self.filteredSessions[idx];
        if (session) self._showContextMenu(e, session);
      });
    });
  },

  _showContextMenu(e, session) {
    // 移除已有菜单
    var existing = document.querySelector(".ctx-menu");
    if (existing) existing.remove();

    var menu = document.createElement("div");
    menu.className = "ctx-menu";
    menu.style.left = e.clientX + "px";
    menu.style.top = e.clientY + "px";
    var self = this;
    menu.innerHTML =
      '<div class="ctx-menu-item" data-act="resume">▶️ 恢复会话</div>' +
      '<div class="ctx-menu-item" data-act="locate">📂 定位文件</div>' +
      '<div class="ctx-menu-item" data-act="export">📤 导出 Markdown</div>' +
      '<div class="ctx-menu-divider"></div>' +
      '<div class="ctx-menu-item danger" data-act="delete">🗑️ 删除会话</div>';

    document.body.appendChild(menu);

    menu.querySelectorAll(".ctx-menu-item").forEach(function(mi) {
      mi.addEventListener("click", function() {
        var act = mi.dataset.act;
        menu.remove();
        if (act === "resume") self._resumeSession(session);
        else if (act === "locate") utools.shellShowItemInFolder(session.filePath);
        else if (act === "export") self._exportSession(session);
        else if (act === "delete") {
          Utils.confirm("确定删除会话？此操作不可恢复。").then(function(ok) {
            if (ok) self._deleteSession(session);
          });
        }
      });
    });

    // 点击外部关闭
    setTimeout(function() {
      document.addEventListener("click", function close() {
        menu.remove();
        document.removeEventListener("click", close);
      });
    }, 0);
  },

  _renderSessionItem(s) {
    var idx = this.filteredSessions.indexOf(s);
    var title = s.summary || s.id.substring(0, 12);
    var costHtml = "";
    if (s.cost && s.cost > 0) {
      var cny = (s.cost * 7.2).toFixed(2);
      costHtml = ' · 💰$' + s.cost.toFixed(4) + '/¥' + cny;
    }
    return '<div class="session-item" data-session-idx="' + idx + '">' +
      '<div class="session-item-icon">💬</div>' +
      '<div class="session-item-content">' +
      '<div class="session-item-title">' + Utils.escapeHtml(title) + '</div>' +
      '<div class="session-item-subtitle">' + Utils.formatTime(s.lastModified) + ' · ' + s.messageCount + '条' + costHtml + '</div>' +
      '</div></div>';
  },

  showDetail(session) {
    this.selectedSession = session;
    var panel = document.getElementById("sessionDetailPanel");
    var title = document.getElementById("detailTitle");
    var stats = document.getElementById("detailStats");
    var chart = document.getElementById("detailChart");
    var msgs = document.getElementById("detailMessages");
    if (!panel) return;

    panel.style.display = "flex";
    title.textContent = session.summary || session.id.substring(0, 16);

    var st = Utils.apiSync("getSessionStats", session.filePath);
    var statsHtml = "";
    if (st) {
      var durationLabel = Utils.formatDuration(st.durationMs);
      statsHtml = '<div class="detail-stat-grid">' +
        '<div class="detail-stat"><span class="detail-stat-val">⏱️ ' + durationLabel + '</span><span class="detail-stat-label">耗时</span></div>' +
        '<div class="detail-stat"><span class="detail-stat-val">💬 ' + st.totalMessages + '</span><span class="detail-stat-label">消息</span></div>' +
        '<div class="detail-stat"><span class="detail-stat-val">🔧 ' + st.toolCallCount + '</span><span class="detail-stat-label">工具调用</span></div>' +
        '<div class="detail-stat"><span class="detail-stat-val">📊 ' + Utils.formatSize(st.totalTokens * 4) + '</span><span class="detail-stat-label">Token</span></div>' +
        '</div>';

      // Token 分布
      statsHtml += '<div class="detail-token-breakdown">';
      var total = st.totalTokens || 1;
      statsHtml += '<div class="token-bar-row"><span class="token-label">输入</span><div class="token-bar-bg"><div class="token-bar token-bar-input" style="width:' + Math.min(100, st.inputTokens / total * 100) + '%"></div></div><span class="token-val">' + st.inputTokens.toLocaleString() + '</span></div>';
      statsHtml += '<div class="token-bar-row"><span class="token-label">输出</span><div class="token-bar-bg"><div class="token-bar token-bar-output" style="width:' + Math.min(100, st.outputTokens / total * 100) + '%"></div></div><span class="token-val">' + st.outputTokens.toLocaleString() + '</span></div>';
      statsHtml += '<div class="token-bar-row"><span class="token-label">缓存</span><div class="token-bar-bg"><div class="token-bar token-bar-cache" style="width:' + Math.min(100, st.cacheReadTokens / total * 100) + '%"></div></div><span class="token-val">' + st.cacheReadTokens.toLocaleString() + '</span></div>';
      statsHtml += '</div>';

      // 工具调用
      if (st.toolCallCount > 0) {
        statsHtml += '<div class="detail-tool-list"><div class="detail-tool-title">🔧 工具调用分布</div>';
        var entries = Object.entries(st.toolCalls).sort(function(a, b) { return b[1] - a[1]; });
        for (var i = 0; i < entries.length; i++) {
          var name = entries[i][0], count = entries[i][1];
          statsHtml += '<div class="tool-bar-row"><span class="tool-name">' + Utils.escapeHtml(name) + '</span><div class="tool-bar-bg"><div class="tool-bar" style="width:' + Math.min(100, count / st.toolCallCount * 100) + '%"></div></div><span class="tool-val">' + count + '</span></div>';
        }
        statsHtml += '</div>';
      }

      if (st.totalCost > 0) statsHtml += '<div class="detail-cost">💰 费用: $' + st.totalCost.toFixed(4) + '</div>';
      if (st.models.length > 0) statsHtml += '<div class="detail-models">🧠 模型: ' + Utils.escapeHtml(st.models.join(", ")) + '</div>';

      // 项目路径
      var projPath = session.project || "";
      if (projPath) statsHtml += '<div class="detail-path">📂 ' + Utils.escapeHtml(projPath) + '</div>';
    }
    stats.innerHTML = statsHtml;

    // 活动折线图
    chart.innerHTML = this._renderActivityChart(session.filePath, st);

    // 对话内容
    var history = Utils.apiSync("getSessionHistory", session.filePath);
    if (!history || history.length === 0) {
      msgs.innerHTML = '<div class="text-muted text-sm p-3">无法读取会话内容</div>';
      return;
    }

    // 读取完整 JSONL 获取时间戳（与 history 一一对应）
    var rawContent = Utils.apiSync("readFile", session.filePath);
    var rawLines = (rawContent && rawContent.content) ? rawContent.content.split("\n").filter(function(l){return l.trim()}) : [];
    var historyTimestamps = [];
    var rawIdx = 0;
    for (var hi = 0; hi < history.length; hi++) {
      // 在 rawLines 中找到与 history[hi] 对应的时间戳
      var foundTs = null;
      for (; rawIdx < rawLines.length; rawIdx++) {
        try {
          var robj = JSON.parse(rawLines[rawIdx]);
          var rrole = (robj.role || robj.type || "").replace("human","user").replace("model","assistant");
          if (rrole === history[hi].role && robj.timestamp) {
            foundTs = new Date(robj.timestamp).getTime();
            rawIdx++;
            break;
          }
        } catch(e) { rawIdx++; }
      }
      historyTimestamps.push(foundTs);
    }

    var msgsHtml = '<div class="detail-timeline">';
    for (var i = 0; i < history.length; i++) {
      var msg = history[i];
      var tsAttr = historyTimestamps[i] ? ' data-ts="' + historyTimestamps[i] + '"' : '';
      if (msg.role === "user") {
        msgsHtml += '<div class="chat-msg chat-msg-user"' + tsAttr + '><div class="chat-msg-avatar">👤</div><div class="chat-msg-bubble chat-msg-bubble-user"><div class="chat-msg-text md-content">' + Utils.renderMarkdown(msg.text) + '</div></div></div>';
      } else if (msg.role === "assistant") {
        msgsHtml += '<div class="chat-msg chat-msg-assistant"' + tsAttr + '><div class="chat-msg-avatar">🤖</div><div class="chat-msg-bubble chat-msg-bubble-assistant"><div class="chat-msg-text md-content">' + Utils.renderMarkdown(msg.text) + '</div></div></div>';
      } else if (msg.role === "system") {
        msgsHtml += '<div class="chat-msg-system"' + tsAttr + '>' + Utils.escapeHtml(msg.text) + '</div>';
      }
    }
    msgsHtml += '</div>';
    msgs.innerHTML = msgsHtml;
    msgs.scrollTop = msgs.scrollHeight;
  },

  _renderActivityChart(filePath, st) {
    // 读取 JSONL 提取每条消息的时间戳和 token 用量
    var content = Utils.apiSync("readFile", filePath);
    if (!content || !content.content) return "";
    var lines = content.content.split("\n").filter(function(l) { return l.trim(); });
    var points = [];
    for (var i = 0; i < lines.length; i++) {
      try {
        var obj = JSON.parse(lines[i]);
        if (obj.timestamp) {
          var tokens = 0;
          var usage = (obj.message && obj.message.usage) ? obj.message.usage : {};
          tokens = (usage.input_tokens || 0) + (usage.output_tokens || 0) + (usage.cache_read_input_tokens || 0);
          points.push({
            time: new Date(obj.timestamp).getTime(), tokens: tokens,
            role: obj.role || obj.type || "", line: i,
            rawObj: obj, usage: usage,
          });
        }
      } catch(e) {}
    }
    if (points.length < 2) return "";

    var firstTime = points[0].time;
    var lastTime = points[points.length - 1].time;
    var totalSpan = lastTime - firstTime;
    if (totalSpan < 1000) return "";

    // 当数据点过多时聚合采样，避免折线图密密麻麻
    var MAX_POINTS = 50;
    if (points.length > MAX_POINTS) {
      var step = Math.ceil(points.length / MAX_POINTS);
      var sampled = [];
      for (var si = 0; si < points.length; si += step) {
        var batch = points.slice(si, si + step);
        var sumTokens = batch.reduce(function(a, b) { return a + b.tokens; }, 0);
        sampled.push({
          time: batch[0].time, tokens: sumTokens,
          role: batch[0].role, line: batch[0].line,
          rawObj: batch[0].rawObj, usage: batch[0].usage,
          isAggregated: batch.length > 1, aggCount: batch.length,
        });
      }
      points = sampled;
    }

    var durationLabel = Utils.formatDuration(totalSpan);
    var chartId = "chart_" + Date.now();

    var html = '<div class="chart-container">' +
      '<div class="chart-title">📈 活动趋势 · ' + durationLabel + ' · ' + points.length + ' 点</div>' +
      '<canvas id="' + chartId + '" style="width:100%;height:64px;display:block;cursor:crosshair"></canvas>' +
      '<div class="chart-axis"><span>' + Utils.formatTime(new Date(firstTime).toISOString()) + '</span><span>悬停查看 · 点击展开详情</span><span>' + Utils.formatTime(new Date(lastTime).toISOString()) + '</span></div>' +
      '</div>';

    // 延迟渲染 canvas 和绑定交互
    var self = this;
    setTimeout(function() {
      var canvas = document.getElementById(chartId);
      if (!canvas) return;

      var maxTokens = Math.max.apply(null, points.map(function(p) { return p.tokens; })) || 1;

      // 提取绘制函数，方便 resize 时重绘
      function drawChart() {
        var dpr = window.devicePixelRatio || 1;
        var rect = canvas.getBoundingClientRect();
        var w = rect.width;
        var h = rect.height;
        if (w < 1 || h < 1) return;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        var ctx = canvas.getContext("2d");
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);

        var pad = 4;
        var chartW = w - pad * 2;
        var chartH = h - pad * 2;
        var xStep = points.length > 1 ? chartW / (points.length - 1) : chartW / 2;

        // 填充区域
        ctx.beginPath();
        ctx.moveTo(pad, h - pad);
        for (var i = 0; i < points.length; i++) {
          var x = pad + (points.length > 1 ? i * xStep : chartW / 2);
          var y = h - pad - (points[i].tokens / maxTokens) * chartH;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(pad + (points.length - 1) * xStep, h - pad);
        ctx.closePath();
        ctx.fillStyle = "rgba(88, 166, 255, 0.15)";
        ctx.fill();

        // 折线
        ctx.beginPath();
        for (var i = 0; i < points.length; i++) {
          var x = pad + (points.length > 1 ? i * xStep : chartW / 2);
          var y = h - pad - (points[i].tokens / maxTokens) * chartH;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = "rgba(88, 166, 255, 0.7)";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // 存储用于交互
        canvas._chartPoints = points;
        canvas._chartXStep = xStep;
        canvas._chartPad = pad;
        canvas._chartW = w;
        canvas._chartH = h;
        canvas._chartCtx = ctx;
        canvas._chartMaxTokens = maxTokens;
        canvas._chartDpr = dpr;
      }

      drawChart();

      // ResizeObserver — 窗口宽度变化时重绘
      if (window.ResizeObserver) {
        var ro = new ResizeObserver(function() {
          drawChart();
        });
        ro.observe(canvas);
        canvas._chartResizeObserver = ro;
      }

      // 悬浮
      canvas.addEventListener("mousemove", function(e) {
        var idx = self._chartNearest(canvas, e.clientX);
        if (idx < 0) return;
        var p = points[idx];
        var ctx = canvas._chartCtx;
        var w = canvas._chartW;
        var h = canvas._chartH;
        var pad = canvas._chartPad;
        var chartW = w - pad * 2;
        var chartH = h - pad * 2;
        var xStep = canvas._chartXStep;
        var maxT = canvas._chartMaxTokens;
        if (!ctx) return;

        var x = pad + (points.length > 1 ? idx * xStep : chartW / 2);

        // 重绘底图
        ctx.clearRect(0, 0, w, h);
        ctx.beginPath();
        ctx.moveTo(pad, h - pad);
        for (var j = 0; j < points.length; j++) {
          var xx = pad + (points.length > 1 ? j * xStep : chartW / 2);
          var yy = h - pad - (points[j].tokens / maxT) * chartH;
          ctx.lineTo(xx, yy);
        }
        ctx.lineTo(pad + (points.length - 1) * xStep, h - pad);
        ctx.closePath();
        ctx.fillStyle = "rgba(88, 166, 255, 0.15)";
        ctx.fill();

        ctx.beginPath();
        for (var j = 0; j < points.length; j++) {
          var xx = pad + (points.length > 1 ? j * xStep : chartW / 2);
          var yy = h - pad - (points[j].tokens / maxT) * chartH;
          if (j === 0) ctx.moveTo(xx, yy);
          else ctx.lineTo(xx, yy);
        }
        ctx.strokeStyle = "rgba(88, 166, 255, 0.7)";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // 竖线
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.strokeStyle = "rgba(88, 166, 255, 0.4)";
        ctx.lineWidth = 1;
        ctx.stroke();

        // 圆点
        var py = h - pad - (p.tokens / maxT) * chartH;
        ctx.beginPath();
        ctx.arc(x, py, 3, 0, Math.PI * 2);
        ctx.fillStyle = "#58a6ff";
        ctx.fill();

        var timeStr = new Date(p.time).toLocaleTimeString("zh-CN", {hour:"2-digit",minute:"2-digit",second:"2-digit"});
        var roleLabel = (p.role === "user" || p.role === "human") ? "👤 用户" : (p.role === "assistant" || p.role === "model") ? "🤖 助手" : "⚙️ 系统";
        canvas.title = roleLabel + " · " + timeStr + " · " + p.tokens.toLocaleString() + " tokens\n点击定位到此消息";
      });

      // 点击 → 显示检查器面板（浮动覆盖层）+ 定位消息
      canvas.addEventListener("click", function(e) {
        var idx = self._chartNearest(canvas, e.clientX);
        if (idx < 0) return;
        var p = points[idx];
        self._showInspector(p, lines);
      });

      // 鼠标离开 → 重绘
      canvas.addEventListener("mouseleave", function() {
        var ctx = canvas._chartCtx;
        if (!ctx) return;
        drawChart();
        canvas.title = "";
      });
    }, 50);

    return html;
  },

  _chartNearest(canvas, clientX) {
    var points = canvas._chartPoints;
    if (!points || points.length === 0) return -1;
    var rect = canvas.getBoundingClientRect();
    var x = clientX - rect.left;
    var xStep = canvas._chartXStep;
    var pad = canvas._chartPad || 0;
    var nearestIdx = 0;
    var nearestDist = Infinity;
    for (var i = 0; i < points.length; i++) {
      var px = pad + (points.length > 1 ? i * xStep : rect.width / 2);
      var dist = Math.abs(x - px);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = i;
      }
    }
    return nearestIdx;
  },

  _showInspector(point, rawLines) {
    var el = document.getElementById("detailInspector");
    if (!el) return;
    // 显示检查器分区（内联展开，不覆盖其他内容）
    var section = document.getElementById("inspectorSection");
    if (section) section.style.display = "";

    var p = point;
    var obj = p.rawObj;
    var u = p.usage || {};
    var role = p.role;
    var roleLabel = (role === "user" || role === "human") ? "👤 用户消息" : (role === "assistant" || role === "model") ? "🤖 助手回复" : "⚙️ 系统事件";
    var timeStr = new Date(p.time).toLocaleString("zh-CN");
    var totalTokens = (u.input_tokens || 0) + (u.output_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0);

    // 提取消息内容摘要
    var contentPreview = "";
    var msgContent = obj.message && obj.message.content ? obj.message.content : obj.content;
    if (typeof msgContent === "string") {
      contentPreview = msgContent.substring(0, 200);
    } else if (Array.isArray(msgContent)) {
      for (var i = 0; i < msgContent.length; i++) {
        var b = msgContent[i];
        if (b.type === "text" && b.text) { contentPreview = b.text.substring(0, 200); break; }
        if (b.type === "tool_use") { contentPreview = "[工具调用: " + (b.name || "?") + "]"; break; }
        if (b.type === "tool_result") { contentPreview = "[工具结果]"; break; }
      }
    }

    // 检查是否有工具调用
    var toolInfo = "";
    if (Array.isArray(msgContent)) {
      for (var i = 0; i < msgContent.length; i++) {
        var b = msgContent[i];
        if (b.type === "tool_use") {
          toolInfo += '<div class="inspector-row"><span class="inspector-label">🔧 工具</span><span class="inspector-value">' + Utils.escapeHtml(b.name || "?") + '</span></div>';
          if (b.input) {
            toolInfo += '<div class="inspector-row"><span class="inspector-label">输入</span><pre class="inspector-json">' + Utils.escapeHtml(JSON.stringify(b.input, null, 2).substring(0, 500)) + '</pre></div>';
          }
        }
        if (b.type === "tool_result") {
          var resultText = typeof b.content === "string" ? b.content : JSON.stringify(b.content);
          toolInfo += '<div class="inspector-row"><span class="inspector-label">结果</span><pre class="inspector-json">' + Utils.escapeHtml(resultText.substring(0, 500)) + '</pre></div>';
        }
      }
    }

    // 计算与上一条消息的时间间隔
    var interval = "";
    if (p.line > 0 && rawLines[p.line - 1]) {
      try {
        var prevObj = JSON.parse(rawLines[p.line - 1]);
        if (prevObj.timestamp) {
          var prevTime = new Date(prevObj.timestamp).getTime();
          var diff = p.time - prevTime;
          interval = Utils.formatDuration(diff);
        }
      } catch(e) {}
    }

    var model = (obj.message && obj.message.model) ? obj.message.model : "";

    var html = '<div class="inspector-header">' +
      '<span class="font-bold text-sm">' + roleLabel + '</span>' +
      '<button class="btn ghost sm" id="inspectorClose" style="margin-left:auto">✕</button>' +
      '</div>';

    html += '<div class="inspector-body">';
    html += '<div class="inspector-row"><span class="inspector-label">⏰ 时间</span><span class="inspector-value">' + timeStr + '</span></div>';
    if (interval) html += '<div class="inspector-row"><span class="inspector-label">⏱ 间隔</span><span class="inspector-value">' + interval + '</span></div>';
    if (model) html += '<div class="inspector-row"><span class="inspector-label">🧠 模型</span><span class="inspector-value">' + Utils.escapeHtml(model) + '</span></div>';

    // Token 详细分解
    if (totalTokens > 0) {
      html += '<div class="inspector-section">📊 Token 消耗</div>';
      html += '<div class="inspector-token-grid">';
      html += '<div class="inspector-token"><span class="inspector-token-val">' + (u.input_tokens || 0).toLocaleString() + '</span><span class="inspector-token-label">输入</span></div>';
      html += '<div class="inspector-token"><span class="inspector-token-val">' + (u.output_tokens || 0).toLocaleString() + '</span><span class="inspector-token-label">输出</span></div>';
      html += '<div class="inspector-token"><span class="inspector-token-val">' + (u.cache_read_input_tokens || 0).toLocaleString() + '</span><span class="inspector-token-label">缓存读</span></div>';
      html += '<div class="inspector-token"><span class="inspector-token-val">' + (u.cache_creation_input_tokens || 0).toLocaleString() + '</span><span class="inspector-token-label">缓存写</span></div>';
      html += '<div class="inspector-token"><span class="inspector-token-val accent">' + totalTokens.toLocaleString() + '</span><span class="inspector-token-label">总计</span></div>';
      html += '</div>';
    }

    // 内容预览
    if (contentPreview) {
      html += '<div class="inspector-section">📝 内容预览</div>';
      html += '<div class="inspector-preview md-content">' + Utils.renderMarkdown(contentPreview) + '</div>';
    }

    // 工具调用信息
    if (toolInfo) {
      html += '<div class="inspector-section">🔧 工具调用</div>';
      html += toolInfo;
    }

    // 原始 JSONL
    html += '<div class="inspector-section">📄 原始 JSONL (第 ' + (p.line + 1) + ' 行)</div>';
    html += '<pre class="inspector-raw">' + Utils.escapeHtml(JSON.stringify(obj, null, 2).substring(0, 2000)) + (JSON.stringify(obj).length > 2000 ? '\n... (截断)' : '') + '</pre>';

    html += '</div>';

    el.innerHTML = html;

    // 绑定关闭 — 隐藏整个检查器分区
    var closeBtn = document.getElementById("inspectorClose");
    if (closeBtn) {
      closeBtn.addEventListener("click", function() {
        var sec = document.getElementById("inspectorSection");
        if (sec) sec.style.display = "none";
      });
    }
  },

  _resumeSession(session) {
    var self = this;
    // 智能路径还原
    var workDir = session.project || "";
    if (!workDir || !Utils.apiSync("fileExists", workDir)) {
      var encoded = session.projectDir || "";
      if (encoded.startsWith("-")) {
        var segments = encoded.split("-").filter(function(s) { return s; });
        var tryPath = "";
        for (var i = 0; i < segments.length; i++) {
          if (i === 0) { tryPath = "/" + segments[0]; continue; }
          var slashPath = tryPath + "/" + segments[i];
          if (Utils.apiSync("fileExists", slashPath)) {
            // 也检查更长合并
            var longerFound = false;
            for (var j = segments.length; j > i + 1; j--) {
              var mu = segments.slice(i, j).join("_");
              if (Utils.apiSync("fileExists", tryPath + "/" + mu)) { tryPath = tryPath + "/" + mu; i = j - 1; longerFound = true; break; }
              var md = segments.slice(i, j).join("-");
              if (Utils.apiSync("fileExists", tryPath + "/" + md)) { tryPath = tryPath + "/" + md; i = j - 1; longerFound = true; break; }
            }
            if (!longerFound) tryPath = slashPath;
            continue;
          }
          var found = false;
          for (var j = segments.length; j > i; j--) {
            var mu2 = segments.slice(i, j).join("_");
            if (Utils.apiSync("fileExists", tryPath + "/" + mu2)) { tryPath = tryPath + "/" + mu2; i = j - 1; found = true; break; }
            var md2 = segments.slice(i, j).join("-");
            if (Utils.apiSync("fileExists", tryPath + "/" + md2)) { tryPath = tryPath + "/" + md2; i = j - 1; found = true; break; }
          }
          if (!found) tryPath = slashPath;
        }
        workDir = tryPath;
      }
      if (!workDir || !Utils.apiSync("fileExists", workDir)) {
        workDir = App.currentWorkDir || Utils.store.get("defaultWorkDir", "");
      }
    }

    App.navigate("terminal");
    setTimeout(function() {
      if (!Utils.apiSync("findClaudePath")) { Utils.toast("Claude CLI 未安装", "error"); return; }
      if (!workDir) { Utils.toast("无法确定工作目录", "warning"); return; }

      // 检查是否已有该项目
      var existingProject = Terminal.projects.find(function(p) { return p.workDir === workDir; });

      if (existingProject) {
        // 项目已存在 — 切换到该项目的标签，终止旧进程并用 resume 恢复
        if (existingProject.procId) Utils.apiSync("killProcess", existingProject.procId);
        var result = Utils.apiSync("startClaudeSession", workDir, { resume: session.id });
        if (result.error) { Utils.toast(result.error, "error"); return; }
        existingProject.procId = result.procId;
        existingProject.messages = [];
        existingProject.busy = false;
        existingProject.sessionId = session.id;
        Terminal.activeProjectId = existingProject.id;
        App.setWorkDir(workDir);
        Terminal.renderProjectList();
        Terminal.switchProject(existingProject.id);

        // 加载历史消息
        self._loadHistoryIntoChat(existingProject.id, session.filePath, "📂 已恢复会话，继续输入消息对话");
      } else {
        // 项目不存在 — 创建新项目标签（含历史会话列表）
        var result2 = Utils.apiSync("startClaudeSession", workDir, { resume: session.id });
        if (result2.error) { Utils.toast(result2.error, "error"); return; }
        var projectId = "proj_" + (++Terminal.projectCounter);
        var project = {
          id: projectId, workDir: workDir, name: Utils.baseName(workDir) || "项目",
          procId: result2.procId, messages: [], busy: false,
          sessionId: session.id, historySessions: Terminal._loadProjectHistory ? Terminal._loadProjectHistory(workDir) : []
        };
        Terminal.projects.push(project);
        Terminal.activeProjectId = projectId;
        App.setWorkDir(workDir);
        Terminal.renderProjectList();

        // 加载历史消息到对话区
        self._loadHistoryIntoChat(projectId, session.filePath, "📂 已恢复会话，继续输入消息对话");
      }

      var input = document.getElementById("termInput");
      if (input) input.focus();
    }, 300);
  },

  _loadHistoryIntoChat(projectId, filePath, systemMsg) {
    var output = document.getElementById("termOutput");
    if (!output) return;
    var project = Terminal.projects.find(function(p) { return p.id === projectId; });
    if (!project) return;
    output.innerHTML = "";
    var history = Utils.apiSync("getSessionHistory", filePath);
    if (history && history.length > 0) {
      for (var i = 0; i < history.length; i++) {
        var msg = history[i];
        if (msg.role === "user") {
          project.messages.push({ role: "user", text: msg.text });
          output.insertAdjacentHTML("beforeend", '<div class="chat-msg chat-msg-user"><div class="chat-msg-avatar">👤</div><div class="chat-msg-bubble chat-msg-bubble-user"><div class="chat-msg-text">' + Utils.escapeHtml(msg.text) + '</div></div></div>');
        } else if (msg.role === "assistant") {
          project.messages.push({ role: "assistant", text: msg.text, complete: true });
          output.insertAdjacentHTML("beforeend", '<div class="chat-msg chat-msg-assistant"><div class="chat-msg-avatar">🤖</div><div class="chat-msg-bubble chat-msg-bubble-assistant"><div class="chat-msg-text">' + Utils.escapeHtml(msg.text) + '</div></div></div>');
        } else if (msg.role === "system") {
          project.messages.push({ role: "system", text: msg.text });
          output.insertAdjacentHTML("beforeend", '<div class="chat-msg-system">' + Utils.escapeHtml(msg.text) + '</div>');
        }
      }
      output.scrollTop = output.scrollHeight;
    }
    Terminal._addSystemMessage(projectId, systemMsg);
  },

  _exportSession(session) {
    var history = Utils.apiSync("getSessionHistory", session.filePath);
    var stats = Utils.apiSync("getSessionStats", session.filePath);
    if (!history) { Utils.toast("无法读取会话内容", "error"); return; }

    var md = "# Claude Code 会话导出\n\n";
    md += "- **项目**: " + (session.project || "未知") + "\n- **会话ID**: " + session.id + "\n- **消息数**: " + session.messageCount + "\n- **时间**: " + Utils.formatDateTime(session.lastModified) + "\n";
    if (stats) {
      md += "- **耗时**: " + (stats.durationMs ? (stats.durationMs / 60000).toFixed(1) + "分钟" : "未知") + "\n";
      md += "- **Token**: 输入" + stats.inputTokens + " 输出" + stats.outputTokens + " 缓存" + stats.cacheReadTokens + "\n";
      md += "- **工具调用**: " + stats.toolCallCount + " 次\n";
      if (stats.totalCost > 0) md += "- **费用**: $" + stats.totalCost.toFixed(4) + "\n";
    }
    md += "\n---\n\n";
    for (var i = 0; i < history.length; i++) {
      var msg = history[i];
      if (msg.role === "user") md += "## 👤 用户\n\n" + msg.text + "\n\n";
      else if (msg.role === "assistant") md += "## 🤖 Claude\n\n" + msg.text + "\n\n";
      else if (msg.role === "system") md += "> " + msg.text + "\n\n";
    }

    utools.showSaveDialog({ title: "导出会话为 Markdown", defaultPath: "claude-session-" + session.id.substring(0, 8) + ".md", filters: [{ name: "Markdown", extensions: ["md"] }] }, function(filePath) {
      if (!filePath) return;
      var result = Utils.apiSync("writeFile", filePath, md);
      if (result.error) Utils.toast("导出失败", "error");
      else { Utils.toast("已导出", "success"); utools.shellShowItemInFolder(filePath); }
    });
  },

  _deleteSession(session) {
    var self = this;
    // 跨平台删除：Windows 用 del，Unix 用 rm
    var isWin = (typeof Utils.apiSync === "function" && Utils.apiSync("platform") === "win32");
    var delCmd = isWin ? 'del /q "' + session.filePath + '"' : 'rm "' + session.filePath + '"';
    Utils.apiSync("execCommand", delCmd, function(res) {
      if (res.error) {
        Utils.toast("删除失败", "error");
      } else {
        Utils.toast("会话已删除", "success");
        document.getElementById("sessionDetailPanel").style.display = "none";
        self.loadSessions();
      }
    });
  },
};
