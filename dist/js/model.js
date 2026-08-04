/**
 * 模型管理页面
 */

const ModelPage = {
  models: [
    {
      id: "opus",
      name: "Claude Opus 5",
      desc: "最强推理能力，适合复杂架构、安全分析、长程任务",
      price: "$5 / $25 per MTok",
      context: "1M tokens",
      color: "purple",
      icon: "🧠",
    },
    {
      id: "sonnet",
      name: "Claude Sonnet 5",
      desc: "最佳速度/智能平衡，日常编码首选（默认模型）",
      price: "$2 / $10 per MTok (推广价)",
      context: "1M tokens",
      color: "accent",
      icon: "⚡",
    },
    {
      id: "haiku",
      name: "Claude Haiku 4.5",
      desc: "快速高效，适合简单任务、子代理、文件搜索",
      price: "$1 / $5 per MTok",
      context: "200K tokens",
      color: "success",
      icon: "🚀",
    },
    {
      id: "fable",
      name: "Claude Fable 5",
      desc: "超越 Opus 的最强模型，百万 token 上下文保持连贯",
      price: "$10 / $50 per MTok",
      context: "1M tokens",
      color: "orange",
      icon: "🔮",
    },
    {
      id: "opusplan",
      name: "Opus Plan",
      desc: "混合模式：Opus 规划 + Sonnet 执行，适合复杂重构",
      price: "混合计费",
      context: "1M tokens",
      color: "info",
      icon: "📋",
    },
  ],

  render(container) {
    const currentModel = Utils.store.get("defaultModel", "");
    const currentEffort = Utils.store.get("defaultEffort", "");
    const fastEnabled = Utils.store.get("fastMode", false);
    const ctxEnabled = Utils.store.get("context1m", false);
    // 加载自定义模型
    const customModelsStr = Utils.store.get("customModels", "");
    const customModels = customModelsStr ? customModelsStr.split("\n").filter(s => s.trim()) : [];

    container.innerHTML = `
      <div class="card mb-4">
        <div class="card-header">
          <div class="card-title">🧠 模型选择</div>
          <span class="text-xs text-muted">当前: <strong class="text-accent">${currentModel || "默认"}</strong></span>
        </div>
        <div class="grid grid-2" id="modelGrid">
          ${this.models.map((m) => `
            <div class="card ${m.id === currentModel ? "active" : ""}" data-model="${m.id}" style="cursor:pointer;${m.id === currentModel ? "border-color:var(--accent);background:var(--accent-bg)" : ""}">
              <div class="flex items-center gap-3">
                <div class="list-item-icon" style="font-size:24px">${m.icon}</div>
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <span class="font-bold">${m.name}</span>
                    <span class="status-badge ${m.color}">${m.id}</span>
                    ${m.id === currentModel ? '<span class="status-badge accent">✓ 当前</span>' : ""}
                  </div>
                  <div class="text-xs text-muted mt-1">${m.desc}</div>
                  <div class="flex gap-3 mt-2">
                    <span class="text-xs text-secondary">💰 ${m.price}</span>
                    <span class="text-xs text-secondary">📏 ${m.context}</span>
                  </div>
                </div>
              </div>
            </div>
          `).join("")}
          ${customModels.map((cm) => `
            <div class="card ${cm === currentModel ? "active" : ""}" data-model="${Utils.escapeHtml(cm)}" style="cursor:pointer;${cm === currentModel ? "border-color:var(--accent);background:var(--accent-bg)" : ""}">
              <div class="flex items-center gap-3">
                <div class="list-item-icon" style="font-size:24px">🔧</div>
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <span class="font-bold">${Utils.escapeHtml(cm)}</span>
                    <span class="status-badge">自定义</span>
                    ${cm === currentModel ? '<span class="status-badge accent">✓ 当前</span>' : ""}
                  </div>
                  <div class="text-xs text-muted mt-1">自定义模型</div>
                </div>
              </div>
            </div>
          `).join("")}
        </div>
      </div>

      <div class="card mb-4">
        <div class="card-header">
          <div class="card-title">🔧 自定义模型</div>
          <span class="text-xs text-muted">每行一个模型名称（如 deepseek-v4-pro, gpt-5.4 等）</span>
        </div>
        <textarea class="textarea" id="customModelsEditor" style="min-height:80px" placeholder="每行一个模型名称...">${Utils.escapeHtml(customModelsStr)}</textarea>
        <div class="flex gap-2 mt-2">
          <button class="btn primary sm" id="saveCustomModels">💾 保存</button>
        </div>
      </div>

      <div class="grid grid-2">
        <div class="card">
          <div class="card-header">
            <div class="card-title">⚡ Fast 模式</div>
          </div>
          <div class="flex items-center justify-between">
            <div>
              <div class="text-sm">2.5x 速度，2x 价格</div>
              <div class="text-xs text-muted mt-1">适用于 Opus 5 / Opus 4.8</div>
            </div>
            <div class="switch ${fastEnabled ? "on" : ""}" id="fastModeSwitch"></div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div class="card-title">📏 1M 上下文</div>
          </div>
          <div class="flex items-center justify-between">
            <div>
              <div class="text-sm">启用 1M token 上下文窗口</div>
              <div class="text-xs text-muted mt-1">适用于 Opus / Sonnet</div>
            </div>
            <div class="switch ${ctxEnabled ? "on" : ""}" id="contextSwitch"></div>
          </div>
        </div>
      </div>

      <div class="card mt-4">
        <div class="card-header">
          <div class="card-title">🎛️ Effort 努力级别</div>
          <span class="text-xs text-muted">当前: <strong class="text-accent">${currentEffort || "未设置"}</strong></span>
        </div>
        <div class="flex gap-2 flex-wrap" id="effortLevels">
          ${["min", "low", "medium", "high", "xhigh", "max"].map((level) => `
            <button class="btn ${level === currentEffort ? "primary" : ""}" data-effort="${level}">${level}${level === currentEffort ? " ✓" : ""}</button>
          `).join("")}
        </div>
        <div class="text-xs text-muted mt-2">
          min/low: 快速迭代 · medium: 一般任务 · high: 推荐最低 · xhigh: 编码推荐起点 · max: 最高质量
        </div>
      </div>

      <div class="card mt-4">
        <div class="card-header">
          <div class="card-title">💡 模型选择建议</div>
        </div>
        <div class="text-sm text-secondary">
          <div class="mb-2">🎯 <strong>简单任务</strong>（文件搜索、格式化）→ <span class="text-success">Haiku</span>，约 $0.03/任务</div>
          <div class="mb-2">🔨 <strong>日常编码</strong>（功能开发、Bug 修复）→ <span class="text-accent">Sonnet</span>，约 $0.75/任务</div>
          <div class="mb-2">🏗️ <strong>复杂推理</strong>（架构设计、安全分析）→ <span class="text-purple">Opus</span>，约 $2.00/任务</div>
          <div>🔮 <strong>极致挑战</strong>（长程规划、超大型项目）→ <span class="text-warning">Fable</span></div>
        </div>
      </div>
    `;

    this.bindEvents();
  },

  bindEvents() {
    // 模型选择 — 点击后重新渲染以更新高亮
    document.querySelectorAll("[data-model]").forEach((el) => {
      el.addEventListener("click", async () => {
        const modelId = el.dataset.model;
        if (Terminal.activeTabId) {
          Terminal.sendCommand(`/model ${modelId}`);
        }
        Utils.store.set("defaultModel", modelId);
        Utils.toast(`已设置模型为 ${modelId}`, "success");
        // 重新渲染以更新高亮状态
        this.render(this.container || document.getElementById("content"));
      });
    });

    // 保存自定义模型
    document.getElementById("saveCustomModels")?.addEventListener("click", () => {
      const val = document.getElementById("customModelsEditor").value.trim();
      Utils.store.set("customModels", val);
      Utils.store.set("customModels_old", val); // 同步到设置页
      Utils.toast("自定义模型已保存", "success");
      this.render(this.container || document.getElementById("content"));
    });

    // Fast 模式
    const fastSwitch = document.getElementById("fastModeSwitch");
    fastSwitch.addEventListener("click", () => {
      fastSwitch.classList.toggle("on");
      const on = fastSwitch.classList.contains("on");
      Utils.store.set("fastMode", on);
      if (Terminal.activeTabId) {
        Terminal.sendCommand("/fast");
      }
      Utils.toast(`Fast 模式 ${on ? "已开启" : "已关闭"}`, "info");
    });

    // 1M 上下文
    const ctxSwitch = document.getElementById("contextSwitch");
    ctxSwitch.addEventListener("click", () => {
      ctxSwitch.classList.toggle("on");
      const on = ctxSwitch.classList.contains("on");
      Utils.store.set("context1m", on);
      if (Terminal.activeTabId && on) {
        const model = Utils.store.get("defaultModel", "sonnet");
        Terminal.sendCommand(`/model ${model}[1m]`);
      }
      Utils.toast(`1M 上下文 ${on ? "已开启" : "已关闭"}`, "info");
    });

    // Effort 级别 — 点击后重新渲染以更新高亮
    document.querySelectorAll("[data-effort]").forEach((el) => {
      el.addEventListener("click", () => {
        const level = el.dataset.effort;
        if (Terminal.activeTabId) {
          Terminal.sendCommand(`/effort ${level}`);
        }
        Utils.store.set("defaultEffort", level);
        Utils.toast(`Effort 设置为 ${level}`, "success");
        this.render(this.container || document.getElementById("content"));
      });
    });
  },
};
