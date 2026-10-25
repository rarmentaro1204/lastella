/* =====================================================================
   Sezione 02 · MENÙ   03 · ALLESTIMENTO   04 · ADD-ON
   ===================================================================== */
VIEWS.menu = E => ({ aperitivo: viewAperitivo, tavola: viewTavola, dolci: viewDolci, speciali: viewSpeciali }[ROUTE.sub] || viewAperitivo)(E);

const tagHtml = r => (r.tags || []).filter(t => t !== 'vegetariano' || !(r.tags || []).includes('vegano')).map(t => `<span class="tag">${t}</span>`).join('');
const OPT = (on, attr, title, desc, o = {}) => `<div class="opt ${on ? 'on' : ''} ${o.sq ? 'sq' : ''}" ${attr}><span class="mk"></span><div style="min-width:0"><div class="t">${esc(title)}${o.tags || ''}</div>${desc ? `<div class="d">${esc(desc)}</div>` : ''}</div>${o.price ? `<span class="pr">${o.price}</span>` : ''}</div>`;
const counter = (n, lim) => `<span class="counter ${n > lim ? 'over' : n === lim ? 'full' : ''}">${n}<small>/${lim}</small></span>`;

/* esigenze degli invitati → promemoria per chi compone il menù */
function needsPanel(E) {
  if (!E.guests.length) return `<div class="alert info small">Carica l'elenco invitati per vedere qui allergie e diete da tenere presenti nella scelta del menù.</div><div class="sp"></div>`;
  const c = guestCounts(E);
  const pills = [...Object.entries(c.byAll).map(([k, n]) => `<span class="pill">${aIc(k).icon} ${esc(aIc(k).label)} <b>×${n}</b></span>`), ...Object.entries(c.byInt).map(([k, n]) => `<span class="pill">${iIc(k).icon} ${esc(iIc(k).label)} <b>×${n}</b></span>`), ...Object.entries(c.diete).map(([k, n]) => `<span class="pill">${dIc(k).icon} ${esc(k)} <b>×${n}</b></span>`)];
  if (!pills.length) return '';
  const veg = (c.diete.Vegano || 0) + (c.diete.Vegetariano || 0), vegan = c.diete.Vegano || 0, m = E.menu;
  const hasVeganMain = m.secondi.some(id => (RECIPE_INDEX[id].tags || []).includes('vegano'));
  return `<div class="card" style="margin-bottom:16px"><div class="chead"><h4>Esigenze degli invitati</h4><span class="muted small">la cucina propone un'alternativa alla sola portata non consumabile, senza cambiare le ricette scelte (FAQ 2027); aperitivo e buffet restano invariati</span></div><div class="needs" style="margin-top:8px">${pills.join('')}</div>
    ${vegan && !hasVeganMain ? `<div class="alert small" style="margin-top:10px">Ci sono ${vegan} ospiti vegani: nessun secondo piatto vegano selezionato (es. «Millefoglie vegetale»).</div>` : ''}${veg && vegan === 0 ? `<div class="small muted" style="margin-top:8px">Servono ${veg} porzioni vegetariane: concordare le alternative con lo chef.</div>` : ''}</div>`;
}

/* ---------------------------------------------------------------- APERITIVO */
function islandCard(E, is, path) {
  const on = pget(E, path).includes(is.id);
  return `<div class="island ${on ? 'on' : ''}"><div class="ih" data-tog="${path}" data-v="${is.id}"><span class="mk" style="width:20px;height:20px;border:1.5px solid ${on ? '#fff' : 'var(--sand)'};border-radius:50%;display:grid;place-items:center;color:${on ? '#fff' : 'transparent'};font-size:12px">✓</span>
    <div style="flex:1"><h4>${esc(is.nome)}</h4><div class="sub">${esc(is.sub)}</div></div><span class="pill">${is.items.length} ricette</span></div>
    <div class="ib"><ul>${is.items.map(r => `<li><b>${esc(r.name)}</b>${tagHtml(r)}${r.desc ? `<i>${esc(r.desc)}</i>` : ''}</li>`).join('')}</ul></div></div>`;
}
function viewAperitivo(E) {
  const m = E.menu, reg = CAT.aperitivoRegole, B = CAT.buvette;
  const ric = [...m.show, ...m.passaggio].reduce((a, id) => a + CAT.isole.find(i => i.id === id).items.length, 0);
  const pass = CAT.isole.filter(i => i.tipo === 'passaggio').flatMap(i => i.items.map(r => [i, r]));
  return `<div class="secthead"><div><h2>L'aperitivo</h2><p>Durata ${reg.durataOre} ore · fino a ${reg.maxRicette} ricette · ${reg.show} isole in show-cooking + ${reg.passaggio} a servizio a passaggio + 1 isola buvette. ${esc(reg.nota)}</p></div></div>
  ${needsPanel(E)}
  <div class="tiles"><div class="tile"><span>Show-cooking</span><div>${counter(m.show.length, reg.show)}</div></div><div class="tile"><span>A passaggio</span><div>${counter(m.passaggio.length, reg.passaggio)}</div></div><div class="tile"><span>Ricette in aperitivo</span><div>${counter(ric, reg.maxRicette)}</div></div></div>
  ${(m.show.length > reg.show || m.passaggio.length > reg.passaggio) ? '<div class="alert">Isole oltre quelle previste dalla proposta: eventuale aggiunta soggetta a quotazione separata.</div><div class="sp"></div>' : ''}
  <div class="secbar"><h3>Isole in show-cooking</h3><span class="muted small">a scelta tra le proposte a menù</span></div>
  <div class="grid auto">${CAT.isole.filter(i => i.tipo === 'show').map(i => islandCard(E, i, 'menu.show')).join('')}</div>
  <div class="secbar"><h3>Isole a servizio a passaggio</h3></div>
  <div class="grid auto">${CAT.isole.filter(i => i.tipo === 'passaggio').map(i => islandCard(E, i, 'menu.passaggio')).join('')}</div>
  <div class="secbar"><h3>La buvette</h3><span class="muted small">consumo illimitato · personalizzazioni a quotazione separata</span></div>
  <div class="grid g2"><div class="card"><h4 style="margin-bottom:10px">Inclusa</h4>
    <div class="fixed">Bollicina · ${esc(B.bollicina)}</div><div class="fixed">Acqua naturale e frizzante «Sparea Splendida»</div><div class="fixed">Coca Cola in vetro</div>
    <div class="sp"></div><div class="lbl2">Succo di frutta a scelta</div><div class="chips" style="margin-top:6px">${B.succhi.map(s => `<button class="chip ${m.succo === s ? 'on' : ''}" data-pick="menu.succo" data-v="${s}">${s}</button>`).join('')}</div></div>
    <div class="card"><h4 style="margin-bottom:10px">Cocktail d'aperitivo · uno a scelta, preparato al momento</h4><div class="pick">${B.cocktail.map(c => OPT(m.cocktail === c, `data-pick="menu.cocktail" data-v="${esc(c)}"`, c)).join('')}</div></div></div>
  <div class="card"><h4 style="margin-bottom:6px">Personalizzazioni della buvette <span class="pill warn">quotazione separata</span></h4><p class="hint">L'aggiunta o la sostituzione di uno dei prodotti è soggetta a quotazione separata.</p>
    <div class="grid g4">${Object.entries(B.extra).map(([g, arr]) => `<div><div class="lbl2" style="margin-bottom:6px">${g}</div><div class="pick">${arr.map(x => OPT(m.extraBuvette.includes(x), `data-tog="menu.extraBuvette" data-v="${esc(x)}"`, x, '', { sq: 1 })).join('')}</div></div>`).join('')}</div></div>
  <div class="card"><h4 style="margin-bottom:6px">«Mi sono innamorato di…» · l'aggiunta che non può mancare <span class="pill warn">quotazione separata</span></h4><p class="hint">${esc(CAT.esclusivaNota)}</p>
    <select data-b="menu.esclusiva" data-r style="max-width:560px"><option value="">— nessuna —</option>${pass.map(([i, r]) => `<option value="${r.id}" ${m.esclusiva === r.id ? 'selected' : ''}>${esc(r.name)} (${esc(i.nome)})</option>`).join('')}</select></div>
  <div class="card"><div class="field"><label>Note sull'aperitivo</label><textarea data-b="menu.noteAperitivo">${esc(m.noteAperitivo)}</textarea></div></div>`;
}

/* ---------------------------------------------------------------- A TAVOLA */
HOOKS.formula = () => { const E = curEvent(), m = E.menu, f = CAT.formule.find(x => x.id === m.formula); m.pre = m.pre.slice(0, f.pre); m.entree = m.entree.slice(0, f.entree); m.primi = m.primi.slice(0, f.primi); m.secondi = m.secondi.slice(0, f.secondi); rr(); };
function courseBlock(E, title, arr, path, lim, groups) {
  const sel = pget(E, path);
  const disabled = lim === 0;
  const opt = r => OPT(sel.includes(r.id), disabled ? '' : `data-tog="${path}" data-v="${r.id}" data-lim="${lim}" data-rep`, r.name, '', { tags: tagHtml(r), sq: lim > 1 });
  return `<div class="card" ${disabled ? 'style="opacity:.55"' : ''}><div class="chead"><h3>${title}</h3><span class="right">${disabled ? '<span class="muted small">non previsto in questa formula</span>' : counter(sel.length, lim)}</span></div>
    <div class="pick">${groups ? groups.map(g => `<div class="lbl2" style="margin-top:8px">${g.gruppo}</div>` + g.items.map(opt).join('')).join('') : arr.map(opt).join('')}</div></div>`;
}
function viewTavola(E) {
  const m = E.menu, f = CAT.formule.find(x => x.id === m.formula) || CAT.formule[0];
  return `<div class="secthead"><div><h2>La parte a tavola</h2><p>Permanenza a tavola breve (1h30–2h) e ricette semplici da gradire: il consiglio è 3 ricette (entrée, primo, secondo) oppure 4 con la pre-entrée.</p></div></div>
  ${needsPanel(E)}
  <div class="card"><div class="row"><div class="field" style="min-width:320px"><label>Formula delle portate</label><select data-b="menu.formula" data-hook="formula">${CAT.formule.map(x => `<option value="${x.id}" ${m.formula === x.id ? 'selected' : ''}>${x.nome}</option>`).join('')}</select></div>
    <div><div class="lbl2" style="margin-bottom:6px">Menù consigliati 2026</div><div class="chips">${CAT.menuConsigliati.map(p => `<button class="chip" data-act="menu-preset" data-id="${p.id}">${esc(p.nome)}</button>`).join('')}</div></div></div></div>
  <div class="sp"></div>
  ${courseBlock(E, 'Pre-entrée', CAT.preEntree, 'menu.pre', f.pre)}<div class="sp"></div>
  ${courseBlock(E, 'Entrée', CAT.entree, 'menu.entree', f.entree)}<div class="sp"></div>
  ${courseBlock(E, 'Primo piatto', null, 'menu.primi', f.primi, CAT.primi)}<div class="sp"></div>
  ${courseBlock(E, 'Secondo piatto', CAT.secondi, 'menu.secondi', f.secondi)}<div class="sp"></div>
  <div class="card"><div class="chead"><h3>Degustazione di formaggi</h3><span class="pill warn">opzionale · verificare quotazione</span></div><div class="pick">${OPT(m.formaggi, 'data-b-toggle="1" data-pick-bool="menu.formaggi"', CAT.formaggi[0].name, CAT.formaggi[0].desc, { sq: 1 })}</div></div>
  ${(+E.q.bambini || 0) > 0 ? `<div class="card" style="margin-top:16px"><div class="chead"><h3>Menù bambini</h3><span class="pill ok">incluso · ${E.q.bambini} bambini</span></div><p class="hint">${esc(CAT.menuBimbi.nota)}</p><div class="grid g3">${CAT.menuBimbi.items.map(r => `<div class="fixed"><b>${esc(r.name)}</b><div class="hint">${esc(r.desc)}</div></div>`).join('')}</div></div>` : ''}
  <div class="secbar"><h3>Bevande a tavola</h3><span class="muted small">consumo illimitato · etichette incluse nella proposta Diamante</span></div>
  <div class="grid g2"><div class="card"><h4 style="margin-bottom:10px">Un vino bianco a scelta</h4><div class="pick">${CAT.vini.bianchi.map(v => OPT(m.bianco === v, `data-pick="menu.bianco" data-v="${esc(v)}"`, v)).join('')}</div></div>
    <div class="card"><h4 style="margin-bottom:10px">Un vino rosso a scelta</h4><div class="pick">${CAT.vini.rossi.map(v => OPT(m.rosso === v, `data-pick="menu.rosso" data-v="${esc(v)}"`, v)).join('')}</div></div></div>
  <div class="fixed" style="margin:12px 0">Acqua naturale e frizzante «Sparea Splendida»</div>
  <div class="card"><h4 style="margin-bottom:6px">Personalizzazioni vini <span class="pill warn">quotazione separata</span></h4><div class="grid g4">${Object.entries(CAT.vini.extra).map(([g, arr]) => `<div><div class="lbl2" style="margin-bottom:6px">${g}</div><div class="pick">${arr.map(x => OPT(m.extraVini.includes(x), `data-tog="menu.extraVini" data-v="${esc(x)}"`, x, '', { sq: 1 })).join('')}</div></div>`).join('')}</div></div>
  <div class="sp"></div><div class="card"><div class="field"><label>Note sul menù</label><textarea data-b="menu.noteMenu">${esc(m.noteMenu)}</textarea></div></div>`;
}
ACTIONS['menu-preset'] = el => { const E = curEvent(), p = CAT.menuConsigliati.find(x => x.id === el.dataset.id); Object.assign(E.menu, { formula: '3a', pre: [], entree: [p.entree], primi: [p.primo], secondi: [p.secondo] }); save(); rr(); toast(`Menù «${p.nome}» applicato`); };
// toggle booleano (degustazione formaggi)
document.addEventListener('click', e => { const el = e.target.closest('[data-pick-bool]'); if (!el) return; const E = curEvent(); pset(E, el.dataset.pickBool, !pget(E, el.dataset.pickBool)); save(); rr(); });

/* ---------------------------------------------------------------- DOLCI & LOUNGE */
function viewDolci(E) {
  const m = E.menu, L = CAT.lounge;
  return `<div class="secthead"><div><h2>Dessert nuziale e lounge bar</h2><p>Pasticceria artigianale La Stella · dolci e piccola pasticceria preparati in show-cooking dai nostri chef.</p></div></div>
  <div class="card"><div class="chead"><h3>Dessert nuziale</h3><span class="muted small">a scelta tra 4 tipologie · servizio in monoporzioni con torta da taglio dedicata</span></div>
    <div class="grid g2"><div class="pick">${CAT.dessert.slice(0, 4).map(r => OPT(m.dessert === r.id, `data-pick="menu.dessert" data-v="${r.id}"`, r.name, r.desc)).join('')}</div>
    <div><div class="fixed">Torta da taglio ad un piano, su alzata</div><div class="fixed">Servizio di porzionamento: piatti, posateria, tavolo d'appoggio, personale dedicato</div><div class="fixed">Brindisi al taglio: ${esc(CAT.brindisi)}</div></div></div></div>
  <div class="sp"></div>
  <div class="card"><div class="chead"><h3>Lounge bar · dolci e piccola pasticceria</h3><button class="btn sm alt right" data-act="lounge-all">Seleziona tutti</button></div><p class="hint">Preparati in show-cooking dai nostri chef.</p>
    <div class="grid g2">${L.dolci.map(r => OPT(m.lounge.includes(r.id), `data-tog="menu.lounge" data-v="${r.id}"`, r.name, r.desc, { sq: 1 })).join('')}</div></div>
  <div class="sp"></div>
  <div class="grid g3"><div class="card"><h4 style="margin-bottom:8px">Specialty coffee</h4><div class="fixed">${esc(L.caffe[0])}</div><div class="sp"></div><div class="lbl2">Alternativa disponibile</div><div class="chips" style="margin-top:6px">${['Orzo', 'Dec', 'Ginseng'].map(a => `<button class="chip ${m.caffeAlt === a ? 'on' : ''}" data-pick="menu.caffeAlt" data-v="${a}">${a}</button>`).join('')}</div></div>
    <div class="card"><h4 style="margin-bottom:8px">Amari</h4><div class="fixed">${esc(L.amari)}</div></div><div class="card"><h4 style="margin-bottom:8px">Vermouth corner</h4><div class="fixed">${esc(L.vermouth)}</div></div></div>`;
}
ACTIONS['lounge-all'] = () => { const E = curEvent(); E.menu.lounge = CAT.lounge.dolci.map(r => r.id); save(); rr(); };

/* ---------------------------------------------------------------- RICHIESTE SPECIALI */
const SP_KINDS = [['piatto', 'Piatto personalizzato'], ['isola', 'Isola personalizzata'], ['dieta', 'Variante dietetica / allergeni'], ['altro', 'Altro']];
const SP_IDEAS = [['isola', 'Isola personalizzata (es. live pasta)'], ['piatto', 'Piatto personalizzato'], ['dieta', 'Menù per celiaci'], ['dieta', 'Menù bambini'], ['piatto', 'Torta nuziale personalizzata'], ['isola', 'Angolo regionale della famiglia']];
HOOKS.spkind = el => { const s = curEvent().special[+el.dataset.i]; s.tipo = SP_KINDS.find(k => k[0] === s.kind)[1]; };
function viewSpeciali(E) {
  return `<div class="secthead"><div><h2>Richieste speciali</h2><p>Se i clienti vogliono creare un piatto o un'isola personalizzata, o servono varianti per allergie ed esigenze: annota qui, quota e approva. Le richieste approvate finiscono nel preventivo e nel ricettario.</p></div><button class="btn right" data-act="sp-add" data-k="piatto">＋ Nuova richiesta</button></div>
  <div class="chips" style="margin-bottom:16px"><span class="muted small" style="align-self:center">Idee rapide:</span>${SP_IDEAS.map(([k, t]) => `<button class="chip" data-act="sp-add" data-k="${k}" data-t="${esc(t)}">${esc(t)}</button>`).join('')}</div>
  ${E.special.length ? E.special.map((s, i) => `<div class="card"><div class="chead"><h4>Richiesta ${i + 1}</h4><span class="pill ${s.stato === 'Approvato' ? 'ok' : s.stato === 'Rifiutato' ? 'bad' : 'warn'}">${s.stato}</span><button class="btn ghost sm right" data-act="sp-del" data-i="${i}">Elimina</button></div>
    <div class="fields"><div class="field"><label>Tipo</label><select data-b="special.${i}.kind" data-hook="spkind" data-i="${i}">${SP_KINDS.map(([k, l]) => `<option value="${k}" ${s.kind === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <div class="field w2"><label>Titolo</label><input type="text" data-b="special.${i}.titolo" value="${esc(s.titolo)}"></div>
      <div class="field wide"><label>Descrizione / dettagli (ingredienti, allergie, riferimenti dei clienti)</label><textarea data-b="special.${i}.descr">${esc(s.descr)}</textarea></div>
      <div class="field"><label>Porzioni</label><input type="number" data-b="special.${i}.porzioni" data-r value="${s.porzioni}"></div>
      <div class="field"><label>€ a porzione</label><input type="number" step="0.5" data-b="special.${i}.prezzoUnit" data-r value="${s.prezzoUnit}"></div>
      <div class="field"><label>€ forfait</label><input type="number" data-b="special.${i}.forfait" data-r value="${s.forfait}"></div>
      <div class="field"><label>Stato</label><select data-b="special.${i}.stato" data-r>${['Da valutare', 'Quotato', 'Approvato', 'Rifiutato'].map(x => `<option ${s.stato === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div></div></div>`).join('')
    : '<div class="empty"><h3>Nessuna richiesta speciale</h3><p>Usa le idee rapide qui sopra o crea una nuova richiesta.</p></div>'}`;
}
ACTIONS['sp-add'] = el => {
  const E = curEvent(), k = el.dataset.k || 'piatto';
  E.special.push({ id: uid(), kind: k, tipo: SP_KINDS.find(x => x[0] === k)[1], titolo: el.dataset.t || '', descr: '', porzioni: +E.q.adulti || '', prezzoUnit: '', forfait: '', stato: 'Da valutare' });
  save(); go(evUrl('menu', 'speciali')); rr();
};
ACTIONS['sp-del'] = el => { if (!confirm('Eliminare la richiesta?')) return; const E = curEvent(); const s = E.special.splice(+el.dataset.i, 1)[0]; delete E.recipes['sp-' + s.id]; save(); rr(); };

/* ---------------------------------------------------------------- ALLESTIMENTO */
function allestStats(E) {
  const voci = CAT.allestimenti.flatMap(g => g.voci).filter(v => v.opts);
  const chosen = voci.filter(v => (E.allest[v.id] || {}).opt).length, ok = voci.filter(v => (E.allest[v.id] || {}).ok).length;
  return { tot: voci.length, chosen, ok };
}
VIEWS.allestimento = E => {
  const st = allestStats(E), dl = E.q.scadenzaAllest ? Math.ceil((new Date(E.q.scadenzaAllest + 'T12:00:00') - new Date()) / 864e5) : null;
  return `<div class="secthead"><div><h2>Allestimento</h2><p>Le scelte che può fare chi commissiona. L'operatore spunta, per ogni voce, l'opzione scelta e conferma quando il cliente ha deciso. Le voci con supplemento sono evidenziate in giallo.</p></div></div>
  <div class="card"><div class="row"><div class="grow"><div class="lbl2">Scelte effettuate</div><div class="row" style="margin-top:4px"><span class="counter">${st.chosen}<small>/${st.tot}</small></span><div class="progress grow"><i style="width:${st.chosen / st.tot * 100}%"></i></div></div></div>
    <div class="grow"><div class="lbl2">Confermate dal cliente</div><div class="row" style="margin-top:4px"><span class="counter ${st.ok === st.tot ? 'full' : ''}">${st.ok}<small>/${st.tot}</small></span><div class="progress grow"><i style="width:${st.ok / st.tot * 100}%"></i></div></div></div>
    <div><div class="lbl2">Scadenza scelte</div><div style="margin-top:4px">${E.q.scadenzaAllest ? `<b>${new Date(E.q.scadenzaAllest + 'T12:00:00').toLocaleDateString('it-IT')}</b> ${dl !== null ? `<span class="pill ${dl < 0 ? 'bad' : dl < 30 ? 'warn' : ''}">${dl < 0 ? 'scaduta' : dl + ' giorni'}</span>` : ''}` : '<span class="muted">non impostata (Questionario)</span>'}</div></div></div>
    <p class="hint" style="margin-top:8px">Dopo la scadenza la quotazione può variare e potrebbe non essere garantita la disponibilità di tutte le proposte.</p></div>
  ${CAT.allestimenti.map(gr => `<div class="secbar"><h3>${gr.gruppo}</h3></div><div class="grid auto" style="grid-template-columns:repeat(auto-fill,minmax(360px,1fr))">${gr.voci.map(v => allestCard(E, v)).join('')}</div>`).join('')}`;
};
function allestCard(E, v) {
  if (v.fisso) return `<div class="avoce"><div class="head"><h4>${esc(v.nome)}</h4><span class="pill ok">incluso</span></div><div class="fixed">${esc(v.info)}</div></div>`;
  const st = E.allest[v.id] || {}, sel = v.opts.find(o => o.id === st.opt), done = st.opt && st.ok;
  const sur = o => { const s = priceOf(`sur:${v.id}:${o.id}`, o.sur), f = o.fix ? priceOf(`fix:${v.id}:${o.id}`, o.fix) : 0; return s ? `<span class="sur">+€${s}/pers</span>` : f ? `<span class="sur">€${f}</span>` : o.quota ? '<span class="sur">quota</span>' : ''; };
  return `<div class="avoce ${done ? 'done' : ''}"><div class="head"><h4>${esc(v.nome)}</h4>${!st.opt ? '<span class="pill warn">da scegliere</span>' : st.ok ? '<span class="pill ok">✓ confermata</span>' : '<span class="pill">scelta</span>'}</div>
    <div class="opts">${v.opts.map(o => `<div class="o ${st.opt === o.id ? 'on' : ''}" data-pick="allest.${v.id}.opt" data-v="${o.id}" title="${esc(o.nota || '')}">${v.color ? `<span class="sw" style="background:${o.hex}"></span>` : ''}${esc(o.nome)} ${sur(o)}</div>`).join('')}</div>
    ${sel && sel.nota ? `<div class="hint" style="margin-top:8px">${esc(sel.nota)}</div>` : ''}
    ${sel && sel.testo ? `<div class="field" style="margin-top:8px"><label>Indicare il colore</label><input type="text" data-b="allest.${v.id}.testo" value="${esc(st.testo || '')}"></div>` : ''}
    ${v.info ? `<div class="hint" style="margin-top:8px">${esc(v.info)}</div>` : ''}
    <div class="row" style="margin-top:10px"><label class="row" style="gap:6px"><input type="checkbox" data-b="allest.${v.id}.ok" data-r ${st.ok ? 'checked' : ''} ${st.opt ? '' : 'disabled'}> Confermata dal cliente</label></div>
    <div class="field" style="margin-top:8px"><input type="text" data-b="allest.${v.id}.note" value="${esc(st.note || '')}" placeholder="Note"></div></div>`;
}

/* ---------------------------------------------------------------- ADD-ON */
HOOKS.addvar = el => { delete curEvent().recipes['ad-' + el.dataset.a]; rr(); };
VIEWS.addon = E => {
  const q = computeQuote(E), tot = q.lines.filter(l => l.sec === 'Servizi aggiuntivi').reduce((a, l) => a + l.tot, 0);
  const cats = [...new Set(CAT.addons.map(a => a.cat))];
  return `<div class="secthead"><div><h2>Add-on</h2><p>Servizi aggiuntivi alla proposta Diamante. Seleziona quelli richiesti dal cliente: entrano nel preventivo. Prezzi in € a persona oltre IVA (10%), calcolati sugli ospiti adulti (modificabili).</p></div><div class="tile right"><b>${eur(tot)}</b><span>Totale add-on (iva escl.)</span></div></div>
  <div class="grid auto" style="grid-template-columns:repeat(auto-fill,minmax(420px,1fr))">${CAT.addons.map(a => addonCard(E, a)).join('')}</div>`;
};
function addonCard(E, a) {
  const st = E.addons[a.id] || {}, on = !!st.on;
  if (a.link) {
    const sel = (E.allest[a.link] || {}).opt, imp = ['imp_tov', 'imp_leg', 'mix'].includes(sel);
    return `<div class="card"><div class="chead"><h4>${esc(a.nome)}</h4><span class="pill ${imp ? 'ok' : ''} right">${imp ? 'attivo' : 'non selezionato'}</span></div><p class="muted small">${esc(a.desc)}</p><a class="btn sm alt" href="#/${evUrl('allestimento')}">Vai ad Allestimento → Tavoli</a></div>`;
  }
  const v = a.varianti ? (a.varianti.find(x => x.id === st.variante) || a.varianti[0]) : null;
  const defPrice = v ? priceOf(`add:${a.id}:${v.id}`, v.prezzo) : a.prezzo ? priceOf(`add:${a.id}`, a.prezzo) : null;
  const priceTag = a.quota ? '<span class="pill warn">su quotazione</span>' : a.varianti ? `<span class="pill warn">da ${eur(Math.min(...a.varianti.map(x => x.prezzo)))} / ${a.perOra ? 'ora' : 'pers'}</span>` : `<span class="pill warn">${eur(a.prezzo)} / pers</span>`;
  return `<div class="card" style="${on ? 'border-color:var(--navy);box-shadow:0 0 0 1px var(--navy)' : ''}"><label class="chead" style="cursor:pointer"><input type="checkbox" data-b="addons.${a.id}.on" data-r ${on ? 'checked' : ''}><h4 style="flex:1">${esc(a.nome)}</h4>${priceTag}</label>
    <p class="muted small" style="margin:8px 0 0">${esc(a.desc)}</p>
    ${on ? `<div class="sp"></div>${a.varianti ? `<div class="pick">${a.varianti.map(x => `<label class="opt ${x.id === v.id ? 'on' : ''}"><input type="radio" hidden name="va-${a.id}" data-b="addons.${a.id}.variante" data-hook="addvar" data-a="${a.id}" value="${x.id}" ${x.id === v.id ? 'checked' : ''}><span class="mk"></span><div class="t" style="font-weight:600">${esc(x.nome)}${x.items ? `<div class="d" style="font-weight:400">${esc(x.items.join(' · '))}</div>` : ''}</div><span class="pr">${eur(priceOf(`add:${a.id}:${x.id}`, x.prezzo))}${a.perOra ? '/h' : ''}</span></label>`).join('')}</div><div class="sp"></div>` : ''}
      <div class="fields" style="grid-template-columns:repeat(auto-fill,minmax(130px,1fr))">
        ${a.quota || (!a.prezzo && !a.varianti) ? `<div class="field"><label>Importo quotato (€ forfait)</label><input type="number" data-b="addons.${a.id}.prezzo" data-r value="${st.prezzo ?? ''}"></div>` : `<div class="field"><label>${a.perOra ? 'Ore' : a.minPers ? 'Persone (min ' + a.minPers + ')' : 'Persone'}</label><input type="number" data-b="addons.${a.id}.qty" data-r value="${st.qty ?? ''}" placeholder="${a.perOra ? 1 : a.minPers || E.q.adulti}"></div><div class="field"><label>${a.perOra ? '€ all\'ora' : '€ a persona'}</label><input type="number" step="0.5" data-b="addons.${a.id}.prezzo" data-r value="${st.prezzo ?? ''}" placeholder="${defPrice}"></div>`}
        <div class="field" style="grid-column:1/-1"><label>Note</label><input type="text" data-b="addons.${a.id}.note" value="${esc(st.note || '')}"></div></div>
      ${a.id === 'cocktail' ? `<div class="alert ok small" style="margin-top:10px">Con il cocktail bar: sconto di € ${listinoOf(E).scontoOltre} a persona dal ${listinoOf(E).minAdulti + 1}° ospite adulto.</div>` : ''}` : ''}</div>`;
}
