// Same as patternsFor in background.js.
const patternsFor = (h) => {
  h = (h || '').trim().toLowerCase().replace(/^[a-z]+:\/\//, '').split(/[/?#]/)[0]
    .replace(/:\d+$/, '').replace(/^\*\./, '');
  if (!h) return [];
  return /^[\d.]+$|^\[/.test(h) ? [`*://${h}/*`] : [`*://${h}/*`, `*://*.${h}/*`];
};

const $ = (id) => document.getElementById(id);
const status = (msg, ok) => { $('status').textContent = msg; $('status').className = ok ? 'ok' : 'err'; };

let savedHost = '';
async function refreshGrant() {
  const origins = patternsFor(savedHost);
  $('grant').hidden = !origins.length || (await chrome.permissions.contains({ origins }));
}

function validate(c) {
  if (!patternsFor(c.host).length) return 'Enter a site host, e.g. example.com';
  if (!c.selector) return 'Enter a CSS selector';
  try { document.querySelector(c.selector); } catch { return 'Invalid CSS selector'; }
  if (!/^\S{2,6}$/u.test(c.keys) || new Set(c.keys).size !== c.keys.length) return 'Enter 2 to 6 unique characters';
}

$('save').onclick = async () => {
  const c = {
    host: $('host').value.trim().toLowerCase(),
    selector: $('selector').value.trim(),
    keys: $('keys').value.toLowerCase(),
    mode: document.querySelector('input[name=mode]:checked').value,
  };
  const err = validate(c);
  if (err) return status(err, false);
  // Request must start inside the click gesture, before any await.
  const granted = chrome.permissions.request({ origins: patternsFor(c.host) });
  await chrome.storage.sync.set(c);
  savedHost = c.host;
  status((await granted) ? 'Saved' : 'Saved, but site access not granted', await granted);
  refreshGrant();
};

$('grant').onclick = async () => {
  const ok = await chrome.permissions.request({ origins: patternsFor(savedHost) });
  status(ok ? 'Access granted' : 'Access denied', ok);
  refreshGrant();
};

// Pre-filled for psssbtyping.com until the user saves their own settings.
const DEFAULTS = { host: 'psssbtyping.com', selector: '#sample-paragraph', keys: 'afj;', mode: 'chord' };

chrome.storage.sync.get(null, (s) => {
  savedHost = s.host || '';
  if (!s.host) s = DEFAULTS;
  $('host').value = s.host || '';
  $('selector').value = s.selector || '';
  $('keys').value = s.keys || '';
  if (s.mode === 'chord') document.querySelector('input[value=chord]').checked = true;
  refreshGrant();
});
