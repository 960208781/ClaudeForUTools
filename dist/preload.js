/**
 * Claude Manager for uTools — preload.js
 * 提供 Node.js 原生能力桥接，包括 Claude CLI 交互、文件系统操作、子进程管理
 */

const { exec, execSync, spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

// ============================================================
//  工具函数
// ============================================================

function getHomeDir() {
  return os.homedir();
}

function getClaudeDir() {
  return path.join(getHomeDir(), ".claude");
}

function getClaudeConfigPath() {
  return path.join(getHomeDir(), ".claude.json");
}

/**
 * 检测 Claude CLI 可执行文件路径
 */
function findClaudePath() {
  // 1. 优先使用用户在插件设置中配置的路径
  const settingPath = utools.dbStorage.getItem("claudePath");
  if (settingPath && fs.existsSync(settingPath)) return settingPath;

  // 2. 收集候选路径
  const candidates = [
    path.join(getHomeDir(), ".local", "bin", "claude"),
    path.join(getHomeDir(), ".local", "share", "claude", "claude"),
    "/usr/local/bin/claude",
    "/opt/homebrew/bin/claude",
    "/usr/bin/claude",
  ];

  // macOS Homebrew
  if (process.platform === "darwin") {
    candidates.push("/opt/homebrew/bin/claude");
    candidates.push("/usr/local/bin/claude");
  }

  // nvm 路径 — 扫描所有已安装的 Node 版本
  const nvmDir = path.join(getHomeDir(), ".nvm", "versions", "node");
  if (fs.existsSync(nvmDir)) {
    try {
      const nodeVersions = fs.readdirSync(nvmDir);
      for (const ver of nodeVersions) {
        candidates.push(path.join(nvmDir, ver, "bin", "claude"));
      }
    } catch (e) {
      // skip
    }
  }

  // fnm 路径 (类似的 Node 版本管理器)
  const fnmDir = path.join(getHomeDir(), ".fnm", "node-versions");
  if (fs.existsSync(fnmDir)) {
    try {
      const fnmVersions = fs.readdirSync(fnmDir);
      for (const ver of fnmVersions) {
        candidates.push(path.join(fnmDir, ver, "installation", "bin", "claude"));
      }
    } catch (e) {
      // skip
    }
  }

  //volta 路径
  const voltaBin = path.join(getHomeDir(), ".volta", "bin", "claude");
  candidates.push(voltaBin);

  // Windows paths
  if (process.platform === "win32") {
    candidates.push(
      path.join(getHomeDir(), ".local", "bin", "claude.exe"),
      path.join(getHomeDir(), "AppData", "Local", "Programs", "claude-code", "claude.exe"),
      path.join(getHomeDir(), "AppData", "Local", "Programs", "claude-code", "claude"),
      path.join(getHomeDir(), "AppData", "Roaming", "npm", "claude.cmd"),
      path.join(getHomeDir(), "AppData", "Roaming", "npm", "claude.ps1"),
      path.join(getHomeDir(), "AppData", "Local", "Microsoft", "WinGet", "Packages", "Anthropic.ClaudeCode_Microsoft.Winget.Source_8wekyb3d8bbwe", "claude.exe"),
    );
    // Program Files 路径（系统级安装）
    const programFiles = process.env["ProgramFiles"] || "C:\\Program Files";
    candidates.push(path.join(programFiles, "claude-code", "claude.exe"));
    const localAppData = process.env["LOCALAPPDATA"] || path.join(getHomeDir(), "AppData", "Local");
    candidates.push(path.join(localAppData, "claude-code", "claude.exe"));
  }

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) return candidate;
    } catch (e) {
      // continue
    }
  }

  // 3. 尝试用登录 shell 执行 which/where（获取用户完整 PATH）
  try {
    const cmd = process.platform === "win32"
      ? "where claude"
      : '/bin/zsh -l -c "which claude" 2>/dev/null || /bin/bash -l -c "which claude" 2>/dev/null';
    const result = execSync(cmd, { encoding: "utf-8", timeout: 5000 }).trim();
    if (result) {
      const foundPath = result.split("\n")[0].trim();
      if (foundPath && fs.existsSync(foundPath)) return foundPath;
    }
  } catch (e) {
    // not found
  }

  // 4. 最后尝试普通 which（可能 PATH 不完整）
  try {
    const cmd = process.platform === "win32" ? "where claude" : "which claude";
    const result = execSync(cmd, { encoding: "utf-8", timeout: 3000 }).trim();
    if (result && fs.existsSync(result.split("\n")[0].trim())) {
      return result.split("\n")[0].trim();
    }
  } catch (e) {
    // not found
  }

  return null;
}

/**
 * 执行命令并返回结果（Promise 封装）
 */
function execAsync(command, options = {}) {
  return new Promise((resolve, reject) => {
    exec(command, { encoding: "utf-8", timeout: 30000, ...options }, (err, stdout, stderr) => {
      if (err) {
        reject({ error: err.message, stdout, stderr });
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

/**
 * 安全读取 JSON 文件
 */
function readJsonSafe(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content);
  } catch (e) {
    return null;
  }
}

/**
 * 安全写入 JSON 文件
 */
function writeJsonSafe(filePath, data) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

/**
 * 格式化时间戳
 */
function formatTime(ts) {
  if (!ts) return "未知";
  const d = new Date(ts * 1000 || ts);
  return d.toLocaleString("zh-CN");
}

// ============================================================
//  Claude CLI 检测与诊断
// ============================================================

async function checkInstall() {
  const claudePath = findClaudePath();
  if (!claudePath) {
    return { installed: false, version: null, path: null };
  }
  try {
    const { stdout } = await execAsync(`"${claudePath}" --version`);
    const version = stdout.trim();
    return { installed: true, version, path: claudePath };
  } catch (e) {
    return { installed: false, version: null, path: claudePath, error: e.error };
  }
}

async function runDoctor() {
  const claudePath = findClaudePath();
  if (!claudePath) return { error: "Claude CLI 未安装" };
  try {
    const { stdout } = await execAsync(`"${claudePath}" doctor`, { timeout: 60000 });
    return { result: stdout };
  } catch (e) {
    return { error: e.error || e.stderr || "诊断失败", result: e.stdout || "" };
  }
}

async function checkAuthStatus() {
  const claudePath = findClaudePath();
  if (!claudePath) return { loggedIn: false, error: "Claude CLI 未安装" };
  try {
    const { stdout } = await execAsync(`"${claudePath}" auth status`, { timeout: 15000 });
    return { loggedIn: true, result: stdout };
  } catch (e) {
    return { loggedIn: false, error: e.error || e.stderr || "未登录" };
  }
}

// ============================================================
//  会话管理
// ============================================================

/**
 * 获取所有项目会话列表
 */
function listSessions() {
  const projectsDir = path.join(getClaudeDir(), "projects");
  if (!fs.existsSync(projectsDir)) return [];

  const sessions = [];
  try {
    const projectDirs = fs.readdirSync(projectsDir);
    for (const projectDir of projectDirs) {
      const projectPath = path.join(projectsDir, projectDir);
      if (!fs.statSync(projectPath).isDirectory()) continue;

      const files = fs.readdirSync(projectPath);
      for (const file of files) {
        if (!file.endsWith(".jsonl")) continue;
        const filePath = path.join(projectPath, file);
        const stat = fs.statSync(filePath);
        const sessionId = path.basename(file, ".jsonl");

        // 提取会话标题 — 扫描所有行找第一条有意义的用户消息
        let summary = "";
        let messageCount = 0;
        try {
          const content = fs.readFileSync(filePath, "utf-8");
          const lines = content.split("\n").filter((l) => l.trim());
          messageCount = lines.length;
          // 扫描所有行找第一条真实用户消息（跳过命令/工具调用/系统消息）
          let userMsgCount = 0;
          for (let i = 0; i < lines.length; i++) {
            try {
              const obj = JSON.parse(lines[i]);
              // 找到 role=user 的消息
              if (obj.role === "user" || obj.type === "user") {
                userMsgCount++;
                const msg = obj.message || obj;
                let text = "";
                if (typeof msg === "string") {
                  text = msg;
                } else if (typeof msg === "object") {
                  text = msg.content || msg.text || msg.message || "";
                  if (Array.isArray(text)) {
                    // content 可能是数组 [{type: "text", text: "..."}]
                    text = text.map((b) => {
                      if (typeof b === "string") return b;
                      if (b.type === "text") return b.text || "";
                      return "";
                    }).join(" ");
                  }
                }
                if (typeof text !== "string") continue;

                // 跳过命令标签、工具调用等非自然语言内容
                const trimmed = text.trim();
                if (!trimmed) continue;
                if (trimmed.startsWith("<command") || trimmed.startsWith("<local-command") ||
                    trimmed.startsWith("<system") || trimmed.startsWith("<bash") ||
                    trimmed.startsWith("tool_") || trimmed.startsWith("/") ||
                    trimmed.startsWith("Caveat:") || trimmed.startsWith("This is a")) {
                  continue;
                }
                // 去掉 XML 标签，提取纯文本
                const cleanText = trimmed.replace(/<[^>]+>/g, "").trim();
                if (cleanText && cleanText.length > 2) {
                  // 用第一条真实用户消息作为标题
                  summary = cleanText.substring(0, 80);
                  break;
                }
              }
            } catch (e) {
              // skip
            }
          }
          // 如果没找到用户消息，用第一行做 fallback
          if (!summary && lines.length > 0) {
            try {
              const firstLine = JSON.parse(lines[0]);
              summary = firstLine.type || "会话";
            } catch (e) {
              summary = "会话";
            }
          }
        } catch (e) {
          // skip
        }

        // 将编码的目录名还原 — Claude Code 将路径中的非字母数字字符替换为 -
        // 问题：_ → - 不可逆，需要尝试多种还原方式
        let originalPath = "";
        if (projectDir.startsWith("-")) {
          // 方式1：所有 - 替换为 /
          const tryAll = projectDir.replace(/-/g, "/");
          if (fs.existsSync(tryAll)) {
            originalPath = tryAll;
          } else {
            // 方式2：逐段智能还原路径
            // 优先尝试最长合并，避免过早匹配到短路径
            const segments = projectDir.split("-").filter((s) => s);
            let tryPath = "";
            for (let i = 0; i < segments.length; i++) {
              if (i === 0) { tryPath = "/" + segments[0]; continue; }
              // 先尝试用 / 连接
              const slashPath = tryPath + "/" + segments[i];
              if (fs.existsSync(slashPath)) {
                // 但也检查是否有更长的合并也匹配 — 优先长合并
                let longerFound = false;
                for (let j = segments.length; j > i + 1; j--) {
                  const mergedUnder = segments.slice(i, j).join("_");
                  if (fs.existsSync(tryPath + "/" + mergedUnder)) { tryPath = tryPath + "/" + mergedUnder; i = j - 1; longerFound = true; break; }
                  const mergedDash = segments.slice(i, j).join("-");
                  if (fs.existsSync(tryPath + "/" + mergedDash)) { tryPath = tryPath + "/" + mergedDash; i = j - 1; longerFound = true; break; }
                }
                if (!longerFound) tryPath = slashPath;
                continue;
              }
              // 当前段不存在 — 尝试合并多个段，从最长开始
              let found = false;
              for (let j = segments.length; j > i; j--) {
                const mergedUnder = segments.slice(i, j).join("_");
                if (fs.existsSync(tryPath + "/" + mergedUnder)) { tryPath = tryPath + "/" + mergedUnder; i = j - 1; found = true; break; }
                const mergedDash = segments.slice(i, j).join("-");
                if (fs.existsSync(tryPath + "/" + mergedDash)) { tryPath = tryPath + "/" + mergedDash; i = j - 1; found = true; break; }
              }
              if (!found) tryPath = slashPath;
            }
            originalPath = tryPath;
          }
        } else {
          originalPath = projectDir;
        }

        // 提取费用 — 优先用 result 行的 total_cost_usd，为 0 时基于 token 估算
        let cost = 0;
        let inputTokens = 0, outputTokens = 0, cacheReadTokens = 0, cacheCreationTokens = 0;
        try {
          const content = fs.readFileSync(filePath, "utf-8");
          const lines = content.split("\n").filter((l) => l.trim());
          // 从后往前找 result 行
          for (let i = lines.length - 1; i >= Math.max(0, lines.length - 10); i--) {
            try {
              const obj = JSON.parse(lines[i]);
              if (obj.type === "result" && obj.total_cost_usd !== undefined) {
                cost = obj.total_cost_usd;
                break;
              }
            } catch (e) {}
          }
          // 如果 cost 为 0，基于 token 估算费用（Claude Sonnet 5 定价）
          if (cost === 0) {
            for (const line of lines) {
              try {
                const obj = JSON.parse(line);
                if (obj.message && obj.message.usage) {
                  const u = obj.message.usage;
                  inputTokens += u.input_tokens || 0;
                  outputTokens += u.output_tokens || 0;
                  cacheReadTokens += u.cache_read_input_tokens || 0;
                  cacheCreationTokens += u.cache_creation_input_tokens || 0;
                }
              } catch (e) {}
            }
            // Claude Sonnet 5 定价（per 1M tokens, USD）
            // Input: $3, Output: $15, Cache read: $0.3, Cache creation: $3.75
            cost = (inputTokens * 3 + outputTokens * 15 + cacheReadTokens * 0.3 + cacheCreationTokens * 3.75) / 1000000;
          }
        } catch (e) {}

        sessions.push({
          id: sessionId,
          project: originalPath,
          projectDir: projectDir,
          summary: String(summary),
          messageCount,
          filePath,
          lastModified: stat.mtime.toISOString(),
          size: stat.size,
          cost: cost,
        });
      }
    }
  } catch (e) {
    // ignore
  }

  sessions.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
  return sessions;
}

/**
 * 获取会话历史内容 — 提取用户/助手消息为简洁格式
 * 过滤掉工具调用和工具结果的原始内容，只保留有意义的对话
 */
function getSessionHistory(sessionFilePath) {
  try {
    const content = fs.readFileSync(sessionFilePath, "utf-8");
    const lines = content.split("\n").filter((l) => l.trim());
    const messages = [];
    for (const line of lines) {
      try {
        const obj = JSON.parse(line);
        let role = obj.role || obj.type || "";
        let text = "";

        // 提取消息内容
        const msgContent = obj.message?.content || obj.content || obj.summary || "";
        if (typeof msgContent === "string") {
          text = msgContent;
        } else if (Array.isArray(msgContent)) {
          // 检查是否是 tool_result（role=user 但 content 里有 tool_result 类型）
          let isToolResult = false;
          let hasToolUse = false;
          const parts = msgContent.map((b) => {
            if (typeof b === "string") return b;
            if (b.type === "text") return b.text || "";
            if (b.type === "tool_use") { hasToolUse = true; return ""; } // 忽略工具调用
            if (b.type === "tool_result") { isToolResult = true; return ""; } // 忽略工具结果
            return "";
          });
          text = parts.join("").trim();

          // 如果整条消息都是工具调用/结果，跳过
          if (hasToolUse && !text) continue;
          if (isToolResult && !text) continue;

          // 如果 assistant 消息只有工具调用没有文本，跳过
          if (role === "assistant" && hasToolUse && !text) continue;
        } else if (typeof msgContent === "object" && msgContent !== null) {
          text = msgContent.text || "";
        }

        // 标准化 role
        if (role === "human" || role === "user") role = "user";
        else if (role === "assistant" || role === "model") role = "assistant";
        else if (role === "system") role = "system";
        else continue;

        // 跳过命令标签等非自然语言内容
        const trimmed = text.trim();
        if (!trimmed) continue;
        if (trimmed.startsWith("<command") || trimmed.startsWith("<local-command") ||
            trimmed.startsWith("<system") || trimmed.startsWith("<bash") ||
            trimmed.startsWith("tool_")) {
          // 尝试去掉标签后提取纯文本
          const cleanText = trimmed.replace(/<[^>]+>/g, "").trim();
          if (!cleanText || cleanText.length < 3) continue;
          text = cleanText;
        }

        if (text && text.trim()) {
          messages.push({
            role,
            text: text.substring(0, 5000),
          });
        }
      } catch (e) {
        // skip
      }
    }
    return messages;
  } catch (e) {
    return [];
  }
}

/**
 * 获取会话统计信息 — 从 JSONL 提取耗时、token、工具调用等
 */
function getSessionStats(sessionFilePath) {
  try {
    const content = fs.readFileSync(sessionFilePath, "utf-8");
    const lines = content.split("\n").filter((l) => l.trim());
    
    let timestamps = [];
    let inputTokens = 0, outputTokens = 0, cacheReadTokens = 0, cacheCreationTokens = 0;
    let toolCalls = {};
    let userMessages = 0, assistantMessages = 0;
    let totalCost = 0;
    let totalDuration = 0;
    let models = new Set();

    for (const line of lines) {
      try {
        const obj = JSON.parse(line);
        if (obj.timestamp) timestamps.push(obj.timestamp);
        
        // Token usage
        if (obj.message && obj.message.usage) {
          const u = obj.message.usage;
          inputTokens += u.input_tokens || 0;
          outputTokens += u.output_tokens || 0;
          cacheReadTokens += u.cache_read_input_tokens || 0;
          cacheCreationTokens += u.cache_creation_input_tokens || 0;
        }
        
        // Model tracking
        if (obj.message && obj.message.model) models.add(obj.message.model);
        
        // Tool calls
        if (obj.message && obj.message.content && Array.isArray(obj.message.content)) {
          for (const b of obj.message.content) {
            if (b.type === "tool_use" && b.name) {
              toolCalls[b.name] = (toolCalls[b.name] || 0) + 1;
            }
          }
        }
        
        // Message counts
        const role = obj.role || obj.type || "";
        if (role === "user" || role === "human") userMessages++;
        else if (role === "assistant" || role === "model") assistantMessages++;
        
        // Result line
        if (obj.type === "result") {
          totalCost = obj.total_cost_usd || totalCost;
          totalDuration = obj.duration_ms || totalDuration;
        }
      } catch (e) {}
    }

    // Calculate duration from timestamps if not available from result
    let durationMs = totalDuration;
    if (!durationMs && timestamps.length >= 2) {
      const first = new Date(timestamps[0]).getTime();
      const last = new Date(timestamps[timestamps.length - 1]).getTime();
      durationMs = last - first;
    }

    return {
      durationMs,
      userMessages,
      assistantMessages,
      totalMessages: userMessages + assistantMessages,
      inputTokens,
      outputTokens,
      cacheReadTokens,
      cacheCreationTokens,
      totalTokens: inputTokens + outputTokens + cacheReadTokens + cacheCreationTokens,
      totalCost,
      toolCalls,
      toolCallCount: Object.values(toolCalls).reduce((a, b) => a + b, 0),
      models: [...models],
      firstTimestamp: timestamps[0] || null,
      lastTimestamp: timestamps[timestamps.length - 1] || null,
    };
  } catch (e) {
    return null;
  }
}

// ============================================================
//  终端 / 子进程管理
// ============================================================

const activeProcesses = new Map();

/**
 * 启动 Claude CLI 会话
 * 
 * Claude CLI 检测到非 TTY 时会进入 print 模式。
 * 我们利用这一点：使用 -p --output-format stream-json --verbose 模式，
 * 每次 prompt 作为独立的 claude 调用，通过 --resume 保持会话上下文。
 * 
 * startClaudeSession 现在只是初始化一个会话上下文，
 * 后续每次 sendInput 会启动一个 claude -p 调用。
 */
function startClaudeSession(workDir, options = {}) {
  const claudePath = findClaudePath();
  if (!claudePath) {
    return { error: "Claude CLI 未安装" };
  }

  const cwd = workDir || process.cwd();
  const procId = `proc_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  const session = {
    procId,
    claudePath,
    cwd,
    sessionId: options.resume || null, // Claude session ID for --resume
    model: options.model || null,
    output: "",
    busy: false,
    pendingQueue: [],
    callbacks: [],
    closed: false,
  };

  activeProcesses.set(procId, session);

  // 如果指定了 resume，不需要做任何初始调用
  // 否则也不需要——等用户第一次发消息时再调用

  return { procId, pid: -1 };
}

/**
 * 发送消息到 Claude 会话
 * 每次调用启动一个 claude -p 进程，使用 --resume 保持上下文
 */
function sendInput(procId, text, model) {
  const session = activeProcesses.get(procId);
  if (!session || session.closed) return false;

  // 更新模型（如果传入了）
  if (model !== undefined) {
    session.model = model || null;
  }

  // 如果正在处理，加入队列
  if (session.busy) {
    session.pendingQueue.push(text);
    return true;
  }

  _executeClaude(session, text);
  return true;
}

/**
 * 内部：执行一次 Claude 调用
 */
function _executeClaude(session, prompt) {
  session.busy = true;

  const args = ["-p", prompt, "--output-format", "stream-json", "--verbose"];

  if (session.sessionId) {
    args.push("--resume", session.sessionId);
  }
  if (session.model) {
    args.push("--model", session.model);
  }

  const proc = spawn(session.claudePath, args, {
    cwd: session.cwd,
    env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1" },
    shell: false,
    stdio: ["pipe", "pipe", "pipe"],
  });

  // 立即关闭 stdin，避免 Claude 等待管道数据
  proc.stdin.end();

  let buffer = "";

  // 通知回调：开始处理
  for (const cb of session.callbacks) {
    cb({ stream: "status", data: "thinking" });
  }

  proc.stdout.on("data", (data) => {
    buffer += data.toString("utf-8");
    // stream-json 每行一个 JSON 对象
    const lines = buffer.split("\n");
    buffer = lines.pop(); // 保留最后不完整的行

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const obj = JSON.parse(line);
        _handleStreamJson(session, obj, cb_all);
      } catch (e) {
        // 非 JSON 行，直接输出
        for (const cb of session.callbacks) {
          cb({ stream: "stdout", data: line + "\n" });
        }
      }
    }
  });

  // cb_all 是个占位符，实际通过 session.callbacks 遍历
  function cb_all(data) {
    for (const cb of session.callbacks) {
      cb(data);
    }
  }

  proc.stderr.on("data", (data) => {
    const text = data.toString("utf-8");
    for (const cb of session.callbacks) {
      cb({ stream: "stderr", data: text });
    }
  });

  proc.on("close", (code) => {
    // 处理 buffer 中剩余的数据
    if (buffer.trim()) {
      try {
        const obj = JSON.parse(buffer);
        _handleStreamJson(session, obj, cb_all);
      } catch (e) {
        for (const cb of session.callbacks) {
          cb({ stream: "stdout", data: buffer });
        }
      }
    }

    session.busy = false;

    for (const cb of session.callbacks) {
      cb({ stream: "status", data: "idle" });
    }

    // 处理队列中的下一条消息
    if (session.pendingQueue.length > 0 && !session.closed) {
      const next = session.pendingQueue.shift();
      _executeClaude(session, next);
    }
  });

  proc.on("error", (err) => {
    for (const cb of session.callbacks) {
      cb({ stream: "error", data: err.message });
    }
    session.busy = false;
  });
}

/**
 * 处理 stream-json 格式的输出
 */
function _handleStreamJson(session, obj, callback) {
  if (obj.type === "system" && obj.subtype === "init") {
    if (obj.session_id) {
      session.sessionId = obj.session_id;
    }
    callback({
      stream: "init",
      data: {
        sessionId: obj.session_id,
        model: obj.model,
        cwd: obj.cwd,
        version: obj.claude_code_version,
        slashCommands: obj.slash_commands || [],
        agents: obj.agents || [],
        skills: obj.skills || [],
        tools: obj.tools || [],
        permissionMode: obj.permissionMode,
        apiKeySource: obj.apiKeySource,
      },
    });
  } else if (obj.type === "assistant" && obj.message) {
    const content = obj.message.content;
    if (Array.isArray(content)) {
      for (const block of content) {
        if (block.type === "text" && block.text) {
          callback({ stream: "assistant", data: block.text });
        }
        if (block.type === "tool_use" && block.name) {
          callback({ stream: "tool_use", data: { name: block.name, input: block.input, id: block.id } });
        }
        if (block.type === "thinking" && block.thinking) {
          callback({ stream: "thinking", data: block.thinking });
        }
      }
    } else if (typeof content === "string" && content) {
      callback({ stream: "assistant", data: content });
    }
    // 发送 usage 信息
    if (obj.message.usage) {
      callback({ stream: "usage", data: obj.message.usage });
    }
    // 发送 model 信息
    if (obj.message.model) {
      callback({ stream: "model_info", data: obj.message.model });
    }
    // 发送 stop_reason（assistant 级别的）
    if (obj.message.stop_reason) {
      callback({ stream: "assistant_stop", data: obj.message.stop_reason });
    }
  } else if (obj.type === "user" || obj.type === "tool_result") {
    // 工具返回结果
    if (obj.message && obj.message.content) {
      const content = obj.message.content;
      if (Array.isArray(content)) {
        for (const block of content) {
          if (block.type === "tool_result" && block.content) {
            const resultText = typeof block.content === "string" ? block.content : JSON.stringify(block.content).substring(0, 500);
            callback({ stream: "tool_result", data: { id: block.tool_use_id, content: resultText } });
          }
        }
      }
    }
  } else if (obj.type === "result") {
    if (obj.result) {
      callback({ stream: "result", data: obj.result });
    }
    callback({
      stream: "cost",
      data: {
        cost: obj.total_cost_usd,
        duration: obj.duration_ms,
        turns: obj.num_turns,
        usage: obj.usage,
      },
    });
    // 发送 stop reason
    if (obj.stop_reason) {
      callback({ stream: "stop_reason", data: obj.stop_reason });
    }
  }
}

/**
 * 注册输出回调
 */
function onOutput(procId, callback) {
  const session = activeProcesses.get(procId);
  if (!session) return false;
  session.callbacks.push(callback);

  // 发送已有输出
  if (session.output) {
    callback({ stream: "stdout", data: session.output });
  }

  return true;
}

/**
 * 终止会话
 */
function killProcess(procId) {
  const session = activeProcesses.get(procId);
  if (!session) return false;
  session.closed = true;
  session.pendingQueue = [];
  activeProcesses.delete(procId);
  return true;
}

/**
 * 执行单次 Claude 命令（非交互式）
 */
async function runClaudeCommand(prompt, workDir, options = {}) {
  const claudePath = findClaudePath();
  if (!claudePath) return { error: "Claude CLI 未安装" };

  const args = ["-p", prompt];
  if (options.model) args.push("--model", options.model);
  if (options.outputFormat) args.push("--output-format", options.outputFormat);
  if (options.maxTurns) args.push("--max-turns", String(options.maxTurns));

  return new Promise((resolve) => {
    const proc = spawn(claudePath, args, {
      cwd: workDir || process.cwd(),
      env: { ...process.env, ...options.env, FORCE_COLOR: "0", NO_COLOR: "1" },
      shell: false,
      stdio: ["pipe", "pipe", "pipe"],
    });

    // 立即关闭 stdin，避免 Claude 等待管道数据
    proc.stdin.end();

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => {
      stdout += data.toString("utf-8");
    });
    proc.stderr.on("data", (data) => {
      stderr += data.toString("utf-8");
    });
    proc.on("close", (code) => {
      resolve({ stdout, stderr, code });
    });
    proc.on("error", (err) => {
      resolve({ stdout, stderr, error: err.message });
    });
  });
}

// ============================================================
//  配置文件读写
// ============================================================

/**
 * 读取配置文件
 * @param {string} level - "user" | "project" | "local"
 * @param {string} projectDir - 项目目录（level=project/local 时需要）
 */
function readConfig(level, projectDir) {
  let configPath;
  switch (level) {
    case "user":
      configPath = path.join(getClaudeDir(), "settings.json");
      break;
    case "project":
      if (!projectDir) return { error: "缺少项目目录" };
      configPath = path.join(projectDir, ".claude", "settings.json");
      break;
    case "local":
      if (!projectDir) return { error: "缺少项目目录" };
      configPath = path.join(projectDir, ".claude", "settings.local.json");
      break;
    case "state":
      configPath = getClaudeConfigPath();
      break;
    default:
      return { error: "未知配置级别" };
  }
  return readJsonSafe(configPath) || {};
}

/**
 * 写入配置文件
 */
function writeConfig(level, config, projectDir) {
  let configPath;
  switch (level) {
    case "user":
      configPath = path.join(getClaudeDir(), "settings.json");
      break;
    case "project":
      if (!projectDir) return { error: "缺少项目目录" };
      configPath = path.join(projectDir, ".claude", "settings.json");
      break;
    case "local":
      if (!projectDir) return { error: "缺少项目目录" };
      configPath = path.join(projectDir, ".claude", "settings.local.json");
      break;
    case "state":
      configPath = getClaudeConfigPath();
      break;
    default:
      return { error: "未知配置级别" };
  }
  try {
    writeJsonSafe(configPath, config);
    return { success: true };
  } catch (e) {
    return { error: e.message };
  }
}

/**
 * 读取 CLAUDE.md
 */
function readCLAUDEmd(scope, projectDir) {
  let filePath;
  if (scope === "user") {
    filePath = path.join(getClaudeDir(), "CLAUDE.md");
  } else if (scope === "project") {
    if (!projectDir) return { error: "缺少项目目录" };
    filePath = path.join(projectDir, "CLAUDE.md");
  } else {
    return { error: "未知范围" };
  }
  try {
    return { content: fs.readFileSync(filePath, "utf-8") };
  } catch (e) {
    return { content: "", error: e.message };
  }
}

/**
 * 写入 CLAUDE.md
 */
function writeCLAUDEmd(scope, content, projectDir) {
  let filePath;
  if (scope === "user") {
    filePath = path.join(getClaudeDir(), "CLAUDE.md");
  } else if (scope === "project") {
    if (!projectDir) return { error: "缺少项目目录" };
    filePath = path.join(projectDir, "CLAUDE.md");
  } else {
    return { error: "未知范围" };
  }
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, content, "utf-8");
    return { success: true };
  } catch (e) {
    return { error: e.message };
  }
}

// ============================================================
//  MCP 配置管理
// ============================================================

function readMCPConfig(projectDir) {
  // 全局: ~/.claude/.mcp.json, 项目: projectDir/.mcp.json
  const configs = {};

  const globalPath = path.join(getClaudeDir(), ".mcp.json");
  configs.global = readJsonSafe(globalPath) || { mcpServers: {} };

  if (projectDir) {
    const projectPath = path.join(projectDir, ".mcp.json");
    configs.project = readJsonSafe(projectPath) || { mcpServers: {} };
  }

  return configs;
}

function writeMCPConfig(scope, config, projectDir) {
  let filePath;
  if (scope === "global") {
    filePath = path.join(getClaudeDir(), ".mcp.json");
  } else if (scope === "project") {
    if (!projectDir) return { error: "缺少项目目录" };
    filePath = path.join(projectDir, ".mcp.json");
  } else {
    return { error: "未知范围" };
  }
  try {
    writeJsonSafe(filePath, config);
    return { success: true };
  } catch (e) {
    return { error: e.message };
  }
}

// ============================================================
//  自定义命令管理
// ============================================================

function listCommands(scope, projectDir) {
  const commands = [];

  const dirs = [];
  if (scope === "user" || scope === "all") {
    dirs.push({ path: path.join(getClaudeDir(), "commands"), scope: "user" });
  }
  if (scope === "project" || scope === "all") {
    if (projectDir) {
      dirs.push({ path: path.join(projectDir, ".claude", "commands"), scope: "project" });
    }
  }

  for (const { path: dirPath, scope: cmdScope } of dirs) {
    if (!fs.existsSync(dirPath)) continue;
    try {
      const files = fs.readdirSync(dirPath);
      for (const file of files) {
        if (!file.endsWith(".md")) continue;
        const filePath = path.join(dirPath, file);
        const stat = fs.statSync(filePath);
        const name = path.basename(file, ".md");
        const content = fs.readFileSync(filePath, "utf-8");
        // 提取第一行作为描述
        const firstLine = content.split("\n").find((l) => l.trim()) || "";
        commands.push({
          name,
          scope: cmdScope,
          path: filePath,
          description: firstLine.replace(/^#\s*/, "").substring(0, 100),
          content,
          lastModified: stat.mtime.toISOString(),
        });
      }
    } catch (e) {
      // skip
    }
  }

  return commands;
}

function writeCommand(filePath, content) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, content, "utf-8");
    return { success: true };
  } catch (e) {
    return { error: e.message };
  }
}

function deleteCommand(filePath) {
  try {
    fs.unlinkSync(filePath);
    return { success: true };
  } catch (e) {
    return { error: e.message };
  }
}

// ============================================================
//  Skills 管理
// ============================================================

function listSkills() {
  const skillsDir = path.join(getClaudeDir(), "skills");
  if (!fs.existsSync(skillsDir)) return [];

  const skills = [];
  try {
    const entries = fs.readdirSync(skillsDir);
    for (const entry of entries) {
      const entryPath = path.join(skillsDir, entry);
      if (!fs.statSync(entryPath).isDirectory()) continue;

      // 读取 SKILL.md
      const skillMdPath = path.join(entryPath, "SKILL.md");
      let name = entry;
      let description = "";
      let content = "";

      if (fs.existsSync(skillMdPath)) {
        content = fs.readFileSync(skillMdPath, "utf-8");
        // 提取名称和描述
        const nameMatch = content.match(/^#\s+(.+)$/m);
        if (nameMatch) name = nameMatch[1];
        const descMatch = content.match(/^>?\s*(.+)$/m);
        if (descMatch) description = descMatch[1];
      }

      skills.push({
        name,
        dirName: entry,
        path: entryPath,
        description,
        content,
        skillMdPath: fs.existsSync(skillMdPath) ? skillMdPath : null,
      });
    }
  } catch (e) {
    // skip
  }

  return skills;
}

function deleteSkill(dirName) {
  try {
    const skillDir = path.join(getClaudeDir(), "skills", dirName);
    fs.rmSync(skillDir, { recursive: true, force: true });
    return { success: true };
  } catch (e) {
    return { error: e.message };
  }
}

// ============================================================
//  文件操作
// ============================================================

function readDir(dirPath) {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    return entries.map((e) => ({
      name: e.name,
      isDirectory: e.isDirectory(),
      isFile: e.isFile(),
      path: path.join(dirPath, e.name),
    }));
  } catch (e) {
    return [];
  }
}

function readFile(filePath) {
  try {
    return { content: fs.readFileSync(filePath, "utf-8") };
  } catch (e) {
    return { error: e.message };
  }
}

function writeFile(filePath, content) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, content, "utf-8");
    return { success: true };
  } catch (e) {
    return { error: e.message };
  }
}

function fileExists(filePath) {
  return fs.existsSync(filePath);
}

function getHomeDirPath() {
  return getHomeDir();
}

function getClaudeDirPath() {
  return getClaudeDir();
}

function pathJoin(...args) {
  return path.join(...args);
}

function pathBasename(filePath) {
  return path.basename(filePath);
}

function pathDirname(filePath) {
  return path.dirname(filePath);
}

// ============================================================
//  环境变量
// ============================================================

function getEnvVars() {
  const relevant = [
    "ANTHROPIC_API_KEY",
    "ANTHROPIC_MODEL",
    "ANTHROPIC_DEFAULT_OPUS_MODEL",
    "ANTHROPIC_DEFAULT_SONNET_MODEL",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL",
    "CLAUDE_CODE_USE_BEDROCK",
    "CLAUDE_CODE_USE_VERTEX",
    "CLAUDE_CODE_USE_FOUNDRY",
    "AWS_REGION",
    "AWS_PROFILE",
    "CLAUDE_CODE_SUBAGENT_MODEL",
    "MAX_THINKING_TOKENS",
    "CLAUDE_CODE_MAX_OUTPUT_TOKENS",
    "BASH_DEFAULT_TIMEOUT_MS",
    "DISABLE_AUTOUPDATER",
    "DISABLE_TELEMETRY",
    "HTTP_PROXY",
    "HTTPS_PROXY",
    "NO_PROXY",
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS",
  ];
  const result = {};
  for (const key of relevant) {
    if (process.env[key]) {
      result[key] = process.env[key];
    }
  }
  return result;
}

function getAllEnvVars() {
  return { ...process.env };
}

// ============================================================
//  暴露 API 到 window
// ============================================================

window.claudeAPI = {
  // 系统检测
  checkInstall,
  runDoctor,
  checkAuthStatus,
  findClaudePath,

  // 会话管理
  listSessions,
  getSessionHistory,
  getSessionStats,

  // 终端/子进程
  startClaudeSession,
  sendInput,
  onOutput,
  killProcess,
  runClaudeCommand,

  // 配置管理
  readConfig,
  writeConfig,
  readCLAUDEmd,
  writeCLAUDEmd,

  // MCP
  readMCPConfig,
  writeMCPConfig,

  // 自定义命令
  listCommands,
  writeCommand,
  deleteCommand,

  // Skills
  listSkills,
  deleteSkill,

  // 文件操作
  readDir,
  readFile,
  writeFile,
  fileExists,
  getHomeDir: getHomeDirPath,
  getClaudeDir: getClaudeDirPath,
  pathJoin,
  pathBasename,
  pathDirname,

  // 环境变量
  getEnvVars,
  getAllEnvVars,

  // 执行命令（简版 — 供 setup 页面等仅需要最终结果的场景）
  execCommand: (command, options, callback) => {
    if (typeof options === "function") {
      callback = options;
      options = {};
    }
    options = options || {};
    window.claudeAPI.execCommandStream(command, options, (event) => {
      if (event.type === "done") {
        callback({
          error: event.code !== 0 ? `进程退出码: ${event.code}` : null,
          stdout: event.stdout,
          stderr: event.stderr,
        });
      }
    });
  },

  // 流式执行命令 — 实时回调 stdout/stderr，安装过程可见
  // options: { shell?: "cmd"|"powershell", timeout?: number, env?: object }
  // onEvent: (event) => void — event.type = "stdout"|"stderr"|"done"|"error"
  execCommandStream: (command, options, onEvent) => {
    if (typeof options === "function") {
      onEvent = options;
      options = {};
    }
    options = options || {};
    const timeout = options.timeout || 300000;
    const extraEnv = options.env || {};
    const mergedEnv = { ...process.env, ...extraEnv };

    const startProc = (exe, args, opts) => {
      const proc = spawn(exe, args, opts);
      let stdout = "";
      let stderr = "";
      let done = false;

      const timer = setTimeout(() => {
        try { proc.kill("SIGTERM"); } catch (e) {}
        if (!done) {
          done = true;
          onEvent({ type: "error", data: "命令执行超时（5分钟）" });
          onEvent({ type: "done", code: -1, stdout, stderr });
        }
      }, timeout);

      proc.stdout.on("data", (d) => {
        const text = d.toString("utf-8");
        stdout += text;
        onEvent({ type: "stdout", data: text });
      });
      proc.stderr.on("data", (d) => {
        const text = d.toString("utf-8");
        stderr += text;
        onEvent({ type: "stderr", data: text });
      });
      proc.on("close", (code) => {
        clearTimeout(timer);
        if (!done) {
          done = true;
          onEvent({ type: "done", code, stdout, stderr });
        }
      });
      proc.on("error", (err) => {
        clearTimeout(timer);
        if (!done) {
          done = true;
          onEvent({ type: "error", data: err.message });
          onEvent({ type: "done", code: -1, stdout, stderr });
        }
      });
    };

    if (process.platform === "win32" && options.shell === "powershell") {
      startProc("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command], {
        cwd: getHomeDir(),
        env: mergedEnv,
        shell: false,
        stdio: ["pipe", "pipe", "pipe"],
      });
    } else {
      startProc(command, [], {
        cwd: getHomeDir(),
        env: mergedEnv,
        shell: true,
        stdio: ["pipe", "pipe", "pipe"],
      });
    }
  },

  // 检查命令是否存在 — 返回 { found: boolean, path: string|null }
  checkCommandExists: (cmd) => {
    try {
      const checkCmd = process.platform === "win32"
        ? `where ${cmd}`
        : `which ${cmd}`;
      const result = execSync(checkCmd, { encoding: "utf-8", timeout: 5000, stdio: ["pipe", "pipe", "pipe"] }).trim();
      const foundPath = result.split("\n")[0].trim().replace(/\r/g, "");
      return { found: !!foundPath, path: foundPath || null };
    } catch (e) {
      return { found: false, path: null };
    }
  },

  // 测试网络连通性 — 返回 { ok: boolean, latency?: number, error?: string }
  // proxy 参数可选，如 "http://127.0.0.1:7890"
  testNetworkUrl: (url, timeoutMs, proxy) => {
    timeoutMs = timeoutMs || 10000;
    const https = require("node:https");
    const http = require("node:http");
    const urlObj = new URL(url);
    const client = urlObj.protocol === "https:" ? https : http;

    // 代理优先级: 参数 > 环境变量
    const proxyUrl = proxy || process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.https_proxy || process.env.http_proxy;

    return new Promise((resolve) => {
      const start = Date.now();
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === "https:" ? 443 : 80),
        path: urlObj.pathname + (urlObj.search || ""),
        method: "HEAD",
        timeout: timeoutMs,
      };

      // 如果有代理，通过 HTTP CONNECT 隧道连接
      if (proxyUrl) {
        try {
          const pUrl = new URL(proxyUrl);
          const tunnelReq = (pUrl.protocol === "https:" ? https : http).request({
            hostname: pUrl.hostname,
            port: parseInt(pUrl.port) || (pUrl.protocol === "https:" ? 443 : 80),
            method: "CONNECT",
            path: `${urlObj.hostname}:${urlObj.port || (urlObj.protocol === "https:" ? 443 : 80)}`,
            timeout: timeoutMs,
          });
          tunnelReq.on("connect", (res, socket) => {
            if (res.statusCode !== 200) {
              resolve({ ok: false, error: `代理拒绝连接 (HTTP ${res.statusCode})` });
              return;
            }
            const req = client.request({ ...options, socket, agent: false }, (res2) => {
              resolve({ ok: res2.statusCode < 500, latency: Date.now() - start, status: res2.statusCode });
            });
            req.on("error", (e) => resolve({ ok: false, error: e.message }));
            req.on("timeout", () => { req.destroy(); resolve({ ok: false, error: "连接超时" }); });
            req.end();
          });
          tunnelReq.on("error", (e) => resolve({ ok: false, error: `代理连接失败: ${e.message}` }));
          tunnelReq.on("timeout", () => { tunnelReq.destroy(); resolve({ ok: false, error: "代理连接超时" }); });
          tunnelReq.end();
        } catch (e) {
          resolve({ ok: false, error: `代理配置错误: ${e.message}` });
        }
      } else {
        // 直连
        const req = client.request(options, (res) => {
          resolve({ ok: res.statusCode < 500, latency: Date.now() - start, status: res.statusCode });
        });
        req.on("error", (e) => resolve({ ok: false, error: e.message }));
        req.on("timeout", () => { req.destroy(); resolve({ ok: false, error: "连接超时" }); });
        req.end();
      }
    });
  },

  // 终端：启动持久化 shell 进程
  startShell: (workDir) => {
    const shell = process.platform === "win32"
      ? (process.env.COMSPEC || "cmd.exe")
      : (process.env.SHELL || "/bin/zsh");
    const shellArgs = process.platform === "win32" ? [] : ["-i"];
    const cwd = workDir || getHomeDir();
    const proc = spawn(shell, shellArgs, {
      cwd,
      env: { ...process.env, TERM: "xterm-256color", FORCE_COLOR: "1" },
      shell: false,
      stdio: ["pipe", "pipe", "pipe"],
    });
    const procId = `shell_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    activeProcesses.set(procId, proc);
    return { procId, pid: proc.pid };
  },

  // 终端：发送输入到 shell
  sendShellInput: (procId, data) => {
    const proc = activeProcesses.get(procId);
    if (!proc) return false;
    try {
      proc.stdin.write(data);
      return true;
    } catch (e) {
      return false;
    }
  },

  // 终端：注册 shell 输出回调
  onShellOutput: (procId, callback) => {
    const proc = activeProcesses.get(procId);
    if (!proc) return false;
    proc.stdout.on("data", (data) => {
      callback({ stream: "stdout", data: data.toString("utf-8") });
    });
    proc.stderr.on("data", (data) => {
      callback({ stream: "stderr", data: data.toString("utf-8") });
    });
    proc.on("close", (code) => {
      callback({ stream: "close", data: code });
      activeProcesses.delete(procId);
    });
    proc.on("error", (err) => {
      callback({ stream: "error", data: err.message });
      activeProcesses.delete(procId);
    });
    return true;
  },

  // 终端：终止 shell
  killShell: (procId) => {
    const proc = activeProcesses.get(procId);
    if (!proc) return false;
    try {
      proc.kill("SIGTERM");
      activeProcesses.delete(procId);
      return true;
    } catch (e) {
      return false;
    }
  },

  // 终端：调整 shell 窗口大小（发送 SIGWINCH）
  resizeShell: (procId, cols, rows) => {
    const proc = activeProcesses.get(procId);
    if (!proc || !proc.kill) return false;
    try {
      process.kill(proc.pid, "SIGWINCH");
      return true;
    } catch (e) {
      return false;
    }
  },

  // 终端：执行单条命令并返回输出
  execShellCommand: (command, workDir) => {
    return new Promise((resolve) => {
      exec(command, {
        cwd: workDir || getHomeDir(),
        encoding: "utf-8",
        timeout: 30000,
        maxBuffer: 1024 * 1024,
      }, (err, stdout, stderr) => {
        resolve({
          stdout: stdout || "",
          stderr: stderr || "",
          code: err ? err.code : 0,
          error: err ? err.message : null,
        });
      });
    });
  },

  // 网关查询
  queryGateway,

  // 平台信息
  platform: process.platform,
  arch: process.arch,
  nodeVersion: process.version,
};

// ============================================================
//  注册 uTools 工具 — 供 AI Agent 调用
// ============================================================

// 工具1: 执行 Claude 编程任务
utools.registerTool('claude_run', async ({ prompt, workDir, model }) => {
  const cwd = workDir || utools.dbStorage.getItem("defaultWorkDir") || getHomeDir();
  const result = await runClaudeCommand(prompt, cwd, { model });
  if (result.error) {
    throw new Error(`Claude 执行失败: ${result.error}`);
  }
  // 尝试解析 stream-json 或普通文本
  let resultText = result.stdout;
  let cost = 0;
  try {
    const lines = result.stdout.split("\n").filter((l) => l.trim());
    for (const line of lines) {
      const obj = JSON.parse(line);
      if (obj.type === "result" && obj.result) {
        resultText = obj.result;
        cost = obj.total_cost_usd || 0;
        break;
      }
    }
  } catch (e) {
    // 非 JSON，直接使用 stdout
  }
  return { result: resultText, cost };
});

// 工具2: 列出历史会话
utools.registerTool('claude_session_list', async () => {
  const sessions = listSessions();
  return { sessions };
});

// 工具3: 读取配置
utools.registerTool('claude_config_read', async ({ level, projectDir }) => {
  const config = readConfig(level || "user", projectDir);
  return config;
});

// 工具4: 检查安装状态
utools.registerTool('claude_status', async () => {
  const status = await checkInstall();
  return {
    installed: status.installed,
    version: status.version,
    path: status.path,
  };
});

// ============================================================
//  网关查询 — 支持 LiteLLM/Stargate/OpenRouter/One API 等网关
// ============================================================

async function queryGateway(baseUrl, apiKey) {
  if (!baseUrl) return { error: "未配置网关 URL" };
  const https = require("node:https");
  const http = require("node:http");
  const urlObj = new URL(baseUrl);
  const client = urlObj.protocol === "https:" ? https : http;

  return new Promise((resolve) => {
    // 尝试获取模型列表
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === "https:" ? 443 : 80),
      path: "/v1/models",
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 10000,
    };
    if (apiKey) {
      options.headers["x-api-key"] = apiKey;
      options.headers["Authorization"] = "Bearer " + apiKey;
    }

    const req = client.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const obj = JSON.parse(data);
          if (obj.error) {
            resolve({ error: obj.error.message || JSON.stringify(obj.error) });
            return;
          }
          const models = (obj.data || obj.models || []).map((m) =>
            typeof m === "string" ? m : (m.id || m.name || "?")
          );
          resolve({ models, balance: null });
        } catch (e) {
          resolve({ error: "无法解析响应" });
        }
      });
    });

    req.on("error", (e) => resolve({ error: e.message }));
    req.on("timeout", () => { req.destroy(); resolve({ error: "请求超时" }); });
    req.end();
  });
}
