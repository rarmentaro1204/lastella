/* Lettura dei file del gestionale che NON sono serviti pubblicamente (js/*.js dell'app): restano sul server
   e arrivano solo agli utenti autenticati (/api/bundle) o servono al calcolo del preventivo per il portale. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export function makeAssets(extraRoots = []) {
  const roots = [...extraRoots, join(process.cwd(), 'js'), join(process.env.LAMBDA_TASK_ROOT || '/var/task', 'js'), fileURLToPath(new URL('../../js/', import.meta.url))];
  const cache = new Map();
  return {
    read(name) {
      if (!/^[a-z0-9-]+\.js$/.test(name)) return null;
      if (cache.has(name)) return cache.get(name);
      for (const r of roots) { try { const t = readFileSync(join(r, name), 'utf8'); cache.set(name, t); return t; } catch {} }
      return null;
    },
  };
}
