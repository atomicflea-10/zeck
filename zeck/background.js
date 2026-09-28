// Turns a host or URL fragment into match patterns for that host and its subdomains.
const patternsFor = (h) => {
  h = (h || '').trim().toLowerCase().replace(/^[a-z]+:\/\//, '').split(/[/?#]/)[0]
    .replace(/:\d+$/, '').replace(/^\*\./, '');
  if (!h) return [];
  return /^[\d.]+$|^\[/.test(h) ? [`*://${h}/*`] : [`*://${h}/*`, `*://*.${h}/*`];
};

const ID = 'sec';
let chain = Promise.resolve();
const sync = () => (chain = chain.then(doSync).catch((e) => console.warn(e)));

async function doSync() {
  const { host } = await chrome.storage.sync.get('host');
  const origins = patternsFor(host);
  await chrome.scripting.unregisterContentScripts({ ids: [ID] }).catch(() => {});
  if (!origins.length || !(await chrome.permissions.contains({ origins }))) return;
  await chrome.scripting.registerContentScripts([
    { id: ID, matches: origins, js: ['content.js'], runAt: 'document_idle' },
  ]);
  // Inject into already-open matching tabs so no reload is needed.
  for (const t of await chrome.tabs.query({ url: origins })) {
    chrome.scripting.executeScript({ target: { tabId: t.id }, files: ['content.js'] }).catch(() => {});
  }
}

chrome.action.onClicked.addListener(() => chrome.runtime.openOptionsPage());
// Preset for psssbtyping.com; its host access is granted in manifest.json, so it works right after install.
const DEFAULTS = { host: 'psssbtyping.com', selector: '#sample-paragraph', keys: 'afj;', mode: 'chord' };

chrome.runtime.onInstalled.addListener(async () => {
  const { host } = await chrome.storage.sync.get('host');
  if (!host) await chrome.storage.sync.set(DEFAULTS);
  sync();
});
chrome.storage.onChanged.addListener((c, area) => area === 'sync' && c.host && sync());
chrome.permissions.onAdded.addListener(sync);
chrome.permissions.onRemoved.addListener(sync);
