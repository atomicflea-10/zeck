(() => {
  // Replace any earlier copy of this script in the page (re-injection or extension reload).
  document.dispatchEvent(new Event('sec:reset'));
  const ac = new AbortController();
  const opt = { capture: true, signal: ac.signal };
  document.addEventListener('sec:reset', () => ac.abort(), { once: true });

  let cfg = {}, buf = [], lastKey = 0, lastFire = 0;
  const held = new Set();
  const load = () => chrome.storage.sync.get(null, (s) => (cfg = s || {}));
  load();
  chrome.storage.onChanged.addListener((c, area) => area === 'sync' && !ac.signal.aborted && load());

  const onSite = () => cfg.host && location.href.toLowerCase().includes(cfg.host.toLowerCase());
  const editable = (e) => {
    const el = (e.composedPath && e.composedPath()[0]) || e.target;
    return el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
  };

  addEventListener('keydown', (e) => {
    if (e.repeat || e.isComposing || e.keyCode === 229 || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key.length !== 1 || editable(e) || !onSite() || !cfg.keys) return;
    const k = e.key.toLowerCase(), keys = cfg.keys.toLowerCase();
    if (cfg.mode === 'chord') {
      held.add(k);
      if ([...keys].every((c) => held.has(c))) fire();
      return;
    }
    const now = Date.now();
    if (now - lastKey > 1500) buf = [];
    lastKey = now;
    buf = [...buf, k].slice(-keys.length);
    if (buf.join('') === keys) { buf = []; fire(); }
  }, opt);
  addEventListener('keyup', (e) => held.delete((e.key || '').toLowerCase()), opt);
  addEventListener('blur', () => held.clear(), opt);

  async function fire() {
    const now = Date.now();
    if (now - lastFire < 600) return;
    lastFire = now;
    if (!cfg.selector) return toast('Not configured', false);
    let el;
    try { el = document.querySelector(cfg.selector); } catch { return toast('Invalid selector', false); }
    if (!el) return toast('Element missing', false);
    const text = (el.innerText || el.textContent || '').trim();
    if (!text) return toast('Element empty', false);
    const copied = await copy(text);
    toast(copied ? 'Copied' : 'Clipboard blocked', copied);
  }

  async function copy(t) {
    try { await navigator.clipboard.writeText(t); return true; } catch {}
    let ok = false;
    const prev = document.activeElement;
    const ta = document.createElement('textarea');
    ta.value = t;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:-1000px;left:0;opacity:0';
    document.documentElement.appendChild(ta);
    ta.select();
    try { ok = document.execCommand('copy'); } catch {}
    ta.remove();
    if (prev && prev.focus) prev.focus();
    return ok;
  }

  let toastEl;
  function toast(msg, good) {
    if (toastEl) toastEl.remove();
    const d = (toastEl = document.createElement('div'));
    d.textContent = msg;
    d.style.cssText = 'all:initial;position:fixed;z-index:2147483647;right:16px;bottom:16px;' +
      'padding:8px 14px;border-radius:6px;font:600 13px/1.3 system-ui,sans-serif;color:#fff;' +
      'box-shadow:0 2px 8px rgba(0,0,0,.3);background:' + (good ? '#15803d' : '#b91c1c');
    document.documentElement.appendChild(d);
    setTimeout(() => d.remove(), 1500);
  }
})();
