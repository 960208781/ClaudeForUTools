/**
 * 自定义命令管理页面
 */

const CommandsPage = {
  projectDir: null,
  currentScope: "all",

  commandTemplates: [
    {
      name: "unit-test",
      content: `Generate comprehensive unit tests for $ARGUMENTS.\nInclude edge cases and error handling.\nUse the project's existing test framework.\n`,
    },
    {
      name: "fix-bugs",
      content: `Analyze $ARGUMENTS for bugs and fix them.\nExplain what was wrong and how you fixed it.\n`,
    },
    {
      name: "deploy",
      content: `1. Run tests\n2. Build production bundle\n3. Deploy to $ARGUMENTS environment\n4. Verify deployment\n`,
    },
    {
      name: "handover",
      content: `Create a handover document for the current session:\n- Summary of work done\n- Decisions made\n- Incomplete tasks\n- Pitfalls encountered and lessons learned\nSave as HANDOVER.md.\n`,
    },
    {
      name: "code-review",
      content: `Review the following code thoroughly:\n$ARGUMENTS\n\nCheck for:\n- Security vulnerabilities\n- Performance issues\n- Code style consistency\n- Error handling\n- Test coverage\n\nProvide actionable feedback.\n`,
    },
    {
      name: "refactor",
      content: `Refactor $ARGUMENTS following these principles:\n- Single Responsibility\n- DRY (Don't Repeat Yourself)\n- Clear naming\n- Minimal public API\n\nPreserve all existing behavior.\n`,
    },
  ],

  render(container) {
    container.innerHTML = `
      <div class="flex items-center gap-3 mb-4">
        <div class="tabs" id="cmdsTabBar" style="margin-bottom:0; border:none">
          <div class="tab active" data-scope="all">全部</div>
          <div class="tab" data-scope="user">全局命令</div>
          <div class="tab" data-scope="project">项目命令</div>
        </div>
        <div class="flex-1"></div>
        <button class="btn sm" id="selectProjectDirCmds">📁 项目目录</button>
        <span class="text-sm text-muted" id="cmdsProjectDir">未选择</span>
      </div>

      <div class="grid grid-2 mb-4">
        <div class="card">
          <div class="card-header">
            <div class="card-title">📝 命令列表</div>
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
          <label class="text-sm text-muted">作用域:</label>
          <select class="select" id="cmdScope" style="width:120px">
            <option value="user">全局</option>
            <option value="project">项目</option>
          </select>
        </div>
        <textarea class="textarea" id="cmdContent" style="min-height:200px" placeholder="命令内容...使用 $ARGUMENTS 接收参数"></textarea>
        <div class="text-xs text-muted mt-2">
          命令文件保存在 ~/.claude/commands/ (全局) 或 .claude/commands/ (项目级)<br>
          使用 $ARGUMENTS 或 $0, $1 接收参数。在 Claude 中输入 /命令名 即可调用。
        </div>
      </div>
    `;

    this.bindEvents();
    this.loadCommands();
  },

  bindEvents() {
    document.querySelectorAll('#cmdsTabBar .tab').forEach((el) => {
      el.addEventListener("click", () => {
        document.querySelectorAll('#cmdsTabBar .tab').forEach((t) => t.classList.remove("active"));
        el.classList.add("active");
        this.currentScope = el.dataset.scope;
        this.loadCommands();
      });
    });

    document.getElementById("selectProjectDirCmds")?.addEventListener("click", async () => {
      const result = await Utils.showOpenDialog({
        title: "选择项目目录",
        properties: ["openDirectory"],
      });
      if (result && result[0]) {
        this.projectDir = result[0];
        document.getElementById("cmdsProjectDir").textContent = result[0];
        this.loadCommands();
      }
    });

    document.getElementById("newCmdBtn")?.addEventListener("click", () => {
      document.getElementById("editorCard").style.display = "block";
      document.getElementById("cmdName").value = "";
      document.getElementById("cmdContent").value = "";
      document.getElementById("cmdScope").value = "user";
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
        document.getElementById("cmdScope").value = "user";
        this.editingPath = null;
      });
    });
  },

  loadCommands() {
    const el = document.getElementById("commandsList");
    const commands = Utils.apiSync("listCommands", this.currentScope, this.projectDir);

    if (!commands || commands.length === 0) {
      el.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📝</div>
          <div class="empty-text">暂无自定义命令</div>
        </div>
      `;
      return;
    }

    el.innerHTML = commands.map((cmd) => `
      <div class="list-item" data-cmd-path="${Utils.escapeHtml(cmd.path)}">
        <div class="list-item-icon">📄</div>
        <div class="list-item-content">
          <div class="list-item-title">/${Utils.escapeHtml(cmd.name)}</div>
          <div class="list-item-subtitle">
            ${cmd.scope === "user" ? "全局" : "项目"} · ${Utils.escapeHtml(cmd.description || "无描述")}
          </div>
        </div>
        <span class="status-badge ${cmd.scope === "user" ? "accent" : "purple"}">${cmd.scope === "user" ? "全局" : "项目"}</span>
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
          document.getElementById("cmdScope").value = cmd.scope;
          this.editingPath = cmdPath;
        }
      });
    });
  },

  saveCommand() {
    const name = document.getElementById("cmdName").value.trim();
    const content = document.getElementById("cmdContent").value;
    const scope = document.getElementById("cmdScope").value;

    if (!name) {
      Utils.toast("命令名称不能为空", "error");
      return;
    }

    let dir;
    if (scope === "user") {
      dir = Utils.apiSync("pathJoin", Utils.apiSync("getClaudeDir"), "commands");
    } else {
      if (!this.projectDir) {
        Utils.toast("请先选择项目目录", "warning");
        return;
      }
      dir = Utils.apiSync("pathJoin", this.projectDir, ".claude", "commands");
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
    if (!this.editingPath) {
      Utils.toast("请先选择一个命令", "warning");
      return;
    }
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
