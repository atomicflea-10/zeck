// Builds the javascript: bookmarklet from raw.js, writes bookmarklet.url.txt and puts it into the
// drag link in web/index.html. No dependencies.
//   node bookmarklet/build.mjs                               (hostUrl from raw.js)
//   node bookmarklet/build.mjs --host https://YOUR_DOMAIN/   (override without editing raw.js)
//   node bookmarklet/build.mjs --publish                     (also copy the page to docs/typing/)
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const here = (p) => new URL(p, import.meta.url);
let src = readFileSync(here('raw.js'), 'utf8');

const i = process.argv.indexOf('--host');
if (i > 0) {
  const host = process.argv[i + 1] || '';
  try { new URL(host); } catch { throw new Error(`--host needs a full URL, got "${host}"`); }
  if (/['\\]/.test(host)) throw new Error('--host must not contain quotes or backslashes');
  src = src.replace(/hostUrl: '[^']*'/, `hostUrl: '${host}'`);
}
const hostUrl = src.match(/hostUrl: '([^']*)'/)[1];

// Conservative minify: trim lines, drop comment-only and blank lines, drop trailing " // " comments.
// Newlines are kept (encoded), so no statement can run into the next.
const code = src.split(/\r?\n/)
  .map((l) => l.trim().replace(/\s+\/\/ .*$/, ''))
  .filter((l) => l && !l.startsWith('//'))
  .join('\n');

new Function(code); // throws on a syntax error
const url = 'javascript:' + encodeURIComponent(code);

writeFileSync(here('bookmarklet.url.txt'), url + '\n');

const htmlPath = here('../web/index.html');
const html = readFileSync(htmlPath, 'utf8');
const re = /(<a id="bm"[^>]*?href=")[^"]*(")/;
if (!re.test(html)) throw new Error('web/index.html: <a id="bm" href="..."> not found');
writeFileSync(htmlPath, html.replace(re, `$1${url}$2`));

console.log(`Built for ${hostUrl}\n  ${url.length} chars -> bookmarklet/bookmarklet.url.txt and web/index.html`);

// --publish: copy the typing page to docs/typing/, which GitHub Pages serves.
if (process.argv.includes('--publish')) {
  mkdirSync(here('../docs/typing/'), { recursive: true });
  for (const f of ['index.html', 'app.js', 'styles.css']) copyFileSync(here('../web/' + f), here('../docs/typing/' + f));
  console.log('  copied web/ -> docs/typing/ (commit and push to publish)');
}
