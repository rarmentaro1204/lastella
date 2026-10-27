/* Portale cliente e vista cucina: validazione e filtri dei dati (nessun accesso allo storage qui). */
import { randomBytes } from 'node:crypto';

const ID_OK = /^[A-Za-z0-9_-]{1,40}$/;
const str = (v, max = 300) => (typeof v === 'string' ? v.slice(0, max) : '');
const strArr = (v, n = 60, max = 120) => (Array.isArray(v) ? v.filter(x => typeof x === 'string').slice(0, n).map(x => x.slice(0, max)) : []);
const isoToday = () => new Date().toISOString().slice(0, 10);
export const newPortalToken = () => randomBytes(24).toString('base64url');
export const addDays = (iso, n) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

const KIND = { piatto: 'Piatto personalizzato', isola: 'Isola personalizzata', dieta: 'Variante dietetica / allergeni', altro: 'Altro' };
const FASCE = ['Adulto', 'Bambino', 'Neonato', 'Staff'];

/* blocchi: dopo le scadenze il cliente non può più modificare quella parte */
export function portalLocks(E) {
  const q = E.q || {}, today = isoToday(), closed = ['Annullato', 'Concluso'].includes(E.stato) || !!(E.portale && (E.portale.attivo === false || E.portale.confermatoAt)) || (!!q.data && today > q.data);
  const past = d => !!d && today > d;
  return { all: closed, menu: closed || past(q.scadenzaMenu), allest: closed || past(q.scadenzaAllest), guests: closed || (q.data ? past(addDays(q.data, -10)) : false) };
}

/* vista del portale: solo ciò che serve al cliente, senza prezzi interni, contatti o note dello staff */
const slim = r => ({ id: r.id, name: r.name, desc: r.desc || '', tags: r.tags || [] });
export function portalCatalog(settings, year) {
  const cs = (settings && settings.catalogs) || {}, ys = Object.keys(cs).map(Number).filter(y => y <= year).sort((a, b) => b - a);
  const C = cs[year] || cs[ys[0]] || cs[Object.keys(cs)[0]]; if (!C) return null;
  const arr = a => (a || []).map(slim);
  return {
    year, isole: (C.isole || []).map(i => ({ id: i.id, nome: i.nome, sub: i.sub || '', tipo: i.tipo, items: arr(i.items) })),
    preEntree: arr(C.preEntree), entree: arr(C.entree), primi: (C.primi || []).map(g => ({ gruppo: g.gruppo, items: arr(g.items) })), secondi: arr(C.secondi),
    formaggi: arr(C.formaggi), dessert: arr(C.dessert), torta: C.torta ? slim(C.torta) : null, lounge: arr(C.lounge && C.lounge.dolci),
    buvette: { cocktail: (C.buvette && C.buvette.cocktail) || [], succhi: (C.buvette && C.buvette.succhi) || [] },
    vini: { bianchi: (C.vini && C.vini.bianchi) || [], rossi: (C.vini && C.vini.rossi) || [] },
    allestimenti: (C.allestimenti || []).map(g => ({ gruppo: g.gruppo, voci: (g.voci || []).map(v => ({ id: v.id, nome: v.nome, fisso: !!v.fisso, info: v.info || '', color: !!v.color, opts: (v.opts || []).map(o => ({ id: o.id, nome: o.nome, sur: o.sur || 0, fix: o.fix || 0, quota: !!o.quota, hex: o.hex || '', nota: o.nota || '', testo: !!o.testo })) })) })),
  };
}
/* dati per il riepilogo economico: il preventivo lo ricalcola la pagina con lo stesso motore del gestionale */
function portalPricing(E, settings, year) {
  const st = settings || {}, q = E.q || {}, pick = (o, ks) => Object.fromEntries(ks.filter(k => o && k in o).map(k => [k, o[k]]));
  const cat = portalCatalog(settings, year);
  return {
    settings: { ...pick(st, ['iva', 'bambinoPrezzo', 'neonatoPrezzo', 'staffPrezzo', 'supplementiSu', 'listini', 'addons', 'prezzi', 'scadenziario']), catalogs: cat ? { [year]: { allestimenti: cat.allestimenti } } : {} },
    event: { q: pick(q, ['adulti', 'bambini', 'neonati', 'staff', 'giorno', 'data', 'listino', 'firma']), addons: E.addons || {}, econ: { rettifiche: ((E.econ || {}).rettifiche || []).map(r => ({ desc: r.desc, importo: r.importo })) },
      special: (E.special || []).map(s => pick(s, ['tipo', 'titolo', 'stato', 'porzioni', 'prezzoUnit', 'forfait'])), pagAuto: E.pagAuto !== false, pagamenti: (E.pagamenti || []).map(p => pick(p, ['desc', 'due', 'importo', 'paid', 'saldo'])) },
  };
}
export function portalView(E, settings) {
  const q = E.q || {}, pick = (o, ks) => Object.fromEntries(ks.filter(k => k in o).map(k => [k, o[k]]));
  return {
    id: E.id,
    q: pick(q, ['sposo1', 'sposo2', 'data', 'locationNome', 'tipo', 'pasto', 'rito', 'adulti', 'bambini', 'neonati', 'staff', 'scadenzaMenu', 'scadenzaAllest']),
    menu: E.menu || {}, allest: E.allest || {}, guests: E.guests || [], tables: E.tables || [],
    special: (E.special || []).filter(s => s.da === 'cliente').map(s => ({ id: s.id, kind: s.kind, titolo: s.titolo, descr: s.descr, sezione: s.sezione, stato: s.stato })),
    pricing: portalPricing(E, settings, E.q && E.q.data ? +E.q.data.slice(0, 4) : new Date().getFullYear()),
    catalog: portalCatalog(settings, E.q && E.q.data ? +E.q.data.slice(0, 4) : new Date().getFullYear()),
    nota: (E.portale && E.portale.nota) || '', confermatoAt: (E.portale && E.portale.confermatoAt) || '', locks: portalLocks(E),
  };
}

function cleanMenu(m, cur) {
  if (!m || typeof m !== 'object') return cur;
  const o = { ...cur };
  for (const k of ['show', 'passaggio', 'extraBuvette', 'pre', 'entree', 'primi', 'secondi', 'extraVini', 'lounge']) if (k in m) o[k] = strArr(m[k], 24, 60);
  for (const k of ['cocktail', 'succo', 'esclusiva', 'bianco', 'rosso', 'dessert', 'caffeAlt', 'formula']) if (k in m) o[k] = str(m[k], 160);
  if ('formaggi' in m) o.formaggi = !!m.formaggi;
  for (const k of ['noteAperitivo', 'noteMenu']) if (k in m) o[k] = str(m[k], 1000);
  return o;
}
function cleanAllest(a, cur = {}) {
  if (!a || typeof a !== 'object') return cur;
  const o = {};
  for (const [k, v] of Object.entries(a).slice(0, 80)) {
    if (!ID_OK.test(k) || !v || typeof v !== 'object') continue;
    const opt = str(v.opt, 40), prev = cur[k] || {};
    o[k] = { opt, testo: str(v.testo, 120), note: str(v.note, 300), ok: !!(prev.ok && prev.opt === opt) };   // la conferma resta dello staff
  }
  return o;
}
function cleanGuests(arr, cur = []) {
  if (!Array.isArray(arr)) return cur;
  const seen = new Set();
  return arr.slice(0, 400).map(g => {
    if (!g || typeof g !== 'object') return null;
    let id = ID_OK.test(g.id || '') ? g.id : randomBytes(6).toString('base64url'); while (seen.has(id)) id = randomBytes(6).toString('base64url'); seen.add(id);
    return { id, nome: str(g.nome, 60), cognome: str(g.cognome, 60), fascia: FASCE.includes(g.fascia) ? g.fascia : 'Adulto', dieta: str(g.dieta, 30), allergie: strArr(g.allergie, 20, 30), intolleranze: strArr(g.intolleranze, 20, 30), altro: str(g.altro, 120), note: str(g.note, 200), seggiolone: !!g.seggiolone };
  }).filter(g => g && (g.nome || g.cognome));
}
/* il cliente non cambia i tavoli (numero, forma, posti, posizione): può solo scegliere chi siede dove */
function seatTables(cur, arr, guests) {
  const ids = new Set(guests.map(g => g.id)), used = new Set(), byId = Object.fromEntries((Array.isArray(arr) ? arr : []).filter(t => t && typeof t === 'object').map(t => [t.id, t]));
  return cur.map(t => {
    const c = byId[t.id], src = c && Array.isArray(c.seats) && c.seats.length === t.seats.length ? c.seats : t.seats;
    return { ...t, seats: src.map(x => (typeof x === 'string' && ids.has(x) && !used.has(x) ? (used.add(x), x) : null)) };
  });
}
function cleanSpecial(arr, cur = []) {
  const mine = Array.isArray(arr) ? arr.slice(0, 20) : [];
  const keep = cur.filter(s => s.da !== 'cliente'), prev = Object.fromEntries(cur.filter(s => s.da === 'cliente').map(s => [s.id, s]));
  const add = mine.filter(s => s && typeof s === 'object').map(s => {
    const id = ID_OK.test(s.id || '') ? s.id : randomBytes(5).toString('base64url'), kind = KIND[s.kind] ? s.kind : 'altro', p = prev[id];
    return { id, kind, tipo: KIND[kind], titolo: str(s.titolo, 120), descr: str(s.descr, 800), porzioni: p ? p.porzioni : '', prezzoUnit: p ? p.prezzoUnit : '', forfait: p ? p.forfait : '', stato: p ? p.stato : 'Da valutare', sezione: str(s.sezione, 30), da: 'cliente' };
  }).filter(s => s.titolo);
  return [...keep, ...add];
}

/* applica le modifiche del cliente all'evento (solo parti consentite e non bloccate); restituisce le sezioni cambiate */
export function applyPortalEdit(E, body, now) {
  const locks = portalLocks(E), changed = [], before = k => JSON.stringify(E[k]);
  const set = (k, v, label) => { const b = before(k); E[k] = v; if (JSON.stringify(E[k]) !== b) changed.push(label); };
  const denied = [];
  if (body.menu !== undefined) { if (locks.menu) denied.push('menù'); else set('menu', cleanMenu(body.menu, E.menu || {}), 'menù'); }
  if (body.allest !== undefined) { if (locks.allest) denied.push('allestimenti'); else set('allest', cleanAllest(body.allest, E.allest || {}), 'allestimenti'); }
  if (body.guests !== undefined || body.tables !== undefined) {
    if (locks.guests) denied.push('invitati e tavoli');
    else { const g = cleanGuests(body.guests, E.guests || []); set('guests', g, 'invitati'); set('tables', seatTables(E.tables || [], body.tables, g), 'disposizione ai tavoli'); }
  }
  if (body.special !== undefined) { if (locks.all) denied.push('richieste'); else set('special', cleanSpecial(body.special, E.special || []), 'richieste speciali'); }
  E.portale = E.portale || {};
  if (typeof body.nota === 'string' && !locks.all && body.nota.slice(0, 1500) !== (E.portale.nota || '')) { E.portale.nota = body.nota.slice(0, 1500); changed.push('note'); }
  if (body.conferma && !locks.all) { E.portale.confermatoAt = now; changed.push('conferma finale'); }
  if (changed.length) {
    E.portale.ultimaModifica = now;
    E.portale.log = [{ at: now, txt: (body.conferma ? 'Il cliente ha confermato le proprie scelte' : 'Il cliente ha aggiornato: ' + [...new Set(changed)].join(', ')) }, ...(E.portale.log || [])].slice(0, 40);
  }
  return { changed, denied };
}

/* vista cucina: niente contatti, budget, economia, pagamenti, portale */
export function kitchenEvent(E) {
  const c = JSON.parse(JSON.stringify(E)), q = c.q || {};
  for (const k of ['tel', 'email', 'tel2', 'email2', 'plannerTel', 'budget', 'provenienza']) delete q[k];
  delete c.econ; delete c.pagamenti; delete c.portale; delete c.consegne;
  c.special = (c.special || []).map(s => ({ ...s, prezzoUnit: '', forfait: '' }));
  c.addons = Object.fromEntries(Object.entries(c.addons || {}).map(([k, v]) => [k, { ...v, prezzo: undefined }]));
  return c;
}
export const kitchenSettings = data => (data ? { catalogs: data.catalogs || {}, addons: (data.addons || []).map(a => ({ id: a.id, nome: a.nome, cat: a.cat, desc: a.desc, ricetta: a.ricetta, varianti: (a.varianti || []).map(v => ({ id: v.id, nome: v.nome, items: v.items })) })) } : null);
