// Delta Stage Plugin (v0.6.0) - Gemini 2.5 First-Responder Router + Quick Key Setup
window. saveInlineGeminiKey = function () {
  const el = document.getElementById('inline-gemini-key');
  if (el && el.value.trim()) {
    localStorage.setItem('hellyeah_gemini_key', el.value.trim());
    window.location.reload();
  }
};

window.HELLEVO_CUSTOM_STAGE = function (state) {
  const hasGemini = Boolean(localStorage.getItem('hellyeah_gemini_key'));
  const geminiWidget = window.GEMINI_STAGE_HTML
    ? `<div class="stage-module" style="margin-bottom:0.75rem;">${window.GEMINI_STAGE_HTML}</div>`
    : '';

  if (!hasGemini) {
    return (
      geminiWidget +
      `
      <div class="stage-module" style="border-color:var(--accent-primary);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.45rem;">
          <strong style="font-size:0.88rem;">Connect Gemini 2.5 Router (&lt;1s Instant Response)</strong>
          <span class="token-pill">v0.6.0 Ready</span>
        </div>
        <p style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:0.6rem;">
          Paste your Gemini API key below (saved <em>only</em> in your iPhone's <code>localStorage</code>). Every message will go to Gemini first, which decides whether to answer/mutate immediately or route to Antigravity.
        </p>
        <div class="task-add-row">
          <input type="password" id="inline-gemini-key" class="stage-text-input" placeholder="Paste AIzaSy... Gemini API key here" />
          <button type="button" class="primary-pill-btn" onclick="window.saveInlineGeminiKey()">Save Key</button>
        </div>
      </div>
    `
    );
  }

  return (
    geminiWidget +
    `
    <div class="token-saver-bar">
      <div>
        <strong>Gemini 2.5 Flash Router Active</strong>
        <span style="color:var(--text-secondary);margin-left:0.35rem;">Messages hit Gemini first (&lt;1s) &rarr; Self or Antigravity VM</span>
      </div>
      <span class="token-pill">Dual-Agent Live</span>
    </div>
  `
  );
};
