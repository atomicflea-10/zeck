(() => {
  // Replace any earlier copy of this script in the page (re-injection or extension reload).
  document.dispatchEvent(new Event('sec:reset'));
  const ac = new AbortController();
  const opt = { capture: true, signal: ac.signal };
  document.addEventListener('sec:reset', () => ac.abort(), { once: true });

  let cfg = {}, buf = [], lastKey = 0, lastFire = 0;
  const held = new Set(), swallow = new Set();
  const load = () => chrome.storage.sync.get(null, (s) => (cfg = s || {}));
  load();
  chrome.storage.onChanged.addListener((c, area) => area === 'sync' && !ac.signal.aborted && load());

  const onSite = () => cfg.host && location.href.toLowerCase().includes(cfg.host.toLowerCase());
  const editable = (e) => {
    const el = (e.composedPath && e.composedPath()[0]) || e.target;
    return el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
  };

  // The trigger is the Gurmukhi chord ੌ ੀ, plus ਜ to paste. On the Punjabi InScript keyboard
  // these are the physical keys Q R P, so keys are matched by position (e.code) and work with an
  // English layout too. GURMUKHI also maps the characters, for layouts that put them elsewhere.
  const GURMUKHI = { 'ੌ': 'q', 'ੀ': 'r', 'ਜ': 'p' };
  const PASTE_KEY = 'p';
  const norm = (e) => GURMUKHI[e.key] || (/^Key[A-Z]$/.test(e.code) && e.code[3].toLowerCase()) ||
    (e.key || '').toLowerCase();

  // Arrow sequences, each press within 1.5 s of the last: ← → ↓ fills one segment and
  // ← → → ↓ fills two (see fillNext). Up is recorded too, so it breaks a sequence.
  const ARROWS = { ArrowLeft: 'L', ArrowRight: 'R', ArrowDown: 'D', ArrowUp: 'U' };
  let arrows = '', lastArrow = 0;
  function arrow(e) {
    const now = Date.now();
    if (now - lastArrow > 1500) arrows = '';
    lastArrow = now;
    arrows = (arrows + ARROWS[e.key]).slice(-4);
    const n = arrows.endsWith('LRRD') ? 2 : arrows.endsWith('LRD') ? 1 : 0;
    if (!n) return;
    e.preventDefault();
    arrows = '';
    fillNext(n);
  }

  addEventListener('keydown', (e) => {
    // After a paste the cursor is in the box; keys still held from the chord must not type there.
    if (swallow.has(norm(e))) return e.preventDefault();
    if (e.repeat || e.isComposing || e.keyCode === 229 || e.ctrlKey || e.metaKey || e.altKey) return;
    if (editable(e) || !onSite()) return;
    if (ARROWS[e.key]) return arrow(e);
    if (e.key.length !== 1 || !cfg.keys) return;
    const k = norm(e), keys = cfg.keys.toLowerCase();
    if (cfg.mode === 'chord') {
      held.add(k);
      if (![...keys].every((c) => held.has(c))) return;
      // ੌ ੀ copies; ੌ ੀ ਜ pastes into the box. preventDefault stops ਜ landing in the box,
      // which has focus by the time the key's default action runs.
      if (held.has(PASTE_KEY)) { e.preventDefault(); paste(); } else fire();
      return;
    }
    const now = Date.now();
    if (now - lastKey > 1500) buf = [];
    lastKey = now;
    buf = [...buf, k].slice(-keys.length);
    if (buf.join('') === keys) { buf = []; fire(); }
  }, opt);
  addEventListener('keyup', (e) => { held.delete(norm(e)); swallow.delete(norm(e)); }, opt);
  addEventListener('blur', () => { held.clear(); swallow.clear(); }, opt);

  // Replaces whatever is in the typing box with the element's text and leaves the cursor there.
  function paste() {
    const text = sourceText(), box = document.querySelector(INPUT);
    if (!text || !box) return;
    fill(box, text);
    held.forEach((k) => swallow.add(k));
  }

  async function fire() {
    const now = Date.now();
    if (now - lastFire < 600) return;
    lastFire = now;
    // Copies silently: nothing is shown on the page, whether or not it works.
    const text = sourceText();
    if (text) await copy(text);
  }

  function sourceText() {
    let el;
    try { el = cfg.selector && document.querySelector(cfg.selector); } catch {}
    return el ? (el.innerText || el.textContent || '').trim() : '';
  }

  const NEXT = '#next-segment-btn', INPUT = '#input-box';
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let busy = false;

  const clickNext = () => {
    const b = document.querySelector(NEXT);
    if (!b || b.disabled) return false;
    b.click();
    return true;
  };

  // Waits up to 3 s for the element's text to differ from `before`; '' if it doesn't.
  async function newText(before) {
    for (const end = Date.now() + 3000; Date.now() < end; await sleep(50)) {
      const t = sourceText();
      if (t && t !== before) return t;
    }
    return '';
  }

  // Clicks Next, then n times: waits for the new text, copies it into the typing box and
  // clicks Next. So n = 1 is Next → fill → Next, and n = 2 is Next → fill → Next → fill → Next.
  // Stops quietly if the button or box is missing or the text does not change within 3 s.
  async function fillNext(n) {
    if (busy) return;
    busy = true;
    const prev = document.activeElement;
    try {
      let before = sourceText();
      if (!clickNext()) return;
      for (let i = 0; i < n; i++) {
        const text = await newText(before);
        const box = document.querySelector(INPUT);
        if (!text || !box) return;
        await copy(text);
        fill(box, text);
        restoreFocus(prev);
        await sleep(200); // let the page register the input before moving on
        if (!clickNext()) return;
        before = text;
      }
    } finally {
      restoreFocus(prev); // in case the page moved focus into the box
      busy = false;
    }
  }

  // Replaces the box's contents with the text as if typed, so the page's own input handlers see
  // it. Leaves the cursor at the end of the text in the box.
  function fill(box, text) {
    box.focus();
    box.select();
    let ok = false;
    try { ok = document.execCommand('insertText', false, text); } catch {}
    if (!ok || box.value !== text) {
      box.value = text;
      box.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  // Puts focus back where it was, so later key presses are not typed into the box.
  function restoreFocus(prev) {
    const now = document.activeElement;
    if (now === prev) return;
    if (now && now.blur) now.blur();
    if (prev && prev !== document.body && prev.focus) prev.focus();
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
