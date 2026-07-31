/**
 * 网关信息页面 — 显示 API 网关状态、余额、可用模型
 * 适配 Stargate (LiteLLM)、OpenRouter、One API 等流行网关
 * 模型按运营商分组折叠
 */

const GatewayPage = {
  collapsedProviders: {},

  render(container) {
    container.innerHTML = `
      <div class="card mb-3">
        <div class="card-header"><div class="card-title">⚙️ 网关配置</div></div>
        <div class="text-xs text-muted mb-2">以下信息从 ~/.claude/settings.json 的 env 字段读取</div>
        <div id="gatewayConfig"></div>
      </div>
      <div class="card mb-3">
        <div class="card-header">
          <div class="card-title">🌐 网关状态</div>
          <button class="btn sm" id="gwRefreshBtn">🔄 刷新</button>
        </div>
        <div id="gatewayInfo">
          <div class="flex items-center gap-2">
            <div class="spinner"></div>
            <span class="text-muted text-sm">检测中...</span>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-header">
          <div class="card-title">📋 可用模型（按运营商分组）</div>
          <input class="input" id="gwModelSearch" placeholder="筛选模型..." style="width:160px" />
        </div>
        <div id="gatewayModels"></div>
      </div>
    `;
    this.bindEvents();
    this.loadGatewayInfo();
  },

  bindEvents() {
    document.getElementById("gwRefreshBtn")?.addEventListener("click", () => this.loadGatewayInfo());
    document.getElementById("gwModelSearch")?.addEventListener("input", Utils.debounce((e) => {
      this._filterModels(e.target.value);
    }, 200));
  },

  async loadGatewayInfo() {
    var self = this;
    var el = document.getElementById("gatewayInfo");
    var configEl = document.getElementById("gatewayConfig");

    var config = Utils.apiSync("readConfig", "user");
    var env = config.env || {};
    var baseUrl = env.ANTHROPIC_BASE_URL || env.CLAUDE_CODE_BASE_URL || "";
    var apiKey = env.ANTHROPIC_AUTH_TOKEN || env.ANTHROPIC_API_KEY || "";
    var useBedrock = env.CLAUDE_CODE_USE_BEDROCK === "1";
    var useVertex = env.CLAUDE_CODE_USE_VERTEX === "1";

    // 配置信息（带复制按钮）
    var configHtml = '<div class="gateway-card">';
    if (baseUrl) {
      configHtml += '<div class="gateway-row"><span class="gateway-label">Base URL</span><span class="flex items-center gap-2"><span class="gateway-value user-select-text">' + Utils.escapeHtml(baseUrl) + '</span><button class="btn ghost sm" onclick="GatewayPage._copy(\'' + Utils.escapeHtml(baseUrl) + '\')" title="复制">📋</button></span></div>';
    }
    if (apiKey) {
      var maskedKey = apiKey.substring(0, 10) + "••••••••" + apiKey.substring(apiKey.length - 4);
      configHtml += '<div class="gateway-row"><span class="gateway-label">API Key</span><span class="flex items-center gap-2"><span class="gateway-value user-select-text">' + maskedKey + '</span><button class="btn ghost sm" onclick="GatewayPage._copy(\'' + Utils.escapeHtml(apiKey) + '\')" title="复制完整 Key">📋</button></span></div>';
    }
    if (useBedrock) configHtml += '<div class="gateway-row"><span class="gateway-label">Provider</span><span class="gateway-value">AWS Bedrock</span></div>';
    else if (useVertex) configHtml += '<div class="gateway-row"><span class="gateway-label">Provider</span><span class="gateway-value">Google Vertex AI</span></div>';
    else if (baseUrl) {
      var provider = this._detectProvider(baseUrl);
      configHtml += '<div class="gateway-row"><span class="gateway-label">Provider</span><span class="gateway-value">' + provider + '</span></div>';
    }
    if (!baseUrl && !useBedrock && !useVertex) {
      configHtml += '<div class="gateway-row"><span class="gateway-label">Provider</span><span class="gateway-value">Anthropic (直连)</span></div>';
    }
    var otherVars = { ANTHROPIC_MODEL: "默认模型", CLAUDE_CODE_SUBAGENT_MODEL: "子代理模型", CLAUDE_CODE_MAX_OUTPUT_TOKENS: "最大输出 Token", MAX_THINKING_TOKENS: "最大思考 Token", DISABLE_PROMPT_CACHING: "禁用缓存" };
    for (var key in otherVars) {
      if (env[key]) configHtml += '<div class="gateway-row"><span class="gateway-label">' + otherVars[key] + '</span><span class="gateway-value">' + Utils.escapeHtml(env[key]) + '</span></div>';
    }
    configHtml += '</div>';
    configEl.innerHTML = configHtml;

    if (!baseUrl) {
      el.innerHTML = '<div class="text-muted text-sm">未配置 API 网关，使用 Anthropic 直连</div>';
      document.getElementById("gatewayModels").innerHTML = '<div class="text-muted text-sm">直连模式下无法列出模型</div>';
      return;
    }

    el.innerHTML = '<div class="flex items-center gap-2"><div class="spinner"></div><span class="text-muted text-sm">连接网关...</span></div>';

    var result = await Utils.api("queryGateway", baseUrl, apiKey);
    if (result.error) {
      el.innerHTML = '<div class="text-warning text-sm">⚠️ ' + Utils.escapeHtml(result.error) + '</div>';
      document.getElementById("gatewayModels").innerHTML = '<div class="text-muted text-sm">无法获取模型列表</div>';
      return;
    }

    var infoHtml = '<div class="gateway-card">';
    infoHtml += '<div class="gateway-row"><span class="gateway-label">状态</span><span class="status-badge success"><span class="dot"></span>已连接</span></div>';
    if (result.balance !== undefined && result.balance !== null) {
      infoHtml += '<div class="gateway-row"><span class="gateway-label">余额</span><span class="gateway-balance">' + result.balance + '</span></div>';
    }
    if (result.models) {
      infoHtml += '<div class="gateway-row"><span class="gateway-label">模型数</span><span class="gateway-value">' + result.models.length + '</span></div>';
    }
    infoHtml += '</div>';
    el.innerHTML = infoHtml;

    this.gatewayModels = result.models || [];
    this._renderModels(this.gatewayModels);
  },

  _detectProvider(url) {
    if (url.includes("stargate")) return "Stargate (LiteLLM Proxy)";
    if (url.includes("openrouter")) return "OpenRouter";
    if (url.includes("one-api") || url.includes("oneapi")) return "One API";
    if (url.includes("127.0.0.1") || url.includes("localhost")) return "本地代理";
    return "自定义网关";
  },

  _getModelProvider(id) {
    if (id.includes("claude") || id.includes("sonnet") || id.includes("opus") || id.includes("haiku")) return { name: "🤖 Claude", key: "claude" };
    if (id.includes("gpt")) return { name: "🔵 OpenAI GPT", key: "gpt" };
    if (id.includes("gemini")) return { name: "🟢 Google Gemini", key: "gemini" };
    if (id.includes("deepseek")) return { name: "🟣 DeepSeek", key: "deepseek" };
    if (id.includes("qwen")) return { name: "🟠 Alibaba Qwen", key: "qwen" };
    if (id.includes("llama")) return { name: "🦙 Meta Llama", key: "llama" };
    if (id.includes("mistral")) return { name: "🔴 Mistral", key: "mistral" };
    return { name: "⚪ 其他", key: "other" };
  },

  _renderModels(models) {
    var el = document.getElementById("gatewayModels");
    var self = this;
    if (!models || models.length === 0) {
      el.innerHTML = '<div class="text-muted text-sm">暂无可用模型</div>';
      return;
    }

    // 按运营商分组
    var groups = {};
    for (var i = 0; i < models.length; i++) {
      var id = typeof models[i] === "string" ? models[i] : (models[i].id || models[i].name || "?");
      var prov = this._getModelProvider(id.toLowerCase());
      if (!groups[prov.key]) groups[prov.key] = { name: prov.name, models: [] };
      groups[prov.key].models.push(id);
    }

    var html = "";
    for (var key in groups) {
      var group = groups[key];
      var collapsed = this.collapsedProviders[key];
      html += '<div class="session-project ' + (collapsed ? "collapsed" : "") + '">';
      html += '<div class="session-project-header" data-gw-toggle="' + key + '">';
      html += '<span class="session-project-arrow">' + (collapsed ? "▶" : "▼") + '</span>';
      html += '<span class="session-project-name">' + group.name + '</span>';
      html += '<span class="session-project-count">' + group.models.length + '</span>';
      html += '</div>';
      html += '<div class="session-project-body"' + (collapsed ? ' style="display:none"' : "") + '>';
      for (var j = 0; j < group.models.length; j++) {
        html += '<div class="gateway-row"><span class="gateway-value user-select-text">' + Utils.escapeHtml(group.models[j]) + '</span><button class="btn ghost sm" onclick="GatewayPage._copy(\'' + Utils.escapeHtml(group.models[j]) + '\')" title="复制">📋</button></div>';
      }
      html += '</div></div>';
    }
    el.innerHTML = html;

    // 绑定折叠事件
    el.querySelectorAll("[data-gw-toggle]").forEach(function(header) {
      header.addEventListener("click", function() {
        var k = header.dataset.gwToggle;
        self.collapsedProviders[k] = !self.collapsedProviders[k];
        self._renderModels(self.gatewayModels);
      });
    });
  },

  _filterModels(query) {
    if (!this.gatewayModels) return;
    var q = query.toLowerCase();
    var filtered = this.gatewayModels.filter(function(m) {
      var id = typeof m === "string" ? m : (m.id || m.name || "");
      return id.toLowerCase().includes(q);
    });
    this._renderModels(filtered);
  },

  _copy(text) {
    utools.copyText(text);
    Utils.toast("已复制", "success");
  },
};
