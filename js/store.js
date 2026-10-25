/* =====================================================================
   Stato, persistenza (localStorage), import Excel, motore del preventivo
   ===================================================================== */
const KEY = 'lastella-crm-v1';

const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const eur = n => (Number(n) || 0).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
const num = n => (Number(n) || 0).toLocaleString('it-IT');

function defaultSettings() {
  return { iva: 10, bambinoPrezzo: 0, neonatoPrezzo: 0, supplementiSu: 'adulti', listini: JSON.parse(JSON.stringify(CAT.listiniDefault)), prezzi: {} };
}

function newEvent() {
  const L = CAT.listiniDefault[0];
  return {
    id: uid(), creato: new Date().toISOString(), stato: 'Preventivo',
    q: {
      sposo1: '', sposo2: '', tel: '', email: '', planner: '', plannerTel: '',
      tipo: 'Matrimonio', pasto: 'Cena', data: '', listino: L.id, locationNome: 'La Castella',
      adulti: 100, bambini: 0, neonati: 0, giorno: 'auto',
      rito: 'Civile', ritoNote: '', provenienza: '', budget: '', fornitori: '', accessibilita: '', note: '',
      scadenzaAllest: '', scadenzaMenu: '', validita: '',
      orari: { cerimonia: '', aperitivo: '', cena: '', torta: '', lounge: '', cocktail: '' },
      spazi: L.spazi.map(s => ({ ...s, orario: '' })),
    },
    guests: [], tables: [],
    menu: {
      show: [], passaggio: [], cocktail: '', succo: '', esclusiva: '', extraBuvette: [], noteAperitivo: '',
      formula: '3a', pre: [], entree: [], primi: [], secondi: [], formaggi: false,
      bianco: '', rosso: '', extraVini: [], dessert: '', lounge: [], caffeAlt: '', noteMenu: '',
    },
    allest: {}, addons: {}, special: [], recipes: {}, econ: { rettifiche: [], note: '' },
  };
}

let S = load();
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw);
      s.settings = Object.assign(defaultSettings(), s.settings || {});
      s.events = (s.events || []).map(e => Object.assign(newEvent(), e, {
        q: Object.assign(newEvent().q, e.q), menu: Object.assign(newEvent().menu, e.menu), econ: Object.assign({ rettifiche: [], note: '' }, e.econ),
      }));
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
function newGuest(p = {}) { return Object.assign({ id: uid(), nome: '', cognome: '', fascia: 'Adulto', dieta: '', allergie: [], intolleranze: [], altro: '', note: '' }, p); }
function guestFlags(g) { return { all: g.allergie.length || (g.altro ? 1 : 0), int: g.intolleranze.length, dieta: g.dieta ? 1 : 0 }; }
function hasSpecial(g) { return g.allergie.length || g.intolleranze.length || g.dieta || g.altro || g.note; }
function guestCounts(E) {
  const c = { tot: E.guests.length, Adulto: 0, Bambino: 0, Neonato: 0, allergie: 0, intolleranze: 0, diete: {}, byAll: {}, byInt: {} };
  E.guests.forEach(g => {
    c[g.fascia] = (c[g.fascia] || 0) + 1;
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
      fascia: f.startsWith('b') ? 'Bambino' : f.startsWith('n') ? 'Neonato' : 'Adulto',
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
      if (t.forma === 'tondo' && t.posti > 11) out.warnings.push(`Tavolo ${t.num}: tondo con ${t.posti} posti (il massimo previsto è 11).`);
      out.tables.push(t);
    });
  } else out.warnings.push('Foglio «Tavoli» non trovato: importati solo gli invitati.');
  return out;
}

/* =====================================================================
   Preventivo
   ===================================================================== */
const listinoOf = E => S.settings.listini.find(l => l.id === E.q.listino) || S.settings.listini[0];
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
  if (a.minPers) return a.minPers;
  return E.q.adulti || 0;
}

function computeQuote(E) {
  const L = listinoOf(E), q = E.q, g = giornoOf(E);
  const ad = +q.adulti || 0, ch = +q.bambini || 0, ne = +q.neonati || 0;
  const P = priceOf(`base:${L.id}:${g}`, L[g]);
  const cocktail = !!(E.addons.cocktail && E.addons.cocktail.on);
  const lines = [], warnings = [], infos = [];
  const add = (sec, label, qty, unit, tot, extra = {}) => lines.push(Object.assign({ sec, label, qty, unit, tot }, extra));

  // 1. proposta Diamante
  const min = L.minAdulti;
  if (ad >= min) {
    add('Proposta Diamante', `Proposta Diamante · primi ${min} ospiti adulti (${g === 'sabato' ? 'sabato' : 'da domenica a venerdì'})`, min, P, min * P);
    if (ad > min) {
      const disc = cocktail ? L.scontoOltre : 0;
      add('Proposta Diamante', `Ospiti adulti dal ${min + 1}° in poi${cocktail ? ` (sconto € ${disc} con Cocktail bar)` : ''}`, ad - min, P - disc, (ad - min) * (P - disc));
      if (!cocktail) infos.push(`Con il servizio Cocktail bar, dal ${min + 1}° ospite in poi si risparmiano € ${L.scontoOltre} a persona (${eur((ad - min) * L.scontoOltre)}).`);
    }
  } else {
    const eff = Math.max(ad, L.minGarantito);
    add('Proposta Diamante', `Proposta Diamante · ${eff} ospiti adulti (${min} × ${eur(P)} meno € ${L.scontoMancante} per ogni ospite sotto i ${min})`, 1, min * P - (min - eff) * L.scontoMancante, min * P - (min - eff) * L.scontoMancante);
    if (ad < L.minGarantito) warnings.push(`Adulti (${ad}) sotto il minimo garantito di ${L.minGarantito}: il preventivo è calcolato su ${L.minGarantito}.`);
  }
  if (ch) {
    const cp = +S.settings.bambinoPrezzo || 0;
    add('Proposta Diamante', 'Bambini', ch, cp, ch * cp);
    if (!cp) warnings.push('Prezzo bambini non impostato (Impostazioni): al momento i bambini sono a € 0.');
  }
  if (ne && S.settings.neonatoPrezzo) add('Proposta Diamante', 'Neonati', ne, +S.settings.neonatoPrezzo, ne * S.settings.neonatoPrezzo);

  // 2. supplementi allestimenti
  const persSup = S.settings.supplementiSu === 'tutti' ? ad + ch : ad;
  CAT.allestimenti.forEach(gr => gr.voci.forEach(v => {
    if (!v.opts) return;
    const sel = allestSelection(E, v); const o = v.opts.find(x => x.id === sel.opt);
    if (!o) return;
    const sur = priceOf(`sur:${v.id}:${o.id}`, o.sur);
    if (sur) add('Allestimenti', `${v.nome}: ${o.nome} (supplemento a persona)`, persSup, sur, persSup * sur);
    if (o.fix) { const f = priceOf(`fix:${v.id}:${o.id}`, o.fix); add('Allestimenti', `${v.nome}: ${o.nome}`, 1, f, f); warnings.push('Tavolo in legno per il taglio torta: da aggiungere il trasporto in base alla location.'); }
    if (o.quota) infos.push(`${v.nome}: «${o.nome}» è soggetto a quotazione dedicata.`);
  }));

  // 3. add-on
  CAT.addons.forEach(a => {
    const st = addonState(E, a); if (!st.on || a.link) return;
    const v = addonVariant(a, st);
    const label = a.nome + (v ? ` · ${v.nome.split(' · ')[0]}` : '');
    if (a.quota || (!a.prezzo && !v)) {
      const f = Number(st.prezzo) || 0;
      add('Servizi aggiuntivi', label + ' (quotazione personalizzata)', 1, f, f);
      if (!f) warnings.push(`${a.nome}: importo da quotare (inseriscilo nella sezione Add-on).`);
      return;
    }
    const base = v ? priceOf(`add:${a.id}:${v.id}`, v.prezzo) : priceOf(`add:${a.id}`, a.prezzo);
    const unit = (st.prezzo !== undefined && st.prezzo !== '' && st.prezzo !== null) ? Number(st.prezzo) : base;
    const qty = addonQty(E, a, st);
    add('Servizi aggiuntivi', label, qty, unit, qty * unit);
  });
  // imperiale mostrato come add-on ma contato in allestimenti
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
  return { lines, imponibile, iva, totale: imponibile + iva, warnings, infos, giorno: g, P, listino: L, coperti: ad + ch + ne };
}

/* =====================================================================
   Ricette: elenco di ciò che è stato scelto per l'evento
   ===================================================================== */
const RECIPE_INDEX = {};
(function indexRecipes() {
  const put = (r, sec) => { RECIPE_INDEX[r.id] = r; };
  CAT.isole.forEach(i => i.items.forEach(r => put(r)));
  [CAT.preEntree, CAT.entree, CAT.secondi, CAT.formaggi, CAT.dessert, CAT.lounge.dolci].forEach(a => a.forEach(r => put(r)));
  CAT.primi.forEach(g => g.items.forEach(r => put(r)));
})();

const gen = (id, name, ing, asm, desc) => ({ id, name, desc: desc || '', ing, semi: [], asm: asm || ['Preparazione e controllo quantità', 'Allestimento servizio'], tags: [] });

function selectedRecipes(E) {
  const m = E.menu, out = []; const push = (sec, r) => r && out.push({ sec, r });
  const isole = [...m.show, ...m.passaggio].map(id => CAT.isole.find(i => i.id === id)).filter(Boolean);
  isole.forEach(is => is.items.forEach(r => push(`Aperitivo · ${is.nome}`, r)));
  if (m.esclusiva && RECIPE_INDEX[m.esclusiva]) { const r = RECIPE_INDEX[m.esclusiva]; push('Aperitivo · Singola ricetta in esclusiva', Object.assign({}, r, { id: 'ex-' + r.id, name: 'Esclusiva · ' + r.name })); }
  push('Aperitivo · Buvette', gen('bv-bollicina', 'Bollicina · ' + CAT.buvette.bollicina, [CAT.buvette.bollicina, 'Flûte'], ['Raffreddare', 'Servizio']));
  if (m.cocktail) push('Aperitivo · Buvette', gen('bv-cocktail', 'Cocktail d’aperitivo · ' + m.cocktail, ['Ingredienti: ' + m.cocktail, 'Ghiaccio', 'Garnish'], ['Mise en place bar', 'Preparazione al momento']));
  push('Aperitivo · Buvette', gen('bv-analc', 'Analcolici' + (m.succo ? ' · succo ' + m.succo.toLowerCase() : ''), [m.succo ? 'Succo di frutta ' + m.succo.toLowerCase() : 'Succo di frutta', 'Coca Cola in vetro', 'Acqua naturale e frizzante Sparea Splendida'], ['Raffreddare', 'Servizio']));
  m.extraBuvette.forEach((n, i) => push('Aperitivo · Buvette', gen('bv-x-' + norm(n).replace(/ /g, '-'), 'Extra buvette · ' + n, [n], ['Acquisto e raffreddamento', 'Servizio'])));
  // a tavola
  const pick = (ids, sec) => ids.forEach(id => push(sec, RECIPE_INDEX[id]));
  pick(m.pre, 'A tavola · Pre-entrée'); pick(m.entree, 'A tavola · Entrée'); pick(m.primi, 'A tavola · Primo piatto'); pick(m.secondi, 'A tavola · Secondo piatto');
  if (m.formaggi) push('A tavola · Degustazione formaggi', RECIPE_INDEX['fo-degustazione']);
  if (m.bianco || m.rosso || m.extraVini.length) push('Bevande a tavola', gen('bev-tavola', 'Vini e acqua a tavola', [m.bianco && 'Bianco: ' + m.bianco, m.rosso && 'Rosso: ' + m.rosso, ...m.extraVini.map(x => 'Extra: ' + x), 'Acqua naturale e frizzante Sparea Splendida'].filter(Boolean), ['Selezione e raffreddamento', 'Bicchieri e servizio']));
  // dessert & lounge
  if (m.dessert) { push('Dessert nuziale', RECIPE_INDEX[m.dessert]); push('Dessert nuziale', RECIPE_INDEX['de-torta']); push('Dessert nuziale', gen('de-brindisi', 'Brindisi · Spumante Brut e Moscato d’Asti', ['Spumante Brut', 'Moscato d’Asti', 'Flûte'], ['Raffreddare', 'Servizio al taglio torta'])); }
  m.lounge.forEach(id => push('Lounge bar · Dolci e piccola pasticceria', RECIPE_INDEX[id]));
  if (m.lounge.length || m.dessert) {
    push('Lounge bar · Servizi', gen('lo-caffe', 'Specialty coffee · degustazione 3 tipologie', ['Caffè (3 tipologie)' + (m.caffeAlt ? ' + ' + m.caffeAlt : '')], ['Macinatura e attrezzature', 'Servizio guidato']));
    push('Lounge bar · Servizi', gen('lo-amari', 'Amari di erbe, fiori e radici', ['Selezione amari di produzione artigianale'], ['Selezione e servizio']));
    push('Lounge bar · Servizi', gen('lo-vermouth', 'Vermouth corner', ['Vermouth bianco', 'Vermouth rosso'], ['Selezione e servizio']));
  }
  // add-on
  CAT.addons.forEach(a => {
    const st = addonState(E, a); if (!st.on) return;
    const v = addonVariant(a, st);
    const items = (v && v.items) || a.ricetta; if (!items) return;
    push('Add-on', gen('ad-' + a.id, a.nome + (v ? ' · ' + v.nome.split(' · ')[0] : ''), items.slice(), ['Preparazione', 'Allestimento corner / servizio']));
  });
  // richieste speciali
  E.special.forEach(s => { if (['piatto', 'isola'].includes(s.kind) && s.stato !== 'Rifiutato') push('Richieste speciali', gen('sp-' + s.id, s.titolo || 'Richiesta speciale', [], ['Definire con lo chef'], s.descr)); });
  return out;
}

function recipeState(E, r) {
  let st = E.recipes[r.id];
  if (!st) {
    st = E.recipes[r.id] = { porz: null, ing: r.ing.map(n => ({ n, q: '', u: 'g', ok: false })), semi: r.semi.map(n => ({ n, ok: false })), asm: r.asm.map(n => ({ n, ok: false })), note: '' };
  }
  return st;
}
const portionsOf = (E, st) => (st && st.porz != null && st.porz !== '') ? Number(st.porz) : ((+E.q.adulti || 0) + (+E.q.bambini || 0));
function recipeProgress(st) {
  const f = a => [a.filter(x => x.ok).length, a.length];
  return { ing: f(st.ing), semi: f(st.semi), asm: f(st.asm) };
}
function recipeDone(st) { const p = recipeProgress(st); const d = p.ing[0] + p.semi[0] + p.asm[0], t = p.ing[1] + p.semi[1] + p.asm[1]; return { d, t, pct: t ? Math.round(d / t * 100) : 0 }; }
