/**
 * 市场页面 — MCP 服务器 / Skills / 命令 一键安装
 * 读取 App.scope / App.projectDir 决定安装范围
 */

const MarketPage = {
  currentTab: "mcp",
  searchText: "",
  category: "all",

  mcpData: [
    { name: "filesystem", icon: "📁", category: "文件", desc: "安全文件操作，支持配置访问控制", command: "npx", args: ["-y", "@modelcontextprotocol/server-filesystem"], env: {}, needsConfig: true, configHint: "在 args 末尾添加允许访问的目录绝对路径，如 /Users/you/Projects", github: "https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem" },
    { name: "memory", icon: "🧠", category: "知识", desc: "基于知识图谱的持久化记忆系统", command: "npx", args: ["-y", "@modelcontextprotocol/server-memory"], env: {}, github: "https://github.com/modelcontextprotocol/servers/tree/main/src/memory" },
    { name: "sequential-thinking", icon: "💭", category: "推理", desc: "通过思维序列进行动态和反思性问题解决", command: "npx", args: ["-y", "@modelcontextprotocol/server-sequential-thinking"], env: {}, github: "https://github.com/modelcontextprotocol/servers/tree/main/src/sequentialthinking" },
    { name: "fetch", icon: "🌐", category: "网络", desc: "Web 内容抓取和转换，优化 LLM 使用", command: "npx", args: ["-y", "@modelcontextprotocol/server-fetch"], env: {}, github: "https://github.com/modelcontextprotocol/servers/tree/main/src/fetch" },
    { name: "git", icon: "🔧", category: "开发", desc: "读取、搜索和操作 Git 仓库", command: "uvx", args: ["mcp-server-git"], env: {}, github: "https://github.com/modelcontextprotocol/servers/tree/main/src/git" },
    { name: "time", icon: "⏰", category: "工具", desc: "时间和时区转换能力", command: "npx", args: ["-y", "@modelcontextprotocol/server-time"], env: {}, github: "https://github.com/modelcontextprotocol/servers/tree/main/src/time" },
    { name: "everything", icon: "🧪", category: "工具", desc: "参考/测试服务器，包含 prompts、resources 和 tools", command: "npx", args: ["-y", "@modelcontextprotocol/server-everything"], env: {}, github: "https://github.com/modelcontextprotocol/servers/tree/main/src/everything" },
    { name: "github", icon: "🐙", category: "开发", desc: "GitHub 仓库管理、文件操作、API 集成", command: "npx", args: ["-y", "@modelcontextprotocol/server-github"], env: { GITHUB_PERSONAL_ACCESS_TOKEN: "<your-token>" }, needsEnv: true, github: "https://github.com/modelcontextprotocol/servers-archived/tree/main/src/github" },
    { name: "gitlab", icon: "🦊", category: "开发", desc: "GitLab API，项目管理", command: "npx", args: ["-y", "@modelcontextprotocol/server-gitlab"], env: { GITLAB_PERSONAL_ACCESS_TOKEN: "<your-token>" }, needsEnv: true, github: "https://github.com/modelcontextprotocol/servers-archived/tree/main/src/gitlab" },
    { name: "brave-search", icon: "🔍", category: "搜索", desc: "使用 Brave Search API 进行网页和本地搜索", command: "npx", args: ["-y", "@modelcontextprotocol/server-brave-search"], env: { BRAVE_API_KEY: "<your-key>" }, needsEnv: true, github: "https://github.com/brave/brave-search-mcp-server" },
    { name: "google-drive", icon: "📂", category: "文件", desc: "Google Drive 文件访问和搜索", command: "npx", args: ["-y", "@modelcontextprotocol/server-gdrive"], env: {}, github: "https://github.com/modelcontextprotocol/servers-archived/tree/main/src/gdrive" },
    { name: "google-maps", icon: "🗺️", category: "位置", desc: "位置服务、路线和地点详情", command: "npx", args: ["-y", "@modelcontextprotocol/server-google-maps"], env: { GOOGLE_MAPS_API_KEY: "<your-key>" }, needsEnv: true, github: "https://github.com/modelcontextprotocol/servers-archived/tree/main/src/google-maps" },
    { name: "postgres", icon: "🐘", category: "数据库", desc: "只读数据库访问，支持 schema 检查", command: "npx", args: ["-y", "@modelcontextprotocol/server-postgres"], env: {}, needsConfig: true, configHint: "在 args 末尾添加 PostgreSQL 连接字符串，如 postgresql://localhost/mydb", github: "https://github.com/modelcontextprotocol/servers-archived/tree/main/src/postgres" },
    { name: "sqlite", icon: "📦", category: "数据库", desc: "SQLite 数据库交互和商业智能", command: "uvx", args: ["mcp-server-sqlite"], env: {}, needsConfig: true, configHint: "在 args 末尾添加 SQLite 数据库文件路径", github: "https://github.com/modelcontextprotocol/servers-archived/tree/main/src/sqlite" },
    { name: "puppeteer", icon: "🎭", category: "网络", desc: "浏览器自动化和网页抓取", command: "npx", args: ["-y", "@modelcontextprotocol/server-puppeteer"], env: {}, github: "https://github.com/modelcontextprotocol/servers-archived/tree/main/src/puppeteer" },
    { name: "sentry", icon: "🐛", category: "监控", desc: "从 Sentry.io 检索和分析问题", command: "npx", args: ["-y", "@modelcontextprotocol/server-sentry"], env: { SENTRY_AUTH_TOKEN: "<your-token>" }, needsEnv: true, github: "https://github.com/modelcontextprotocol/servers-archived/tree/main/src/sentry" },
    { name: "slack", icon: "💬", category: "通信", desc: "Slack 频道管理和消息能力", command: "npx", args: ["-y", "@modelcontextprotocol/server-slack"], env: { SLACK_BOT_TOKEN: "<your-token>" }, needsEnv: true, github: "https://github.com/modelcontextprotocol/servers-archived/tree/main/src/slack" },
    { name: "redis", icon: "🔴", category: "数据库", desc: "与 Redis 键值存储交互", command: "npx", args: ["-y", "@modelcontextprotocol/server-redis"], env: {}, needsConfig: true, configHint: "在 args 末尾添加 Redis 连接 URL，如 redis://localhost:6379", github: "https://github.com/modelcontextprotocol/servers-archived/tree/main/src/redis" },
    { name: "everart", icon: "🎨", category: "AI", desc: "使用各种模型进行 AI 图像生成", command: "npx", args: ["-y", "@modelcontextprotocol/server-everart"], env: { EVERART_API_KEY: "<your-key>" }, needsEnv: true, github: "https://github.com/modelcontextprotocol/servers-archived/tree/main/src/everart" },
    { name: "aws-kb-retrieval", icon: "☁️", category: "云服务", desc: "使用 Bedrock Agent Runtime 从 AWS Knowledge Base 检索", command: "npx", args: ["-y", "@modelcontextprotocol/server-aws-kb-retrieval"], env: { AWS_ACCESS_KEY_ID: "<your-key>", AWS_SECRET_ACCESS_KEY: "<your-secret>" }, needsEnv: true, github: "https://github.com/modelcontextprotocol/servers-archived/tree/main/src/aws-kb-retrieval-server" },
  ],

  skillData: [
    { name: "code-reviewer", icon: "🔍", category: "代码质量", desc: "代码审查 — 自动检查安全漏洞、性能问题、代码风格", content: "# Code Reviewer\n\n> Automatically review code for security, performance, and style issues.\n\n## When to apply\nWhen the user asks to review code or before committing changes.\n\n## Instructions\n- Check for security vulnerabilities (SQL injection, XSS, etc.)\n- Identify performance bottlenecks\n- Verify error handling coverage\n- Check naming conventions and code style\n- Suggest improvements with specific code examples\n- Verify input validation and output encoding\n- Check for race conditions and concurrency issues" },
    { name: "git-workflow", icon: "🌿", category: "开发流程", desc: "Git 工作流 — 规范化提交信息、分支管理", content: "# Git Workflow\n\n> Enforce consistent git commit messages and branch naming.\n\n## Commit format\n- `feat:` new feature\n- `fix:` bug fix\n- `refactor:` refactor\n- `docs:` doc\n- `test:` test\n- `chore:` build/tooling\n\n## Branch naming\n- `feature/desc`\n- `fix/issue`\n\n## Instructions\n- Check current branch before committing\n- Ensure tests pass before pushing\n- Use conventional commit format" },
    { name: "api-designer", icon: "🔌", category: "架构", desc: "API 设计 — RESTful 最佳实践、OpenAPI 规范", content: "# API Designer\n\n> Design RESTful APIs following best practices.\n\n## Rules\n- Use plural nouns for resources: /users, /orders\n- HTTP methods: GET=list, POST=create, PUT=update, DELETE=remove\n- Version in URL: /api/v1/\n- Return appropriate status codes\n- Document with OpenAPI 3.0" },
    { name: "test-writer", icon: "🧪", category: "测试", desc: "测试编写 — 自动生成单元测试、集成测试", content: "# Test Writer\n\n> Generate comprehensive tests automatically.\n\n## Strategy\n- Use the project's existing test framework\n- Cover happy path, edge cases, and error scenarios\n- Mock external dependencies\n- Aim for >80% coverage on new code\n- Follow AAA pattern: Arrange, Act, Assert" },
    { name: "security-auditor", icon: "🔒", category: "安全", desc: "安全审计 — 检查常见安全漏洞和合规问题", content: "# Security Auditor\n\n> Audit code for security vulnerabilities.\n\n## Checks\n- Input validation and sanitization\n- AuthN/AuthZ\n- SQL injection prevention\n- XSS prevention\n- Sensitive data exposure\n- Dependency vulnerabilities\n- OWASP Top 10 compliance" },
    { name: "performance-optimizer", icon: "⚡", category: "性能", desc: "性能优化 — 识别瓶颈、优化算法和数据库查询", content: "# Performance Optimizer\n\n> Identify and fix performance bottlenecks.\n\n## Focus\n- Database query optimization (N+1, missing indexes)\n- Algorithmic complexity\n- Memory leaks, excessive allocations\n- Caching opportunities\n- Lazy loading binaries\n- API payload optimization\n- Connection pooling" },
    { name: "doc-generator", icon: "📚", category: "文档", desc: "文档生成 — 自动生成 API 文档、README、代码注释", content: "# Documentation Generator\n\n> Generate comprehensive documentation.\n\n## Output\n- API docs with examples\n- README with setup + usage\n- Comments for complex logic\n- ADR (Architecture Decision Records)\n- Changelog entries\n- Inline docstrings" },
    { name: "refactor-assistant", icon: "♻️", category: "代码质量", desc: "重构助手 — 遵循 SOLID 原则进行代码重构", content: "# Refactor Assistant\n\n> Refactor code following clean code principles.\n\n## Principles\n- Single Responsibility\n- DRY\n- Clear naming\n- Minimal public API\n- Composition over inheritance\n- Extract methods when too complex\n- Remove dead code\n- Preserve behavior" },
    { name: "docker-helper", icon: "🐳", category: "DevOps", desc: "Docker 助手 — Dockerfile 编写、容器优化、编排", content: "# Docker Helper\n\n> Assist with containerization.\n\n## Capabilities\n- Optimized Dockerfiles (multi-stage)\n- Base image recommendation\n- Layer caching\n- docker-compose.yml\n- Health checks\n- Non-root user best practice" },
    { name: "ci-cd-setup", icon: "🔄", category: "DevOps", desc: "CI/CD 配置 — GitHub Actions、自动化流水线", content: "# CI/CD Setup\n\n> Configure CI/CD pipelines.\n\n## Pipelines\n- GitHub Actions workflows\n- Build/test/lint stages\n- Matrix testing\n- Dependency caching\n- Deployment\n- Secret management" },
    { name: "data-modeler", icon: "📊", category: "架构", desc: "数据建模 — schema 设计、ER 图、迁移", content: "# Data Modeler\n\n> Design database schemas.\n\n## Output\n- SQL schema with constraints\n- Migrations (up/down)\n- Index recommendations\n- Relationship definitions\n- Normalization analysis" },
    { name: "i18n-helper", icon: "🌍", category: "工具", desc: "国际化助手 — 多语言支持、翻译提取", content: "# i18n Helper\n\n> Assist with internationalization.\n\n## Tasks\n- Extract hardcoded strings\n- Generate locale files\n- Detect RTL requirements\n- Suggest translation keys\n- Handle pluralization" },
  ],

  commandData: [
    { name: "unit-test", icon: "🧪", category: "测试", desc: "生成全面的单元测试", content: "Generate comprehensive unit tests for $ARGUMENTS.\nInclude edge cases and error handling.\nUse the project's existing test framework.\nEnsure >80% coverage." },
    { name: "fix-bugs", icon: "🐛", category: "调试", desc: "分析并修复代码中的 bug", content: "Analyze $ARGUMENTS for bugs and fix them.\nExplain what was wrong and how it's fixed.\nAdd a regression test." },
    { name: "deploy", icon: "🚀", category: "DevOps", desc: "部署到指定环境", content: "1. Run tests\n2. Build production\n3. Deploy to $ARGUMENTS\n4. Verify health\n5. Report status" },
    { name: "handover", icon: "📋", category: "文档", desc: "生成交接文档", content: "Create a project handover doc:\n- Work done\n- Decisions made\n- Incomplete tasks\n- Lessons learned\nSave as HANDOVER.md." },
    { name: "code-review", icon: "👀", category: "代码质量", desc: "全面代码审查", content: "Review $ARGUMENTS thoroughly.\nCheck:\n- Security vulns\n- Performance\n- Style consistency\n- Error handling\n- Test coverage\n\nProvide actionable feedback." },
    { name: "refactor", icon: "♻️", category: "代码质量", desc: "按 SOLID 原则重构", content: "Refactor $ARGUMENTS:\n- Single Responsibility\n- DRY\n- Clear naming\n- Minimal API\n\nPreserve behavior." },
    { name: "explain", icon: "📖", category: "学习", desc: "解释代码逻辑", content: "Explain $ARGUMENTS in detail:\n- Overall purpose & design\n- Key functions\n- Data flow\n- Gotchas" },
    { name: "optimize", icon: "⚡", category: "性能", desc: "优化性能瓶颈", content: "Analyze & optimize $ARGUMENTS:\n1. Profile\n2. Identify bottlenecks\n3. Implement fixes\n4. Benchmark before/after" },
    { name: "changelog", icon: "📝", category: "文档", desc: "生成变更日志", content: "Generate changelog from git history:\n1. git log\n2. Categorize (features/fixes/breaking)\n3. Format per Keep a Changelog\n4. Append to CHANGELOG.md" },
    { name: "security-check", icon: "🔒", category: "安全", desc: "安全漏洞扫描", content: "Security audit of $ARGUMENTS:\n- Input validation\n- Auth issues\n- Injection\n- Sensitive data\n- Dependency vulns" },
  ],

  render(container) {
    const isProject = App.scope === "project" && App.projectDir;
    const scopeHint = isProject
      ? `📁 项目级: ${Utils.baseName(App.projectDir)}`
      : "🌍 全局";

    container.innerHTML = `
      <div class="flex items-center gap-3 mb-1">
        <div class="tabs" id="marketTabs" style="margin-bottom:0; border:none">
          <div class="tab active" data-tab="mcp">🔌 MCP</div>
          <div class="tab" data-tab="skill">✨ Skills</div>
          <div class="tab" data-tab="command">📝 命令</div>
        </div>
        <span class="text-xs text-muted ml-2" id="marketScopeHint">${scopeHint}</span>
      </div>
      <div class="flex items-center gap-3 mb-4 mt-2">
        <input class="input" id="marketSearch" placeholder="🔍 搜索..." style="flex:1" value="${this.searchText}" />
        <select class="select" id="marketCategory" style="width:150px"><option value="all">全部分类</option></select>
      </div>
      <div id="marketGrid" class="market-grid"></div>
    `;

    this.bindEvents();
    this.renderGrid();
  },

  bindEvents() {
    document.querySelectorAll("#marketTabs .tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        document.querySelectorAll("#marketTabs .tab").forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        this.currentTab = tab.dataset.tab;
        this.searchText = "";
        this.category = "all";
        const searchEl = document.getElementById("marketSearch");
        if (searchEl) searchEl.value = "";
        this.updateCategories();
        this.renderGrid();
      });
    });
    document.getElementById("marketSearch")?.addEventListener("input", (e) => { this.searchText = e.target.value.toLowerCase(); this.renderGrid(); });
    document.getElementById("marketCategory")?.addEventListener("change", (e) => { this.category = e.target.value; this.renderGrid(); });
  },

  getData() {
    if (this.currentTab === "mcp") return this.mcpData;
    if (this.currentTab === "skill") return this.skillData;
    return this.commandData;
  },

  updateCategories() {
    const sel = document.getElementById("marketCategory");
    if (!sel) return;
    const data = this.getData();
    const cats = ["all", ...new Set(data.map((d) => d.category))];
    sel.innerHTML = cats.map((c) => `<option value="${c}" ${this.category === c ? "selected" : ""}>${c === "all" ? "全部分类" : c}</option>`).join("");
  },

  renderGrid() {
    const grid = document.getElementById("marketGrid");
    if (!grid) return;

    if (App.scope === "project" && !App.projectDir) {
      grid.innerHTML = '<div class="empty-state"><div class="empty-icon">📁</div><div class="empty-text">请先在顶部选择项目目录</div><button class="btn sm primary mt-2" onclick="App.selectProject()">选择目录</button></div>';
      return;
    }

    this.updateCategories();

    let data = this.getData();
    if (this.category !== "all") data = data.filter((d) => d.category === this.category);
    if (this.searchText) data = data.filter((d) => d.name.toLowerCase().includes(this.searchText) || d.desc.toLowerCase().includes(this.searchText));

    if (data.length === 0) { grid.innerHTML = '<div class="empty-state"><div class="empty-icon">🔍</div><div class="empty-text">未找到匹配项</div></div>'; return; }

    const scopeLabel = App.scope === "project" ? "项目" : "全局";

    grid.innerHTML = data.map((item) => {
      const installed = this.isInstalled(item.name);
      return `
        <div class="market-card ${installed ? "installed" : ""}">
          <div class="market-card-header"><span class="market-card-icon">${item.icon}</span><span class="market-card-name">${Utils.escapeHtml(item.name)}</span></div>
          <div class="market-card-desc">${Utils.escapeHtml(item.desc)}</div>
          <div class="market-card-meta">
            <span class="badge-sm">${Utils.escapeHtml(item.category)}</span>
            ${item.needsEnv ? '<span class="badge-sm warn">需要配置</span>' : ""}
            ${item.needsConfig ? '<span class="badge-sm warn">需要参数</span>' : ""}
            ${installed ? `<span class="badge-sm" style="color:var(--color-success, #9ece6a)">✓ ${scopeLabel}已安装</span>` : ""}
          </div>
          <div class="market-card-actions">
            ${installed ? `<button class="btn sm danger" data-uninstall="${Utils.escapeHtml(item.name)}">从${scopeLabel}卸载</button>` : `<button class="btn sm primary" data-install="${Utils.escapeHtml(item.name)}">安装到${scopeLabel}</button>`}
            ${item.github ? `<a href="${item.github}" target="_blank" class="btn sm ghost">📎</a>` : ""}
          </div>
        </div>
      `;
    }).join("");

    grid.querySelectorAll("[data-install]").forEach((btn) => btn.addEventListener("click", () => this.install(btn.dataset.install)));
    grid.querySelectorAll("[data-uninstall]").forEach((btn) => btn.addEventListener("click", () => this.uninstall(btn.dataset.uninstall)));
  },

  isInstalled(name) {
    if (this.currentTab === "mcp") {
      const configs = Utils.apiSync("readMCPConfig", App.projectDir);
      return !!configs?.[App.getMcpScope()]?.mcpServers?.[name];
    }
    if (this.currentTab === "skill") {
      const skills = Utils.apiSync("listSkills", App.scope === "project" ? App.projectDir : null);
      return skills.some((s) => s.dirName === name);
    }
    // command
    const basePath = App.scope === "project" && App.projectDir
      ? Utils.apiSync("pathJoin", App.projectDir, ".claude", "commands")
      : Utils.apiSync("pathJoin", Utils.apiSync("getClaudeDir"), "commands");
    const cmdPath = Utils.apiSync("pathJoin", basePath, `${name}.md`);
    return Utils.apiSync("fileExists", cmdPath);
  },

  install(name) {
    if (App.scope === "project" && !App.projectDir) { Utils.toast("请先在顶部选择项目目录", "warning"); return; }
    const item = this.getData().find((d) => d.name === name);
    if (!item) return;
    if (this.currentTab === "mcp") { this.installMcp(item); }
    else if (this.currentTab === "skill") { this.installSkill(item); }
    else { this.installCommand(item); }
  },

  installMcp(item) {
    let env = { ...item.env };
    if (item.needsEnv) {
      const fields = Object.keys(item.env).map((k) => `<div><label class="text-sm text-muted">${Utils.escapeHtml(k)}</label><input class="input mt-1" id="env_${Utils.escapeHtml(k)}" placeholder="${Utils.escapeHtml(item.env[k])}" /></div>`).join("");
      const { overlay, close } = Utils.modal(`配置 ${item.name}`, `<div class="flex flex-col gap-3"><div class="text-sm text-muted">此 MCP 服务器需要以下环境变量:</div>${fields}</div>`, `<button class="btn" data-cancel>取消</button><button class="btn primary" data-ok>安装</button>`);
      overlay.querySelector("[data-ok]").onclick = () => {
        Object.keys(item.env).forEach((k) => { const v = document.getElementById("env_" + k)?.value.trim(); if (v) env[k] = v; });
        close(); this._writeMcpConfig(item, env);
      };
      overlay.querySelector("[data-cancel]").onclick = close;
      return;
    }
    if (item.needsConfig) {
      const { overlay, close } = Utils.modal(`配置 ${item.name}`, `<div class="flex flex-col gap-3"><div class="text-sm text-muted">${Utils.escapeHtml(item.configHint)}</div><input class="input" id="mcpExtraArg" placeholder="输入参数..." /></div>`, `<button class="btn" data-cancel>取消</button><button class="btn primary" data-ok>安装</button>`);
      overlay.querySelector("[data-ok]").onclick = () => {
        const extra = document.getElementById("mcpExtraArg").value.trim();
        if (extra) item.args = [...item.args, extra];
        close(); this._writeMcpConfig(item, env);
      };
      overlay.querySelector("[data-cancel]").onclick = close;
      return;
    }
    this._writeMcpConfig(item, env);
  },

  _writeMcpConfig(item, env) {
    const mcpScope = App.getMcpScope();
    const configs = Utils.apiSync("readMCPConfig", App.projectDir);
    const config = configs[mcpScope] || { mcpServers: {} };
    if (!config.mcpServers) config.mcpServers = {};

    const platform = Utils.apiSync("platform");
    let command = item.command;
    let args = [...item.args];
    if (platform === "win32" && command === "npx") { command = "cmd"; args = ["/c", "npx", ...args]; }

    config.mcpServers[item.name] = { command, args, ...(Object.keys(env).length ? { env } : {}) };
    Utils.apiSync("writeMCPConfig", mcpScope, config, App.projectDir);
    Utils.toast(`${item.name} 已安装到${App.scope === "project" ? "项目" : "全局"}`, "success");
    this.renderGrid();
  },

  installSkill(item) {
    if (App.scope === "project" && App.projectDir) {
      const skillPath = Utils.apiSync("pathJoin", App.projectDir, ".claude", "skills", item.name, "SKILL.md");
      Utils.apiSync("writeFile", skillPath, item.content);
    } else {
      const claudeDir = Utils.apiSync("getClaudeDir");
      const skillPath = Utils.apiSync("pathJoin", claudeDir, "skills", item.name, "SKILL.md");
      Utils.apiSync("writeFile", skillPath, item.content);
    }
    Utils.toast(`Skill ${item.name} 已安装`, "success");
    this.renderGrid();
  },

  installCommand(item) {
    if (App.scope === "project" && App.projectDir) {
      const cmdPath = Utils.apiSync("pathJoin", App.projectDir, ".claude", "commands", `${item.name}.md`);
      Utils.apiSync("writeFile", cmdPath, item.content);
    } else {
      const claudeDir = Utils.apiSync("getClaudeDir");
      const cmdPath = Utils.apiSync("pathJoin", claudeDir, "commands", `${item.name}.md`);
      Utils.apiSync("writeFile", cmdPath, item.content);
    }
    Utils.toast(`命令 /${item.name} 已安装`, "success");
    this.renderGrid();
  },

  async uninstall(name) {
    if (!await Utils.confirm(`确定从${App.scope === "project" ? "项目" : "全局"}卸载 "${name}"？`)) return;

    if (this.currentTab === "mcp") {
      const mcpScope = App.getMcpScope();
      const configs = Utils.apiSync("readMCPConfig", App.projectDir);
      const config = configs[mcpScope] || { mcpServers: {} };
      if (config.mcpServers?.[name]) { delete config.mcpServers[name]; Utils.apiSync("writeMCPConfig", mcpScope, config, App.projectDir); }
      Utils.toast(`${name} 已卸载`, "success");
    } else if (this.currentTab === "skill") {
      Utils.apiSync("deleteSkill", name, App.scope === "project" ? App.projectDir : null);
      Utils.toast(`Skill ${name} 已卸载`, "success");
    } else {
      let cmdPath;
      if (App.scope === "project" && App.projectDir) {
        cmdPath = Utils.apiSync("pathJoin", App.projectDir, ".claude", "commands", `${name}.md`);
      } else {
        const claudeDir = Utils.apiSync("getClaudeDir");
        cmdPath = Utils.apiSync("pathJoin", claudeDir, "commands", `${name}.md`);
      }
      Utils.apiSync("deleteCommand", cmdPath);
      Utils.toast(`命令 /${name} 已卸载`, "success");
    }
    this.renderGrid();
  },
};