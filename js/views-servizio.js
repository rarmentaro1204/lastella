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
        <div style="padding:6px 14px 14px"><table class="tb"><thead><tr><th style="width:60px">Posto</th><th>Commensale</th><th>Fascia</th><th>Esigenze</th><th>Modifiche al menù principale</th></tr></thead><tbody>
        ${gs.map((g, i) => g ? `<tr class="${(g.allergie || []).length || g.altro ? 'warnrow' : ''}"><td><b>${i + 1}</b></td><td><b>${esc(svName(g))}</b></td><td>${esc(g.fascia)}${g.seggiolone ? ' · 🪑 seggiolone' : ''}</td><td>${SeatPlan.flagsOf(g).length ? SeatPlan.flagHtml(SeatPlan.flagsOf(g)) : '<span class="muted">—</span>'}</td><td class="small">${svModsCell(E, g)}</td></tr>` : `<tr><td>${i + 1}</td><td colspan="4" class="muted">posto libero</td></tr>`).join('')}</tbody></table></div></details>`;
    }).join('') : '<div class="empty">Nessun tavolo: crea la mappa in Evento → Tavoli e mappa.</div>'}</div>`;
}
/* ---- portate del menù principale e modifiche per commensale ---- */
function svCourses(E) {
  const C0 = catalogFor(E), IDX = recipeIndexOf(C0), m = E.menu, nm = id => (IDX[id] || {}).name || id, out = [];
  const isl = ids => ids.map(id => C0.isole.find(i => i.id === id)).filter(Boolean).map(i => i.nome);
  out.push({ key: 'aperitivo', nome: 'Aperitivo', piatti: [...isl(m.show).map(x => 'Show-cooking: ' + x), ...isl(m.passaggio).map(x => 'A passaggio: ' + x), [C0.buvette.bollicina.split(',')[0], m.cocktail, m.succo && 'succo ' + m.succo.toLowerCase()].filter(Boolean).join(' · ')].filter(Boolean) });
  out.push({ key: 'pre', nome: 'Pre-entrée', piatti: m.pre.map(nm) }, { key: 'entree', nome: 'Entrée', piatti: m.entree.map(nm) }, { key: 'primo', nome: 'Primo piatto', piatti: m.primi.map(nm) }, { key: 'secondo', nome: 'Secondo piatto', piatti: m.secondi.map(nm) });
  if (m.formaggi) out.push({ key: 'formaggi', nome: 'Formaggi', piatti: ['Degustazione di formaggi'] });
  out.push({ key: 'dessert', nome: 'Dessert', piatti: m.dessert ? [nm(m.dessert), 'Torta da taglio', 'Brindisi'] : [] });
  out.push({ key: 'lounge', nome: 'Lounge bar', piatti: [...m.lounge.map(nm), m.caffeAlt && 'Caffè: ' + m.caffeAlt].filter(Boolean) });
  if (E.custom && E.custom.attivo) (E.custom.sezioni || []).forEach((sz, i) => out.push({ key: 'cm' + i, nome: (sz.nome || 'Portata') + ' (menù personalizzato)', piatti: (sz.items || []).map(nm) }));
  return out.filter(c => c.piatti.length);
}
const svCourseOptions = E => [...svCourses(E).map(c => [c.key, c.nome]), ['altro', 'Altro / tutto il menù']];
const svCourseName = (E, k) => (svCourseOptions(E).find(x => x[0] === k) || [k, k])[1];
function svModsCell(E, g) {
  const mods = g.mods || [], needs = SeatPlan.flagsOf(g).length;
  return `${mods.map((x, i) => `<div style="margin-bottom:3px"><span class="pill warn">${esc(svCourseName(E, x.c))}</span> ${esc(x.t)} <button class="btn ghost sm noprint" data-act="sv-mod-del" data-g="${g.id}" data-i="${i}">✕</button></div>`).join('')}
    ${g.note ? `<div class="muted" style="margin-bottom:3px">Nota: ${esc(g.note)}</div>` : ''}
    <div class="row noprint" style="gap:4px"><select id="svc-${g.id}" style="width:auto;max-width:130px">${svCourseOptions(E).map(([k, l]) => `<option value="${k}">${esc(l)}</option>`).join('')}</select><input type="text" id="svt-${g.id}" style="flex:1;min-width:120px" placeholder="${needs ? 'es. senza glutine, sostituire con…' : 'modifica al menù…'}"><button class="btn sm alt" data-act="sv-mod-add" data-g="${g.id}">＋</button></div>`;
}
ACTIONS['sv-mod-add'] = el => {
  const E = curEvent(), g = E.guests.find(x => x.id === el.dataset.g), t = document.getElementById('svt-' + g.id).value.trim(); if (!t) return;
  (g.mods = g.mods || []).push({ c: document.getElementById('svc-' + g.id).value, t }); SV.open.add(seatOf(E, g.id) ? seatOf(E, g.id).t.id : ''); save(); rr();
};
ACTIONS['sv-mod-del'] = el => { const g = curEvent().guests.find(x => x.id === el.dataset.g); g.mods.splice(+el.dataset.i, 1); save(); rr(); };

/* ---- ordine di servizio: sequenza delle portate con orario e note ---- */
function svSteps(E) {
  const cs = svCourses(E), by = Object.fromEntries(cs.map(c => [c.key, c])), ord = (E.servizio && E.servizio.order) || [];
  return [...ord.filter(k => by[k]), ...cs.map(c => c.key).filter(k => !ord.includes(k))].map(k => by[k]);
}
function svOrdine(E) {
  const steps = svSteps(E), st = (E.servizio && E.servizio.steps) || {}, sp = (E.q.spazi || []).filter(s => s.orario);
  return `<div class="card"><div class="chead"><h3>Ordine di servizio</h3><span class="muted small">la sequenza delle portate, con orario e note per sala e cucina</span><span class="right row noprint"><button class="btn sm alt" data-act="sv-print-all">🖨 Stampa ordine di servizio e tavoli</button></span></div>
    ${sp.length ? `<p class="small muted" style="margin:6px 0">Orari degli spazi: ${sp.map(s => `<b>${esc(s.momento)}</b> ${esc(s.orario)}`).join(' · ')}</p>` : ''}
    ${steps.length ? `<table class="tb"><thead><tr><th style="width:70px"></th><th style="width:100px">Ora</th><th>Portata</th><th>Piatti</th><th>Note di servizio</th></tr></thead><tbody>
    ${steps.map((c, i) => `<tr><td class="noprint"><button class="btn ghost sm" data-act="sv-step-move" data-k="${c.key}" data-d="-1" ${i === 0 ? 'disabled' : ''}>↑</button><button class="btn ghost sm" data-act="sv-step-move" data-k="${c.key}" data-d="1" ${i === steps.length - 1 ? 'disabled' : ''}>↓</button></td>
      <td><input type="time" data-b="servizio.steps.${c.key}.ora" value="${esc((st[c.key] || {}).ora || '')}"></td><td><b>${i + 1} · ${esc(c.nome)}</b></td><td class="small">${c.piatti.map(esc).join('<br>')}</td><td><input type="text" data-b="servizio.steps.${c.key}.nota" value="${esc((st[c.key] || {}).nota || '')}" placeholder="es. servire insieme ai tavoli 1–5"></td></tr>`).join('')}</tbody></table>` : '<p class="muted">Compila il menù per generare l\'ordine di servizio.</p>'}</div>`;
}
ACTIONS['sv-step-move'] = el => {
  const E = curEvent(), keys = svSteps(E).map(c => c.key), i = keys.indexOf(el.dataset.k), j = i + +el.dataset.d; if (j < 0 || j >= keys.length) return;
  [keys[i], keys[j]] = [keys[j], keys[i]]; (E.servizio = E.servizio || { steps: {} }).order = keys; save(); rr();
};
ACTIONS['sv-print-all'] = () => {
  const E = curEvent(), steps = svSteps(E), st = (E.servizio && E.servizio.steps) || {}, T = E.tables.slice().sort((a, b) => a.num - b.num), cs = svCourses(E);
  const w = window.open('', '_blank'); if (!w) { toast('Consenti i popup per stampare'); return; }
  const fl = g => SeatPlan.flagsOf(g).map(f => `${f[0]} ${esc(f[1])}`).join(', ');
  const head = `<div class="hd"><b>LA STELLA</b> · ${esc(evName(E))} · ${esc(fmtDate(E.q.data))} · ${esc(E.q.locationNome || '')}</div>`;
  const ordine = `<section>${head}<h1>Ordine di servizio</h1><table><tr><th>Ora</th><th>Portata</th><th>Piatti</th><th>Note</th></tr>${steps.map((c, i) => `<tr><td>${esc((st[c.key] || {}).ora || '')}</td><td><b>${i + 1} · ${esc(c.nome)}</b></td><td>${c.piatti.map(esc).join('<br>')}</td><td>${esc((st[c.key] || {}).nota || '')}</td></tr>`).join('')}</table></section>`;
  const tavoli = T.map(t => {
    const gs = t.seats.map((id, i) => ({ g: id && E.guests.find(x => x.id === id), i })).filter(x => x.g);
    const mods = gs.filter(x => (x.g.mods || []).length || SeatPlan.flagsOf(x.g).length);
    return `<section>${head}<h1>${esc(t.nome || 'Tavolo ' + t.num)} <small>${gs.length} persone · ${gs.filter(x => x.g.fascia === 'Bambino' || x.g.fascia === 'Neonato').length} bambini</small></h1>
      <h2>Menù principale</h2><table>${cs.map(c => `<tr><td style="width:150px"><b>${esc(c.nome)}</b></td><td>${c.piatti.map(esc).join(' · ')}</td></tr>`).join('')}</table>
      <h2>Commensali</h2><table><tr><th style="width:40px">Posto</th><th>Nome</th><th>Fascia</th><th>Esigenze</th></tr>${gs.map(x => `<tr><td>${x.i + 1}</td><td>${esc(svName(x.g))}</td><td>${esc(x.g.fascia)}</td><td>${fl(x.g) || '—'}</td></tr>`).join('')}</table>
      <h2>Modifiche al menù principale</h2>${mods.length ? `<table>${mods.map(x => `<tr><td style="width:40px">${x.i + 1}</td><td style="width:160px"><b>${esc(svName(x.g))}</b></td><td>${(x.g.mods || []).map(m => `<b>${esc(svCourseName(E, m.c))}:</b> ${esc(m.t)}`).join('<br>') || '<i>esigenze segnalate, nessuna variazione indicata</i>'}</td></tr>`).join('')}</table>` : '<p>Nessuna modifica: tutto il tavolo segue il menù principale.</p>'}</section>`;
  }).join('');
  w.document.write(`<!doctype html><meta charset="utf-8"><title>Ordine di servizio</title><style>body{font-family:Arial,sans-serif;color:#222;margin:0;font-size:12px}section{padding:24px 30px;page-break-after:always}.hd{color:#a8907a;font-size:11px;letter-spacing:.1em;margin-bottom:8px}h1{font-family:Georgia,serif;font-weight:400;font-size:24px;margin:4px 0 12px}h1 small{font-size:13px;color:#666}h2{font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#a8907a;margin:16px 0 6px}table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #ddd;padding:5px 6px;text-align:left;vertical-align:top}th{font-size:10px;text-transform:uppercase;color:#777}@page{margin:10mm}</style>${ordine}${tavoli}<script>onload=()=>print()<\/script>`);
  w.document.close();
};
VIEWS.servizio = E => `<div class="secthead"><div><h2>Servizio</h2><p>Dalla mappa dei tavoli: i commensali posto per posto con tutte le allergie, intolleranze e diete, e i riepiloghi per la cucina e la sala.</p></div><div class="row right noprint"><button class="btn alt" data-act="sv-print">🖨 Stampa</button></div></div>
  ${svOrdine(E)}<div class="sp"></div>${svRecapNeeds(E)}<div class="sp"></div>${svRecapCoperti(E)}<div class="sp"></div>${svTables(E)}`;
document.addEventListener('toggle', e => { const d = e.target; if (d.dataset && d.dataset.svk) { d.open ? SV.open.add(d.dataset.svk) : SV.open.delete(d.dataset.svk); } }, true);
ACTIONS['sv-all'] = el => { const E = curEvent(); E.tables.forEach(t => (el.dataset.v === '1' ? SV.open.add(t.id) : SV.open.delete(t.id))); rr(); };
ACTIONS['sv-print'] = () => { document.querySelectorAll('details[data-svk]').forEach(d => { d.open = true; }); window.print(); };
