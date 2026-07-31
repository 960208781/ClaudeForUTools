/**
 * 终端页面 — 完整的 Web 终端模拟器
 * 参考 1Panel/宝塔面板方案：在网页里操作真实 shell
 * 直接在终端窗口内输入，支持 ANSI 颜色、多标签、命令历史
 */

const TerminalView = {
  tabs: [],
  activeTabId: null,
  tabCounter: 0,

  render(container) {
    // 从设置加载终端样式
    var termBg = Utils.store.get("termBg", "#0d1117");
    var termFontSize = Utils.store.get("termFontSize", "12");
    var termFontFamily = Utils.store.get("termFontFamily", "monospace");
    var termTextColor = Utils.store.get("termTextColor", "#e6edf3");

    container.innerHTML = `
      <div class="term-view-container">
        <div class="term-view-toolbar">
          <div class="term-view-tabs" id="termViewTabs"></div>
          <button class="btn sm primary" id="termViewNewBtn" title="新建终端">+</button>
          <button class="btn sm" id="termViewClearBtn" title="清屏">🧹</button>
          <button class="btn sm" id="termViewSettingsBtn" title="终端设置">⚙️</button>
        </div>
        <div class="term-view-body" id="termViewBody">
          <div class="term-view-empty">
            <div class="term-view-empty-icon">🖥️</div>
            <div class="term-view-empty-text">点击 + 新建终端</div>
          </div>
        </div>
      </div>

      <div class="modal-overlay" id="termSettingsModal" style="display:none">
        <div class="modal" style="max-width:420px">
          <div class="modal-header">
            <span class="modal-title">终端设置</span>
            <button class="btn ghost sm" id="termSettingsClose">✕</button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <label class="text-sm text-muted">背景色</label>
              <div class="flex gap-2 mt-1">
                <input type="color" class="term-color-picker" id="termBgColor" value="${termBg}" style="width:40px;height:28px;border:1px solid var(--border-color);border-radius:6px;background:none" />
                <input class="input" id="termBgInput" value="${termBg}" style="flex:1" />
              </div>
            </div>
            <div class="mb-3">
              <label class="text-sm text-muted">文字颜色</label>
              <div class="flex gap-2 mt-1">
                <input type="color" class="term-color-picker" id="termTextColorPicker" value="${termTextColor}" style="width:40px;height:28px;border:1px solid var(--border-color);border-radius:6px;background:none" />
                <input class="input" id="termTextInput" value="${termTextColor}" style="flex:1" />
              </div>
            </div>
            <div class="mb-3">
              <label class="text-sm text-muted">字体大小</label>
              <input class="input mt-1" id="termFontSizeInput" type="number" value="${termFontSize}" min="8" max="32" style="width:80px" />
            </div>
            <div class="mb-3">
              <label class="text-sm text-muted">字体</label>
              <select class="select mt-1" id="termFontFamilySelect" style="width:100%">
                <option value="monospace" ${termFontFamily === "monospace" ? "selected" : ""}>系统等宽</option>
                <option value="JetBrains Mono, monospace" ${termFontFamily === "JetBrains Mono, monospace" ? "selected" : ""}>JetBrains Mono</option>
                <option value="Fira Code, monospace" ${termFontFamily === "Fira Code, monospace" ? "selected" : ""}>Fira Code</option>
                <option value="SF Mono, monospace" ${termFontFamily === "SF Mono, monospace" ? "selected" : ""}>SF Mono</option>
                <option value="Consolas, monospace" ${termFontFamily === "Consolas, monospace" ? "selected" : ""}>Consolas</option>
                <option value="Menlo, monospace" ${termFontFamily === "Menlo, monospace" ? "selected" : ""}>Menlo</option>
              </select>
            </div>
            <div class="mb-3">
              <label class="text-sm text-muted">预设主题</label>
              <div class="flex gap-2 flex-wrap mt-1">
                <button class="btn sm term-preset" data-bg="#0d1117" data-fg="#e6edf3" title="GitHub Dark">⬛ GitHub</button>
                <button class="btn sm term-preset" data-bg="#1a1b26" data-fg="#c0caf5" title="Tokyo Night">🔵 Tokyo</button>
                <button class="btn sm term-preset" data-bg="#000000" data-fg="#00ff00" title="Matrix">🟢 Matrix</button>
                <button class="btn sm term-preset" data-bg="#1e1e2e" data-fg="#cdd6f4" title="Catppuccin">🟣 Catppuccin</button>
                <button class="btn sm term-preset" data-bg="#282c34" data-fg="#abb2bf" title="One Dark">⚫ One Dark</button>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn" id="termSettingsCancel">取消</button>
            <button class="btn primary" id="termSettingsSave">💾 保存</button>
          </div>
        </div>
      </div>
    `;
    this.bindEvents();
  },

  bindEvents() {
    document.getElementById("termViewNewBtn")?.addEventListener("click", () => this.newTab());
    document.getElementById("termViewClearBtn")?.addEventListener("click", () => this.clearActive());
    document.getElementById("termViewSettingsBtn")?.addEventListener("click", () => {
      document.getElementById("termSettingsModal").style.display = "flex";
    });
    document.getElementById("termSettingsClose")?.addEventListener("click", () => {
      document.getElementById("termSettingsModal").style.display = "none";
    });
    document.getElementById("termSettingsCancel")?.addEventListener("click", () => {
      document.getElementById("termSettingsModal").style.display = "none";
    });

    // 颜色选择器同步
    document.getElementById("termBgColor")?.addEventListener("input", (e) => {
      document.getElementById("termBgInput").value = e.target.value;
    });
    document.getElementById("termTextColorPicker")?.addEventListener("input", (e) => {
      document.getElementById("termTextInput").value = e.target.value;
    });
    document.getElementById("termBgInput")?.addEventListener("input", (e) => {
      document.getElementById("termBgColor").value = e.target.value;
    });
    document.getElementById("termTextInput")?.addEventListener("input", (e) => {
      document.getElementById("termTextColorPicker").value = e.target.value;
    });

    // 预设主题
    document.querySelectorAll(".term-preset").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.getElementById("termBgInput").value = btn.dataset.bg;
        document.getElementById("termBgColor").value = btn.dataset.bg;
        document.getElementById("termTextInput").value = btn.dataset.fg;
        document.getElementById("termTextColorPicker").value = btn.dataset.fg;
      });
    });

    // 保存设置
    document.getElementById("termSettingsSave")?.addEventListener("click", () => {
      Utils.store.set("termBg", document.getElementById("termBgInput").value);
      Utils.store.set("termTextColor", document.getElementById("termTextInput").value);
      Utils.store.set("termFontSize", document.getElementById("termFontSizeInput").value);
      Utils.store.set("termFontFamily", document.getElementById("termFontFamilySelect").value);
      document.getElementById("termSettingsModal").style.display = "none";
      this.applyTerminalStyle();
      Utils.toast("终端设置已保存", "success");
    });

    this.applyTerminalStyle();
  },

  applyTerminalStyle() {
    var bg = Utils.store.get("termBg", "#0d1117");
    var fg = Utils.store.get("termTextColor", "#e6edf3");
    var fontSize = Utils.store.get("termFontSize", "12");
    var fontFamily = Utils.store.get("termFontFamily", "monospace");
    var output = document.getElementById("termViewOutput");
    if (output) {
      output.style.background = bg;
      output.style.color = fg;
      output.style.fontSize = fontSize + "px";
      output.style.fontFamily = fontFamily;
    }
  },

  newTab(workDir) {
    if (!workDir) workDir = Utils.store.get("defaultWorkDir", "") || Utils.apiSync("getHomeDir");
    
    const result = Utils.apiSync("startShell", workDir);
    if (!result || result.error) {
      Utils.toast("启动终端失败", "error");
      return;
    }

    const tabId = `tview_${++this.tabCounter}`;
    const tab = {
      id: tabId,
      procId: result.procId,
      workDir: workDir,
      title: workDir.split("/").pop() || "终端",
      output: "",
      history: [],
      historyIndex: -1,
      inputBuffer: "",
    };

    this.tabs.push(tab);
    this.activeTabId = tabId;

    this.renderTabs();
    this.renderTerminal(tab);

    // 注册输出回调
    Utils.apiSync("onShellOutput", result.procId, (data) => {
      this.handleOutput(tabId, data);
    });
  },

  renderTabs() {
    const el = document.getElementById("termViewTabs");
    if (!el) return;
    if (this.tabs.length === 0) {
      el.innerHTML = "";
      return;
    }
    el.innerHTML = this.tabs.map(t => `
      <div class="term-view-tab ${t.id === this.activeTabId ? "active" : ""}" data-tv-tab="${t.id}">
        <span class="term-view-tab-name">${Utils.escapeHtml(t.title)}</span>
        <span class="term-view-tab-close" data-tv-close="${t.id}">✕</span>
      </div>
    `).join("");

    el.querySelectorAll("[data-tv-tab]").forEach(el => {
      el.addEventListener("click", (e) => {
        if (e.target.dataset.tvClose) {
          this.closeTab(e.target.dataset.tvClose);
        } else {
          this.switchTab(el.dataset.tvTab);
        }
      });
    });
  },

  renderTerminal(tab) {
    const body = document.getElementById("termViewBody");
    if (!body) return;

    // 直接在终端窗口内输入，没有单独的输入框
    // contenteditable=true 允许输入法（中文/日文等）组合输入
    body.innerHTML = `
      <div class="term-view-output" id="termViewOutput" tabindex="0" contenteditable="true" spellcheck="false"></div>
    `;

    const output = document.getElementById("termViewOutput");

    // 阻止 contenteditable 的默认插入行为 — 我们只通过事件处理
    output.addEventListener("input", function(e) {
      if (!composing) {
        e.preventDefault();
      }
    });
    
    // 显示已有输出
    if (tab.output) {
      output.innerHTML = this.renderOutput(tab.output);
      output.scrollTop = output.scrollHeight;
    }

    // 键盘输入直接发送到 shell
    const self = this;
    var composing = false; // 是否正在使用输入法组合

    // 阻止 contenteditable 的所有默认插入行为
    output.addEventListener("beforeinput", function(e) {
      e.preventDefault();
    });
    output.addEventListener("input", function(e) {
      e.preventDefault();
    });

    // 输入法组合开始
    output.addEventListener("compositionstart", function(e) {
      composing = true;
    });

    // 输入法组合结束 — 发送组合完成的文字
    output.addEventListener("compositionend", function(e) {
      composing = false;
      // 清除 contenteditable 可能插入的 DOM 节点
      self._cleanDOM(output);
      if (e.data && tab.procId) {
        tab.inputBuffer += e.data;
        self._appendWithCursor(tab.id, e.data);
        Utils.apiSync("sendShellInput", tab.procId, e.data);
      }
    });

    output.addEventListener("keydown", function(e) {
      if (!tab.procId) return;
      if (composing) return;
      e.preventDefault(); // 阻止 contenteditable 默认行为

      // 拦截 claude 命令
      if (e.key === "Enter") {
        const cmd = tab.inputBuffer.trim();
        if (cmd === "claude" || cmd.startsWith("claude ") && !cmd.includes(" -p") && !cmd.includes(" --print")) {
          self._removeCursor(output);
          self.appendOutput(tab.id, "\n⚠️ Claude CLI 在 Web 终端中无法进入交互模式（需要真实 TTY）。\n💡 请使用左侧「对话」页面，或使用：claude -p \"问题\"\n\n", "stderr");
          tab.inputBuffer = "";
          return;
        }
        tab.inputBuffer += "\n";
        if (tab.inputBuffer.trim()) {
          tab.history.push(tab.inputBuffer.trim());
          tab.historyIndex = tab.history.length;
        }
        self._removeCursor(output);
        self.appendOutput(tab.id, "\n", "stdout");
        Utils.apiSync("sendShellInput", tab.procId, "\n");
        tab.inputBuffer = "";
        return;
      }

      // 可打印字符
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && !e.isComposing) {
        tab.inputBuffer += e.key;
        self._appendWithCursor(tab.id, e.key);
        Utils.apiSync("sendShellInput", tab.procId, e.key);
        return;
      }

      // Backspace
      if (e.key === "Backspace") {
        e.preventDefault();
        if (tab.inputBuffer.length > 0) {
          tab.inputBuffer = tab.inputBuffer.slice(0, -1);
          // 发送 DEL (0x7f)
          Utils.apiSync("sendShellInput", tab.procId, "\x7f");
          // 在输出区删除最后一个字符（跳过光标元素）
          var children = output.childNodes;
          for (var ci = children.length - 1; ci >= 0; ci--) {
            var node = children[ci];
            if (node.classList && node.classList.contains("term-inline-cursor")) continue;
            if (node.nodeType === 3) {
              node.textContent = node.textContent.slice(0, -1);
              if (node.textContent === "") node.remove();
            } else if (node) {
              node.remove();
            }
            break;
          }
        }
        return;
      }

      // Tab 补全
      if (e.key === "Tab") {
        e.preventDefault();
        Utils.apiSync("sendShellInput", tab.procId, "\t");
        return;
      }

      // Ctrl+C
      if (e.key === "c" && e.ctrlKey) {
        e.preventDefault();
        Utils.apiSync("sendShellInput", tab.procId, "\x03");
        tab.inputBuffer = "";
        return;
      }

      // Ctrl+L 清屏
      if (e.key === "l" && e.ctrlKey) {
        e.preventDefault();
        self.clearActive();
        Utils.apiSync("sendShellInput", tab.procId, "\x0c");
        return;
      }

      // Ctrl+D 退出
      if (e.key === "d" && e.ctrlKey) {
        e.preventDefault();
        Utils.apiSync("sendShellInput", tab.procId, "\x04");
        return;
      }

      // ↑ 历史上一条
      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (tab.historyIndex > 0) {
          // 清除当前输入
          if (tab.inputBuffer) {
            for (var i = 0; i < tab.inputBuffer.length; i++) {
              Utils.apiSync("sendShellInput", tab.procId, "\x7f");
            }
          }
          tab.historyIndex--;
          const cmd = tab.history[tab.historyIndex];
          tab.inputBuffer = cmd;
          Utils.apiSync("sendShellInput", tab.procId, cmd);
          // 刷新显示
          output.innerHTML = self.renderOutput(tab.output + cmd);
          output.scrollTop = output.scrollHeight;
        }
        return;
      }

      // ↓ 历史下一条
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (tab.inputBuffer) {
          for (var i = 0; i < tab.inputBuffer.length; i++) {
            Utils.apiSync("sendShellInput", tab.procId, "\x7f");
          }
        }
        if (tab.historyIndex < tab.history.length - 1) {
          tab.historyIndex++;
          const cmd = tab.history[tab.historyIndex];
          tab.inputBuffer = cmd;
          Utils.apiSync("sendShellInput", tab.procId, cmd);
        } else {
          tab.historyIndex = tab.history.length;
          tab.inputBuffer = "";
        }
        output.innerHTML = self.renderOutput(tab.output);
        output.scrollTop = output.scrollHeight;
        return;
      }

      // 左右方向键
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        Utils.apiSync("sendShellInput", tab.procId, "\x1b[D");
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        Utils.apiSync("sendShellInput", tab.procId, "\x1b[C");
        return;
      }
    });

    // 点击聚焦
    output.addEventListener("click", () => {
      output.focus();
    });

    output.focus();
  },

  // 带内联光标的输出 — 文字后面跟一个闪烁光标
  _appendWithCursor(tabId, text) {
    var tab = this.tabs.find(t => t.id === tabId);
    if (!tab) return;
    tab.output += text;
    if (tabId !== this.activeTabId) return;
    var output = document.getElementById("termViewOutput");
    if (!output) return;

    // 移除已有的光标
    var oldCursor = output.querySelector(".term-inline-cursor");
    if (oldCursor) oldCursor.remove();

    // 添加文字
    var html = Utils.ansiToHtml(text);
    output.insertAdjacentHTML("beforeend", '<span class="term-stdout">' + html + '</span>');
    // 在文字后面添加内联光标
    output.insertAdjacentHTML("beforeend", '<span class="term-inline-cursor"></span>');
    output.scrollTop = output.scrollHeight;
  },

  // 清除 contenteditable 可能插入的 DOM 节点（br, div, 文本节点等）
  _cleanDOM(output) {
    if (!output) return;
    // 移除所有非 span 的子节点（contenteditable 会插入 br/div）
    var toRemove = [];
    for (var i = 0; i < output.childNodes.length; i++) {
      var node = output.childNodes[i];
      if (node.nodeType === 1) { // Element
        if (node.tagName === "BR" || node.tagName === "DIV") {
          toRemove.push(node);
        }
      } else if (node.nodeType === 3) { // Text node — 检查是否是我们插入的 span 内的
        // 如果文本节点是直接子节点（不在 span 内），说明是 contenteditable 插入的
        // 保留 span 内的文本节点
        if (node.parentElement === output) {
          toRemove.push(node);
        }
      }
    }
    toRemove.forEach(function(n) { n.remove(); });
  },

  // 移除内联光标
  _removeCursor(output) {
    if (!output) return;
    var cursor = output.querySelector(".term-inline-cursor");
    if (cursor) cursor.remove();
  },

  // 渲染输出 — 清除控制字符，保留 ANSI 颜色
  renderOutput(text) {
    if (!text) return "";
    // 先用 ansiToHtml 处理颜色
    var html = Utils.ansiToHtml(text);
    // 清除残留的控制序列
    html = html.replace(/\x1b\[\d*[A-Z]/g, "");
    html = html.replace(/\x1b\][^\x07]*\x07/g, "");
    html = html.replace(/\x1b\[[\d;]*m/g, function(m) {
      // 已被 ansiToHtml 处理的不再出现，残留的直接删除
      return "";
    });
    return html;
  },

  handleOutput(tabId, data) {
    const tab = this.tabs.find(t => t.id === tabId);
    if (!tab) return;

    if (data.stream === "close") {
      this.appendOutput(tabId, "\n[进程已退出, 代码: " + data.data + "]\n", "muted");
      tab.procId = null;
      return;
    }

    if (data.stream === "error") {
      this.appendOutput(tabId, "[错误: " + data.data + "]\n", "stderr");
      return;
    }

    const text = data.data;
    // 过滤控制字符但保留 ANSI 颜色码
    const cleanText = text.replace(/\x1b\[\d*[A-Z]/g, "").replace(/\x1b\][^\x07]*\x07/g, "");
    tab.output += cleanText;

    if (tabId === this.activeTabId) {
      this.appendOutput(tabId, cleanText, data.stream === "stderr" ? "stderr" : "stdout");
    }
  },

  appendOutput(tabId, text, className) {
    className = className || "stdout";
    const tab = this.tabs.find(t => t.id === tabId);
    if (!tab) return;

    if (tabId !== this.activeTabId) return;
    const output = document.getElementById("termViewOutput");
    if (!output) return;

    const html = Utils.ansiToHtml(text);
    output.insertAdjacentHTML("beforeend", '<span class="term-' + className + '">' + html + "</span>");
    output.scrollTop = output.scrollHeight;
  },

  switchTab(tabId) {
    this.activeTabId = tabId;
    const tab = this.tabs.find(t => t.id === tabId);
    if (!tab) return;

    const output = document.getElementById("termViewOutput");
    if (output) {
      output.innerHTML = this.renderOutput(tab.output);
      output.scrollTop = output.scrollHeight;
      output.focus();
    }
    this.renderTabs();
  },

  closeTab(tabId) {
    const tab = this.tabs.find(t => t.id === tabId);
    if (tab && tab.procId) {
      Utils.apiSync("killShell", tab.procId);
    }
    this.tabs = this.tabs.filter(t => t.id !== tabId);

    if (this.activeTabId === tabId) {
      if (this.tabs.length > 0) {
        this.switchTab(this.tabs[0].id);
      } else {
        this.activeTabId = null;
        const body = document.getElementById("termViewBody");
        if (body) {
          body.innerHTML = `
            <div class="term-view-empty">
              <div class="term-view-empty-icon">🖥️</div>
              <div class="term-view-empty-text">点击 + 新建终端</div>
            </div>
          `;
        }
      }
    }
    this.renderTabs();
  },

  clearActive() {
    if (!this.activeTabId) return;
    const tab = this.tabs.find(t => t.id === this.activeTabId);
    if (!tab) return;
    tab.output = "";
    tab.inputBuffer = "";
    const output = document.getElementById("termViewOutput");
    if (output) output.innerHTML = "";
  },

  cleanup() {
    for (const tab of this.tabs) {
      if (tab.procId) Utils.apiSync("killShell", tab.procId);
    }
    this.tabs = [];
    this.activeTabId = null;
  },
};
