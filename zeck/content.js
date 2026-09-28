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

  // The trigger is the Gurmukhi chord ੋ ਿ ਰ ਚ. On the Punjabi InScript keyboard these are the
  // physical keys A F J ;, so keys are matched by position (e.code) and work with an English
  // layout too. GURMUKHI also maps the characters themselves, for layouts that put them elsewhere.
  const GURMUKHI = { 'ੋ': 'a', 'ਿ': 'f', 'ਰ': 'j', 'ਚ': ';' };
  const norm = (e) => GURMUKHI[e.key] || (/^Key[A-Z]$/.test(e.code) && e.code[3].toLowerCase()) ||
    (e.code === 'Semicolon' && ';') || (e.key || '').toLowerCase();

  addEventListener('keydown', (e) => {
    if (e.repeat || e.isComposing || e.keyCode === 229 || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key.length !== 1 || editable(e) || !onSite() || !cfg.keys) return;
    const k = norm(e), keys = cfg.keys.toLowerCase();
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
  addEventListener('keyup', (e) => held.delete(norm(e)), opt);
  addEventListener('blur', () => held.clear(), opt);

  async function fire() {
    const now = Date.now();
    if (now - lastFire < 600) return;
    lastFire = now;
    // Copies silently: nothing is shown on the page, whether or not it works.
    if (!cfg.selector) return;
    let el;
    try { el = document.querySelector(cfg.selector); } catch { return; }
    const text = el && (el.innerText || el.textContent || '').trim();
    if (text) await copy(text);
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
})();
