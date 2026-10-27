/* =====================================================================
   Sezione 05 · ECONOMICS (preventivo)   06 · RICETTARIO
   ===================================================================== */

/* ---------------------------------------------------------------- riepilogo scelte */
let RIDX = {};
const rname = id => (RIDX[id] || {}).name || id;
function summaryBlocks(E) {
  const C = catalogFor(E); RIDX = recipeIndexOf(C);
  const m = E.menu, f = CAT.formule.find(x => x.id === m.formula) || CAT.formule[0], out = [];
  const isl = ids => ids.map(id => C.isole.find(i => i.id === id)).filter(Boolean).map(i => `${i.nome} (${i.items.length})`);
  const ap = [];
  if (m.show.length) ap.push(['Show-cooking', isl(m.show).join(' · ')]);
  if (m.passaggio.length) ap.push(['A passaggio', isl(m.passaggio).join(' · ')]);
  ap.push(['Buvette', [C.buvette.bollicina.split(',')[0], m.cocktail, m.succo && 'succo ' + m.succo.toLowerCase(), 'acqua', 'Coca Cola in vetro'].filter(Boolean).join(' · ')]);
  if (m.extraBuvette.length) ap.push(['Extra buvette (quotazione separata)', m.extraBuvette.join(' · ')]);
  if (m.esclusiva) ap.push(['Ricetta in esclusiva (quotazione separata)', rname(m.esclusiva)]);
  out.push(['Aperitivo', ap]);
  const tv = [['Formula', f.nome]];
  [['Pre-entrée', m.pre], ['Entrée', m.entree], ['Primo piatto', m.primi], ['Secondo piatto', m.secondi]].forEach(([l, a]) => { if (a.length) tv.push([l, a.map(rname).join(' / ')]); });
  if (m.formaggi) tv.push(['Formaggi', 'Degustazione di formaggi']);
  if (m.bianco || m.rosso) tv.push(['Vini', [m.bianco, m.rosso].filter(Boolean).join(' · ')]);
  if (m.extraVini.length) tv.push(['Etichette extra (quotazione separata)', m.extraVini.join(' · ')]);
  out.push(['A tavola', tv]);
  const ds = [];
  if (m.dessert) ds.push(['Dessert nuziale', rname(m.dessert) + ' · torta da taglio · brindisi']);
  if (m.lounge.length) ds.push(['Lounge · piccola pasticceria', m.lounge.map(rname).join(' · ')]);
  if (m.caffeAlt) ds.push(['Caffè alternativo', m.caffeAlt]);
  out.push(['Dessert e lounge', ds]);
  const al = [];
  C.allestimenti.forEach(g => g.voci.forEach(v => { if (!v.opts) return; const st = E.allest[v.id] || {}, o = v.opts.find(x => x.id === st.opt); if (o) al.push([v.nome, o.nome + (st.testo ? ` (${st.testo})` : '') + (st.ok ? ' ✓' : '')]); }));
  out.push(['Allestimenti', al]);
  const ad = S.settings.addons.filter(a => (E.addons[a.id] || {}).on && !a.link).map(a => { const v = addonVariant(a, E.addons[a.id]); return [a.nome, v ? v.nome.split(' · ')[0] : '']; });
  out.push(['Add-on', ad]);
  out.push(['Richieste speciali', E.special.filter(s => s.stato !== 'Rifiutato').map(s => [s.tipo, s.titolo])]);
  return out.filter(([, a]) => a.length);
}

/* ---------------------------------------------------------------- ECONOMICS */
VIEWS.economics = E => {
  if (syncPagamenti(E)) save();
  const cust = customizations(E);
  const q = computeQuote(E), c = completeness(E), L = q.listino;
  const secs = []; q.lines.forEach(l => { let s = secs.find(x => x.n === l.sec); if (!s) secs.push(s = { n: l.sec, lines: [], tot: 0 }); s.lines.push(l); s.tot += l.tot; });
  const todayIt = new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
  const sum = summaryBlocks(E);
  const doc = `<div class="quote" id="quote"><div class="qh"><b>LA STELLA</b><i>NEW CONCEPT BANQUETING</i></div>
    <h1 style="font-size:34px;text-align:center">Preventivo ${E.q.tipo === 'Matrimonio' ? 'Wedding' : 'Evento'}</h1><p style="text-align:center;color:var(--muted);margin:6px 0 0">Proposta Diamante 2026 · elaborato il ${todayIt}</p>
    <h2>L'evento</h2><div class="kv"><div><span>Clienti</span>${esc(evName(E))}</div><div><span>Data</span>${esc(fmtDate(E.q.data))}</div><div><span>Location</span>${esc(E.q.locationNome || '—')}</div><div><span>Pranzo / cena</span>${esc(E.q.pasto)} · ${q.giorno === 'sabato' ? 'tariffa sabato' : 'tariffa domenica–venerdì'}</div>
      <div><span>Ospiti</span>${num(E.q.adulti)} adulti${+E.q.bambini ? ` · ${num(E.q.bambini)} bambini` : ''}${+E.q.neonati ? ` · ${num(E.q.neonati)} neonati` : ''}${+E.q.staff ? ` · ${num(E.q.staff)} staff` : ''}</div><div><span>Wedding planner</span>${esc(E.q.planner || '—')}</div></div>
    ${sum.length ? `<h2>Riepilogo delle scelte</h2><div class="sel">${sum.map(([t, rows]) => `<div><b>${t}</b>${rows.map(([k, v]) => `<div style="margin:2px 0"><span class="muted">${esc(k)}${v ? ':' : ''}</span> ${esc(v)}</div>`).join('')}</div>`).join('')}</div>` : ''}
    <h2>Quotazione</h2>
    <table class="tb" style="border:0"><thead><tr><th>Descrizione</th><th class="num">Q.tà</th><th class="num">Unitario</th><th class="num">Importo</th></tr></thead><tbody>
    ${secs.map(s => `<tr><td colspan="4" style="background:#faf8f5;font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--sand);font-weight:700">${esc(s.n)}</td></tr>${s.lines.map(l => `<tr><td>${esc(l.label)}</td><td class="num">${num(l.qty)}</td><td class="num">${eur(l.unit)}</td><td class="num">${eur(l.tot)}</td></tr>`).join('')}`).join('')}</tbody></table>
    <div class="totals"><div><span>Imponibile</span><b>${eur(q.imponibile)}</b></div><div><span>IVA ${S.settings.iva}%</span><b>${eur(q.iva)}</b></div><div class="big"><span>Totale</span><b>${eur(q.totale)}</b></div>
      ${q.coperti ? `<div class="small muted"><span>Per ospite (iva escl.)</span><span>${eur(q.imponibile / (+E.q.adulti || 1))}</span></div>` : ''}</div>
    ${condizioniPagamento(E, q)}
    ${E.econ.note ? `<h2>Note</h2><p style="white-space:pre-wrap">${esc(E.econ.note)}</p>` : ''}
    <div class="fine">Prezzi in euro oltre IVA nella misura di legge. Prezzi e condizioni soggetti a rivalutazione in base a data, location, numero di ospiti, allestimenti, servizi e personalizzazioni. Preventivo valido unicamente per la data e la location indicate${E.q.validita ? `, con validità fino al ${new Date(E.q.validita + 'T12:00:00').toLocaleDateString('it-IT')}` : ''}. Le scelte di allestimento vanno effettuate entro ${E.q.scadenzaAllest ? new Date(E.q.scadenzaAllest + 'T12:00:00').toLocaleDateString('it-IT') : 'la data concordata'}; le scelte food & beverage si definiscono in fase di definizione menù. Le ricette possono variare in base a reperibilità e qualità della materia prima.<br>La Stella Catering s.r.l. · Via Val Pellice 7/c, San Secondo di Pinerolo (TO) · P.IVA 12524970014 · info@cateringlastella.com · +39 339 385 8184</div></div>`;

  const rett = E.econ.rettifiche;
  const side = `<div class="econ-side noprint"><div class="card"><h4 style="margin-bottom:12px">Parametri del preventivo</h4><div class="fields" style="grid-template-columns:1fr 1fr">
      <div class="field"><label>Adulti</label><input type="number" data-b="q.adulti" data-r value="${E.q.adulti}"></div><div class="field"><label>Bambini</label><input type="number" data-b="q.bambini" data-r value="${E.q.bambini}"></div>
      <div class="field"><label>Neonati</label><input type="number" data-b="q.neonati" data-r value="${E.q.neonati}"></div>
      <div class="field"><label>Tariffa giorno</label><select data-b="q.giorno" data-r>${[['auto', 'Auto (' + (q.giorno === 'sabato' ? 'sab' : 'dom–ven') + ')'], ['sabato', 'Sabato'], ['feriale', 'Dom–Ven']].map(([k, l]) => `<option value="${k}" ${E.q.giorno === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div></div>
      <p class="hint" style="margin-top:10px">${esc(L.nome)}: listino € ${L.listino} → <b>€ ${q.P}</b> a persona (${q.giorno === 'sabato' ? 'sabato' : 'dom–ven'}). Regole: min ${L.minAdulti} adulti; sotto, −€ ${L.scontoMancante} per ospite mancante (min ${L.minGarantito}); dal ${L.minAdulti + 1}° ospite −€ ${L.scontoOltre} solo con cocktail bar.</p></div>
    ${cust.length ? `<div class="alert" style="margin-bottom:8px"><b>⚠ Customizzazioni (${cust.length})</b><div class="hint">Scostamenti da listino e catalogo: verificarli prima di inviare il preventivo.</div><ul style="margin:6px 0 0 18px;padding:0">${cust.map(c => `<li class="small"><b>${esc(c.sec)}</b> · ${esc(c.text)}</li>`).join('')}</ul></div>` : ''}
    ${q.warnings.map(w => `<div class="alert">${esc(w)}</div>`).join('')}${q.infos.map(w => `<div class="alert info">${esc(w)}</div>`).join('')}
    <div class="card" style="margin-top:16px"><h4 style="margin-bottom:10px">Rettifiche manuali</h4><p class="hint">Sconti (importo negativo) o maggiorazioni.</p>
      ${rett.map((r, i) => `<div class="row" style="gap:6px;margin-bottom:6px"><input type="text" style="flex:2" data-b="econ.rettifiche.${i}.desc" value="${esc(r.desc)}" placeholder="Descrizione"><input type="number" style="flex:1" data-b="econ.rettifiche.${i}.importo" data-r value="${r.importo}"><button class="btn ghost sm" data-act="rt-del" data-i="${i}">✕</button></div>`).join('')}
      <button class="btn sm alt" data-act="rt-add">＋ Aggiungi riga</button></div>
    <div class="card" style="margin-top:16px"><div class="field"><label>Note nel preventivo</label><textarea data-b="econ.note" data-r>${esc(E.econ.note)}</textarea></div></div>
    <div class="card" style="margin-top:16px"><div class="chead"><h4>Stato della pratica</h4><span class="pill right ${c.pct === 100 ? 'ok' : 'warn'}">${c.pct}%</span></div><div style="margin-top:8px">${c.items.map(i => `<div class="small" style="padding:2px 0;color:${i.ok ? 'var(--ok)' : 'var(--muted)'}">${i.ok ? '✓' : '○'} ${esc(i.label)}</div>`).join('')}</div></div>
    <div class="row" style="margin-top:16px"><button class="btn" onclick="document.body.classList.add('printing-quote');window.print();setTimeout(()=>document.body.classList.remove('printing-quote'),500)">🖨 Stampa / PDF</button><button class="btn alt" data-act="export-quote">⭳ Excel</button></div></div>`;
  return `<div class="secthead noprint"><div><h2>Economics</h2><p>Riepilogo di quanto scelto e detto, valorizzato con il listino. Il preventivo si aggiorna in tempo reale a ogni modifica di ospiti, allestimenti, add-on e richieste speciali.</p></div></div>
  ${accontiHtml(E, q)}<div class="econ-grid">${doc}${side}</div>${pagamentiHtml(E, q)}`;
};
/* acconti versati: qui si spunta ciò che il cliente ha già pagato (data, importo effettivo, modalità) */
const PAY_METHODS = ['Bonifico', 'Contanti', 'Assegno', 'Carta / POS', 'Altro'];
const grossOf = x => Math.round((Number(x.importo) || 0) * (1 + S.settings.iva / 100) * 100) / 100;
const paidOf = x => (x.paid ? (x.paidAmt !== undefined && x.paidAmt !== '' ? Number(x.paidAmt) || 0 : grossOf(x)) : 0);
function accontiHtml(E, q) {
  const P = E.pagamenti, versato = P.reduce((a, x) => a + paidOf(x), 0), tot = q.totale, residuo = Math.max(0, tot - versato), pct = tot ? Math.min(100, Math.round(versato / tot * 100)) : 0, n = P.filter(x => x.paid).length;
  const rows = P.map((x, i) => {
    const late = !x.paid && x.due && new Date(x.due + 'T23:59:59') < new Date();
    return `<div class="avoce ${x.paid ? 'done' : ''}" style="margin-bottom:8px"><div class="row" style="gap:12px;align-items:center;flex-wrap:wrap">
      <label class="row" style="gap:8px;flex:2;min-width:220px;cursor:pointer"><input type="checkbox" style="width:20px;height:20px" data-b="pagamenti.${i}.paid" data-hook="paytick" data-i="${i}" data-r ${x.paid ? 'checked' : ''}><span><b>${esc(x.desc || 'Rata ' + (i + 1))}</b><div class="hint">scadenza ${x.due ? new Date(x.due + 'T12:00:00').toLocaleDateString('it-IT') : '—'}${late ? ' <span class="pill bad">scaduta</span>' : ''}</div></span></label>
      <div style="min-width:120px"><div class="lbl2">Dovuto (iva incl.)</div><b>${eur(grossOf(x))}</b></div>
      ${x.paid ? `<div class="field" style="min-width:140px"><label>Data versamento</label><input type="date" data-b="pagamenti.${i}.paidAt" value="${esc(x.paidAt || '')}"></div>
        <div class="field" style="min-width:130px"><label>Importo versato (iva incl.)</label><input type="number" step="0.01" data-b="pagamenti.${i}.paidAmt" data-r value="${x.paidAmt === undefined ? '' : x.paidAmt}" placeholder="${grossOf(x)}"></div>
        <div class="field" style="min-width:130px"><label>Modalità</label><select data-b="pagamenti.${i}.paidMethod"><option value="">—</option>${PAY_METHODS.map(m => `<option ${x.paidMethod === m ? 'selected' : ''}>${m}</option>`).join('')}</select></div>
        <div class="field" style="flex:1;min-width:140px"><label>Nota</label><input type="text" data-b="pagamenti.${i}.paidNote" value="${esc(x.paidNote || '')}" placeholder="es. CRO, assegno n."></div>` : ''}</div></div>`;
  }).join('');
  return `<div class="card noprint" style="margin-bottom:16px"><div class="chead"><h3>Acconti versati</h3><span class="muted small">spunta le rate che il cliente ha già pagato</span></div>
    <div class="row" style="gap:10px;margin:8px 0 12px"><span class="pill ok">Versato ${eur(versato)}</span><span class="pill ${residuo ? 'warn' : 'ok'}">Residuo ${eur(residuo)}</span><span class="pill">Totale preventivo ${eur(tot)} iva incl.</span><span class="muted small">${n}/${P.length} rate versate</span><div class="progress grow" style="min-width:120px"><i style="width:${pct}%"></i></div><b>${pct}%</b></div>
    ${P.length ? rows : '<p class="muted">Nessuna rata: scegli la data dell\'evento nel Questionario per generare lo scadenziario.</p>'}</div>`;
}
HOOKS.paytick = el => {
  const x = curEvent().pagamenti[+el.dataset.i]; if (!x) return;
  if (el.checked) { x.paidAt = x.paidAt || isoOf(new Date()); } else { ['paidAt', 'paidAmt', 'paidMethod', 'paidNote'].forEach(k => delete x[k]); }
};
function pagamentiHtml(E, q) {
  const P = E.pagamenti, iva = S.settings.iva / 100, tot = P.reduce((a, x) => a + (Number(x.importo) || 0), 0), paid = P.filter(x => x.paid).reduce((a, x) => a + (Number(x.importo) || 0), 0);
  const diff = q.imponibile - tot;
  return `<div class="card noprint" style="margin-top:18px"><div class="chead"><h3>Scadenziario pagamenti</h3><span class="muted small">importi oltre IVA ${S.settings.iva}%</span>
    ${E.pagAuto ? '<span class="pill ok">automatico dalla data dell\'evento</span>' : '<span class="pill warn">modificato a mano</span> <button class="btn sm alt" data-act="pay-auto">Ricalcola automaticamente</button>'}<button class="btn sm alt right" data-act="pay-add">＋ Rata</button></div>
    ${!E.q.data ? '<div class="alert" style="margin:10px 0">Scegli la data dell\'evento nel Questionario per calcolare le scadenze.</div>' : ''}
    ${P.length ? `<table class="tb"><thead><tr><th style="width:90px">Stato</th><th>Descrizione</th><th>Scadenza</th><th class="num">Importo (iva escl.)</th><th class="num">Iva incl.</th><th></th></tr></thead><tbody>
    ${P.map((x, i) => { const late = !x.paid && x.due && new Date(x.due + 'T23:59:59') < new Date(); return `<tr><td>${x.paid ? '<span class="pill ok">versato</span>' : '<span class="pill">da versare</span>'}</td><td><input type="text" data-b="pagamenti.${i}.desc" data-hook="paymanual" value="${esc(x.desc)}"></td>
      <td><input type="date" style="width:auto" data-b="pagamenti.${i}.due" data-hook="paymanual" data-r value="${esc(x.due)}">${late ? ' <span class="pill bad">scaduta</span>' : ''}</td><td class="num"><input type="number" style="width:110px" data-b="pagamenti.${i}.importo" data-hook="paymanual" data-r value="${x.importo}"></td><td class="num">${eur((Number(x.importo) || 0) * (1 + iva))}</td><td><button class="btn ghost sm" data-act="pay-del" data-i="${i}">✕</button></td></tr>`; }).join('')}</tbody>
    <tfoot><tr><td></td><td>Totale rate</td><td></td><td class="num">${eur(tot)}</td><td class="num">${eur(tot * (1 + iva))}</td><td></td></tr></tfoot></table>
    <div class="row" style="margin-top:10px"><span class="pill ok">Incassato ${eur(paid)}</span><span class="pill ${Math.abs(diff) < 0.5 ? 'ok' : 'warn'}">${Math.abs(diff) < 0.5 ? 'Rate = preventivo' : (diff > 0 ? 'Da pianificare ' + eur(diff) : 'Rate oltre il preventivo di ' + eur(-diff)) + ' (iva escl.)'}</span><span class="pill">Residuo da incassare ${eur(q.imponibile - paid)} iva escl.</span></div>`
    : '<p class="muted">Nessuna rata.</p>'}
    <p class="hint" style="margin-top:8px">Regole dal contratto (modificabili in Impostazioni → Scadenziario): caparra alla firma, completamento del 30 % a un anno dall'evento, 40 % a 120 giorni lavorativi, saldo a 10 giorni lavorativi. Gli importi seguono il totale del preventivo.</p></div>`;
}
HOOKS.paymanual = () => { curEvent().pagAuto = false; };
ACTIONS['pay-auto'] = () => { const E = curEvent(); E.pagAuto = true; syncPagamenti(E); save(); rr(); };
ACTIONS['pay-add'] = () => { curEvent().pagAuto = false; curEvent().pagamenti.push({ desc: '', due: '', importo: '', paid: false }); save(); rr(); };
ACTIONS['pay-del'] = el => { curEvent().pagAuto = false; curEvent().pagamenti.splice(+el.dataset.i, 1); save(); rr(); };
ACTIONS['rt-add'] = () => { curEvent().econ.rettifiche.push({ desc: '', importo: '' }); save(); rr(); };
ACTIONS['rt-del'] = el => { curEvent().econ.rettifiche.splice(+el.dataset.i, 1); save(); rr(); };
ACTIONS['export-quote'] = () => {
  const E = curEvent(), q = computeQuote(E);
  const rows = [['LA STELLA · NEW CONCEPT BANQUETING'], ['Preventivo', evName(E)], ['Data evento', fmtDate(E.q.data)], ['Location', E.q.locationNome], ['Ospiti adulti', E.q.adulti, 'Bambini', E.q.bambini, 'Neonati', E.q.neonati], [], ['Sezione', 'Descrizione', 'Q.tà', 'Unitario €', 'Importo €']];
  q.lines.forEach(l => rows.push([l.sec, l.label, l.qty, l.unit, l.tot]));
  rows.push([], ['', 'Imponibile', '', '', q.imponibile], ['', 'IVA ' + S.settings.iva + '%', '', '', q.iva], ['', 'TOTALE', '', '', q.totale]);
  const wb = XLSX.utils.book_new(), ws = XLSX.utils.aoa_to_sheet(rows); ws['!cols'] = [{ wch: 20 }, { wch: 80 }, { wch: 8 }, { wch: 12 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Preventivo'); XLSX.writeFile(wb, `Preventivo_${evName(E).replace(/\W+/g, '-')}.xlsx`);
};

/* ---------------------------------------------------------------- RICETTARIO */
function recipeList(E) {
  const seen = new Set(), items = [];
  selectedRecipes(E).forEach(x => { if (seen.has(x.r.id)) return; seen.add(x.r.id); items.push(x); recipeState(E, x.r); });
  return items;
}
VIEWS.ricettario = E => {
  const items = recipeList(E); save();
  const tot = { ing: [0, 0], semi: [0, 0], asm: [0, 0] };
  items.forEach(x => { const p = recipeProgress(E.recipes[x.r.id]); ['ing', 'semi', 'asm'].forEach(k => { tot[k][0] += p[k][0]; tot[k][1] += p[k][1]; }); });
  const pct = a => a[1] ? Math.round(a[0] / a[1] * 100) : 0;
  const head = `<div class="secthead"><div><h2>Ricettario dell'evento</h2><p>Tutte le ricette da preparare in base alle scelte fatte. Per ognuna: spunta la materia prima acquistata, i semilavorati preparati e la composizione del piatto. Sono bozze ricavate dal menù: lo chef le completa con grammature e procedimenti.</p></div></div>`;
  if (!items.length) return head + `<div class="empty"><h3>Nessuna ricetta</h3><p>Scegli le isole, le portate e i dessert nella sezione Menù: le ricette compaiono qui automaticamente.</p><a class="btn" href="#/${evUrl('menu', 'aperitivo')}">Vai al Menù</a></div>`;
  const tabs = `<div class="tabs"><a href="javascript:void 0" data-act="rc-tab" data-v="ricette" class="${UI.rcpTab === 'ricette' ? 'on' : ''}">Ricette <span class="badge">${items.length}</span></a><a href="javascript:void 0" data-act="rc-tab" data-v="spesa" class="${UI.rcpTab === 'spesa' ? 'on' : ''}">Lista acquisti</a></div>`;
  const bars = `<div class="tiles">${[['ing', '🛒 Materie prime acquistate'], ['semi', '🥣 Semilavorati pronti'], ['asm', '🍽 Piatti composti']].map(([k, l]) => `<div class="tile"><span>${l}</span><b>${tot[k][0]}<small style="font-size:16px;color:var(--muted)">/${tot[k][1]}</small></b><div class="progress" style="margin-top:6px"><i style="width:${pct(tot[k])}%"></i></div></div>`).join('')}</div>`;
  return head + bars + tabs + (UI.rcpTab === 'spesa' ? shoppingList(E, items) : recipeCards(E, items));
};
ACTIONS['rc-tab'] = el => { UI.rcpTab = el.dataset.v; rr(); };
function recipeCards(E, items) {
  const groups = [...new Set(items.map(x => x.sec.split(' · ')[0]))];
  const q = norm(UI.rcpQ);
  const filt = items.filter(x => {
    if (UI.rcpSec && x.sec.split(' · ')[0] !== UI.rcpSec) return false;
    const d = recipeDone(E.recipes[x.r.id]);
    if (UI.rcpSt === 'todo' && d.pct > 0) return false; if (UI.rcpSt === 'wip' && (d.pct === 0 || d.pct === 100)) return false; if (UI.rcpSt === 'done' && d.pct < 100) return false;
    return !q || norm(x.r.name + ' ' + x.sec).includes(q);
  });
  const bySec = {}; filt.forEach(x => (bySec[x.sec] = bySec[x.sec] || []).push(x));
  return `<div class="toolbar noprint"><input type="text" id="rq" placeholder="Cerca una ricetta…" value="${esc(UI.rcpQ)}">
    <select data-act-change="rc-sec" id="rsec" style="width:auto"><option value="">Tutte le sezioni</option>${groups.map(g => `<option ${UI.rcpSec === g ? 'selected' : ''}>${g}</option>`).join('')}</select>
    <div class="chips">${[['', 'Tutte'], ['todo', 'Da iniziare'], ['wip', 'In corso'], ['done', 'Pronte']].map(([k, l]) => `<button class="chip ${UI.rcpSt === k ? 'on' : ''}" data-act="rc-st" data-v="${k}">${l}</button>`).join('')}</div>
    <button class="btn sm alt right" data-act="rc-open" data-v="1">Apri tutte</button><button class="btn sm alt" data-act="rc-open" data-v="0">Chiudi tutte</button></div>
  ${Object.entries(bySec).map(([sec, arr]) => `<div class="secbar"><h3>${esc(sec)}</h3><span class="muted small">${arr.length} ricette</span></div>${arr.map(x => recipeCard(E, x)).join('')}`).join('') || '<div class="empty">Nessuna ricetta corrisponde ai filtri.</div>'}`;
}
document.addEventListener('input', e => { if (e.target.id === 'rq') { UI.rcpQ = e.target.value; const p = e.target.selectionStart; rr(); const n = $('#rq'); if (n) { n.focus(); n.setSelectionRange(p, p); } } });
document.addEventListener('change', e => { if (e.target.id === 'rsec') { UI.rcpSec = e.target.value; rr(); } });
ACTIONS['rc-st'] = el => { UI.rcpSt = el.dataset.v; rr(); };
ACTIONS['rc-open'] = el => { const E = curEvent(); recipeList(E).forEach(x => el.dataset.v === '1' ? UI.open.add(x.r.id) : UI.open.delete(x.r.id)); rr(); };

function ckList(rid, kind, arr, porz, withQty) {
  return arr.map((it, i) => `<div class="ck ${it.ok ? 'ok' : ''}"><input type="checkbox" data-b="recipes.${rid}.${kind}.${i}.ok" data-r ${it.ok ? 'checked' : ''}><span class="t" style="flex:1">${esc(it.n)}</span>
    ${withQty ? `<input class="q" type="number" step="any" title="Quantità per porzione" placeholder="q.tà" data-b="recipes.${rid}.${kind}.${i}.q" data-r value="${it.q}"><input class="u" type="text" data-b="recipes.${rid}.${kind}.${i}.u" value="${esc(it.u)}"><span class="tot">${it.q !== '' ? num(Math.round(it.q * porz * 100) / 100) + ' ' + esc(it.u) : ''}</span>` : ''}
    <button class="x" data-act="rc-del" data-rid="${rid}" data-kind="${kind}" data-i="${i}" title="Rimuovi">✕</button></div>`).join('')
    + `<div class="addrow"><input type="text" placeholder="＋ aggiungi…" data-rid="${rid}" data-kind="${kind}" style="flex:1"><button class="btn sm alt" data-act="rc-add" data-rid="${rid}" data-kind="${kind}">Aggiungi</button></div>`;
}
function recipeCard(E, x) {
  const r = x.r, st = E.recipes[r.id], p = recipeProgress(st), d = recipeDone(st), porz = portionsOf(E, st);
  const pill = (ic, [a, b]) => `<span class="pill ${b && a === b ? 'ok' : ''}" title="">${ic} ${a}/${b}</span>`;
  return `<details class="rcp ${d.pct === 100 ? 'done' : ''}" data-k="${r.id}" ${UI.open.has(r.id) ? 'open' : ''}><summary><div class="rn">${esc(r.name)}${tagHtml(r)}<small>${esc(r.desc)}</small></div>
    ${pill('🛒', p.ing)}${pill('🥣', p.semi)}${pill('🍽', p.asm)}<div class="progress" style="width:90px"><i style="width:${d.pct}%"></i></div><b style="width:38px;text-align:right">${d.pct}%</b></summary>
    <div class="body"><div><h4>🛒 Materia prima</h4>${ckList(r.id, 'ing', st.ing, porz, true)}</div><div><h4>🥣 Semilavorati</h4>${ckList(r.id, 'semi', st.semi, porz, false)}</div><div><h4>🍽 Composizione del piatto</h4>${ckList(r.id, 'asm', st.asm, porz, false)}</div>
    ${r.proc ? `<div style="grid-column:1/-1"><h4>👨‍🍳 Procedimento</h4><div class="small" style="white-space:pre-wrap">${esc(r.proc)}</div></div>` : ''}
    <div class="row" style="grid-column:1/-1;border-top:1px solid #eee8e0;padding-top:10px"><label class="row" style="gap:6px">Porzioni <input type="number" style="width:84px" data-b="recipes.${r.id}.porz" data-r value="${st.porz ?? ''}" placeholder="${porz}"></label>
      <input type="text" style="flex:1;min-width:200px" data-b="recipes.${r.id}.note" value="${esc(st.note)}" placeholder="Note dello chef, procedimento, impiattamento…"><button class="btn ghost sm" data-act="rc-reset" data-rid="${r.id}">Ripristina bozza</button></div></div></details>`;
}
ACTIONS['rc-add'] = el => {
  const inp = el.parentElement.querySelector('input'), v = inp.value.trim(); if (!v) return;
  const st = curEvent().recipes[el.dataset.rid], k = el.dataset.kind;
  st[k].push(k === 'ing' ? { n: v, q: '', u: 'g', ok: false } : { n: v, ok: false }); UI.open.add(el.dataset.rid); save(); rr();
};
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('.addrow input')) e.target.parentElement.querySelector('button').click(); });
ACTIONS['rc-del'] = el => { const st = curEvent().recipes[el.dataset.rid]; st[el.dataset.kind].splice(+el.dataset.i, 1); save(); rr(); };
ACTIONS['rc-reset'] = el => { if (!confirm('Ripristinare la bozza originale? Spunte e quantità di questa ricetta andranno perse.')) return; delete curEvent().recipes[el.dataset.rid]; save(); rr(); };

function shoppingList(E, items) {
  const map = new Map();
  items.forEach(x => { const st = E.recipes[x.r.id], porz = portionsOf(E, st); st.ing.forEach((it, i) => { const k = norm(it.n); if (!map.has(k)) map.set(k, { n: it.n, rows: [] }); map.get(k).rows.push({ rid: x.r.id, rn: x.r.name, i, ok: it.ok, q: it.q, u: it.u, porz }); }); });
  const rows = [...map.values()].sort((a, b) => a.n.localeCompare(b.n, 'it'));
  const q = norm(UI.rcpQ);
  return `<div class="alert info noprint" style="margin-bottom:12px">Elenco unico delle materie prime di tutte le ricette scelte. Le quantità si sommano quando le unità coincidono. Spuntare qui segna l'ingrediente come acquistato in tutte le ricette.</div>
  <table class="tb"><thead><tr><th style="width:44px"></th><th>Materia prima</th><th class="num">Quantità totale</th><th>Usata in</th><th class="num">Acquistata</th></tr></thead><tbody>
  ${rows.filter(r => !q || norm(r.n).includes(q)).map(r => {
    const units = new Set(r.rows.filter(x => x.q !== '').map(x => x.u)), all = r.rows.every(x => x.ok), n = r.rows.filter(x => x.ok).length;
    const tot = r.rows.some(x => x.q !== '') && units.size === 1 ? num(Math.round(r.rows.reduce((a, x) => a + (+x.q || 0) * x.porz, 0) * 100) / 100) + ' ' + [...units][0] : '—';
    return `<tr><td><input type="checkbox" ${all ? 'checked' : ''} data-act="shop-toggle" data-n="${esc(norm(r.n))}"></td><td class="${all ? 'muted' : ''}" style="${all ? 'text-decoration:line-through' : ''}"><b>${esc(r.n)}</b></td><td class="num">${tot}</td>
      <td class="small muted">${r.rows.length === 1 ? esc(r.rows[0].rn) : r.rows.length + ' ricette'}</td><td class="num"><span class="pill ${all ? 'ok' : n ? 'warn' : ''}">${n}/${r.rows.length}</span></td></tr>`; }).join('')}</tbody></table>`;
}
ACTIONS['shop-toggle'] = el => {
  const E = curEvent(), key = el.dataset.n, on = el.checked;
  recipeList(E).forEach(x => E.recipes[x.r.id].ing.forEach(it => { if (norm(it.n) === key) it.ok = on; }));
  save(); rr();
};

/* condizioni di pagamento nel preventivo: date precise se è stata scelta la data di firma, altrimenti condizioni generiche in giorni */
function condizioniPagamento(E, q) {
  const rows = S.settings.scadenziario; if (!rows.length) return '';
  const iva = S.settings.iva / 100, amt = buildScadenziario(E, q.imponibile), withDates = !!E.q.firma && !!E.q.data;
  const when = r => {
    const n = Number(r.n) || 0;
    if (r.quando === 'firma') return n ? `entro ${n} giorni dalla firma del contratto` : 'alla firma del contratto';
    if (r.quando === 'giorniPrima') return `${n} giorni prima della data dell'evento`;
    return `${n} giorni lavorativi prima della data dell'evento`;
  };
  return `<h2>Condizioni di pagamento</h2><table class="tb" style="border:0"><thead><tr><th>Rata</th><th>${withDates ? 'Scadenza' : 'Termine di pagamento'}</th><th class="num">Importo</th><th class="num">Iva incl.</th></tr></thead><tbody>
    ${rows.map((r, i) => `<tr><td>${esc(r.desc)}</td><td>${withDates && amt[i].due ? new Date(amt[i].due + 'T12:00:00').toLocaleDateString('it-IT') : esc(when(r))}</td><td class="num">${eur(amt[i].importo)}</td><td class="num">${eur(amt[i].importo * (1 + iva))}</td></tr>`).join('')}</tbody></table>
    <p class="small muted" style="margin-top:6px">${withDates ? 'Le scadenze sono calcolate dalla data di firma del contratto e dalla data dell\'evento.' : 'I termini decorrono dalla firma del contratto e dalla data dell\'evento; le date precise saranno indicate al momento della firma.'} Importi oltre IVA nella misura di legge.</p>`;
}
