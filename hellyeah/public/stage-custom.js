// Delta Stage Plugin (v0.4.0) - Low-token target for custom stage mutations
window.HELLEVO_CUSTOM_STAGE = function (state) {
  return `
    <div class="token-saver-bar">
      <div>
        <strong>Low-Token Delta Mode Active</strong>
        <span style="color:var(--text-secondary);margin-left:0.35rem;">Edits target only <code>custom.css</code>, <code>stage-custom.js</code> &amp; <code>state.json</code></span>
      </div>
      <span class="token-pill">~85% fewer tokens/req</span>
    </div>
  `;
};
