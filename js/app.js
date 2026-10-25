/* =====================================================================
   Core: router, shell, binding generico, modali, home, impostazioni
   ===================================================================== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const UI = { guestQ: '', guestF: '', tlist: true, rcpTab: 'ricette', rcpSec: '', rcpSt: '', rcpQ: '', open: new Set(), apOpen: {} };
let ROUTE = { view: 'home' };
const ACTIONS = {};
const HOOKS = {};
const VIEWS = {};

const SECS = [
  { k: 'evento', n: '01', t: 'Evento', subs: [['questionario', 'Questionario'], ['invitati', 'Invitati'], ['tavoli', 'Tavoli e mappa']] },
  { k: 'menu', n: '02', t: 'Menù', subs: [['aperitivo', 'Aperitivo'], ['tavola', 'A tavola'], ['dolci', 'Dolci e lounge'], ['speciali', 'Richieste speciali']] },
  { k: 'allestimento', n: '03', t: 'Allestimento' },
  { k: 'addon', n: '04', t: 'Add-on' },
  { k: 'economics', n: '05', t: 'Economics' },
  { k: 'ricettario', n: '06', t: 'Ricettario' },
];

const curEvent = () => (ROUTE.view === 'event' ? getEvent(ROUTE.id) : null);
function parseHash() {
  const h = location.hash.replace(/^#\/?/, '').split('/');
  if (h[0] === 'e' && getEvent(h[1])) {
    const sec = SECS.find(s => s.k === h[2]) || SECS[0];
    return { view: 'event', id: h[1], sec: sec.k, sub: h[3] || (sec.subs ? sec.subs[0][0] : '') };
  }
  if (h[0] === 'settings') return { view: 'settings' };
  return { view: 'home' };
}
const go = p => { location.hash = '#/' + p; };
const evUrl = (sec, sub) => `e/${ROUTE.id}/${sec}${sub ? '/' + sub : ''}`;

/* ---------------------------------------------------------------- utilità */
const fmtDate = iso => {
  if (!iso) return '—';
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};
const evName = E => [E.q.sposo1, E.q.sposo2].filter(Boolean).join(' & ') || 'Nuovo evento';
function toast(msg) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}
function download(name, blob) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
function openModal(html) { $('#modal-root').innerHTML = `<div class="modal-bg" data-act="modal-bg"><div class="modal">${html}</div></div>`; }
function closeModal() { $('#modal-root').innerHTML = ''; }

/* ---------------------------------------------------------------- render */
function rr() { const y = window.scrollY; render(false); window.scrollTo(0, y); }
function render(top = true) {
  ROUTE = parseHash();
  const E = curEvent();
  $('#side').innerHTML = sideHtml(E);
  let html;
  if (ROUTE.view === 'home') html = viewHome();
  else if (ROUTE.view === 'settings') html = viewSettings();
  else html = eventShell(E);
  $('#main').innerHTML = html;
  document.title = (E ? evName(E) + ' · ' : '') + 'La Stella · Gestionale eventi';
  if (top) window.scrollTo(0, 0);
}
function sideHtml(E) {
  let nav = `<a href="#/home" class="${ROUTE.view === 'home' ? 'on' : ''}"><em>◆</em>Eventi</a>`;
  if (E) {
    nav += `<div class="sep"></div><div class="lbl">${esc(evName(E))}</div>`;
    SECS.forEach(s => { nav += `<a href="#/${evUrl(s.k, s.subs ? s.subs[0][0] : '')}" class="${ROUTE.sec === s.k ? 'on' : ''}"><em>${s.n}</em>${s.t}</a>`; });
  }
  nav += `<div class="sep"></div><a href="#/settings" class="${ROUTE.view === 'settings' ? 'on' : ''}"><em>⚙</em>Impostazioni</a>`;
  return `<a class="wordmark" href="#/home"><b>LA STELLA</b><i>NEW CONCEPT BANQUETING</i></a><nav class="nav">${nav}</nav>
  <div class="foot">Gestionale eventi · dati salvati su questo browser.<br>Esegui un backup dalle Impostazioni.</div>`;
}

function eventShell(E) {
  const sec = SECS.find(s => s.k === ROUTE.sec);
  const c = completeness(E);
  const q = computeQuote(E);
  const tabs = sec.subs ? `<div class="tabs">${sec.subs.map(([k, t]) => `<a href="#/${evUrl(sec.k, k)}" class="${ROUTE.sub === k ? 'on' : ''}">${t}${k === 'invitati' && E.guests.length ? `<span class="badge">${E.guests.length}</span>` : ''}${k === 'speciali' && E.special.length ? `<span class="badge">${E.special.length}</span>` : ''}</a>`).join('')}</div>` : '<div class="sp"></div>';
  const coperti = (+E.q.adulti || 0) + (+E.q.bambini || 0) + (+E.q.neonati || 0);
  const header = `<div class="evhead noprint">
    <div><div class="kicker">${esc(E.q.tipo)} · ${esc(E.q.pasto)}</div><h1>${esc(evName(E))}</h1>
    <div class="meta"><span>📅 <b>${esc(fmtDate(E.q.data))}</b></span><span>📍 <b>${esc(E.q.locationNome || '—')}</b></span><span>👥 <b>${coperti}</b> ospiti</span>
    <span>Completezza <b id="hd-pct">${c.pct}%</b></span>
    <select data-b="stato" data-r title="Stato pratica">${['Preventivo', 'Confermato', 'Definizione menù', 'Allestimenti', 'Pronto', 'Concluso', 'Annullato'].map(s => `<option ${E.stato === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div></div>
    <div class="tot"><small>Totale stimato (iva incl.)</small><strong id="hd-total">${eur(q.totale)}</strong></div></div>`;
  const body = (VIEWS[sec.k] || (() => ''))(E);
  return header + tabs + `<section>${body}</section>`;
}
function refreshHeader() {
  const E = curEvent(); if (!E) return;
  const t = $('#hd-total'); if (t) t.textContent = eur(computeQuote(E).totale);
  const p = $('#hd-pct'); if (p) p.textContent = completeness(E).pct + '%';
}

/* ---------------------------------------------------------------- completezza */
function completeness(E) {
  const m = E.menu, f = CAT.formule.find(x => x.id === m.formula) || CAT.formule[0], it = [];
  const add = (sec, label, ok) => it.push({ sec, label, ok: !!ok });
  add('evento', 'Data evento', E.q.data); add('evento', 'Location', E.q.locationNome); add('evento', 'Numero ospiti', +E.q.adulti > 0);
  add('evento', 'Elenco invitati caricato', E.guests.length);
  add('evento', 'Tutti gli invitati assegnati a un tavolo', E.guests.length && E.guests.every(g => seatOf(E, g.id)));
  add('menu', '3 isole in show-cooking', m.show.length === CAT.aperitivoRegole.show);
  add('menu', '2 isole a passaggio', m.passaggio.length === CAT.aperitivoRegole.passaggio);
  add('menu', 'Cocktail d’aperitivo e succo', m.cocktail && m.succo);
  add('menu', 'Portate a tavola complete', m.pre.length === f.pre && m.entree.length === f.entree && m.primi.length === f.primi && m.secondi.length === f.secondi);
  add('menu', 'Vino bianco e rosso', m.bianco && m.rosso);
  add('menu', 'Dessert nuziale', m.dessert);
  const voci = CAT.allestimenti.flatMap(g => g.voci).filter(v => v.opts);
  add('allestimento', `Allestimenti scelti (${voci.filter(v => (E.allest[v.id] || {}).opt).length}/${voci.length})`, voci.every(v => (E.allest[v.id] || {}).opt));
  add('allestimento', 'Allestimenti confermati dal cliente', voci.every(v => (E.allest[v.id] || {}).ok));
  const pct = Math.round(it.filter(i => i.ok).length / it.length * 100);
  return { items: it, pct };
}

/* ---------------------------------------------------------------- binding */
function applyBind(el, fromChange) {
  const root = el.dataset.s !== undefined ? S.settings : curEvent(); if (!root) return;
  let v;
  if (el.type === 'checkbox') v = el.checked;
  else if (el.type === 'number') v = el.value === '' ? '' : Number(el.value);
  else v = el.value;
  pset(root, el.dataset.b, v); save();
  if (el.dataset.hook && HOOKS[el.dataset.hook]) HOOKS[el.dataset.hook](el, v);
  if (fromChange && el.dataset.r !== undefined) rr(); else refreshHeader();
}
document.addEventListener('input', e => {
  const el = e.target.closest('[data-b]'); if (!el || ['checkbox', 'radio'].includes(el.type) || el.tagName === 'SELECT') return;
  applyBind(el, false);
});
document.addEventListener('change', e => { const el = e.target.closest('[data-b]'); if (el) applyBind(el, true); });
document.addEventListener('toggle', e => {
  const d = e.target; if (d.tagName !== 'DETAILS' || !d.dataset.k) return;
  d.open ? UI.open.add(d.dataset.k) : UI.open.delete(d.dataset.k);
}, true);

document.addEventListener('click', e => {
  const E = curEvent();
  const tog = e.target.closest('[data-tog]');
  if (tog && E) {
    const arr = pget(E, tog.dataset.tog) || [], v = tog.dataset.v, i = arr.indexOf(v);
    const lim = tog.dataset.lim ? Number(tog.dataset.lim) : 0;
    if (i >= 0) arr.splice(i, 1); else { arr.push(v); if (lim && arr.length > lim && tog.dataset.rep !== undefined) arr.shift(); }
    pset(E, tog.dataset.tog, arr); save(); rr(); return;
  }
  const pick = e.target.closest('[data-pick]');
  if (pick && E) { const cur = pget(E, pick.dataset.pick); pset(E, pick.dataset.pick, cur === pick.dataset.v ? '' : pick.dataset.v); save(); rr(); return; }
  const act = e.target.closest('[data-act]');
  if (act) {
    if (act.dataset.act === 'modal-bg' && e.target !== act) return;
    const fn = ACTIONS[act.dataset.act]; if (fn) { fn(act, e); }
  }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

/* ---------------------------------------------------------------- azioni globali */
ACTIONS['modal-bg'] = () => closeModal();
ACTIONS['modal-close'] = () => closeModal();
ACTIONS['new-event'] = () => { const E = newEvent(); S.events.unshift(E); save(); go(`e/${E.id}/evento/questionario`); };
ACTIONS['open-event'] = el => go(`e/${el.dataset.id}/evento/questionario`);
ACTIONS['dup-event'] = (el, ev) => {
  ev.stopPropagation(); const src = getEvent(el.dataset.id); const c = JSON.parse(JSON.stringify(src)); c.id = uid(); c.q.sposo1 = (c.q.sposo1 || 'Evento') + ' (copia)'; c.creato = new Date().toISOString();
  S.events.unshift(c); save(); rr(); toast('Evento duplicato');
};
ACTIONS['del-event'] = (el, ev) => {
  ev.stopPropagation(); const E = getEvent(el.dataset.id);
  if (!confirm(`Eliminare definitivamente «${evName(E)}»? L'operazione non è reversibile.`)) return;
  S.events = S.events.filter(x => x.id !== E.id); save(); go('home'); render();
};
ACTIONS['reset-sec'] = el => { /* riservata */ };

/* ---------------------------------------------------------------- HOME */
function viewHome() {
  const list = S.events.slice().sort((a, b) => (a.q.data || '9999').localeCompare(b.q.data || '9999'));
  const cards = list.map(E => {
    const q = computeQuote(E), c = completeness(E), n = (+E.q.adulti || 0) + (+E.q.bambini || 0) + (+E.q.neonati || 0);
    const days = E.q.data ? Math.ceil((new Date(E.q.data + 'T12:00:00') - new Date()) / 864e5) : null;
    return `<div class="evcard" data-act="open-event" data-id="${E.id}">
      <div class="top"><small>${esc(E.q.tipo)} · ${esc(E.stato)}</small><h3>${esc(evName(E))}</h3></div>
      <div class="bd"><div><span>Data</span>${E.q.data ? new Date(E.q.data + 'T12:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}${days !== null ? ` <small class="muted">(${days >= 0 ? 'tra ' + days + ' gg' : 'passato'})</small>` : ''}</div>
        <div><span>Location</span>${esc(E.q.locationNome || '—')}</div>
        <div><span>Ospiti</span>${n}</div><div><span>Totale iva incl.</span>${eur(q.totale)}</div>
        <div style="grid-column:1/-1"><span>Completezza ${c.pct}%</span><div class="progress"><i style="width:${c.pct}%"></i></div></div></div>
      <div class="ft"><button class="btn sm alt" data-act="dup-event" data-id="${E.id}">Duplica</button><button class="btn sm ghost right" data-act="del-event" data-id="${E.id}">Elimina</button></div></div>`;
  }).join('');
  return `<div class="secthead"><div><h1>Eventi</h1><p>Tutte le pratiche in lavorazione. Ogni evento raccoglie questionario, invitati e tavoli, menù, allestimenti, add-on, preventivo e ricettario.</p></div>
    <button class="btn right" data-act="new-event">＋ Nuovo evento</button></div>
    ${list.length ? `<div class="evcards">${cards}</div>` : `<div class="empty"><h3>Nessun evento</h3><p>Crea il primo evento per iniziare il questionario con i clienti.</p><button class="btn" data-act="new-event">＋ Nuovo evento</button> <button class="btn alt" data-act="load-demo">Carica evento di esempio</button></div>`}`;
}
ACTIONS['load-demo'] = () => {
  const E = newEvent();
  Object.assign(E.q, { sposo1: 'Roberto', sposo2: 'Francesca', planner: 'Roberto Armentaro WP', data: '2027-06-19', pasto: 'Cena', rito: 'Simbolico', adulti: 100, bambini: 0, neonati: 0, scadenzaAllest: '2027-01-31', validita: '2025-12-20', note: 'Rito simbolico. Numero ospiti indicativo 100/120 (dato dal preventivo del 2 dicembre 2025).' });
  S.events.unshift(E); save(); go(`e/${E.id}/evento/questionario`);
};

/* ---------------------------------------------------------------- IMPOSTAZIONI */
function viewSettings() {
  const s = S.settings;
  const rows = [];
  CAT.allestimenti.forEach(g => g.voci.forEach(v => (v.opts || []).forEach(o => { if (o.sur || o.fix) rows.push([`${o.fix ? 'fix' : 'sur'}:${v.id}:${o.id}`, `${v.nome} → ${o.nome}`, o.fix || o.sur, o.fix ? '€ forfait' : '€ a persona']); })));
  CAT.addons.forEach(a => { if (a.varianti) a.varianti.forEach(v => rows.push([`add:${a.id}:${v.id}`, `${a.nome} → ${v.nome.split(' · ')[0]}`, v.prezzo, '€ a persona'])); else if (a.prezzo && !a.link) rows.push([`add:${a.id}`, a.nome, a.prezzo, '€ a persona']); });
  return `<div class="secthead"><div><h1>Impostazioni</h1><p>Listini, IVA e prezzi di supplementi e add-on. I valori di partenza arrivano dal preventivo Diamante 2026: modificali quando cambia il listino.</p></div></div>
  <div class="card"><h3>Parametri generali</h3><div class="fields">
    <div class="field"><label>Aliquota IVA %</label><input type="number" step="0.5" data-s data-b="iva" value="${s.iva}"><span class="hint">Il preventivo indica «iva nella misura di legge»: verifica l'aliquota applicabile.</span></div>
    <div class="field"><label>Prezzo bambino (€ / persona)</label><input type="number" data-s data-b="bambinoPrezzo" value="${s.bambinoPrezzo}"><span class="hint">Non presente nel preventivo: da definire.</span></div>
    <div class="field"><label>Prezzo neonato (€ / persona)</label><input type="number" data-s data-b="neonatoPrezzo" value="${s.neonatoPrezzo}"></div>
    <div class="field"><label>Supplementi «a persona» calcolati su</label><select data-s data-b="supplementiSu" data-r><option value="adulti" ${s.supplementiSu === 'adulti' ? 'selected' : ''}>Ospiti adulti</option><option value="tutti" ${s.supplementiSu === 'tutti' ? 'selected' : ''}>Adulti + bambini</option></select></div></div></div>
  <div class="card"><h3>Listini per location</h3><table class="tb"><thead><tr><th>Location</th><th class="num">Listino €</th><th class="num">Sabato €</th><th class="num">Dom–Ven €</th><th class="num">Min. adulti</th><th class="num">Sconto oltre €</th><th class="num">€ per ospite mancante</th><th class="num">Min. garantito</th></tr></thead><tbody>
  ${s.listini.map((l, i) => `<tr><td><input type="text" data-s data-b="listini.${i}.nome" value="${esc(l.nome)}"></td>${['listino', 'sabato', 'feriale', 'minAdulti', 'scontoOltre', 'scontoMancante', 'minGarantito'].map(k => `<td class="num"><input type="number" style="width:84px" data-s data-b="listini.${i}.${k}" value="${l[k]}"></td>`).join('')}</tr>`).join('')}</tbody></table>
  <p class="hint">Regole da preventivo: prezzo a persona per minimo ${s.listini[0].minAdulti} adulti paganti; dal 101° ospite sconto di € ${s.listini[0].scontoOltre} solo con Cocktail bar; sotto i ${s.listini[0].minAdulti} adulti sconto di € ${s.listini[0].scontoMancante} per ogni ospite mancante (minimo garantito ${s.listini[0].minGarantito}).</p></div>
  <div class="card"><h3>Prezzi supplementi e add-on</h3><p class="hint">Lascia vuoto per usare il valore di listino.</p><table class="tb"><thead><tr><th>Voce</th><th class="num">Listino</th><th>Unità</th><th class="num">Tuo prezzo</th></tr></thead><tbody>
  ${rows.map(([k, l, d, u]) => `<tr><td>${esc(l)}</td><td class="num">${eur(d)}</td><td class="muted">${u}</td><td class="num"><input type="number" style="width:96px" data-s data-b="prezzi.${k}" value="${s.prezzi[k] ?? ''}" placeholder="${d}"></td></tr>`).join('')}</tbody></table></div>
  <div class="card"><h3>Backup dei dati</h3><p class="muted">Gli eventi sono salvati nel browser di questo computer. Scarica un backup regolarmente, oppure per spostarli su un altro computer.</p>
  <div class="row"><button class="btn" data-act="backup">⭳ Scarica backup (.json)</button><label class="btn alt">⭱ Ripristina da backup<input type="file" accept=".json" hidden id="restore-file"></label><button class="btn danger right" data-act="wipe">Cancella tutti i dati</button></div></div>`;
}
ACTIONS.backup = () => { download(`lastella-backup-${new Date().toISOString().slice(0, 10)}.json`, new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' })); };
ACTIONS.wipe = () => { if (confirm('Cancellare TUTTI gli eventi e le impostazioni da questo browser?') && confirm('Sei davvero sicuro? Non si può annullare.')) { localStorage.removeItem(KEY); location.hash = '#/home'; location.reload(); } };
document.addEventListener('change', e => {
  if (e.target.id !== 'restore-file') return;
  const f = e.target.files[0]; if (!f) return;
  f.text().then(t => {
    try { const j = JSON.parse(t); if (!j.events) throw 0; if (!confirm(`Il backup contiene ${j.events.length} eventi. Sostituire i dati attuali?`)) return; localStorage.setItem(KEY, JSON.stringify(j)); location.reload(); }
    catch { alert('File di backup non valido.'); }
  });
});

/* ---------------------------------------------------------------- boot */
function boot() { window.addEventListener('hashchange', () => render()); render(); }
