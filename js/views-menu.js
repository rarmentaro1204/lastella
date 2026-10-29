/* =====================================================================
   Sezione 02 · MENÙ   03 · ALLESTIMENTO   04 · ADD-ON
   Tutto il catalogo (isole, piatti, bevande, allestimenti) arriva dal catalogo dell'anno dell'evento
   ===================================================================== */
let C;   // catalogo dell'evento corrente, impostato all'ingresso di ogni vista
VIEWS.menu = E => { C = catalogFor(E); return ({ aperitivo: viewAperitivo, tavola: viewTavola, dolci: viewDolci, custom: viewCustom, prova: viewProva, speciali: viewSpeciali }[ROUTE.sub] || viewAperitivo)(E); };

const tagHtml = r => (r.tags || []).filter(t => t !== 'vegetariano' || !(r.tags || []).includes('vegano')).map(t => `<span class="tag">${esc(t)}</span>`).join('');
const OPT = (on, attr, title, desc, o = {}) => `<div class="opt ${on ? 'on' : ''} ${o.sq ? 'sq' : ''}" ${attr}><span class="mk"></span><div style="min-width:0"><div class="t">${esc(title)}${o.tags || ''}</div>${desc ? `<div class="d">${esc(desc)}</div>` : ''}</div>${o.price ? `<span class="pr">${o.price}</span>` : ''}</div>`;
const counter = (n, lim) => `<span class="counter ${n > lim ? 'over' : n === lim ? 'full' : ''}">${n}<small>/${lim}</small></span>`;

/* ---- avvisi di customizzazione e richieste speciali dentro ogni tab del menù ---- */
function tabAlerts(E, ...secs) {
  const list = customizations(E).filter(c => secs.some(s => c.sec.startsWith(s)));
  return list.length ? `<div class="alert" style="margin-bottom:16px"><b>⚠ Customizzazioni in questa sezione</b> <span class="muted small">(fuori dalla proposta standard: possono far variare il preventivo)</span><ul style="margin:6px 0 0 18px;padding:0">${list.map(c => `<li class="small">${esc(c.text)}</li>`).join('')}</ul></div>` : '';
}
function specialInline(E, sez) {
  const mine = E.special.map((s, i) => [s, i]).filter(([s]) => s.sezione === sez);
  return `<div class="card" style="margin-top:16px"><div class="chead"><h3>Richiesta speciale · ${esc(sez)}</h3><span class="pill warn">customizzazione</span></div>
    <p class="hint">Un piatto o un'isola fuori catalogo, una variante, un'esigenza particolare: descrivila qui. Finisce nel preventivo da quotare e nel ricettario.</p>
    ${mine.map(([s, i]) => `<div class="alert" style="margin-bottom:8px"><div class="row"><b>${esc(s.titolo || '(senza titolo)')}</b><span class="pill ${s.stato === 'Approvato' ? 'ok' : s.stato === 'Rifiutato' ? 'bad' : 'warn'}">${s.stato}</span><button class="btn ghost sm right" data-act="sp-del" data-i="${i}">Elimina</button></div>${s.descr ? `<div class="small" style="margin-top:4px;white-space:pre-wrap">${esc(s.descr)}</div>` : ''}<div class="hint" style="margin-top:4px">Dettagli, prezzo e stato nella scheda «Richieste speciali».</div></div>`).join('')}
    <div class="fields" style="margin-top:8px"><div class="field"><label>Cosa vuole il cliente</label><input type="text" id="spq-t-${esc(sez)}" placeholder="es. Isola live pasta"></div><div class="field w2"><label>Descrizione</label><input type="text" id="spq-d-${esc(sez)}" placeholder="ingredienti, allergie, riferimenti…"></div>
    <div class="field"><label>Tipo</label><select id="spq-k-${esc(sez)}">${SP_KINDS.map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></div><div class="field" style="justify-content:flex-end"><button class="btn sm" data-act="sp-quick" data-sez="${esc(sez)}">＋ Aggiungi richiesta</button></div></div></div>`;
}
ACTIONS['sp-quick'] = el => {
  const E = curEvent(), sez = el.dataset.sez, t = $(`[id="spq-t-${sez}"]`).value.trim(), d = $(`[id="spq-d-${sez}"]`).value.trim(), k = $(`[id="spq-k-${sez}"]`).value;
  if (!t) { toast('Scrivi cosa chiede il cliente'); return; }
  E.special.push({ id: uid(), kind: k, tipo: SP_KINDS.find(x => x[0] === k)[1], titolo: t, descr: d, porzioni: +E.q.adulti || '', prezzoUnit: '', forfait: '', stato: 'Da valutare', sezione: sez });
  save(); rr(); toast('Richiesta aggiunta: da quotare');
};

/* esigenze degli invitati → promemoria per chi compone il menù */
function needsPanel(E) {
  if (!E.guests.length) return `<div class="alert info small">Carica l'elenco invitati per vedere qui allergie e diete da tenere presenti nella scelta del menù.</div><div class="sp"></div>`;
  const c = guestCounts(E);
  const pills = [...Object.entries(c.byAll).map(([k, n]) => `<span class="pill">${aIc(k).icon} ${esc(aIc(k).label)} <b>×${n}</b></span>`), ...Object.entries(c.byInt).map(([k, n]) => `<span class="pill">${iIc(k).icon} ${esc(iIc(k).label)} <b>×${n}</b></span>`), ...Object.entries(c.diete).map(([k, n]) => `<span class="pill">${dIc(k).icon} ${esc(k)} <b>×${n}</b></span>`)];
  if (!pills.length) return '';
  const IDX = recipeIndexOf(C), m = E.menu, veg = (c.diete.Vegano || 0) + (c.diete.Vegetariano || 0), vegan = c.diete.Vegano || 0;
  const hasVeganMain = m.secondi.some(id => ((IDX[id] || {}).tags || []).includes('vegano'));
  return `<div class="card" style="margin-bottom:16px"><div class="chead"><h4>Esigenze degli invitati</h4><span class="muted small">la cucina propone un'alternativa alla sola portata non consumabile, senza cambiare le ricette scelte (FAQ 2027); aperitivo e buffet restano invariati</span></div><div class="needs" style="margin-top:8px">${pills.join('')}</div>
    ${vegan && !hasVeganMain ? `<div class="alert small" style="margin-top:10px">Ci sono ${vegan} ospiti vegani: nessun secondo piatto vegano selezionato.</div>` : ''}${veg && vegan === 0 ? `<div class="small muted" style="margin-top:8px">Servono ${veg} porzioni vegetariane: concordare le alternative con lo chef.</div>` : ''}</div>`;
}

/* ---------------------------------------------------------------- APERITIVO */
function islandCard(E, is, path) {
  const on = pget(E, path).includes(is.id);
  return `<div class="island ${on ? 'on' : ''}"><div class="ih" data-tog="${path}" data-v="${is.id}"><span class="mk" style="width:20px;height:20px;border:1.5px solid ${on ? '#fff' : 'var(--sand)'};border-radius:50%;display:grid;place-items:center;color:${on ? '#fff' : 'transparent'};font-size:12px">✓</span>
    <div style="flex:1"><h4>${esc(is.nome)}</h4><div class="sub">${esc(is.sub)}</div></div><span class="pill">${is.items.length} ricette</span></div>
    <div class="ib"><ul>${is.items.map(r => `<li><b>${esc(r.name)}</b>${tagHtml(r)}${r.desc ? `<i>${esc(r.desc)}</i>` : ''}</li>`).join('')}</ul></div></div>`;
}
function viewAperitivo(E) {
  const m = E.menu, reg = CAT.aperitivoRegole, B = C.buvette;
  const sel = id => C.isole.find(i => i.id === id);
  const ric = [...m.show, ...m.passaggio].reduce((a, id) => a + (sel(id) ? sel(id).items.length : 0), 0);
  const pass = C.isole.filter(i => i.tipo === 'passaggio').flatMap(i => i.items.map(r => [i, r]));
  return `<div class="secthead"><div><h2>L'aperitivo</h2><p>Durata ${reg.durataOre} ore · fino a ${reg.maxRicette} ricette · ${reg.show} isole in show-cooking + ${reg.passaggio} a servizio a passaggio + 1 isola buvette. ${esc(reg.nota)} Catalogo ${catalogYear(E)}.</p></div></div>
  ${tabAlerts(E, 'Menù · Aperitivo')}${needsPanel(E)}
  <div class="tiles"><div class="tile"><span>Show-cooking</span><div>${counter(m.show.length, reg.show)}</div></div><div class="tile"><span>A passaggio</span><div>${counter(m.passaggio.length, reg.passaggio)}</div></div><div class="tile"><span>Ricette in aperitivo</span><div>${counter(ric, reg.maxRicette)}</div></div></div>
  <div class="secbar"><h3>Isole in show-cooking</h3><span class="muted small">a scelta tra le proposte a menù</span></div>
  <div class="grid auto">${C.isole.filter(i => i.tipo === 'show').map(i => islandCard(E, i, 'menu.show')).join('') || '<div class="empty">Nessuna isola nel catalogo: creale in Catalogo menù.</div>'}</div>
  <div class="secbar"><h3>Isole a servizio a passaggio</h3></div>
  <div class="grid auto">${C.isole.filter(i => i.tipo === 'passaggio').map(i => islandCard(E, i, 'menu.passaggio')).join('')}</div>
  <div class="secbar"><h3>La buvette</h3><span class="muted small">consumo illimitato · personalizzazioni a quotazione separata</span></div>
  <div class="grid g2"><div class="card"><h4 style="margin-bottom:10px">Inclusa</h4>
    <div class="fixed">Bollicina · ${esc(B.bollicina)}</div>${(B.fissi || []).map(f => `<div class="fixed">${esc(f)}</div>`).join('')}
    <div class="sp"></div><div class="lbl2">Succo di frutta a scelta</div><div class="chips" style="margin-top:6px">${B.succhi.map(s => `<button class="chip ${m.succo === s ? 'on' : ''}" data-pick="menu.succo" data-v="${esc(s)}">${esc(s)}</button>`).join('')}</div></div>
    <div class="card"><h4 style="margin-bottom:10px">Cocktail d'aperitivo · uno a scelta, preparato al momento</h4><div class="pick">${B.cocktail.map(c => OPT(m.cocktail === c, `data-pick="menu.cocktail" data-v="${esc(c)}"`, c)).join('')}</div></div></div>
  <div class="card"><h4 style="margin-bottom:6px">Personalizzazioni della buvette <span class="pill warn">quotazione separata</span></h4><p class="hint">L'aggiunta o la sostituzione di uno dei prodotti è soggetta a quotazione separata.</p>
    <div class="grid g4">${Object.entries(B.extra).map(([g, arr]) => `<div><div class="lbl2" style="margin-bottom:6px">${esc(g)}</div><div class="pick">${arr.map(x => OPT(m.extraBuvette.includes(x), `data-tog="menu.extraBuvette" data-v="${esc(x)}"`, x, '', { sq: 1 })).join('')}</div></div>`).join('')}</div></div>
  <div class="card"><h4 style="margin-bottom:6px">«Mi sono innamorato di…» · l'aggiunta che non può mancare <span class="pill warn">quotazione separata</span></h4><p class="hint">${esc(C.esclusivaNota || '')}</p>
    <select data-b="menu.esclusiva" data-r style="max-width:560px"><option value="">— nessuna —</option>${pass.map(([i, r]) => `<option value="${r.id}" ${m.esclusiva === r.id ? 'selected' : ''}>${esc(r.name)} (${esc(i.nome)})</option>`).join('')}</select></div>
  ${specialInline(E, 'Aperitivo')}
  <div class="card"><div class="field"><label>Note sull'aperitivo</label><textarea data-b="menu.noteAperitivo">${esc(m.noteAperitivo)}</textarea></div></div>`;
}

/* ---------------------------------------------------------------- A TAVOLA */
HOOKS.formula = () => { const E = curEvent(), m = E.menu, f = CAT.formule.find(x => x.id === m.formula); m.pre = m.pre.slice(0, f.pre); m.entree = m.entree.slice(0, f.entree); m.primi = m.primi.slice(0, f.primi); m.secondi = m.secondi.slice(0, f.secondi); rr(); };
function courseBlock(E, title, arr, path, lim, groups) {
  const sel = pget(E, path);
  const disabled = lim === 0;
  const opt = r => OPT(sel.includes(r.id), disabled ? '' : `data-tog="${path}" data-v="${r.id}" data-lim="${lim}" data-rep`, r.name, r.desc, { tags: tagHtml(r), sq: lim > 1 });
  return `<div class="card" ${disabled ? 'style="opacity:.55"' : ''}><div class="chead"><h3>${title}</h3><span class="right">${disabled ? '<span class="muted small">non previsto in questa formula</span>' : counter(sel.length, lim)}</span></div>
    <div class="pick">${groups ? groups.map(g => `<div class="lbl2" style="margin-top:8px">${esc(g.gruppo)}</div>` + g.items.map(opt).join('')).join('') : (arr || []).map(opt).join('')}</div></div>`;
}
function viewTavola(E) {
  const m = E.menu, f = CAT.formule.find(x => x.id === m.formula) || CAT.formule[0];
  return `<div class="secthead"><div><h2>La parte a tavola</h2><p>Permanenza a tavola breve (1h30–2h) e ricette semplici da gradire: il consiglio è 3 ricette (entrée, primo, secondo) oppure 4 con la pre-entrée. Catalogo ${catalogYear(E)}.</p></div></div>
  ${tabAlerts(E, 'Menù · A tavola')}${needsPanel(E)}
  <div class="card"><div class="row"><div class="field" style="min-width:320px"><label>Formula delle portate</label><select data-b="menu.formula" data-hook="formula">${CAT.formule.map(x => `<option value="${x.id}" ${m.formula === x.id ? 'selected' : ''}>${x.nome}</option>`).join('')}</select></div>
    <div><div class="lbl2" style="margin-bottom:6px">Menù consigliati</div><div class="chips">${(C.menuConsigliati || []).map(p => `<button class="chip" data-act="menu-preset" data-id="${p.id}">${esc(p.nome)}</button>`).join('') || '<span class="muted small">nessuno nel catalogo</span>'}</div></div></div></div>
  <div class="sp"></div>
  ${courseBlock(E, 'Pre-entrée', C.preEntree, 'menu.pre', f.pre)}<div class="sp"></div>
  ${courseBlock(E, 'Entrée', C.entree, 'menu.entree', f.entree)}<div class="sp"></div>
  ${courseBlock(E, 'Primo piatto', null, 'menu.primi', f.primi, C.primi)}<div class="sp"></div>
  ${courseBlock(E, 'Secondo piatto', C.secondi, 'menu.secondi', f.secondi)}<div class="sp"></div>
  ${C.formaggi && C.formaggi[0] ? `<div class="card"><div class="chead"><h3>Degustazione di formaggi</h3><span class="pill warn">opzionale · verificare quotazione</span></div><div class="pick">${OPT(m.formaggi, 'data-pick-bool="menu.formaggi"', C.formaggi[0].name, C.formaggi[0].desc, { sq: 1 })}</div></div>` : ''}
  ${(+E.q.bambini || 0) > 0 ? `<div class="card" style="margin-top:16px"><div class="chead"><h3>Menù bambini</h3><span class="pill ok">incluso · ${E.q.bambini} bambini</span></div><p class="hint">${esc(C.menuBimbi.nota)}</p><div class="grid g3">${C.menuBimbi.items.map(r => `<div class="fixed"><b>${esc(r.name)}</b><div class="hint">${esc(r.desc)}</div></div>`).join('')}</div></div>` : ''}
  <div class="secbar"><h3>Bevande a tavola</h3><span class="muted small">consumo illimitato · etichette incluse nella proposta Diamante</span></div>
  <div class="grid g2"><div class="card"><h4 style="margin-bottom:10px">Un vino bianco a scelta</h4><div class="pick">${C.vini.bianchi.map(v => OPT(m.bianco === v, `data-pick="menu.bianco" data-v="${esc(v)}"`, v)).join('')}</div></div>
    <div class="card"><h4 style="margin-bottom:10px">Un vino rosso a scelta</h4><div class="pick">${C.vini.rossi.map(v => OPT(m.rosso === v, `data-pick="menu.rosso" data-v="${esc(v)}"`, v)).join('')}</div></div></div>
  <div class="fixed" style="margin:12px 0">Acqua naturale e frizzante</div>
  <div class="card"><h4 style="margin-bottom:6px">Personalizzazioni vini <span class="pill warn">quotazione separata</span></h4><div class="grid g4">${Object.entries(C.vini.extra).map(([g, arr]) => `<div><div class="lbl2" style="margin-bottom:6px">${esc(g)}</div><div class="pick">${arr.map(x => OPT(m.extraVini.includes(x), `data-tog="menu.extraVini" data-v="${esc(x)}"`, x, '', { sq: 1 })).join('')}</div></div>`).join('')}</div></div>
  ${specialInline(E, 'A tavola')}
  <div class="sp"></div><div class="card"><div class="field"><label>Note sul menù</label><textarea data-b="menu.noteMenu">${esc(m.noteMenu)}</textarea></div></div>`;
}
ACTIONS['menu-preset'] = el => { const E = curEvent(), p = (catalogFor(E).menuConsigliati || []).find(x => x.id === el.dataset.id); Object.assign(E.menu, { formula: '3a', pre: [], entree: [p.entree], primi: [p.primo], secondi: [p.secondo] }); save(); rr(); toast(`Menù «${p.nome}» applicato`); };
document.addEventListener('click', e => { const el = e.target.closest('[data-pick-bool]'); if (!el) return; const E = curEvent(); pset(E, el.dataset.pickBool, !pget(E, el.dataset.pickBool)); save(); rr(); });

/* ---------------------------------------------------------------- DOLCI & LOUNGE */
function viewDolci(E) {
  const m = E.menu, L = C.lounge;
  return `<div class="secthead"><div><h2>Dessert nuziale e lounge bar</h2><p>Pasticceria artigianale La Stella · dolci e piccola pasticceria preparati in show-cooking dai nostri chef.</p></div></div>
  ${tabAlerts(E, 'Menù · Dolci')}
  <div class="card"><div class="chead"><h3>Dessert nuziale</h3><span class="muted small">a scelta tra ${C.dessert.length} tipologie · servizio in monoporzioni con torta da taglio dedicata</span></div>
    <div class="grid g2"><div class="pick">${C.dessert.map(r => OPT(m.dessert === r.id, `data-pick="menu.dessert" data-v="${r.id}"`, r.name, r.desc, { tags: tagHtml(r) })).join('')}</div>
    <div><div class="fixed">Torta da taglio ad un piano, su alzata</div><div class="fixed">Servizio di porzionamento: piatti, posateria, tavolo d'appoggio, personale dedicato</div><div class="fixed">Brindisi al taglio: ${esc(C.brindisi || '')}</div></div></div></div>
  <div class="sp"></div>
  <div class="card"><div class="chead"><h3>Lounge bar · dolci e piccola pasticceria</h3><button class="btn sm alt right" data-act="lounge-all">Seleziona tutti</button></div><p class="hint">Preparati in show-cooking dai nostri chef.</p>
    <div class="grid g2">${L.dolci.map(r => OPT(m.lounge.includes(r.id), `data-tog="menu.lounge" data-v="${r.id}"`, r.name, r.desc, { sq: 1, tags: tagHtml(r) })).join('')}</div></div>
  <div class="sp"></div>
  <div class="grid g3"><div class="card"><h4 style="margin-bottom:8px">Specialty coffee</h4><div class="fixed">${esc((L.caffe || [])[0] || '')}</div><div class="sp"></div><div class="lbl2">Alternativa disponibile</div><div class="chips" style="margin-top:6px">${['Orzo', 'Dec', 'Ginseng'].map(a => `<button class="chip ${m.caffeAlt === a ? 'on' : ''}" data-pick="menu.caffeAlt" data-v="${a}">${a}</button>`).join('')}</div></div>
    <div class="card"><h4 style="margin-bottom:8px">Amari</h4><div class="fixed">${esc(L.amari || '')}</div></div><div class="card"><h4 style="margin-bottom:8px">Vermouth corner</h4><div class="fixed">${esc(L.vermouth || '')}</div></div></div>
  ${specialInline(E, 'Dolci')}`;
}
ACTIONS['lounge-all'] = () => { const E = curEvent(); E.menu.lounge = catalogFor(E).lounge.dolci.map(r => r.id); save(); rr(); };

/* ---------------------------------------------------------------- RICHIESTE SPECIALI */
const SP_KINDS = [['piatto', 'Piatto personalizzato'], ['isola', 'Isola personalizzata'], ['dieta', 'Variante dietetica / allergeni'], ['altro', 'Altro']];
const SP_IDEAS = [['isola', 'Isola personalizzata (es. live pasta)'], ['piatto', 'Piatto personalizzato'], ['dieta', 'Menù per celiaci'], ['dieta', 'Menù bambini'], ['piatto', 'Torta nuziale personalizzata'], ['isola', 'Angolo regionale della famiglia']];
HOOKS.spkind = el => { const s = curEvent().special[+el.dataset.i]; s.tipo = SP_KINDS.find(k => k[0] === s.kind)[1]; };
function viewSpeciali(E) {
  return `<div class="secthead"><div><h2>Richieste speciali</h2><p>Se i clienti vogliono creare un piatto o un'isola personalizzata, o servono varianti per allergie ed esigenze: annota qui, quota e approva. Le richieste approvate finiscono nel preventivo e nel ricettario, e compaiono come customizzazioni.</p></div><button class="btn right" data-act="sp-add" data-k="piatto">＋ Nuova richiesta</button></div>
  <div class="chips" style="margin-bottom:16px"><span class="muted small" style="align-self:center">Idee rapide:</span>${SP_IDEAS.map(([k, t]) => `<button class="chip" data-act="sp-add" data-k="${k}" data-t="${esc(t)}">${esc(t)}</button>`).join('')}</div>
  ${E.special.length ? E.special.map((s, i) => `<div class="card"><div class="chead"><h4>Richiesta ${i + 1}</h4><span class="pill ${s.stato === 'Approvato' ? 'ok' : s.stato === 'Rifiutato' ? 'bad' : 'warn'}">${s.stato}</span><span class="pill warn">⚠ customizzazione</span><button class="btn ghost sm right" data-act="sp-del" data-i="${i}">Elimina</button></div>
    <div class="fields"><div class="field"><label>Tipo</label><select data-b="special.${i}.kind" data-hook="spkind" data-i="${i}">${SP_KINDS.map(([k, l]) => `<option value="${k}" ${s.kind === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <div class="field"><label>Sezione del menù</label><select data-b="special.${i}.sezione">${['', 'Aperitivo', 'A tavola', 'Dolci', 'Allestimento', 'Altro'].map(x => `<option value="${x}" ${(s.sezione || '') === x ? 'selected' : ''}>${x || '—'}</option>`).join('')}</select></div>
      <div class="field w2"><label>Titolo</label><input type="text" data-b="special.${i}.titolo" value="${esc(s.titolo)}"></div>
      <div class="field wide"><label>Descrizione / dettagli (ingredienti, allergie, riferimenti dei clienti)</label><textarea data-b="special.${i}.descr">${esc(s.descr)}</textarea></div>
      <div class="field"><label>Porzioni</label><input type="number" data-b="special.${i}.porzioni" data-r value="${s.porzioni}"></div>
      <div class="field"><label>€ a porzione</label><input type="number" step="0.5" data-b="special.${i}.prezzoUnit" data-r value="${s.prezzoUnit}"></div>
      <div class="field"><label>€ forfait</label><input type="number" data-b="special.${i}.forfait" data-r value="${s.forfait}"></div>
      <div class="field"><label>Stato</label><select data-b="special.${i}.stato" data-r>${['Da valutare', 'Quotato', 'Approvato', 'Rifiutato'].map(x => `<option ${s.stato === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div></div></div>`).join('')
    : '<div class="empty"><h3>Nessuna richiesta speciale</h3><p>Usa le idee rapide qui sopra, la sezione «Richiesta speciale» di ogni tab del menù, oppure crea una nuova richiesta.</p></div>'}`;
}
ACTIONS['sp-add'] = el => {
  const E = curEvent(), k = el.dataset.k || 'piatto';
  E.special.push({ id: uid(), kind: k, tipo: SP_KINDS.find(x => x[0] === k)[1], titolo: el.dataset.t || '', descr: '', porzioni: +E.q.adulti || '', prezzoUnit: '', forfait: '', stato: 'Da valutare', sezione: '' });
  save(); go(evUrl('menu', 'speciali')); rr();
};
ACTIONS['sp-del'] = el => { if (!confirm('Eliminare la richiesta?')) return; const E = curEvent(); const s = E.special.splice(+el.dataset.i, 1)[0]; delete E.recipes['sp-' + s.id]; save(); rr(); };

/* ---------------------------------------------------------------- ALLESTIMENTO */
function allestStats(E) {
  const voci = catalogFor(E).allestimenti.flatMap(g => g.voci).filter(v => v.opts);
  const chosen = voci.filter(v => (E.allest[v.id] || {}).opt).length, ok = voci.filter(v => (E.allest[v.id] || {}).ok).length;
  return { tot: voci.length, chosen, ok };
}
VIEWS.allestimento = E => {
  C = catalogFor(E);
  const st = allestStats(E), dl = E.q.scadenzaAllest ? Math.ceil((new Date(E.q.scadenzaAllest + 'T12:00:00') - new Date()) / 864e5) : null;
  return `<div class="secthead"><div><h2>Allestimento</h2><p>Le scelte che può fare chi commissiona. L'operatore spunta, per ogni voce, l'opzione scelta e conferma quando il cliente ha deciso. Le voci con supplemento sono evidenziate in giallo. Catalogo ${catalogYear(E)}.</p></div></div>
  ${tabAlerts(E, 'Allestimento')}
  <div class="card"><div class="row"><div class="grow"><div class="lbl2">Scelte effettuate</div><div class="row" style="margin-top:4px"><span class="counter">${st.chosen}<small>/${st.tot}</small></span><div class="progress grow"><i style="width:${st.tot ? st.chosen / st.tot * 100 : 0}%"></i></div></div></div>
    <div class="grow"><div class="lbl2">Confermate dal cliente</div><div class="row" style="margin-top:4px"><span class="counter ${st.ok === st.tot ? 'full' : ''}">${st.ok}<small>/${st.tot}</small></span><div class="progress grow"><i style="width:${st.tot ? st.ok / st.tot * 100 : 0}%"></i></div></div></div>
    <div><div class="lbl2">Scadenza scelte (automatica dalla data)</div><div style="margin-top:4px">${E.q.scadenzaAllest ? `<b>${new Date(E.q.scadenzaAllest + 'T12:00:00').toLocaleDateString('it-IT')}</b> ${dl !== null ? `<span class="pill ${dl < 0 ? 'bad' : dl < 30 ? 'warn' : ''}">${dl < 0 ? 'scaduta' : dl + ' giorni'}</span>` : ''}` : '<span class="muted">scegli prima la data dell\'evento</span>'}</div></div></div>
    <p class="hint" style="margin-top:8px">Dopo la scadenza la quotazione può variare e potrebbe non essere garantita la disponibilità di tutte le proposte.</p></div>
  ${C.allestimenti.map(gr => `<div class="secbar"><h3>${esc(gr.gruppo)}</h3></div><div class="grid auto" style="grid-template-columns:repeat(auto-fill,minmax(360px,1fr))">${gr.voci.map(v => allestCard(E, v)).join('')}</div>`).join('')}`;
};
function allestCard(E, v) {
  if (v.fisso) return `<div class="avoce"><div class="head"><h4>${esc(v.nome)}</h4><span class="pill ok">incluso</span></div><div class="fixed">${esc(v.info || '')}</div></div>`;
  const st = E.allest[v.id] || {}, sel = v.opts.find(o => o.id === st.opt), done = st.opt && st.ok;
  const sur = o => (+o.sur ? `<span class="sur">+€${o.sur}/pers</span>` : +o.fix ? `<span class="sur">€${o.fix}</span>` : o.quota ? '<span class="sur">quota</span>' : '');
  return `<div class="avoce ${done ? 'done' : ''}"><div class="head"><h4>${esc(v.nome)}</h4>${!st.opt ? '<span class="pill warn">da scegliere</span>' : st.ok ? '<span class="pill ok">✓ confermata</span>' : '<span class="pill">scelta</span>'}</div>
    <div class="opts">${v.opts.map(o => `<div class="o ${st.opt === o.id ? 'on' : ''}" data-pick="allest.${v.id}.opt" data-v="${o.id}" title="${esc(o.nota || '')}">${v.color ? `<span class="sw" style="background:${esc(o.hex || '#ccc')}"></span>` : ''}${esc(o.nome)} ${sur(o)}</div>`).join('')}</div>
    ${sel && sel.nota ? `<div class="hint" style="margin-top:8px">${esc(sel.nota)}</div>` : ''}
    ${sel && sel.testo ? `<div class="field" style="margin-top:8px"><label>Indicare il colore</label><input type="text" data-b="allest.${v.id}.testo" value="${esc(st.testo || '')}"></div>` : ''}
    ${v.info ? `<div class="hint" style="margin-top:8px">${esc(v.info)}</div>` : ''}
    <div class="row" style="margin-top:10px"><label class="row" style="gap:6px"><input type="checkbox" data-b="allest.${v.id}.ok" data-r ${st.ok ? 'checked' : ''} ${st.opt ? '' : 'disabled'}> Confermata dal cliente</label></div>
    <div class="field" style="margin-top:8px"><input type="text" data-b="allest.${v.id}.note" value="${esc(st.note || '')}" placeholder="Note"></div></div>`;
}

/* ---------------------------------------------------------------- ADD-ON */
HOOKS.addvar = el => { delete curEvent().recipes['ad-' + el.dataset.a]; rr(); };
VIEWS.addon = E => {
  C = catalogFor(E);
  const q = computeQuote(E), tot = q.lines.filter(l => l.sec === 'Servizi aggiuntivi').reduce((a, l) => a + l.tot, 0);
  return `<div class="secthead"><div><h2>Add-on</h2><p>Servizi aggiuntivi alla proposta Diamante. Seleziona quelli richiesti dal cliente: entrano nel preventivo. Prezzi in € a persona oltre IVA, calcolati sugli ospiti adulti (modificabili). L'elenco degli add-on si gestisce in Impostazioni.</p></div><div class="tile right"><b>${eur(tot)}</b><span>Totale add-on (iva escl.)</span></div></div>
  ${tabAlerts(E, 'Add-on')}
  <div class="grid auto" style="grid-template-columns:repeat(auto-fill,minmax(420px,1fr))">${S.settings.addons.map(a => addonCard(E, a)).join('') || '<div class="empty">Nessun add-on: aggiungili in Impostazioni.</div>'}</div>`;
};
function addonCard(E, a) {
  const st = E.addons[a.id] || {}, on = !!st.on;
  if (a.link) {
    const sel = (E.allest[a.link] || {}).opt, imp = ['imp_tov', 'imp_leg', 'mix'].includes(sel);
    return `<div class="card"><div class="chead"><h4>${esc(a.nome)}</h4><span class="pill ${imp ? 'ok' : ''} right">${imp ? 'attivo' : 'non selezionato'}</span></div><p class="muted small">${esc(a.desc)}</p><a class="btn sm alt" href="#/${evUrl('allestimento')}">Vai ad Allestimento → Tavoli</a></div>`;
  }
  const v = a.varianti ? (a.varianti.find(x => x.id === st.variante) || a.varianti[0]) : null;
  const defPrice = v ? v.prezzo : a.prezzo;
  const priceTag = a.quota ? '<span class="pill warn">su quotazione</span>' : a.varianti && a.varianti.length ? `<span class="pill warn">da ${eur(Math.min(...a.varianti.map(x => +x.prezzo)))} / ${a.perOra ? 'ora' : 'pers'}</span>` : `<span class="pill warn">${eur(a.prezzo)} / pers</span>`;
  return `<div class="card" style="${on ? 'border-color:var(--navy);box-shadow:0 0 0 1px var(--navy)' : ''}"><label class="chead" style="cursor:pointer"><input type="checkbox" data-b="addons.${a.id}.on" data-r ${on ? 'checked' : ''}><h4 style="flex:1">${esc(a.nome)}</h4>${priceTag}</label>
    <p class="muted small" style="margin:8px 0 0">${esc(a.desc || '')}</p>
    ${on ? `<div class="sp"></div>${v ? `<div class="pick">${a.varianti.map(x => `<label class="opt ${x.id === v.id ? 'on' : ''}"><input type="radio" hidden name="va-${a.id}" data-b="addons.${a.id}.variante" data-hook="addvar" data-a="${a.id}" value="${x.id}" ${x.id === v.id ? 'checked' : ''}><span class="mk"></span><div class="t" style="font-weight:600">${esc(x.nome)}${x.items ? `<div class="d" style="font-weight:400">${esc(x.items.join(' · '))}</div>` : ''}</div><span class="pr">${eur(x.prezzo)}${a.perOra ? '/h' : ''}</span></label>`).join('')}</div><div class="sp"></div>` : ''}
      <div class="fields" style="grid-template-columns:repeat(auto-fill,minmax(130px,1fr))">
        ${a.quota || (!a.prezzo && !v) ? `<div class="field"><label>Importo quotato (€ forfait)</label><input type="number" data-b="addons.${a.id}.prezzo" data-r value="${st.prezzo ?? ''}"></div>` : `<div class="field"><label>${a.perOra ? 'Ore' : a.minPers ? 'Persone (min ' + a.minPers + ')' : 'Persone'}</label><input type="number" data-b="addons.${a.id}.qty" data-r value="${st.qty ?? ''}" placeholder="${a.perOra ? 1 : a.minPers || E.q.adulti}"></div><div class="field"><label>${a.perOra ? '€ all\'ora' : '€ a persona'}</label><input type="number" step="0.5" data-b="addons.${a.id}.prezzo" data-r value="${st.prezzo ?? ''}" placeholder="${defPrice}"></div>`}
        <div class="field" style="grid-column:1/-1"><label>Note</label><input type="text" data-b="addons.${a.id}.note" value="${esc(st.note || '')}"></div></div>
      ${a.id === 'cocktail' ? `<div class="alert ok small" style="margin-top:10px">Con il cocktail bar: sconto di € ${listinoOf(E).scontoOltre} a persona dal ${listinoOf(E).minAdulti + 1}° ospite adulto.</div>` : ''}` : ''}</div>`;
}
