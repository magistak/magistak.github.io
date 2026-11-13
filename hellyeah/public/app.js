(() => {
  let appState = null;
  let workspaceFiles = [];
  let selectedFilePath = 'data/state.json';

  // Pomodoro local runtime state
  let timerSeconds = 25 * 60;
  let timerInterval = null;
  let timerRunning = false;

  // WebAudio synth runtime state
  let audioCtx = null;
  let activeOsc = null;
  let activeGain = null;
  let activeFilter = null;

  const EXTRA_SUGGESTION_POOLS = [
    [
      {
        id: 'pool-1',
        title: 'Habit & Daily Ritual Matrix',
        category: 'Life OS',
        description: 'Build a tactile 7-day streak grid to track daily rituals and deep work blocks.',
        prompt: 'Evolve the stage with a Daily Ritual & Habit Streak Matrix with interactive check-ins.'
      },
      {
        id: 'pool-2',
        title: 'Markdown Live Zettelkasten',
        category: 'Writing',
        description: 'Turn the stage into a distraction-free networked note studio.',
        prompt: 'Build an interactive spatial note-taking board where I can create, filter, and link thought cards.'
      },
      {
        id: 'pool-3',
        title: 'Polyphonic XY WebAudio Synth',
        category: 'Audio Lab',
        description: 'Playable 2D sound pad with harmonic chords and filter sweeps.',
        prompt: 'Add a playable WebAudio synthesizer and XY expression pad with preset chords.'
      },
      {
        id: 'pool-4',
        title: 'Warm Alabaster Paper Theme',
        category: 'Design System',
        description: 'Mutate the color tokens into an editorial warm parchment aesthetic.',
        prompt: 'Switch the theme to a warm alabaster paper editorial aesthetic.'
      }
    ],
    [
      {
        id: 'pool-5',
        title: 'Personal Command Deck & Pomodoro',
        category: 'Focus',
        description: 'Tactile focus timer paired with a live keyboard-driven task queue.',
        prompt: 'Evolve the stage into a Personal Command Deck with a tactile Pomodoro focus timer and task queue.'
      },
      {
        id: 'pool-6',
        title: 'Self-Inspecting Codebase Explorer',
        category: 'Meta / Dev',
        description: 'Embed a live source inspector showing files inside /home/antigravity/hellyeah.',
        prompt: 'Add a live self-inspector module that displays the files inside /home/antigravity/hellyeah.'
      },
      {
        id: 'pool-7',
        title: 'Decision Matrix & Weighted Scorer',
        category: 'Strategy',
        description: 'Compare architecture or product trade-offs with interactive sliders.',
        prompt: 'Build an interactive Decision Matrix calculator to score and rank project ideas.'
      },
      {
        id: 'pool-8',
        title: 'Reset Stage to Genesis Seed',
        category: 'System',
        description: 'Clear active stage modules and return to a clean Genesis canvas.',
        prompt: 'Clear the stage and reset back to the Genesis slate.'
      }
    ]
  ];
  let poolIndex = 0;

  function escapeHTML(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatMarkdownLite(text) {
    return escapeHTML(text)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br/>');
  }

  const FALLBACK_INITIAL_STATE = {
    appName: 'hellyeah',
    subtitle: 'Self-Evolving Workspace • Connected to Antigravity',
    version: '0.1.0',
    stageName: 'Genesis Seed',
    evolutionCount: 0,
    agentStatus: 'connected',
    agentStatusText: 'Linked to Antigravity (iPhone / Cloud Mode)',
    activeTheme: 'atelier-dark',
    messages: [
      {
        id: 'msg-genesis-1',
        role: 'assistant',
        author: 'Antigravity',
        timestamp: 'Genesis',
        content: 'Welcome to **hellyeah** (`v0.1.0 — Genesis`). Right now, this app is a clean slate—just our live communication link and an open stage.\n\nTell me what you want this app to become, or tap one of the evolution suggestions below to mutate the interface in real time.',
        mutationBadge: 'Genesis v0.1.0 initialized'
      }
    ],
    suggestions: [
      {
        id: 'sug-1',
        title: 'Personal Command Deck & Pomodoro Studio',
        category: 'Productivity',
        description: 'Add a tactile focus timer, daily intent tracker, and task queue directly onto the stage.',
        prompt: 'Evolve the stage into a Personal Command Deck with a tactile Pomodoro focus timer and task queue.'
      },
      {
        id: 'sug-2',
        title: 'Interactive Synth & Generative Audio Pad',
        category: 'Creative Tool',
        description: 'Turn the canvas into a playable WebAudio polyphonic XY pad with touch expression.',
        prompt: 'Add a playable WebAudio synthesizer and XY expression pad with preset chords.'
      },
      {
        id: 'sug-3',
        title: 'Live Markdown & Idea Graph Scratchpad',
        category: 'Knowledge',
        description: 'Create interconnected thought cards that persist on your device.',
        prompt: 'Build an interactive spatial note-taking board where I can create and link thought cards.'
      },
      {
        id: 'sug-4',
        title: 'Real-Time System & Codebase Inspector',
        category: 'Meta / Dev',
        description: 'Inspect the source architecture and tweak the live theme tokens.',
        prompt: 'Add a live self-inspector module that displays the workspace architecture and theme tokens.'
      }
    ],
    changelog: [
      {
        version: '0.1.0',
        timestamp: 'Genesis',
        summary: 'Initialized hellyeah core with Antigravity chat console, suggestion engine, and modular stage.'
      }
    ],
    modules: []
  };

  function clientSynthesizeEvolution(promptText, currentState) {
    const state = JSON.parse(JSON.stringify(currentState || FALLBACK_INITIAL_STATE));
    const lower = promptText.toLowerCase();
    const parts = String(state.version || '0.1.0').split('.').map(Number);
    parts[1] = (parts[1] || 0) + 1;
    const nextVersion = parts.join('.');
    state.version = nextVersion;
    state.evolutionCount = (state.evolutionCount || 0) + 1;
    state.modules = Array.isArray(state.modules) ? state.modules : [];

    let addedModule = null;
    let replyContent = '';
    let mutationBadge = `v${nextVersion} • Stage Evolved`;

    if (lower.includes('pomodoro') || lower.includes('command deck') || lower.includes('timer') || lower.includes('focus')) {
      addedModule = {
        id: 'mod-command-deck-' + Date.now(),
        type: 'command-deck',
        title: 'Tactile Focus & Command Deck',
        version: nextVersion,
        config: {
          tasks: [
            { id: 't1', text: 'Define next evolution for hellyeah on iPhone', done: false, tag: 'Mobile' },
            { id: 't2', text: 'Test live touch interactions', done: true, tag: 'System' }
          ]
        }
      };
      state.stageName = 'Personal Command Deck';
      replyContent = `Evolved **hellyeah** to \`v${nextVersion}\` with the **Tactile Focus & Command Deck**.`;
      mutationBadge = `v${nextVersion} • Added Command Deck`;
    } else if (lower.includes('synth') || lower.includes('audio') || lower.includes('music') || lower.includes('sound') || lower.includes('xy')) {
      addedModule = {
        id: 'mod-synth-pad-' + Date.now(),
        type: 'synth-pad',
        title: 'Polyphonic XY WebAudio Synthesizer',
        version: nextVersion,
        config: {}
      };
      state.stageName = 'Harmonic Audio Lab';
      replyContent = `Evolved **hellyeah** to \`v${nextVersion}\` with the **Polyphonic XY WebAudio Synthesizer**. Slide your finger across the pad or tap chords!`;
      mutationBadge = `v${nextVersion} • Added WebAudio XY Synth`;
    } else if (lower.includes('note') || lower.includes('idea') || lower.includes('scratchpad') || lower.includes('board') || lower.includes('card')) {
      addedModule = {
        id: 'mod-idea-board-' + Date.now(),
        type: 'idea-board',
        title: 'Spatial Idea & Knowledge Matrix',
        version: nextVersion,
        config: {
          cards: [
            { id: 'c1', title: 'Self-Modifying UI', body: 'Every prompt in the chat mutates the application stage.', tag: 'Core' },
            { id: 'c2', title: 'iPhone Ready', body: 'Supports touch gestures, safe-area insets, and Home Screen web app mode.', tag: 'iOS' }
          ]
        }
      };
      state.stageName = 'Knowledge & Idea Studio';
      replyContent = `Evolved **hellyeah** to \`v${nextVersion}\` with the **Spatial Idea & Knowledge Matrix**.`;
      mutationBadge = `v${nextVersion} • Added Spatial Idea Matrix`;
    } else if (lower.includes('inspect') || lower.includes('code') || lower.includes('system') || lower.includes('file') || lower.includes('meta')) {
      addedModule = {
        id: 'mod-inspector-' + Date.now(),
        type: 'system-inspector',
        title: 'Live Workspace & Theme Token Inspector',
        version: nextVersion,
        config: {}
      };
      state.stageName = 'Self-Inspector Studio';
      replyContent = `Evolved **hellyeah** to \`v${nextVersion}\` with the **Live Workspace & Theme Token Inspector**.`;
      mutationBadge = `v${nextVersion} • Added Self-Inspector`;
    } else if (lower.includes('light') || lower.includes('paper') || lower.includes('alabaster') || lower.includes('theme')) {
      state.activeTheme = state.activeTheme === 'atelier-light' ? 'atelier-dark' : 'atelier-light';
      replyContent = `Mutated the visual design system to **${state.activeTheme === 'atelier-light' ? 'Warm Alabaster Paper' : 'Obsidian Atelier'}** (\`v${nextVersion}\`).`;
      mutationBadge = `v${nextVersion} • Theme Mutated`;
    } else if (lower.includes('clear') || lower.includes('reset')) {
      state.modules = [];
      state.stageName = 'Genesis Seed';
      replyContent = `Cleared the stage modules and reset the canvas to a fresh Genesis slate (\`v${nextVersion}\`).`;
      mutationBadge = `v${nextVersion} • Stage Reset`;
    } else {
      addedModule = {
        id: 'mod-custom-' + Date.now(),
        type: 'custom-applet',
        title: promptText.length > 48 ? promptText.slice(0, 45) + '...' : promptText,
        prompt: promptText,
        version: nextVersion,
        config: {
          items: [
            { id: 'item-1', label: `Primary workflow: "${promptText}"`, status: 'Active' },
            { id: 'item-2', label: 'Interactive state synced', status: 'Ready' }
          ]
        }
      };
      state.stageName = 'Custom Evolved Workspace';
      replyContent = `Evolved **hellyeah** (\`v${nextVersion}\`) for:\n> *"${promptText}"*`;
      mutationBadge = `v${nextVersion} • Custom Evolution`;
    }

    if (addedModule) {
      state.modules = [addedModule, ...state.modules.filter(m => m.type !== addedModule.type)];
    }

    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    state.messages.push({ id: 'msg-u-' + Date.now(), role: 'user', author: 'You', timestamp: nowStr, content: promptText });
    state.messages.push({ id: 'msg-a-' + Date.now(), role: 'assistant', author: 'Antigravity', timestamp: nowStr, content: replyContent, mutationBadge });
    state.changelog = [{ version: nextVersion, timestamp: nowStr, summary: `${mutationBadge} — "${promptText.slice(0, 60)}"` }, ...(state.changelog || [])];
    state.agentStatus = 'connected';
    try { localStorage.setItem('hellyeah_state', JSON.stringify(state)); } catch (e) {}
    return state;
  }

  async function fetchInitialState() {
    try {
      const res = await fetch('./api/state');
      if (!res.ok) throw new Error('Static mode');
      const data = await res.json();
      renderApp(data);
    } catch (e) {
      let saved = null;
      try { saved = JSON.parse(localStorage.getItem('hellyeah_state')); } catch (err) {}
      try {
        const staticRes = await fetch('./data/state.json?t=' + Date.now());
        if (staticRes.ok) {
          const staticData = await staticRes.json();
          if (!saved || (staticData.evolutionCount || 0) > (saved.evolutionCount || 0)) {
            try { localStorage.setItem('hellyeah_state', JSON.stringify(staticData)); } catch (err) {}
            renderApp(staticData);
            return;
          }
        }
      } catch (err) {}
      renderApp(saved || FALLBACK_INITIAL_STATE);
    }
  }

  async function fetchWorkspaceFiles() {
    try {
      const res = await fetch('./api/files');
      if (!res.ok) throw new Error('Static mode');
      const data = await res.json();
      workspaceFiles = data.files || [];
      renderInspectorFiles();
    } catch (e) {
      workspaceFiles = [
        { path: 'data/state.json', preview: JSON.stringify(appState || FALLBACK_INITIAL_STATE, null, 2) }
      ];
      renderInspectorFiles();
    }
  }

  function setupSSE() {
    const startStaticCloudPoll = () => {
      setInterval(async () => {
        try {
          const r = await fetch('./data/state.json?t=' + Date.now());
          if (r.ok) {
            const remote = await r.json();
            if (remote && appState && (remote.evolutionCount || 0) > (appState.evolutionCount || 0)) {
              const prevCodeVer = appState.codeVersion;
              try { localStorage.setItem('hellyeah_state', JSON.stringify(remote)); } catch (err) {}
              if (remote.codeVersion && remote.codeVersion !== prevCodeVer) {
                window.location.reload();
                return;
              }
              renderApp(remote);
            }
          }
        } catch (err) {}
      }, 6000);
    };

    try {
      const evtSource = new EventSource('./api/stream');
      evtSource.addEventListener('state', (event) => {
        try {
          const nextState = JSON.parse(event.data);
          renderApp(nextState);
          fetchWorkspaceFiles();
        } catch (e) {}
      });
      evtSource.addEventListener('reload', () => {
        window.location.reload();
      });
      evtSource.onerror = () => {
        evtSource.close();
        startStaticCloudPoll();
      };
    } catch (e) {
      startStaticCloudPoll();
    }
  }

  function renderApp(state) {
    if (!state) return;
    appState = state;

    const shell = document.getElementById('app-shell');
    const hasModules = Array.isArray(state.modules) && state.modules.length > 0;
    shell.classList.toggle('mode-genesis', !hasModules);
    shell.classList.toggle('mode-evolved', hasModules);

    // Theme
    const theme = state.activeTheme || 'atelier-dark';
    document.documentElement.setAttribute('data-theme', theme);
    const themeBtnLabel = document.getElementById('theme-btn-label');
    if (themeBtnLabel) {
      themeBtnLabel.textContent = theme === 'atelier-light' ? 'Obsidian Mode' : 'Paper Mode';
    }

    // Header badges
    document.getElementById('stage-subtitle').textContent = state.stageName || 'Genesis Seed';
    document.getElementById('version-badge').textContent = `v${state.version || '0.1.0'}`;
    const count = state.evolutionCount || 0;
    document.getElementById('mutation-counter').textContent = `${count} ${count === 1 ? 'mutation' : 'mutations'}`;
    document.getElementById('active-stage-heading').textContent = state.stageName || 'Genesis Canvas';

    // Agent connection status
    const statusDot = document.getElementById('status-dot');
    const statusLabel = document.getElementById('status-label');
    const sendBtn = document.getElementById('send-prompt-btn');
    const sendBtnText = document.getElementById('send-btn-text');
    const hasToken = Boolean(localStorage.getItem('hellyeah_gh_token'));

    if (state.agentStatus === 'evolving') {
      statusDot.className = 'status-dot evolving';
      statusLabel.textContent = state.agentStatusText || 'Antigravity is mutating app...';
      sendBtn.disabled = true;
      sendBtnText.textContent = 'Mutating...';
    } else {
      statusDot.className = 'status-dot connected';
      statusLabel.textContent = hasToken ? 'Antigravity Bridge (Auto)' : 'Antigravity Bridge';
      sendBtn.disabled = false;
      sendBtnText.textContent = 'Evolve App';
    }

    renderMessages(state.messages || []);
    renderSuggestions(state.suggestions || []);
    renderStageModules(state.modules || []);
    renderChangelog(state.changelog || []);
  }

  function renderMessages(messages) {
    const container = document.getElementById('chat-messages');
    container.innerHTML = messages.map((m) => `
      <article class="chat-bubble role-${escapeHTML(m.role)}">
        <div class="bubble-meta">
          <span class="bubble-author">${escapeHTML(m.author || (m.role === 'user' ? 'You' : 'Antigravity'))}</span>
          <span>${escapeHTML(m.timestamp || '')}</span>
        </div>
        <div class="bubble-body">${formatMarkdownLite(m.content)}</div>
        ${m.mutationBadge ? `<span class="mutation-pill">${escapeHTML(m.mutationBadge)}</span>` : ''}
        ${m.bridgeDispatchUrl ? `
          <div style="margin-top:0.55rem;display:flex;gap:0.45rem;flex-wrap:wrap;align-items:center;">
            <a href="${escapeHTML(m.bridgeDispatchUrl)}" target="_blank" rel="noopener noreferrer" class="primary-pill-btn" style="text-decoration:none;font-size:0.72rem;padding:0.28rem 0.65rem;">
              Transmit to Antigravity VM &nearr;
            </a>
            <button type="button" class="ghost-btn open-bridge-inline-btn" style="font-size:0.7rem;padding:0.24rem 0.55rem;">
              Enable Silent Auto-Send
            </button>
          </div>
        ` : ''}
      </article>
    `).join('');
    container.querySelectorAll('.open-bridge-inline-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const modal = document.getElementById('bridge-modal');
        if (modal) modal.classList.remove('hidden');
      });
    });
    container.scrollTop = container.scrollHeight;
  }

  function renderSuggestions(suggestions) {
    const list = document.getElementById('suggestions-list');
    list.innerHTML = suggestions.map((s) => `
      <button type="button" class="suggestion-card" data-prompt="${escapeHTML(s.prompt)}">
        <span class="suggestion-category">${escapeHTML(s.category || 'Evolution')}</span>
        <span class="suggestion-title">${escapeHTML(s.title)}</span>
        <span class="suggestion-desc">${escapeHTML(s.description)}</span>
      </button>
    `).join('');

    list.querySelectorAll('.suggestion-card').forEach((btn) => {
      btn.addEventListener('click', () => {
        const prompt = btn.getAttribute('data-prompt');
        if (prompt) submitPrompt(prompt);
      });
    });
  }

  function renderStageModules(modules) {
    const container = document.getElementById('modules-container');

    if (!modules || modules.length === 0) {
      container.innerHTML = `
        <div class="genesis-seed-card">
          <span class="section-eyebrow">STAGE 00 // GENESIS SEED</span>
          <h3>This canvas evolves from your conversation.</h3>
          <p>
            <strong>hellyeah</strong> starts intentionally minimal—just the live Antigravity communication console on the right and this open stage.
            Describe any tool, instrument, workflow, or interface change in the chat, or pick one of the suggested evolutions to mutate the app live.
          </p>
          <div class="genesis-architecture-list">
            <div class="arch-item">
              <strong>Live File Bridge</strong>
              <span>Connected to <code>/home/antigravity/hellyeah</code> with instant SSE sync.</span>
            </div>
            <div class="arch-item">
              <strong>Self-Suggesting</strong>
              <span>Proposes next architectural and functional evolutions after every step.</span>
            </div>
            <div class="arch-item">
              <strong>Hot-Reloading Stage</strong>
              <span>Edits to HTML, CSS, JS, or state materialize immediately without refresh.</span>
            </div>
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = modules.map((mod) => {
      if (mod.type === 'command-deck') {
        const tasks = (mod.config && mod.config.tasks) || [];
        const mins = String(Math.floor(timerSeconds / 60)).padStart(2, '0');
        const secs = String(timerSeconds % 60).padStart(2, '0');
        return `
          <div class="stage-module" data-module-id="${escapeHTML(mod.id)}">
            <div class="module-header">
              <div class="module-title-group">
                <h3>${escapeHTML(mod.title)}</h3>
                <span>MODULE // FOCUS &amp; INTENT QUEUE &bull; v${escapeHTML(mod.version || '0.2.0')}</span>
              </div>
            </div>
            <div class="command-deck-grid">
              <div class="pomodoro-box">
                <span class="section-eyebrow">FOCUS SESSION</span>
                <div id="pomodoro-display" class="timer-readout">${mins}:${secs}</div>
                <div class="timer-btn-row">
                  <button type="button" id="pomo-toggle-btn" class="primary-pill-btn">${timerRunning ? 'Pause' : 'Start'}</button>
                  <button type="button" id="pomo-25-btn" class="ghost-btn">25m</button>
                  <button type="button" id="pomo-5-btn" class="ghost-btn">5m</button>
                </div>
              </div>
              <div class="task-queue-box">
                <div class="task-add-row">
                  <input type="text" id="new-task-input" class="stage-text-input" placeholder="Add a focus objective and press Enter..." />
                  <button type="button" id="add-task-btn" class="primary-pill-btn">Add</button>
                </div>
                <div class="task-items-list">
                  ${tasks.map((t, idx) => `
                    <div class="task-row ${t.done ? 'completed' : ''}" data-task-idx="${idx}">
                      <span class="task-text">${t.done ? '✓ ' : '○ '} ${escapeHTML(t.text)}</span>
                      <span class="mono-tag subtle">${escapeHTML(t.tag || 'Task')}</span>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          </div>
        `;
      }

      if (mod.type === 'synth-pad') {
        return `
          <div class="stage-module" data-module-id="${escapeHTML(mod.id)}">
            <div class="module-header">
              <div class="module-title-group">
                <h3>${escapeHTML(mod.title)}</h3>
                <span>MODULE // WEBAUDIO HARMONIC PAD &bull; v${escapeHTML(mod.version || '0.2.0')}</span>
              </div>
            </div>
            <div class="synth-layout">
              <div id="xy-synth-pad" class="xy-pad-surface">
                <div id="xy-cursor" class="xy-cursor"></div>
                <span id="xy-readout" class="xy-pad-Readout">Click &amp; drag here to sculpt frequency &amp; filter resonance</span>
              </div>
              <div class="synth-controls-col">
                <span class="section-eyebrow">HARMONIC CHORD TRIGGERS</span>
                <div class="chord-grid">
                  <button type="button" class="ghost-btn chord-btn" data-freqs="261.63,329.63,392.00,493.88">Cmaj7</button>
                  <button type="button" class="ghost-btn chord-btn" data-freqs="220.00,261.63,329.63,392.00">Am7</button>
                  <button type="button" class="ghost-btn chord-btn" data-freqs="174.61,220.00,261.63,349.23">Fmaj7</button>
                  <button type="button" class="ghost-btn chord-btn" data-freqs="196.00,246.94,293.66,392.00">G6</button>
                </div>
                <p style="font-size:0.76rem;color:var(--text-secondary);margin-top:0.35rem;">
                  Uses native browser WebAudio oscillators with low-pass filter modulation.
                </p>
              </div>
            </div>
          </div>
        `;
      }

      if (mod.type === 'idea-board') {
        const cards = (mod.config && mod.config.cards) || [];
        return `
          <div class="stage-module" data-module-id="${escapeHTML(mod.id)}">
            <div class="module-header">
              <div class="module-title-group">
                <h3>${escapeHTML(mod.title)}</h3>
                <span>MODULE // SPATIAL KNOWLEDGE MATRIX &bull; v${escapeHTML(mod.version || '0.2.0')}</span>
              </div>
            </div>
            <div class="task-add-row">
              <input type="text" id="idea-title-input" class="stage-text-input" placeholder="Idea title..." style="max-width:210px;" />
              <input type="text" id="idea-body-input" class="stage-text-input" placeholder="Capture thought or architectural note..." />
              <button type="button" id="add-idea-btn" class="primary-pill-btn">Add Card</button>
            </div>
            <div class="idea-cards-grid">
              ${cards.map((c) => `
                <div class="idea-card">
                  <span class="mono-tag subtle" style="align-self:flex-start;">${escapeHTML(c.tag || 'Note')}</span>
                  <h4>${escapeHTML(c.title)}</h4>
                  <p>${escapeHTML(c.body)}</p>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }

      if (mod.type === 'system-inspector') {
        return `
          <div class="stage-module" data-module-id="${escapeHTML(mod.id)}">
            <div class="module-header">
              <div class="module-title-group">
                <h3>${escapeHTML(mod.title)}</h3>
                <span>MODULE // LIVE SELF-INSPECTOR &bull; /home/antigravity/hellyeah</span>
              </div>
              <button type="button" id="stage-open-drawer-btn" class="primary-pill-btn">Open Full Code Drawer</button>
            </div>
            <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:0.85rem;">
              This module inspects the live files powering <strong>hellyeah</strong> inside <code>/home/antigravity/hellyeah</code>.
            </p>
            <div class="genesis-architecture-list">
              <div class="arch-item">
                <strong>State Store</strong>
                <span><code>data/state.json</code> (${(appState.messages || []).length} messages, ${(appState.changelog || []).length} log entries)</span>
              </div>
              <div class="arch-item">
                <strong>Bridge Watcher</strong>
                <span><code>bridge-wait.js</code> &amp; <code>data/inbox.json</code></span>
              </div>
              <div class="arch-item">
                <strong>Active Theme</strong>
                <span><code>${escapeHTML(appState.activeTheme)}</code></span>
              </div>
            </div>
          </div>
        `;
      }

      // Default / Custom Evolved Applet
      const items = (mod.config && mod.config.items) || [];
      return `
        <div class="stage-module" data-module-id="${escapeHTML(mod.id)}">
          <div class="module-header">
            <div class="module-title-group">
              <h3>${escapeHTML(mod.title)}</h3>
              <span>CUSTOM EVOLUTION MODULE &bull; v${escapeHTML(mod.version || '0.2.0')}</span>
            </div>
          </div>
          <p style="font-size:0.86rem;color:var(--text-secondary);margin-bottom:0.9rem;">
            Synthesized from prompt: <em>"${escapeHTML(mod.prompt || mod.title)}"</em>
          </p>
          <div class="task-items-list">
            ${items.map((item) => `
              <div class="task-row">
                <span>${escapeHTML(item.label)}</span>
                <span class="mono-tag">${escapeHTML(item.status)}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }).join('');

    bindStageEvents();
  }

  function bindStageEvents() {
    // Pomodoro controls
    const toggleBtn = document.getElementById('pomo-toggle-btn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        timerRunning = !timerRunning;
        if (timerRunning) {
          clearInterval(timerInterval);
          timerInterval = setInterval(() => {
            if (timerSeconds > 0) {
              timerSeconds -= 1;
              const disp = document.getElementById('pomodoro-display');
              if (disp) {
                const m = String(Math.floor(timerSeconds / 60)).padStart(2, '0');
                const s = String(timerSeconds % 60).padStart(2, '0');
                disp.textContent = `${m}:${s}`;
              }
            } else {
              timerRunning = false;
              clearInterval(timerInterval);
            }
          }, 1000);
        } else {
          clearInterval(timerInterval);
        }
        toggleBtn.textContent = timerRunning ? 'Pause' : 'Start';
      });
    }

    const btn25 = document.getElementById('pomo-25-btn');
    if (btn25) {
      btn25.addEventListener('click', () => {
        timerRunning = false;
        clearInterval(timerInterval);
        timerSeconds = 25 * 60;
        renderStageModules(appState.modules || []);
      });
    }

    const btn5 = document.getElementById('pomo-5-btn');
    if (btn5) {
      btn5.addEventListener('click', () => {
        timerRunning = false;
        clearInterval(timerInterval);
        timerSeconds = 5 * 60;
        renderStageModules(appState.modules || []);
      });
    }

    // Add task in Command Deck
    const addTaskBtn = document.getElementById('add-task-btn');
    const newTaskInput = document.getElementById('new-task-input');
    const handleAddTask = async () => {
      if (!newTaskInput || !newTaskInput.value.trim()) return;
      const text = newTaskInput.value.trim();
      const modules = JSON.parse(JSON.stringify(appState.modules || []));
      const deck = modules.find(m => m.type === 'command-deck');
      if (deck) {
        deck.config = deck.config || { tasks: [] };
        deck.config.tasks.unshift({ id: 't-' + Date.now(), text, done: false, tag: 'Focus' });
        await updateServerState({ modules });
      }
    };
    if (addTaskBtn) addTaskBtn.addEventListener('click', handleAddTask);
    if (newTaskInput) {
      newTaskInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleAddTask();
        }
      });
    }

    document.querySelectorAll('.task-row[data-task-idx]').forEach((row) => {
      row.addEventListener('click', async () => {
        const idx = Number(row.getAttribute('data-task-idx'));
        const modules = JSON.parse(JSON.stringify(appState.modules || []));
        const deck = modules.find(m => m.type === 'command-deck');
        if (deck && deck.config && deck.config.tasks[idx]) {
          deck.config.tasks[idx].done = !deck.config.tasks[idx].done;
          await updateServerState({ modules });
        }
      });
    });

    // WebAudio XY Synth Pad
    const xyPad = document.getElementById('xy-synth-pad');
    if (xyPad) {
      const triggerXY = (e) => {
        const rect = xyPad.getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const y = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));
        const cursor = document.getElementById('xy-cursor');
        const readout = document.getElementById('xy-readout');
        if (cursor) {
          cursor.style.left = `${x * 100}%`;
          cursor.style.top = `${(1 - y) * 100}%`;
        }
        const freq = Math.round(110 + x * 550);
        const cutoff = Math.round(250 + y * 3200);
        if (readout) {
          readout.textContent = `Freq: ${freq} Hz • Filter Cutoff: ${cutoff} Hz`;
        }
        playSynthNote(freq, cutoff, 0.35);
      };
      let dragging = false;
      xyPad.addEventListener('mousedown', (e) => { dragging = true; triggerXY(e); });
      window.addEventListener('mousemove', (e) => { if (dragging) triggerXY(e); });
      window.addEventListener('mouseup', () => { dragging = false; });
    }

    document.querySelectorAll('.chord-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const freqs = (btn.getAttribute('data-freqs') || '').split(',').map(Number);
        freqs.forEach((f) => playSynthNote(f, 1800, 0.7));
      });
    });

    // Idea Board Add Card
    const addIdeaBtn = document.getElementById('add-idea-btn');
    if (addIdeaBtn) {
      addIdeaBtn.addEventListener('click', async () => {
        const titleEl = document.getElementById('idea-title-input');
        const bodyEl = document.getElementById('idea-body-input');
        const title = titleEl ? titleEl.value.trim() : '';
        const body = bodyEl ? bodyEl.value.trim() : '';
        if (!title && !body) return;
        const modules = JSON.parse(JSON.stringify(appState.modules || []));
        const board = modules.find(m => m.type === 'idea-board');
        if (board) {
          board.config = board.config || { cards: [] };
          board.config.cards.unshift({
            id: 'c-' + Date.now(),
            title: title || 'Untitled Note',
            body: body || 'Captured in hellyeah studio.',
            tag: 'Idea'
          });
          await updateServerState({ modules });
        }
      });
    }

    const openDrawerBtn = document.getElementById('stage-open-drawer-btn');
    if (openDrawerBtn) {
      openDrawerBtn.addEventListener('click', () => {
        document.getElementById('inspector-drawer').classList.remove('hidden');
        fetchWorkspaceFiles();
      });
    }
  }

  function playSynthNote(freq, cutoff, duration) {
    try {
      if (!audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioContext();
      }
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const filter = audioCtx.createBiquadFilter();
      const gain = audioCtx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(cutoff, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.12, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(now);
      osc.stop(now + duration + 0.02);
    } catch (e) {}
  }

  function renderChangelog(changelog) {
    const list = document.getElementById('changelog-list');
    if (!list) return;
    list.innerHTML = changelog.map((c) => `
      <div class="changelog-item">
        <div style="display:flex;justify-content:space-between;margin-bottom:0.2rem;">
          <strong class="mono-tag">v${escapeHTML(c.version)}</strong>
          <span style="font-size:0.72rem;color:var(--text-muted);">${escapeHTML(c.timestamp)}</span>
        </div>
        <div>${escapeHTML(c.summary)}</div>
      </div>
    `).join('');
  }

  function renderInspectorFiles() {
    const tabs = document.getElementById('file-tabs');
    const preview = document.getElementById('file-code-preview');
    if (!tabs || !preview) return;

    tabs.innerHTML = workspaceFiles.map((f) => `
      <button type="button" class="file-tab-btn ${f.path === selectedFilePath ? 'active' : ''}" data-path="${escapeHTML(f.path)}">
        ${escapeHTML(f.path)}
      </button>
    `).join('');

    tabs.querySelectorAll('.file-tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        selectedFilePath = btn.getAttribute('data-path');
        renderInspectorFiles();
      });
    });

    const activeFile = workspaceFiles.find((f) => f.path === selectedFilePath) || workspaceFiles[0];
    if (activeFile) {
      preview.textContent = activeFile.preview || activeFile.error || '';
    }
  }

  async function dispatchToGitHubBridge(promptText) {
    const token = (localStorage.getItem('hellyeah_gh_token') || '').trim();
    const issueTitle = '[hellyeah] ' + promptText.slice(0, 72);
    const fallbackUrl =
      'https://github.com/magistak/magistak.github.io/issues/new?title=' +
      encodeURIComponent(issueTitle) +
      '&body=' +
      encodeURIComponent(promptText);

    if (!token) {
      return { sentSilently: false, fallbackUrl };
    }

    try {
      const res = await fetch('https://api.github.com/repos/magistak/magistak.github.io/issues', {
        method: 'POST',
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: issueTitle,
          body: promptText
        })
      });
      if (!res.ok) throw new Error('GitHub API ' + res.status);
      const data = await res.json();
      return { sentSilently: true, issueNumber: data.number, issueUrl: data.html_url };
    } catch (e) {
      return { sentSilently: false, fallbackUrl };
    }
  }

  async function submitPrompt(promptText) {
    const input = document.getElementById('chat-input');
    if (input) input.value = '';
    try {
      const res = await fetch('./api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptText })
      });
      if (!res.ok) throw new Error('Static mode');
      const data = await res.json();
      if (data.state) renderApp(data.state);
    } catch (e) {
      const nextState = clientSynthesizeEvolution(promptText, appState);
      const bridgeResult = await dispatchToGitHubBridge(promptText);
      const lastMsg = nextState.messages[nextState.messages.length - 1];
      if (lastMsg) {
        if (bridgeResult.sentSilently) {
          lastMsg.mutationBadge = `Dispatched to Antigravity VM (#${bridgeResult.issueNumber}) • Live`;
          lastMsg.content += `\n\n**Antigravity Bridge:** Transmitted directly to Antigravity VM (\`#${bridgeResult.issueNumber}\`). Your iPhone will auto-update as soon as Antigravity pushes custom code.`;
        } else {
          lastMsg.bridgeDispatchUrl = bridgeResult.fallbackUrl;
        }
      }
      try { localStorage.setItem('hellyeah_state', JSON.stringify(nextState)); } catch (err) {}
      renderApp(nextState);
    }
  }

  async function updateServerState(patch) {
    try {
      const res = await fetch('./api/state/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch)
      });
      if (!res.ok) throw new Error('Static mode');
      const data = await res.json();
      if (data.state) renderApp(data.state);
    } catch (e) {
      const nextState = { ...(appState || FALLBACK_INITIAL_STATE), ...patch };
      try { localStorage.setItem('hellyeah_state', JSON.stringify(nextState)); } catch (err) {}
      renderApp(nextState);
    }
  }

  function refreshBridgeTokenStatus() {
    const statusEl = document.getElementById('gh-token-status');
    const tokenInput = document.getElementById('gh-token-input');
    const saved = localStorage.getItem('hellyeah_gh_token') || '';
    if (statusEl) {
      statusEl.textContent = saved
        ? '✓ Silent Auto-Send Active (Token saved in iPhone localStorage)'
        : 'No token saved yet (using 1-Tap Dispatch mode)';
    }
    if (tokenInput && saved) {
      tokenInput.value = saved;
    }
  }

  // Wire global UI events
  document.addEventListener('DOMContentLoaded', () => {
    fetchInitialState();
    fetchWorkspaceFiles();
    setupSSE();
    refreshBridgeTokenStatus();

    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');

    chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = chatInput.value.trim();
      if (text) submitPrompt(text);
    });

    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const text = chatInput.value.trim();
        if (text) submitPrompt(text);
      }
    });

    document.getElementById('toggle-theme-btn').addEventListener('click', () => {
      if (!appState) return;
      const nextTheme = appState.activeTheme === 'atelier-light' ? 'atelier-dark' : 'atelier-light';
      updateServerState({ activeTheme: nextTheme });
    });

    document.getElementById('toggle-inspector-btn').addEventListener('click', () => {
      const drawer = document.getElementById('inspector-drawer');
      drawer.classList.toggle('hidden');
      if (!drawer.classList.contains('hidden')) fetchWorkspaceFiles();
    });

    document.getElementById('close-inspector-btn').addEventListener('click', () => {
      document.getElementById('inspector-drawer').classList.add('hidden');
    });

    const openBridgeBtn = document.getElementById('open-bridge-btn');
    if (openBridgeBtn) {
      openBridgeBtn.addEventListener('click', () => {
        refreshBridgeTokenStatus();
        document.getElementById('bridge-modal').classList.remove('hidden');
      });
    }

    const closeBridgeBtn = document.getElementById('close-bridge-btn');
    if (closeBridgeBtn) {
      closeBridgeBtn.addEventListener('click', () => {
        document.getElementById('bridge-modal').classList.add('hidden');
      });
    }

    const saveTokenBtn = document.getElementById('save-gh-token-btn');
    if (saveTokenBtn) {
      saveTokenBtn.addEventListener('click', () => {
        const val = (document.getElementById('gh-token-input').value || '').trim();
        if (val) {
          localStorage.setItem('hellyeah_gh_token', val);
        } else {
          localStorage.removeItem('hellyeah_gh_token');
        }
        refreshBridgeTokenStatus();
        if (appState) renderApp(appState);
      });
    }

    document.getElementById('reset-stage-btn').addEventListener('click', () => {
      submitPrompt('Reset the stage back to the Genesis slate.');
    });

    document.getElementById('shuffle-suggestions-btn').addEventListener('click', () => {
      const nextPool = EXTRA_SUGGESTION_POOLS[poolIndex % EXTRA_SUGGESTION_POOLS.length];
      poolIndex += 1;
      updateServerState({ suggestions: nextPool });
    });
  });
})();
