/**
 * MCP 服务器管理页面
 */

const McpPage = {
  projectDir: null,

  render(container) {
    container.innerHTML = `
      <div class="flex items-center gap-3 mb-4">
        <button class="btn sm" id="selectProjectBtn">📁 选择项目目录</button>
        <span class="text-sm text-muted" id="mcpProjectDir">查看全局配置</span>
      </div>

      <div class="card mb-4">
        <div class="card-header">
          <div class="card-title">🔌 MCP 服务器配置</div>
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
        <div class="tabs" id="mcpTabs">
          <div class="tab active" data-scope="global">全局 (~/.claude/.mcp.json)</div>
          <div class="tab" data-scope="project">项目级 (.mcp.json)</div>
        </div>
        <textarea class="textarea" id="mcpEditor" style="min-height:300px; font-size:12px;"></textarea>
      </div>
    `;

    this.bindEvents();
    this.loadConfig();
  },

  bindEvents() {
    document.getElementById("selectProjectBtn")?.addEventListener("click", async () => {
      const result = await Utils.showOpenDialog({
        title: "选择项目目录",
        properties: ["openDirectory"],
      });
      if (result && result[0]) {
        this.projectDir = result[0];
        document.getElementById("mcpProjectDir").textContent = result[0];
        this.loadConfig();
        // 自动切换到项目级 tab
        document.querySelectorAll("#mcpTabs .tab").forEach((t) => t.classList.remove("active"));
        const projectTab = document.querySelector('#mcpTabs .tab[data-scope="project"]');
        if (projectTab) projectTab.classList.add("active");
        this.loadEditor("project");
      }
    });

    document.getElementById("addMcpBtn")?.addEventListener("click", () => this.addServer());
    document.getElementById("reloadMcp")?.addEventListener("click", () => this.loadConfig());
    document.getElementById("saveMcp")?.addEventListener("click", () => this.saveConfig());

    document.querySelectorAll("#mcpTabs .tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        document.querySelectorAll("#mcpTabs .tab").forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        this.loadEditor(tab.dataset.scope);
      });
    });
  },

  loadConfig() {
    const configs = Utils.apiSync("readMCPConfig", this.projectDir);
    this.configs = configs;
    this.renderServerList(configs);
    this.loadEditor("global");
  },

  renderServerList(configs) {
    const el = document.getElementById("mcpServersList");
    const allServers = [];

    if (configs.global?.mcpServers) {
      Object.entries(configs.global.mcpServers).forEach(([name, config]) => {
        allServers.push({ name, config, scope: "全局" });
      });
    }
    if (configs.project?.mcpServers) {
      Object.entries(configs.project.mcpServers).forEach(([name, config]) => {
        allServers.push({ name, config, scope: "项目" });
      });
    }

    if (allServers.length === 0) {
      el.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🔌</div>
          <div class="empty-text">暂无 MCP 服务器配置</div>
        </div>
      `;
      return;
    }

    el.innerHTML = allServers.map((s) => `
      <div class="list-item">
        <div class="list-item-icon">🔌</div>
        <div class="list-item-content">
          <div class="list-item-title">${Utils.escapeHtml(s.name)}</div>
          <div class="list-item-subtitle">
            ${s.scope} · ${Utils.escapeHtml(s.config.command || "unknown")}
            ${s.config.args ? " " + Utils.escapeHtml(s.config.args.join(" ")) : ""}
          </div>
        </div>
        <span class="status-badge info">${s.scope}</span>
        <div class="list-item-actions">
          <button class="btn ghost sm" data-edit="${Utils.escapeHtml(s.name)}" data-scope="${s.scope}">编辑</button>
          <button class="btn ghost sm" data-del="${Utils.escapeHtml(s.name)}" data-scope="${s.scope}">✕</button>
        </div>
      </div>
    `).join("");

    el.querySelectorAll("[data-edit]").forEach((btn) => {
      btn.addEventListener("click", () => this.editServer(btn.dataset.edit, btn.dataset.scope));
    });
    el.querySelectorAll("[data-del]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (await Utils.confirm(`确定删除服务器 "${btn.dataset.del}"？`)) {
          this.deleteServer(btn.dataset.del, btn.dataset.scope);
        }
      });
    });
  },

  loadEditor(scope) {
    const editor = document.getElementById("mcpEditor");
    const config = this.configs?.[scope] || { mcpServers: {} };
    editor.value = JSON.stringify(config, null, 2);
  },

  addServer() {
    const { overlay, close } = Utils.modal(
      "添加 MCP 服务器",
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
          <div>
            <label class="text-sm text-muted">作用域</label>
            <select class="select mt-1" id="mcpScope">
              <option value="global">全局</option>
              <option value="project">项目</option>
            </select>
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
      const scope = document.getElementById("mcpScope").value;

      if (!name || !command) {
        Utils.toast("名称和命令不能为空", "error");
        return;
      }

      let env = {};
      try { if (envStr) env = JSON.parse(envStr); } catch (e) {
        Utils.toast("环境变量 JSON 格式错误", "error");
        return;
      }

      const config = this.configs[scope] || { mcpServers: {} };
      if (!config.mcpServers) config.mcpServers = {};
      config.mcpServers[name] = { command, args, ...(Object.keys(env).length ? { env } : {}) };

      Utils.apiSync("writeMCPConfig", scope, config, this.projectDir);
      Utils.toast(`服务器 ${name} 已添加`, "success");
      close();
      this.loadConfig();
    };

    overlay.querySelector("[data-cancel]").onclick = close;
  },

  editServer(name, scope) {
    const scopeKey = scope === "全局" ? "global" : "project";
    const server = this.configs[scopeKey]?.mcpServers?.[name];
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
      try {
        server.env = envStr ? JSON.parse(envStr) : undefined;
      } catch (e) {}

      Utils.apiSync("writeMCPConfig", scopeKey, this.configs[scopeKey], this.projectDir);
      Utils.toast("已更新", "success");
      close();
      this.loadConfig();
    };

    overlay.querySelector("[data-cancel]").onclick = close;
  },

  deleteServer(name, scope) {
    const scopeKey = scope === "全局" ? "global" : "project";
    const config = this.configs[scopeKey];
    if (config?.mcpServers?.[name]) {
      delete config.mcpServers[name];
      Utils.apiSync("writeMCPConfig", scopeKey, config, this.projectDir);
      Utils.toast(`服务器 ${name} 已删除`, "success");
      this.loadConfig();
    }
  },

  saveConfig() {
    const editor = document.getElementById("mcpEditor");
    const activeTab = document.querySelector("#mcpTabs .tab.active");
    const scope = activeTab?.dataset.scope || "global";

    let config;
    try {
      config = JSON.parse(editor.value);
    } catch (e) {
      Utils.toast("JSON 格式错误", "error");
      return;
    }

    Utils.apiSync("writeMCPConfig", scope, config, this.projectDir);
    Utils.toast("配置已保存", "success");
    this.loadConfig();
  },
};
