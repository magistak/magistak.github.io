(function () {
  'use strict';

  window.HELLEVO_UI_VERSION = '1.0.0';

  const STORAGE_CHAT_KEY = 'hellyeah_gemini_chat_v1';
  const STORAGE_GEMINI_KEY = 'hellyeah_gemini_key';
  const STORAGE_GH_TOKEN = 'hellyeah_gh_token';
  const STORAGE_MODEL_KEY = 'hellyeah_gemini_model';
  const STORAGE_THEME_KEY = 'hellyeah_gemini_theme';

  const MODEL_FALLBACK_CHAIN = [
    'gemini-2.5-flash',
    'gemini-3-flash-preview',
    'gemini-2.5-pro',
    'gemini-2.0-flash'
  ];

  const GEMINI_TOOLS = [
    {
      functionDeclarations: [
        {
          name: 'call_antigravity',
          description:
            'Invoke Antigravity (the autonomous full-stack coding agent running in a Linux VM connected to this app repository) to modify the web application source code, add permanent features, or evolve the codebase. ONLY call this tool when the user asks to change/build/evolve the app or explicitly asks you to use Antigravity.',
          parameters: {
            type: 'OBJECT',
            properties: {
              instruction: {
                type: 'STRING',
                description: 'Detailed prompt/instruction for Antigravity describing what to change or build in the app.'
              },
              summary: {
                type: 'STRING',
                description: 'Brief 3-7 word summary of the task.'
              }
            },
            required: ['instruction', 'summary']
          }
        },
        {
          name: 'render_live_widget',
          description:
            'Render an instant interactive HTML/CSS widget or preview card directly inside the chat without waiting for a repository build.',
          parameters: {
            type: 'OBJECT',
            properties: {
              title: { type: 'STRING', description: 'Widget title' },
              html: { type: 'STRING', description: 'HTML markup for the widget' },
              css: { type: 'STRING', description: 'Optional CSS rules for the widget' }
            },
            required: ['title', 'html']
          }
        }
      ]
    }
  ];

  const SYSTEM_INSTRUCTION = [
    'You are Gemini, the AI assistant inside "hellyeah" on the user\'s iPhone.',
    'By default, chat naturally, directly, and concisely with the user like the official Gemini app.',
    'You have access to two tools:',
    '1. `call_antigravity(instruction, summary)`: Calls Antigravity, the autonomous coding agent running in a remote Linux VM connected to this app\'s GitHub repo (`magistak/magistak.github.io`). Call `call_antigravity` ONLY when the user wants to permanently modify/evolve the app\'s codebase or explicitly asks you to invoke Antigravity.',
    '2. `render_live_widget(title, html, css)`: Instantly renders an interactive HTML/CSS mini-widget right inside the chat.',
    'Never call `call_antigravity` for normal greetings, general questions, or casual conversation—just answer directly.'
  ].join('\n');

  let chatMessages = [];
  let isSending = false;

  function loadSavedChat() {
    try {
      const raw = localStorage.getItem(STORAGE_CHAT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) chatMessages = parsed;
      }
    } catch (e) {
      chatMessages = [];
    }
  }

  function saveChat() {
    try {
      localStorage.setItem(STORAGE_CHAT_KEY, JSON.stringify(chatMessages.slice(-40)));
    } catch (e) {}
  }

  function escapeHTML(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatMarkdown(md) {
    if (!md) return '';
    let html = escapeHTML(md);
    // Code blocks
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, function (_, lang, code) {
      return '<pre><code>' + code.trim() + '</code></pre>';
    });
    // Inline code
    html = html.replace(/`([^`\n]+)`/g, '<code>$1</code>');
    // Bold
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    // Italic
    html = html.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
    // Paragraphs
    return html
      .split(/\n{2,}/)
      .map((p) => '<p>' + p.replace(/\n/g, '<br/>') + '</p>')
      .join('');
  }

  function updateKeyIndicators() {
    const geminiKey = (localStorage.getItem(STORAGE_GEMINI_KEY) || '').trim();
    const ghToken = (localStorage.getItem(STORAGE_GH_TOKEN) || '').trim();

    const keyDot = document.getElementById('key-dot');
    if (keyDot) {
      keyDot.classList.toggle('ready', Boolean(geminiKey));
    }

    const missingBanner = document.getElementById('missing-key-banner');
    if (missingBanner) {
      missingBanner.classList.toggle('hidden', Boolean(geminiKey));
    }

    const geminiInput = document.getElementById('settings-gemini-key');
    const geminiStatus = document.getElementById('gemini-status-msg');
    if (geminiInput && geminiKey) geminiInput.value = geminiKey;
    if (geminiStatus) {
      geminiStatus.textContent = geminiKey
        ? '✓ Gemini API Key saved in iPhone localStorage'
        : 'No Gemini API Key saved yet';
    }

    const ghInput = document.getElementById('settings-gh-token');
    const ghStatus = document.getElementById('gh-status-msg');
    if (ghInput && ghToken) ghInput.value = ghToken;
    if (ghStatus) {
      ghStatus.textContent = ghToken
        ? '✓ GitHub Token ready for call_antigravity() tool calls'
        : 'Optional: Needed only when Gemini calls call_antigravity()';
    }
  }

  function renderThread() {
    const welcome = document.getElementById('welcome-screen');
    const thread = document.getElementById('messages-thread');
    const viewport = document.getElementById('chat-viewport');
    if (!thread) return;

    if (welcome) {
      welcome.classList.toggle('hidden', chatMessages.length > 0);
    }

    thread.innerHTML = chatMessages
      .map((m) => {
        if (m.role === 'user') {
          return `
            <div class="msg-row user">
              <div class="msg-bubble">${escapeHTML(m.text)}</div>
            </div>
          `;
        }

        const toolHtml = m.toolCall
          ? `
            <div class="tool-call-card" id="tool-card-${escapeHTML(m.id)}">
              <div class="tool-call-header">
                <span class="tool-call-title">🛠️ ${escapeHTML(m.toolCall.name)}(${escapeHTML(m.toolCall.summary || '')})</span>
                <span class="tool-call-badge">${escapeHTML(m.toolCall.status || 'Invoked')}</span>
              </div>
              <div class="tool-call-body">${escapeHTML(m.toolCall.instruction || '')}</div>
              ${m.toolCall.liveStream ? `<div class="tool-call-stream">${formatMarkdown(m.toolCall.liveStream)}</div>` : ''}
            </div>
          `
          : '';

        const widgetHtml = m.widgetHtml
          ? `<div class="live-widget-dock" style="margin-top:0.55rem;">${m.widgetHtml}</div>`
          : '';

        return `
          <div class="msg-row model">
            <div class="model-header">
              <span class="sparkle">✦</span>
              <span>${escapeHTML(m.modelLabel || 'Gemini')}</span>
            </div>
            ${toolHtml}
            ${m.text ? `<div class="msg-bubble">${formatMarkdown(m.text)}</div>` : ''}
            ${widgetHtml}
          </div>
        `;
      })
      .join('');

    if (viewport) {
      viewport.scrollTop = viewport.scrollHeight;
    }
  }

  function buildGeminiContents() {
    const contents = [];
    for (const m of chatMessages) {
      if (m.role === 'user' && m.text) {
        contents.push({
          role: 'user',
          parts: [{ text: m.text }]
        });
      } else if (m.role === 'model' && (m.text || m.toolCall)) {
        const parts = [];
        if (m.text) parts.push({ text: m.text });
        if (parts.length > 0) {
          contents.push({ role: 'model', parts });
        }
      }
    }
    return contents;
  }

  async function callSingleModel(modelName, apiKey, contents, enableTools) {
    const url =
      'https://generativelanguage.googleapis.com/v1beta/models/' +
      encodeURIComponent(modelName) +
      ':generateContent?key=' +
      encodeURIComponent(apiKey);

    const payload = {
      systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
      contents,
      generationConfig: {
        temperature: 0.6
      }
    };
    if (enableTools) {
      payload.tools = GEMINI_TOOLS;
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      let msg = 'HTTP ' + res.status;
      try {
        const errData = await res.json();
        if (errData && errData.error && errData.error.message) {
          msg = errData.error.message;
        }
      } catch (e) {}
      const err = new Error(msg);
      err.status = res.status;
      throw err;
    }

    const data = await res.json();
    return { data, modelName };
  }

  async function generateGeminiResponse(contents, enableTools = true) {
    const apiKey = (localStorage.getItem(STORAGE_GEMINI_KEY) || '').trim();
    const preferred = localStorage.getItem(STORAGE_MODEL_KEY) || 'auto';
    const chain =
      preferred === 'auto'
        ? MODEL_FALLBACK_CHAIN
        : [preferred, ...MODEL_FALLBACK_CHAIN.filter((m) => m !== preferred)];

    let lastErr = null;
    for (const modelName of chain) {
      try {
        return await callSingleModel(modelName, apiKey, contents, enableTools);
      } catch (err) {
        lastErr = err;
        if (err.message && err.message.toLowerCase().includes('api key not valid')) {
          throw err;
        }
      }
    }
    throw lastErr || new Error('Failed to reach Gemini API');
  }

  async function dispatchAntigravityToolCall(instruction, summary, msgObj) {
    const token = (localStorage.getItem(STORAGE_GH_TOKEN) || '').trim();
    if (!token) {
      msgObj.toolCall.status = 'Missing GitHub Token (Tap Keys)';
      renderThread();
      return { ok: false, error: 'No GitHub token configured in Keys settings.' };
    }

    try {
      const res = await fetch('https://api.github.com/repos/magistak/magistak.github.io/issues', {
        method: 'POST',
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: '[hellyeah] ' + (summary || instruction).slice(0, 70),
          body: '[Gemini Tool Call: call_antigravity]\nSummary: ' + summary + '\n\nInstruction:\n' + instruction
        })
      });
      if (!res.ok) throw new Error('GitHub API ' + res.status);
      const issue = await res.json();
      msgObj.toolCall.status = 'Dispatched #' + issue.number + ' • Watching VM...';
      saveChat();
      renderThread();
      watchAntigravityToolIssue(issue.number, msgObj.id);
      return { ok: true, issueNumber: issue.number };
    } catch (err) {
      msgObj.toolCall.status = 'Dispatch Error: ' + err.message;
      saveChat();
      renderThread();
      return { ok: false, error: err.message };
    }
  }

  function watchAntigravityToolIssue(issueNumber, msgId) {
    const token = (localStorage.getItem(STORAGE_GH_TOKEN) || '').trim();
    if (!token || !issueNumber) return;

    const startTime = Date.now();
    const timer = setInterval(async () => {
      if (Date.now() - startTime > 240000) {
        clearInterval(timer);
        return;
      }
      try {
        const res = await fetch(
          `https://api.github.com/repos/magistak/magistak.github.io/issues/${issueNumber}/comments?t=${Date.now()}`,
          {
            headers: {
              Accept: 'application/vnd.github+json',
              Authorization: 'Bearer ' + token
            },
            cache: 'no-store'
          }
        );
        if (res.ok) {
          const comments = await res.json();
          if (Array.isArray(comments) && comments.length > 0) {
            const latest = comments[comments.length - 1];
            const target = chatMessages.find((m) => m.id === msgId);
            if (target && target.toolCall) {
              target.toolCall.status = 'Antigravity Active on #' + issueNumber;
              target.toolCall.liveStream = latest.body;
              saveChat();
              renderThread();
            }
          }
        }
      } catch (e) {}
    }, 2000);
  }

  async function handleUserMessage(text) {
    const trimmed = String(text || '').trim();
    if (!trimmed || isSending) return;

    const apiKey = (localStorage.getItem(STORAGE_GEMINI_KEY) || '').trim();
    if (!apiKey) {
      const missingBanner = document.getElementById('missing-key-banner');
      if (missingBanner) missingBanner.classList.remove('hidden');
      const keyInput = document.getElementById('welcome-gemini-key');
      if (keyInput) keyInput.focus();
      return;
    }

    isSending = true;
    const sendBtn = document.getElementById('gemini-send-btn');
    if (sendBtn) sendBtn.disabled = true;

    const inputEl = document.getElementById('gemini-input');
    if (inputEl) {
      inputEl.value = '';
      inputEl.style.height = 'auto';
    }

    chatMessages.push({
      id: 'u-' + Date.now(),
      role: 'user',
      text: trimmed
    });

    const placeholderId = 'm-' + (Date.now() + 1);
    const placeholderMsg = {
      id: placeholderId,
      role: 'model',
      modelLabel: 'Gemini',
      text: '...'
    };
    chatMessages.push(placeholderMsg);
    renderThread();

    try {
      const contents = buildGeminiContents().slice(0, -1); // exclude placeholder
      const { data, modelName } = await generateGeminiResponse(contents, true);
      placeholderMsg.modelLabel = 'Gemini (' + modelName + ')';

      const parts = (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) || [];
      let textParts = [];
      let funcCall = null;

      for (const part of parts) {
        if (part.text) textParts.push(part.text);
        if (part.functionCall) funcCall = part.functionCall;
      }

      placeholderMsg.text = textParts.join('\n').trim();

      if (funcCall) {
        const fnName = funcCall.name;
        const args = funcCall.args || {};

        if (fnName === 'render_live_widget') {
          placeholderMsg.toolCall = {
            name: 'render_live_widget',
            summary: args.title || 'Live Widget',
            instruction: 'Rendered instant widget inside chat viewport.',
            status: '✓ Rendered Live'
          };
          if (args.css) {
            let dynStyle = document.getElementById('gemini-widget-css');
            if (!dynStyle) {
              dynStyle = document.createElement('style');
              dynStyle.id = 'gemini-widget-css';
              document.head.appendChild(dynStyle);
            }
            dynStyle.textContent += '\n' + args.css;
          }
          placeholderMsg.widgetHtml = args.html || '';
          if (!placeholderMsg.text) {
            placeholderMsg.text = `Rendered **${args.title || 'Live Widget'}** above.`;
          }
        } else if (fnName === 'call_antigravity') {
          const instruction = args.instruction || trimmed;
          const summary = args.summary || instruction.slice(0, 40);
          placeholderMsg.toolCall = {
            name: 'call_antigravity',
            summary,
            instruction,
            status: 'Calling Antigravity VM...'
          };
          if (!placeholderMsg.text) {
            placeholderMsg.text = `I've invoked **Antigravity** via \`call_antigravity\` to handle that. Live progress from the VM will stream in the tool card above.`;
          }
          renderThread();
          await dispatchAntigravityToolCall(instruction, summary, placeholderMsg);
        }
      }

      if (!placeholderMsg.text && !placeholderMsg.toolCall) {
        placeholderMsg.text = '*(No text returned by model)*';
      }
    } catch (err) {
      placeholderMsg.modelLabel = 'Gemini Error';
      placeholderMsg.text = `⚠️ **Gemini API Error**: \`${err.message}\`\nTap **Keys** in the top right to verify your Gemini API key.`;
    } finally {
      isSending = false;
      if (sendBtn) sendBtn.disabled = false;
      saveChat();
      renderThread();
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    // Restore theme
    const savedTheme = localStorage.getItem(STORAGE_THEME_KEY) || 'gemini-dark';
    document.documentElement.setAttribute('data-theme', savedTheme);

    // Restore model picker
    const modelPicker = document.getElementById('model-picker');
    const savedModel = localStorage.getItem(STORAGE_MODEL_KEY) || 'auto';
    if (modelPicker) {
      modelPicker.value = savedModel;
      modelPicker.addEventListener('change', () => {
        localStorage.setItem(STORAGE_MODEL_KEY, modelPicker.value);
      });
    }

    loadSavedChat();
    updateKeyIndicators();
    renderThread();

    // Form submit
    const form = document.getElementById('gemini-form');
    const input = document.getElementById('gemini-input');

    if (form && input) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        handleUserMessage(input.value);
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleUserMessage(input.value);
        }
      });

      input.addEventListener('input', () => {
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 120) + 'px';
      });
    }

    // Starter chips
    document.querySelectorAll('.starter-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const prompt = chip.getAttribute('data-prompt');
        if (prompt) handleUserMessage(prompt);
      });
    });

    // Welcome screen quick key save
    const welcomeSaveBtn = document.getElementById('welcome-save-key-btn');
    if (welcomeSaveBtn) {
      welcomeSaveBtn.addEventListener('click', () => {
        const val = (document.getElementById('welcome-gemini-key').value || '').trim();
        if (val) {
          localStorage.setItem(STORAGE_GEMINI_KEY, val);
          updateKeyIndicators();
        }
      });
    }

    // New Chat / Clear
    const clearBtn = document.getElementById('clear-chat-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        chatMessages = [];
        saveChat();
        renderThread();
      });
    }

    // Settings sheet
    const sheet = document.getElementById('settings-sheet');
    const openSettingsBtn = document.getElementById('open-settings-btn');
    const closeSettingsBtn = document.getElementById('close-settings-btn');
    const backdrop = document.getElementById('sheet-backdrop');

    const closeSheet = () => {
      if (sheet) sheet.classList.add('hidden');
    };

    if (openSettingsBtn && sheet) {
      openSettingsBtn.addEventListener('click', () => {
        updateKeyIndicators();
        sheet.classList.remove('hidden');
      });
    }
    if (closeSettingsBtn) closeSettingsBtn.addEventListener('click', closeSheet);
    if (backdrop) backdrop.addEventListener('click', closeSheet);

    const saveGeminiBtn = document.getElementById('save-gemini-btn');
    if (saveGeminiBtn) {
      saveGeminiBtn.addEventListener('click', () => {
        const val = (document.getElementById('settings-gemini-key').value || '').trim();
        if (val) localStorage.setItem(STORAGE_GEMINI_KEY, val);
        else localStorage.removeItem(STORAGE_GEMINI_KEY);
        updateKeyIndicators();
      });
    }

    const saveGhBtn = document.getElementById('save-gh-btn');
    if (saveGhBtn) {
      saveGhBtn.addEventListener('click', () => {
        const val = (document.getElementById('settings-gh-token').value || '').trim();
        if (val) localStorage.setItem(STORAGE_GH_TOKEN, val);
        else localStorage.removeItem(STORAGE_GH_TOKEN);
        updateKeyIndicators();
      });
    }

    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const cur = document.documentElement.getAttribute('data-theme');
        const next = cur === 'gemini-light' ? 'gemini-dark' : 'gemini-light';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem(STORAGE_THEME_KEY, next);
      });
    }
  });
})();
