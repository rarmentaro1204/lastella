/* =====================================================================
   Sezione 01 · EVENTO  → Questionario · Invitati · Tavoli e mappa
   ===================================================================== */
VIEWS.evento = E => ({ questionario: viewQuestionario, invitati: viewInvitati, tavoli: viewTavoli, consegne: viewConsegne }[ROUTE.sub] || viewQuestionario)(E);

/* ---------------------------------------------------------------- dati obbligatori */
const isEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim());
function missingRequired(E) {
  const q = E.q, m = [];
  if (!String(q.sposo1 || '').trim()) m.push('nome del committente 1');
  if (!String(q.tel || '').replace(/\D/g, '').length || String(q.tel).replace(/\D/g, '').length < 6) m.push('telefono del committente 1');
  if (!isEmail(q.email)) m.push('email del committente 1');
  return m;
}
const miss = (E, f) => { const q = E.q; return f === 'sposo1' ? !String(q.sposo1 || '').trim() : f === 'tel' ? String(q.tel || '').replace(/\D/g, '').length < 6 : f === 'email' ? !isEmail(q.email) : false; };

/* ---------------------------------------------------------------- calendario (date occupate / preventivi) */
const MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
function monthGrid(y, mo, o = {}) {
  const first = new Date(y, mo, 1), lead = (first.getDay() + 6) % 7, days = new Date(y, mo + 1, 0).getDate(), today = isoOf(new Date());
  let h = '<div class="cal">' + ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(d => `<div class="cal-h">${d}</div>`).join('');
  for (let i = 0; i < lead; i++) h += '<div class="cal-c off"></div>';
  for (let d = 1; d <= days; d++) {
    const iso = `${y}-${String(mo + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`, ds = dateStatus(iso, o.exceptId);
    const cls = ['cal-c', ds ? (ds.st === 'quote' ? 'pend' : ds.st) : '', iso === o.selected ? 'sel' : '', iso === today ? 'today' : ''].join(' ');
    const tip = ds ? (ds.st === 'busy' ? `Occupata: ${evName(ds.ev)} (${ds.ev.stato})` : `Preventivo non confermato: ${evName(ds.ev)}${ds.n > 1 ? ` (+${ds.n - 1})` : ''}`) : '';
    h += o.pick ? `<button type="button" class="${cls}" ${ds && ds.st === 'busy' ? 'disabled' : `data-act="cal-pick" data-d="${iso}"`} title="${esc(tip)}">${d}${ds ? '<i></i>' : ''}</button>`
      : `<div class="${cls}" title="${esc(tip)}">${d}${ds ? '<i></i>' : ''}</div>`;
  }
  return h + '</div>';
}
const calLegend = () => '<div class="legend" style="margin-top:10px"><span><i class="lg busy"></i> Occupata da evento confermato</span><span><i class="lg pend"></i> Preventivo non ancora confermato</span><span><i class="lg sel"></i> Data scelta</span></div>';
/* selezione data in tre passaggi: anno → mese → giorno */
function calModal(E, step = 'year', y, mo) {
  UI.cal = { step, y, m: mo };
  const now = new Date(), Y = now.getFullYear(), sel = E.q.data ? new Date(E.q.data + 'T12:00:00') : null;
  const crumbs = `<div class="steps"><span class="${step === 'year' ? 'on' : 'done'}">1 · Anno</span><span class="${step === 'month' ? 'on' : step === 'day' ? 'done' : ''}">2 · Mese</span><span class="${step === 'day' ? 'on' : ''}">3 · Giorno</span></div>`;
  const evIn = (yy, mm) => S.events.filter(e => e.id !== E.id && e.q.data && e.stato !== 'Annullato' && +e.q.data.slice(0, 4) === yy && (mm === undefined || +e.q.data.slice(5, 7) - 1 === mm));
  const badges = list => `${list.filter(isConfirmed).length ? `<span class="pill bad">${list.filter(isConfirmed).length} occupate</span>` : ''} ${list.filter(e => !isConfirmed(e)).length ? `<span class="pill warn">${list.filter(e => !isConfirmed(e)).length} preventivi</span>` : ''}`;
  let body;
  if (step === 'year') {
    body = `<h3 style="margin-bottom:6px">In che anno si terrà l'evento?</h3><div class="yrs">${[0, 1, 2, 3].map(k => { const yy = Y + k, l = evIn(yy); return `<button type="button" class="ybtn ${sel && sel.getFullYear() === yy ? 'sel' : ''}" data-act="cal-step" data-s="month" data-y="${yy}"><b>${yy}</b><span>${k === 0 ? 'anno in corso' : k === 1 ? 'anno prossimo' : `tra ${k} anni`}</span><i>${badges(l) || '<span class="muted small">date libere</span>'}</i></button>`; }).join('')}</div>`;
  } else if (step === 'month') {
    body = `<div class="row"><button class="btn sm alt" data-act="cal-step" data-s="year">‹ Anno</button><h3 style="margin:0">${y}</h3></div><div class="sp"></div><div class="mths">${MESI.map((mn, k) => { const l = evIn(y, k), past = y === Y && k < now.getMonth(); return `<button type="button" class="mbtn ${sel && sel.getFullYear() === y && sel.getMonth() === k ? 'sel' : ''}" ${past ? 'disabled' : `data-act="cal-step" data-s="day" data-y="${y}" data-m="${k}"`}><b>${mn}</b><i>${badges(l)}</i></button>`; }).join('')}</div>`;
  } else {
    body = `<div class="row"><button class="btn sm alt" data-act="cal-step" data-s="month" data-y="${y}">‹ ${y}</button><h3 style="margin:0;flex:1;text-align:center">${MESI[mo]} ${y}</h3></div><div class="sp"></div>${monthGrid(y, mo, { pick: true, selected: E.q.data, exceptId: E.id })}${calLegend()}`;
  }
  openModal(`${crumbs}${body}<div class="acts">${E.q.data ? '<button class="btn danger" data-act="cal-pick" data-d="">Togli la data</button>' : ''}<button class="btn alt" data-act="modal-close">Chiudi</button></div>`);
}
ACTIONS['cal-open'] = () => calModal(curEvent(), 'year');
ACTIONS['cal-step'] = el => calModal(curEvent(), el.dataset.s, el.dataset.y ? +el.dataset.y : (UI.cal || {}).y, el.dataset.m !== undefined ? +el.dataset.m : (UI.cal || {}).m);
ACTIONS['cal-pick'] = el => {
  const E = curEvent(), d = el.dataset.d; E.q.data = d;
  if (d) { const ds = dateStatus(d, E.id); if (ds && ds.st === 'quote') toast(`Attenzione: per questa data c'è già un preventivo (${evName(ds.ev)})`); autoDates(E); }
  if (d && E.pagAuto) syncPagamenti(E);
  save(); closeModal(); rr();
};

HOOKS.loc = (el, v) => { const E = curEvent(); if (v) applyLocation(E, v); else { E.q.location = ''; if (!E.q.listino) E.q.listino = S.settings.listini[0].id; if (!(E.q.spazi || []).length) E.q.spazi = CAT.locationsSeed[0].spazi.map(s => ({ momento: s.momento, a: '', b: '', orario: '' })); } if (E.pagAuto) syncPagamenti(E); rr(); };
HOOKS.scadman = el => { curEvent().q.auto[el.dataset.f] = false; };
ACTIONS['scad-auto'] = el => { const E = curEvent(); E.q.auto[el.dataset.f] = true; autoDates(E); save(); rr(); };
HOOKS.stato = (el, v) => {
  const E = curEvent();
  if (CONFIRMED.includes(v)) {
    if (!E.q.data) { E.stato = 'Preventivo'; toast('Per confermare l\'evento serve la data'); }
    else { const ds = dateStatus(E.q.data, E.id); if (ds && ds.st === 'busy') { E.stato = 'Preventivo'; toast(`Data già occupata da «${evName(ds.ev)}»: non si può confermare`); } else if (missingRequired(E).length) { E.stato = 'Preventivo'; toast('Completa i dati del committente 1 per confermare'); } }
  }
  rr();
};

/* ---------------------------------------------------------------- QUESTIONARIO */
const F = (E, label, path, o = {}) => {
  const v = pget(E, path) ?? '';
  const cls = 'field' + (o.wide ? ' wide' : '') + (o.w2 ? ' w2' : '') + (o.bad ? ' bad' : '');
  let ctl;
  if (o.options) ctl = `<select data-b="${path}" ${o.hook ? `data-hook="${o.hook}"` : ''} ${o.r ? 'data-r' : ''}>${o.options.map(x => { const [val, lab] = Array.isArray(x) ? x : [x, x]; return `<option value="${esc(val)}" ${String(v) === String(val) ? 'selected' : ''}>${esc(lab)}</option>`; }).join('')}</select>`;
  else if (o.area) ctl = `<textarea data-b="${path}" placeholder="${esc(o.ph || '')}">${esc(v)}</textarea>`;
  else ctl = `<input type="${o.type || 'text'}" data-b="${path}" ${o.hook ? `data-hook="${o.hook}"` : ''} ${o.f ? `data-f="${o.f}"` : ''} ${o.r ? 'data-r' : ''} value="${esc(v)}" placeholder="${esc(o.ph || '')}" ${o.min !== undefined ? `min="${o.min}"` : ''} ${o.req ? 'required' : ''}>`;
  return `<div class="${cls}"><label>${label}${o.req ? ' <b class="reqm">*</b>' : ''}</label>${ctl}${o.hint ? `<span class="hint">${o.hint}</span>` : ''}${o.bad ? '<span class="hint bad">Obbligatorio</span>' : ''}</div>`;
};
const custBox = (E, ...secs) => { const l = customizations(E).filter(c => secs.some(s => c.sec.startsWith(s))); return l.length ? `<div class="alert" style="margin-top:12px"><b>⚠ Customizzazioni rispetto alla location e al listino</b><ul style="margin:6px 0 0 18px;padding:0">${l.map(c => `<li class="small">${esc(c.text)}</li>`).join('')}</ul><div class="hint" style="margin-top:4px">La modifica degli spazi o del listino può far variare la quotazione.</div></div>` : ''; };
const scadField = (E, label, f, hint) => `<div class="field"><label>${label} ${E.q.auto[f] ? '<span class="pill ok">auto</span>' : '<span class="pill warn">manuale</span> <a href="javascript:void 0" data-act="scad-auto" data-f="' + f + '" class="small">ripristina auto</a>'}</label><input type="date" data-b="q.${f}" data-hook="scadman" data-f="${f}" data-r value="${esc(E.q[f])}"><span class="hint">${hint}</span></div>`;

function viewQuestionario(E) {
  const q = E.q, g = giornoOf(E), cnt = guestCounts(E), mi = missingRequired(E), nl = id => (S.settings.listini.find(l => l.id === id) || {}).nome;
  const sync = E.guests.length && (cnt.Adulto !== +q.adulti || cnt.Bambino !== +q.bambini || cnt.Neonato !== +q.neonati || cnt.Staff !== (+q.staff || 0))
    ? `<div class="alert info noprint">L'elenco invitati contiene <b>${cnt.Adulto}</b> adulti, <b>${cnt.Bambino}</b> bambini, <b>${cnt.Neonato}</b> neonati, <b>${cnt.Staff}</b> staff. <button class="btn sm alt" data-act="sync-counts">Allinea i numeri qui sotto</button></div>` : '';
  const dateBtn = `<div class="field"><label>Data della cerimonia <b class="reqm">*</b></label><button type="button" class="datebtn" data-act="cal-open">${q.data ? '📅 ' + esc(fmtDate(q.data)) : '📅 Scegli la data…'}</button>
    <span class="hint">${q.data ? `Tariffa <b>${g === 'sabato' ? 'sabato' : 'domenica–venerdì'}</b>. ` : ''}Il calendario mostra le date già occupate e quelle con un preventivo non confermato.</span></div>`;
  const ds = q.data && dateStatus(q.data, E.id);
  return `<div class="secthead"><div><h2>Questionario di conoscenza</h2><p>Le domande che il titolare pone a chi commissiona l'evento. Tutto si salva da solo. I campi con <b class="reqm">*</b> sono obbligatori per proseguire.</p></div></div>
  ${mi.length ? `<div class="alert bad" style="margin-bottom:16px"><b>Per andare avanti compila:</b> ${mi.join(', ')}.</div>` : ''}
  ${ds && ds.st === 'quote' ? `<div class="alert" style="margin-bottom:16px">Per il ${esc(fmtDate(q.data))} c'è già un preventivo non confermato: «${esc(evName(ds.ev))}».</div>` : ''}
  <div class="card"><h3>1 · Committenti e contatti</h3>
    <h4 style="margin:4px 0 10px">Committente 1 <span class="muted small" style="text-transform:none;letter-spacing:0">(obbligatorio)</span></h4><div class="fields">
      ${F(E, 'Nome e cognome', 'q.sposo1', { req: 1, bad: miss(E, 'sposo1') })}${F(E, 'Telefono', 'q.tel', { type: 'tel', req: 1, bad: miss(E, 'tel') })}${F(E, 'Email', 'q.email', { type: 'email', req: 1, bad: miss(E, 'email') })}</div>
    <h4 style="margin:18px 0 10px">Committente 2 <span class="muted small" style="text-transform:none;letter-spacing:0">(facoltativo)</span></h4><div class="fields">
      ${F(E, 'Nome e cognome', 'q.sposo2')}${F(E, 'Telefono', 'q.tel2', { type: 'tel' })}${F(E, 'Email', 'q.email2', { type: 'email' })}</div>
    <h4 style="margin:18px 0 10px">Altri riferimenti</h4><div class="fields">
      ${F(E, 'Wedding planner', 'q.planner')}${F(E, 'Telefono wedding planner', 'q.plannerTel', { type: 'tel' })}
      ${F(E, 'Come ci avete conosciuto', 'q.provenienza', { options: ['', 'Passaparola', 'Instagram / social', 'Sito web', 'Wedding planner', 'Location', 'Open day / fiera', 'Altro'] })}
      ${F(E, 'Budget indicativo', 'q.budget', { ph: 'es. 20.000 €' })}</div></div>
  <div class="card"><h3>2 · Quando</h3><div class="fields">
    ${F(E, 'Tipo di evento', 'q.tipo', { options: ['Matrimonio', 'Anniversario', 'Compleanno', 'Evento aziendale', 'Battesimo / Comunione', 'Altro'] })}
    ${dateBtn}
    ${F(E, 'Pranzo o cena', 'q.pasto', { options: ['Cena', 'Pranzo'] })}
    ${F(E, 'Tariffa giorno', 'q.giorno', { r: 1, options: [['auto', 'Automatica dalla data'], ['sabato', 'Sabato'], ['feriale', 'Domenica–venerdì']] })}
    ${F(E, 'Tipo di cerimonia', 'q.rito', { options: ['Civile', 'Religiosa', 'Rito simbolico', 'Nessuna cerimonia'] })}
    ${F(E, 'Note sulla cerimonia', 'q.ritoNote')}
    ${F(E, 'Data firma del contratto', 'q.firma', { type: 'date', r: 1, hint: 'Serve per la prima caparra (entro 5 giorni dalla firma).' })}</div>
    <div class="sp"></div><h4>Scadenze · calcolate in automatico dalla data della cerimonia</h4><div class="fields" style="margin-top:8px">
    ${scadField(E, 'Scelte allestimenti entro', 'scadenzaAllest', 'Dopo questa data la quotazione può variare (31/01 dell\'anno, o 120 giorni prima).')}
    ${scadField(E, 'Definizione menù entro', 'scadenzaMenu', '60 giorni lavorativi prima dell\'evento (art. 2.2 b).')}
    ${scadField(E, 'Validità del preventivo fino al', 'validita', '18 giorni dalla creazione del preventivo.')}</div>
    <p class="hint" style="margin-top:8px">Le altre scadenze (consulenza, assaggio, controfirma, file dei 15 giorni, rate di pagamento) sono nelle schede «Consegne 15 gg» ed «Economics».</p></div>
  <div class="card"><h3>3 · Dove</h3><div class="fields">
    ${F(E, 'Location', 'q.location', { hook: 'loc', options: [['', 'Altra location (fuori elenco)'], ...S.settings.locations.map(l => [l.id, l.nome])] })}
    ${q.location ? '' : F(E, 'Nome della location', 'q.locationNome')}
    ${F(E, 'Listino applicato', 'q.listino', { r: 1, options: S.settings.listini.map(l => [l.id, l.nome]) })}</div>
    <div class="sp"></div><h4>Organizzazione degli spazi · Piano A / Piano B (meteo)</h4>
    <table class="tb"><thead><tr><th>Momento</th><th>Orario indicativo</th><th>Piano A</th><th>Piano B</th></tr></thead><tbody>
    ${(q.spazi || []).map((s, i) => `<tr><td>${esc(s.momento)}</td><td><input type="time" data-b="q.spazi.${i}.orario" value="${esc(s.orario)}"></td><td><input type="text" data-b="q.spazi.${i}.a" data-r value="${esc(s.a)}"></td><td><input type="text" data-b="q.spazi.${i}.b" data-r value="${esc(s.b)}"></td></tr>`).join('') || '<tr><td colspan="4" class="muted">Scegli una location per precompilare gli spazi.</td></tr>'}</tbody></table>
    <p class="hint">Precompilato dalla location scelta: puoi modificarlo in base alle richieste (comparirà un avviso). La tabella oraria definitiva si compila 10 giorni prima dell'evento.</p>${custBox(E, 'Location', 'Spazi', 'Tariffa')}</div>
  <div class="card"><h3>4 · Quanti siete</h3>${sync}<div class="fields">
    ${F(E, 'Ospiti adulti (paganti per intero)', 'q.adulti', { type: 'number', min: 0, r: 1, hint: 'Prezzo secondo le regole del contratto: minimo 100 adulti, sotto i 100 −€ 60 per ospite mancante (minimo 60).' })}
    ${F(E, 'Bambini (3–10 anni)', 'q.bambini', { type: 'number', min: 0, r: 1 })}
    ${F(E, 'Neonati (0–2 anni)', 'q.neonati', { type: 'number', min: 0, r: 1 })}
    ${F(E, 'Staff / fornitori a tavola', 'q.staff', { type: 'number', min: 0, r: 1 })}
    <div class="field"><label>Totale coperti</label><div class="counter" id="cop">${(+q.adulti || 0) + (+q.bambini || 0) + (+q.neonati || 0) + (+q.staff || 0)}</div><span class="hint">Tavoli tondi: da 8 a 11 persone, bambini e neonati compresi.</span></div></div></div>
  <div class="card"><h3>5 · Altro da sapere</h3><div class="fields">
    ${F(E, 'Altri fornitori (foto, fiori, musica…)', 'q.fornitori', { area: 1, w2: 1 })}
    ${F(E, 'Accessibilità / ospiti con esigenze motorie', 'q.accessibilita', { area: 1, w2: 1 })}
    ${F(E, 'Note e desideri', 'q.note', { area: 1, wide: 1, ph: 'Tutto ciò che emerge nel colloquio…' })}</div></div>
  <div class="row noprint" style="margin-top:18px;justify-content:flex-end"><button class="btn" data-act="q-next">Salva e continua → Invitati</button></div>`;
}
ACTIONS['q-next'] = () => { const E = curEvent(), mi = missingRequired(E); if (mi.length) { toast('Mancano: ' + mi.join(', ')); rr(); return; } if (!E.q.data) toast('Ricorda di scegliere la data della cerimonia'); go(evUrl('evento', 'invitati')); };

ACTIONS['sync-counts'] = () => { const E = curEvent(), c = guestCounts(E); E.q.adulti = c.Adulto; E.q.bambini = c.Bambino; E.q.neonati = c.Neonato; E.q.staff = c.Staff; save(); rr(); toast('Numeri allineati all\'elenco invitati'); };

/* ---------------------------------------------------------------- icone esigenze */
const aIc = k => CAT.allergie.find(x => x.k === k), iIc = k => CAT.intolleranze.find(x => x.k === k), dIc = k => CAT.diete.find(x => x.k === k);
function iconsHtml(g, o = {}) {
  let h = '';
  if (!o.noFascia && g.fascia !== 'Adulto') { const f = CAT.fasce.find(x => x.k === g.fascia); h += `<span class="ic fa" title="${esc(f.label)}">${f.icon}</span>`; }
  if (g.seggiolone) h += `<span class="ic fa" title="Seggiolone">🪑</span>`;
  g.allergie.forEach(k => { const a = aIc(k); h += `<span class="ic all" title="Allergia: ${esc(a.label)}">${a.icon}</span>`; });
  if (g.altro) h += `<span class="ic all txt" title="Altra allergia / intolleranza: ${esc(g.altro)}">⚠ ${esc(g.altro.length > 16 ? g.altro.slice(0, 15) + '…' : g.altro)}</span>`;
  g.intolleranze.forEach(k => { const a = iIc(k); h += `<span class="ic int" title="Intolleranza: ${esc(a.label)}">${a.icon}</span>`; });
  if (g.dieta) { const d = dIc(g.dieta); h += `<span class="ic die" title="Dieta: ${esc(d.label)}">${d.icon}</span>`; }
  return h ? `<span class="icons">${h}</span>` : '';
}
const legendHtml = () => `<div class="legend"><span><span class="ic all">🌾</span> Allergia</span><span><span class="ic int">🥛</span> Intolleranza</span><span><span class="ic die">🌱</span> Dieta / preferenza</span><span><span class="ic fa">🧒</span> Bambino · <span class="ic fa">🍼</span> Neonato</span></div>`;
const guestTip = g => [fullName(g) + ' · ' + g.fascia, g.dieta && 'Dieta: ' + g.dieta, g.seggiolone && 'Seggiolone', g.allergie.length && 'ALLERGIE: ' + g.allergie.map(k => aIc(k).label).join(', '), g.intolleranze.length && 'Intolleranze: ' + g.intolleranze.map(k => iIc(k).label).join(', '), g.altro && 'Altro: ' + g.altro, g.note && 'Note: ' + g.note].filter(Boolean).join('\n');

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
  <div class="tiles"><div class="tile"><b>${c.tot}</b><span>Invitati</span></div><div class="tile"><b>${c.Adulto}</b><span>Adulti</span></div><div class="tile"><b>${c.Bambino}</b><span>Bambini</span></div><div class="tile"><b>${c.Neonato}</b><span>Neonati</span></div><div class="tile"><b>${c.Staff}</b><span>Staff</span></div><div class="tile"><b>${c.seggioloni}</b><span>Seggioloni</span></div>
    <div class="tile a"><b>${c.allergie}</b><span>Con allergie</span></div><div class="tile i"><b>${c.intolleranze}</b><span>Intolleranze</span></div><div class="tile d"><b>${Object.values(c.diete).reduce((a, b) => a + b, 0)}</b><span>Diete speciali</span></div></div>
  ${needs}
  ${E.guests.length ? `<div class="toolbar noprint"><input type="text" placeholder="Cerca per nome…" value="${esc(UI.guestQ)}" id="gq"><div class="chips">${filters.map(([k, l]) => `<button class="chip ${f === k ? 'on' : ''}" data-act="gfilter" data-v="${k}">${l}</button>`).join('')}</div>
    <button class="btn sm alt right" data-act="export-guests">⭳ Scheda cucina (Excel)</button></div>
    <table class="tb"><thead><tr><th>Invitato</th><th>Fascia</th><th>Tavolo</th><th>Esigenze alimentari</th><th>Note</th><th></th></tr></thead><tbody>
    ${list.map(g => { const s = seatOf(E, g.id); return `<tr class="click" data-act="guest-edit" data-id="${g.id}"><td><b>${esc(fullName(g))}</b></td><td>${esc(g.fascia)}</td>
      <td class="noprint" style="white-space:nowrap">${seatSelects(E, g, true)}</td><td>${iconsHtml(g, { noFascia: 1 }) || '<span class="muted">—</span>'}</td><td class="small muted">${esc(g.note)}</td>
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
ACTIONS['guest-edit'] = (el, ev) => { if (ev && ev.target.closest('select,input,button,option')) return; guestModal(curEvent().guests.find(g => g.id === el.dataset.id), false); };
function guestModal(g, isNew) {
  const chk = (name, arr, sel) => arr.map(a => `<label><input type="checkbox" name="${name}" value="${a.k}" ${sel.includes(a.k) ? 'checked' : ''}> <span class="ic ${name === 'all' ? 'all' : 'int'}">${a.icon}</span> ${esc(a.label)}</label>`).join('');
  openModal(`<h3>${isNew ? 'Nuovo invitato' : esc(fullName(g))}</h3><form id="gf" data-id="${g.id}" data-new="${isNew ? 1 : ''}">
    <div class="fields"><div class="field"><label>Nome</label><input type="text" name="nome" value="${esc(g.nome)}" required></div><div class="field"><label>Cognome</label><input type="text" name="cognome" value="${esc(g.cognome)}"></div>
    <div class="field"><label>Fascia</label><select name="fascia">${CAT.fasce.map(f => `<option value="${f.k}" ${g.fascia === f.k ? 'selected' : ''}>${f.label}</option>`).join('')}</select></div>
    <div class="field"><label>Seggiolone</label><label class="row" style="gap:6px;padding:8px 0"><input type="checkbox" name="segg" ${g.seggiolone ? 'checked' : ''}> serve un seggiolone</label></div>
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
  Object.assign(g, { nome: fd.get('nome').trim(), cognome: fd.get('cognome').trim(), fascia: fd.get('fascia'), seggiolone: fd.has('segg'), dieta: fd.get('dieta'), allergie: fd.getAll('all'), intolleranze: fd.getAll('int'), altro: fd.get('altro').trim(), note: fd.get('note').trim() });
  if (f.new) E.guests.push(g);
  save(); closeModal(); rr();
});

/* ---- import Excel ---- */
document.addEventListener('change', e => {
  if (e.target.id !== 'xls-file') return;
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  f.arrayBuffer().then(buf => {
    let res; try { res = parseWorkbook(XLSX.read(buf, { type: 'array' })); } catch (err) { alert('Impossibile leggere il file: ' + err.message); return; }
    const E = curEvent(), c = { Adulto: 0, Bambino: 0, Neonato: 0, Staff: 0 }; res.guests.forEach(g => c[g.fascia]++);
    const sp = res.guests.filter(hasSpecial).length, seated = res.tables.reduce((a, t) => a + t.seats.filter(Boolean).length, 0);
    window._import = res;
    openModal(`<h3>Anteprima importazione</h3><div class="tiles"><div class="tile"><b>${res.guests.length}</b><span>Invitati</span></div><div class="tile"><b>${c.Adulto}/${c.Bambino}/${c.Neonato}</b><span>Ad./Bamb./Neon.</span></div><div class="tile a"><b>${sp}</b><span>Con esigenze</span></div><div class="tile"><b>${res.tables.length}</b><span>Tavoli</span></div><div class="tile"><b>${seated}</b><span>Posti assegnati</span></div></div>
      ${res.warnings.length ? `<div class="alert">${res.warnings.length} avvisi da controllare:<ul class="warnlist">${res.warnings.map(w => `<li>${esc(w)}</li>`).join('')}</ul></div>` : '<div class="alert ok">Nessun problema rilevato.</div>'}
      ${E.guests.length ? `<p>Nell'evento ci sono già <b>${E.guests.length}</b> invitati e <b>${E.tables.length}</b> tavoli.</p>` : ''}
      <label class="row" style="margin-top:10px"><input type="checkbox" id="imp-sync" checked> Aggiorna anche i numeri ospiti del questionario (${c.Adulto} adulti, ${c.Bambino} bambini, ${c.Neonato} neonati, ${c.Staff} staff)</label>
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
  if ($('#imp-sync') && $('#imp-sync').checked) { const c = guestCounts(E); E.q.adulti = c.Adulto; E.q.bambini = c.Bambino; E.q.neonati = c.Neonato; E.q.staff = c.Staff; }
  save(); closeModal(); window._import = null; toast(`Importati ${r.guests.length} invitati e ${r.tables.length} tavoli`); rr();
}
ACTIONS['imp-replace'] = () => doImport(true);
ACTIONS['imp-append'] = () => doImport(false);

ACTIONS['export-guests'] = () => {
  const E = curEvent(), rows = [['Tavolo', 'Posto', 'Nome', 'Cognome', 'Fascia', 'Dieta', 'Seggiolone', 'ALLERGIE', 'Intolleranze', 'Altro', 'Note']];
  const seatKey = g => { const s = seatOf(E, g.id); return s ? [s.t.num, s.i + 1] : [9999, 0]; };
  E.guests.slice().sort((a, b) => { const x = seatKey(a), y = seatKey(b); return x[0] - y[0] || x[1] - y[1]; }).forEach(g => {
    const s = seatOf(E, g.id);
    rows.push([s ? (s.t.nome || 'Tavolo ' + s.t.num) : 'Da assegnare', s ? s.i + 1 : '', g.nome, g.cognome, g.fascia, g.dieta, g.seggiolone ? 'SÌ' : '', g.allergie.map(k => aIc(k).label).join(', '), g.intolleranze.map(k => iIc(k).label).join(', '), g.altro, g.note]);
  });
  const wb = XLSX.utils.book_new(); const ws = XLSX.utils.aoa_to_sheet(rows); ws['!cols'] = [18, 7, 14, 16, 10, 14, 10, 30, 24, 20, 30].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws, 'Scheda cucina');
  const sp = XLSX.utils.aoa_to_sheet([['Solo ospiti con esigenze', ''], ...rows.filter((r, i) => i === 0 || r[5] || r[6] || r[7] || r[8] || r[9] || r[10])]); XLSX.utils.book_append_sheet(wb, sp, 'Solo esigenze');
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
  const nm = t.nome || `Tavolo ${t.num}`, ti = E.tables.indexOf(t);
  return `<div class="tcard ${tooMany ? 'bad' : ''}"><div class="thead"><h4>${esc(nm)}</h4><span class="pill ${occ === t.seats.length ? 'ok' : 'warn'}">${occ}/${t.seats.length}</span>
    <span class="pill printonly">${t.forma === 'tondo' ? '◯ Tondo' : '▭ Rettangolare'}</span>${sp ? `<span class="pill bad" title="Ospiti con esigenze">⚠ ${sp}</span>` : ''}
    <span class="right noprint"><button class="btn ghost sm" data-act="table-edit" data-t="${t.id}" title="Rinomina o elimina il tavolo">⚙</button></span></div>
    <div class="tctl noprint"><select data-b="tables.${ti}.forma" data-r title="Tipo di tavolo"><option value="tondo" ${t.forma === 'tondo' ? 'selected' : ''}>◯ Tondo</option><option value="rett" ${t.forma === 'rett' ? 'selected' : ''}>▭ Rettangolare</option></select>
      <span class="stepper"><button type="button" data-act="t-seats" data-t="${t.id}" data-d="-1" title="Togli un posto">−</button><b>${t.seats.length} posti</b><button type="button" data-act="t-seats" data-t="${t.id}" data-d="1" title="Aggiungi un posto">＋</button></span></div>
    ${tooMany ? '<div class="alert bad small">Un tavolo tondo può ospitare al massimo 11 persone.</div>' : ''}${few ? '<div class="alert small">Sotto le 8 persone per un tavolo tondo (minimo previsto 8).</div>' : ''}
    <div class="map" style="width:${geo.w}px;height:${geo.h}px"><div class="tbl" style="left:${geo.table.x}px;top:${geo.table.y}px;width:${geo.table.w}px;height:${geo.table.h}px;border-radius:${geo.table.round ? '50%' : '8px'}"><div>${t.num}<small>${t.forma === 'tondo' ? 'tondo' : 'imperiale'}</small></div></div>
    ${t.seats.map((_, i) => seatHtml(E, t, i, geo.pos[i])).join('')}</div>
    ${UI.tlist ? `<ul class="slist">${t.seats.map((id, i) => { const g = id && E.guests.find(x => x.id === id); return g ? `<li data-act="seat" data-t="${t.id}" data-i="${i}"><span class="n">${i + 1}</span><span class="nm"><b>${esc(fullName(g))}</b></span>${iconsHtml(g)}</li>` : `<li class="empty" data-act="seat" data-t="${t.id}" data-i="${i}"><span class="n">${i + 1}</span><span class="nm">posto libero</span></li>`; }).join('')}</ul>` : ''}</div>`;
}
function viewTavoli(E) {
  const free = E.guests.filter(g => !seatOf(E, g.id)), totalSeats = E.tables.reduce((a, t) => a + t.seats.length, 0), seated = E.guests.length - free.length;
  const pool = `<div class="pool" data-pool><h4>Da assegnare <span class="badge">${free.length}</span></h4><div class="lst">${free.map(g => `<div class="gchip" draggable="true" data-g="${g.id}" style="flex-wrap:wrap"><span class="nm">${esc(fullName(g))}</span>${iconsHtml(g)}<span style="flex-basis:100%">${seatSelects(E, g, true)}</span></div>`).join('') || '<p class="muted small" style="padding:6px">Tutti gli invitati hanno un posto 🎉</p>'}</div></div>`;
  return `<div class="secthead"><div><h2>Tavoli e mappa della sala</h2><p>La disposizione scelta dagli sposi (dal foglio «Tavoli» dell'Excel). Trascina un invitato su un posto, oppure clicca un posto per assegnarlo. Passa il mouse su un posto per vedere tutte le particolarità.</p></div>
    <div class="row right noprint"><button class="btn alt" data-act="table-add" data-f="tondo">＋ Tavolo tondo</button><button class="btn alt" data-act="table-add" data-f="rett">＋ Tavolo rettangolare</button>${free.length ? '<button class="btn sand" data-act="auto-seat">Assegna i posti liberi automaticamente</button>' : ''}<button class="btn alt" onclick="window.print()">🖨 Stampa</button></div></div>
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

/* ---------------------------------------------------------------- CONSEGNE (file da inviare 15 giorni prima) */
function viewConsegne(E) {
  const q = E.q, k = E.consegne, c = guestCounts(E), n = E.tables.reduce((a, t) => a + t.seats.filter(Boolean).length, 0);
  const sc = [];
  if (q.data) {
    const d15 = new Date(q.data + 'T12:00:00'); d15.setDate(d15.getDate() - 15);
    sc.push(['60 giorni lavorativi prima', workdaysBefore(q.data, 60), 'Integrazioni al menù (Allegato A) e ai beni/materiali di allestimento (Allegato B) · art. 2.2 b']);
    sc.push(['30° giorno lavorativo prima', workdaysBefore(q.data, 30), 'Soglia extra time: € 400/ora entro, € 1.000/ora dopo · art. 4']);
    sc.push(['15 giorni prima', d15, 'Invio del file «da inviare 15 giorni prima»: numeri definitivi, allergie, tavoli, seggiolini, attrezzatura fornitori, extra time (FAQ 2027)']);
    sc.push(['10 giorni lavorativi prima', workdaysBefore(q.data, 10), 'Pianta dei tavoli in scala, numero definitivo dei commensali, allergie e intolleranze · art. 2.2 c, d, f']);
  }
  const bus = k.bussola.length ? `<div class="card" style="margin-bottom:16px"><div class="chead"><h3>Bussola · il percorso con i clienti</h3><span class="muted small">date calcolate dalla data della cerimonia (calendario Bussola), modificabili</span></div>
    <div class="grid g3" style="margin-top:6px">${k.bussola.map((b, i) => { const g = b.due ? daysFrom(new Date(b.due + 'T23:59:59')) : null; return `<div class="avoce ${b.done ? 'done' : ''}"><div class="head"><h4 style="font-size:15px">${i + 1} · ${esc(b.t)}</h4>${b.done ? '<span class="pill ok">✓ fatto</span>' : g !== null ? `<span class="pill ${g < 0 ? 'bad' : g < 30 ? 'warn' : ''}">${g < 0 ? 'in ritardo' : 'tra ' + g + ' gg'}</span>` : ''}</div><div class="hint" style="margin-bottom:8px">${esc(b.d)}</div>
      <div class="row" style="gap:8px"><input type="date" style="width:auto" data-b="consegne.bussola.${i}.due" data-hook="busman" data-i="${i}" data-r value="${esc(b.due)}"><label class="row" style="gap:6px"><input type="checkbox" data-b="consegne.bussola.${i}.done" data-r ${b.done ? 'checked' : ''}> completato</label></div></div>`; }).join('')}</div></div>` : '';
  const chk = (path, label, auto) => `<label class="row" style="gap:8px;align-items:flex-start;padding:6px 0"><input type="checkbox" data-b="${path}" data-r ${pget(E, path) ? 'checked' : ''}><span>${label}${auto ? `<div class="hint">${auto}</div>` : ''}</span></label>`;
  const alle = c.allergie + c.intolleranze;
  return `<div class="secthead"><div><h2>Consegne e scadenze</h2><p>Quello che il cliente deve far arrivare a La Stella (info@cateringlastella.com) entro 15 giorni dall'evento, più le altre scadenze contrattuali. Oltre quella data non si garantiscono disponibilità e tariffario dedicato.</p></div>
    <div class="row right noprint"><button class="btn alt" data-act="export-guests">⭳ Scheda invitati (Excel)</button></div></div>
  ${bus}
  ${q.data ? `<div class="grid g4" style="margin-bottom:16px">${sc.map(([l, d, t]) => { const g = daysFrom(d); return `<div class="tile" title="${esc(t)}"><span>${l}</span><b style="font-size:24px">${d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}</b><span class="pill ${g < 0 ? 'bad' : g < 30 ? 'warn' : ''}" style="margin-top:6px">${g < 0 ? 'scaduta' : 'tra ' + g + ' gg'}</span></div>`; }).join('')}</div>
    <p class="hint" style="margin:-6px 0 16px">I giorni lavorativi escludono sabato e domenica; le festività infrasettimanali non sono conteggiate. Passa il mouse su una scadenza per il dettaglio.</p>` : '<div class="alert">Inserisci la data dell\'evento nel Questionario per calcolare le scadenze.</div><div class="sp"></div>'}
  <div class="card"><h3>Checklist da inviare</h3>
    ${chk('consegne.numeriOk', '<b>Numero definitivo dei partecipanti, voi compresi</b>', `Adulti ${c.Adulto} · staff ${c.Staff} · bambini con menù bimbi ${c.Bambino} · neonati con pappe della mamma ${c.Neonato} · totale <b>${c.tot}</b> (questionario: ${(+q.adulti || 0) + (+q.bambini || 0) + (+q.neonati || 0) + (+q.staff || 0)})`)}
    ${chk('consegne.allergieOk', '<b>Intolleranze e allergie</b> di sposi e ospiti', alle ? `${c.allergie} ospiti con allergie, ${c.intolleranze} con intolleranze: la cucina propone un'alternativa al solo menù principale (aperitivo e buffet restano invariati).` : 'Nessuna segnalata nell\'elenco invitati.')}
    ${chk('consegne.tavoliOk', '<b>Composizione dei tavoli e nomi dei tavoli</b>', `${E.tables.length} tavoli, ${n}/${c.tot} invitati assegnati. Con i segnaposto serve l'elenco preciso dei commensali per tavolo.`)}
    ${chk('consegne.disposizioneOk', '<b>Disposizione dei tavoli in sala</b> (pianta con riferimenti, es. porta d\'ingresso, WC)')}
    <div class="fields" style="margin:6px 0 10px 26px"><div class="field"><label>Riferimenti per l'orientamento</label><input type="text" data-b="consegne.orientamento" value="${esc(k.orientamento)}" placeholder="es. ingresso lato nord, WC a destra"></div>
      <div class="field"><label>Posizione degli sposi</label><input type="text" data-b="consegne.sposiLato" value="${esc(k.sposiLato)}"></div></div>
    <div class="fields" style="margin-top:8px"><div class="field"><label>Seggiolini necessari</label><input type="number" data-b="consegne.seggiolini" value="${k.seggiolini === '' ? '' : k.seggiolini}" placeholder="${c.seggioloni} da elenco invitati"></div>
      <div class="field w2"><label>Attrezzatura aggiuntiva per altri fornitori (es. tavolo DJ, allestitori, confettata)</label><input type="text" data-b="consegne.attrezzatura" value="${esc(k.attrezzatura)}"><span class="hint">Servizio a pagamento da tariffario, se richiesto entro i 15 giorni.</span></div>
      <div class="field w2"><label>Notifica di eventuali extra time</label><input type="text" data-b="consegne.extratime" value="${esc(k.extratime)}"></div></div></div>
  <div class="sp"></div>
  <div class="card"><h3>Elenco fornitori</h3><table class="tb"><thead><tr><th>Ruolo</th><th>Nome del fornitore</th><th>Telefono</th><th>Email</th></tr></thead><tbody>
    ${k.fornitori.map((f, i) => `<tr><td>${i >= 7 ? `<input type="text" data-b="consegne.fornitori.${i}.ruolo" value="${esc(f.ruolo)}">` : esc(f.ruolo)}</td><td><input type="text" data-b="consegne.fornitori.${i}.nome" value="${esc(f.nome)}"></td><td><input type="tel" data-b="consegne.fornitori.${i}.tel" value="${esc(f.tel)}"></td><td><input type="email" data-b="consegne.fornitori.${i}.email" value="${esc(f.email)}"></td></tr>`).join('')}</tbody></table></div>`;
}

HOOKS.busman = el => { curEvent().consegne.bussola[+el.dataset.i].manual = true; };

/* ---------------------------------------------------------------- posti, tipo tavolo, assegnazione dall'elenco invitati */
ACTIONS['t-seats'] = el => {
  const E = curEvent(), t = E.tables.find(x => x.id === el.dataset.t), d = +el.dataset.d;
  if (d > 0) { if (!canGrow(t)) { toast(`Massimo ${MAX_SEATS(t)} posti per un tavolo ${t.forma === 'tondo' ? 'tondo' : 'rettangolare'}`); return; } t.seats.push(null); }
  else {
    if (t.seats.length <= 1) return;
    const last = t.seats[t.seats.length - 1];
    if (last) { const g = E.guests.find(x => x.id === last); if (!confirm(`Il posto ${t.seats.length} è occupato da ${g ? fullName(g) : 'un invitato'}: tornerà «da assegnare». Procedere?`)) return; }
    t.seats.pop();
  }
  t.posti = t.seats.length; save(); rr();
};
const MAX_SEATS = t => (t.forma === 'tondo' ? 11 : 24);
const canGrow = t => t.seats.length < MAX_SEATS(t);
/* primo posto libero; se il tavolo è pieno ma sotto il massimo aggiunge un posto */
function freeSeat(t) { let i = t.seats.indexOf(null); if (i < 0 && canGrow(t)) { t.seats.push(null); t.posti = t.seats.length; i = t.seats.length - 1; } return i; }
const unseat = (E, gid) => { const p = seatOf(E, gid); if (p) p.t.seats[p.i] = null; };
ACTIONS['auto-seat'] = () => {
  const E = curEvent(), free = E.guests.filter(g => g.fascia !== 'Neonato' && !seatOf(E, g.id));
  if (!free.length) { toast('Nessun invitato da assegnare'); return; }
  let n = 0;
  E.tables.slice().sort((a, b) => a.num - b.num).forEach(t => { let i; while (free.length && (i = freeSeat(t)) >= 0) { t.seats[i] = free.shift().id; n++; } });
  save(); rr(); toast(n + ' invitati assegnati' + (free.length ? ` · ${free.length} senza posto: tutti i tavoli sono al massimo, aggiungi un tavolo` : ''));
};
/* menu a tendina «Tavolo» / «Posto» nell'elenco invitati e nella scheda invitato */
function seatSelects(E, g, compact) {
  const cur = seatOf(E, g.id), tb = cur && cur.t;
  const tOpts = E.tables.slice().sort((a, b) => a.num - b.num).map(t => { const occ = t.seats.filter(Boolean).length, isCur = tb && tb.id === t.id, noFree = occ >= t.seats.length, full = noFree && !canGrow(t) && !isCur; return `<option value="${t.id}" ${isCur ? 'selected' : ''} ${full ? 'disabled' : ''}>${esc(t.nome || 'Tavolo ' + t.num)} (${occ}/${t.seats.length})${full ? ` · completo (max ${MAX_SEATS(t)})` : noFree && !isCur ? ' · +1 posto' : ''}</option>`; }).join('');
  const sOpts = tb ? tb.seats.map((id, i) => (!id || id === g.id) ? `<option value="${i}" ${id === g.id ? 'selected' : ''}>Posto ${i + 1}</option>` : '').join('') : '';
  return `<select class="${compact ? 'asg' : ''}" data-asg-table="${g.id}" title="Assegna a un tavolo"><option value="">— da assegnare —</option>${tOpts}</select>${tb ? ` <select class="${compact ? 'asg' : ''}" data-asg-seat="${g.id}" title="Scegli il posto">${sOpts}</select>` : ''}`;
}
document.addEventListener('change', e => {
  const t = e.target, E = curEvent(); if (!E) return;
  if (t.dataset && t.dataset.asgTable !== undefined) {
    const gid = t.dataset.asgTable;
    if (!t.value) unseat(E, gid);
    else { const tb = E.tables.find(x => x.id === t.value), cur = seatOf(E, gid); if (cur && cur.t.id === tb.id) return; const i = freeSeat(tb); if (i < 0) { toast(`Tavolo completo: massimo ${MAX_SEATS(tb)} posti`); rr(); return; } placeGuest(E, gid, tb.id, i); }
    save(); rr();
  } else if (t.dataset && t.dataset.asgSeat !== undefined) {
    const gid = t.dataset.asgSeat, cur = seatOf(E, gid); if (cur) { placeGuest(E, gid, cur.t.id, +t.value); save(); rr(); }
  }
});
