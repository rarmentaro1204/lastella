/* Backend del gestionale La Stella: utenti, eventi, impostazioni su un archivio chiave/valore.
   `stores` espone getStore(name) compatibile con @netlify/blobs (nei test è sostituito da una mappa in memoria). */
import { newPortalToken, portalView, applyPortalEdit, kitchenEvent, kitchenSettings } from './portal.mjs';
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const ID_RE = /^[A-Za-z0-9_-]{3,64}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOKEN_DAYS = 30;
const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };
const out = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
const err = (status, message, extra = {}) => out({ error: message, ...extra }, status);

const b64 = b => Buffer.from(b).toString('base64url');
const sign = (secret, payload) => createHmac('sha256', secret).update(payload).digest('base64url');
function makeToken(secret, email) { const p = b64(JSON.stringify({ e: email, x: Date.now() + TOKEN_DAYS * 864e5 })); return p + '.' + sign(secret, p); }
function readToken(secret, token) {
  const [p, s] = String(token || '').split('.'); if (!p || !s) return null;
  const good = sign(secret, p); if (s.length !== good.length || !timingSafeEqual(Buffer.from(s), Buffer.from(good))) return null;
  try { const d = JSON.parse(Buffer.from(p, 'base64url').toString()); return d.x > Date.now() ? d.e : null; } catch { return null; }
}
function hashPw(password, salt = randomBytes(16).toString('hex')) { return { salt, hash: scryptSync(password, salt, 64).toString('hex') }; }
function checkPw(password, u) { const h = scryptSync(password, u.salt, 64); const b = Buffer.from(u.hash, 'hex'); return h.length === b.length && timingSafeEqual(h, b); }
const publicUser = u => ({ email: u.email, role: u.role, approved: !!u.approved, created: u.created });

export function createApi({ stores, secret, seed = null, now = () => new Date().toISOString() }) {
  const users = stores('users'), events = stores('events'), meta = stores('meta'), portal = stores('portal');
  const ROLES = ['admin', 'staff', 'cucina'], roleOf = (r, d = 'staff') => (ROLES.includes(r) ? r : d);

  /* indice {events:{id:{rev,at,by}}, settings:{rev,at,by}|null} con scrittura condizionale */
  async function updateIndex(mutator) {
    for (let i = 0; i < 8; i++) {
      const cur = await meta.getWithMetadata('index', { type: 'json' });
      const idx = cur ? cur.data : { events: {}, settings: null };
      mutator(idx);
      const r = cur ? await meta.setJSON('index', idx, { onlyIfMatch: cur.etag }) : await meta.setJSON('index', idx, { onlyIfNew: true });
      if (r.modified) return idx;
    }
    throw new Error('Indice occupato, riprova');
  }
  const getIndex = async () => (await meta.get('index', { type: 'json' })) || { events: {}, settings: null };

  /* al primo avvio (database vuoto, primo amministratore) crea i dati dimostrativi: eventi e location di esempio */
  async function seedDemo() {
    if (!seed || await meta.get('seeded', { type: 'json' })) return;
    const at = now(), idx = { events: {}, settings: { rev: 1, at, by: 'demo' } };
    for (let i = 0; i < seed.events.length; i += 10) {
      await Promise.all(seed.events.slice(i, i + 10).map(async ev => { await events.setJSON(ev.id, ev, { metadata: { rev: 1, by: 'demo', at }, onlyIfNew: true }); idx.events[ev.id] = { rev: 1, at, by: 'demo' }; }));
    }
    await meta.setJSON('settings', seed.settings, { metadata: { rev: 1, by: 'demo', at }, onlyIfNew: true });
    await meta.setJSON('index', idx, { onlyIfNew: true });
    await meta.setJSON('seeded', { at });
  }

  async function authUser(req) {
    const h = req.headers.get('authorization') || '';
    const email = readToken(secret, h.replace(/^Bearer\s+/i, '')); if (!email) return null;
    return (await users.get(email, { type: 'json' })) || null;
  }

  async function handle(req, path) {
    const method = req.method;
    const body = ['POST', 'PUT'].includes(method) ? await req.json().catch(() => ({})) : {};

    /* ---------- pubblici ---------- */
    if (path === 'signup' && method === 'POST') {
      const email = String(body.email || '').trim().toLowerCase(), password = String(body.password || '');
      if (!EMAIL_RE.test(email)) return err(400, 'Email non valida.');
      if (password.length < 8) return err(400, 'La password deve avere almeno 8 caratteri.');
      const first = (await users.list()).blobs.length === 0;
      const rec = { email, ...hashPw(password), role: first ? 'admin' : 'staff', approved: first, created: now() };
      const r = await users.setJSON(email, rec, { onlyIfNew: true });
      if (!r.modified) return err(409, 'Indirizzo già registrato: usa «Accedi».');
      if (first) await seedDemo();
      return out({ token: makeToken(secret, email), user: publicUser(rec), firstAdmin: first });
    }
    if (path === 'login' && method === 'POST') {
      const email = String(body.email || '').trim().toLowerCase();
      const u = await users.get(email, { type: 'json' });
      if (!u || !checkPw(String(body.password || ''), u)) return err(401, 'Email o password non corretti.');
      return out({ token: makeToken(secret, email), user: publicUser(u) });
    }

    let pm;
    if ((pm = path.match(/^portal\/([A-Za-z0-9_-]{20,80})$/)) && ['GET', 'PUT'].includes(method)) {
      const link = await portal.get(pm[1], { type: 'json' }); if (!link) return err(404, 'Link non valido o revocato.');
      const setts = async () => { const x = await meta.get('settings', { type: 'json' }); return x; };
      for (let i = 0; i < 5; i++) {
        const cur = await events.getWithMetadata(link.eventId, { type: 'json' }); if (!cur) return err(404, 'Evento non trovato.');
        if (cur.data.portale && cur.data.portale.token !== pm[1]) return err(404, 'Link non valido o revocato.');
        if (method === 'GET') return out({ event: portalView(cur.data, await setts()) });
        const E = cur.data, at = now(), res = applyPortalEdit(E, body, at);
        if (!res.changed.length) return out({ event: portalView(E, await setts()), denied: res.denied });
        const rev = cur.metadata.rev + 1, r = await events.setJSON(link.eventId, E, { metadata: { rev, by: 'cliente', at }, onlyIfMatch: cur.etag });
        if (!r.modified) continue;
        await updateIndex(x => { x.events[link.eventId] = { rev, at, by: 'cliente' }; });
        return out({ event: portalView(E, await setts()), denied: res.denied });
      }
      return err(409, 'Riprova tra un istante.');
    }

    /* ---------- autenticati ---------- */
    const me = await authUser(req); if (!me) return err(401, 'Sessione scaduta: accedi di nuovo.');
    if (path === 'me') return out({ user: publicUser(me) });
    if (path === 'password' && method === 'POST') {
      if (!checkPw(String(body.old || ''), me)) return err(403, 'La password attuale non è corretta.');
      if (String(body.next || '').length < 8) return err(400, 'La nuova password deve avere almeno 8 caratteri.');
      await users.setJSON(me.email, { ...me, ...hashPw(String(body.next)) }); return out({ ok: true });
    }
    if (!me.approved) return err(403, 'Account in attesa di approvazione.', { pending: true });
    const admin = me.role === 'admin', cucina = me.role === 'cucina';

    /* ---------- team ---------- */
    if (path === 'team' && method === 'GET') {
      const list = await Promise.all((await users.list()).blobs.map(b => users.get(b.key, { type: 'json' })));
      return out({ team: list.filter(Boolean).map(publicUser).sort((a, b) => a.created.localeCompare(b.created)) });
    }
    if (path.startsWith('team/')) {
      if (!admin) return err(403, 'Solo un amministratore può gestire il team.');
      const email = String(body.email || '').trim().toLowerCase(), act = path.slice(5);
      if (act === 'add') {
        if (!EMAIL_RE.test(email) || String(body.password || '').length < 8) return err(400, 'Servono un\'email valida e una password di almeno 8 caratteri.');
        const rec = { email, ...hashPw(String(body.password)), role: roleOf(body.role), approved: true, created: now() };
        const r = await users.setJSON(email, rec, { onlyIfNew: true }); if (!r.modified) return err(409, 'Indirizzo già presente.');
        return out({ user: publicUser(rec) });
      }
      const u = await users.get(email, { type: 'json' }); if (!u) return err(404, 'Utente non trovato.');
      if (act === 'approve') { await users.setJSON(email, { ...u, approved: true, role: roleOf(body.role, u.role) }); return out({ ok: true }); }
      if (act === 'role') {
        if (email === me.email) return err(400, 'Non puoi cambiare il tuo ruolo.');
        await users.setJSON(email, { ...u, role: roleOf(body.role) }); return out({ ok: true });
      }
      if (act === 'reset') { if (String(body.password || '').length < 8) return err(400, 'Password di almeno 8 caratteri.'); await users.setJSON(email, { ...u, ...hashPw(String(body.password)) }); return out({ ok: true }); }
      if (act === 'remove') { if (email === me.email) return err(400, 'Non puoi rimuovere te stesso.'); await users.delete(email); return out({ ok: true }); }
      return err(404, 'Operazione sconosciuta.');
    }

    if (path.startsWith('portal/') && method === 'POST') {
      if (cucina) return err(403, 'Non consentito.');
      const id = String(body.id || ''), act = path.slice(7), cur = ID_RE.test(id) ? await events.getWithMetadata(id, { type: 'json' }) : null;
      if (!cur) return err(404, 'Evento non trovato.');
      if (act !== 'create' && act !== 'revoke') return err(404, 'Operazione sconosciuta.');
      const E = cur.data; E.portale = E.portale || {};
      if (E.portale.token) await portal.delete(E.portale.token);
      if (act === 'create') { E.portale.token = newPortalToken(); E.portale.attivo = true; E.portale.creato = now(); await portal.setJSON(E.portale.token, { eventId: id }); }
      else { delete E.portale.token; E.portale.attivo = false; }
      const rev = cur.metadata.rev + 1, at = now();
      const r = await events.setJSON(id, E, { metadata: { rev, by: me.email, at }, onlyIfMatch: cur.etag });
      if (!r.modified) return err(409, 'Evento modificato nel frattempo, riprova.');
      await updateIndex(i => { i.events[id] = { rev, at, by: me.email }; });
      return out({ rev, token: E.portale.token || null });
    }

    /* ---------- dati ---------- */
    if (path === 'index' && method === 'GET') return out(await getIndex());
    if (path === 'state' && method === 'GET') {
      const idx = await getIndex();
      const rows = await Promise.all(Object.keys(idx.events).map(async id => { const e = await events.getWithMetadata(id, { type: 'json' }); return e && { id, rev: e.metadata.rev, data: e.data, by: e.metadata.by, at: e.metadata.at }; }));
      const st = await meta.getWithMetadata('settings', { type: 'json' });
      const list = rows.filter(Boolean).map(r => (cucina ? { ...r, data: kitchenEvent(r.data) } : r));
      return out({ events: list, settings: st ? { rev: st.metadata.rev, data: cucina ? kitchenSettings(st.data) : st.data, by: st.metadata.by } : null, index: idx });
    }
    let m;
    if ((m = path.match(/^event\/([^/]+)$/))) {
      const id = m[1]; if (!ID_RE.test(id)) return err(400, 'Identificativo non valido.');
      const cur = await events.getWithMetadata(id, { type: 'json' });
      if (cucina && method === 'PUT') {
        if (!cur || !body.data || typeof body.data.recipes !== 'object') return err(400, 'Dati non validi.');
        const E = cur.data; E.recipes = body.data.recipes;
        const rev = cur.metadata.rev + 1, at = now(), r = await events.setJSON(id, E, { metadata: { rev, by: me.email, at }, onlyIfMatch: cur.etag });
        if (!r.modified) { const c2 = await events.getWithMetadata(id, { type: 'json' }); return err(409, 'Conflitto', { current: c2 && { id, rev: c2.metadata.rev, data: kitchenEvent(c2.data), by: c2.metadata.by, at: c2.metadata.at } }); }
        await updateIndex(i => { i.events[id] = { rev, at, by: me.email }; });
        return out({ rev, at });
      }
      if (cucina && method !== 'GET') return err(403, 'Il profilo cucina è in sola lettura.');
      if (method === 'GET') return cur ? out({ id, rev: cur.metadata.rev, data: cucina ? kitchenEvent(cur.data) : cur.data, by: cur.metadata.by, at: cur.metadata.at }) : err(404, 'Evento non trovato.');
      if (method === 'DELETE') {
        if (!admin) return err(403, 'Solo un amministratore può eliminare gli eventi.');
        await events.delete(id); await updateIndex(i => { delete i.events[id]; }); return out({ ok: true });
      }
      if (method === 'PUT') {
        if (!body.data || typeof body.data !== 'object') return err(400, 'Dati mancanti.');
        const baseRev = Number(body.rev) || 0;
        if (cur && cur.metadata.rev !== baseRev) return err(409, 'Conflitto', { current: { id, rev: cur.metadata.rev, data: cur.data, by: cur.metadata.by, at: cur.metadata.at } });
        if (!cur && baseRev !== 0) return err(404, 'Evento eliminato', { deleted: true });
        const rev = (cur ? cur.metadata.rev : 0) + 1, at = now();
        const r = await events.setJSON(id, body.data, { metadata: { rev, by: me.email, at }, ...(cur ? { onlyIfMatch: cur.etag } : { onlyIfNew: true }) });
        if (!r.modified) { const c2 = await events.getWithMetadata(id, { type: 'json' }); return err(409, 'Conflitto', { current: c2 && { id, rev: c2.metadata.rev, data: c2.data, by: c2.metadata.by, at: c2.metadata.at } }); }
        await updateIndex(i => { i.events[id] = { rev, at, by: me.email }; });
        return out({ rev, at });
      }
    }
    if (path === 'settings') {
      const cur = await meta.getWithMetadata('settings', { type: 'json' });
      if (cucina && method !== 'GET') return err(403, 'Il profilo cucina è in sola lettura.');
      if (method === 'GET') return out(cur ? { rev: cur.metadata.rev, data: cucina ? kitchenSettings(cur.data) : cur.data } : { rev: 0, data: null });
      if (method === 'PUT') {
        const baseRev = Number(body.rev) || 0, curRev = cur ? cur.metadata.rev : 0;
        if (curRev !== baseRev) return err(409, 'Conflitto', { current: { rev: curRev, data: cur && cur.data } });
        const rev = curRev + 1, at = now();
        const r = await meta.setJSON('settings', body.data || {}, { metadata: { rev, by: me.email, at }, ...(cur ? { onlyIfMatch: cur.etag } : { onlyIfNew: true }) });
        if (!r.modified) { const c2 = await meta.getWithMetadata('settings', { type: 'json' }); return err(409, 'Conflitto', { current: { rev: c2.metadata.rev, data: c2.data } }); }
        await updateIndex(i => { i.settings = { rev, at, by: me.email }; });
        return out({ rev });
      }
    }
    return err(404, 'Risorsa non trovata.');
  }

  return async function api(req) {
    try {
      const path = new URL(req.url).pathname.replace(/^\/(\.netlify\/functions\/api|api)\/?/, '').replace(/\/$/, '');
      return await handle(req, path);
    } catch (e) { console.error('api error', e); return err(500, 'Errore del server.'); }
  };
}
