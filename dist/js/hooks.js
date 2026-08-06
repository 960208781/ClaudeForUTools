/**
 * Hooks 管理页面
 * 读取 App.scope / App.projectDir 决定操作范围
 */

const HooksPage = {
  hookEvents: [
    { name: "PreToolUse", desc: "工具调用前触发（安全检查、拦截）", icon: "🔒" },
    { name: "PostToolUse", desc: "工具调用后触发（格式化、lint）", icon: "✅" },
    { name: "Stop", desc: "Claude 停止生成时触发", icon: "🛑" },
    { name: "SessionStart", desc: "会话开始时触发", icon: "🚀" },
    { name: "SessionEnd", desc: "会话结束时触发（清理）", icon: "👋" },
    { name: "Notification", desc: "通知事件触发", icon: "🔔" },
    { name: "DirectoryAdded", desc: "添加目录时触发", icon: "📁" },
    { name: "MessageDisplay", desc: "消息显示时触发", icon: "💬" },
  ],

  hookTemplates: [
    { name: "Prettier 格式化", event: "PostToolUse", matcher: "Edit|Write", command: 'npx prettier --write "$FILE_PATH"' },
    { name: "ESLint 检查", event: "PostToolUse", matcher: "Edit|Write", command: 'npx eslint --fix "$FILE_PATH"' },
    { name: "安全检查 - 禁止 rm -rf", event: "PreToolUse", matcher: "Bash", command: 'echo "$TOOL_INPUT" | grep -q "rm -rf" && echo "禁止使用 rm -rf" && exit 1' },
    { name: "Git 自动提交", event: "Stop", matcher: "", command: 'cd "$PROJECT_DIR" && git add -A && git commit -m "Auto-commit by Claude"' },
  ],

  render(container) {
    const isProject = App.scope === "project" && App.projectDir;
    const scopeHint = isProject
      ? `📁 项目级: ${Utils.baseName(App.projectDir)}`
      : "🌍 全局 (~/.claude/settings.json)";

    container.innerHTML = `
      <div class="card mb-4">
        <div class="card-header">
          <div class="card-title">🪝 Hooks 管理 <span class="text-xs text-muted ml-2">${scopeHint}</span></div>
          <button class="btn sm primary" id="addHookBtn">+ 添加 Hook</button>
        </div>
        <div class="text-xs text-muted mb-3">
          Hooks 在特定生命周期点确定性地执行 shell 命令，不依赖模型行为。适合用于 lint、格式化、安全检查等必须始终执行的操作。
        </div>
        <div id="hooksList"></div>
      </div>

      <div class="card">
        <div class="card-header">
          <div class="card-title">📋 Hook 模板库</div>
          <span class="text-xs text-muted">点击使用模板</span>
        </div>
        <div class="grid grid-2" id="templatesList">
          ${this.hookTemplates.map((t, idx) => `
            <div class="card" data-template="${idx}" style="cursor:pointer">
              <div class="font-bold text-sm">${t.name}</div>
              <div class="text-xs text-muted mt-1">事件: ${t.event} ${t.matcher ? `· 匹配: ${t.matcher}` : ""}</div>
              <div class="text-xs font-mono text-secondary mt-2 break-all">${Utils.escapeHtml(t.command)}</div>
            </div>
          `).join("")}
        </div>
      </div>
    `;

    this.bindEvents();
    this.loadHooks();
  },

  bindEvents() {
    document.getElementById("addHookBtn")?.addEventListener("click", () => this.addHook());
    document.querySelectorAll("[data-template]").forEach((el) => {
      el.addEventListener("click", () => {
        const idx = parseInt(el.dataset.template);
        this.addHook(this.hookTemplates[idx]);
      });
    });
  },

  getConfig() {
    if (App.scope === "project" && !App.projectDir) return {};
    return Utils.apiSync("readConfig", App.getConfigScope(), App.projectDir) || {};
  },

  writeConfig(config) {
    if (App.scope === "project" && !App.projectDir) {
      Utils.toast("请先在顶部选择项目目录", "warning");
      return false;
    }
    const result = Utils.apiSync("writeConfig", App.getConfigScope(), config, App.projectDir);
    return !result?.error;
  },

  loadHooks() {
    const el = document.getElementById("hooksList");

    if (App.scope === "project" && !App.projectDir) {
      el.innerHTML = `<div class="empty-state"><div class="empty-icon">📁</div><div class="empty-text">请先在顶部选择项目目录</div></div>`;
      return;
    }

    const config = this.getConfig();
    const hooks = config?.hooks || {};

    let allHooks = [];
    for (const [event, hookList] of Object.entries(hooks)) {
      if (Array.isArray(hookList)) {
        hookList.forEach((hookGroup, gIdx) => {
          if (hookGroup?.hooks) {
            hookGroup.hooks.forEach((hook, hIdx) => {
              allHooks.push({ event, matcher: hookGroup.matcher || "", command: hook.command || "", type: hook.type || "command", gIdx, hIdx });
            });
          }
        });
      }
    }

    const scopeLabel = App.scope === "project" ? "项目" : "全局";

    if (allHooks.length === 0) {
      el.innerHTML = `<div class="empty-state"><div class="empty-icon">🪝</div><div class="empty-text">${scopeLabel}暂无 Hooks 配置</div></div>`;
      return;
    }

    el.innerHTML = allHooks.map((h) => `
      <div class="list-item">
        <div class="list-item-icon">${this.hookEvents.find((e) => e.name === h.event)?.icon || "🪝"}</div>
        <div class="list-item-content">
          <div class="list-item-title">${h.event} ${h.matcher ? `· ${h.matcher}` : ""}</div>
          <div class="list-item-subtitle font-mono break-all">${Utils.escapeHtml(h.command)}</div>
        </div>
        <div class="list-item-actions">
          <button class="btn ghost sm" data-edit-event="${h.event}" data-edit-gidx="${h.gIdx}" data-edit-hidx="${h.hIdx}">编辑</button>
          <button class="btn ghost sm" data-del-event="${h.event}" data-del-gidx="${h.gIdx}" data-del-hidx="${h.hIdx}">✕</button>
        </div>
      </div>
    `).join("");

    el.querySelectorAll("[data-del-event]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (await Utils.confirm("确定删除此 Hook？")) {
          this.deleteHook(btn.dataset.delEvent, parseInt(btn.dataset.delGidx), parseInt(btn.dataset.delHidx));
        }
      });
    });
    el.querySelectorAll("[data-edit-event]").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.editHook(btn.dataset.editEvent, parseInt(btn.dataset.editGidx), parseInt(btn.dataset.editHidx));
      });
    });
  },

  addHook(template) {
    const scopeLabel = App.scope === "project" ? "项目" : "全局";
    const { overlay, close } = Utils.modal(
      template ? `使用模板: ${template.name} (${scopeLabel})` : `添加 Hook (${scopeLabel})`,
      `
        <div class="flex flex-col gap-3">
          <div>
            <label class="text-sm text-muted">事件类型</label>
            <select class="select mt-1" id="hookEvent">
              ${this.hookEvents.map((e) => `<option value="${e.name}" ${template?.event === e.name ? "selected" : ""}>${e.icon} ${e.name} — ${e.desc}</option>`).join("")}
            </select>
          </div>
          <div>
            <label class="text-sm text-muted">匹配器 (可选, 如 Edit|Write, Bash)</label>
            <input class="input mt-1" id="hookMatcher" value="${template?.matcher || ""}" placeholder="Edit|Write" />
          </div>
          <div>
            <label class="text-sm text-muted">Shell 命令</label>
            <textarea class="textarea mt-1" id="hookCommand" style="min-height:80px">${template?.command || ""}</textarea>
          </div>
          <div class="text-xs text-muted">可用环境变量: $FILE_PATH, $TOOL_INPUT, $PROJECT_DIR, $SESSION_ID</div>
        </div>
      `,
      `<button class="btn" data-cancel>取消</button><button class="btn primary" data-ok>添加</button>`
    );

    overlay.querySelector("[data-ok]").onclick = () => {
      const event = document.getElementById("hookEvent").value;
      const matcher = document.getElementById("hookMatcher").value.trim();
      const command = document.getElementById("hookCommand").value.trim();
      if (!command) { Utils.toast("命令不能为空", "error"); return; }

      const config = this.getConfig();
      if (!config.hooks) config.hooks = {};
      if (!config.hooks[event]) config.hooks[event] = [];
      let group = config.hooks[event].find((g) => g.matcher === matcher);
      if (!group) { group = { matcher, hooks: [] }; config.hooks[event].push(group); }
      group.hooks.push({ type: "command", command });

      if (this.writeConfig(config)) { Utils.toast("Hook 已添加", "success"); close(); this.loadHooks(); }
    };
    overlay.querySelector("[data-cancel]").onclick = close;
  },

  editHook(event, gIdx, hIdx) {
    const config = this.getConfig();
    const hook = config.hooks?.[event]?.[gIdx]?.hooks?.[hIdx];
    const matcher = config.hooks?.[event]?.[gIdx]?.matcher || "";
    if (!hook) return;

    const { overlay, close } = Utils.modal("编辑 Hook",
      `<div class="flex flex-col gap-3">
        <div><label class="text-sm text-muted">事件类型</label>
          <select class="select mt-1" id="hookEvent">${this.hookEvents.map((e) => `<option value="${e.name}" ${event === e.name ? "selected" : ""}>${e.icon} ${e.name}</option>`).join("")}</select></div>
        <div><label class="text-sm text-muted">匹配器</label><input class="input mt-1" id="hookMatcher" value="${Utils.escapeHtml(matcher)}" /></div>
        <div><label class="text-sm text-muted">Shell 命令</label><textarea class="textarea mt-1" id="hookCommand" style="min-height:80px">${Utils.escapeHtml(hook.command || "")}</textarea></div>
      </div>`,
      `<button class="btn" data-cancel>取消</button><button class="btn primary" data-ok>保存</button>`
    );

    overlay.querySelector("[data-ok]").onclick = () => {
      const newEvent = document.getElementById("hookEvent").value;
      const newMatcher = document.getElementById("hookMatcher").value.trim();
      const newCommand = document.getElementById("hookCommand").value.trim();
      if (!newCommand) { Utils.toast("命令不能为空", "error"); return; }

      if (newEvent !== event || newMatcher !== matcher) {
        config.hooks[event][gIdx].hooks.splice(hIdx, 1);
        if (config.hooks[event][gIdx].hooks.length === 0) config.hooks[event].splice(gIdx, 1);
        if (config.hooks[event].length === 0) delete config.hooks[event];
        if (!config.hooks) config.hooks = {};
        if (!config.hooks[newEvent]) config.hooks[newEvent] = [];
        let group = config.hooks[newEvent].find((g) => g.matcher === newMatcher);
        if (!group) { group = { matcher: newMatcher, hooks: [] }; config.hooks[newEvent].push(group); }
        group.hooks.push({ type: "command", command: newCommand });
      } else {
        hook.command = newCommand;
      }

      if (this.writeConfig(config)) { Utils.toast("Hook 已更新", "success"); close(); this.loadHooks(); }
    };
    overlay.querySelector("[data-cancel]").onclick = close;
  },

  deleteHook(event, gIdx, hIdx) {
    const config = this.getConfig();
    if (config.hooks?.[event]?.[gIdx]?.hooks) {
      config.hooks[event][gIdx].hooks.splice(hIdx, 1);
      if (config.hooks[event][gIdx].hooks.length === 0) config.hooks[event].splice(gIdx, 1);
      if (config.hooks[event].length === 0) delete config.hooks[event];
      if (this.writeConfig(config)) { Utils.toast("Hook 已删除", "success"); this.loadHooks(); }
    }
  },
};
