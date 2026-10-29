/* =====================================================================
   Dashboard · Eventi · Impostazioni · Catalogo menù per anno
   ===================================================================== */
const MESI_BREVI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
const yearOfEv = E => (E.q.data ? +E.q.data.slice(0, 4) : null);

/* ---------------------------------------------------------------- DASHBOARD */
function yearStats(y) {
  const evs = S.events.filter(E => yearOfEv(E) === y && E.stato !== 'Annullato');
  const conf = evs.filter(isConfirmed), prev = evs.filter(E => !isConfirmed(E));
  const sum = l => l.reduce((a, E) => { const q = computeQuote(E); a.imp += q.imponibile; a.tot += q.totale; return a; }, { imp: 0, tot: 0 });
  return { y, n: evs.length, conf, prev, all: sum(evs), cs: sum(conf), ps: sum(prev) };
}
function viewDashboard() {
  const now = new Date(), Y = now.getFullYear();
  if (!UI.dash) UI.dash = { y: Y, m: now.getMonth() };
  const { y, m } = UI.dash, a = yearStats(Y), b = yearStats(Y + 1), noDate = S.events.filter(E => !E.q.data && E.stato !== 'Annullato').length;
  const monthEv = S.events.filter(E => E.q.data && +E.q.data.slice(0, 4) === y && +E.q.data.slice(5, 7) - 1 === m && E.stato !== 'Annullato').sort((p, q) => p.q.data.localeCompare(q.q.data));
  const kpi = (title, st, dark) => `<div class="kpi ${dark ? 'dark' : ''}"><small>${title}</small><b>${eur(st.all.imp)}</b><div class="sub">iva escl. · ${eur(st.all.tot)} iva incl.</div><div class="sub" style="margin-top:6px">Confermato <strong>${eur(st.cs.imp)}</strong> · in preventivo <strong>${eur(st.ps.imp)}</strong></div></div>`;
  const cnt = (title, st) => `<div class="kpi"><small>${title}</small><b>${st.conf.length}</b><div class="sub">eventi confermati</div><div class="sub" style="margin-top:6px">${st.prev.length} in preventivo · ${st.n} in totale</div></div>`;
  // prossime scadenze: rate non pagate (in ritardo o entro 30 giorni)
  const limit = addDaysISO(isoOf(now), 30), today = isoOf(now), due = [];
  S.events.forEach(E => { if (E.stato === 'Annullato' || !isConfirmed(E)) return; E.pagamenti.forEach(p => { if (!p.paid && p.due && p.due <= limit) due.push({ E, p }); }); });
  due.sort((p, q) => p.p.due.localeCompare(q.p.due));
  const row = E => { const q = computeQuote(E), d = new Date(E.q.data + 'T12:00:00'); return `<div class="evrow" data-act="open-event" data-id="${E.id}"><div class="dt"><b>${d.getDate()}</b><span>${MESI_BREVI[d.getMonth()]}</span></div><div style="flex:1;min-width:0"><b>${esc(evName(E))}</b><div class="small muted">${esc(E.q.locationNome || '—')} · ${(+E.q.adulti || 0) + (+E.q.bambini || 0)} ospiti · ${d.toLocaleDateString('it-IT', { weekday: 'long' })}</div></div><span class="pill ${isConfirmed(E) ? 'ok' : 'warn'}">${esc(E.stato)}</span><b class="nowrap">${eur(q.totale)}</b></div>`; };
  const prev = new Date(y, m - 1, 1), next = new Date(y, m + 1, 1);
  return `<div class="secthead"><div><h1>Dashboard</h1><p>Il quadro dell'attività: eventi del mese, totali preventivati e eventi confermati per anno.</p></div><button class="btn right" data-act="new-event">＋ Nuovo evento</button></div>
  <div class="kpis">${kpi('Totale preventivato ' + Y + ' (anno in corso)', a, true)}${kpi('Totale preventivato ' + (Y + 1) + ' (anno futuro)', b)}${cnt('Eventi confermati ' + Y, a)}${cnt('Eventi confermati ' + (Y + 1), b)}</div>
  ${noDate ? `<div class="alert info" style="margin-bottom:16px">${noDate} event${noDate > 1 ? 'i' : 'o'} senza data: non rientra${noDate > 1 ? 'no' : ''} nei totali per anno.</div>` : ''}
  <div class="dash-grid"><div class="card"><div class="chead"><button class="btn sm alt" data-act="dash-nav" data-y="${prev.getFullYear()}" data-m="${prev.getMonth()}">‹</button><h3 style="flex:1;text-align:center">Eventi di ${MESI[m].toLowerCase()} ${y}</h3><button class="btn sm alt" data-act="dash-nav" data-y="${next.getFullYear()}" data-m="${next.getMonth()}">›</button></div>
      ${monthEv.length ? monthEv.map(row).join('') : '<div class="empty" style="border:0">Nessun evento in questo mese.</div>'}
      <div class="small muted" style="margin-top:8px">${monthEv.filter(isConfirmed).length} confermati · ${monthEv.filter(E => !isConfirmed(E)).length} in preventivo · totale mese ${eur(monthEv.reduce((s, E) => s + computeQuote(E).totale, 0))} iva incl.</div></div>
    <div><div class="card"><h3 style="margin-bottom:12px;text-align:center">Calendario</h3>${monthGrid(y, m, {})}${calLegend()}</div>
      <div class="card" style="margin-top:16px"><h3 style="margin-bottom:10px">Pagamenti in scadenza (30 giorni)</h3>${due.length ? due.slice(0, 8).map(({ E, p }) => `<div class="evrow" data-act="open-event" data-id="${E.id}"><div style="flex:1"><b>${esc(evName(E))}</b><div class="small muted">${esc(p.desc)}</div></div><span class="pill ${p.due < today ? 'bad' : 'warn'}">${new Date(p.due + 'T12:00:00').toLocaleDateString('it-IT')}</span><b>${eur(p.importo)}</b></div>`).join('') : '<p class="muted">Nessuna rata in scadenza.</p>'}</div></div></div>`;
}
ACTIONS['dash-nav'] = el => { UI.dash = { y: +el.dataset.y, m: +el.dataset.m }; rr(); };

/* ---------------------------------------------------------------- ELENCO EVENTI */
function viewEvents() {
  const f = UI.evF || 'all', yr = UI.evY || '';
  const years = [...new Set(S.events.map(yearOfEv).filter(Boolean))].sort();
  let list = S.events.slice().sort((a, b) => (a.q.data || '9999').localeCompare(b.q.data || '9999'));
  if (f === 'conf') list = list.filter(isConfirmed); else if (f === 'prev') list = list.filter(E => !isConfirmed(E) && E.stato !== 'Annullato'); else if (f === 'ann') list = list.filter(E => E.stato === 'Annullato');
  if (yr) list = list.filter(E => String(yearOfEv(E)) === yr);
  const cards = list.map(E => {
    const q = computeQuote(E), c = completeness(E), n = (+E.q.adulti || 0) + (+E.q.bambini || 0) + (+E.q.neonati || 0) + (+E.q.staff || 0);
    const days = E.q.data ? Math.ceil((new Date(E.q.data + 'T12:00:00') - new Date()) / 864e5) : null;
    return `<div class="evcard" data-act="open-event" data-id="${E.id}">
      <div class="top"><small>${esc(E.q.tipo)} · ${esc(E.stato)}</small><h3>${esc(evName(E))}</h3></div>
      <div class="bd"><div><span>Data</span>${E.q.data ? new Date(E.q.data + 'T12:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}${days !== null ? ` <small class="muted">(${days >= 0 ? 'tra ' + days + ' gg' : 'passato'})</small>` : ''}</div>
        <div><span>Location</span>${esc(E.q.locationNome || '—')}</div>
        <div><span>Ospiti</span>${n}</div><div><span>Totale iva incl.</span>${eur(q.totale)}</div>
        <div style="grid-column:1/-1"><span>Completezza ${c.pct}%</span><div class="progress"><i style="width:${c.pct}%"></i></div></div></div>
      <div class="ft"><button class="btn sm alt" data-act="dup-event" data-id="${E.id}">Duplica</button><button class="btn sm ghost right" data-act="del-event" data-id="${E.id}">Elimina</button></div></div>`;
  }).join('');
  const lo = CLOUD && AUTH.localOnly.length ? `<div class="alert info" style="margin-bottom:16px">Su questo browser ci sono <b>${AUTH.localOnly.length}</b> eventi creati prima del collegamento al cloud e non ancora condivisi. <button class="btn sm" data-act="upload-local">Carica nel cloud</button></div>` : '';
  return lo + `<div class="secthead"><div><h1>Eventi</h1><p>Tutte le pratiche. Ogni evento raccoglie questionario, invitati e tavoli, menù, allestimenti, add-on, preventivo e ricettario.</p></div><span class="right row"><button class="btn alt" data-act="demo-40">Aggiungi i 40 eventi di esempio</button><button class="btn" data-act="new-event">＋ Nuovo evento</button></span></div>
    <div class="toolbar"><div class="chips">${[['all', 'Tutti'], ['conf', 'Confermati'], ['prev', 'In preventivo'], ['ann', 'Annullati']].map(([k, l]) => `<button class="chip ${f === k ? 'on' : ''}" data-act="ev-filter" data-v="${k}">${l}</button>`).join('')}</div>
      <select id="ev-year" style="width:auto"><option value="">Tutti gli anni</option>${years.map(y => `<option ${String(y) === yr ? 'selected' : ''}>${y}</option>`).join('')}</select></div>
    ${list.length ? `<div class="evcards">${cards}</div>` : `<div class="empty"><h3>Nessun evento</h3><p>Crea il primo evento per iniziare il questionario con i clienti.</p><button class="btn" data-act="new-event">＋ Nuovo evento</button> <button class="btn alt" data-act="load-demo">Carica evento di esempio</button> <button class="btn sand" data-act="demo-40">Aggiungi i 40 eventi di esempio</button></div>`}`;
}
ACTIONS['ev-filter'] = el => { UI.evF = el.dataset.v; rr(); };
document.addEventListener('change', e => { if (e.target.id === 'ev-year') { UI.evY = e.target.value; rr(); } });
ACTIONS['load-demo'] = () => {
  // Evento di esempio ricavato dal contratto del 31/12/2025 (compenso € 15.520 + IVA): serve a verificare il motore dei prezzi.
  const E = newEvent(); const L = S.settings.locations[0]; if (L) applyLocation(E, L.id);
  Object.assign(E.q, { sposo1: 'Roberto Armentaro', tel: '0000000000', email: 'esempio@esempio.it', sposo2: 'Francesca Verri', planner: 'Roberto Armentaro WP', data: '2027-06-19', firma: '2025-12-31', pasto: 'Cena', rito: 'Rito simbolico', adulti: 90, bambini: 0, neonati: 0, note: 'Ricevimento dalle 16:30 alle 02:00. Rito simbolico. Contratto del 31/12/2025.' });
  E.creato = '2025-12-02T10:00:00.000Z'; autoDates(E);
  E.addons.buv_ben = { on: true, variante: 'base' }; E.addons.cocktail = { on: true, variante: '3h' };
  E.econ.rettifiche.push({ desc: 'Sconto dedicato per l\'inserimento della totalità dei servizi aggiuntivi (−€ 2,00 × 90 ospiti)', importo: -180 });
  syncPagamenti(E); S.events.unshift(E); save(); go(`e/${E.id}/evento/questionario`);
};

/* ---------------------------------------------------------------- helper di editing (impostazioni e catalogo) */
const sb = (path, extra = '') => `data-s data-b="${path}" ${extra}`;
const tin = (label, path, val, o = {}) => `<div class="field ${o.w2 ? 'w2' : ''}"><label>${label}</label><input type="${o.type || 'text'}" ${o.step ? `step="${o.step}"` : ''} ${sb(path, o.hook ? `data-hook="${o.hook}"` : '')} ${o.r ? 'data-r' : ''} value="${esc(val ?? '')}" placeholder="${esc(o.ph || '')}"></div>`;
const tarea = (label, path, arr, mode = 'lines', o = {}) => `<div class="field ${o.wide ? 'wide' : ''}"><label>${label}</label><textarea ${sb(path)} data-${mode}>${esc(Array.isArray(arr) ? arr.join(mode === 'csv' ? ', ' : '\n') : (arr || ''))}</textarea></div>`;
const delBtn = (path, i, label = 'Elimina') => `<button class="btn ghost sm" data-act="cat-del" data-path="${path}" data-i="${i}">${label}</button>`;
const addBtn = (path, kind, label, extra = '') => `<button class="btn sm alt" data-act="cat-add" data-path="${path}" data-kind="${kind}" ${extra}>${label}</button>`;
const NEW = {
  recipe: () => ({ id: 'r-' + uid(), name: 'Nuovo piatto', desc: '', ing: [], semi: [], asm: ['Mise en place stoviglie e supporti', 'Composizione / impiattamento secondo scheda', 'Controllo finale al passe'], tags: [] }),
  isola: () => ({ id: 'is-' + uid(), tipo: 'show', nome: 'Nuova isola', sub: '', items: [] }),
  gruppo: () => ({ gruppo: 'Nuovo gruppo', items: [] }),
  str: () => 'Nuovo elemento',
  voce: () => ({ id: 'v-' + uid(), nome: 'Nuova voce di allestimento', opts: [] }),
  opt: () => ({ id: 'o-' + uid(), nome: 'Nuova opzione', sur: 0 }),
  agruppo: () => ({ gruppo: 'Nuovo gruppo', voci: [] }),
  consigliato: () => ({ id: 'mc-' + uid(), nome: 'Nuovo menù', entree: '', primo: '', secondo: '' }),
  extragroup: () => 'Nuovo gruppo',
  spazio: () => ({ momento: 'Nuovo momento', a: '', b: '' }),
  scad: () => ({ desc: 'Nuova rata', tipo: 'pct', valore: 10, quando: 'lavorativiPrima', n: 30 }),
  addon: () => ({ id: 'ad-' + uid(), nome: 'Nuovo servizio', cat: 'Altro', desc: '', prezzo: 0 }),
  variante: () => ({ id: 'va-' + uid(), nome: 'Nuova variante', prezzo: 0 }),
  listino: () => ({ id: 'l-' + uid(), nome: 'Nuovo listino', listino: 179, sabato: 179, feriale: 179, minAdulti: 100, scontoOltre: 10, scontoMancante: 60, minGarantito: 60 }),
  location: () => ({ id: 'loc-' + uid(), nome: 'Nuova location', listinoId: S.settings.listini[0] ? S.settings.listini[0].id : '', spazi: CAT.locationsSeed[0].spazi.map(s => ({ momento: s.momento, a: '', b: '' })) }),
};
ACTIONS['cat-add'] = el => {
  const arr = pget(S.settings, el.dataset.path); if (!Array.isArray(arr)) return;
  const item = NEW[el.dataset.kind](); if (el.dataset.tipo && item.tipo) item.tipo = el.dataset.tipo;
  arr.push(item); UI.open.add(el.dataset.path + '.' + (arr.length - 1)); save(); rr();
};
ACTIONS['cat-del'] = (el, ev) => {
  ev.preventDefault(); const arr = pget(S.settings, el.dataset.path), i = +el.dataset.i;
  if (!confirm('Eliminare questo elemento? Gli eventi che lo hanno già scelto potrebbero perdere il riferimento.')) return;
  arr.splice(i, 1); save(); rr();
};
ACTIONS['cat-move'] = (el, ev) => { ev.preventDefault(); const arr = pget(S.settings, el.dataset.path), i = +el.dataset.i, j = i + +el.dataset.d; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; save(); rr(); };

/* ---------------------------------------------------------------- IMPOSTAZIONI */
const SET_TABS = [['generale', 'Generali'], ['listini', 'Listini'], ['location', 'Location'], ['addon', 'Add-on'], ['scadenziario', 'Scadenziario'], ['team', 'Team e backup']];
function viewSettings() {
  const tab = ROUTE.tab, s = S.settings;
  const head = `<div class="secthead"><div><h1>Impostazioni</h1><p>Prezzi, listini, location, add-on e scadenziario. Il catalogo dei piatti e degli allestimenti è in «Catalogo menù».</p></div></div><div class="tabs">${SET_TABS.map(([k, t]) => `<a href="#/settings/${k}" class="${tab === k ? 'on' : ''}">${t}</a>`).join('')}</div>`;
  if (tab === 'generale') return head + `<div class="card"><h3>Parametri generali</h3><div class="fields">
    ${tin('Aliquota IVA %', 'iva', s.iva, { type: 'number', step: '0.5' })}
    ${tin('Prezzo bambino (€ a persona)', 'bambinoPrezzo', s.bambinoPrezzo, { type: 'number' })}
    ${tin('Prezzo neonato (€ a persona)', 'neonatoPrezzo', s.neonatoPrezzo, { type: 'number' })}
    ${tin('Costo pasto staff / fornitori (€ a persona)', 'staffPrezzo', s.staffPrezzo, { type: 'number' })}
    <div class="field"><label>Supplementi «a persona» calcolati su</label><select ${sb('supplementiSu', 'data-r')}><option value="adulti" ${s.supplementiSu === 'adulti' ? 'selected' : ''}>Ospiti adulti</option><option value="tutti" ${s.supplementiSu === 'tutti' ? 'selected' : ''}>Adulti + bambini</option></select></div></div>
    <p class="hint" style="margin-top:10px">Dall'Allegato A: IVA 10 % sulle quotazioni. I bambini pagano € 80 (menù bimbi); il costo del pasto staff entra nel preventivo quando lo imposti.</p></div>`;
  if (tab === 'listini') return head + `<div class="card"><div class="chead"><h3>Listini</h3>${addBtn('listini', 'listino', '＋ Nuovo listino', 'style="margin-left:auto"')}</div><p class="hint">Un listino definisce il prezzo a persona e le regole sul numero di ospiti. Si assegna a ogni location.</p>
    <table class="tb"><thead><tr><th>Nome</th><th class="num">Listino €</th><th class="num">Sabato €</th><th class="num">Dom–Ven €</th><th class="num">Min. adulti</th><th class="num">Sconto oltre €</th><th class="num">€ per ospite mancante</th><th class="num">Min. garantito</th><th></th></tr></thead><tbody>
    ${s.listini.map((l, i) => `<tr><td><input type="text" ${sb(`listini.${i}.nome`)} value="${esc(l.nome)}"></td>${['listino', 'sabato', 'feriale', 'minAdulti', 'scontoOltre', 'scontoMancante', 'minGarantito'].map(k => `<td class="num"><input type="number" style="width:78px" ${sb(`listini.${i}.${k}`)} value="${l[k]}"></td>`).join('')}<td>${s.locations.some(x => x.listinoId === l.id) ? '<span class="pill">in uso</span>' : delBtn('listini', i, '✕')}</td></tr>`).join('')}</tbody></table>
    <p class="hint" style="margin-top:8px">Regole del contratto: prezzo a persona per minimo N adulti paganti; dall'ospite N+1 sconto solo con Cocktail bar; sotto N adulti sconto per ogni ospite mancante fino al minimo garantito.</p></div>`;
  if (tab === 'location') return head + `<div class="row" style="margin-bottom:12px"><h3>Location</h3>${addBtn('locations', 'location', '＋ Nuova location', 'style="margin-left:auto"')}</div><p class="hint" style="margin-bottom:12px">Ogni location ha un listino e i suoi spazi Piano A / Piano B per momento. Scegliendola in un evento, gli spazi si precompilano e si possono poi modificare (con avviso di customizzazione).</p>
    ${s.locations.map((l, i) => `<details class="cedit" data-k="locations.${i}" ${UI.open.has('locations.' + i) ? 'open' : ''}><summary><span style="flex:1">${esc(l.nome)}</span><span class="pill">${esc((s.listini.find(x => x.id === l.listinoId) || {}).nome || 'nessun listino')}</span>${delBtn('locations', i)}</summary>
      <div class="fields" style="margin-top:12px">${tin('Nome', `locations.${i}.nome`, l.nome, { w2: 1 })}<div class="field"><label>Listino assegnato</label><select ${sb(`locations.${i}.listinoId`, 'data-r')}>${s.listini.map(x => `<option value="${x.id}" ${x.id === l.listinoId ? 'selected' : ''}>${esc(x.nome)}</option>`).join('')}</select></div></div>
      <table class="tb" style="margin-top:12px"><thead><tr><th>Momento</th><th>Piano A</th><th>Piano B</th><th></th></tr></thead><tbody>${l.spazi.map((sp, j) => `<tr><td><input type="text" ${sb(`locations.${i}.spazi.${j}.momento`)} value="${esc(sp.momento)}"></td><td><input type="text" ${sb(`locations.${i}.spazi.${j}.a`)} value="${esc(sp.a)}"></td><td><input type="text" ${sb(`locations.${i}.spazi.${j}.b`)} value="${esc(sp.b)}"></td><td>${delBtn(`locations.${i}.spazi`, j, '✕')}</td></tr>`).join('')}</tbody></table>
      <div style="margin-top:8px">${addBtn(`locations.${i}.spazi`, 'spazio', '＋ Aggiungi momento')}</div></details>`).join('') || '<div class="empty">Nessuna location. Creane una.</div>'}`;
  if (tab === 'addon') return head + `<div class="row" style="margin-bottom:12px"><h3>Add-on</h3>${addBtn('addons', 'addon', '＋ Nuovo add-on', 'style="margin-left:auto"')}</div><p class="hint" style="margin-bottom:12px">Servizi aggiuntivi selezionabili in ogni evento. Puoi aggiungerli, modificarli o toglierli.</p>
    ${s.addons.map((a, i) => { const mode = a.quota ? 'quota' : a.perOra ? 'ora' : 'persona'; return `<details class="cedit" data-k="addons.${i}" ${UI.open.has('addons.' + i) ? 'open' : ''}><summary><span style="flex:1">${esc(a.nome)}</span><span class="pill">${mode === 'quota' ? 'su quotazione' : mode === 'ora' ? 'all\'ora' : (a.varianti && a.varianti.length ? 'varianti' : eur(a.prezzo) + ' / pers')}</span>${delBtn('addons', i)}</summary>
      <div class="fields" style="margin-top:12px">${tin('Nome', `addons.${i}.nome`, a.nome, { w2: 1 })}${tin('Categoria', `addons.${i}.cat`, a.cat)}
        <div class="field"><label>Tipo di prezzo</label><select data-addon-mode="${i}"><option value="persona" ${mode === 'persona' ? 'selected' : ''}>€ a persona</option><option value="ora" ${mode === 'ora' ? 'selected' : ''}>€ all'ora</option><option value="quota" ${mode === 'quota' ? 'selected' : ''}>Su quotazione (forfait)</option></select></div>
        ${mode === 'quota' || (a.varianti && a.varianti.length) ? '' : tin(mode === 'ora' ? '€ all\'ora' : '€ a persona', `addons.${i}.prezzo`, a.prezzo, { type: 'number', step: '0.5' })}
        ${mode === 'persona' ? tin('Minimo persone (facoltativo)', `addons.${i}.minPers`, a.minPers, { type: 'number' }) : ''}
        <div class="field wide"><label>Descrizione</label><textarea ${sb(`addons.${i}.desc`)}>${esc(a.desc || '')}</textarea></div>
        ${tarea('Ingredienti / voci per il ricettario (una per riga)', `addons.${i}.ricetta`, a.ricetta || [], 'lines', { wide: 1 })}</div>
      <h4 style="margin:14px 0 6px">Varianti <span class="muted small" style="text-transform:none;letter-spacing:0">(es. 3 ore / 4 ore)</span></h4>
      ${(a.varianti || []).map((v, j) => `<div class="mini-row"><input type="text" style="flex:3" ${sb(`addons.${i}.varianti.${j}.nome`)} value="${esc(v.nome)}"><input type="number" step="0.5" style="width:96px" ${sb(`addons.${i}.varianti.${j}.prezzo`)} value="${v.prezzo}"><input type="text" style="flex:2" placeholder="voci del ricettario, separate da virgola" ${sb(`addons.${i}.varianti.${j}.items`)} data-csv value="${esc((v.items || []).join(', '))}">${delBtn(`addons.${i}.varianti`, j, '✕')}</div>`).join('')}
      ${addBtn(`addons.${i}.varianti`, 'variante', '＋ Aggiungi variante')}</details>`; }).join('') || '<div class="empty">Nessun add-on.</div>'}`;
  if (tab === 'scadenziario') return head + `<div class="card"><div class="chead"><h3>Scadenziario dei pagamenti</h3>${addBtn('scadenziario', 'scad', '＋ Rata', 'style="margin-left:auto"')}</div><p class="hint">Regole usate per generare in automatico le rate di ogni evento a partire dalla data della cerimonia. «Fisso» = importo in €; «% del totale» = percentuale; «completa al %» = porta il versato al % indicato.</p>
    <table class="tb"><thead><tr><th>Descrizione</th><th>Importo</th><th class="num">Valore</th><th>Scadenza</th><th class="num">Giorni</th><th></th></tr></thead><tbody>${s.scadenziario.map((r, i) => `<tr><td><input type="text" ${sb(`scadenziario.${i}.desc`)} value="${esc(r.desc)}"></td>
      <td><select ${sb(`scadenziario.${i}.tipo`)}>${[['fisso', '€ fisso'], ['pct', '% del totale'], ['cumulativo', 'completa al %']].map(([k, l]) => `<option value="${k}" ${r.tipo === k ? 'selected' : ''}>${l}</option>`).join('')}</select></td>
      <td class="num"><input type="number" style="width:84px" ${sb(`scadenziario.${i}.valore`)} value="${r.valore}"></td>
      <td><select ${sb(`scadenziario.${i}.quando`)}>${[['firma', 'dopo la firma del contratto'], ['giorniPrima', 'giorni di calendario prima dell\'evento'], ['lavorativiPrima', 'giorni lavorativi prima dell\'evento']].map(([k, l]) => `<option value="${k}" ${r.quando === k ? 'selected' : ''}>${l}</option>`).join('')}</select></td>
      <td class="num"><input type="number" style="width:76px" ${sb(`scadenziario.${i}.n`)} value="${r.n}"></td><td>${delBtn('scadenziario', i, '✕')}</td></tr>`).join('')}</tbody></table>
    <p class="hint" style="margin-top:8px">Esempio dal contratto (€ 15.520): € 2.000 alla firma → completa al 30 % un anno prima (€ 2.656) → 40 % a 120 giorni lavorativi (€ 6.208) → saldo a 10 giorni lavorativi (€ 4.656).</p></div>`;
  return head + teamCard() + dataCard() + demoCard() + `<div class="card" style="margin-top:16px"><h3>Backup dei dati</h3><p class="muted">${CLOUD ? 'Gli eventi sono nel cloud condiviso. Puoi scaricare una copia di sicurezza in qualsiasi momento.' : 'Gli eventi sono salvati nel browser di questo computer. Scarica un backup regolarmente, oppure per spostarli su un altro computer.'}</p>
  <div class="row"><button class="btn" data-act="backup">⭳ Scarica backup (.json)</button>${CLOUD ? '' : '<label class="btn alt">⭱ Ripristina da backup<input type="file" accept=".json" hidden id="restore-file"></label><button class="btn danger right" data-act="wipe">Cancella tutti i dati</button>'}</div></div>`;
}
document.addEventListener('change', e => {
  const sel = e.target.closest('[data-addon-mode]'); if (!sel) return;
  const a = S.settings.addons[+sel.dataset.addonMode]; delete a.quota; delete a.perOra;
  if (sel.value === 'quota') a.quota = true; else if (sel.value === 'ora') a.perOra = true;
  save(); rr();
});
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

/* ---------------------------------------------------------------- CATALOGO MENÙ PER ANNO */
const CAT_TABS = [['aperitivo', 'Aperitivo · isole'], ['tavola', 'A tavola'], ['dolci', 'Dolci e lounge'], ['bevande', 'Bevande'], ['allestimenti', 'Allestimenti']];
function recEditor(base, arr, i, r, noActions) {
  const path = `${base}.${i}`;
  return `<details class="cedit" data-k="${path}" ${UI.open.has(path) ? 'open' : ''}><summary><span style="flex:1">${esc(r.name)}${tagHtml(r)}</span>${noActions ? '' : `<button class="btn ghost sm" data-act="cat-move" data-path="${base}" data-i="${i}" data-d="-1" title="Su">↑</button><button class="btn ghost sm" data-act="cat-move" data-path="${base}" data-i="${i}" data-d="1" title="Giù">↓</button>${delBtn(base, i)}`}</summary>
    <div class="fields" style="margin-top:12px">${tin('Nome del piatto', `${path}.name`, r.name, { w2: 1 })}${tin('Etichette (vegano, vegetariano…)', `${path}.tags`, (r.tags || []).join(', '), { ph: 'separate da virgola' }).replace('data-s data-b', 'data-csv data-s data-b')}
      <div class="field wide"><label>Descrizione (come appare nel menù)</label><input type="text" ${sb(`${path}.desc`)} value="${esc(r.desc || '')}"></div></div>
    <div class="grid g3" style="margin-top:8px">${tarea('Materie prime (una per riga)', `${path}.ing`, r.ing)}${tarea('Semilavorati (una per riga)', `${path}.semi`, r.semi)}${tarea('Composizione del piatto (una per riga)', `${path}.asm`, r.asm)}</div>
    <div style="margin-top:8px">${tarea('Procedimento e note di cucina (visibili allo staff nel ricettario)', `${path}.proc`, r.proc || '', 'text', { wide: 1 })}</div></details>`;
}
const recList = (base, arr) => (arr || []).map((r, i) => recEditor(base, arr, i, r)).join('') + `<div style="margin-top:8px">${addBtn(base, 'recipe', '＋ Aggiungi piatto')}</div>`;
const strList = (base, arr, label) => `<div class="card"><h4 style="margin-bottom:8px">${label}</h4>${(arr || []).map((x, i) => `<div class="mini-row"><input type="text" style="flex:1" ${sb(`${base}.${i}`)} value="${esc(x)}">${delBtn(base, i, '✕')}</div>`).join('')}${addBtn(base, 'str', '＋ Aggiungi')}</div>`;

function viewCatalog() {
  const y = ROUTE.year, tab = ROUTE.tab, cur = new Date().getFullYear();
  const years = [...new Set([cur, cur + 1, ...Object.keys(S.settings.catalogs).map(Number)])].sort();
  const C = catalogByYear(y), b = `catalogs.${y}`;
  const head = `<div class="secthead"><div><h1>Catalogo menù</h1><p>Il menù dell'anno: isole, piatti a tavola, dolci, bevande e allestimenti che i clienti possono scegliere. Ogni evento usa il catalogo dell'anno della sua data. Quando esce il nuovo menù, creane l'anno e aggiornalo qui.</p></div></div>
    <div class="row" style="margin-bottom:6px">${years.map(yy => `<a class="btn ${yy === y ? '' : 'alt'}" href="#/catalog/${yy}/${tab}">${yy}${yy === cur ? ' · anno in corso' : yy === cur + 1 ? ' · anno futuro' : ''}</a>`).join('')}<button class="btn sm alt" data-act="cat-newyear">＋ Nuovo anno</button></div>
    <div class="tabs">${CAT_TABS.map(([k, t]) => `<a href="#/catalog/${y}/${k}" class="${tab === k ? 'on' : ''}">${t}</a>`).join('')}</div>`;
  let body = '';
  if (tab === 'aperitivo') body = `<div class="row" style="margin-bottom:10px"><h3>Isole d'aperitivo</h3><span class="right">${addBtn(`${b}.isole`, 'isola', '＋ Isola show-cooking', 'data-tipo="show"')} ${addBtn(`${b}.isole`, 'isola', '＋ Isola a passaggio', 'data-tipo="passaggio"')}</span></div>
    ${C.isole.map((is, i) => `<details class="cedit" data-k="${b}.isole.${i}" ${UI.open.has(`${b}.isole.${i}`) ? 'open' : ''}><summary><span style="flex:1">${esc(is.nome)}</span><span class="pill ${is.tipo === 'show' ? '' : 'warn'}">${is.tipo === 'show' ? 'show-cooking' : 'a passaggio'}</span><span class="pill">${is.items.length} ricette</span>${delBtn(`${b}.isole`, i)}</summary>
      <div class="fields" style="margin-top:12px">${tin('Nome dell\'isola', `${b}.isole.${i}.nome`, is.nome)}${tin('Sottotitolo', `${b}.isole.${i}.sub`, is.sub)}<div class="field"><label>Tipo</label><select ${sb(`${b}.isole.${i}.tipo`, 'data-r')}><option value="show" ${is.tipo === 'show' ? 'selected' : ''}>Show-cooking</option><option value="passaggio" ${is.tipo === 'passaggio' ? 'selected' : ''}>A passaggio</option></select></div></div>
      <h4 style="margin:14px 0 8px">Ricette dell'isola</h4>${recList(`${b}.isole.${i}.items`, is.items)}</details>`).join('')}`;
  else if (tab === 'tavola') body = `<h3 style="margin-bottom:10px">Pre-entrée</h3>${recList(`${b}.preEntree`, C.preEntree)}
    <h3 style="margin:22px 0 10px">Entrée</h3>${recList(`${b}.entree`, C.entree)}
    <div class="row" style="margin:22px 0 10px"><h3>Primi piatti</h3><span class="right">${addBtn(`${b}.primi`, 'gruppo', '＋ Nuovo gruppo di primi')}</span></div>
    ${C.primi.map((g, i) => `<div class="card"><div class="row"><input type="text" style="max-width:320px;font-weight:700" ${sb(`${b}.primi.${i}.gruppo`)} value="${esc(g.gruppo)}">${delBtn(`${b}.primi`, i, 'Elimina gruppo')}</div><div style="margin-top:10px">${recList(`${b}.primi.${i}.items`, g.items)}</div></div>`).join('')}
    <h3 style="margin:22px 0 10px">Secondi piatti</h3>${recList(`${b}.secondi`, C.secondi)}
    <h3 style="margin:22px 0 10px">Degustazione di formaggi</h3>${recList(`${b}.formaggi`, C.formaggi)}
    <div class="row" style="margin:22px 0 10px"><h3>Menù consigliati</h3><span class="right">${addBtn(`${b}.menuConsigliati`, 'consigliato', '＋ Nuovo menù consigliato')}</span></div>
    ${(C.menuConsigliati || []).map((m, i) => { const all = recipeIndexOf(C), opt = (list, cur) => `<option value="">—</option>${list.map(r => `<option value="${r.id}" ${r.id === cur ? 'selected' : ''}>${esc(r.name.slice(0, 70))}</option>`).join('')}`, prim = C.primi.flatMap(g => g.items); return `<div class="card"><div class="fields">${tin('Nome del menù', `${b}.menuConsigliati.${i}.nome`, m.nome)}
      <div class="field"><label>Entrée</label><select ${sb(`${b}.menuConsigliati.${i}.entree`)}>${opt(C.entree, m.entree)}</select></div><div class="field"><label>Primo</label><select ${sb(`${b}.menuConsigliati.${i}.primo`)}>${opt(prim, m.primo)}</select></div><div class="field"><label>Secondo</label><select ${sb(`${b}.menuConsigliati.${i}.secondo`)}>${opt(C.secondi, m.secondo)}</select></div></div><div style="margin-top:8px">${delBtn(`${b}.menuConsigliati`, i)}</div></div>`; }).join('')}
    <h3 style="margin:22px 0 10px">Menù bambini</h3><div class="card">${tarea('Nota', `${b}.menuBimbi.nota`, C.menuBimbi.nota, 'text')}${recList(`${b}.menuBimbi.items`, C.menuBimbi.items)}</div>`;
  else if (tab === 'dolci') body = `<h3 style="margin-bottom:10px">Dessert nuziale (a scelta)</h3>${recList(`${b}.dessert`, C.dessert)}
    <h3 style="margin:22px 0 10px">Torta da taglio (sempre inclusa)</h3>${recEditor(b, null, 'torta', C.torta, true)}
    <h3 style="margin:22px 0 10px">Lounge bar · dolci e piccola pasticceria</h3>${recList(`${b}.lounge.dolci`, C.lounge.dolci)}
    <div class="grid g3" style="margin-top:16px"><div class="card">${tarea('Brindisi', `${b}.brindisi`, C.brindisi, 'text')}</div><div class="card">${tarea('Amari', `${b}.lounge.amari`, C.lounge.amari, 'text')}</div><div class="card">${tarea('Vermouth corner', `${b}.lounge.vermouth`, C.lounge.vermouth, 'text')}</div></div>`;
  else if (tab === 'bevande') body = `<h3 style="margin-bottom:10px">Buvette d'aperitivo</h3><div class="card">${tin('Bollicina inclusa', `${b}.buvette.bollicina`, C.buvette.bollicina)}</div>
    <div class="grid g3" style="margin-top:12px">${strList(`${b}.buvette.cocktail`, C.buvette.cocktail, 'Cocktail d\'aperitivo (uno a scelta)')}${strList(`${b}.buvette.succhi`, C.buvette.succhi, 'Succhi di frutta')}${strList(`${b}.buvette.fissi`, C.buvette.fissi || [], 'Sempre inclusi (analcolici, acqua)')}</div>
    <h4 style="margin:16px 0 8px">Personalizzazioni buvette (quotazione separata)</h4><div class="grid g4">${Object.keys(C.buvette.extra).map(g => strList(`${b}.buvette.extra.${g}`, C.buvette.extra[g], g)).join('')}</div>
    <h3 style="margin:26px 0 10px">Vini a tavola</h3><div class="grid g2">${strList(`${b}.vini.bianchi`, C.vini.bianchi, 'Vini bianchi inclusi (uno a scelta)')}${strList(`${b}.vini.rossi`, C.vini.rossi, 'Vini rossi inclusi (uno a scelta)')}</div>
    <h4 style="margin:16px 0 8px">Etichette extra (quotazione separata)</h4><div class="grid g4">${Object.keys(C.vini.extra).map(g => strList(`${b}.vini.extra.${g}`, C.vini.extra[g], g)).join('')}</div>`;
  else body = `<div class="row" style="margin-bottom:10px"><h3>Allestimenti</h3><span class="right">${addBtn(`${b}.allestimenti`, 'agruppo', '＋ Nuovo gruppo')}</span></div><p class="hint" style="margin-bottom:12px">Ogni voce ha le opzioni tra cui il cliente sceglie. Il «supplemento» è in € a persona oltre IVA; «costo fisso» in € una tantum.</p>
    ${C.allestimenti.map((g, gi) => `<div class="card"><div class="row"><input type="text" style="max-width:300px;font-weight:700" ${sb(`${b}.allestimenti.${gi}.gruppo`)} value="${esc(g.gruppo)}">${delBtn(`${b}.allestimenti`, gi, 'Elimina gruppo')}<span class="right">${addBtn(`${b}.allestimenti.${gi}.voci`, 'voce', '＋ Voce')}</span></div>
      ${g.voci.map((v, vi) => `<details class="cedit" style="margin-top:10px" data-k="${b}.allestimenti.${gi}.voci.${vi}" ${UI.open.has(`${b}.allestimenti.${gi}.voci.${vi}`) ? 'open' : ''}><summary><span style="flex:1">${esc(v.nome)}</span>${v.fisso ? '<span class="pill ok">incluso</span>' : `<span class="pill">${(v.opts || []).length} opzioni</span>`}${delBtn(`${b}.allestimenti.${gi}.voci`, vi)}</summary>
        <div class="fields" style="margin-top:10px">${tin('Nome della voce', `${b}.allestimenti.${gi}.voci.${vi}.nome`, v.nome, { w2: 1 })}${tin(v.fisso ? 'Cosa è incluso' : 'Nota per il cliente', `${b}.allestimenti.${gi}.voci.${vi}.info`, v.info || '', { w2: 1 })}</div>
        ${v.fisso ? '' : `<table class="tb" style="margin-top:10px"><thead><tr><th>Opzione</th>${v.color ? '<th>Colore</th>' : ''}<th class="num">Suppl. €/pers</th><th class="num">Costo fisso €</th><th>Nota</th><th></th></tr></thead><tbody>${(v.opts || []).map((o, oi) => `<tr><td><input type="text" ${sb(`${b}.allestimenti.${gi}.voci.${vi}.opts.${oi}.nome`)} value="${esc(o.nome)}"></td>${v.color ? `<td><input type="color" ${sb(`${b}.allestimenti.${gi}.voci.${vi}.opts.${oi}.hex`)} value="${esc(o.hex || '#cccccc')}"></td>` : ''}<td class="num"><input type="number" style="width:76px" ${sb(`${b}.allestimenti.${gi}.voci.${vi}.opts.${oi}.sur`)} value="${o.sur ?? 0}"></td><td class="num"><input type="number" style="width:76px" ${sb(`${b}.allestimenti.${gi}.voci.${vi}.opts.${oi}.fix`)} value="${o.fix ?? ''}"></td><td><input type="text" ${sb(`${b}.allestimenti.${gi}.voci.${vi}.opts.${oi}.nota`)} value="${esc(o.nota || '')}"></td><td>${delBtn(`${b}.allestimenti.${gi}.voci.${vi}.opts`, oi, '✕')}</td></tr>`).join('')}</tbody></table><div style="margin-top:8px">${addBtn(`${b}.allestimenti.${gi}.voci.${vi}.opts`, 'opt', '＋ Aggiungi opzione')}</div>`}</details>`).join('')}</div>`).join('')}`;
  return head + `<div class="sp"></div>${body}`;
}
ACTIONS['cat-newyear'] = () => {
  const ys = Object.keys(S.settings.catalogs).map(Number), y = Math.max(...ys) + 1;
  S.settings.catalogs[y] = clone(S.settings.catalogs[Math.max(...ys)]); save(); go(`catalog/${y}/aperitivo`); toast(`Catalogo ${y} creato come copia del ${y - 1}: aggiornalo con il nuovo menù`);
};

/* ---------------------------------------------------------------- 40 EVENTI DI ESEMPIO (dati dimostrativi deterministici) */
const NOMI_F = 'Giulia Chiara Francesca Sara Martina Elena Alessia Valentina Federica Silvia Laura Paola Elisa Irene Beatrice Marta Arianna Noemi Camilla Ilaria'.split(' ');
const NOMI_M = 'Marco Luca Andrea Matteo Davide Simone Stefano Fabio Giorgio Enrico Alessio Gabriele Nicola Daniele Riccardo Paolo Michele Federico Lorenzo Tommaso'.split(' ');
const COGNOMI = 'Rossi Bianchi Ferrari Russo Romano Colombo Ricci Marino Greco Bruno Gallo Conti Mancini Costa Giordano Rizzo Lombardi Moretti Barbieri Fontana Santoro Mariani Rinaldi Caruso Ferrara Galli Martini Leone Longo Gentile Vitale Serra Coppola Perrone Bosio Actis Garrone Tron Bertinetti'.split(' ');
const AZIENDE = ['Tecnomeccanica Bosio Srl', 'Garrone & Figli Spa', 'Studio Legale Actis', 'Officine Bertinetti Srl', 'Cantine Perrone', 'Gruppo Mariani Srl', 'Studio Medico Leone', 'Tron Logistica Spa'];
const isDemo = E => !!E.demo;
const DEMO_REF = '2026-10-25';   // «oggi» di riferimento dei dati dimostrativi
/* [data, tipo, stato, location] — 10 nel 2026, 30 da marzo a settembre 2027; 30 matrimoni su 40 (75 %) */
const DEMO_PLAN = [
  ['2026-04-18', 'Matrimonio', 'Concluso', 'castella'], ['2026-05-23', 'Matrimonio', 'Concluso', 'demo-villa'], ['2026-06-20', 'Matrimonio', 'Concluso', 'castella'], ['2026-06-27', 'Evento aziendale', 'Concluso', 'demo-cascina'],
  ['2026-09-12', 'Matrimonio', 'Concluso', 'castella'], ['2026-09-26', 'Compleanno', 'Concluso', 'demo-villa'], ['2026-10-25', 'Matrimonio', 'Pronto', 'castella'], ['2026-10-31', 'Anniversario', 'Allestimenti', 'demo-villa'],
  ['2026-11-14', 'Matrimonio', 'Definizione menù', 'demo-cascina'], ['2026-12-12', 'Evento aziendale', 'Preventivo', 'castella'],
  ['2027-03-13', 'Evento aziendale', 'Confermato', 'castella'], ['2027-03-27', 'Matrimonio', 'Confermato', 'demo-villa'], ['2027-04-03', 'Matrimonio', 'Confermato', 'castella'], ['2027-04-10', 'Matrimonio', 'Definizione menù', 'demo-cascina'],
  ['2027-04-17', 'Matrimonio', 'Confermato', 'castella'], ['2027-04-24', 'Matrimonio', 'Preventivo', 'demo-villa'], ['2027-05-01', 'Matrimonio', 'Confermato', 'castella'], ['2027-05-08', 'Matrimonio', 'Confermato', 'demo-cascina'],
  ['2027-05-15', 'Matrimonio', 'Preventivo', 'castella'], ['2027-05-16', 'Battesimo / Comunione', 'Confermato', 'demo-villa'], ['2027-05-22', 'Matrimonio', 'Definizione menù', 'castella'], ['2027-05-29', 'Matrimonio', 'Preventivo', 'demo-villa'],
  ['2027-06-04', 'Matrimonio', 'Confermato', 'castella'], ['2027-06-05', 'Matrimonio', 'Confermato', 'demo-cascina'], ['2027-06-06', 'Evento aziendale', 'Preventivo', 'demo-villa'], ['2027-06-11', 'Compleanno', 'Preventivo', 'castella'],
  ['2027-06-12', 'Matrimonio', 'Confermato', 'castella'], ['2027-06-12', 'Matrimonio', 'Preventivo', 'demo-villa'], ['2027-06-20', 'Matrimonio', 'Annullato', 'demo-cascina'], ['2027-06-26', 'Matrimonio', 'Confermato', 'demo-villa'],
  ['2027-07-03', 'Matrimonio', 'Confermato', 'castella'], ['2027-07-10', 'Matrimonio', 'Preventivo', 'demo-cascina'], ['2027-07-17', 'Anniversario', 'Confermato', 'demo-villa'], ['2027-07-24', 'Matrimonio', 'Preventivo', 'castella'],
  ['2027-08-07', 'Matrimonio', 'Preventivo', 'demo-villa'], ['2027-08-28', 'Matrimonio', 'Preventivo', 'castella'], ['2027-09-04', 'Matrimonio', 'Confermato', 'castella'], ['2027-09-11', 'Matrimonio', 'Preventivo', 'demo-cascina'],
  ['2027-09-18', 'Matrimonio', 'Preventivo', 'demo-villa'], ['2027-09-25', 'Altro', 'Preventivo', 'castella'],
];
const DEMO_GUESTS = [6, 8, 12, 22];   // posizioni nel piano con elenco invitati e tavoli

function demoLocations() {
  const L = S.settings.locations, base = S.settings.listini.find(l => l.id === 'diamante-base') || S.settings.listini[0];
  if (!L.some(l => l.id === 'demo-villa')) L.push({ id: 'demo-villa', demo: true, nome: 'Villa Esempio (Torino)', listinoId: base.id, spazi: [{ momento: 'Cerimonia', a: 'Giardino all\'italiana', b: 'Salone delle feste' }, { momento: 'Aperitivo', a: 'Terrazza', b: 'Veranda' }, { momento: 'Cena', a: 'Orangerie', b: 'Salone delle feste' }, { momento: 'Taglio torta', a: 'Orangerie', b: 'Salone delle feste' }, { momento: 'Caffè e dolci / Lounge bar', a: 'Terrazza', b: 'Veranda' }, { momento: 'Cocktail bar', a: 'Cantina', b: 'Cantina' }] });
  if (!L.some(l => l.id === 'demo-cascina')) L.push({ id: 'demo-cascina', demo: true, nome: 'Cascina Esempio (Cuneo)', listinoId: base.id, spazi: [{ momento: 'Cerimonia', a: 'Aia', b: 'Fienile' }, { momento: 'Aperitivo', a: 'Cortile', b: 'Portico' }, { momento: 'Cena', a: 'Tensostruttura', b: 'Fienile' }, { momento: 'Taglio torta', a: 'Tensostruttura', b: 'Fienile' }, { momento: 'Caffè e dolci / Lounge bar', a: 'Cortile', b: 'Portico' }, { momento: 'Cocktail bar', a: 'Stalla', b: 'Stalla' }] });
}
/* costruisce i 40 eventi (deterministico: stesso risultato a ogni esecuzione) */
function buildDemoEvents() {
  let seed = 20261025; const r = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
  const pick = a => a[Math.floor(r() * a.length)], pickN = (a, k) => { const c = a.slice(), o = []; while (o.length < k && c.length) o.push(c.splice(Math.floor(r() * c.length), 1)[0]); return o; };
  const REF = new Date(DEMO_REF + 'T12:00:00'); demoLocations();
  const used = new Set();
  return DEMO_PLAN.map(([data, tipo, stato, loc], idx) => {
    const E = newEvent(); E.id = 'demo-' + String(idx + 1).padStart(2, '0'); E.demo = true; E.stato = stato; applyLocation(E, loc);
    const wedding = tipo === 'Matrimonio', nf = pick(NOMI_F), nm = pick(NOMI_M), c1 = pick(COGNOMI), c2 = pick(COGNOMI), sl = String(idx + 10).padStart(2, '0');
    const first = r() < 0.5 ? [nf, c1] : [nm, c1], second = first[0] === nf ? [nm, c2] : [nf, c2];
    let n1 = `${first[0]} ${first[1]}`, n2 = `${second[0]} ${second[1]}`, adulti, note = '', pasto = 'Cena', rito = 'Nessuna cerimonia';
    if (wedding) { adulti = 70 + Math.round(r() * 80); rito = pick(['Civile', 'Religiosa', 'Rito simbolico']); note = r() < 0.35 ? pick(['Vorrebbero un angolo con prodotti tipici della famiglia.', 'Ospiti anziani: prevedere sedute comode.', 'Parte degli ospiti arriva dall\'estero.', 'Cerimonia in giardino se il meteo lo permette.']) : ''; }
    else if (tipo === 'Evento aziendale') { n1 = pick(AZIENDE); n2 = ''; adulti = 45 + Math.round(r() * 65); note = pick(['Cena di fine anno con premiazioni.', 'Presentazione prodotto con aperitivo lungo.', 'Cena con i clienti principali.']); }
    else if (tipo === 'Compleanno') { n2 = ''; adulti = 35 + Math.round(r() * 35); note = pick(['Festa per i 50 anni, musica dal vivo.', 'Festa per i 18 anni con DJ.', 'Compleanno con torta a sorpresa.']); }
    else if (tipo === 'Battesimo / Comunione') { adulti = 30 + Math.round(r() * 20); pasto = 'Pranzo'; note = 'Pranzo in famiglia, menù semplice per i bambini.'; }
    else if (tipo === 'Anniversario') { adulti = 40 + Math.round(r() * 20); note = pick(['25 anni di matrimonio.', '50 anni di matrimonio, tavolo unico.']); }
    else { n2 = ''; adulti = 50 + Math.round(r() * 30); note = 'Cena di gala per laurea con ospiti da fuori regione.'; }
    if (r() < 0.8 && wedding) pasto = 'Cena'; else if (wedding) pasto = 'Pranzo';
    Object.assign(E.q, { sposo1: n1, tel: `+39 340 ${String(100 + idx * 37).slice(-3)} ${String(2000 + idx * 53).slice(-4)}`, email: `${n1.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '')}.${(n1.split(' ')[1] || 'info').toLowerCase().replace(/[^a-z]/g, '')}@esempio.it`,
      sposo2: n2, tel2: n2 && r() < 0.55 ? `+39 347 ${String(5000 + idx * 41).slice(-4)} ${sl}${sl}` : '', email2: n2 && r() < 0.4 ? `${second[0].toLowerCase()}.${second[1].toLowerCase()}@esempio.it` : '',
      planner: wedding && r() < 0.3 ? pick(['Wedding by Anna', 'Studio Eventi Torino', 'Sogni di Seta', 'WP Piemonte']) : '', provenienza: pick(['Passaparola', 'Instagram / social', 'Sito web', 'Wedding planner', 'Location', 'Open day / fiera']),
      tipo, pasto, rito, data, adulti, bambini: wedding || tipo.startsWith('Battesimo') ? (r() < 0.55 ? 1 + Math.floor(r() * 13) : 0) : 0, neonati: wedding && r() < 0.25 ? 1 + Math.floor(r() * 3) : 0, staff: wedding && r() < 0.5 ? 1 + Math.floor(r() * 4) : 0,
      budget: wedding ? pick(['', '15.000 €', '20.000 €', '25.000 €', '30.000 €']) : '', note });
    // anzianità del preventivo e firma
    const dd = new Date(data + 'T12:00:00'), maxCr = new Date(Math.min(REF.getTime() - 3 * 864e5, dd.getTime() - 20 * 864e5));
    const recent = stato === 'Preventivo' && dd > REF, cap = new Date(maxCr.getTime() - Math.floor(recent ? 2 + r() * 90 : 40 + r() * 280) * 864e5);
    E.creato = cap.toISOString();
    if (isConfirmed(E)) E.q.firma = addDaysISO(isoOf(cap), 6 + Math.floor(r() * 20));
    autoDates(E);
    // menù e allestimenti a seconda dell'avanzamento
    const C = catalogFor(E), prim = C.primi.flatMap(g => g.items), m = E.menu;
    const level = { Concluso: 3, Pronto: 3, Allestimenti: 3, 'Definizione menù': 2, Confermato: r() < 0.45 ? 2 : 1, Preventivo: pick([0, 0, 1, 2]), Annullato: 1 }[stato];
    if (level >= 1) { m.show = pickN(C.isole.filter(i => i.tipo === 'show'), 3).map(i => i.id); m.passaggio = pickN(C.isole.filter(i => i.tipo === 'passaggio'), 2).map(i => i.id); m.cocktail = pick(C.buvette.cocktail); m.succo = pick(C.buvette.succhi); }
    if (level >= 2) { m.entree = [pick(C.entree).id]; m.primi = [pick(prim).id]; m.secondi = [pick(C.secondi).id]; m.bianco = pick(C.vini.bianchi); m.rosso = pick(C.vini.rossi); m.dessert = pick(C.dessert).id; m.lounge = r() < 0.6 ? C.lounge.dolci.map(x => x.id) : pickN(C.lounge.dolci, 3).map(x => x.id); if (r() < 0.2) m.caffeAlt = pick(['Orzo', 'Dec', 'Ginseng']); }
    if (level >= 2 && r() < 0.12) m.extraBuvette = [pick(C.buvette.extra.Bollicine)];
    if (level >= 2 && r() < 0.1) m.show = pickN(C.isole.filter(i => i.tipo === 'show'), 4).map(i => i.id);
    if (level >= 2 && r() < 0.1) m.extraVini = [pick(C.vini.extra.Rossi)];
    if (level >= 3 || (level >= 2 && r() < 0.4)) C.allestimenti.forEach(g => g.voci.forEach(v => { if (!v.opts || !v.opts.length) return; const o = pick(v.opts.filter(x => !x.quota)); E.allest[v.id] = { opt: o.id, ok: (stato === 'Concluso' || stato === 'Pronto') ? true : level >= 3 && r() < 0.7 }; }));
    // add-on
    const A = S.settings.addons, setA = (id, on) => { const a = A.find(x => x.id === id); if (a && on) E.addons[id] = { on: true, variante: a.varianti ? pick(a.varianti).id : undefined }; };
    setA('buv_ben', r() < 0.5); setA('cocktail', r() < 0.45); setA('salato', r() < 0.2); setA('confettata', wedding && r() < 0.2); setA('tisane', r() < 0.1); setA('sigar', r() < 0.07); setA('gelati', r() < 0.05);
    if (E.addons.gelati) E.addons.gelati.prezzo = 650 + Math.round(r() * 5) * 100;
    // richieste speciali / spazi personalizzati / sconti
    if (r() < 0.22) { const t = pick([['isola', 'Isola live pasta', 'Show-cooking di pasta fresca con tre condimenti', 1200], ['dieta', 'Menù per celiaci', 'Alternativa senza glutine per 6 ospiti', 180], ['piatto', 'Piatto di famiglia', 'Lasagna della nonna come primo piatto', 0], ['altro', 'Angolo gelato', 'Carretto gelati artigianale per l\'aperitivo', 0]]); E.special.push({ id: 'sp-' + E.id, kind: t[0], tipo: SP_KINDS.find(x => x[0] === t[0])[1], titolo: t[1], descr: t[2], porzioni: '', prezzoUnit: '', forfait: t[3] || '', stato: t[3] ? pick(['Quotato', 'Approvato']) : 'Da valutare', sezione: pick(['Aperitivo', 'A tavola', 'Dolci']) }); }
    if (r() < 0.15 && E.q.spazi.length) E.q.spazi[0].a = pick(['Giardino', 'Terrazza panoramica', 'Chiesetta privata']);
    if (r() < 0.07) E.econ.rettifiche.push({ desc: 'Sconto fedeltà', importo: -Math.round(200 + r() * 600) });
    if (DEMO_GUESTS.includes(idx)) demoGuests(E, r, pick);
    // rate e pagamenti (rispetto alla data di riferimento)
    E.pagAuto = true; syncPagamenti(E);
    E.pagamenti.forEach((p, i) => { if (isConfirmed(E) && p.due && p.due < DEMO_REF && !(idx === 8 && i === 1)) p.paid = true; if (stato === 'Concluso') p.paid = true; });
    return E;
  });
}
function demoGuests(E, r, pick) {
  const q = E.q, mk = (fascia, n) => { for (let i = 0; i < n; i++) { const g = newGuest({ id: 'g' + E.guests.length + E.id.slice(-2), nome: pick(r() < 0.5 ? NOMI_F : NOMI_M), cognome: pick(COGNOMI), fascia }); if (r() < 0.13) g.allergie = [pick(CAT.allergie).k]; if (r() < 0.08) g.intolleranze = [pick(CAT.intolleranze).k]; const x = r(); if (x < 0.06) g.dieta = 'Vegetariano'; else if (x < 0.09) g.dieta = 'Vegano'; else if (x < 0.1) g.dieta = 'Pescetariano'; if (fascia === 'Bambino' && r() < 0.3) g.seggiolone = true; E.guests.push(g); } };
  mk('Adulto', +q.adulti || 0); mk('Bambino', +q.bambini || 0); mk('Neonato', +q.neonati || 0); mk('Staff', +q.staff || 0);
  const seatable = E.guests.filter(g => g.fascia !== 'Neonato'); let t = null;
  seatable.forEach(g => { if (!t || t.seats.every(Boolean)) { t = newTable(E, 'tondo', 10); t.id = 't' + E.tables.length + E.id.slice(-2); t.nome = `Tavolo ${E.tables.length + 1}`; E.tables.push(t); } t.seats[t.seats.indexOf(null)] = g.id; });
}
/* carica i dati dimostrativi (dal file generato) se non già presenti */
function loadScriptOnce(src) {
  if (window.DEMO_SEED) return Promise.resolve();
  if (CLOUD) return fetch(CFG.api + '/asset/' + src.split('/').pop(), { headers: { authorization: 'Bearer ' + getToken() } }).then(r => { if (!r.ok) throw new Error('asset'); return r.text(); }).then(code => { const s = document.createElement('script'); s.textContent = code; document.head.appendChild(s); });
  return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
}
async function loadDemoSeed() {
  await loadScriptOnce('js/demo-seed.js'); const seed = window.DEMO_SEED; let n = 0;
  (seed.settings.locations || []).forEach(l => { if (!S.settings.locations.some(x => x.id === l.id)) S.settings.locations.push(clone(l)); });
  seed.events.forEach(ev => { if (!S.events.some(x => x.id === ev.id)) { S.events.push(hydrate(clone(ev))); n++; } });
  save(); return n;
}
ACTIONS['demo-40'] = async () => { const n = await loadDemoSeed(); toast(n ? `Aggiunti ${n} eventi di esempio` : 'Gli eventi di esempio ci sono già'); go('home'); rr(); };
ACTIONS['demo-clear'] = async () => {
  const demo = S.events.filter(isDemo); if (!demo.length) return;
  if (!confirm(`Eliminare i ${demo.length} eventi di esempio (e le location di esempio)?`)) return;
  if (CLOUD) {
    toast('Eliminazione in corso…');
    const r = await http('POST', 'events/delete', { ids: demo.map(e => e.id) });
    if (!r.ok) { toast(r.body.error || 'Eliminazione non riuscita: riprova'); return; }
    demo.forEach(e => { delete REV[e.id]; delete BASE[e.id]; });
  }
  S.events = S.events.filter(e => !isDemo(e)); S.settings.locations = S.settings.locations.filter(l => !l.demo); save(); toast('Eventi di esempio eliminati'); go('home'); rr();
};
const demoCard = () => { const n = S.events.filter(isDemo).length; return `<div class="card" style="margin-top:16px"><h3>Dati dimostrativi</h3><p class="muted">40 eventi bozza per mostrare le funzioni: 10 nel 2026 e 30 da marzo a settembre 2027 (75 % matrimoni, il resto mix di altri eventi), con stati, menù, allestimenti, add-on, richieste speciali, rate e alcuni elenchi invitati.${n ? ` Al momento ci sono <b>${n}</b> eventi di esempio.` : ''}</p><div class="row">${n < 40 ? '<button class="btn sand" data-act="demo-40">＋ Aggiungi i 40 eventi di esempio</button>' : ''}${n ? `<button class="btn danger" data-act="demo-clear">Elimina gli eventi di esempio (${n})</button>` : ''}</div></div>`; };

/* ---------------------------------------------------------------- Ricettario (libreria per lo staff di cucina) */
const RL = { q: '', sec: '' };
function rlibGroups(C) {
  const g = [];
  C.isole.forEach(i => g.push([`Aperitivo · ${i.nome}`, i.items]));
  g.push(['Pre-entrée', C.preEntree], ['Entrée', C.entree]);
  C.primi.forEach(p => g.push([`Primi · ${p.gruppo}`, p.items]));
  g.push(['Secondi', C.secondi], ['Formaggi', C.formaggi], ['Dessert', [...C.dessert, ...(C.torta ? [C.torta] : [])]], ['Lounge · dolci', C.lounge.dolci], ['Menù bambini', (C.menuBimbi || {}).items || []]);
  return g.filter(([, a]) => a && a.length);
}
function viewRicettarioLib() {
  const cur = new Date().getFullYear(), y = ROUTE.year, C = catalogByYear(y), q = norm(RL.q);
  const years = [...new Set([cur, cur + 1, ...Object.keys(S.settings.catalogs).map(Number)])].sort();
  const groups = rlibGroups(C), top = [...new Set(groups.map(([n]) => n.split(' · ')[0]))];
  const body = groups.filter(([n]) => !RL.sec || n.split(' · ')[0] === RL.sec).map(([n, arr]) => {
    const f = arr.filter(r => !q || norm(r.name + ' ' + (r.desc || '') + ' ' + (r.ing || []).join(' ')).includes(q)); if (!f.length) return '';
    return `<div class="secbar"><h3>${esc(n)}</h3><span class="muted small">${f.length} ricette</span></div>${f.map(r => `<details class="rcp"><summary><div class="rn">${esc(r.name)}${tagHtml(r)}<small>${esc(r.desc || '')}</small></div></summary>
      <div class="body"><div><h4>🛒 Materia prima</h4><ul class="small">${(r.ing || []).map(x => `<li>${esc(x)}</li>`).join('') || '<li class="muted">—</li>'}</ul></div><div><h4>🥣 Semilavorati</h4><ul class="small">${(r.semi || []).map(x => `<li>${esc(x)}</li>`).join('') || '<li class="muted">—</li>'}</ul></div><div><h4>🍽 Composizione</h4><ul class="small">${(r.asm || []).map(x => `<li>${esc(x)}</li>`).join('') || '<li class="muted">—</li>'}</ul></div>
      <div style="grid-column:1/-1"><h4>👨‍🍳 Procedimento</h4><div class="small" style="white-space:pre-wrap">${r.proc ? esc(r.proc) : '<span class="muted">Nessun procedimento inserito.</span>'}</div></div></div></details>`).join('')}`;
  }).join('');
  return `<div class="secthead"><div><h1>Libreria ricette</h1><p>Tutte le ricette del menù ${y}: ingredienti, semilavorati, composizione e procedimento. ${AUTH.cucina ? '' : 'Per modificarle o aggiungere il procedimento vai in <a href="#/catalog/' + y + '/aperitivo">Catalogo menù</a>.'}</p></div><button class="btn alt noprint" onclick="window.print()">Stampa</button></div>
  <div class="row noprint" style="margin-bottom:10px">${years.map(yy => `<a class="btn ${yy === y ? '' : 'alt'}" href="#/ricettario/${yy}">${yy}</a>`).join('')}</div>
  <div class="toolbar noprint"><input type="text" id="rlq" placeholder="Cerca per nome o ingrediente…" value="${esc(RL.q)}"><select id="rlsec" style="width:auto"><option value="">Tutte le sezioni</option>${top.map(t => `<option ${RL.sec === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></div>
  ${body || '<div class="empty">Nessuna ricetta corrisponde alla ricerca.</div>'}`;
}
document.addEventListener('input', e => { if (e.target.id === 'rlq') { RL.q = e.target.value; const p = e.target.selectionStart; rr(); const n = $('#rlq'); if (n) { n.focus(); n.setSelectionRange(p, p); } } });
document.addEventListener('change', e => { if (e.target.id === 'rlsec') { RL.sec = e.target.value; rr(); } });

/* ---------------------------------------------------------------- Dove sono i dati */
function dataCard() {
  return `<div class="card" style="margin-top:16px"><h3>Dove sono salvati i dati</h3>
    ${CLOUD ? `<ul class="small" style="line-height:1.7"><li><b>Archivio principale</b>: Netlify Blobs, il database del tuo sito Netlify (progetto «lastella-gestionale»). Contiene eventi, impostazioni/cataloghi e account del team.</li>
      <li><b>Password</b>: salvate solo come hash (scrypt), nessuno, nemmeno io, può leggerle.</li>
      <li><b>Copia nel browser</b>: ogni computer tiene una copia per lavorare anche con connessione instabile; si risincronizza da sola.</li>
      <li><b>Link clienti</b>: il cliente scrive solo nel proprio evento, mai negli altri.</li>
      <li><b>Backup</b>: scarica regolarmente il file JSON qui sotto, è la tua assicurazione.</li></ul>` : '<p class="muted small">Modalità locale: i dati sono solo nel browser di questo computer. Scarica il backup qui sotto.</p>'}</div>`;
}
