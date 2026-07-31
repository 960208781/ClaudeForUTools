/**
 * 工具函数库
 */

const Utils = {
  /**
   * 显示 toast 通知
   */
  toast(message, type = "info", duration = 3000) {
    const container = document.getElementById("toastContainer");
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    const icons = { success: "✅", error: "❌", info: "ℹ️", warning: "⚠️" };
    toast.innerHTML = `<span>${icons[type] || ""}</span><span>${this.escapeHtml(message)}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(100%)";
      toast.style.transition = "all 0.3s";
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  /**
   * HTML 转义
   */
  escapeHtml(text) {
    if (text === null || text === undefined) return "";
    const div = document.createElement("div");
    div.textContent = String(text);
    return div.innerHTML;
  },

  /**
   * 跨平台获取路径的最后一部分（目录名或文件名）
   */
  baseName(filePath) {
    if (!filePath) return "";
    // 同时处理 / 和 \ 分隔符（兼容 Windows 和 Unix）
    var parts = filePath.split(/[\/\\]/);
    return parts[parts.length - 1] || parts[parts.length - 2] || filePath;
  },

  /**
   * ANSI 转义码 → HTML（简化版）
   */
  ansiToHtml(text) {
    if (!text) return "";
    // 基本ANSI颜色处理
    const colors = {
      "30": "#414868", "31": "#f7768e", "32": "#9ece6a", "33": "#e0af68",
      "34": "#7aa2f7", "35": "#bb9af7", "36": "#7dcfff", "37": "#c0caf5",
      "90": "#565f89", "91": "#f7768e", "92": "#9ece6a", "93": "#e0af68",
      "94": "#7aa2f7", "95": "#bb9af7", "96": "#7dcfff", "97": "#c0caf5",
    };
    let result = this.escapeHtml(text);
    // 处理多参数 ANSI 颜色 (如 \033[38;2;r;g;bm 256色/真彩色)
    result = result.replace(/\x1b\[(\d+;)*\d*m/g, (match) => {
      // 提取所有参数
      const params = match.slice(2, -1).split(';').map(Number);
      let html = '';
      for (let i = 0; i < params.length; i++) {
        const code = params[i];
        if (code === 0) { html += '</span>'; }
        else if (colors[code]) { html += `<span style="color:${colors[code]}">`; }
        else if (code === 1) { html += '<span style="font-weight:bold">'; }
        else if (code === 3) { html += '<span style="font-style:italic">'; }
        else if (code === 4) { html += '<span style="text-decoration:underline">'; }
        else if (code === 38 && params[i+1] === 5) {
          // 256色 \033[38;5;Nm
          const idx = params[i+2];
          if (idx !== undefined) { html += `<span style="color:${colors[idx] || colors['37']}">`; i += 2; }
        }
        else if (code === 48 && params[i+1] === 5) {
          // 背景色 256色
          i += 2;
        }
        else if (code === 38 && params[i+1] === 2) {
          // 真彩色 \033[38;2;r;g;bm
          const r = params[i+2], g = params[i+3], b = params[i+4];
          if (r !== undefined) { html += `<span style="color:rgb(${r},${g},${b})">`; i += 4; }
        }
        else if (code === 48 && params[i+1] === 2) {
          i += 4; // 跳过背景真彩色
        }
      }
      return html;
    });
    // 处理单独的 \033[1m 等
    result = result.replace(/\x1b\[1m/g, '<span style="font-weight:bold">');
    result = result.replace(/\x1b\[3m/g, '<span style="font-style:italic">');
    result = result.replace(/\x1b\[4m/g, '<span style="text-decoration:underline">');
    // 清除所有剩余 ANSI 控制序列
    result = result.replace(/\x1b\[[\d;]*[A-Za-z]/g, "");
    result = result.replace(/\x1b\][^\x07]*\x07/g, "");
    result = result.replace(/\x1b\][^\x1b]*\x1b\\/g, "");
    result = result.replace(/\x1b[()][AB012]/g, "");
    result = result.replace(/\x1b[=>]/g, "");
    result = result.replace(/\x1b[78]/g, "");
    result = result.replace(/[\x00-\x08\x0e-\x1f\x7f]/g, "");
    result = result.replace(/\r/g, "");
    return result;
  },

  /**
   * 格式化文件大小
   */
  formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  },

  /**
   * 格式化时间
   */
  formatTime(date) {
    if (!date) return "未知";
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return "刚刚";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`;
    return d.toLocaleDateString("zh-CN");
  },

  /**
   * 格式化完整时间
   */
  formatDateTime(date) {
    if (!date) return "未知";
    return new Date(date).toLocaleString("zh-CN");
  },

  /**
   * 格式化耗时（毫秒）为人类友好格式
   */
  formatDuration(ms) {
    if (!ms || ms <= 0) return "—";
    var s = Math.floor(ms / 1000);
    var h = Math.floor(s / 3600);
    var m = Math.floor((s % 3600) / 60);
    var sec = s % 60;
    if (h > 0) return h + "小时" + (m > 0 ? m + "分" : "") + (sec > 0 ? sec + "秒" : "");
    if (m > 0) return m + "分" + (sec > 0 ? sec + "秒" : "");
    return sec + "秒";
  },

  /**
   * 防抖
   */
  debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  },

  /**
   * 创建模态框
   */
  modal(title, bodyHtml, footerHtml = "") {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <div class="modal-title">${title}</div>
          <div class="btn ghost icon" data-close>✕</div>
        </div>
        <div class="modal-body">${bodyHtml}</div>
        ${footerHtml ? `<div class="modal-footer">${footerHtml}</div>` : ""}
      </div>
    `;
    document.body.appendChild(overlay);
    const close = () => overlay.remove();
    overlay.querySelectorAll("[data-close]").forEach((el) => el.onclick = close);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });
    return { overlay, close };
  },

  /**
   * 确认对话框
   */
  confirm(message, title = "确认") {
    return new Promise((resolve) => {
      const { overlay, close } = this.modal(
        title,
        `<p>${this.escapeHtml(message)}</p>`,
        `<button class="btn" data-cancel>取消</button><button class="btn primary" data-ok>确定</button>`
      );
      overlay.querySelector("[data-ok]").onclick = () => { close(); resolve(true); };
      overlay.querySelector("[data-cancel]").onclick = () => { close(); resolve(false); };
    });
  },

  /**
   * uTools showOpenDialog 的 Promise 封装
   * uTools 的 showOpenDialog 可能是同步返回数组，也可能需要回调，
   * 这里同时兼容两种模式。
   */
  showOpenDialog(options) {
    return new Promise((resolve) => {
      let resolved = false;
      const done = (result) => {
        if (!resolved) {
          resolved = true;
          resolve(result);
        }
      };
      try {
        // 尝试回调模式
        const ret = utools.showOpenDialog(options, (result) => {
          done(result);
        });
        // 如果 showOpenDialog 同步返回了数组（非 undefined），说明是同步模式
        if (Array.isArray(ret)) {
          done(ret);
        }
      } catch (e) {
        // 出错时返回 null
        done(null);
      }
    });
  },

  /**
   * API 调用快捷方法
   */
  async api(fn, ...args) {
    try {
      if (typeof window.claudeAPI[fn] === "function") {
        return await window.claudeAPI[fn](...args);
      }
      return { error: `API ${fn} 不存在` };
    } catch (e) {
      return { error: e.message };
    }
  },

  /**
   * 同步 API 调用
   */
  apiSync(fn, ...args) {
    try {
      if (typeof window.claudeAPI[fn] === "function") {
        return window.claudeAPI[fn](...args);
      }
      return { error: `API ${fn} 不存在` };
    } catch (e) {
      return { error: e.message };
    }
  },

  /**
   * 本地存储封装
   */
  store: {
    get(key, defaultVal = null) {
      const val = utools.dbStorage.getItem(key);
      return val !== null && val !== undefined ? val : defaultVal;
    },
    set(key, value) {
      utools.dbStorage.setItem(key, value);
    },
    remove(key) {
      utools.dbStorage.removeItem(key);
    },
  },

  /**
   * 判断是否暗色模式
   */
  isDark() {
    return utools.isDarkColors();
  },

  /**
   * 应用主题
   */
  applyTheme() {
    const theme = Utils.store.get("theme", "auto");
    if (theme === "dark") {
      document.body.classList.remove("light-theme");
    } else if (theme === "light") {
      document.body.classList.add("light-theme");
    } else {
      // auto: 跟随系统
      if (utools.isDarkColors()) {
        document.body.classList.remove("light-theme");
      } else {
        document.body.classList.add("light-theme");
      }
    }
  },

  /**
   * 简易 Markdown → HTML 渲染（无需外部库）
   * 支持：标题、粗体、斜体、行内代码、代码块、列表、链接、引用、表格、分隔线
   */
  renderMarkdown(text) {
    if (!text) return "";
    
    // 1. 提取代码块（保护，避免被后续处理破坏）
    var codeBlocks = [];
    var html = text.replace(/```(\w*)\n?([\s\S]*?)```/g, function(m, lang, code) {
      codeBlocks.push(code);
      return '\x00CODE' + (codeBlocks.length - 1) + '\x00';
    });

    // 2. HTML 转义
    html = Utils.escapeHtml(html);

    // 3. 标题
    html = html.replace(/^###### (.+)$/gm, '\x01h6\x01$1\x01/h6\x01');
    html = html.replace(/^##### (.+)$/gm, '\x01h5\x01$1\x01/h5\x01');
    html = html.replace(/^#### (.+)$/gm, '\x01h4\x01$1\x01/h4\x01');
    html = html.replace(/^### (.+)$/gm, '\x01h3\x01$1\x01/h3\x01');
    html = html.replace(/^## (.+)$/gm, '\x01h2\x01$1\x01/h2\x01');
    html = html.replace(/^# (.+)$/gm, '\x01h1\x01$1\x01/h1\x01');

    // 4. 分隔线
    html = html.replace(/^---+$/gm, '\x01hr\x01');

    // 5. 引用（> 被转义为 &gt;）
    html = html.replace(/^&gt; (.+)$/gm, '\x01quote\x01$1\x01/quote\x01');

    // 6. 粗体、斜体、行内代码、链接
    html = html.replace(/\*\*(.+?)\*\*/g, '\x01b\x01$1\x01/b\x01');
    html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '\x01i\x01$1\x01/i\x01');
    html = html.replace(/`(.+?)`/g, '\x01code\x01$1\x01/code\x01');
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '\x01a href="$2"\x01$1\x01/a\x01');

    // 7. 无序列表
    html = html.replace(/^- (.+)$/gm, '\x01li\x01$1\x01/li\x01');

    // 8. 表格
    var tableLines = html.split('\n');
    var inTable = false;
    var tableHtml = "";
    var result = [];
    for (var i = 0; i < tableLines.length; i++) {
      var line = tableLines[i].trim();
      if (line.startsWith('|') && line.endsWith('|')) {
        var cells = line.slice(1, -1).split('|').map(function(c) { return c.trim(); });
        if (cells.every(function(c) { return /^[-:]+$/.test(c); })) continue; // 分隔行
        var isHeader = !inTable;
        if (!inTable) { tableHtml = '<table class="md-table">'; inTable = true; }
        var tds = cells.map(function(c) { return '<' + (isHeader ? 'th' : 'td') + ' class="md-' + (isHeader ? 'th' : 'td') + '">' + c + '</' + (isHeader ? 'th' : 'td') + '>'; }).join('');
        tableHtml += '<tr>' + tds + '</tr>';
      } else {
        if (inTable) { tableHtml += '</table>'; result.push(tableHtml); inTable = false; tableHtml = ""; }
        result.push(line);
      }
    }
    if (inTable) { tableHtml += '</table>'; result.push(tableHtml); }
    html = result.join('\n');

    // 9. 段落处理 — 连续纯文本行合并为段落，不插入多余 <br>
    html = html.replace(/(<[^>]+>)/g, '\n$1\n');
    var lines = html.split('\n');
    var out = [];
    var para = [];
    for (var i = 0; i < lines.length; i++) {
      var l = lines[i].trim();
      if (!l) {
        if (para.length > 0) { out.push('<p class="md-p">' + para.join(' ') + '</p>'); para = []; }
      } else if (l.startsWith('\x01')) {
        if (para.length > 0) { out.push('<p class="md-p">' + para.join(' ') + '</p>'); para = []; }
        out.push(l);
      } else {
        para.push(l);
      }
    }
    if (para.length > 0) out.push('<p class="md-p">' + para.join(' ') + '</p>');
    html = out.join('\n');

    // 10. 将自定义标签转换为真实 HTML
    html = html.replace(/\x01h1\x01/g, '<h1 class="md-h1">').replace(/\x01\/h1\x01/g, '</h1>');
    html = html.replace(/\x01h2\x01/g, '<h2 class="md-h2">').replace(/\x01\/h2\x01/g, '</h2>');
    html = html.replace(/\x01h3\x01/g, '<h3 class="md-h3">').replace(/\x01\/h3\x01/g, '</h3>');
    html = html.replace(/\x01h4\x01/g, '<h4 class="md-h4">').replace(/\x01\/h4\x01/g, '</h4>');
    html = html.replace(/\x01h5\x01/g, '<h5 class="md-h5">').replace(/\x01\/h5\x01/g, '</h5>');
    html = html.replace(/\x01h6\x01/g, '<h6 class="md-h6">').replace(/\x01\/h6\x01/g, '</h6>');
    html = html.replace(/\x01hr\x01/g, '<hr class="md-hr">');
    html = html.replace(/\x01quote\x01/g, '<blockquote class="md-quote">').replace(/\x01\/quote\x01/g, '</blockquote>');
    html = html.replace(/\x01b\x01/g, '<strong>').replace(/\x01\/b\x01/g, '</strong>');
    html = html.replace(/\x01i\x01/g, '<em>').replace(/\x01\/i\x01/g, '</em>');
    html = html.replace(/\x01code\x01/g, '<code class="md-inline-code">').replace(/\x01\/code\x01/g, '</code>');
    html = html.replace(/\x01a href="([^"]*)"\x01/g, '<a href="$1" class="md-link" target="_blank">').replace(/\x01\/a\x01/g, '</a>');
    html = html.replace(/\x01li\x01/g, '<li>').replace(/\x01\/li\x01/g, '</li>');
    html = html.replace(/(<li>[\s\S]*?<\/li>)/g, '<ul class="md-ul">$1</ul>');
    html = html.replace(/<\/ul>\n<ul class="md-ul">/g, ''); // 合并连续 ul

    // 11. 恢复代码块
    html = html.replace(/\x00CODE(\d+)\x00/g, function(m, idx) {
      return '<pre class="md-code-block"><code>' + codeBlocks[parseInt(idx)] + '</code></pre>';
    });

    // 12. 清理多余空行
    html = html.replace(/\n{3,}/g, '\n\n');

    return html;
  },
};
