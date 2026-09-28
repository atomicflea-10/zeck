const $ = (id) => document.getElementById(id);
const status = (msg, ok) => { $('status').textContent = msg; $('status').className = ok ? 'ok' : 'err'; };

$('save').onclick = async () => {
  const selector = $('selector').value.trim();
  if (!selector) return status('Enter a CSS selector', false);
  try { document.querySelector(selector); } catch { return status('Invalid CSS selector', false); }
  await chrome.storage.sync.set({ selector });
  status('Saved', true);
};

chrome.storage.sync.get('selector', (s) => ($('selector').value = s.selector || ''));
