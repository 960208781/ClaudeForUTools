/**
 * 自定义命令管理页面
 * 读取 App.scope / App.projectDir 决定操作范围
 */

const CommandsPage = {
  commandTemplates: [
    { name: "unit-test", content: `Generate comprehensive unit tests for $ARGUMENTS.\nInclude edge cases and error handling.\nUse the project's existing test framework.\n` },
    { name: "fix-bugs", content: `Analyze $ARGUMENTS for bugs and fix them.\nExplain what was wrong and how you fixed it.\n` },
    { name: "deploy", content: `1. Run tests\n2. Build production bundle\n3. Deploy to $ARGUMENTS environment\n4. Verify deployment\n` },
    { name: "handover", content: `Create a handover document for the current session:\n- Summary of work done\n- Decisions made\n- Incomplete tasks\n- Pitfalls encountered and lessons learned\nSave as HANDOVER.md.\n` },
    { name: "code-review", content: `Review the following code thoroughly:\n$ARGUMENTS\n\nCheck for:\n- Security vulnerabilities\n- Performance issues\n- Code style consistency\n- Error handling\n- Test coverage\n\nProvide actionable feedback.\n` },
    { name: "refactor", content: `Refactor $ARGUMENTS following these principles:\n- Single Responsibility\n- DRY (Don't Repeat Yourself)\n- Clear naming\n- Minimal public API\n\nPreserve all existing behavior.\n` },
  ],

  render(container) {
    const isProject = App.scope === "project" && App.projectDir;
    const scopeHint = isProject
      ? `📁 项目级: ${Utils.baseName(App.projectDir)}`
      : "🌍 全局 (~/.claude/commands/)";

    container.innerHTML = `
      <div class="grid grid-2 mb-4">
        <div class="card">
          <div class="card-header">
            <div class="card-title">📝 命令列表 <span class="text-xs text-muted ml-2">${scopeHint}</span></div>
            <button class="btn sm primary" id="newCmdBtn">+ 新建命令</button>
          </div>
          <div id="commandsList"></div>
        </div>
        <div class="card">
          <div class="card-header">
            <div class="card-title">📋 模板库</div>
            <span class="text-xs text-muted">点击使用</span>
          </div>
          <div id="templatesList">
            ${this.commandTemplates.map((t, idx) => `
              <div class="list-item" data-template="${idx}">
                <div class="list-item-icon">📄</div>
                <div class="list-item-content">
                  <div class="list-item-title">/${t.name}</div>
                  <div class="list-item-subtitle">${Utils.escapeHtml(t.content.split("\n")[0])}</div>
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      </div>

      <div class="card" id="editorCard" style="display:none">
        <div class="card-header">
          <div class="card-title">✏️ 编辑命令</div>
          <div class="flex gap-2">
            <button class="btn sm danger" id="deleteCmdBtn">🗑️ 删除</button>
            <button class="btn sm primary" id="saveCmdBtn">💾 保存</button>
          </div>
        </div>
        <div class="flex items-center gap-2 mb-2">
          <label class="text-sm text-muted">命令名称:</label>
          <input class="input" id="cmdName" placeholder="如: unit-test" style="flex:1" />
        </div>
        <textarea class="textarea" id="cmdContent" style="min-height:200px" placeholder="命令内容...使用 $ARGUMENTS 接收参数"></textarea>
        <div class="text-xs text-muted mt-2">
          保存位置: ${isProject ? `.claude/commands/ (项目级)` : `~/.claude/commands/ (全局)`}<br>
          使用 $ARGUMENTS 或 $0, $1 接收参数。在 Claude 中输入 /命令名 即可调用。
        </div>
      </div>
    `;

    this.bindEvents();
    this.loadCommands();
  },

  bindEvents() {
    document.getElementById("newCmdBtn")?.addEventListener("click", () => {
      document.getElementById("editorCard").style.display = "block";
      document.getElementById("cmdName").value = "";
      document.getElementById("cmdContent").value = "";
      this.editingPath = null;
    });
    document.getElementById("saveCmdBtn")?.addEventListener("click", () => this.saveCommand());
    document.getElementById("deleteCmdBtn")?.addEventListener("click", () => this.deleteCommand());
    document.querySelectorAll("[data-template]").forEach((el) => {
      el.addEventListener("click", () => {
        const idx = parseInt(el.dataset.template);
        const tmpl = this.commandTemplates[idx];
        document.getElementById("editorCard").style.display = "block";
        document.getElementById("cmdName").value = tmpl.name;
        document.getElementById("cmdContent").value = tmpl.content;
        this.editingPath = null;
      });
    });
  },

  loadCommands() {
    const el = document.getElementById("commandsList");

    if (App.scope === "project" && !App.projectDir) {
      el.innerHTML = `<div class="empty-state"><div class="empty-icon">📁</div><div class="empty-text">请先在顶部选择项目目录</div></div>`;
      return;
    }

    const scope = App.scope; // user or project
    const commands = Utils.apiSync("listCommands", scope, App.projectDir);

    if (!commands || commands.length === 0) {
      el.innerHTML = `<div class="empty-state"><div class="empty-icon">📝</div><div class="empty-text">暂无自定义命令</div></div>`;
      return;
    }

    el.innerHTML = commands.map((cmd) => `
      <div class="list-item" data-cmd-path="${Utils.escapeHtml(cmd.path)}">
        <div class="list-item-icon">📄</div>
        <div class="list-item-content">
          <div class="list-item-title">/${Utils.escapeHtml(cmd.name)}</div>
          <div class="list-item-subtitle">${Utils.escapeHtml(cmd.description || "无描述")}</div>
        </div>
        <span class="status-badge accent">${App.scope === "project" ? "项目" : "全局"}</span>
      </div>
    `).join("");

    el.querySelectorAll("[data-cmd-path]").forEach((item) => {
      item.addEventListener("click", () => {
        const cmdPath = item.dataset.cmdPath;
        const cmd = commands.find((c) => c.path === cmdPath);
        if (cmd) {
          document.getElementById("editorCard").style.display = "block";
          document.getElementById("cmdName").value = cmd.name;
          document.getElementById("cmdContent").value = cmd.content;
          this.editingPath = cmdPath;
        }
      });
      item.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        const cmdPath = item.dataset.cmdPath;
        const cmd = commands.find((c) => c.path === cmdPath);
        if (cmd) this._showContextMenu(e, cmd);
      });
    });
  },

  _showContextMenu(e, cmd) {
    const existing = document.querySelector(".ctx-menu");
    if (existing) existing.remove();
    const menu = document.createElement("div");
    menu.className = "ctx-menu";
    menu.style.left = e.clientX + "px";
    menu.style.top = e.clientY + "px";
    const self = this;
    menu.innerHTML =
      '<div class="ctx-menu-item" data-act="edit">✏️ 编辑</div>' +
      '<div class="ctx-menu-item" data-act="locate">📂 定位文件</div>' +
      '<div class="ctx-menu-item" data-act="copy">📋 复制命令名</div>' +
      '<div class="ctx-menu-divider"></div>' +
      '<div class="ctx-menu-item danger" data-act="delete">🗑️ 删除</div>';
    document.body.appendChild(menu);
    menu.querySelectorAll(".ctx-menu-item").forEach((mi) => {
      mi.addEventListener("click", () => {
        const act = mi.dataset.act;
        menu.remove();
        if (act === "edit") {
          document.getElementById("editorCard").style.display = "block";
          document.getElementById("cmdName").value = cmd.name;
          document.getElementById("cmdContent").value = cmd.content;
          self.editingPath = cmd.path;
        }
        else if (act === "locate") utools.shellShowItemInFolder(cmd.path);
        else if (act === "copy") { utools.copyText("/" + cmd.name); Utils.toast("已复制: /" + cmd.name, "success"); }
        else if (act === "delete") {
          Utils.confirm(`确定删除命令 /${cmd.name}？`).then((ok) => {
            if (ok) {
              Utils.apiSync("deleteCommand", cmd.path);
              Utils.toast("命令已删除", "success");
              self.loadCommands();
            }
          });
        }
      });
    });
    setTimeout(() => {
      document.addEventListener("click", function close() { menu.remove(); document.removeEventListener("click", close); });
    }, 0);
  },

  saveCommand() {
    const name = document.getElementById("cmdName").value.trim();
    const content = document.getElementById("cmdContent").value;
    if (!name) { Utils.toast("命令名称不能为空", "error"); return; }

    if (App.scope === "project" && !App.projectDir) {
      Utils.toast("请先在顶部选择项目目录", "warning");
      return;
    }

    let dir;
    if (App.scope === "project" && App.projectDir) {
      dir = Utils.apiSync("pathJoin", App.projectDir, ".claude", "commands");
    } else {
      dir = Utils.apiSync("pathJoin", Utils.apiSync("getClaudeDir"), "commands");
    }

    const filePath = Utils.apiSync("pathJoin", dir, `${name}.md`);
    const result = Utils.apiSync("writeCommand", filePath, content);

    if (result.error) {
      Utils.toast("保存失败: " + result.error, "error");
    } else {
      Utils.toast(`命令 /${name} 已保存`, "success");
      this.editingPath = filePath;
      this.loadCommands();
    }
  },

  async deleteCommand() {
    if (!this.editingPath) { Utils.toast("请先选择一个命令", "warning"); return; }
    if (await Utils.confirm(`确定删除此命令？`)) {
      const result = Utils.apiSync("deleteCommand", this.editingPath);
      if (result.error) {
        Utils.toast("删除失败", "error");
      } else {
        Utils.toast("命令已删除", "success");
        document.getElementById("editorCard").style.display = "none";
        this.editingPath = null;
        this.loadCommands();
      }
    }
  },
};