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
  { k: 'evento', n: '01', t: 'Evento', subs: [['questionario', 'Questionario'], ['invitati', 'Invitati'], ['tavoli', 'Tavoli e mappa'], ['consegne', 'Consegne 15 gg'], ['portale', 'Accesso cliente']] },
  { k: 'menu', n: '02', t: 'Menù', subs: [['aperitivo', 'Aperitivo'], ['tavola', 'A tavola'], ['dolci', 'Dolci e lounge'], ['custom', 'Menù personalizzato'], ['prova', 'Prova menù'], ['speciali', 'Richieste speciali']] },
  { k: 'allestimento', n: '03', t: 'Allestimento' },
  { k: 'addon', n: '04', t: 'Add-on' },
  { k: 'economics', n: '05', t: 'Economics' },
  { k: 'ricettario', n: '06', t: 'Ricettario' },
  { k: 'servizio', n: '07', t: 'Servizio' },
];

const curEvent = () => (ROUTE.view === 'event' ? getEvent(ROUTE.id) : null);
function parseHash() {
  const h = location.hash.replace(/^#\/?/, '').split('/');
  if (h[0] === 'e' && getEvent(h[1])) {
    const sec = SECS.find(s => s.k === h[2]) || SECS[0];
    return { view: 'event', id: h[1], sec: sec.k, sub: h[3] || (sec.subs ? sec.subs[0][0] : '') };
  }
  if (typeof AUTH !== 'undefined' && AUTH.cucina && (h[0] === 'settings' || h[0] === 'catalog')) return { view: 'events' };
  if (h[0] === 'settings') return { view: 'settings', tab: h[1] || 'generale' };
  if (h[0] === 'catalog') return { view: 'catalog', year: +h[1] || new Date().getFullYear(), tab: h[2] || 'aperitivo' };
  if (h[0] === 'ricettario') return { view: 'rlib', year: +h[1] || new Date().getFullYear() };
  if (h[0] === 'events') return { view: 'events' };
  if (typeof AUTH !== 'undefined' && AUTH.cucina) return { view: 'events' };
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
  const app = $('.app');
  if (CLOUD && AUTH.status !== 'ready') {
    app.classList.add('noside'); $('#side').innerHTML = ''; $('#main').innerHTML = viewAuth(); document.title = 'Accesso · La Stella'; return;
  }
  app.classList.remove('noside');
  const E = curEvent();
  let html;
  if (ROUTE.view === 'home') html = viewDashboard();
  else if (ROUTE.view === 'events') html = viewEvents();
  else if (ROUTE.view === 'settings') html = viewSettings();
  else if (ROUTE.view === 'catalog') html = viewCatalog();
  else if (ROUTE.view === 'rlib') html = viewRicettarioLib();
  else html = eventShell(E);
  $('#side').innerHTML = sideHtml(E);
  $('#main').innerHTML = html;
  document.title = (E ? evName(E) + ' · ' : '') + 'La Stella · Gestionale eventi';
  if (ROUTE.view === 'settings' && CLOUD) syncTeam();
  if (top) window.scrollTo(0, 0);
}
function sideHtml(E) {
  const on = v => (ROUTE.view === v ? 'on' : '');
  let nav = `<a href="#/home" class="${on('home')}"><em>◆</em>Dashboard</a><a href="#/events" class="${on('events')}"><em>☰</em>Eventi</a>`;
  if (AUTH.cucina) nav = `<a href="#/events" class="${on('events')}"><em>☰</em>Eventi</a>`;
  if (E && AUTH.cucina) nav += `<div class="sep"></div><div class="lbl">${esc(evName(E))}</div><a href="#/${evUrl('evento', 'invitati')}" class="${ROUTE.sec === 'evento' ? 'on' : ''}"><em>👥</em>Invitati e allergie</a><a href="#/${evUrl('ricettario')}" class="${ROUTE.sec === 'ricettario' ? 'on' : ''}"><em>06</em>Ricettario evento</a><a href="#/${evUrl('servizio')}" class="${ROUTE.sec === 'servizio' ? 'on' : ''}"><em>07</em>Servizio</a>`;
  else if (E) {
    const lock = missingRequired(E).length;
    nav += `<div class="sep"></div><div class="lbl">${esc(evName(E))}</div>`;
    SECS.forEach(s => { const locked = lock && s.k !== 'evento'; nav += `<a href="#/${evUrl(s.k, s.subs ? s.subs[0][0] : '')}" class="${ROUTE.sec === s.k ? 'on' : ''} ${locked ? 'locked' : ''}" ${locked ? 'title="Compila prima i dati del committente 1"' : ''}><em>${s.n}</em>${s.t}${locked ? ' 🔒' : ''}</a>`; });
  }
  nav += `<div class="sep"></div><a href="#/ricettario" class="${on('rlib')}"><em>🍳</em>Libreria ricette</a>`;
  if (!AUTH.cucina) nav += `<a href="#/catalog/${new Date().getFullYear()}/aperitivo" class="${on('catalog')}"><em>✦</em>Catalogo menù</a><a href="#/settings" class="${on('settings')}"><em>⚙</em>Impostazioni</a>`;
  return `<a class="wordmark" href="#/home"><b>LA STELLA</b><i>NEW CONCEPT BANQUETING</i></a><nav class="nav">${nav}</nav>
  <div class="foot"><div id="sync-ind">${syncHtml()}</div>${CLOUD && AUTH.user ? `<div style="margin-top:6px;word-break:break-all">${esc(AUTH.user.email)}</div>` : '<div style="margin-top:6px">Esegui un backup dalle Impostazioni.</div>'}</div>`;
}

function eventShell(E) {
  const sec = SECS.find(s => s.k === ROUTE.sec);
  const needQ = !(ROUTE.sec === 'evento' && ROUTE.sub === 'questionario') && !AUTH.cucina;
  if (needQ && missingRequired(E).length) {           // dati del committente 1 obbligatori per proseguire
    setTimeout(() => { toast('Compila prima nome, telefono ed email del committente 1'); location.replace('#/' + evUrl('evento', 'questionario')); }, 0);
    return '';
  }
  if (E.q.data && !AUTH.cucina && autoDates(E)) save();
  const c = completeness(E), q = computeQuote(E), cust = customizations(E);
  const locked = !AUTH.cucina && !!missingRequired(E).length;
  const tabs = sec.subs && !AUTH.cucina ? `<div class="tabs">${sec.subs.map(([k, t]) => `<a href="#/${evUrl(sec.k, k)}" class="${ROUTE.sub === k ? 'on' : ''} ${locked && !(sec.k === 'evento' && k === 'questionario') ? 'locked' : ''}">${t}${k === 'invitati' && E.guests.length ? `<span class="badge">${E.guests.length}</span>` : ''}${k === 'speciali' && E.special.length ? `<span class="badge">${E.special.length}</span>` : ''}</a>`).join('')}</div>` : '<div class="sp"></div>';
  const coperti = (+E.q.adulti || 0) + (+E.q.bambini || 0) + (+E.q.neonati || 0) + (+E.q.staff || 0);
  const header = `<div class="evhead noprint">
    <div><div class="kicker">${esc(E.q.tipo)} · ${esc(E.q.pasto)}</div><h1>${esc(evName(E))}</h1>
    <div class="meta"><span>📅 <b>${esc(fmtDate(E.q.data))}</b></span><span>📍 <b>${esc(E.q.locationNome || '—')}</b></span><span>👥 <b>${coperti}</b> ospiti</span>
    <span>Completezza <b id="hd-pct">${c.pct}%</b></span>
    <select data-b="stato" data-hook="stato" data-r title="Stato pratica">${['Preventivo', 'Confermato', 'Definizione menù', 'Allestimenti', 'Pronto', 'Concluso', 'Annullato'].map(s => `<option ${E.stato === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
    ${typeof portalNew === 'function' && portalNew(E) ? `<a class="pill ok" href="#/${evUrl('evento', 'portale')}" title="Il cliente ha modificato le sue scelte">🔔 Modificato dal cliente</a>` : ''}
    ${cust.length ? `<a class="pill warn" id="hd-cust" href="#/${evUrl('economics')}" title="Vedi le customizzazioni">⚠ ${cust.length} customizzazioni</a>` : ''}</div></div>
    ${AUTH.cucina ? '' : `<div class="tot"><small>Totale stimato (iva incl.)</small><strong id="hd-total">${eur(q.totale)}</strong></div>`}</div>`;
  const body = (VIEWS[sec.k] || (() => ''))(E);
  const ro = AUTH.cucina && !['ricettario', 'servizio'].includes(ROUTE.sec);
  return header + tabs + `${ro ? '<div class="alert info">Sola lettura · profilo cucina</div>' : ''}<section ${ro ? 'inert' : ''}>${body}</section>`;
}
function refreshHeader() {
  const E = curEvent(); if (!E) return;
  const t = $('#hd-total'); if (t) t.textContent = eur(computeQuote(E).totale);
  const p = $('#hd-pct'); if (p) p.textContent = completeness(E).pct + '%';
  const cu = $('#hd-cust'); if (cu) cu.textContent = '⚠ ' + customizations(E).length + ' customizzazioni';
}

/* ---------------------------------------------------------------- completezza */
function completeness(E) {
  const m = E.menu, f = CAT.formule.find(x => x.id === m.formula) || CAT.formule[0], it = [];
  const add = (sec, label, ok) => it.push({ sec, label, ok: !!ok });
  add('evento', 'Dati del committente 1', !missingRequired(E).length); add('evento', 'Data evento', E.q.data); add('evento', 'Location', E.q.locationNome); add('evento', 'Numero ospiti', +E.q.adulti > 0);
  add('evento', 'Elenco invitati caricato', E.guests.length);
  add('evento', 'Tutti gli invitati assegnati a un tavolo', E.guests.length && E.guests.every(g => seatOf(E, g.id)));
  add('menu', '3 isole in show-cooking', m.show.length === CAT.aperitivoRegole.show);
  add('menu', '2 isole a passaggio', m.passaggio.length === CAT.aperitivoRegole.passaggio);
  add('menu', 'Cocktail d’aperitivo e succo', m.cocktail && m.succo);
  add('menu', 'Portate a tavola complete', m.pre.length === f.pre && m.entree.length === f.entree && m.primi.length === f.primi && m.secondi.length === f.secondi);
  add('menu', 'Vino bianco e rosso', m.bianco && m.rosso);
  add('menu', 'Dessert nuziale', m.dessert);
  const voci = catalogFor(E).allestimenti.flatMap(g => g.voci).filter(v => v.opts);
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
  if (el.dataset.lines !== undefined) v = el.value.split('\n').map(x => x.trim()).filter(Boolean);
  if (el.dataset.csv !== undefined) v = el.value.split(',').map(x => x.trim()).filter(Boolean);
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
ACTIONS['new-event'] = () => { const E = newEvent(); const L = S.settings.locations[0]; if (L) applyLocation(E, L.id); E.creato = new Date().toISOString(); S.events.unshift(E); save(); go(`e/${E.id}/evento/questionario`); };
ACTIONS['open-event'] = el => go(`e/${el.dataset.id}/evento/questionario`);
ACTIONS['dup-event'] = (el, ev) => {
  ev.stopPropagation(); const src = getEvent(el.dataset.id); const c = JSON.parse(JSON.stringify(src)); c.id = uid(); c.q.sposo1 = (c.q.sposo1 || 'Evento') + ' (copia)'; c.creato = new Date().toISOString();
  S.events.unshift(c); save(); rr(); toast('Evento duplicato');
};
ACTIONS['del-event'] = async (el, ev) => {
  ev.stopPropagation(); const E = getEvent(el.dataset.id);
  if (!confirm(`Eliminare definitivamente «${evName(E)}»? L'operazione non è reversibile.`)) return;
  if (CLOUD && !(await cloudDelete(E.id))) return;
  S.events = S.events.filter(x => x.id !== E.id); save(); go('events'); render();
};

/* ---------------------------------------------------------------- boot */
ACTIONS['upload-local'] = () => uploadLocalOnly();
async function boot() {
  window.addEventListener('hashchange', () => render()); render(); await cloudInit();
  // modalità locale: al primo avvio mostra subito gli eventi di esempio
  if (!CLOUD && !S.events.length && !S.demoSeeded) { try { await loadDemoSeed(); S.demoSeeded = true; save(); } catch (e) { console.warn('dati dimostrativi non caricati', e); } }
  render();
}
