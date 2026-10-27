/* =====================================================================
   Servizio: tavolo per tavolo, posto per posto, con tutte le esigenze alimentari
   + riepilogo delle esigenze (quante persone, di cui bambini) + riepilogo dei coperti
   ===================================================================== */
const SV = { open: new Set() };
const svName = g => [g.nome, g.cognome].filter(Boolean).join(' ') || 'Senza nome';
const svKid = g => g.fascia === 'Bambino' || g.fascia === 'Neonato';
const svTable = t => t.nome || 'Tavolo ' + t.num;

function svNeeds(E) {
  const map = new Map(), add = (key, ic, label, tipo, g) => { if (!map.has(key)) map.set(key, { ic, label, tipo, persone: [] }); map.get(key).persone.push(g); };
  const find = (list, k) => (typeof CAT !== 'undefined' && CAT[list] ? CAT[list].find(x => x.k === k) : null);
  E.guests.forEach(g => {
    (g.allergie || []).forEach(k => { const c = find('allergie', k); add('a:' + k, (c && c.icon) || '⚠', c ? c.label : k, 'Allergia', g); });
    (g.intolleranze || []).forEach(k => { const c = find('intolleranze', k); add('i:' + k, (c && c.icon) || '⚠', c ? c.label : k, 'Intolleranza', g); });
    if (g.dieta) { const c = find('diete', g.dieta); add('d:' + g.dieta, (c && c.icon) || '🌱', g.dieta, 'Dieta', g); }
    if (g.altro) add('o:' + norm(g.altro), '⚠', g.altro, 'Altro', g);
  });
  const order = { Allergia: 0, Intolleranza: 1, Dieta: 2, Altro: 3 };
  return [...map.values()].sort((a, b) => order[a.tipo] - order[b.tipo] || b.persone.length - a.persone.length || a.label.localeCompare(b.label, 'it'));
}
const svSeat = (E, g) => { const p = seatOf(E, g.id); return p ? `${svTable(p.t)} · posto ${p.i + 1}` : 'senza tavolo'; };

function svRecapNeeds(E) {
  const rows = svNeeds(E), withNeed = E.guests.filter(g => (g.allergie || []).length || (g.intolleranze || []).length || g.dieta || g.altro);
  const kids = withNeed.filter(svKid).length;
  return `<div class="card"><div class="chead"><h3>1 · Riepilogo esigenze alimentari</h3><span class="muted small">quante persone per ogni esigenza, di cui bambini</span></div>
    <div class="row" style="gap:10px;margin:8px 0 12px"><span class="pill bad">${withNeed.length} persone con esigenze</span><span class="pill">di cui ${kids} bambini</span><span class="pill">${E.guests.length - withNeed.length} senza esigenze</span></div>
    ${rows.length ? `<table class="tb"><thead><tr><th>Esigenza</th><th>Tipo</th><th class="num">Persone</th><th class="num">di cui bambini</th><th>Chi e dove</th></tr></thead><tbody>
    ${rows.map(r => `<tr><td><b>${r.ic} ${esc(r.label)}</b></td><td>${r.tipo}</td><td class="num"><b>${r.persone.length}</b></td><td class="num">${r.persone.filter(svKid).length}</td><td class="small">${r.persone.map(g => `${esc(svName(g))} <span class="muted">(${esc(svSeat(E, g))})</span>`).join(' · ')}</td></tr>`).join('')}</tbody></table>` : '<p class="muted">Nessuna esigenza segnalata nell\'elenco invitati.</p>'}</div>`;
}
function svRecapCoperti(E) {
  const c = { Adulto: 0, Bambino: 0, Neonato: 0, Staff: 0 }; E.guests.forEach(g => { c[g.fascia] = (c[g.fascia] || 0) + 1; });
  const segg = E.guests.filter(g => g.seggiolone).length, seated = E.guests.filter(g => seatOf(E, g.id)).length;
  const tabs = E.tables.slice().sort((a, b) => a.num - b.num).map(t => {
    const gs = t.seats.map(id => id && E.guests.find(g => g.id === id)).filter(Boolean);
    return { t, n: gs.length, ad: gs.filter(g => g.fascia === 'Adulto').length, bam: gs.filter(g => g.fascia === 'Bambino').length, neo: gs.filter(g => g.fascia === 'Neonato').length, st: gs.filter(g => g.fascia === 'Staff').length, ex: gs.filter(g => (g.allergie || []).length || (g.intolleranze || []).length || g.dieta || g.altro).length };
  });
  const tot = k => tabs.reduce((a, r) => a + r[k], 0);
  return `<div class="card"><div class="chead"><h3>2 · Riepilogo coperti</h3><span class="muted small">per quante persone, quanti bambini</span></div>
    <div class="tiles" style="margin:8px 0 12px"><div class="tile"><b>${E.guests.length}</b><span>Persone</span></div><div class="tile"><b>${c.Adulto}</b><span>Adulti</span></div><div class="tile"><b>${c.Bambino}</b><span>Bambini</span></div><div class="tile"><b>${c.Neonato}</b><span>Neonati</span></div><div class="tile"><b>${c.Staff}</b><span>Staff</span></div><div class="tile"><b>${segg}</b><span>Seggioloni</span></div></div>
    ${E.guests.length - seated ? `<div class="alert" style="margin-bottom:8px">${E.guests.length - seated} invitati non hanno ancora un posto.</div>` : ''}
    <table class="tb"><thead><tr><th>Tavolo</th><th class="num">Persone</th><th class="num">Adulti</th><th class="num">Bambini</th><th class="num">Neonati</th><th class="num">Staff</th><th class="num">Con esigenze</th></tr></thead><tbody>
    ${tabs.map(r => `<tr><td><b>${esc(svTable(r.t))}</b> <span class="muted small">${r.t.forma === 'rett' ? 'rettangolare' : 'tondo'}</span></td><td class="num">${r.n}/${r.t.seats.length}</td><td class="num">${r.ad}</td><td class="num">${r.bam}</td><td class="num">${r.neo}</td><td class="num">${r.st}</td><td class="num">${r.ex ? `<b>${r.ex}</b>` : 0}</td></tr>`).join('')}</tbody>
    <tfoot><tr><td>Totale seduti</td><td class="num">${tot('n')}</td><td class="num">${tot('ad')}</td><td class="num">${tot('bam')}</td><td class="num">${tot('neo')}</td><td class="num">${tot('st')}</td><td class="num">${tot('ex')}</td></tr></tfoot></table></div>`;
}
function svTables(E) {
  const T = E.tables.slice().sort((a, b) => a.num - b.num);
  return `<div class="card"><div class="chead"><h3>3 · Servizio per tavolo</h3><span class="muted small">apri un tavolo per vedere i commensali posto per posto</span>
    <span class="right row noprint"><button class="btn sm alt" data-act="sv-all" data-v="1">Apri tutti</button><button class="btn sm alt" data-act="sv-all" data-v="0">Chiudi tutti</button></span></div>
    ${T.length ? T.map(t => {
      const gs = t.seats.map(id => id && E.guests.find(g => g.id === id)), occ = gs.filter(Boolean), ex = occ.filter(g => (g.allergie || []).length || (g.intolleranze || []).length || g.dieta || g.altro).length;
      return `<details class="rcp" data-svk="${t.id}" ${SV.open.has(t.id) ? 'open' : ''}><summary><div class="rn">${esc(svTable(t))}<small>${t.forma === 'rett' ? 'rettangolare' : 'tondo'} · ${occ.length}/${t.seats.length} persone · ${occ.filter(svKid).length} bambini</small></div>${ex ? `<span class="pill bad">⚠ ${ex} con esigenze</span>` : '<span class="pill ok">nessuna esigenza</span>'}</summary>
        <div style="padding:6px 14px 14px"><table class="tb"><thead><tr><th style="width:60px">Posto</th><th>Commensale</th><th>Fascia</th><th>Esigenze</th><th>Note</th></tr></thead><tbody>
        ${gs.map((g, i) => g ? `<tr class="${(g.allergie || []).length || g.altro ? 'warnrow' : ''}"><td><b>${i + 1}</b></td><td><b>${esc(svName(g))}</b></td><td>${esc(g.fascia)}${g.seggiolone ? ' · 🪑 seggiolone' : ''}</td><td>${SeatPlan.flagsOf(g).length ? SeatPlan.flagHtml(SeatPlan.flagsOf(g)) : '<span class="muted">—</span>'}</td><td class="small">${esc(g.note || '')}</td></tr>` : `<tr><td>${i + 1}</td><td colspan="4" class="muted">posto libero</td></tr>`).join('')}</tbody></table></div></details>`;
    }).join('') : '<div class="empty">Nessun tavolo: crea la mappa in Evento → Tavoli e mappa.</div>'}</div>`;
}
VIEWS.servizio = E => `<div class="secthead"><div><h2>Servizio</h2><p>Dalla mappa dei tavoli: i commensali posto per posto con tutte le allergie, intolleranze e diete, e i riepiloghi per la cucina e la sala.</p></div><div class="row right noprint"><button class="btn alt" data-act="sv-print">🖨 Stampa</button></div></div>
  ${svRecapNeeds(E)}<div class="sp"></div>${svRecapCoperti(E)}<div class="sp"></div>${svTables(E)}`;
document.addEventListener('toggle', e => { const d = e.target; if (d.dataset && d.dataset.svk) { d.open ? SV.open.add(d.dataset.svk) : SV.open.delete(d.dataset.svk); } }, true);
ACTIONS['sv-all'] = el => { const E = curEvent(); E.tables.forEach(t => (el.dataset.v === '1' ? SV.open.add(t.id) : SV.open.delete(t.id))); rr(); };
ACTIONS['sv-print'] = () => { document.querySelectorAll('details[data-svk]').forEach(d => { d.open = true; }); window.print(); };
