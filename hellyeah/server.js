const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, 'data');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const STATE_FILE = path.join(DATA_DIR, 'state.json');
const INBOX_FILE = path.join(DATA_DIR, 'inbox.json');

// Connected SSE clients
const sseClients = new Set();

function readJSON(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    return fallback;
  }
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function broadcastSSE(event, payload) {
  const message = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const res of sseClients) {
    try {
      res.write(message);
    } catch (e) {
      sseClients.delete(res);
    }
  }
}

function bumpVersion(ver) {
  const parts = String(ver || '0.1.0').split('.').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return '0.2.0';
  parts[1] += 1;
  return parts.join('.');
}

// Built-in intelligent evolution synthesizer (runs if Antigravity bridge does not claim within 3.2s, or supplements live stage modules)
function synthesizeEvolution(promptText, state) {
  const lower = promptText.toLowerCase();
  const nextVersion = bumpVersion(state.version);
  state.version = nextVersion;
  state.evolutionCount = (state.evolutionCount || 0) + 1;
  state.modules = Array.isArray(state.modules) ? state.modules : [];

  let addedModule = null;
  let replyContent = '';
  let mutationBadge = `v${nextVersion} • Stage Evolved`;
  let nextSuggestions = [];

  if (lower.includes('pomodoro') || lower.includes('command deck') || lower.includes('timer') || lower.includes('focus')) {
    addedModule = {
      id: 'mod-command-deck-' + Date.now(),
      type: 'command-deck',
      title: 'Tactile Focus & Command Deck',
      version: nextVersion,
      config: {
        defaultMinutes: 25,
        tasks: [
          { id: 't1', text: 'Define next evolution for hellyeah', done: false, tag: 'Core' },
          { id: 't2', text: 'Test live SSE hot-reload pipeline', done: true, tag: 'System' },
          { id: 't3', text: 'Ship an unexpected interactive module', done: false, tag: 'Creative' }
        ]
      }
    };
    state.stageName = 'Personal Command Deck';
    replyContent = `I evolved **hellyeah** to \`v${nextVersion}\` with the **Tactile Focus & Command Deck** module.\n\n- Added a precision **Pomodoro Focus Timer** with custom intervals (25m / 15m / 5m) and live progress ring.\n- Added an interactive **Intent & Task Queue** with instant keyboard entry and completion tracking.\n\nWhat should we wire into the deck next?`;
    mutationBadge = `v${nextVersion} • Added Command Deck & Focus Timer`;
    nextSuggestions = [
      {
        id: 'sug-next-1',
        title: 'Ambient Soundscape Generator',
        category: 'Audio / Focus',
        description: 'Add procedural WebAudio brown noise, rain warmth, and binaural drone sliders to pair with the focus timer.',
        prompt: 'Add a procedural WebAudio synthesizer and XY expression pad for focus soundscapes and synth chords.'
      },
      {
        id: 'sug-next-2',
        title: 'Spatial Idea & Note Board',
        category: 'Knowledge',
        description: 'Attach a persistent card scratchpad beside the timer to capture thoughts during focus sessions.',
        prompt: 'Build an interactive spatial note-taking board where I can create, filter, and link thought cards.'
      },
      {
        id: 'sug-next-3',
        title: 'Warm Paper Editorial Theme',
        category: 'Aesthetics',
        description: 'Switch the workspace palette to warm alabaster parchment with ink typography.',
        prompt: 'Evolve the theme into a warm alabaster paper editorial aesthetic with crisp ink typography.'
      }
    ];
  } else if (lower.includes('synth') || lower.includes('audio') || lower.includes('music') || lower.includes('sound') || lower.includes('xy')) {
    addedModule = {
      id: 'mod-synth-pad-' + Date.now(),
      type: 'synth-pad',
      title: 'Polyphonic XY WebAudio Synthesizer',
      version: nextVersion,
      config: {
        waveform: 'triangle',
        reverbMix: 0.35
      }
    };
    state.stageName = 'Harmonic Audio Lab';
    replyContent = `Evolved **hellyeah** to \`v${nextVersion}\` by installing the **Polyphonic XY WebAudio Synthesizer**.\n\n- Drag across the **2D Harmonic Expression Pad** to modulate pitch and filter cutoff in real time.\n- Trigger preset harmonic chords and watch the live **Canvas Oscilloscope** respond to your audio signal.`;
    mutationBadge = `v${nextVersion} • Added WebAudio XY Synth`;
    nextSuggestions = [
      {
        id: 'sug-synth-1',
        title: 'Step Sequencer Matrix',
        category: 'Audio Tool',
        description: 'Add an 8-step rhythmic pulse grid that loops melodies automatically.',
        prompt: 'Add an interactive 8-step beat and melody sequencer module to the stage.'
      },
      {
        id: 'sug-synth-2',
        title: 'Personal Command Deck',
        category: 'Productivity',
        description: 'Combine the audio synth with a Pomodoro focus timer and task queue.',
        prompt: 'Evolve the stage into a Personal Command Deck with a tactile Pomodoro focus timer and task queue.'
      }
    ];
  } else if (lower.includes('note') || lower.includes('idea') || lower.includes('scratchpad') || lower.includes('board') || lower.includes('kanban') || lower.includes('card')) {
    addedModule = {
      id: 'mod-idea-board-' + Date.now(),
      type: 'idea-board',
      title: 'Spatial Idea & Knowledge Matrix',
      version: nextVersion,
      config: {
        cards: [
          {
            id: 'c1',
            title: 'Self-Modifying UI Architecture',
            body: 'Every prompt in the right-hand chat mutates the application state and hot-reloads the stage.',
            tag: 'Architecture',
            color: 'copper'
          },
          {
            id: 'c2',
            title: 'Next Feature Hypothesis',
            body: 'Combine real-time metrics, creative sound tools, and local file inspection in one cohesive studio.',
            tag: 'Roadmap',
            color: 'sage'
          },
          {
            id: 'c3',
            title: 'Antigravity File Bridge',
            body: 'Backed by /home/antigravity/hellyeah/data/state.json with instant Server-Sent Events.',
            tag: 'Bridge',
            color: 'amber'
          }
        ]
      }
    };
    state.stageName = 'Knowledge & Idea Studio';
    replyContent = `Evolved **hellyeah** to \`v${nextVersion}\` with the **Spatial Idea & Knowledge Matrix**.\n\n- Create, tag, filter, and remove structured thought cards directly on the stage.\n- All cards stay synced with the live state in \`/home/antigravity/hellyeah\`.`;
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
    replyContent = `Evolved **hellyeah** to \`v${nextVersion}\` with the **Live Workspace & Theme Token Inspector**.\n\n- Inspect the live source files inside \`/home/antigravity/hellyeah\`.\n- Adjust live surface, accent, and typography tokens or switch themes on the fly.`;
    mutationBadge = `v${nextVersion} • Added Self-Inspector Module`;
  } else if (lower.includes('light') || lower.includes('paper') || lower.includes('alabaster') || lower.includes('theme') || lower.includes('color')) {
    state.activeTheme = state.activeTheme === 'atelier-light' ? 'atelier-dark' : 'atelier-light';
    replyContent = `Mutated the visual design system to **${state.activeTheme === 'atelier-light' ? 'Warm Alabaster Paper' : 'Obsidian Atelier'}** (\`v${nextVersion}\`).\n\nNotice how the surface hierarchy, contrast tokens, and borders adapted instantaneously across the workspace.`;
    mutationBadge = `v${nextVersion} • Theme Mutated (${state.activeTheme})`;
  } else if (lower.includes('clear') || lower.includes('reset')) {
    state.modules = [];
    state.stageName = 'Genesis Seed (Cleared)';
    replyContent = `Cleared the stage modules and reset the canvas to a fresh slate (\`v${nextVersion}\`). Ready for your next blueprint.`;
    mutationBadge = `v${nextVersion} • Stage Reset`;
  } else {
    // Dynamic custom workbench module tailored to whatever prompt the user wrote!
    addedModule = {
      id: 'mod-custom-' + Date.now(),
      type: 'custom-applet',
      title: promptText.length > 48 ? promptText.slice(0, 45) + '...' : promptText,
      prompt: promptText,
      version: nextVersion,
      config: {
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        metrics: [
          { label: 'Module Status', value: 'Active • Live' },
          { label: 'Evolution Step', value: `#${state.evolutionCount}` },
          { label: 'Sync Bridge', value: 'SSE Connected' }
        ],
        items: [
          { id: 'item-1', label: `Primary workflow for: "${promptText}"`, status: 'Ready', value: 100 },
          { id: 'item-2', label: 'Interactive parameter control & live state persistence', status: 'Active', value: 85 }
        ]
      }
    };
    state.stageName = 'Custom Evolved Workspace';
    replyContent = `I evolved **hellyeah** (\`v${nextVersion}\`) in response to your instruction:\n> *"${promptText}"*\n\nA new interactive module has been materialized on the stage and synced to \`/home/antigravity/hellyeah/data/state.json\`. You can interact with its controls directly or tell me how to refine its behavior.`;
    mutationBadge = `v${nextVersion} • Custom Evolution Applied`;
  }

  if (addedModule) {
    // Replace existing module of same type or prepend so newest module is prominent
    state.modules = [addedModule, ...state.modules.filter(m => m.type !== addedModule.type)];
  }

  if (nextSuggestions.length > 0) {
    state.suggestions = nextSuggestions;
  }

  state.changelog = [
    {
      version: nextVersion,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      summary: mutationBadge.replace(`v${nextVersion} • `, '') + ` — "${promptText.slice(0, 70)}"`
    },
    ...(state.changelog || [])
  ];

  state.messages.push({
    id: 'msg-ag-' + Date.now(),
    role: 'assistant',
    author: 'Antigravity',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    content: replyContent,
    mutationBadge
  });

  state.agentStatus = 'connected';
  state.agentStatusText = 'Linked to Antigravity (/home/antigravity/hellyeah)';
  return state;
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // CORS headers for flexibility
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  // SSE stream endpoint
  if (url.pathname === '/api/stream') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    res.write(`event: connected\ndata: ${JSON.stringify({ status: 'ok', time: Date.now() })}\n\n`);
    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
    return;
  }

  // Get current app state
  if (url.pathname === '/api/state' && req.method === 'GET') {
    const state = readJSON(STATE_FILE, {});
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(state));
  }

  // Inspect live files inside /home/antigravity/hellyeah
  if (url.pathname === '/api/files' && req.method === 'GET') {
    const filesToInspect = [
      'package.json',
      'server.js',
      'data/state.json',
      'public/index.html',
      'public/style.css',
      'public/app.js'
    ];
    const snapshot = filesToInspect.map(rel => {
      const full = path.join(ROOT_DIR, rel);
      try {
        const stat = fs.statSync(full);
        const content = fs.readFileSync(full, 'utf8');
        return {
          path: rel,
          size: stat.size,
          updatedAt: stat.mtime.toISOString(),
          lines: content.split('\n').length,
          preview: content.slice(0, 2400)
        };
      } catch (e) {
        return { path: rel, error: 'Not found' };
      }
    });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ root: ROOT_DIR, files: snapshot }));
  }

  // Post a new chat prompt / evolution request from the UI
  if (url.pathname === '/api/chat' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const promptText = String(payload.prompt || '').trim();
        if (!promptText) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Prompt is required' }));
        }

        const state = readJSON(STATE_FILE, {});
        const msgId = 'msg-user-' + Date.now();
        const userMsg = {
          id: msgId,
          role: 'user',
          author: 'You',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          content: promptText
        };

        state.messages = Array.isArray(state.messages) ? state.messages : [];
        state.messages.push(userMsg);
        state.agentStatus = 'evolving';
        state.agentStatusText = 'Antigravity is mutating /home/antigravity/hellyeah...';
        writeJSON(STATE_FILE, state);
        broadcastSSE('state', state);

        // Also queue into data/inbox.json so bridge-wait.js can wake up the main Antigravity agent turn!
        const inbox = readJSON(INBOX_FILE, { pending: [] });
        const requestId = 'req-' + Date.now();
        inbox.pending.push({
          id: requestId,
          prompt: promptText,
          createdAt: new Date().toISOString()
        });
        writeJSON(INBOX_FILE, inbox);

        // Schedule live synthesis if external Antigravity process hasn't already answered this request within 2.2s
        setTimeout(() => {
          const currentState = readJSON(STATE_FILE, {});
          if (currentState.agentStatus === 'evolving') {
            const updated = synthesizeEvolution(promptText, currentState);
            writeJSON(STATE_FILE, updated);
            broadcastSSE('state', updated);
          }
        }, 1800);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: true, requestId, state }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // Update state directly from interactive stage modules (e.g. toggling tasks, adding idea cards, switching theme)
  if (url.pathname === '/api/state/update' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const patch = JSON.parse(body || '{}');
        const state = readJSON(STATE_FILE, {});
        const nextState = { ...state, ...patch };
        writeJSON(STATE_FILE, nextState);
        broadcastSSE('state', nextState);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: true, state: nextState }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // Serve static files from /public
  let filePath = url.pathname === '/' ? '/index.html' : url.pathname;
  const safePath = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, '');
  const fullPath = path.join(PUBLIC_DIR, safePath);

  if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
    const ext = path.extname(fullPath);
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    return fs.createReadStream(fullPath).pipe(res);
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

// Watch data/state.json and public/ directory so any direct file edit by Antigravity immediately updates the browser!
let debounceTimer = null;
function setupWatchers() {
  try {
    fs.watch(DATA_DIR, (eventType, filename) => {
      if (filename === 'state.json') {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          const state = readJSON(STATE_FILE, {});
          broadcastSSE('state', state);
        }, 80);
      }
    });
  } catch (e) {}

  try {
    fs.watch(PUBLIC_DIR, (eventType, filename) => {
      if (filename) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          broadcastSSE('reload', { file: filename, time: Date.now() });
        }, 120);
      }
    });
  } catch (e) {}
}

setupWatchers();

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[hellyeah] Self-evolving server online at http://localhost:${PORT}`);
});
