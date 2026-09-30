// Builds the javascript: bookmarklet from raw.js, writes bookmarklet.url.txt and puts it into the
// drag button in web/index.html. No dependencies.
//   node bookmarklet/build.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const here = (p) => new URL(p, import.meta.url);
const src = readFileSync(here('raw.js'), 'utf8');

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

console.log(`Built ${url.length} chars -> bookmarklet/bookmarklet.url.txt and web/index.html`);
