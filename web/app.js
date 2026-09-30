// Dark typing page. It never reads the target page: every read and write there is done by the
// bookmarklet, which talks to this page with postMessage.
//
// ============================== CONFIG ==============================
// Target sites this page accepts messages from (the host name or any subdomain of it).
// 127.0.0.1 is the local test page (bookmarklet/test-target.html).
// Where THIS page is hosted is set in bookmarklet/raw.js (hostUrl):
//   local  'http://localhost:8080/web/'    production  'https://YOUR_DOMAIN/'
const TARGET_HOSTS = ['psssbtyping.com', '127.0.0.1'];
const DEFAULT_SELECTOR = '#sample-paragraph';
// =====================================================================

const NS = 'dark';
const $ = (id) => document.getElementById(id);
const main = $('main'), source = $('source'), selInput = $('selector');

const store = {
  get: (k) => { try { return localStorage.getItem('dark:' + k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem('dark:' + k, v); } catch {} },
};

// ---------- connection ----------
let target = null, targetOrigin = '', targetSite = '', lastSeen = 0, seq = 0;

const allowed = (origin) => {
  let h;
  try { h = new URL(origin).hostname.toLowerCase(); } catch { return false; }
  return TARGET_HOSTS.some((t) => h === t || h.endsWith('.' + t));
};
const connected = () => !!target && !target.closed && Date.now() - lastSeen < 6000;

function post(msg) {
  if (!connected()) {
    showError('Not connected. Open the target site and click the bookmark.');
    return false;
  }
  target.postMessage({ ns: NS, id: ++seq, ...msg }, targetOrigin);
  return true;
}

function renderStatus() {
  const s = $('status');
  if (connected()) {
    s.className = 'status ok';
    $('conn').textContent = 'Connected to ' + targetSite;
  } else if (target && !target.closed) {
    s.className = 'status bad';
    $('conn').textContent = 'Target not responding. If you reloaded it, click the bookmark there again.';
  } else {
    s.className = 'status wait';
    $('conn').textContent = target ? 'Target tab closed. Open the target site and click the bookmark.'
      : 'Waiting for target. Open the target site and click the bookmark.';
  }
}
// Pings keep the status honest (the target answers even from a background tab).
setInterval(() => {
  if (target && !target.closed) target.postMessage({ ns: NS, type: 'PING' }, targetOrigin);
  renderStatus();
}, 2000);

function adopt(e, info) {
  target = e.source;
  targetOrigin = e.origin;
  targetSite = (info && info.site) || new URL(e.origin).host;
  lastSeen = Date.now();
  const sel = store.get('selector');
  target.postMessage({ ns: NS, type: 'HOST_READY', selector: sel || '' }, targetOrigin);
  if (info && info.selector && !sel) $('source-sel').textContent = info.selector;
  setLast('connected');
  renderStatus();
}

addEventListener('message', (e) => {
  const m = e.data;
  if (!m || m.ns !== NS || !allowed(e.origin) || !e.source) return;
  // A new bookmark click always takes over; a heartbeat reconnects after this page reloads.
  if (m.type === 'TARGET_READY' || (m.type === 'STATUS' && m.alive && !connected() && e.source !== target)) {
    return adopt(e, m);
  }
  if (e.source !== target || e.origin !== targetOrigin) return;
  const wasConnected = connected();
  lastSeen = Date.now();
  if (!wasConnected) renderStatus();

  switch (m.type) {
    case 'COPY_FROM_TARGET':
      setSource(m.text);
      setMain(m.text);
      // Copy from a button here: this page has the click, so it writes the clipboard.
      // From the keys, the target page already did.
      if (m.via === 'host') navigator.clipboard.writeText(m.text).catch(() => {});
      setLast(m.via === 'keys' ? 'Copy (keys on target)' : 'Copy');
      break;
    case 'APPLY_MAPPING':
      setSource(m.text);
      setMain(m.text);
      setLast(label(m.action) + (m.of > 1 ? ` (${m.step}/${m.of})` : '') + (m.via === 'keys' ? ' (keys on target)' : ''));
      break;
    case 'STATUS':
      if (m.selector) $('source-sel').textContent = m.selector;
      if (m.message) setLast(m.message);
      break;
    case 'ERROR':
      showError(m.message);
      break;
  }
});

// ---------- UI ----------
const LABELS = { send: 'Send', copy: 'Copy', paste: 'Paste', next1: 'Next, 1 segment', next2: 'Next, 2 segments' };
const label = (a) => LABELS[a] || a;

function setLast(text) {
  $('last').textContent = 'Last action: ' + text + ' · ' + new Date().toLocaleTimeString();
  $('error').hidden = true;
}
function showError(text) {
  $('error').textContent = text;
  $('error').hidden = false;
}
function setSource(text) {
  source.value = text || '';
}
// Replaces the box's text. When this page has focus it goes through insertText, so Ctrl+Z brings
// back what was typed before.
function setMain(text) {
  text = text || '';
  if (document.hasFocus() && document.activeElement === main) {
    main.select();
    if (document.execCommand('insertText', false, text)) return saveDraft();
  }
  main.value = text;
  saveDraft();
}

function act(action) {
  if (action === 'send') {
    if (post({ type: 'PASTE_TO_TARGET', text: main.value })) setLast('Sending…');
  } else if (action === 'copy') {
    if (post({ type: 'COPY_FROM_TARGET' })) setLast('Copy…');
  } else if (post({ type: 'APPLY_MAPPING', action })) {
    setLast(label(action) + '…');
  }
  main.focus();
}

document.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => act(b.dataset.act)));

const HOTKEYS = { KeyC: 'copy', KeyP: 'paste', Digit1: 'next1', Digit2: 'next2' };
addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !e.altKey) {
    e.preventDefault();
    return act('send');
  }
  if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && HOTKEYS[e.code]) {
    e.preventDefault();
    act(HOTKEYS[e.code]);
  }
});

// Draft survives a reload of this page (this browser only).
let draftTimer;
const saveDraft = () => { clearTimeout(draftTimer); draftTimer = setTimeout(() => store.set('draft', main.value), 300); };
main.value = store.get('draft') || '';
main.addEventListener('input', saveDraft);

// Source selector: the extension's only setting. Kept in this browser and sent to the target.
selInput.value = store.get('selector') || '';
$('source-sel').textContent = selInput.value || DEFAULT_SELECTOR;
$('sel-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const sel = selInput.value.trim();
  try { document.querySelector(sel || DEFAULT_SELECTOR); } catch { return showError('Invalid CSS selector'); }
  store.set('selector', sel);
  $('source-sel').textContent = sel || DEFAULT_SELECTOR;
  if (connected()) post({ type: 'SET_SELECTOR', selector: sel || DEFAULT_SELECTOR });
  else setLast('selector saved; sent when the target connects');
});

// ---------- Punjabi InScript typing (same map as docs/index.html) ----------
// Physical key → [normal, with Shift]. Keys not listed type as usual. If the OS keyboard is already
// Punjabi, the browser gives Gurmukhi characters and they pass through.
const INSCRIPT = {
  Backquote: ['ੱ', ''],
  KeyQ: ['ੌ', 'ਔ'], KeyW: ['ੈ', 'ਐ'], KeyE: ['ਾ', 'ਆ'], KeyR: ['ੀ', 'ਈ'], KeyT: ['ੂ', 'ਊ'],
  KeyY: ['ਬ', 'ਭ'], KeyU: ['ਹ', 'ਙ'], KeyI: ['ਗ', 'ਘ'], KeyO: ['ਦ', 'ਧ'], KeyP: ['ਜ', 'ਝ'],
  BracketLeft: ['ਡ', 'ਢ'], BracketRight: ['਼', 'ਞ'],
  KeyA: ['ੋ', 'ਓ'], KeyS: ['ੇ', 'ਏ'], KeyD: ['੍', 'ਅ'], KeyF: ['ਿ', 'ਇ'], KeyG: ['ੁ', 'ਉ'],
  KeyH: ['ਪ', 'ਫ'], KeyJ: ['ਰ', 'ੜ'], KeyK: ['ਕ', 'ਖ'], KeyL: ['ਤ', 'ਥ'], Semicolon: ['ਚ', 'ਛ'], Quote: ['ਟ', 'ਠ'],
  KeyX: ['ਂ', 'ੰ'], KeyC: ['ਮ', 'ਣ'], KeyV: ['ਨ', ''], KeyB: ['ਵ', ''], KeyN: ['ਲ', 'ਲ਼'], KeyM: ['ਸ', 'ਸ਼'],
  Period: ['', '।'], Slash: ['ਯ', ''],
};
const inscript = $('inscript');
main.addEventListener('keydown', (e) => {
  if (!inscript.checked || e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
  if (e.key.length !== 1 || e.key.charCodeAt(0) > 127) return; // not a typed ASCII key
  const ch = (INSCRIPT[e.code] || [])[e.shiftKey ? 1 : 0];
  if (!ch) return;
  e.preventDefault();
  if (!document.execCommand('insertText', false, ch)) {
    main.setRangeText(ch, main.selectionStart, main.selectionEnd, 'end');
    saveDraft();
  }
});
inscript.checked = store.get('inscript') !== 'off';
inscript.addEventListener('change', () => { store.set('inscript', inscript.checked ? 'on' : 'off'); main.focus(); });

// ---------- install section ----------
const bm = $('bm');
bm.addEventListener('click', (e) => {
  e.preventDefault();
  showBmWarn("Drag this link to the bookmarks bar, then click the bookmark on the target site. Clicking it here does nothing useful.");
});
function showBmWarn(text) { $('bm-warn').textContent = text; $('bm-warn').hidden = false; }

$('copy-bm').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(bm.href); $('copy-bm').textContent = 'Copied'; }
  catch { showBmWarn('Could not copy. Open bookmarklet/bookmarklet.url.txt and copy it from there.'); }
});

// Warn when the bookmark would open a different address than this page's.
(() => {
  if (location.protocol === 'file:') {
    return showBmWarn('Opened as a file. Serve the web/ folder over http(s) (see README), or the bookmark cannot connect.');
  }
  let built = '';
  try { built = (decodeURIComponent(bm.getAttribute('href')).match(/hostUrl: '([^']*)'/) || [])[1] || ''; } catch {}
  if (!built) return showBmWarn('The bookmark link is not built yet. Run: node bookmarklet/build.mjs');
  if (new URL(built).origin !== location.origin) {
    showBmWarn(`This bookmark opens ${built}, not this page. Set hostUrl in bookmarklet/raw.js (or use --host) and rebuild.`);
  }
})();

renderStatus();
main.focus();
