const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
require('./build-styles.cjs')();
const root = path.resolve(__dirname, '..');
const port = Number(process.env.PORT || 4173);
const types = { '.html':'text/html; charset=utf-8', '.txt':'text/plain; charset=utf-8', '.xml':'application/xml; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.webp':'image/webp', '.glb':'model/gltf-binary', '.woff2':'font/woff2', '.woff':'font/woff', '.ttf':'font/ttf' };
types['.mp4'] = 'video/mp4';
http.createServer((request, response) => {
  let url;
  try { url = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); } catch { response.writeHead(400); return response.end('Bad request'); }
  const file = path.resolve(root, '.' + (url === '/' ? '/index.html' : url));
  const publicCatalog = url === '/.well-known/ai-catalog.json';
  if (!file.startsWith(root + path.sep) || (!publicCatalog && url.split('/').some(part => part.startsWith('.'))) || !Object.hasOwn(types,path.extname(file))) { response.writeHead(403); return response.end('Forbidden'); }
  if (path.extname(file) === '.mp4') {
    // Byte ranges let the local preview seek without downloading the entire video.
    return fs.stat(file, (error, stat) => {
      if (error || !stat.isFile()) { response.writeHead(404); return response.end('Vídeo não encontrado'); }
      const headers = {'Content-Type':'video/mp4','Accept-Ranges':'bytes','Cache-Control':'no-cache'};
      const range = request.headers.range;
      let start = 0, end = stat.size - 1;
      if (range) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(range);
        if (!match || (!match[1] && !match[2])) {
          response.writeHead(416, {...headers,'Content-Range':`bytes */${stat.size}`}); return response.end();
        }
        start = match[1] ? Number(match[1]) : Math.max(0, stat.size - Number(match[2]));
        end = match[1] && match[2] ? Math.min(Number(match[2]), stat.size - 1) : end;
        if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= stat.size) {
          response.writeHead(416, {...headers,'Content-Range':`bytes */${stat.size}`}); return response.end();
        }
        headers['Content-Range'] = `bytes ${start}-${end}/${stat.size}`;
      }
      headers['Content-Length'] = end - start + 1;
      response.writeHead(range ? 206 : 200, headers);
      if (request.method === 'HEAD') return response.end();
      const stream = fs.createReadStream(file,{start,end});
      stream.on('error', () => response.destroy());
      response.on('close', () => stream.destroy());
      stream.pipe(response);
    });
  }
  fs.readFile(file, (error, content) => {
    if (error) { response.writeHead(404); return response.end('Página não encontrada'); }
    response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control':'no-cache' });
    response.end(content);
  });
}).listen(port, '127.0.0.1', () => console.log(`Portfolio: http://localhost:${port}`));
