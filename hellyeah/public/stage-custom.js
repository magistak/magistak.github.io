// Delta Stage Plugin (v0.6.1) - Multi-Model Gemini Router (Gemini 3 Flash / 2.5 Flash / 2.5 Pro) + Capture-Phase Hot Interceptor
(function () {
  const GEMINI_MODELS_CHAIN = [
    'gemini-3-flash-preview',
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-2.0-flash'
  ];

  window.saveInlineGeminiKey = function () {
    const el = document.getElementById('inline-gemini-key');
    if (el && el.value.trim()) {
      localStorage.setItem('hellyeah_gemini_key', el.value.trim());
      const status = document.getElementById('inline-gemini-status');
      if (status) status.textContent = '✓ Key saved! Testing Gemini connection...';
      window.testGeminiDirect();
    }
  };

  window.changeGeminiModel = function (selectEl) {
    if (!selectEl) return;
    localStorage.setItem('hellyeah_gemini_model', selectEl.value);
    const status = document.getElementById('inline-gemini-status');
    if (status) status.textContent = '✓ Model set to: ' + selectEl.value + ' — tapping Test Gemini...';
    window.testGeminiDirect();
  };

  window.clearGeminiKey = function () {
    localStorage.removeItem('hellyeah_gemini_key');
    window.location.reload();
  };

  async function callSingleGeminiModel(modelName, geminiKey, sysPrompt, promptText) {
    const url =
      'https://generativelanguage.googleapis.com/v1beta/models/' +
      encodeURIComponent(modelName) +
      ':generateContent?key=' +
      encodeURIComponent(geminiKey);

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: sysPrompt }] },
        contents: [{ role: 'user', parts: [{ text: promptText }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.35
        }
      })
    });

    if (!res.ok) {
      let errDetail = 'HTTP ' + res.status;
      try {
        const errJson = await res.json();
        if (errJson && errJson.error && errJson.error.message) {
          errDetail = errJson.error.message;
        }
      } catch (e) {}
      const err = new Error(errDetail);
      err.status = res.status;
      throw err;
    }

    const data = await res.json();
    let rawText =
      (data.candidates &&
        data.candidates[0] &&
        data.candidates[0].content &&
        data.candidates[0].content.parts &&
        data.candidates[0].content.parts[0] &&
        data.candidates[0].content.parts[0].text) ||
      '{}';
    rawText = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    const parsed = JSON.parse(rawText);
    parsed._modelUsed = modelName;
    return parsed;
  }

  window.askGeminiMultiModelRouter = async function (promptText) {
    const geminiKey = (localStorage.getItem('hellyeah_gemini_key') || '').trim();
    if (!geminiKey) return { error: 'No Gemini key saved' };

    const preferred = localStorage.getItem('hellyeah_gemini_model') || 'auto';
    const modelsToTry =
      preferred === 'auto'
        ? GEMINI_MODELS_CHAIN
        : [preferred, ...GEMINI_MODELS_CHAIN.filter((m) => m !== preferred)];

    const sysPrompt = [
      'You are the front-line Gemini AI inside "hellyeah", a self-evolving web app on the user\'s iPhone.',
      'You work alongside Antigravity (the deep coding agent running in a Linux VM connected via GitHub).',
      'Decide whether YOU ("self") should answer/handle the user\'s message directly right now, or escalate it to Antigravity ("antigravity"):',
      '- Choose "self" (DEFAULT for 90% of messages) if the user is chatting, testing you, asking questions, brainstorming, asking which model you are, or asking for an instant UI/widget/theme/calculator/tool/style update on the page (which you can inject immediately via stageHtml, customCss, or theme).',
      '- Choose "antigravity" ONLY if the user explicitly asks for Antigravity, or asks for permanent backend/git repository commits across multiple files in the Linux VM.',
      'Return strict JSON with keys:',
      '{"route": "self" | "antigravity", "reply": "Your helpful, concise markdown response", "badge": "Short status badge", "theme": "atelier-dark" | "atelier-light" | null, "customCss": "optional CSS string or null", "stageHtml": "optional interactive HTML card for the stage or null"}'
    ].join('\n');

    let lastErr = null;
    for (const modelName of modelsToTry) {
      try {
        const result = await callSingleGeminiModel(modelName, geminiKey, sysPrompt, promptText);
        localStorage.setItem('hellyeah_last_working_gemini_model', modelName);
        return result;
      } catch (err) {
        lastErr = err;
        if (err.message && err.message.toLowerCase().includes('api key not valid')) {
          break;
        }
      }
    }
    return { error: lastErr ? lastErr.message : 'Gemini request failed' };
  };

  function appendHotBubble(role, author, content, badge) {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const article = document.createElement('article');
    article.className = 'chat-bubble role-' + role;
    article.innerHTML =
      '<div class="bubble-meta"><span class="bubble-author">' +
      author +
      '</span><span>' +
      nowStr +
      '</span></div><div class="bubble-body"><p>' +
      String(content || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>') +
      '</p></div>' +
      (badge ? '<span class="mutation-pill">' + badge + '</span>' : '');
    container.appendChild(article);
    container.scrollTop = container.scrollHeight;
  }

  // Capture-phase hot interceptor in case the tab is running a cached pre-v0.6.1 app.js!
  if (!window.HELLEVO_HOT_INTERCEPT_BOUND) {
    window.HELLEVO_HOT_INTERCEPT_BOUND = true;

    async function handleHotIntercept(promptText) {
      const input = document.getElementById('chat-input');
      if (input) input.value = '';
      appendHotBubble('user', 'You', promptText, null);
      const status = document.getElementById('inline-gemini-status');
      if (status) status.textContent = '⚡ Gemini Router thinking...';

      const decision = await window.askGeminiMultiModelRouter(promptText);
      if (!decision || decision.error) {
        appendHotBubble(
          'assistant',
          'Gemini Router',
          '⚠️ Gemini API Error: ' + (decision ? decision.error : 'Unknown'),
          'Gemini Error'
        );
        return;
      }
      const usedModel = decision._modelUsed || 'gemini-3-flash-preview';
      if (decision.theme === 'atelier-dark' || decision.theme === 'atelier-light') {
        document.documentElement.setAttribute('data-theme', decision.theme);
      }
      if (decision.customCss) {
        let styleTag = document.getElementById('gemini-live-css');
        if (!styleTag) {
          styleTag = document.createElement('style');
          styleTag.id = 'gemini-live-css';
          document.head.appendChild(styleTag);
        }
        styleTag.textContent += '\n' + decision.customCss;
      }
      if (decision.stageHtml) {
        window.GEMINI_STAGE_HTML = decision.stageHtml;
        const modContainer = document.getElementById('modules-container');
        if (modContainer && typeof window.HELLEVO_CUSTOM_STAGE === 'function') {
          modContainer.innerHTML = window.HELLEVO_CUSTOM_STAGE();
        }
      }

      if (decision.route !== 'antigravity') {
        appendHotBubble(
          'assistant',
          'Gemini (' + usedModel + ')',
          decision.reply || 'Done!',
          decision.badge || '⚡ ' + usedModel + ' • Direct (<1s)'
        );
        if (status) status.textContent = '✓ Answered directly by ' + usedModel;
      } else {
        appendHotBubble(
          'assistant',
          'Gemini (' + usedModel + ') → Antigravity',
          decision.reply || 'Escalating to Antigravity in the Linux VM...',
          'Routed to Antigravity VM'
        );
        const token = (localStorage.getItem('hellyeah_gh_token') || '').trim();
        if (token) {
          await fetch('https://api.github.com/repos/magistak/magistak.github.io/issues', {
            method: 'POST',
            headers: {
              Accept: 'application/vnd.github+json',
              Authorization: 'Bearer ' + token,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              title: '[hellyeah] ' + promptText.slice(0, 72),
              body: '[Routed by ' + usedModel + '] ' + promptText
            })
          });
        }
      }
    }

    document.addEventListener(
      'submit',
      function (e) {
        if (e.target && e.target.id === 'chat-form' && !window.HELLEVO_CORE_V061) {
          const geminiKey = (localStorage.getItem('hellyeah_gemini_key') || '').trim();
          const input = document.getElementById('chat-input');
          const text = input ? input.value.trim() : '';
          if (geminiKey && text) {
            e.preventDefault();
            e.stopImmediatePropagation();
            handleHotIntercept(text);
          }
        }
      },
      true
    );

    document.addEventListener(
      'keydown',
      function (e) {
        if (
          e.target &&
          e.target.id === 'chat-input' &&
          e.key === 'Enter' &&
          !e.shiftKey &&
          !window.HELLEVO_CORE_V061
        ) {
          const geminiKey = (localStorage.getItem('hellyeah_gemini_key') || '').trim();
          const text = e.target.value.trim();
          if (geminiKey && text) {
            e.preventDefault();
            e.stopImmediatePropagation();
            handleHotIntercept(text);
          }
        }
      },
      true
    );
  }

  window.testGeminiDirect = async function () {
    const status = document.getElementById('inline-gemini-status');
    if (status) status.textContent = '⚡ Calling newest Gemini model...';
    const res = await window.askGeminiMultiModelRouter(
      'Confirm you are connected on my iPhone! State which Gemini model answered and give a 1-sentence greeting.'
    );
    if (res && !res.error) {
      if (status) {
        status.innerHTML =
          '✅ <strong>Connected (' +
          res._modelUsed +
          ')</strong>: ' +
          (res.reply || 'Ready!');
      }
      appendHotBubble(
        'assistant',
        'Gemini (' + res._modelUsed + ')',
        res.reply || 'Connected!',
        '⚡ ' + res._modelUsed + ' • Verified (<1s)'
      );
    } else {
      if (status) {
        status.innerHTML = '⚠️ <strong>Gemini Error</strong>: ' + (res ? res.error : 'Unknown error');
      }
    }
  };

  window.HELLEVO_CUSTOM_STAGE = function () {
    const hasGemini = Boolean(localStorage.getItem('hellyeah_gemini_key'));
    const preferredModel = localStorage.getItem('hellyeah_gemini_model') || 'auto';
    const lastWorking = localStorage.getItem('hellyeah_last_working_gemini_model') || 'gemini-3-flash-preview';
    const geminiWidget = window.GEMINI_STAGE_HTML
      ? `<div class="stage-module" style="margin-bottom:0.75rem;border-color:var(--accent-primary);">${window.GEMINI_STAGE_HTML}</div>`
      : '';

    if (!hasGemini) {
      return (
        geminiWidget +
        `
        <div class="stage-module" style="border-color:var(--accent-primary);">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.45rem;">
            <strong style="font-size:0.88rem;">Connect Gemini 3 / 2.5 Router (&lt;1s Instant Response)</strong>
            <span class="token-pill">v0.6.1 Multi-Model</span>
          </div>
          <p style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:0.6rem;">
            Paste your Gemini API key below (saved only in your iPhone's <code>localStorage</code>). Tries <code>gemini-3-flash-preview</code> &rarr; <code>gemini-2.5-flash</code> automatically.
          </p>
          <div class="task-add-row">
            <input type="password" id="inline-gemini-key" class="stage-text-input" placeholder="Paste AIzaSy... Gemini API key here" />
            <button type="button" class="primary-pill-btn" onclick="window.saveInlineGeminiKey()">Save Key</button>
          </div>
          <div id="inline-gemini-status" style="font-size:0.75rem;color:var(--text-secondary);margin-top:0.4rem;"></div>
        </div>
      `
      );
    }

    return (
      geminiWidget +
      `
      <div class="stage-module" style="padding:0.7rem 0.85rem;margin-bottom:0.65rem;border-color:rgba(99,230,190,0.35);">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:0.5rem;flex-wrap:wrap;">
          <div style="font-size:0.78rem;">
            <strong style="color:var(--accent-secondary);">⚡ Gemini Router Active</strong>
            <span style="color:var(--text-secondary);margin-left:0.3rem;">(${lastWorking})</span>
          </div>
          <div style="display:flex;gap:0.4rem;align-items:center;flex-wrap:wrap;">
            <select id="gemini-model-select" onchange="window.changeGeminiModel(this)" style="background:var(--bg-elevated);color:var(--text-primary);border:1px solid var(--border-subtle);border-radius:8px;padding:0.22rem 0.45rem;font-size:0.72rem;">
              <option value="auto" ${preferredModel === 'auto' ? 'selected' : ''}>Auto (Gemini 3 Flash &rarr; 2.5)</option>
              <option value="gemini-3-flash-preview" ${preferredModel === 'gemini-3-flash-preview' ? 'selected' : ''}>gemini-3-flash-preview</option>
              <option value="gemini-2.5-flash" ${preferredModel === 'gemini-2.5-flash' ? 'selected' : ''}>gemini-2.5-flash</option>
              <option value="gemini-2.5-pro" ${preferredModel === 'gemini-2.5-pro' ? 'selected' : ''}>gemini-2.5-pro</option>
              <option value="gemini-2.0-flash" ${preferredModel === 'gemini-2.0-flash' ? 'selected' : ''}>gemini-2.0-flash</option>
            </select>
            <button type="button" class="primary-pill-btn" style="font-size:0.7rem;padding:0.22rem 0.55rem;" onclick="window.testGeminiDirect()">⚡ Test Gemini</button>
            <button type="button" class="ghost-btn" style="font-size:0.7rem;padding:0.22rem 0.5rem;" onclick="window.clearGeminiKey()">Key</button>
          </div>
        </div>
        <div id="inline-gemini-status" style="font-size:0.75rem;color:var(--text-secondary);margin-top:0.35rem;">
          Messages go to Gemini first (&lt;1s). Tap <strong>⚡ Test Gemini</strong> or send any chat message!
        </div>
      </div>
    `
    );
  };
})();
