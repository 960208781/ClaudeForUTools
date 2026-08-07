/**
 * MCP 服务器管理页面
 * 读取 App.scope / App.projectDir 决定操作范围
 */

const McpPage = {
  render(container) {
    const isProject = App.scope === "project" && App.projectDir;
    const scopeHint = isProject
      ? `📁 项目级: ${Utils.baseName(App.projectDir)}`
      : "🌍 全局 (~/.claude/.mcp.json)";

    container.innerHTML = `
      <div class="card mb-4">
        <div class="card-header">
          <div class="card-title">🔌 MCP 服务器配置 <span class="text-xs text-muted ml-2">${scopeHint}</span></div>
          <button class="btn sm primary" id="addMcpBtn">+ 添加服务器</button>
        </div>
        <div id="mcpServersList"></div>
      </div>

      <div class="card">
        <div class="card-header">
          <div class="card-title">📄 原始配置文件</div>
          <div class="flex gap-2">
            <button class="btn sm" id="reloadMcp">🔄 重新加载</button>
            <button class="btn sm primary" id="saveMcp">💾 保存</button>
          </div>
        </div>
        <div class="text-xs text-muted mb-2">${isProject ? "项目 .mcp.json" : "全局 ~/.claude/.mcp.json"}</div>
        <textarea class="textarea" id="mcpEditor" style="min-height:300px; font-size:12px;"></textarea>
      </div>
    `;

    this.bindEvents();
    this.loadConfig();
  },

  bindEvents() {
    document.getElementById("addMcpBtn")?.addEventListener("click", () => this.addServer());
    document.getElementById("reloadMcp")?.addEventListener("click", () => this.loadConfig());
    document.getElementById("saveMcp")?.addEventListener("click", () => this.saveConfig());
  },

  loadConfig() {
    const configs = Utils.apiSync("readMCPConfig", App.projectDir);
    this.configs = configs;
    this.renderServerList(configs);
    this.loadEditor();
  },

  renderServerList(configs) {
    const el = document.getElementById("mcpServersList");
    const mcpScope = App.getMcpScope();
    const config = configs?.[mcpScope] || { mcpServers: {} };
    const servers = config.mcpServers || {};
    const scopeLabel = App.scope === "project" ? "项目" : "全局";

    const entries = Object.entries(servers);
    if (entries.length === 0) {
      el.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🔌</div>
          <div class="empty-text">${scopeLabel}暂无 MCP 服务器配置</div>
        </div>
      `;
      return;
    }

    el.innerHTML = entries.map(([name, cfg]) => `
      <div class="list-item" data-server="${Utils.escapeHtml(name)}">
        <div class="list-item-icon">🔌</div>
        <div class="list-item-content">
          <div class="list-item-title">${Utils.escapeHtml(name)}</div>
          <div class="list-item-subtitle">
            ${Utils.escapeHtml(cfg.command || "unknown")}
            ${cfg.args ? " " + Utils.escapeHtml(cfg.args.join(" ")) : ""}
          </div>
        </div>
        <span class="status-badge info">${scopeLabel}</span>
        <div class="list-item-actions">
          <button class="btn ghost sm" data-edit="${Utils.escapeHtml(name)}">编辑</button>
          <button class="btn ghost sm" data-del="${Utils.escapeHtml(name)}">✕</button>
        </div>
      </div>
    `).join("");

    el.querySelectorAll("[data-edit]").forEach((btn) => {
      btn.addEventListener("click", () => this.editServer(btn.dataset.edit));
    });
    el.querySelectorAll("[data-del]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (await Utils.confirm(`确定删除服务器 "${btn.dataset.del}"？`)) {
          this.deleteServer(btn.dataset.del);
        }
      });
    });
    // 右键菜单
    el.querySelectorAll("[data-server]").forEach((item) => {
      item.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        const name = item.dataset.server;
        const cfg = config.mcpServers[name];
        if (cfg) this._showContextMenu(e, name, cfg);
      });
    });
  },

  _showContextMenu(e, name, cfg) {
    const existing = document.querySelector(".ctx-menu");
    if (existing) existing.remove();
    const menu = document.createElement("div");
    menu.className = "ctx-menu";
    menu.style.left = e.clientX + "px";
    menu.style.top = e.clientY + "px";
    const self = this;
    const mcpScope = App.getMcpScope();
    const configPath = mcpScope === "project" && App.projectDir
      ? Utils.apiSync("pathJoin", App.projectDir, ".mcp.json")
      : Utils.apiSync("pathJoin", Utils.apiSync("getClaudeDir"), ".mcp.json");
    menu.innerHTML =
      '<div class="ctx-menu-item" data-act="edit">✏️ 编辑</div>' +
      '<div class="ctx-menu-item" data-act="locate">📂 定位配置文件</div>' +
      '<div class="ctx-menu-item" data-act="copy">📋 复制命令</div>' +
      '<div class="ctx-menu-divider"></div>' +
      '<div class="ctx-menu-item danger" data-act="delete">🗑️ 删除</div>';
    document.body.appendChild(menu);
    menu.querySelectorAll(".ctx-menu-item").forEach((mi) => {
      mi.addEventListener("click", () => {
        const act = mi.dataset.act;
        menu.remove();
        if (act === "edit") self.editServer(name);
        else if (act === "locate") utools.shellShowItemInFolder(configPath);
        else if (act === "copy") {
          const cmd = (cfg.command || "") + " " + ((cfg.args || []).join(" "));
          utools.copyText(cmd.trim());
          Utils.toast("已复制命令", "success");
        }
        else if (act === "delete") {
          Utils.confirm(`确定删除服务器 "${name}"？`).then((ok) => { if (ok) self.deleteServer(name); });
        }
      });
    });
    setTimeout(() => {
      document.addEventListener("click", function close() { menu.remove(); document.removeEventListener("click", close); });
    }, 0);
  },

  loadEditor() {
    const editor = document.getElementById("mcpEditor");
    const mcpScope = App.getMcpScope();
    const config = this.configs?.[mcpScope] || { mcpServers: {} };
    editor.value = JSON.stringify(config, null, 2);
  },

  addServer() {
    const scopeLabel = App.scope === "project" ? "项目" : "全局";
    const { overlay, close } = Utils.modal(
      `添加 MCP 服务器 (${scopeLabel})`,
      `
        <div class="flex flex-col gap-3">
          <div>
            <label class="text-sm text-muted">服务器名称</label>
            <input class="input mt-1" id="mcpName" placeholder="如: github" />
          </div>
          <div>
            <label class="text-sm text-muted">命令</label>
            <input class="input mt-1" id="mcpCommand" placeholder="如: npx" />
          </div>
          <div>
            <label class="text-sm text-muted">参数 (空格分隔)</label>
            <input class="input mt-1" id="mcpArgs" placeholder="如: -y @modelcontextprotocol/server-github" />
          </div>
          <div>
            <label class="text-sm text-muted">环境变量 (JSON 格式, 可选)</label>
            <input class="input mt-1" id="mcpEnv" placeholder='如: {"GITHUB_TOKEN": "xxx"}' />
          </div>
        </div>
      `,
      `<button class="btn" data-cancel>取消</button><button class="btn primary" data-ok>添加</button>`
    );

    overlay.querySelector("[data-ok]").onclick = () => {
      const name = document.getElementById("mcpName").value.trim();
      const command = document.getElementById("mcpCommand").value.trim();
      const args = document.getElementById("mcpArgs").value.trim().split(/\s+/).filter(Boolean);
      const envStr = document.getElementById("mcpEnv").value.trim();

      if (!name || !command) { Utils.toast("名称和命令不能为空", "error"); return; }

      let env = {};
      try { if (envStr) env = JSON.parse(envStr); } catch (e) { Utils.toast("环境变量 JSON 格式错误", "error"); return; }

      const mcpScope = App.getMcpScope();
      const config = this.configs?.[mcpScope] || { mcpServers: {} };
      if (!config.mcpServers) config.mcpServers = {};
      config.mcpServers[name] = { command, args, ...(Object.keys(env).length ? { env } : {}) };

      Utils.apiSync("writeMCPConfig", mcpScope, config, App.projectDir);
      Utils.toast(`服务器 ${name} 已添加`, "success");
      close();
      this.loadConfig();
    };

    overlay.querySelector("[data-cancel]").onclick = close;
  },

  editServer(name) {
    const mcpScope = App.getMcpScope();
    const server = this.configs?.[mcpScope]?.mcpServers?.[name];
    if (!server) return;

    const { overlay, close } = Utils.modal(
      `编辑 ${name}`,
      `
        <div class="flex flex-col gap-3">
          <div>
            <label class="text-sm text-muted">命令</label>
            <input class="input mt-1" id="mcpCommand" value="${Utils.escapeHtml(server.command || "")}" />
          </div>
          <div>
            <label class="text-sm text-muted">参数 (空格分隔)</label>
            <input class="input mt-1" id="mcpArgs" value="${Utils.escapeHtml((server.args || []).join(" "))}" />
          </div>
          <div>
            <label class="text-sm text-muted">环境变量 (JSON)</label>
            <input class="input mt-1" id="mcpEnv" value='${server.env ? JSON.stringify(server.env) : ""}' />
          </div>
        </div>
      `,
      `<button class="btn" data-cancel>取消</button><button class="btn primary" data-ok>保存</button>`
    );

    overlay.querySelector("[data-ok]").onclick = () => {
      server.command = document.getElementById("mcpCommand").value.trim();
      server.args = document.getElementById("mcpArgs").value.trim().split(/\s+/).filter(Boolean);
      const envStr = document.getElementById("mcpEnv").value.trim();
      try { server.env = envStr ? JSON.parse(envStr) : undefined; } catch (e) {}

      Utils.apiSync("writeMCPConfig", mcpScope, this.configs[mcpScope], App.projectDir);
      Utils.toast("已更新", "success");
      close();
      this.loadConfig();
    };

    overlay.querySelector("[data-cancel]").onclick = close;
  },

  deleteServer(name) {
    const mcpScope = App.getMcpScope();
    const config = this.configs?.[mcpScope];
    if (config?.mcpServers?.[name]) {
      delete config.mcpServers[name];
      Utils.apiSync("writeMCPConfig", mcpScope, config, App.projectDir);
      Utils.toast(`服务器 ${name} 已删除`, "success");
      this.loadConfig();
    }
  },

  saveConfig() {
    const editor = document.getElementById("mcpEditor");
    const mcpScope = App.getMcpScope();

    let config;
    try { config = JSON.parse(editor.value); } catch (e) { Utils.toast("JSON 格式错误", "error"); return; }

    Utils.apiSync("writeMCPConfig", mcpScope, config, App.projectDir);
    Utils.toast("配置已保存", "success");
    this.loadConfig();
  },
};
