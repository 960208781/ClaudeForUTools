/**
 * Skills 管理页面
 * 读取 App.scope / App.projectDir 决定操作范围
 */

const SkillsPage = {
  skillTemplates: [
    {
      name: "code-reviewer",
      desc: "代码审查 — 自动检查安全漏洞、性能问题、代码风格",
      content: "# Code Reviewer\n\n> Automatically review code for security, performance, and style issues.\n\n## When to apply\nWhen the user asks to review code or before committing changes.\n\n## Instructions\n- Check for security vulnerabilities (SQL injection, XSS, etc.)\n- Identify performance bottlenecks\n- Verify error handling coverage\n- Check naming conventions and code style\n- Suggest improvements with specific code examples",
    },
    {
      name: "git-workflow",
      desc: "Git 工作流 — 规范化提交信息、分支管理",
      content: "# Git Workflow\n\n> Enforce consistent git commit messages and branch naming.\n\n## Commit format\n- `feat:` new feature\n- `fix:` bug fix\n- `refactor:` code restructuring\n- `docs:` documentation\n- `test:` test changes\n- `chore:` build/tooling\n\n## Branch naming\n- `feature/description`\n- `fix/issue-number`\n- `refactor/description`",
    },
    {
      name: "api-designer",
      desc: "API 设计 — RESTful 最佳实践、OpenAPI 规范",
      content: "# API Designer\n\n> Design RESTful APIs following best practices.\n\n## Rules\n- Use plural nouns for resources: /users, /orders\n- HTTP methods: GET=list/read, POST=create, PUT=update, DELETE=remove\n- Version in URL: /api/v1/\n- Return appropriate status codes\n- Include pagination for list endpoints\n- Document with OpenAPI 3.0",
    },
    {
      name: "test-writer",
      desc: "测试编写 — 自动生成单元测试、集成测试",
      content: "# Test Writer\n\n> Generate comprehensive tests automatically.\n\n## Strategy\n- Use the project's existing test framework\n- Cover happy path, edge cases, and error scenarios\n- Mock external dependencies\n- Aim for >80% coverage on new code\n- Follow AAA pattern: Arrange, Act, Assert",
    },
    {
      name: "security-auditor",
      desc: "安全审计 — 检查常见安全漏洞和合规问题",
      content: "# Security Auditor\n\n> Audit code for security vulnerabilities.\n\n## Checks\n- Input validation and sanitization\n- Authentication and authorization\n- SQL injection prevention\n- XSS prevention\n- Sensitive data exposure\n- Dependency vulnerabilities\n- OWASP Top 10 compliance",
    },
  ],

  render(container) {
    const isProject = App.scope === "project" && App.projectDir;
    const scopeHint = isProject
      ? `📁 项目级: ${Utils.baseName(App.projectDir)}`
      : "🌍 全局 (~/.claude/skills/)";

    container.innerHTML = `
      <div class="grid grid-2 mb-3">
        <div class="card">
          <div class="card-header">
            <div class="card-title">✨ 已安装的 Skills <span class="text-xs text-muted ml-2">${scopeHint}</span></div>
            <button class="btn sm primary" id="newSkillBtn">+ 新建</button>
          </div>
          <div id="skillsList"></div>
        </div>
        <div class="card">
          <div class="card-header">
            <div class="card-title">📋 Skill 模板库</div>
            <span class="text-xs text-muted">点击使用模板创建</span>
          </div>
          <div id="templatesList">
            ${this.skillTemplates.map((t, idx) => `
              <div class="list-item" data-tpl="${idx}">
                <div class="list-item-icon">📝</div>
                <div class="list-item-content">
                  <div class="list-item-title">${t.name}</div>
                  <div class="list-item-subtitle">${Utils.escapeHtml(t.desc)}</div>
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      </div>
      <div class="card" id="skillDetailCard" style="display:none">
        <div class="card-header">
          <div class="card-title">📖 Skill 详情</div>
          <button class="btn sm primary" id="saveSkillBtn">💾 保存</button>
        </div>
        <div class="flex items-center gap-2 mb-2">
          <label class="text-sm text-muted">名称:</label>
          <input class="input" id="skillName" placeholder="skill-name" style="flex:1" />
        </div>
        <textarea class="textarea" id="skillContent" style="min-height:200px" placeholder="SKILL.md 内容..."></textarea>
        <div class="text-xs text-muted mt-2">
          保存位置: ${isProject ? `.claude/skills/skill-name/SKILL.md (项目级)` : `~/.claude/skills/skill-name/SKILL.md (全局)`}
        </div>
      </div>
    `;

    this.bindEvents();
    this.loadSkills();
  },

  bindEvents() {
    document.getElementById("newSkillBtn")?.addEventListener("click", () => {
      document.getElementById("skillDetailCard").style.display = "block";
      document.getElementById("skillName").value = "";
      document.getElementById("skillContent").value = "# New Skill\n\n> Description here\n\n## When to apply\nDescribe when this skill should be activated.\n\n## Instructions\n- Instruction 1\n- Instruction 2";
    });
    document.getElementById("saveSkillBtn")?.addEventListener("click", () => this.saveSkill());
    document.querySelectorAll("[data-tpl]").forEach((el) => {
      el.addEventListener("click", () => {
        const idx = parseInt(el.dataset.tpl);
        const t = this.skillTemplates[idx];
        document.getElementById("skillDetailCard").style.display = "block";
        document.getElementById("skillName").value = t.name;
        document.getElementById("skillContent").value = t.content;
      });
    });
  },

  loadSkills() {
    const el = document.getElementById("skillsList");

    if (App.scope === "project" && !App.projectDir) {
      el.innerHTML = `<div class="empty-state"><div class="empty-icon">📁</div><div class="empty-text">请先在顶部选择项目目录</div></div>`;
      return;
    }

    const projectDir = App.scope === "project" ? App.projectDir : null;
    const skills = Utils.apiSync("listSkills", projectDir);
    this.skills = skills;
    if (!skills || skills.length === 0) {
      el.innerHTML = '<div class="empty-state"><div class="empty-icon">✨</div><div class="empty-text">暂无 Skills</div><div class="text-xs text-muted mt-2">使用右侧模板创建</div></div>';
      return;
    }
    el.innerHTML = skills.map((skill) => `
      <div class="list-item" data-skill="${Utils.escapeHtml(skill.dirName)}">
        <div class="list-item-icon">✨</div>
        <div class="list-item-content">
          <div class="list-item-title">${Utils.escapeHtml(skill.name)}</div>
          <div class="list-item-subtitle">${Utils.escapeHtml(skill.description || "无描述")}</div>
        </div>
      </div>
    `).join("");
    el.querySelectorAll("[data-skill]").forEach((item) => {
      item.addEventListener("click", () => {
        const dirName = item.dataset.skill;
        const skill = skills.find((s) => s.dirName === dirName);
        this.showDetail(skill);
      });
      item.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        const dirName = item.dataset.skill;
        const skill = skills.find((s) => s.dirName === dirName);
        if (skill) this._showContextMenu(e, skill);
      });
    });
  },

  _showContextMenu(e, skill) {
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
      '<div class="ctx-menu-item" data-act="copy">📋 复制名称</div>' +
      '<div class="ctx-menu-divider"></div>' +
      '<div class="ctx-menu-item danger" data-act="delete">🗑️ 删除</div>';
    document.body.appendChild(menu);
    menu.querySelectorAll(".ctx-menu-item").forEach((mi) => {
      mi.addEventListener("click", () => {
        const act = mi.dataset.act;
        menu.remove();
        if (act === "edit") self.showDetail(skill);
        else if (act === "locate" && skill.skillMdPath) utools.shellShowItemInFolder(skill.skillMdPath);
        else if (act === "locate" && skill.path) utools.shellShowItemInFolder(skill.path);
        else if (act === "copy") { utools.copyText(skill.dirName); Utils.toast("已复制: " + skill.dirName, "success"); }
        else if (act === "delete") {
          Utils.confirm('确定删除 Skill "' + skill.dirName + '"？此操作不可恢复。').then((ok) => {
            if (ok) {
              Utils.apiSync("deleteSkill", skill.dirName, App.scope === "project" ? App.projectDir : null);
              Utils.toast("Skill 已删除", "success");
              self.loadSkills();
            }
          });
        }
      });
    });
    setTimeout(() => {
      document.addEventListener("click", function close() { menu.remove(); document.removeEventListener("click", close); });
    }, 0);
  },

  showDetail(skill) {
    document.getElementById("skillDetailCard").style.display = "block";
    document.getElementById("skillName").value = skill.dirName;
    document.getElementById("skillContent").value = skill.content || "";
  },

  saveSkill() {
    const name = document.getElementById("skillName").value.trim();
    const content = document.getElementById("skillContent").value;
    if (!name) { Utils.toast("名称不能为空", "error"); return; }

    if (App.scope === "project" && !App.projectDir) {
      Utils.toast("请先在顶部选择项目目录", "warning");
      return;
    }

    const projectDir = App.scope === "project" ? App.projectDir : null;
    const baseDir = projectDir
      ? Utils.apiSync("pathJoin", projectDir, ".claude", "skills")
      : Utils.apiSync("pathJoin", Utils.apiSync("getClaudeDir"), "skills");
    const skillDir = Utils.apiSync("pathJoin", baseDir, name);
    const skillMdPath = Utils.apiSync("pathJoin", skillDir, "SKILL.md");
    Utils.apiSync("writeFile", skillMdPath, content);
    Utils.toast("Skill 已保存", "success");
    this.loadSkills();
  },
};