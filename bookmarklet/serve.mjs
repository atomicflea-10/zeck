// Local test server for the repo root, on port 8080. No dependencies.
//   node bookmarklet/serve.mjs
// Typing page: http://localhost:8080/web/
// Test target: http://127.0.0.1:8080/bookmarklet/test-target.html  (a different origin, on purpose)
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.txt': 'text/plain', '.md': 'text/plain' };
const port = Number(process.env.PORT) || 8080;

createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (path.endsWith('/')) path += 'index.html';
  const file = normalize(join(root, path));
  if (!file.startsWith(normalize(root))) return res.writeHead(403).end();
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': (TYPES[extname(file)] || 'application/octet-stream') + '; charset=utf-8' });
    res.end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
}).listen(port, () => {
  console.log(`Typing page: http://localhost:${port}/web/`);
  console.log(`Test target: http://127.0.0.1:${port}/bookmarklet/test-target.html`);
});
