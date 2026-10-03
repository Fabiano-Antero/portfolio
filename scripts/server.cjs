const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const port = Number(process.env.PORT || 4173);
const types = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.webp':'image/webp', '.glb':'model/gltf-binary', '.woff2':'font/woff2', '.woff':'font/woff', '.ttf':'font/ttf' };
http.createServer((request, response) => {
  let url;
  try { url = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); } catch { response.writeHead(400); return response.end('Bad request'); }
  const file = path.resolve(root, '.' + (url === '/' ? '/index.html' : url));
  if (!file.startsWith(root + path.sep) || url.split('/').some(part => part.startsWith('.')) || !Object.hasOwn(types,path.extname(file))) { response.writeHead(403); return response.end('Forbidden'); }
  fs.readFile(file, (error, content) => {
    if (error) { response.writeHead(404); return response.end('Página não encontrada'); }
    response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control':'no-cache' });
    response.end(content);
  });
}).listen(port, '127.0.0.1', () => console.log(`Portfolio: http://localhost:${port}`));
