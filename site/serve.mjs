import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), 'public/landing-pages');
const port = Number(process.env.PORT || 4173);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.webm': 'video/webm',
  '.mp4': 'video/mp4',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
};

createServer(async (request, response) => {
  try {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405, { Allow: 'GET, HEAD' }).end();
      return;
    }
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const path = resolve(root, pathname === '/' ? 'kage.html' : `.${pathname}`);
    if (!path.startsWith(root + sep)) {
      response.writeHead(403).end('Forbidden');
      return;
    }
    if (!(await stat(path)).isFile()) {
      response.writeHead(404).end('Not found');
      return;
    }
    const content = await readFile(path);
    const headers = {
      'Content-Type': types[extname(path)] || 'application/octet-stream',
      'Content-Length': content.length,
      'X-Content-Type-Options': 'nosniff',
    };
    if (extname(path) === '.webm' || extname(path) === '.mp4') {
      headers['Accept-Ranges'] = 'bytes';
      if (request.headers.range) {
        const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.range);
        const suffix = range && range[1] === '';
        const start = suffix ? Math.max(0, content.length - Number(range[2])) : Number(range?.[1]);
        const end = suffix || range?.[2] === '' ? content.length - 1 : Math.min(Number(range?.[2]), content.length - 1);
        if (!range || (!range[1] && !range[2]) || start > end || start >= content.length || !Number.isSafeInteger(start) || !Number.isSafeInteger(end)) {
          response.writeHead(416, { 'Content-Range': `bytes */${content.length}` }).end();
          return;
        }
        response.writeHead(206, {
          ...headers,
          'Content-Length': end - start + 1,
          'Content-Range': `bytes ${start}-${end}/${content.length}`,
        });
        response.end(request.method === 'HEAD' ? undefined : content.subarray(start, end + 1));
        return;
      }
    }
    response.writeHead(200, headers);
    response.end(request.method === 'HEAD' ? undefined : content);
  } catch (error) {
    const status = error instanceof URIError ? 400 : error.code === 'ENOENT' ? 404 : 500;
    response.writeHead(status).end(status === 400 ? 'Bad request' : status === 404 ? 'Not found' : 'Server error');
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`Kage preview: http://127.0.0.1:${port}`);
});
