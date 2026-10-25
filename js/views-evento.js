/* =====================================================================
   Sezione 01 · EVENTO  → Questionario · Invitati · Tavoli e mappa
   ===================================================================== */
VIEWS.evento = E => ({ questionario: viewQuestionario, invitati: viewInvitati, tavoli: viewTavoli }[ROUTE.sub] || viewQuestionario)(E);

const F = (E, label, path, o = {}) => {
  const v = pget(E, path) ?? '';
  const cls = 'field' + (o.wide ? ' wide' : '') + (o.w2 ? ' w2' : '');
  let ctl;
  if (o.options) ctl = `<select data-b="${path}" ${o.r ? 'data-r' : ''}>${o.options.map(x => { const [val, lab] = Array.isArray(x) ? x : [x, x]; return `<option value="${esc(val)}" ${String(v) === String(val) ? 'selected' : ''}>${esc(lab)}</option>`; }).join('')}</select>`;
  else if (o.area) ctl = `<textarea data-b="${path}" placeholder="${esc(o.ph || '')}">${esc(v)}</textarea>`;
  else ctl = `<input type="${o.type || 'text'}" data-b="${path}" ${o.hook ? `data-hook="${o.hook}"` : ''} ${o.r ? 'data-r' : ''} value="${esc(v)}" placeholder="${esc(o.ph || '')}" ${o.min !== undefined ? `min="${o.min}"` : ''}>`;
  return `<div class="${cls}"><label>${label}</label>${ctl}${o.hint ? `<span class="hint">${o.hint}</span>` : ''}</div>`;
};

HOOKS.listino = (el, v) => {
  const E = curEvent(), L = S.settings.listini.find(l => l.id === v) || CAT.listiniDefault[0];
  E.q.locationNome = L.id === 'castella' ? 'La Castella' : E.q.locationNome;
  E.q.spazi = L.spazi.map((s, i) => ({ ...s, orario: (E.q.spazi[i] || {}).orario || '' }));
  rr();
};

/* ---------------------------------------------------------------- QUESTIONARIO */
function viewQuestionario(E) {
  const q = E.q, g = giornoOf(E), cnt = guestCounts(E);
  const sync = E.guests.length && (cnt.Adulto !== +q.adulti || cnt.Bambino !== +q.bambini || cnt.Neonato !== +q.neonati)
    ? `<div class="alert info noprint">L'elenco invitati contiene <b>${cnt.Adulto}</b> adulti, <b>${cnt.Bambino}</b> bambini, <b>${cnt.Neonato}</b> neonati. <button class="btn sm alt" data-act="sync-counts">Allinea i numeri qui sotto</button></div>` : '';
  return `<div class="secthead"><div><h2>Questionario di conoscenza</h2><p>Le domande che il titolare pone a chi commissiona l'evento. Tutto si salva da solo.</p></div></div>
  <div class="card"><h3>1 · Chi siamo e come ci avete conosciuto</h3><div class="fields">
    ${F(E, 'Sposa / sposo (1)', 'q.sposo1')}${F(E, 'Sposa / sposo (2)', 'q.sposo2')}
    ${F(E, 'Telefono', 'q.tel', { type: 'tel' })}${F(E, 'Email', 'q.email', { type: 'email' })}
    ${F(E, 'Wedding planner', 'q.planner')}${F(E, 'Telefono wedding planner', 'q.plannerTel', { type: 'tel' })}
    ${F(E, 'Come ci avete conosciuto', 'q.provenienza', { options: ['', 'Passaparola', 'Instagram / social', 'Sito web', 'Wedding planner', 'Location', 'Open day / fiera', 'Altro'] })}
    ${F(E, 'Budget indicativo', 'q.budget', { ph: 'es. 20.000 €' })}</div></div>
  <div class="card"><h3>2 · Quando</h3><div class="fields">
    ${F(E, 'Tipo di evento', 'q.tipo', { options: ['Matrimonio', 'Anniversario', 'Compleanno', 'Evento aziendale', 'Battesimo / Comunione', 'Altro'] })}
    ${F(E, 'Data dell\'evento', 'q.data', { type: 'date', r: 1, hint: q.data ? `${fmtDate(q.data).split(' ')[0]} → tariffa <b>${g === 'sabato' ? 'sabato' : 'domenica–venerdì'}</b>` : '' })}
    ${F(E, 'Pranzo o cena', 'q.pasto', { options: ['Cena', 'Pranzo'] })}
    ${F(E, 'Tariffa giorno', 'q.giorno', { r: 1, options: [['auto', 'Automatica dalla data'], ['sabato', 'Sabato'], ['feriale', 'Domenica–venerdì']] })}
    ${F(E, 'Tipo di cerimonia', 'q.rito', { options: ['Civile', 'Religiosa', 'Rito simbolico', 'Nessuna cerimonia'] })}
    ${F(E, 'Note sulla cerimonia', 'q.ritoNote')}
    ${F(E, 'Scadenza scelte allestimenti', 'q.scadenzaAllest', { type: 'date', hint: 'Da contratto: oltre questa data la quotazione può variare.' })}
    ${F(E, 'Scadenza definizione menù', 'q.scadenzaMenu', { type: 'date', hint: 'Modificabile fino a 60 giorni lavorativi prima.' })}
    ${F(E, 'Validità del preventivo fino al', 'q.validita', { type: 'date' })}</div></div>
  <div class="card"><h3>3 · Dove</h3><div class="fields">
    ${F(E, 'Location (listino)', 'q.listino', { options: S.settings.listini.map(l => [l.id, l.nome]), hook: 'listino' })}
    ${F(E, 'Nome location', 'q.locationNome')}</div>
    <div class="sp"></div><h4>Organizzazione degli spazi · Piano A / Piano B (meteo)</h4>
    <table class="tb"><thead><tr><th>Momento</th><th>Orario indicativo</th><th>Piano A</th><th>Piano B</th></tr></thead><tbody>
    ${q.spazi.map((s, i) => `<tr><td>${esc(s.momento)}</td><td><input type="time" data-b="q.spazi.${i}.orario" value="${esc(s.orario)}"></td><td><input type="text" data-b="q.spazi.${i}.a" value="${esc(s.a)}"></td><td><input type="text" data-b="q.spazi.${i}.b" value="${esc(s.b)}"></td></tr>`).join('')}</tbody></table>
    <p class="hint">La tabella oraria definitiva si compila 10 giorni prima dell'evento. La modifica dell'organizzazione degli spazi può far variare la quotazione.</p></div>
  <div class="card"><h3>4 · Quanti siete</h3>${sync}<div class="fields">
    ${F(E, 'Ospiti adulti (paganti per intero)', 'q.adulti', { type: 'number', min: 0, hint: 'Preventivo calcolato su minimo 100 adulti, minimo garantito 60.' })}
    ${F(E, 'Bambini (3–10 anni)', 'q.bambini', { type: 'number', min: 0 })}
    ${F(E, 'Neonati (0–2 anni)', 'q.neonati', { type: 'number', min: 0 })}
    <div class="field"><label>Totale coperti</label><div class="counter" id="cop">${(+q.adulti || 0) + (+q.bambini || 0) + (+q.neonati || 0)}</div><span class="hint">Tavoli tondi: da 8 a 11 persone, bambini e neonati compresi.</span></div></div></div>
  <div class="card"><h3>5 · Altro da sapere</h3><div class="fields">
    ${F(E, 'Altri fornitori (foto, fiori, musica…)', 'q.fornitori', { area: 1, w2: 1 })}
    ${F(E, 'Accessibilità / ospiti con esigenze motorie', 'q.accessibilita', { area: 1, w2: 1 })}
    ${F(E, 'Note e desideri', 'q.note', { area: 1, wide: 1, ph: 'Tutto ciò che emerge nel colloquio…' })}</div></div>`;
}
ACTIONS['sync-counts'] = () => { const E = curEvent(), c = guestCounts(E); E.q.adulti = c.Adulto; E.q.bambini = c.Bambino; E.q.neonati = c.Neonato; save(); rr(); toast('Numeri allineati all\'elenco invitati'); };

/* ---------------------------------------------------------------- icone esigenze */
const aIc = k => CAT.allergie.find(x => x.k === k), iIc = k => CAT.intolleranze.find(x => x.k === k), dIc = k => CAT.diete.find(x => x.k === k);
function iconsHtml(g, o = {}) {
  let h = '';
  if (!o.noFascia && g.fascia !== 'Adulto') { const f = CAT.fasce.find(x => x.k === g.fascia); h += `<span class="ic fa" title="${esc(f.label)}">${f.icon}</span>`; }
  g.allergie.forEach(k => { const a = aIc(k); h += `<span class="ic all" title="Allergia: ${esc(a.label)}">${a.icon}</span>`; });
  if (g.altro) h += `<span class="ic all txt" title="Altra allergia / intolleranza: ${esc(g.altro)}">⚠ ${esc(g.altro.length > 16 ? g.altro.slice(0, 15) + '…' : g.altro)}</span>`;
  g.intolleranze.forEach(k => { const a = iIc(k); h += `<span class="ic int" title="Intolleranza: ${esc(a.label)}">${a.icon}</span>`; });
  if (g.dieta) { const d = dIc(g.dieta); h += `<span class="ic die" title="Dieta: ${esc(d.label)}">${d.icon}</span>`; }
  return h ? `<span class="icons">${h}</span>` : '';
}
const legendHtml = () => `<div class="legend"><span><span class="ic all">🌾</span> Allergia</span><span><span class="ic int">🥛</span> Intolleranza</span><span><span class="ic die">🌱</span> Dieta / preferenza</span><span><span class="ic fa">🧒</span> Bambino · <span class="ic fa">🍼</span> Neonato</span></div>`;
const guestTip = g => [fullName(g) + ' · ' + g.fascia, g.dieta && 'Dieta: ' + g.dieta, g.allergie.length && 'ALLERGIE: ' + g.allergie.map(k => aIc(k).label).join(', '), g.intolleranze.length && 'Intolleranze: ' + g.intolleranze.map(k => iIc(k).label).join(', '), g.altro && 'Altro: ' + g.altro, g.note && 'Note: ' + g.note].filter(Boolean).join('\n');

/* ---------------------------------------------------------------- INVITATI */
function viewInvitati(E) {
  const c = guestCounts(E);
  const q = norm(UI.guestQ), f = UI.guestF;
  const list = E.guests.filter(g => {
    if (q && !norm(fullName(g)).includes(q)) return false;
    if (f === 'all') return g.allergie.length || g.altro;
    if (f === 'int') return g.intolleranze.length;
    if (f === 'die') return g.dieta;
    if (f === 'spec') return hasSpecial(g);
    if (f === 'kid') return g.fascia !== 'Adulto';
    if (f === 'noseat') return !seatOf(E, g.id);
    return true;
  });
  const needs = E.guests.length ? `<div class="card"><h4 style="margin-bottom:10px">Esigenze da comunicare alla cucina</h4><div class="needs">
    ${Object.entries(c.byAll).sort((a, b) => b[1] - a[1]).map(([k, n]) => `<span class="pill" title="Allergia">${aIc(k).icon} ${esc(aIc(k).label)} <b>×${n}</b></span>`).join('')}
    ${Object.entries(c.byInt).sort((a, b) => b[1] - a[1]).map(([k, n]) => `<span class="pill" title="Intolleranza">${iIc(k).icon} ${esc(iIc(k).label)} <b>×${n}</b></span>`).join('')}
    ${Object.entries(c.diete).map(([k, n]) => `<span class="pill" title="Dieta">${dIc(k).icon} ${esc(k)} <b>×${n}</b></span>`).join('')}
    ${!Object.keys(c.byAll).length && !Object.keys(c.byInt).length && !Object.keys(c.diete).length ? '<span class="muted">Nessuna esigenza segnalata.</span>' : ''}</div></div><div class="sp"></div>` : '';
  const filters = [['', 'Tutti'], ['all', '🌾 Allergie'], ['int', '🥛 Intolleranze'], ['die', '🌱 Diete'], ['spec', 'Con esigenze'], ['kid', '🧒 Bambini/neonati'], ['noseat', 'Senza tavolo']];
  return `<div class="secthead"><div><h2>Invitati</h2><p>Carica il file Excel compilato dagli sposi: gli invitati entrano qui con le icone di allergie, intolleranze e preferenze alimentari.</p></div>
    <div class="row right noprint"><a class="btn alt" href="template/Invitati_e_Tavoli_La_Stella.xlsx" download>⭳ Scarica modello Excel</a>
    <label class="btn sand">⭱ Carica Excel<input type="file" id="xls-file" accept=".xlsx,.xls,.csv" hidden></label>
    <button class="btn" data-act="guest-new">＋ Invitato</button></div></div>
  <div class="tiles"><div class="tile"><b>${c.tot}</b><span>Invitati</span></div><div class="tile"><b>${c.Adulto}</b><span>Adulti</span></div><div class="tile"><b>${c.Bambino}</b><span>Bambini</span></div><div class="tile"><b>${c.Neonato}</b><span>Neonati</span></div>
    <div class="tile a"><b>${c.allergie}</b><span>Con allergie</span></div><div class="tile i"><b>${c.intolleranze}</b><span>Intolleranze</span></div><div class="tile d"><b>${Object.values(c.diete).reduce((a, b) => a + b, 0)}</b><span>Diete speciali</span></div></div>
  ${needs}
  ${E.guests.length ? `<div class="toolbar noprint"><input type="text" placeholder="Cerca per nome…" value="${esc(UI.guestQ)}" id="gq"><div class="chips">${filters.map(([k, l]) => `<button class="chip ${f === k ? 'on' : ''}" data-act="gfilter" data-v="${k}">${l}</button>`).join('')}</div>
    <button class="btn sm alt right" data-act="export-guests">⭳ Scheda cucina (Excel)</button></div>
    <table class="tb"><thead><tr><th>Invitato</th><th>Fascia</th><th>Tavolo</th><th>Esigenze alimentari</th><th>Note</th><th></th></tr></thead><tbody>
    ${list.map(g => { const s = seatOf(E, g.id); return `<tr class="click" data-act="guest-edit" data-id="${g.id}"><td><b>${esc(fullName(g))}</b></td><td>${esc(g.fascia)}</td>
      <td>${s ? `<span class="pill">${esc(s.t.nome || 'Tavolo ' + s.t.num)} · posto ${s.i + 1}</span>` : '<span class="muted small">da assegnare</span>'}</td><td>${iconsHtml(g, { noFascia: 1 }) || '<span class="muted">—</span>'}</td><td class="small muted">${esc(g.note)}</td>
      <td class="noprint"><button class="btn ghost sm" data-act="guest-del" data-id="${g.id}" title="Elimina">✕</button></td></tr>`; }).join('')}
    </tbody></table>${list.length ? '' : '<div class="empty">Nessun invitato corrisponde al filtro.</div>'}<div class="sp"></div>${legendHtml()}`
    : `<div class="empty"><h3>Nessun invitato</h3><p>Scarica il modello Excel, fallo compilare dagli sposi (foglio «Invitati» e foglio «Tavoli») e caricalo qui.</p>
      <a class="btn alt" href="template/Invitati_e_Tavoli_La_Stella.xlsx" download>⭳ Scarica modello Excel</a> <label class="btn sand">⭱ Carica Excel<input type="file" id="xls-file" accept=".xlsx,.xls,.csv" hidden></label></div>`}`;
}
document.addEventListener('input', e => { if (e.target.id === 'gq') { UI.guestQ = e.target.value; const pos = e.target.selectionStart; rr(); const n = $('#gq'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } } });
ACTIONS.gfilter = el => { UI.guestF = el.dataset.v; rr(); };
ACTIONS['guest-del'] = (el, ev) => { ev.stopPropagation(); const E = curEvent(); const g = E.guests.find(x => x.id === el.dataset.id); if (!confirm(`Eliminare ${fullName(g)}?`)) return; removeGuest(E, g.id); save(); rr(); };
function removeGuest(E, id) { E.guests = E.guests.filter(g => g.id !== id); E.tables.forEach(t => t.seats = t.seats.map(s => (s === id ? null : s))); }
ACTIONS['guest-new'] = () => guestModal(newGuest(), true);
ACTIONS['guest-edit'] = el => guestModal(curEvent().guests.find(g => g.id === el.dataset.id), false);
function guestModal(g, isNew) {
  const chk = (name, arr, sel) => arr.map(a => `<label><input type="checkbox" name="${name}" value="${a.k}" ${sel.includes(a.k) ? 'checked' : ''}> <span class="ic ${name === 'all' ? 'all' : 'int'}">${a.icon}</span> ${esc(a.label)}</label>`).join('');
  openModal(`<h3>${isNew ? 'Nuovo invitato' : esc(fullName(g))}</h3><form id="gf" data-id="${g.id}" data-new="${isNew ? 1 : ''}">
    <div class="fields"><div class="field"><label>Nome</label><input type="text" name="nome" value="${esc(g.nome)}" required></div><div class="field"><label>Cognome</label><input type="text" name="cognome" value="${esc(g.cognome)}"></div>
    <div class="field"><label>Fascia</label><select name="fascia">${CAT.fasce.map(f => `<option value="${f.k}" ${g.fascia === f.k ? 'selected' : ''}>${f.label}</option>`).join('')}</select></div>
    <div class="field"><label>Dieta / preferenza</label><select name="dieta"><option value="">Nessuna</option>${CAT.diete.map(d => `<option value="${d.k}" ${g.dieta === d.k ? 'selected' : ''}>${d.icon} ${d.label}</option>`).join('')}</select></div></div>
    <div class="sp"></div><h4>Allergie (14 allergeni)</h4><div class="checks">${chk('all', CAT.allergie, g.allergie)}</div>
    <div class="sp"></div><h4>Intolleranze</h4><div class="checks">${chk('int', CAT.intolleranze, g.intolleranze)}</div>
    <div class="sp"></div><div class="fields"><div class="field"><label>Altre allergie / intolleranze</label><input type="text" name="altro" value="${esc(g.altro)}"></div><div class="field"><label>Note per la cucina</label><input type="text" name="note" value="${esc(g.note)}"></div></div>
    <div class="acts"><button type="button" class="btn alt" data-act="modal-close">Annulla</button><button class="btn">Salva</button></div></form>`);
  window._editingGuest = g;
}
document.addEventListener('submit', e => {
  if (e.target.id !== 'gf') return; e.preventDefault();
  const E = curEvent(), fd = new FormData(e.target), f = e.target.dataset;
  const g = f.new ? newGuest() : E.guests.find(x => x.id === f.id);
  Object.assign(g, { nome: fd.get('nome').trim(), cognome: fd.get('cognome').trim(), fascia: fd.get('fascia'), dieta: fd.get('dieta'), allergie: fd.getAll('all'), intolleranze: fd.getAll('int'), altro: fd.get('altro').trim(), note: fd.get('note').trim() });
  if (f.new) E.guests.push(g);
  save(); closeModal(); rr();
});

/* ---- import Excel ---- */
document.addEventListener('change', e => {
  if (e.target.id !== 'xls-file') return;
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  f.arrayBuffer().then(buf => {
    let res; try { res = parseWorkbook(XLSX.read(buf, { type: 'array' })); } catch (err) { alert('Impossibile leggere il file: ' + err.message); return; }
    const E = curEvent(), c = { Adulto: 0, Bambino: 0, Neonato: 0 }; res.guests.forEach(g => c[g.fascia]++);
    const sp = res.guests.filter(hasSpecial).length, seated = res.tables.reduce((a, t) => a + t.seats.filter(Boolean).length, 0);
    window._import = res;
    openModal(`<h3>Anteprima importazione</h3><div class="tiles"><div class="tile"><b>${res.guests.length}</b><span>Invitati</span></div><div class="tile"><b>${c.Adulto}/${c.Bambino}/${c.Neonato}</b><span>Ad./Bamb./Neon.</span></div><div class="tile a"><b>${sp}</b><span>Con esigenze</span></div><div class="tile"><b>${res.tables.length}</b><span>Tavoli</span></div><div class="tile"><b>${seated}</b><span>Posti assegnati</span></div></div>
      ${res.warnings.length ? `<div class="alert">${res.warnings.length} avvisi da controllare:<ul class="warnlist">${res.warnings.map(w => `<li>${esc(w)}</li>`).join('')}</ul></div>` : '<div class="alert ok">Nessun problema rilevato.</div>'}
      ${E.guests.length ? `<p>Nell'evento ci sono già <b>${E.guests.length}</b> invitati e <b>${E.tables.length}</b> tavoli.</p>` : ''}
      <label class="row" style="margin-top:10px"><input type="checkbox" id="imp-sync" checked> Aggiorna anche i numeri ospiti del questionario (${c.Adulto} adulti, ${c.Bambino} bambini, ${c.Neonato} neonati)</label>
      <div class="acts"><button class="btn alt" data-act="modal-close">Annulla</button>${E.guests.length ? '<button class="btn sand" data-act="imp-append">Aggiungi a quelli esistenti</button>' : ''}<button class="btn" data-act="imp-replace">${E.guests.length ? 'Sostituisci tutto' : 'Importa'}</button></div>`);
  });
});
function doImport(replace) {
  const E = curEvent(), r = window._import; if (!r) return;
  if (replace) { E.guests = r.guests; E.tables = r.tables; }
  else {
    E.guests.push(...r.guests); const base = E.tables.reduce((m, t) => Math.max(m, t.num || 0), 0);
    r.tables.forEach(t => { t.num = t.num + base; E.tables.push(t); });
  }
  if ($('#imp-sync') && $('#imp-sync').checked) { const c = guestCounts(E); E.q.adulti = c.Adulto; E.q.bambini = c.Bambino; E.q.neonati = c.Neonato; }
  save(); closeModal(); window._import = null; toast(`Importati ${r.guests.length} invitati e ${r.tables.length} tavoli`); rr();
}
ACTIONS['imp-replace'] = () => doImport(true);
ACTIONS['imp-append'] = () => doImport(false);

ACTIONS['export-guests'] = () => {
  const E = curEvent(), rows = [['Tavolo', 'Posto', 'Nome', 'Cognome', 'Fascia', 'Dieta', 'ALLERGIE', 'Intolleranze', 'Altro', 'Note']];
  const seatKey = g => { const s = seatOf(E, g.id); return s ? [s.t.num, s.i + 1] : [9999, 0]; };
  E.guests.slice().sort((a, b) => { const x = seatKey(a), y = seatKey(b); return x[0] - y[0] || x[1] - y[1]; }).forEach(g => {
    const s = seatOf(E, g.id);
    rows.push([s ? (s.t.nome || 'Tavolo ' + s.t.num) : 'Da assegnare', s ? s.i + 1 : '', g.nome, g.cognome, g.fascia, g.dieta, g.allergie.map(k => aIc(k).label).join(', '), g.intolleranze.map(k => iIc(k).label).join(', '), g.altro, g.note]);
  });
  const wb = XLSX.utils.book_new(); const ws = XLSX.utils.aoa_to_sheet(rows); ws['!cols'] = [18, 7, 14, 16, 10, 14, 30, 24, 20, 30].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws, 'Scheda cucina');
  const sp = XLSX.utils.aoa_to_sheet([['Solo ospiti con esigenze', ''], ...rows.filter((r, i) => i === 0 || r[5] || r[6] || r[7] || r[8] || r[9])]); XLSX.utils.book_append_sheet(wb, sp, 'Solo esigenze');
  XLSX.writeFile(wb, `Scheda-cucina_${evName(E).replace(/\W+/g, '-')}.xlsx`);
};

/* ---------------------------------------------------------------- TAVOLI & MAPPA */
const SEAT = 34;
function mapGeometry(t) {
  const n = t.seats.length;
  if (t.forma === 'tondo') {
    const R = Math.max(58, Math.ceil(n * 44 / (2 * Math.PI))), size = 2 * (R + 26), c = size / 2, d = 2 * (R - 26);
    return { w: size, h: size, table: { x: c - d / 2, y: c - d / 2, w: d, h: d, round: true }, pos: t.seats.map((_, i) => { const a = (-90 + i * 360 / n) * Math.PI / 180; return [c + R * Math.cos(a), c + R * Math.sin(a)]; }) };
  }
  const top = Math.ceil(n / 2), bot = n - top, step = 42, w = Math.max(top, 3) * step + 30, h = 138;
  const pos = t.seats.map((_, i) => i < top ? [20 + step / 2 + i * step, 26] : [20 + step / 2 + (i - top) * step, h - 26]);
  return { w, h, table: { x: 14, y: 50, w: w - 28, h: 38, round: false }, pos };
}
function seatHtml(E, t, i, pos) {
  const gid = t.seats[i], g = gid && E.guests.find(x => x.id === gid);
  const [x, y] = pos;
  if (!g) return `<div class="seat" style="left:${x}px;top:${y}px" data-act="seat" data-t="${t.id}" data-i="${i}" data-drop title="Posto ${i + 1} libero">${i + 1}</div>`;
  const cls = ['seat', 'f', g.fascia === 'Bambino' ? 'b' : g.fascia === 'Neonato' ? 'n' : '', (g.allergie.length || g.altro) ? 'sa' : g.intolleranze.length ? 'si' : g.dieta ? 'sd' : ''].join(' ');
  const badge = (g.allergie.length || g.altro) ? aIc(g.allergie[0] || 'glutine').icon : g.intolleranze.length ? iIc(g.intolleranze[0]).icon : g.dieta ? dIc(g.dieta).icon : '';
  const extra = g.allergie.length + g.intolleranze.length + (g.altro ? 1 : 0) + (g.dieta ? 1 : 0);
  return `<div class="${cls}" style="left:${x}px;top:${y}px" draggable="true" data-act="seat" data-t="${t.id}" data-i="${i}" data-g="${g.id}" data-drop title="${esc(guestTip(g))}">${esc(initials(g))}${badge ? `<span class="bd">${badge}</span>` : ''}</div>`;
}
function tableCard(E, t) {
  const geo = mapGeometry(t), occ = t.seats.filter(Boolean).length;
  const tooMany = t.forma === 'tondo' && t.seats.length > 11, few = t.forma === 'tondo' && t.seats.length < 8;
  const sp = t.seats.map(id => id && E.guests.find(g => g.id === id)).filter(Boolean).filter(hasSpecial).length;
  const nm = t.nome || `Tavolo ${t.num}`;
  return `<div class="tcard ${tooMany ? 'bad' : ''}"><div class="thead"><h4>${esc(nm)}</h4><span class="pill ${occ === t.seats.length ? 'ok' : 'warn'}">${occ}/${t.seats.length}</span>
    <span class="pill">${t.forma === 'tondo' ? '◯ Tondo' : '▭ Rettangolare'}</span>${sp ? `<span class="pill bad" title="Ospiti con esigenze">⚠ ${sp}</span>` : ''}
    <span class="right noprint"><button class="btn ghost sm" data-act="table-edit" data-t="${t.id}" title="Modifica">⚙</button></span></div>
    ${tooMany ? '<div class="alert bad small">Un tavolo tondo può ospitare al massimo 11 persone.</div>' : ''}${few ? '<div class="alert small">Sotto le 8 persone per un tavolo tondo (minimo previsto 8).</div>' : ''}
    <div class="map" style="width:${geo.w}px;height:${geo.h}px"><div class="tbl" style="left:${geo.table.x}px;top:${geo.table.y}px;width:${geo.table.w}px;height:${geo.table.h}px;border-radius:${geo.table.round ? '50%' : '8px'}"><div>${t.num}<small>${t.forma === 'tondo' ? 'tondo' : 'imperiale'}</small></div></div>
    ${t.seats.map((_, i) => seatHtml(E, t, i, geo.pos[i])).join('')}</div>
    ${UI.tlist ? `<ul class="slist">${t.seats.map((id, i) => { const g = id && E.guests.find(x => x.id === id); return g ? `<li data-act="seat" data-t="${t.id}" data-i="${i}"><span class="n">${i + 1}</span><span class="nm"><b>${esc(fullName(g))}</b></span>${iconsHtml(g)}</li>` : `<li class="empty" data-act="seat" data-t="${t.id}" data-i="${i}"><span class="n">${i + 1}</span><span class="nm">posto libero</span></li>`; }).join('')}</ul>` : ''}</div>`;
}
function viewTavoli(E) {
  const free = E.guests.filter(g => !seatOf(E, g.id)), totalSeats = E.tables.reduce((a, t) => a + t.seats.length, 0), seated = E.guests.length - free.length;
  const pool = `<div class="pool" data-pool><h4>Da assegnare <span class="badge">${free.length}</span></h4><div class="lst">${free.map(g => `<div class="gchip" draggable="true" data-g="${g.id}"><span class="nm">${esc(fullName(g))}</span>${iconsHtml(g)}</div>`).join('') || '<p class="muted small" style="padding:6px">Tutti gli invitati hanno un posto 🎉</p>'}</div></div>`;
  return `<div class="secthead"><div><h2>Tavoli e mappa della sala</h2><p>La disposizione scelta dagli sposi (dal foglio «Tavoli» dell'Excel). Trascina un invitato su un posto, oppure clicca un posto per assegnarlo. Passa il mouse su un posto per vedere tutte le particolarità.</p></div>
    <div class="row right noprint"><button class="btn alt" data-act="table-add" data-f="tondo">＋ Tavolo tondo</button><button class="btn alt" data-act="table-add" data-f="rett">＋ Tavolo rettangolare</button><button class="btn alt" onclick="window.print()">🖨 Stampa</button></div></div>
  <div class="tiles"><div class="tile"><b>${E.tables.length}</b><span>Tavoli</span></div><div class="tile"><b>${totalSeats}</b><span>Posti</span></div><div class="tile d"><b>${seated}</b><span>Assegnati</span></div><div class="tile ${free.length ? 'a' : ''}"><b>${free.length}</b><span>Da assegnare</span></div></div>
  <div class="toolbar noprint"><label class="row"><input type="checkbox" ${UI.tlist ? 'checked' : ''} data-act="tlist"> Mostra l'elenco sotto ogni tavolo</label><span class="right">${legendHtml()}</span></div>
  ${E.tables.length ? `<div class="tables-layout"><div class="tgrid">${E.tables.slice().sort((a, b) => a.num - b.num).map(t => tableCard(E, t)).join('')}</div><div class="noprint">${pool}</div></div>`
    : `<div class="empty"><h3>Nessun tavolo</h3><p>Importa l'Excel (foglio «Tavoli») oppure aggiungi i tavoli a mano.</p><button class="btn" data-act="table-add" data-f="tondo">＋ Tavolo tondo</button> <button class="btn alt" data-act="table-add" data-f="rett">＋ Tavolo rettangolare</button></div>`}`;
}
ACTIONS.tlist = el => { UI.tlist = el.checked; rr(); };
ACTIONS['table-add'] = el => { const E = curEvent(); E.tables.push(newTable(E, el.dataset.f, el.dataset.f === 'tondo' ? 10 : 14)); save(); rr(); };
ACTIONS['table-edit'] = el => {
  const E = curEvent(), t = E.tables.find(x => x.id === el.dataset.t);
  openModal(`<h3>Tavolo ${t.num}</h3><form id="tf" data-t="${t.id}"><div class="fields">
    <div class="field"><label>Numero</label><input type="number" name="num" value="${t.num}"></div><div class="field"><label>Nome (facoltativo)</label><input type="text" name="nome" value="${esc(t.nome)}"></div>
    <div class="field"><label>Forma</label><select name="forma"><option value="tondo" ${t.forma === 'tondo' ? 'selected' : ''}>Tondo</option><option value="rett" ${t.forma === 'rett' ? 'selected' : ''}>Rettangolare (imperiale)</option></select></div>
    <div class="field"><label>Numero di posti</label><input type="number" name="posti" min="1" max="24" value="${t.seats.length}"></div></div>
    <p class="hint">Tondo: da 8 a 11 persone. Rettangolare: i posti sono divisi sui due lati lunghi (prima il lato superiore, da sinistra a destra).</p>
    <div class="acts"><button type="button" class="btn danger" data-act="table-del" data-t="${t.id}">Elimina tavolo</button><button type="button" class="btn alt" data-act="table-clear" data-t="${t.id}">Svuota posti</button><span class="grow"></span><button type="button" class="btn alt" data-act="modal-close">Annulla</button><button class="btn">Salva</button></div></form>`);
};
document.addEventListener('submit', e => {
  if (e.target.id !== 'tf') return; e.preventDefault();
  const E = curEvent(), t = E.tables.find(x => x.id === e.target.dataset.t), fd = new FormData(e.target);
  t.num = parseInt(fd.get('num')) || t.num; t.nome = fd.get('nome').trim(); t.forma = fd.get('forma');
  const lost = resizeTable(t, fd.get('posti'));
  save(); closeModal(); rr(); if (lost.length) toast(`${lost.length} invitati sono tornati da assegnare`);
});
ACTIONS['table-del'] = el => { if (!confirm('Eliminare il tavolo? Gli invitati tornano “da assegnare”.')) return; const E = curEvent(); E.tables = E.tables.filter(t => t.id !== el.dataset.t); save(); closeModal(); rr(); };
ACTIONS['table-clear'] = el => { const E = curEvent(), t = E.tables.find(x => x.id === el.dataset.t); t.seats = t.seats.map(() => null); save(); closeModal(); rr(); };
ACTIONS.seat = el => {
  const E = curEvent(), t = E.tables.find(x => x.id === el.dataset.t), i = +el.dataset.i, cur = t.seats[i] && E.guests.find(g => g.id === t.seats[i]);
  const free = E.guests.filter(g => !seatOf(E, g.id));
  openModal(`<h3>${esc(t.nome || 'Tavolo ' + t.num)} · posto ${i + 1}</h3>${cur ? `<div class="alert info">Occupato da <b>${esc(fullName(cur))}</b> ${iconsHtml(cur)} <button class="btn sm alt" data-act="seat-free" data-t="${t.id}" data-i="${i}">Libera il posto</button></div><div class="sp"></div>` : ''}
    <div class="field"><label>${cur ? 'Sostituisci con' : 'Assegna a'} (invitati ancora senza posto: ${free.length})</label>
    <select id="seat-sel" size="8" style="height:auto">${free.map(g => `<option value="${g.id}">${esc(fullName(g))}${hasSpecial(g) ? ' ⚠' : ''}</option>`).join('')}</select></div>
    <div class="acts"><button class="btn alt" data-act="modal-close">Chiudi</button><button class="btn" data-act="seat-set" data-t="${t.id}" data-i="${i}">Assegna</button></div>`);
};
ACTIONS['seat-free'] = el => { const E = curEvent(); E.tables.find(t => t.id === el.dataset.t).seats[+el.dataset.i] = null; save(); closeModal(); rr(); };
ACTIONS['seat-set'] = el => { const gid = $('#seat-sel').value; if (!gid) return; placeGuest(curEvent(), gid, el.dataset.t, +el.dataset.i); closeModal(); rr(); };
function placeGuest(E, gid, tid, idx) {
  const t = E.tables.find(x => x.id === tid), prev = seatOf(E, gid), occ = t.seats[idx];
  if (occ === gid) return;
  if (prev) prev.t.seats[prev.i] = occ || null;           // scambio se il posto d'origine esiste
  t.seats[idx] = gid; save();
}
/* drag & drop */
let dragG = null;
document.addEventListener('dragstart', e => { const el = e.target.closest('[data-g]'); if (el) { dragG = el.dataset.g; e.dataTransfer.setData('text/plain', dragG); e.dataTransfer.effectAllowed = 'move'; } });
document.addEventListener('dragover', e => { if (dragG && e.target.closest('[data-drop],[data-pool]')) { e.preventDefault(); } });
document.addEventListener('dragenter', e => { const s = e.target.closest('[data-drop]'); if (dragG && s) s.classList.add('over'); });
document.addEventListener('dragleave', e => { const s = e.target.closest('[data-drop]'); if (s) s.classList.remove('over'); });
document.addEventListener('drop', e => {
  if (!dragG) return; const E = curEvent(); const seat = e.target.closest('[data-drop]'), pool = e.target.closest('[data-pool]');
  if (seat) { e.preventDefault(); placeGuest(E, dragG, seat.dataset.t, +seat.dataset.i); }
  else if (pool) { e.preventDefault(); const p = seatOf(E, dragG); if (p) { p.t.seats[p.i] = null; save(); } }
  dragG = null; rr();
});
document.addEventListener('dragend', () => { dragG = null; $$('.over').forEach(x => x.classList.remove('over')); });
