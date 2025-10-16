#!/usr/bin/env node
/**
 * Simple static file server for local development.
 * Keeps parity with the `npm run start` script expected by contributors,
 * so running `node server.js` (or `npm start`) will serve the project
 * from http://localhost:3000 by default.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const port = Number(process.env.PORT) || 3000;
const rootDir = path.resolve(__dirname);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.yml': 'text/yaml; charset=utf-8',
  '.yaml': 'text/yaml; charset=utf-8',
};

function getFilePath(requestUrl) {
  const { pathname } = url.parse(requestUrl);
  const decodedPath = decodeURIComponent(pathname || '/');
  const normalizedPath = path.normalize(decodedPath).replace(/^\/+/, '');

  // Block attempts to escape the project directory.
  if (normalizedPath.startsWith('..')) {
    return null;
  }

  let filePath = path.join(rootDir, normalizedPath);

  const relativePath = path.relative(rootDir, filePath);
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    return null;
  }

  // Directory handling: serve index.html for directory paths.
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  // Fall back to index.html for root requests.
  if (!normalizedPath || normalizedPath.endsWith('/')) {
    filePath = path.join(rootDir, normalizedPath || '', 'index.html');
  }

  return filePath;
}

const server = http.createServer((req, res) => {
  const filePath = getFilePath(req.url);

  if (!filePath) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    const stream = fs.createReadStream(filePath);
    stream.on('open', () => {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache',
      });
      stream.pipe(res);
    });

    stream.on('error', (streamErr) => {
      console.error('Error reading file', streamErr);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      }
      res.end('Internal Server Error');
    });
  });
});

server.listen(port, () => {
  console.log(`Duruji FC site running at http://localhost:${port}`);
});