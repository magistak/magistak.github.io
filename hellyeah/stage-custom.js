// v1.0.0 Gemini Chat UI Hot-Upgrader & Plugin Hook
(function () {
  async function fetchRawAsset(path) {
    const token = (localStorage.getItem('hellyeah_gh_token') || '').trim();
    if (token) {
      try {
        const r = await fetch(
          'https://api.github.com/repos/magistak/magistak.github.io/contents/hellyeah/' + path + '?ref=main&t=' + Date.now(),
          {
            headers: {
              Accept: 'application/vnd.github.raw+json',
              Authorization: 'Bearer ' + token
            },
            cache: 'no-store'
          }
        );
        if (r.ok) return await r.text();
      } catch (e) {}
    }
    const fallback = await fetch('./' + path + '?t=' + Date.now(), { cache: 'no-store' });
    if (fallback.ok) return await fallback.text();
    return null;
  }

  async function ensureGeminiChatUI() {
    if (!document.body) return;
    if (document.body.getAttribute('data-ui-rehaul') === 'v1.0') return;
    if (window.__UPGRADING_TO_V1__) return;
    window.__UPGRADING_TO_V1__ = true;

    try {
      const [htmlText, cssText, jsText] = await Promise.all([
        fetchRawAsset('index.html'),
        fetchRawAsset('style.css'),
        fetchRawAsset('app.js')
      ]);

      if (htmlText && cssText && jsText && htmlText.includes('data-ui-rehaul="v1.0"')) {
        document.documentElement.setAttribute('data-theme', localStorage.getItem('hellyeah_gemini_theme') || 'gemini-dark');
        let styleEl = document.getElementById('v1-hot-style');
        if (!styleEl) {
          styleEl = document.createElement('style');
          styleEl.id = 'v1-hot-style';
          document.head.appendChild(styleEl);
        }
        styleEl.textContent = cssText;

        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, 'text/html');
        const newApp = doc.getElementById('gemini-app');
        if (newApp) {
          document.body.setAttribute('data-ui-rehaul', 'v1.0');
          document.body.innerHTML = '';
          document.body.appendChild(newApp);
          new Function(jsText)();
          document.dispatchEvent(new Event('DOMContentLoaded'));
        }
      }
    } catch (e) {
      window.__UPGRADING_TO_V1__ = false;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureGeminiChatUI);
  } else {
    ensureGeminiChatUI();
  }
})();
