#!/usr/bin/env node
/* Server locale di prova: serve il sito e l'API (/api) con un archivio in memoria.
   node tools/dev-server.mjs [porta]   — i dati si perdono al riavvio. */
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApi } from '../netlify/lib/core.mjs';
import { readFileSync } from 'node:fs';
import { makeAssets } from '../netlify/lib/assets.mjs';

const root = join(fileURLToPath(import.meta.url), '..', '..');
const mem = {}; let n = 0;
const stores = name => { const m = (mem[name] ||= new Map()); return {
  async get(k) { const e = m.get(k); return e ? structuredClone(e.v) : null; },
  async getWithMetadata(k) { const e = m.get(k); return e ? { data: structuredClone(e.v), etag: e.etag, metadata: e.meta } : null; },
  async setJSON(k, v, o = {}) { const e = m.get(k); if (o.onlyIfNew && e) return { modified: false }; if (o.onlyIfMatch && (!e || e.etag !== o.onlyIfMatch)) return { modified: false }; const etag = 'e' + (++n); m.set(k, { v: structuredClone(v), etag, meta: o.metadata }); return { modified: true, etag }; },
  async delete(k) { m.delete(k); }, async list() { return { blobs: [...m.keys()].map(key => ({ key })) }; } }; };
const seed = JSON.parse(readFileSync(join(root, 'netlify/lib/demo-seed.json'), 'utf8'));
const api = createApi({ stores, secret: process.env.LASTELLA_SECRET || 'dev-secret', seed, assets: makeAssets([join(root, 'js')]) });
/* come in produzione: il codice del gestionale non è servito come file statico */
const BLOCKED = /^\/js\/(catalog|store|stdqty|app|sync|demo-seed|views-[a-z]+)\.js$/;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', '.json': 'application/json' };

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname.startsWith('/api')) {
      const chunks = []; for await (const c of req) chunks.push(c);
      const r = await api(new Request(url, { method: req.method, headers: req.headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks) }));
      res.writeHead(r.status, Object.fromEntries(r.headers)); return res.end(Buffer.from(await r.arrayBuffer()));
    }
    if (BLOCKED.test(url.pathname) || /^\/(netlify|tools|output|esempio)\//.test(url.pathname)) { res.writeHead(404); return res.end('404'); }
    let p = normalize(decodeURIComponent(url.pathname)); if (p.endsWith('/')) p += 'index.html';
    if (p.includes('..') || p.startsWith('/netlify') || p.startsWith('/.git')) { res.writeHead(404); return res.end(); }
    const buf = await readFile(join(root, p)); res.writeHead(200, { 'content-type': types[extname(p)] || 'application/octet-stream' }); res.end(buf);
  } catch { res.writeHead(404); res.end('Not found'); }
}).listen(+process.argv[2] || 8766, () => console.log('http://localhost:' + (+process.argv[2] || 8766)));
