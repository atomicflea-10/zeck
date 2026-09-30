// Dark bookmarklet: readable source. A port of zeck/content.js that also talks to the typing page.
// Build the javascript: URL with:  node bookmarklet/build.mjs            (uses hostUrl below)
//                                   node bookmarklet/build.mjs --host https://YOUR_DOMAIN/
// Rules for this file (the build strips comments line by line): no block comments, and a trailing
// comment needs a space on both sides of the two slashes.
void (() => {
  // ============================== CONFIG ==============================
  const CONFIG = {
    // Where web/index.html is served. CHANGE THIS if you host it elsewhere (e.g. 'https://YOUR_DOMAIN/'),
    // then rebuild. Local testing: build with --host http://localhost:8080/web/ (see web/README.md).
    hostUrl: 'https://atomicflea-10.github.io/zeck/typing/',
    // The keys only work on these sites (extension: location.href contains 'psssbtyping.com').
    // 127.0.0.1 is the local test page, bookmarklet/test-target.html.
    siteHosts: ['psssbtyping.com', '127.0.0.1'],
    selector: '#sample-paragraph', // source element (extension default; the typing page can change it)
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

  const VERSION = 1, NS = 'dark', WIN_NAME = 'dark-typing-host';
  const HOST_ORIGIN = new URL(CONFIG.hostUrl).origin;
  const $ = (s) => { try { return document.querySelector(s); } catch { return null; } };

  // Toast in a shadow root, so page styles can't touch it and it can't touch the page.
  let toastHost, toastEl, toastTimer;
  function toast(msg, err) {
    if (!toastHost) {
      toastHost = document.createElement('div');
      toastHost.style.cssText = 'all:initial;position:fixed;z-index:2147483647;right:16px;bottom:16px;pointer-events:none';
      const root = toastHost.attachShadow({ mode: 'open' });
      root.innerHTML = '<div style="font:13px/1.4 system-ui,sans-serif;padding:8px 12px;border-radius:6px;color:#fff;box-shadow:0 4px 14px rgba(0,0,0,.25);transition:opacity .2s;max-width:340px"></div>';
      toastEl = root.firstChild;
    }
    if (!toastHost.isConnected) document.documentElement.appendChild(toastHost);
    toastEl.textContent = 'Dark: ' + msg;
    toastEl.style.background = err ? '#b91c1c' : '#1f2937';
    toastEl.style.opacity = '1';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toastEl.style.opacity = '0'), err ? 4000 : 2200);
  }

  // Clicked on the typing page itself: nothing to control here.
  if (location.origin === HOST_ORIGIN) {
    toast('drag this link to the bookmarks bar, then click it on the target site.');
    return;
  }
  const onSite = () => CONFIG.siteHosts.some((h) => location.href.toLowerCase().includes(h.toLowerCase()));
  if (!onSite()) {
    toast('this is not ' + CONFIG.siteHosts[0] + '. Keys stay off here.', true);
    return;
  }

  // Second click: keep the existing listeners and just reopen or focus the typing page.
  const prev = window.__darkBridge;
  if (prev && prev.version === VERSION) {
    prev.open();
    return;
  }
  let hostWin = prev ? prev.hostWin : null;
  if (prev) prev.destroy();

  // Like the extension: retire any earlier copy on this page (this also stops the extension's
  // content script here, so the keys don't fire twice), and step aside if it is injected again.
  document.dispatchEvent(new Event('sec:reset'));
  const ac = new AbortController();
  const opt = { capture: true, signal: ac.signal };
  document.addEventListener('sec:reset', () => destroy(), { once: true, signal: ac.signal });

  let selector = CONFIG.selector, lastFire = 0, busy = false;
  let acked = false, closedShown = false;
  const held = new Set(), swallow = new Set();

  const editable = (e) => {
    const el = (e.composedPath && e.composedPath()[0]) || e.target;
    return el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
  };
  // Keys are matched by position (e.code), so Q R P work on the English and the Punjabi InScript
  // layouts. The Gurmukhi characters also count, for layouts that put them elsewhere.
  const norm = (e) => CONFIG.gurmukhi[e.key] || (/^Key[A-Z]$/.test(e.code) && e.code[3].toLowerCase()) ||
    (e.key || '').toLowerCase();

  // ---------- messaging (only to and from the exact typing-page origin) ----------
  const send = (msg) => {
    if (!hostWin || hostWin.closed) return;
    try { hostWin.postMessage({ ns: NS, ...msg }, HOST_ORIGIN); } catch {}
  };
  const fail = (message, id) => { toast(message, true); send({ type: 'ERROR', message, id }); };

  function openHost() {
    if (!hostWin || hostWin.closed) {
      let w = null;
      // '' finds the typing page if this tab opened it before, without reloading it.
      try { w = window.open('', WIN_NAME); } catch {}
      if (!w) return toast('pop-up blocked. Allow pop-ups for this site, then click the bookmark again.', true);
      let blank = false;
      try { blank = w.location.href === 'about:blank'; } catch {} // cross-origin: already the typing page
      if (blank) w.location.href = CONFIG.hostUrl;
      if (w.closed) return toast('this site does not allow a link to the typing page. Use the extension here.', true);
      hostWin = w;
    }
    acked = false;
    closedShown = false;
    try { hostWin.focus(); } catch {}
    announce();
  }

  const info = () => ({ site: location.host, selector, input: CONFIG.input, next: CONFIG.next, version: VERSION });
  const announce = () => send(acked ? { type: 'STATUS', alive: true } : { type: 'TARGET_READY', ...info() });

  // Keeps saying hello until the typing page answers (and after it reloads), and notices when it closes.
  function tick() {
    if (hostWin && hostWin.closed) {
      if (!closedShown) toast('control page closed. Click the bookmark to reopen it.');
      closedShown = true;
      acked = false;
      return;
    }
    announce();
  }
  const timer = setInterval(tick, 1000);
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && tick(), { signal: ac.signal });

  addEventListener('message', (e) => {
    const m = e.data;
    if (e.origin !== HOST_ORIGIN || !hostWin || e.source !== hostWin || !m || m.ns !== NS) return;
    switch (m.type) {
      case 'HOST_READY':
        if (!acked) toast('connected to the typing page');
        acked = true;
        if (m.selector) setSelector(m.selector);
        send({ type: 'STATUS', alive: true, ...info() });
        break;
      case 'PING':
        send({ type: 'STATUS', alive: true, id: m.id });
        break;
      case 'SET_SELECTOR':
        setSelector(m.selector, m.id);
        break;
      case 'COPY_FROM_TARGET':
        copyFrom('host', m.id);
        break;
      case 'PASTE_TO_TARGET':
        pasteTo(m.text, m.id);
        break;
      case 'APPLY_MAPPING':
        if (m.action === 'paste') paste('host', m.id);
        else if (m.action === 'next1') fillNext(1, 'host', m.id);
        else if (m.action === 'next2') fillNext(2, 'host', m.id);
        else fail('unknown action ' + m.action, m.id);
        break;
    }
  }, { signal: ac.signal });

  function setSelector(sel, id) {
    sel = String(sel || '').trim() || CONFIG.selector;
    try { document.querySelector(sel); } catch { return fail('invalid CSS selector ' + sel, id); }
    selector = sel;
    send({ type: 'STATUS', ok: true, message: 'source selector: ' + sel, selector, id });
  }

  // ---------- keys (same triggers as the extension) ----------
  // Arrow sequences, each press within 1.5 s of the last: ← → ↓ fills one segment and
  // ← → → ↓ fills two (see fillNext). Up is recorded too, so it breaks a sequence.
  const ARROWS = { ArrowLeft: 'L', ArrowRight: 'R', ArrowDown: 'D', ArrowUp: 'U' };
  let arrows = '', lastArrow = 0;
  function arrow(e) {
    const now = Date.now();
    if (now - lastArrow > CONFIG.seqGapMs) arrows = '';
    lastArrow = now;
    arrows = (arrows + ARROWS[e.key]).slice(-4);
    const n = arrows.endsWith('LRRD') ? 2 : arrows.endsWith('LRD') ? 1 : 0;
    if (!n) return;
    e.preventDefault();
    swallow.add('arrowdown'); // focus moves to the box; a held ↓ must not move its cursor
    arrows = '';
    fillNext(n, 'keys');
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
    if (held.has(CONFIG.pasteKey)) { e.preventDefault(); paste('keys'); } else fireKeys();
  }, opt);
  addEventListener('keyup', (e) => { held.delete(norm(e)); swallow.delete(norm(e)); }, opt);
  addEventListener('blur', () => { held.clear(); swallow.clear(); }, opt);

  // ---------- actions ----------
  function sourceText() {
    const el = $(selector);
    return el ? (el.innerText || el.textContent || '').trim() : '';
  }

  function fireKeys() {
    const now = Date.now();
    if (now - lastFire < CONFIG.fireGapMs) return;
    lastFire = now;
    copyFrom('keys');
  }

  // Copy: read the source element. From the keys it goes to the clipboard, silently, as in the
  // extension. Either way the text is sent to the typing page's box.
  async function copyFrom(via, id) {
    const text = sourceText();
    if (!text) return fail('nothing found at ' + selector, id);
    if (via === 'keys' && !(await copy(text))) toast('clipboard blocked; the text is on the typing page', true);
    send({ type: 'COPY_FROM_TARGET', text, via, id });
  }

  // Paste: replace whatever is in the typing box with the source text; the cursor stays there.
  function paste(via, id) {
    const text = sourceText(), box = $(CONFIG.input);
    if (!text) return fail('nothing found at ' + selector, id);
    if (!box) return fail(CONFIG.input + ' not found', id);
    fill(box, text);
    if (via === 'keys') held.forEach((k) => swallow.add(k));
    send({ type: 'APPLY_MAPPING', action: 'paste', text, via, id });
  }

  // Send: the typing page's text goes into the typing box.
  function pasteTo(text, id) {
    const box = $(CONFIG.input);
    if (!box) return fail(CONFIG.input + ' not found', id);
    fill(box, String(text == null ? '' : text));
    toast('sent');
    send({ type: 'STATUS', ok: true, message: 'sent to ' + CONFIG.input, id });
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

  // Clicks Next, then n times: waits for the new text, copies it into the typing box and
  // clicks Next. So n = 1 is Next → fill → Next, and n = 2 is Next → fill → Next → fill → Next.
  async function fillNext(n, via, id) {
    if (busy) return;
    busy = true;
    const action = 'next' + n;
    try {
      let before = sourceText();
      if (!clickNext()) return fail(CONFIG.next + ' not found or disabled', id);
      for (let i = 0; i < n; i++) {
        const text = await newText(before);
        const box = $(CONFIG.input);
        if (!text) return fail('text did not change within ' + CONFIG.waitMs / 1000 + ' s', id);
        if (!box) return fail(CONFIG.input + ' not found', id);
        if (via === 'keys') await copy(text);
        fill(box, text);
        send({ type: 'APPLY_MAPPING', action, step: i + 1, of: n, text, via, id });
        await sleep(CONFIG.settleMs); // let the page register the input before moving on
        if (!clickNext()) return send({ type: 'STATUS', ok: true, message: 'Next is disabled; stopped', id });
        before = text;
      }
      send({ type: 'STATUS', ok: true, message: action + ' done', id });
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
      const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
      setter.call(box, text);
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
    clearInterval(timer);
    if (toastHost) toastHost.remove();
    if (window.__darkBridge === api) delete window.__darkBridge;
  }

  const api = { version: VERSION, open: openHost, destroy, get hostWin() { return hostWin; } };
  window.__darkBridge = api;
  toast('listening');
  openHost();
})();
