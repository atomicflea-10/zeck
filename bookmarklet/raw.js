// eOffice noting bookmarklet: readable source. A port of zeck/content.js that runs from a bookmark.
// Build the javascript: URL with:  node bookmarklet/build.mjs
// Rules for this file (the build strips comments line by line): no block comments, and a trailing
// comment needs a space on both sides of the two slashes.
void (() => {
  // ============================== CONFIG ==============================
  // Change these when the target moves to the eOffice noting text area, then rebuild.
  const CONFIG = {
    // The keys only work on these sites (extension: location.href contains 'psssbtyping.com').
    // 127.0.0.1 is the local test page, bookmarklet/test-target.html.
    siteHosts: ['psssbtyping.com', '127.0.0.1'],
    selector: '#sample-paragraph', // source element
    input: '#input-box', // typing box that gets filled
    next: '#next-segment-btn', // Next button
    chord: 'qr', // hold ੌ ੀ (Q R) → copy
    pasteKey: 'p', // hold ੌ ੀ ਜ (Q R P) → paste into the typing box
    gurmukhi: { 'ੌ': 'q', 'ੀ': 'r', 'ਜ': 'p' },
    seqGapMs: 1500, // max gap between arrow presses
    fireGapMs: 600, // copy fires at most this often
    waitMs: 3000, // how long Next waits for new text
    pollMs: 50,
    settleMs: 200, // pause after filling, before clicking Next
  };
  // =====================================================================

  const VERSION = 3;
  const $ = (s) => { try { return document.querySelector(s); } catch { return null; } };

  const onSite = () => CONFIG.siteHosts.some((h) => location.href.toLowerCase().includes(h.toLowerCase()));
  if (!onSite()) return;

  // Second click: the keys are already on; don't add them twice.
  const prev = window.__eofficeNoting;
  if (prev && prev.version === VERSION) return;
  if (prev) prev.destroy();

  // Like the extension: retire any earlier copy on this page (this also stops the extension's
  // content script here, so the keys don't fire twice), and step aside if it is injected again.
  document.dispatchEvent(new Event('sec:reset'));
  const ac = new AbortController();
  const opt = { capture: true, signal: ac.signal };
  document.addEventListener('sec:reset', () => destroy(), { once: true, signal: ac.signal });

  let lastFire = 0, busy = false;
  const held = new Set(), swallow = new Set();

  const editable = (e) => {
    const el = (e.composedPath && e.composedPath()[0]) || e.target;
    return el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
  };
  // Keys are matched by position (e.code), so Q R P work on the English and the Punjabi InScript
  // layouts. The Gurmukhi characters also count, for layouts that put them elsewhere.
  const norm = (e) => CONFIG.gurmukhi[e.key] || (/^Key[A-Z]$/.test(e.code) && e.code[3].toLowerCase()) ||
    (e.key || '').toLowerCase();

  // Arrow sequences, each press within 1.5 s of the last: ← → ↓ is Next → fill → Next and
  // ← → → ↓ is Next → fill (see fillNext). Up is recorded too, so it breaks a sequence.
  const ARROWS = { ArrowLeft: 'L', ArrowRight: 'R', ArrowDown: 'D', ArrowUp: 'U' };
  let arrows = '', lastArrow = 0;
  function arrow(e) {
    const now = Date.now();
    if (now - lastArrow > CONFIG.seqGapMs) arrows = '';
    lastArrow = now;
    arrows = (arrows + ARROWS[e.key]).slice(-4);
    const lrrd = arrows.endsWith('LRRD');
    if (!lrrd && !arrows.endsWith('LRD')) return;
    e.preventDefault();
    swallow.add('arrowdown'); // focus moves to the box; a held ↓ must not move its cursor
    arrows = '';
    fillNext(!lrrd);
  }

  addEventListener('keydown', (e) => {
    // After a paste the cursor is in the box; keys still held from the chord must not type there.
    if (swallow.has(norm(e))) return e.preventDefault();
    if (e.repeat || e.isComposing || e.keyCode === 229 || e.ctrlKey || e.metaKey || e.altKey) return;
    if (editable(e) || !onSite()) return;
    if (ARROWS[e.key]) return arrow(e);
    if (e.key.length !== 1) return;
    const k = norm(e);
    held.add(k);
    if (![...CONFIG.chord].every((c) => held.has(c))) return;
    // ੌ ੀ copies; ੌ ੀ ਜ pastes into the box. preventDefault stops ਜ landing in the box,
    // which has focus by the time the key's default action runs.
    if (held.has(CONFIG.pasteKey)) { e.preventDefault(); paste(); } else fire();
  }, opt);
  addEventListener('keyup', (e) => { held.delete(norm(e)); swallow.delete(norm(e)); }, opt);
  addEventListener('blur', () => { held.clear(); swallow.clear(); }, opt);

  function sourceText() {
    const el = $(CONFIG.selector);
    return el ? (el.innerText || el.textContent || '').trim() : '';
  }

  // Copies silently, as in the extension. Nothing is shown on the page, whether or not it works.
  async function fire() {
    const now = Date.now();
    if (now - lastFire < CONFIG.fireGapMs) return;
    lastFire = now;
    const text = sourceText();
    if (text) await copy(text);
  }

  // Replaces whatever is in the typing box with the element's text and leaves the cursor there.
  function paste() {
    const text = sourceText(), box = $(CONFIG.input);
    if (!text || !box) return;
    fill(box, text);
    held.forEach((k) => swallow.add(k));
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const clickNext = () => {
    const b = $(CONFIG.next);
    if (!b || b.disabled) return false;
    b.click();
    return true;
  };

  // Waits up to 3 s for the element's text to differ from `before`; '' if it doesn't.
  async function newText(before) {
    for (const end = Date.now() + CONFIG.waitMs; Date.now() < end; await sleep(CONFIG.pollMs)) {
      const t = sourceText();
      if (t && t !== before) return t;
    }
    return '';
  }

  // Clicks Next, waits for the new text and puts it in the typing box (not the clipboard); with thenNext it
  // clicks Next once more. So ← → ↓ is Next → fill → Next, and ← → → ↓ is Next → fill.
  // Stops quietly if the button or box is missing or the text does not change within 3 s.
  async function fillNext(thenNext) {
    if (busy) return;
    busy = true;
    try {
      const before = sourceText();
      if (!clickNext()) return;
      const text = await newText(before);
      const box = $(CONFIG.input);
      if (!text || !box) return;
      fill(box, text);
      if (!thenNext) return;
      await sleep(CONFIG.settleMs); // let the page register the input before moving on
      clickNext();
    } finally {
      // Leave the cursor in the typing box, at the end of its text.
      const box = $(CONFIG.input);
      if (box) { box.focus(); try { box.setSelectionRange(box.value.length, box.value.length); } catch {} }
      busy = false;
    }
  }

  // Replaces the box's contents as if typed, so the page's own input handlers see it. If the
  // browser refuses insertText, sets the value through the native setter (React/Vue-safe) and
  // fires bubbling input and change events.
  function fill(box, text) {
    box.focus();
    box.select();
    let ok = false;
    try { ok = document.execCommand('insertText', false, text); } catch {}
    if (!ok || box.value !== text) {
      const proto = box instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(box, text);
      box.dispatchEvent(new Event('input', { bubbles: true }));
      box.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  async function copy(t) {
    try { await navigator.clipboard.writeText(t); return true; } catch {}
    let ok = false;
    const prevFocus = document.activeElement;
    const ta = document.createElement('textarea');
    ta.value = t;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:-1000px;left:0;opacity:0';
    document.documentElement.appendChild(ta);
    ta.select();
    try { ok = document.execCommand('copy'); } catch {}
    ta.remove();
    if (prevFocus && prevFocus.focus) prevFocus.focus();
    return ok;
  }

  function destroy() {
    ac.abort();
    if (window.__eofficeNoting === api) delete window.__eofficeNoting;
  }

  const api = { version: VERSION, destroy };
  window.__eofficeNoting = api;
})();
