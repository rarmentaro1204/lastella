/* =====================================================================
   Stato, persistenza (localStorage), import Excel, motore del preventivo
   ===================================================================== */
const KEY = 'lastella-crm-v1';

const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const eur = n => (Number(n) || 0).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
const num = n => (Number(n) || 0).toLocaleString('it-IT');

const clone = o => JSON.parse(JSON.stringify(o));
function defaultSettings() {
  const y = new Date().getFullYear();
  return {
    iva: 10, bambinoPrezzo: 80, neonatoPrezzo: 0, staffPrezzo: 0, supplementiSu: 'adulti',
    listini: clone(CAT.listiniSeed), locations: clone(CAT.locationsSeed), addons: seedAddons(),
    catalogs: { [y]: seedCatalog(), [y + 1]: seedCatalog() }, scadenziario: clone(CAT.scadenziarioSeed), prezzi: {},
  };
}
function hydrateSettings(s) {
  const o = Object.assign(defaultSettings(), s || {});
  if (s && s.listini && !s.locations) {            // migrazione: gli spazi A/B stavano nei listini
    o.locations = s.listini.filter(l => l.spazi).map(l => ({ id: l.id, nome: l.nome, listinoId: l.id, spazi: l.spazi }));
    if (!o.locations.length) o.locations = clone(CAT.locationsSeed);
  }
  o.listini = (o.listini || []).map(l => { const { spazi, ...rest } = l; return rest; });
  return o;
}

function newEvent() {
  return {
    id: uid(), creato: new Date().toISOString(), stato: 'Preventivo',
    q: {
      sposo1: '', tel: '', email: '', sposo2: '', tel2: '', email2: '', planner: '', plannerTel: '',
      tipo: 'Matrimonio', pasto: 'Cena', data: '', firma: '', location: '', locationNome: '', listino: '',
      adulti: 100, bambini: 0, neonati: 0, staff: 0, giorno: 'auto',
      rito: 'Civile', ritoNote: '', provenienza: '', budget: '', fornitori: '', accessibilita: '', note: '',
      scadenzaAllest: '', scadenzaMenu: '', validita: '', auto: { scadenzaAllest: true, scadenzaMenu: true, validita: true },
      spazi: [],
    },
    guests: [], tables: [],
    menu: {
      show: [], passaggio: [], cocktail: '', succo: '', esclusiva: '', extraBuvette: [], noteAperitivo: '',
      formula: '3a', pre: [], entree: [], primi: [], secondi: [], formaggi: false,
      bianco: '', rosso: '', extraVini: [], dessert: '', lounge: [], caffeAlt: '', noteMenu: '',
    },
    allest: {}, addons: {}, special: [], recipes: {}, econ: { rettifiche: [], note: '' }, pagamenti: [], pagAuto: true,
    consegne: {
      bussola: [], numeriOk: false, allergieOk: false, tavoliOk: false, disposizioneOk: false, seggiolini: '', attrezzatura: '', extratime: '', orientamento: '', sposiLato: 'Committente 1 a sinistra, committente 2 a destra',
      fornitori: ['Allestitore floreale', 'Musicista aperitivo', 'Fotografo', 'Pasticceria', 'Wedding planner', 'Musicista openbar', 'Intrattenimento bimbi', 'Altro'].map(r => ({ ruolo: r, nome: '', tel: '', email: '' })),
    },
  };
}

function hydrate(e) {
  const d = newEvent();
  const o = Object.assign(d, e, { q: Object.assign(d.q, e.q), menu: Object.assign(d.menu, e.menu), econ: Object.assign({ rettifiche: [], note: '' }, e.econ), consegne: Object.assign(d.consegne, e.consegne) });
  o.q.auto = Object.assign({ scadenzaAllest: true, scadenzaMenu: true, validita: true }, e.q && e.q.auto);
  return o;
}
let S = load();
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw);
      s.settings = hydrateSettings(s.settings);
      s.events = (s.events || []).map(hydrate);
      return s;
    }
  } catch (e) { console.warn('stato non leggibile', e); }
  return { settings: defaultSettings(), events: [] };
}
let saveTimer;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { console.warn('salvataggio non riuscito', e); }
    if (typeof cloudPush === 'function') cloudPush();
  }, 150);
}
const getEvent = id => S.events.find(e => e.id === id);

/* ---- path helpers: "menu.show" / "q.orari.cena" ---- */
function pget(obj, path) { return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj); }
function pset(obj, path, val) {
  const ks = path.split('.'); let o = obj;
  ks.slice(0, -1).forEach(k => { if (o[k] == null || typeof o[k] !== 'object') o[k] = {}; o = o[k]; });
  o[ks[ks.length - 1]] = val;
}

/* ---- invitati ---- */
const fullName = g => `${g.nome || ''} ${g.cognome || ''}`.trim();
const initials = g => ((g.nome || '?')[0] + ((g.cognome || '')[0] || '')).toUpperCase();
function newGuest(p = {}) { return Object.assign({ id: uid(), nome: '', cognome: '', fascia: 'Adulto', dieta: '', allergie: [], intolleranze: [], altro: '', note: '', seggiolone: false }, p); }
function guestFlags(g) { return { all: g.allergie.length || (g.altro ? 1 : 0), int: g.intolleranze.length, dieta: g.dieta ? 1 : 0 }; }
function hasSpecial(g) { return g.allergie.length || g.intolleranze.length || g.dieta || g.altro || g.note; }
function guestCounts(E) {
  const c = { tot: E.guests.length, Adulto: 0, Bambino: 0, Neonato: 0, Staff: 0, seggioloni: 0, allergie: 0, intolleranze: 0, diete: {}, byAll: {}, byInt: {} };
  E.guests.forEach(g => {
    c[g.fascia] = (c[g.fascia] || 0) + 1; if (g.seggiolone) c.seggioloni++;
    if (g.allergie.length || g.altro) c.allergie++;
    if (g.intolleranze.length) c.intolleranze++;
    if (g.dieta) c.diete[g.dieta] = (c.diete[g.dieta] || 0) + 1;
    g.allergie.forEach(k => c.byAll[k] = (c.byAll[k] || 0) + 1);
    g.intolleranze.forEach(k => c.byInt[k] = (c.byInt[k] || 0) + 1);
  });
  return c;
}
function seatOf(E, gid) {
  for (const t of E.tables) { const i = t.seats.indexOf(gid); if (i >= 0) return { t, i }; }
  return null;
}

/* ---- tavoli ---- */
function newTable(E, forma = 'tondo', posti = 10) {
  const num = (E.tables.reduce((m, t) => Math.max(m, t.num || 0), 0)) + 1;
  return { id: uid(), num, nome: '', forma, posti, seats: Array(posti).fill(null) };
}
function resizeTable(t, posti) {
  posti = Math.max(1, Math.min(24, parseInt(posti) || 1));
  if (posti < t.seats.length) {
    const lost = t.seats.slice(posti).filter(Boolean);
    t.seats = t.seats.slice(0, posti);
    t.posti = posti; return lost;
  }
  while (t.seats.length < posti) t.seats.push(null);
  t.posti = posti; return [];
}

/* =====================================================================
   Import da Excel (SheetJS)
   ===================================================================== */
function parseWorkbook(wb) {
  const out = { guests: [], tables: [], warnings: [] };
  const sheetNames = wb.SheetNames;
  const findSheet = (re, idx) => wb.Sheets[sheetNames.find(n => re.test(norm(n))) || sheetNames[idx]];
  const shG = findSheet(/invitat/, 0), shT = findSheet(/tavol/, 1);
  const yes = v => { const s = norm(v); return s !== '' && !['no', '0', 'n', 'false'].includes(s); };

  if (!shG) { out.warnings.push('Foglio «Invitati» non trovato.'); return out; }
  const rows = XLSX.utils.sheet_to_json(shG, { header: 1, defval: '', raw: false });
  const head = (rows[0] || []).map(h => norm(h));
  const col = {}; const allCols = [], intCols = [];
  const allMap = Object.fromEntries(CAT.allergie.map(a => [norm(a.label), a.k]));
  const intMap = Object.fromEntries(CAT.intolleranze.map(a => [norm(a.label), a.k]));
  head.forEach((h, i) => {
    if (h === 'nome') col.nome = i;
    else if (h === 'cognome') col.cognome = i;
    else if (h === 'fascia') col.fascia = i;
    else if (h === 'dieta') col.dieta = i;
    else if (h.startsWith('seggiolon')) col.segg = i;
    else if (h.startsWith('allergia')) { const k = allMap[h.replace(/^allergia\s*/, '')]; if (k) allCols.push([i, k]); }
    else if (h.startsWith('intolleranza')) { const k = intMap[h.replace(/^intolleranza\s*/, '')]; if (k) intCols.push([i, k]); }
    else if (h.startsWith('altre allergie')) col.altro = i;
    else if (h.startsWith('note')) col.note = i;
  });
  if (col.nome == null && col.cognome == null) out.warnings.push('Intestazioni «Nome» / «Cognome» non trovate: controlla che sia il modello La Stella.');
  const dieteMap = Object.fromEntries(CAT.diete.map(d => [norm(d.k), d.k]));
  const byName = new Map();
  rows.slice(1).forEach((r, ri) => {
    const nome = String(r[col.nome] ?? '').trim(), cognome = String(r[col.cognome] ?? '').trim();
    if (!nome && !cognome) return;
    const f = norm(r[col.fascia]);
    const dietaRaw = norm(r[col.dieta]);
    const g = newGuest({
      nome, cognome,
      fascia: f.startsWith('b') ? 'Bambino' : f.startsWith('n') ? 'Neonato' : f.startsWith('s') ? 'Staff' : 'Adulto',
      seggiolone: col.segg != null && yes(r[col.segg]),
      dieta: dieteMap[dietaRaw] || '',
      allergie: allCols.filter(([i]) => yes(r[i])).map(([, k]) => k),
      intolleranze: intCols.filter(([i]) => yes(r[i])).map(([, k]) => k),
      altro: String(r[col.altro] ?? '').trim(), note: String(r[col.note] ?? '').trim(),
    });
    if (dietaRaw && !g.dieta) { g.note = (g.note ? g.note + ' · ' : '') + 'Dieta: ' + r[col.dieta]; out.warnings.push(`Riga ${ri + 2}: dieta «${r[col.dieta]}» non riconosciuta, copiata nelle note.`); }
    out.guests.push(g);
    const key = norm(fullName(g));
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key).push(g);
  });
  byName.forEach((arr, k) => { if (arr.length > 1) out.warnings.push(`Nome duplicato nell'elenco: «${fullName(arr[0])}» (${arr.length} volte). Nei tavoli verrà usato il primo non ancora assegnato.`); });

  if (shT) {
    const tr = XLSX.utils.sheet_to_json(shT, { header: 1, defval: '', raw: false });
    const th = (tr[0] || []).map(h => norm(h));
    const c = { num: th.findIndex(h => h.startsWith('n tavolo') || h === 'tavolo'), nome: th.findIndex(h => h.startsWith('nome tavolo')), forma: th.findIndex(h => h.startsWith('forma')), posti: th.findIndex(h => h.startsWith('n posti') || h === 'posti') };
    const seatCols = []; th.forEach((h, i) => { const m = h.match(/^posto (\d+)$/); if (m) seatCols.push([i, +m[1]]); });
    const used = new Set();
    tr.slice(1).forEach((r, ri) => {
      const seatsRaw = seatCols.map(([i, k]) => [k, String(r[i] ?? '').trim()]).filter(([, v]) => v);
      const forma = String(r[c.forma] ?? '').trim(), pRaw = parseInt(r[c.posti]);
      if (!seatsRaw.length && !forma && !pRaw) return;
      const maxSeat = seatsRaw.reduce((m, [k]) => Math.max(m, k), 0);
      const posti = Math.min(24, pRaw || maxSeat || 1);
      const t = { id: uid(), num: parseInt(r[c.num]) || ri + 1, nome: String(r[c.nome] ?? '').trim(), forma: /rett|imper/i.test(forma) ? 'rett' : 'tondo', posti, seats: Array(posti).fill(null) };
      if (!forma) out.warnings.push(`Tavolo ${t.num}: forma non indicata, impostato «Tondo».`);
      if (pRaw && maxSeat > pRaw) out.warnings.push(`Tavolo ${t.num}: ci sono invitati oltre il posto ${pRaw} indicato; posti portati a ${maxSeat}.`), t.posti = maxSeat, t.seats = Array(maxSeat).fill(null);
      seatsRaw.forEach(([k, name]) => {
        const cand = (byName.get(norm(name)) || []).find(g => !used.has(g.id));
        if (!cand) { out.warnings.push(`Tavolo ${t.num}, posto ${k}: «${name}» non trovato nell'elenco invitati (o già assegnato altrove).`); return; }
        used.add(cand.id); t.seats[k - 1] = cand.id;
      });
      if (t.forma === 'tondo' && t.posti > 12) out.warnings.push(`Tavolo ${t.num}: tondo con ${t.posti} posti (il massimo previsto è 12).`);
      out.tables.push(t);
    });
  } else out.warnings.push('Foglio «Tavoli» non trovato: importati solo gli invitati.');
  return out;
}

/* =====================================================================
   Date, scadenze e calendario
   ===================================================================== */
const CONFIRMED = ['Confermato', 'Definizione menù', 'Allestimenti', 'Pronto', 'Concluso'];
const isConfirmed = E => CONFIRMED.includes(E.stato);
const isoOf = d => { const z = new Date(d.getTime() - d.getTimezoneOffset() * 6e4); return z.toISOString().slice(0, 10); };
const addDaysISO = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return isoOf(d); };
function workdaysBefore(iso, n) { const d = new Date(iso + 'T12:00:00'); let c = 0; while (c < n) { d.setDate(d.getDate() - 1); if (d.getDay() % 6) c++; } return d; }
const daysFrom = d => Math.ceil((d - new Date()) / 864e5);
/* stato di una data rispetto agli altri eventi: busy = confermato, quote = solo preventivo */
function dateStatus(iso, exceptId) {
  const same = S.events.filter(e => e.id !== exceptId && e.q.data === iso && e.stato !== 'Annullato');
  const conf = same.find(isConfirmed); if (conf) return { st: 'busy', ev: conf };
  if (same.length) return { st: 'quote', ev: same[0], n: same.length };
  return null;
}
function bussolaDefaults(E) {
  const q = E.q, Y = +q.data.slice(0, 4);
  return [['Uscita del menù', 'Il menù arriva via mail con le linee guida, il link per la consulenza e il «file da inviare 15 giorni prima»', `${Y - 1}-11-30`],
    ['Appuntamento di consulenza', 'Video call di 1 ora: definizione del menù e scelta degli allestimenti', `${Y}-01-30`],
    ['Assaggio del menù', 'Degustazione con il titolare e il responsabile di sala; raccogliere allergie e intolleranze degli ospiti', `${Y}-03-31`],
    ['Controfirma del menù definitivo', 'Il menù aggiornato con scelte e personalizzazioni va confermato e controfirmato', `${Y}-04-15`],
    ['Invio del file compilato', 'Numero ospiti, allergie, tavoli e contatti fornitori: 15 giorni prima dell\'evento', addDaysISO(q.data, -15)],
    ['Briefing finale', 'Breve telefonata di riepilogo: rivedere la timeline dell\'evento', addDaysISO(q.data, -3)]];
}
/* ricalcola tutte le scadenze che dipendono dalla data dell'evento (se non modificate a mano) */
function autoDates(E) {
  const q = E.q; if (!q.data) return false;
  const before = JSON.stringify([q.scadenzaAllest, q.scadenzaMenu, q.validita, E.consegne.bussola]);
  const jan = `${q.data.slice(0, 4)}-01-31`, gap = (new Date(q.data) - new Date(jan)) / 864e5;
  if (q.auto.scadenzaAllest) q.scadenzaAllest = gap >= 120 ? jan : addDaysISO(q.data, -120);
  if (q.auto.scadenzaMenu) q.scadenzaMenu = isoOf(workdaysBefore(q.data, 60));
  if (q.auto.validita) q.validita = addDaysISO(E.creato.slice(0, 10), 18);
  const def = bussolaDefaults(E);
  if (!E.consegne.bussola.length) E.consegne.bussola = def.map(([t, d, due]) => ({ t, d, due, done: false, manual: false }));
  else E.consegne.bussola.forEach((b, i) => { if (!b.manual && !b.done && def[i]) b.due = def[i][2]; });
  return before !== JSON.stringify([q.scadenzaAllest, q.scadenzaMenu, q.validita, E.consegne.bussola]);
}
/* scadenziario pagamenti dal contratto (parametri in Impostazioni) */
function buildScadenziario(E, total) {
  let cum = 0; const sign = E.q.firma || E.creato.slice(0, 10);
  return S.settings.scadenziario.map(r => {
    const v = Number(r.valore) || 0; let amt = r.tipo === 'fisso' ? v : r.tipo === 'pct' ? total * v / 100 : total * v / 100 - cum;
    amt = Math.max(0, Math.round(amt * 100) / 100); cum += amt;
    let due = ''; const n = Number(r.n) || 0;
    if (r.quando === 'firma') due = addDaysISO(sign, n);
    else if (E.q.data && r.quando === 'giorniPrima') due = addDaysISO(E.q.data, -n);
    else if (E.q.data && r.quando === 'lavorativiPrima') due = isoOf(workdaysBefore(E.q.data, n));
    return { desc: r.desc, due, importo: amt, paid: false };
  });
}
function syncPagamenti(E) {
  if (!E.pagAuto) return false;
  const nw = buildScadenziario(E, computeQuote(E).imponibile);
  nw.forEach((x, i) => { const o = E.pagamenti[i]; if (o && o.paid) Object.assign(x, { paid: true }, ...['paidAt', 'paidAmt', 'paidMethod', 'paidNote'].filter(k => o[k] !== undefined).map(k => ({ [k]: o[k] }))); });
  if (JSON.stringify(nw) === JSON.stringify(E.pagamenti)) return false;
  E.pagamenti = nw; return true;
}

/* =====================================================================
   Cataloghi per anno, location, listini
   ===================================================================== */
function catalogByYear(y) {
  const cs = (S.settings.catalogs = S.settings.catalogs || {});
  if (!cs[y]) { const ys = Object.keys(cs).map(Number).filter(k => k <= y).sort((a, b) => b - a); cs[y] = ys.length ? clone(cs[ys[0]]) : seedCatalog(); }
  return cs[y];
}
const catalogYear = E => (E.q.data ? +E.q.data.slice(0, 4) : new Date().getFullYear());
const catalogFor = E => catalogByYear(catalogYear(E));
function recipeIndexOf(C) {
  const m = {}, put = r => { if (r) m[r.id] = r; };
  C.isole.forEach(i => i.items.forEach(put));
  [C.preEntree, C.entree, C.secondi, C.formaggi, C.dessert, C.lounge.dolci].forEach(a => (a || []).forEach(put));
  C.primi.forEach(g => g.items.forEach(put)); put(C.torta);
  return m;
}
const listinoOf = E => S.settings.listini.find(l => l.id === E.q.listino) || S.settings.listini[0];
const locationOf = E => S.settings.locations.find(l => l.id === E.q.location);
function applyLocation(E, id) {
  const L = S.settings.locations.find(l => l.id === id); E.q.location = id; if (!L) return;
  const old = Object.fromEntries((E.q.spazi || []).map(s => [s.momento, s.orario]));
  E.q.locationNome = L.nome; E.q.listino = L.listinoId; E.q.spazi = L.spazi.map(s => ({ momento: s.momento, a: s.a, b: s.b, orario: old[s.momento] || '' }));
}

/* =====================================================================
   Preventivo
   ===================================================================== */
function giornoOf(E) {
  if (E.q.giorno && E.q.giorno !== 'auto') return E.q.giorno;
  if (!E.q.data) return 'sabato';
  const d = new Date(E.q.data + 'T12:00:00').getDay();
  return d === 6 ? 'sabato' : 'feriale';
}
const priceOf = (key, def) => { const v = S.settings.prezzi[key]; return (v === undefined || v === '' || v === null) ? def : Number(v); };

function allestSelection(E, voce) { return E.allest[voce.id] || {}; }
function addonState(E, a) { return E.addons[a.id] || {}; }
function addonVariant(a, st) { return a.varianti ? (a.varianti.find(v => v.id === st.variante) || a.varianti[0]) : null; }
function addonQty(E, a, st) {
  if (st.qty !== undefined && st.qty !== '' && st.qty !== null) return Number(st.qty);
  if (a.perOra) return 1;
  if (a.minPers) return a.minPers;
  return E.q.adulti || 0;
}

function computeQuote(E) {
  const L = listinoOf(E), q = E.q, g = giornoOf(E), C = catalogFor(E);
  const ad = +q.adulti || 0, ch = +q.bambini || 0, ne = +q.neonati || 0, st = +q.staff || 0;
  const P = priceOf(`base:${L.id}:${g}`, L[g]);
  const cocktail = !!(E.addons.cocktail && E.addons.cocktail.on);
  const lines = [], warnings = [], infos = [];
  const add = (sec, label, qty, unit, tot, extra = {}) => lines.push(Object.assign({ sec, label, qty, unit, tot }, extra));

  // 1. proposta Diamante — regole del contratto (Allegato A)
  const min = L.minAdulti;
  if (ad >= min) {
    add('Proposta Diamante', `Proposta Diamante · primi ${min} ospiti adulti (${g === 'sabato' ? 'sabato' : 'da domenica a venerdì'})`, min, P, min * P);
    if (ad > min) {
      const disc = cocktail ? L.scontoOltre : 0;
      add('Proposta Diamante', `Ospiti adulti dal ${min + 1}° in poi${cocktail ? ` (sconto € ${disc} con Cocktail bar)` : ''}`, ad - min, P - disc, (ad - min) * (P - disc));
      if (!cocktail) infos.push(`Con il servizio Cocktail bar, dal ${min + 1}° ospite in poi si risparmiano € ${L.scontoOltre} a persona (${eur((ad - min) * L.scontoOltre)}).`);
    }
  } else {
    const eff = Math.max(ad, L.minGarantito), tot = min * P - (min - eff) * L.scontoMancante;
    add('Proposta Diamante', `Proposta Diamante · ${eff} ospiti adulti (${min} × ${eur(P)} meno € ${L.scontoMancante} per ogni ospite sotto i ${min})`, 1, tot, tot);
    if (ad < L.minGarantito) warnings.push(`Adulti (${ad}) sotto il minimo garantito di ${L.minGarantito}: il preventivo è calcolato su ${L.minGarantito}.`);
  }
  if (ch) { const cp = +S.settings.bambinoPrezzo || 0; add('Proposta Diamante', 'Bambini', ch, cp, ch * cp); if (!cp) warnings.push('Prezzo bambini non impostato (Impostazioni).'); }
  if (ne && S.settings.neonatoPrezzo) add('Proposta Diamante', 'Neonati', ne, +S.settings.neonatoPrezzo, ne * S.settings.neonatoPrezzo);
  if (st) { const sp = +S.settings.staffPrezzo || 0; add('Proposta Diamante', 'Pasto staff / fornitori', st, sp, st * sp); if (!sp) warnings.push('Costo del pasto staff non impostato (Impostazioni): lo staff è a € 0.'); }

  // 2. supplementi allestimenti
  const persSup = S.settings.supplementiSu === 'tutti' ? ad + ch : ad;
  C.allestimenti.forEach(gr => gr.voci.forEach(v => {
    if (!v.opts) return;
    const sel = allestSelection(E, v); const o = v.opts.find(x => x.id === sel.opt);
    if (!o) return;
    if (+o.sur) add('Allestimenti', `${v.nome}: ${o.nome} (supplemento a persona)`, persSup, +o.sur, persSup * o.sur);
    if (+o.fix) { add('Allestimenti', `${v.nome}: ${o.nome}`, 1, +o.fix, +o.fix); if (o.nota) warnings.push(`${v.nome}: ${o.nota}`); }
    if (o.quota) infos.push(`${v.nome}: «${o.nome}» è soggetto a quotazione dedicata.`);
  }));

  // 3. add-on
  S.settings.addons.forEach(a => {
    const sx = addonState(E, a); if (!sx.on || a.link) return;
    const v = addonVariant(a, sx);
    const label = a.nome + (v ? ` · ${v.nome.split(' · ')[0]}` : '');
    if (a.quota || (!a.prezzo && !v)) {
      const f = Number(sx.prezzo) || 0;
      add('Servizi aggiuntivi', label + ' (quotazione personalizzata)', 1, f, f);
      if (!f) warnings.push(`${a.nome}: importo da quotare (inseriscilo nella sezione Add-on).`);
      return;
    }
    const base = v ? Number(v.prezzo) : Number(a.prezzo);
    const unit = (sx.prezzo !== undefined && sx.prezzo !== '' && sx.prezzo !== null) ? Number(sx.prezzo) : base;
    const qty = addonQty(E, a, sx);
    add('Servizi aggiuntivi', label + (a.perOra ? ' (ore)' : ''), qty, unit, qty * unit);
  });
  // 4. richieste speciali
  E.special.forEach(s => {
    if (s.stato === 'Rifiutato') return;
    const tot = (Number(s.porzioni) || 0) * (Number(s.prezzoUnit) || 0) + (Number(s.forfait) || 0);
    add('Richieste speciali', `${s.tipo}: ${s.titolo || '(senza titolo)'}${s.stato === 'Da valutare' ? ' (da valutare)' : ''}`, Number(s.porzioni) || 1, Number(s.porzioni) ? (Number(s.prezzoUnit) || 0) : tot, tot);
    if (s.stato === 'Da valutare') warnings.push(`Richiesta speciale «${s.titolo || s.tipo}» ancora da valutare/quotare.`);
  });
  // 5. rettifiche
  (E.econ.rettifiche || []).forEach(r => { if (Number(r.importo)) add('Rettifiche', r.desc || 'Rettifica', 1, Number(r.importo), Number(r.importo)); });

  const imponibile = lines.reduce((s, l) => s + l.tot, 0);
  const iva = imponibile * (S.settings.iva / 100);
  return { lines, imponibile, iva, totale: imponibile + iva, warnings, infos, giorno: g, P, listino: L, coperti: ad + ch + ne + st };
}

/* tutto ciò che si discosta da listino e catalogo: segnalato come «customizzazione» */
function customizations(E) {
  const out = [], add = (sec, text) => out.push({ sec, text }), q = E.q, m = E.menu, C = catalogFor(E), reg = CAT.aperitivoRegole;
  const loc = locationOf(E), L = listinoOf(E), nl = id => (S.settings.listini.find(l => l.id === id) || {}).nome || id;
  if (!q.location) add('Location', 'Location fuori elenco: tariffa e spazi da definire a mano.');
  else if (!loc) add('Location', 'La location scelta non esiste più nelle impostazioni.');
  else {
    if (q.listino !== loc.listinoId) add('Location', `Listino diverso da quello della location: «${nl(loc.listinoId)}» → «${L.nome}».`);
    (q.spazi || []).forEach(s => {
      const o = loc.spazi.find(x => x.momento === s.momento);
      if (!o) return add('Spazi', `${s.momento}: aggiunto rispetto alla location.`);
      if ((o.a || '') !== (s.a || '')) add('Spazi', `${s.momento} · Piano A: «${o.a || '—'}» → «${s.a || '—'}».`);
      if ((o.b || '') !== (s.b || '')) add('Spazi', `${s.momento} · Piano B: «${o.b || '—'}» → «${s.b || '—'}».`);
    });
    loc.spazi.forEach(o => { if (!(q.spazi || []).some(s => s.momento === o.momento)) add('Spazi', `${o.momento}: tolto rispetto alla location.`); });
  }
  if (q.giorno && q.giorno !== 'auto') add('Tariffa', 'Tariffa del giorno forzata a mano (non segue la data).');
  if (m.show.length > reg.show) add('Menù · Aperitivo', `${m.show.length - reg.show} isola/e show-cooking oltre le ${reg.show} incluse: quotazione separata.`);
  if (m.passaggio.length > reg.passaggio) add('Menù · Aperitivo', `${m.passaggio.length - reg.passaggio} isola/e a passaggio oltre le ${reg.passaggio} incluse: quotazione separata.`);
  if (m.extraBuvette.length) add('Menù · Aperitivo', `Buvette personalizzata: ${m.extraBuvette.join(', ')} (quotazione separata).`);
  if (m.esclusiva) add('Menù · Aperitivo', `Ricetta in esclusiva: ${(recipeIndexOf(C)[m.esclusiva] || {}).name || m.esclusiva} (quotazione separata).`);
  if (m.extraVini.length) add('Menù · A tavola', `Etichette extra: ${m.extraVini.join(', ')} (quotazione separata).`);
  if (m.formaggi) add('Menù · A tavola', 'Degustazione di formaggi: verificare la quotazione.');
  E.special.forEach(s => { if (s.stato !== 'Rifiutato') add('Richieste speciali', `${s.sezione ? '[' + s.sezione + '] ' : ''}${s.tipo}: ${s.titolo || '(senza titolo)'} · ${s.stato}.`); });
  C.allestimenti.forEach(gr => gr.voci.forEach(v => {
    if (!v.opts) return; const sel = E.allest[v.id] || {}, o = v.opts.find(x => x.id === sel.opt); if (!o) return;
    if (o.testo && sel.testo) add('Allestimento', `${v.nome}: ${sel.testo}.`);
    if (o.quota) add('Allestimento', `${v.nome}: «${o.nome}» a quotazione dedicata.`);
    if (+o.fix) add('Allestimento', `${v.nome}: «${o.nome}» con costo fisso${o.nota ? ' (' + o.nota + ')' : ''}.`);
  }));
  S.settings.addons.forEach(a => {
    const sx = E.addons[a.id] || {}; if (!sx.on) return;
    if (a.quota) add('Add-on', `${a.nome}: a quotazione personalizzata.`);
    else if (sx.prezzo !== undefined && sx.prezzo !== '' && sx.prezzo !== null) add('Add-on', `${a.nome}: prezzo modificato a mano (${eur(sx.prezzo)}).`);
  });
  (E.econ.rettifiche || []).forEach(r => { if (Number(r.importo)) add('Rettifiche', `${r.desc || 'Rettifica'}: ${eur(r.importo)}.`); });
  return out;
}

/* =====================================================================
   Ricette: elenco di ciò che è stato scelto per l'evento
   ===================================================================== */
const gen = (id, name, ing, asm, desc) => ({ id, name, desc: desc || '', ing, semi: [], asm: asm || ['Preparazione e controllo quantità', 'Allestimento servizio'], tags: [] });

function selectedRecipes(E) {
  const C = catalogFor(E), IDX = recipeIndexOf(C), m = E.menu, out = []; const push = (sec, r) => r && out.push({ sec, r });
  const isole = [...m.show, ...m.passaggio].map(id => C.isole.find(i => i.id === id)).filter(Boolean);
  isole.forEach(is => is.items.forEach(r => push(`Aperitivo · ${is.nome}`, r)));
  if (m.esclusiva && IDX[m.esclusiva]) { const r = IDX[m.esclusiva]; push('Aperitivo · Singola ricetta in esclusiva', Object.assign({}, r, { id: 'ex-' + r.id, name: 'Esclusiva · ' + r.name })); }
  push('Aperitivo · Buvette', gen('bv-bollicina', 'Bollicina · ' + C.buvette.bollicina, [C.buvette.bollicina, 'Flûte'], ['Raffreddare', 'Servizio']));
  if (m.cocktail) push('Aperitivo · Buvette', gen('bv-cocktail', 'Cocktail d’aperitivo · ' + m.cocktail, ['Ingredienti: ' + m.cocktail, 'Ghiaccio', 'Garnish'], ['Mise en place bar', 'Preparazione al momento']));
  push('Aperitivo · Buvette', gen('bv-analc', 'Analcolici' + (m.succo ? ' · succo ' + m.succo.toLowerCase() : ''), [m.succo ? 'Succo di frutta ' + m.succo.toLowerCase() : 'Succo di frutta', ...(C.buvette.fissi || []), ], ['Raffreddare', 'Servizio']));
  m.extraBuvette.forEach(n => push('Aperitivo · Buvette', gen('bv-x-' + norm(n).replace(/ /g, '-'), 'Extra buvette · ' + n, [n], ['Acquisto e raffreddamento', 'Servizio'])));
  if ((+E.q.bambini || 0) > 0) C.menuBimbi.items.forEach(r => push('Menù bambini', Object.assign({ kid: true }, r)));
  const pick = (ids, sec) => ids.forEach(id => push(sec, IDX[id]));
  pick(m.pre, 'A tavola · Pre-entrée'); pick(m.entree, 'A tavola · Entrée'); pick(m.primi, 'A tavola · Primo piatto'); pick(m.secondi, 'A tavola · Secondo piatto');
  if (m.formaggi && C.formaggi[0]) push('A tavola · Degustazione formaggi', C.formaggi[0]);
  if (m.bianco || m.rosso || m.extraVini.length) push('Bevande a tavola', gen('bev-tavola', 'Vini e acqua a tavola', [m.bianco && 'Bianco: ' + m.bianco, m.rosso && 'Rosso: ' + m.rosso, ...m.extraVini.map(x => 'Extra: ' + x), 'Acqua naturale e frizzante'].filter(Boolean), ['Selezione e raffreddamento', 'Bicchieri e servizio']));
  if (m.dessert) { push('Dessert nuziale', IDX[m.dessert]); push('Dessert nuziale', C.torta); push('Dessert nuziale', gen('de-brindisi', 'Brindisi · ' + (C.brindisi || 'Spumante e Moscato'), ['Spumante Brut', 'Moscato d’Asti', 'Flûte'], ['Raffreddare', 'Servizio al taglio torta'])); }
  m.lounge.forEach(id => push('Lounge bar · Dolci e piccola pasticceria', IDX[id]));
  if (m.lounge.length || m.dessert) {
    push('Lounge bar · Servizi', gen('lo-caffe', 'Specialty coffee · degustazione 3 tipologie', ['Caffè (3 tipologie)' + (m.caffeAlt ? ' + ' + m.caffeAlt : '')], ['Macinatura e attrezzature', 'Servizio guidato']));
    push('Lounge bar · Servizi', gen('lo-amari', 'Amari di erbe, fiori e radici', ['Selezione amari di produzione artigianale'], ['Selezione e servizio']));
    push('Lounge bar · Servizi', gen('lo-vermouth', 'Vermouth corner', ['Vermouth bianco', 'Vermouth rosso'], ['Selezione e servizio']));
  }
  S.settings.addons.forEach(a => {
    const sx = addonState(E, a); if (!sx.on) return;
    const v = addonVariant(a, sx);
    const items = (v && v.items) || a.ricetta; if (!items) return;
    push('Add-on', gen('ad-' + a.id, a.nome + (v ? ' · ' + v.nome.split(' · ')[0] : ''), items.slice(), ['Preparazione', 'Allestimento corner / servizio']));
  });
  E.special.forEach(s => { if (['piatto', 'isola'].includes(s.kind) && s.stato !== 'Rifiutato') push('Richieste speciali', gen('sp-' + s.id, s.titolo || 'Richiesta speciale', [], ['Definire con lo chef'], s.descr)); });
  return out;
}

function recipeState(E, r) {
  let st = E.recipes[r.id];
  if (!st) {
    st = E.recipes[r.id] = { kid: !!r.kid, porz: null, ing: r.ing.map(n => ({ n, q: '', u: 'g', ok: false })), semi: r.semi.map(n => ({ n, ok: false })), asm: r.asm.map(n => ({ n, ok: false })), note: '' };
  }
  return st;
}
const portionsOf = (E, st) => (st && st.porz != null && st.porz !== '') ? Number(st.porz) : (st && st.kid ? (+E.q.bambini || 0) : ((+E.q.adulti || 0) + (+E.q.bambini || 0)));
function recipeProgress(st) {
  const f = a => [a.filter(x => x.ok).length, a.length];
  return { ing: f(st.ing), semi: f(st.semi), asm: f(st.asm) };
}
function recipeDone(st) { const p = recipeProgress(st); const d = p.ing[0] + p.semi[0] + p.asm[0], t = p.ing[1] + p.semi[1] + p.asm[1]; return { d, t, pct: t ? Math.round(d / t * 100) : 0 }; }
