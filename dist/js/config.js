/**
 * 配置管理页面
 */

const ConfigPage = {
  currentLevel: "user",
  projectDir: null,

  render(container) {
    var self = this;
    var levels = [
      ["user", "用户级 (~/.claude/settings.json)"],
      ["project", "项目级 (.claude/settings.json)"],
      ["local", "本地级 (.claude/settings.local.json)"],
      ["state", "状态文件 (~/.claude.json)"],
      ["claudemd", "CLAUDE.md"]
    ];
    var tabsHtml = levels.map(function(l) {
      return '<div class="tab ' + (l[0] === self.currentLevel ? "active" : "") + '" data-level="' + l[0] + '">' + l[1] + '</div>';
    }).join("");

    container.innerHTML = `
      <div class="tabs" id="configTabs">
        ${tabsHtml}
      </div>

      <div id="configContent">
        <div class="flex items-center gap-3 mb-3" id="projectDirSelector" style="display:none">
          <button class="btn sm" id="selectProjectDir">📁 选择项目目录</button>
          <span class="text-sm text-muted" id="projectDirDisplay">未选择</span>
        </div>

        <div class="card">
          <div class="card-header">
            <div class="card-title" id="configTitle">用户级配置</div>
            <div class="flex gap-2">
              <button class="btn sm" id="reloadConfig">🔄 重新加载</button>
              <button class="btn sm primary" id="saveConfig">💾 保存</button>
            </div>
          </div>
          <textarea class="textarea" id="configEditor" style="min-height:400px; font-size:12px;"></textarea>
        </div>
      </div>

      <div class="card mt-4" id="permissionsCard">
        <div class="card-header">
          <div class="card-title">🔐 权限管理</div>
          <span class="text-xs text-muted">可视化编辑 allow / deny / ask 列表</span>
        </div>
        <div class="grid grid-3">
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-bold text-success">✅ Allow (允许)</span>
              <button class="btn ghost sm" data-add-perm="allow">+ 添加</button>
            </div>
            <div id="permAllow" class="flex flex-col gap-1"></div>
          </div>
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-bold text-danger">🚫 Deny (拒绝)</span>
              <button class="btn ghost sm" data-add-perm="deny">+ 添加</button>
            </div>
            <div id="permDeny" class="flex flex-col gap-1"></div>
          </div>
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-bold text-warning">❓ Ask (询问)</span>
              <button class="btn ghost sm" data-add-perm="ask">+ 添加</button>
            </div>
            <div id="permAsk" class="flex flex-col gap-1"></div>
          </div>
        </div>
      </div>

      <div class="card mt-4">
        <div class="card-header">
          <div class="card-title">🌍 环境变量</div>
          <span class="text-xs text-muted">当前检测到的 Claude 相关环境变量</span>
        </div>
        <div id="envVarsList"></div>
      </div>
    `;

    this.bindEvents();
    this.loadConfig();
    this.loadEnvVars();
  },

  bindEvents() {
    document.querySelectorAll("#configTabs .tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        document.querySelectorAll("#configTabs .tab").forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        this.currentLevel = tab.dataset.level;

        const projectSelector = document.getElementById("projectDirSelector");
        const claudemdCard = document.getElementById("configContent");

        if (this.currentLevel === "project" || this.currentLevel === "local" || this.currentLevel === "claudemd") {
          projectSelector.style.display = "flex";
        } else {
          projectSelector.style.display = "none";
        }

        this.loadConfig();
      });
    });

    document.getElementById("selectProjectDir")?.addEventListener("click", async () => {
      const result = await Utils.showOpenDialog({
        title: "选择项目目录",
        properties: ["openDirectory"],
      });
      if (result && result[0]) {
        this.projectDir = result[0];
        document.getElementById("projectDirDisplay").textContent = result[0];
        this.loadConfig();
      }
    });

    document.getElementById("reloadConfig")?.addEventListener("click", () => this.loadConfig());
    document.getElementById("saveConfig")?.addEventListener("click", () => this.saveConfig());

    // 权限添加
    document.querySelectorAll("[data-add-perm]").forEach((btn) => {
      btn.addEventListener("click", () => this.addPermission(btn.dataset.addPerm));
    });
  },

  loadConfig() {
    const editor = document.getElementById("configEditor");
    const title = document.getElementById("configTitle");
    const claudemdCard = document.querySelector("#permissionsCard");

    if (this.currentLevel === "claudemd") {
      title.textContent = this.projectDir ? `CLAUDE.md (项目: ${this.projectDir})` : "CLAUDE.md (用户级)";
      claudemdCard.style.display = "none";
      const scope = this.projectDir ? "project" : "user";
      const result = Utils.apiSync("readCLAUDEmd", scope, this.projectDir);
      editor.value = result.content || "";
      return;
    }

    claudemdCard.style.display = "block";
    const titles = {
      user: "用户级配置 (~/.claude/settings.json)",
      project: "项目级配置 (.claude/settings.json)",
      local: "本地级配置 (.claude/settings.local.json)",
      state: "状态文件 (~/.claude.json)",
    };
    title.textContent = titles[this.currentLevel] || "配置";

    if ((this.currentLevel === "project" || this.currentLevel === "local") && !this.projectDir) {
      editor.value = "请先选择项目目录";
      return;
    }

    const config = Utils.apiSync("readConfig", this.currentLevel, this.projectDir);
    editor.value = JSON.stringify(config, null, 2);

    // 渲染权限
    this.renderPermissions(config);
  },

  renderPermissions(config) {
    const perms = config?.permissions || {};
    const render = (list, containerId, color) => {
      const el = document.getElementById(containerId);
      if (!list || list.length === 0) {
        el.innerHTML = `<div class="text-xs text-muted">暂无</div>`;
        return;
      }
      el.innerHTML = list.map((item, idx) => `
        <div class="flex items-center gap-2 p-2" style="background:var(--bg-tertiary); border-radius:6px;">
          <span class="text-sm font-mono flex-1 break-all">${Utils.escapeHtml(item)}</span>
          <button class="btn ghost sm" data-del-perm="${containerId}" data-idx="${idx}">✕</button>
        </div>
      `).join("");

      el.querySelectorAll("[data-del-perm]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const idx = parseInt(btn.dataset.idx);
          list.splice(idx, 1);
          this.saveConfigFromPermissions();
          this.renderPermissions(this.getCurrentConfig());
        });
      });
    };

    render(perms.allow || [], "permAllow", "success");
    render(perms.deny || [], "permDeny", "danger");
    render(perms.ask || [], "permAsk", "warning");
  },

  getCurrentConfig() {
    try {
      return JSON.parse(document.getElementById("configEditor").value);
    } catch (e) {
      return {};
    }
  },

  addPermission(type) {
    const { overlay, close } = Utils.modal(
      `添加 ${type} 权限`,
      `
        <div class="mb-2 text-sm text-muted">支持的格式：Read, Edit, Bash(npm:*), mcp__github, Write(src/**)</div>
        <input class="input" id="permInput" placeholder="输入权限规则..." autofocus />
      `,
      `<button class="btn" data-cancel>取消</button><button class="btn primary" data-ok>添加</button>`
    );

    overlay.querySelector("[data-ok]").onclick = () => {
      const value = document.getElementById("permInput").value.trim();
      if (!value) return;
      const config = this.getCurrentConfig();
      if (!config.permissions) config.permissions = {};
      if (!config.permissions[type]) config.permissions[type] = [];
      config.permissions[type].push(value);
      document.getElementById("configEditor").value = JSON.stringify(config, null, 2);
      this.renderPermissions(config);
      close();
    };

    overlay.querySelector("[data-cancel]").onclick = close;
    document.getElementById("permInput").addEventListener("keydown", (e) => {
      if (e.key === "Enter") overlay.querySelector("[data-ok]").click();
    });
  },

  saveConfigFromPermissions() {
    const config = this.getCurrentConfig();
    // 权限已经被修改，保存到 editor
    document.getElementById("configEditor").value = JSON.stringify(config, null, 2);
  },

  saveConfig() {
    const editor = document.getElementById("configEditor");
    let config;
    try {
      config = JSON.parse(editor.value);
    } catch (e) {
      Utils.toast("JSON 格式错误: " + e.message, "error");
      return;
    }

    if (this.currentLevel === "claudemd") {
      const scope = this.projectDir ? "project" : "user";
      const result = Utils.apiSync("writeCLAUDEmd", scope, editor.value, this.projectDir);
      if (result.error) {
        Utils.toast("保存失败: " + result.error, "error");
      } else {
        Utils.toast("CLAUDE.md 已保存", "success");
      }
      return;
    }

    const result = Utils.apiSync("writeConfig", this.currentLevel, config, this.projectDir);
    if (result.error) {
      Utils.toast("保存失败: " + result.error, "error");
    } else {
      Utils.toast("配置已保存", "success");
    }
  },

  loadEnvVars() {
    const el = document.getElementById("envVarsList");
    const vars = Utils.apiSync("getEnvVars");
    const descriptions = {
      ANTHROPIC_API_KEY: "API 密钥",
      ANTHROPIC_MODEL: "默认模型覆盖",
      ANTHROPIC_DEFAULT_OPUS_MODEL: "Opus 模型 ID",
      ANTHROPIC_DEFAULT_SONNET_MODEL: "Sonnet 模型 ID",
      ANTHROPIC_DEFAULT_HAIKU_MODEL: "Haiku 模型 ID",
      CLAUDE_CODE_USE_BEDROCK: "使用 AWS Bedrock",
      CLAUDE_CODE_USE_VERTEX: "使用 Google Vertex AI",
      CLAUDE_CODE_USE_FOUNDRY: "使用 Microsoft Foundry",
      AWS_REGION: "AWS 区域",
      CLAUDE_CODE_SUBAGENT_MODEL: "子代理模型",
      MAX_THINKING_TOKENS: "最大思考 Token",
      DISABLE_AUTOUPDATER: "禁用自动更新",
      DISABLE_TELEMETRY: "禁用遥测",
      HTTP_PROXY: "HTTP 代理",
      HTTPS_PROXY: "HTTPS 代理",
      CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: "启用 Agent Teams",
    };

    if (Object.keys(vars).length === 0) {
      el.innerHTML = `<div class="text-muted text-sm">未检测到 Claude 相关环境变量</div>`;
      return;
    }

    el.innerHTML = Object.entries(vars).map(([key, value]) => {
      const isSecret = key.includes("KEY") || key.includes("TOKEN");
      const displayValue = isSecret ? "••••••••" : Utils.escapeHtml(value);
      return `
        <div class="flex items-center justify-between p-2 mb-1" style="background:var(--bg-tertiary); border-radius:6px;">
          <div>
            <span class="font-mono text-sm font-bold">${Utils.escapeHtml(key)}</span>
            <span class="text-xs text-muted ml-2">${descriptions[key] || ""}</span>
          </div>
          <span class="font-mono text-sm text-secondary">${displayValue}</span>
        </div>
      `;
    }).join("");
  },
};
