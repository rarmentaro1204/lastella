/* =====================================================================
   Menù · Prova menù (assaggio per i clienti) e Menù personalizzato (aziende)
   ===================================================================== */

/* ---------------------------------------------------------------- PROVA MENÙ */
const PROVA = [['antipasti', 'Antipasti', 4], ['entree', 'Entrée', 2], ['primi', 'Primi', 2], ['secondi', 'Secondi', 2]];
function provaPick(E, key, title, lim) {
  const p = E.prova, sel = p[key], path = 'prova.' + key;
  const opt = r => OPT(sel.includes(r.id), `data-tog="${path}" data-v="${r.id}" data-lim="${lim}" data-rep`, r.name, r.desc, { tags: tagHtml(r), sq: 1 });
  const groups = key === 'antipasti' ? C.isole.map(i => ({ gruppo: i.nome, items: i.items })) : key === 'primi' ? C.primi : [{ gruppo: '', items: key === 'entree' ? C.entree : C.secondi }];
  return `<div class="card"><div class="chead"><h3>${title}</h3><span class="right">${counter(sel.length, lim)}</span></div><div class="pick">${groups.map(g => (g.gruppo ? `<div class="lbl2" style="margin-top:8px">${esc(g.gruppo)}</div>` : '') + g.items.map(opt).join('')).join('')}</div></div>`;
}
function viewProva(E) {
  const p = E.prova, wines = [...C.vini.bianchi, ...C.vini.rossi, ...Object.values(C.vini.extra || {}).flat()];
  return `<div class="secthead"><div><h2>Prova menù</h2><p>La degustazione per i clienti: al posto del menù completo si scelgono <b>4 antipasti, 2 entrée, 2 primi, 2 secondi</b> e i vini da far assaggiare. Le ricette finiscono nel ricettario con le porzioni della prova.</p></div>
    <div class="row right noprint"><button class="btn alt" data-act="prova-print">🖨 Stampa scheda</button></div></div>
  <div class="card"><div class="fields"><div class="field"><label>Data della prova</label><input type="date" data-b="prova.data" value="${esc(p.data)}"></div><div class="field"><label>Ora</label><input type="time" data-b="prova.ora" value="${esc(p.ora)}"></div>
    <div class="field"><label>Persone alla prova</label><input type="number" min="1" data-b="prova.persone" data-r value="${p.persone}"></div></div></div><div class="sp"></div>
  ${PROVA.map(([k, t, l]) => provaPick(E, k, t, l) + '<div class="sp"></div>').join('')}
  <div class="card"><div class="chead"><h3>Vini in assaggio</h3><span class="right muted small">quanti vuoi · ${p.vini.length} scelti</span></div><div class="pick">${wines.map(v => OPT(p.vini.includes(v), `data-tog="prova.vini" data-v="${esc(v)}"`, v, '', { sq: 1 })).join('')}</div></div>
  <div class="sp"></div><div class="card"><div class="field"><label>Note sulla prova</label><textarea data-b="prova.note">${esc(p.note)}</textarea></div></div>`;
}
ACTIONS['prova-print'] = () => {
  const E = curEvent(), p = E.prova, C2 = catalogFor(E), IDX = recipeIndexOf(C2), nm = id => (IDX[id] || {}).name || id;
  const w = window.open('', '_blank'); if (!w) { toast('Consenti i popup per stampare'); return; }
  const blk = (t, a) => a.length ? `<h3>${t}</h3><ul>${a.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '';
  w.document.write(`<!doctype html><meta charset="utf-8"><title>Prova menù</title><style>body{font-family:Georgia,serif;margin:32px;color:#222}h1{font-weight:400;letter-spacing:.2em;text-align:center}h2{text-align:center;font-weight:400}h3{margin:18px 0 4px;font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:#a8907a}li{margin:3px 0}.m{text-align:center;color:#666}</style>
    <h1>LA STELLA</h1><h2>Prova menù · ${esc(evName(E))}</h2><p class="m">${p.data ? esc(fmtDate(p.data)) : ''}${p.ora ? ' · ore ' + esc(p.ora) : ''}${p.persone ? ' · ' + p.persone + ' persone' : ''}</p>
    ${blk('Antipasti', p.antipasti.map(nm))}${blk('Entrée', p.entree.map(nm))}${blk('Primi', p.primi.map(nm))}${blk('Secondi', p.secondi.map(nm))}${blk('Vini', p.vini)}${p.note ? `<h3>Note</h3><p>${esc(p.note)}</p>` : ''}<script>onload=()=>print()<\/script>`);
  w.document.close();
};

/* ---------------------------------------------------------------- MENÙ PERSONALIZZATO (aziende) */
/* modello = { nome, descr, prezzo, sezioni: [{ nome, items: [idRicetta] }] } — stesso formato nell'evento (E.custom) e nella libreria (settings.customMenus) */
const cmCtx = ctx => (ctx === 'e' ? curEvent().custom : S.settings.customMenus[+ctx.slice(2)]);
const cmAttr = (ctx, path) => (ctx === 'e' ? `data-b="custom.${path}"` : `data-s data-b="customMenus.${ctx.slice(2)}.${path}"`);
function cmPicker(C0, ctx, si) {
  const groups = rlibGroups(C0);
  return `<div class="row noprint" style="gap:6px;margin-top:6px"><select id="cmsel-${ctx}-${si}" style="flex:1;min-width:200px"><option value="">＋ Richiama una ricetta esistente…</option>${groups.map(([n, arr]) => `<optgroup label="${esc(n)}">${arr.map(r => `<option value="${esc(r.id)}">${esc(r.name)}</option>`).join('')}</optgroup>`).join('')}</select><button class="btn sm alt" data-act="cm-rec-add" data-ctx="${ctx}" data-si="${si}">Aggiungi</button></div>`;
}
function cmEditor(C0, ctx, M) {
  const IDX = recipeIndexOf(C0), lib = ctx !== 'e';
  return `<div class="fields">${lib ? `<div class="field"><label>Nome del menù</label><input type="text" ${cmAttr(ctx, 'nome')} value="${esc(M.nome || '')}"></div>` : `<div class="field"><label>Titolo del menù</label><input type="text" ${cmAttr(ctx, 'titolo')} value="${esc(M.titolo || '')}" placeholder="es. Cena aziendale · Natale"></div>`}
    <div class="field"><label>Prezzo a persona (€, iva escl.)</label><input type="number" step="0.5" ${cmAttr(ctx, 'prezzo')} ${lib ? '' : 'data-r'} value="${M.prezzo === undefined ? '' : M.prezzo}"></div></div>
    ${(M.sezioni || []).map((sz, si) => `<div class="card" style="margin-top:10px;background:#fcfbf9"><div class="row" style="gap:8px"><input type="text" style="flex:1" ${cmAttr(ctx, `sezioni.${si}.nome`)} value="${esc(sz.nome)}" placeholder="Nome della portata (es. Antipasto, Primo, Dolce)">
      <button class="btn ghost sm" data-act="cm-sec-move" data-ctx="${ctx}" data-si="${si}" data-d="-1">↑</button><button class="btn ghost sm" data-act="cm-sec-move" data-ctx="${ctx}" data-si="${si}" data-d="1">↓</button><button class="btn ghost sm" data-act="cm-sec-del" data-ctx="${ctx}" data-si="${si}" title="Elimina la portata">✕</button></div>
      ${(sz.items || []).map((id, ri) => `<div class="mini-row" style="margin-top:4px"><span style="flex:1">${esc((IDX[id] || {}).name || id + ' (ricetta non più in catalogo)')}</span><button class="btn ghost sm" data-act="cm-rec-del" data-ctx="${ctx}" data-si="${si}" data-ri="${ri}">✕</button></div>`).join('') || '<p class="muted small" style="margin:6px 0">Nessuna ricetta.</p>'}
      ${cmPicker(C0, ctx, si)}</div>`).join('')}
    <div style="margin-top:10px"><button class="btn sm alt" data-act="cm-sec-add" data-ctx="${ctx}">＋ Aggiungi portata</button></div>`;
}
function viewCustom(E) {
  const cu = E.custom, lib = S.settings.customMenus || [];
  return `<div class="secthead"><div><h2>Menù personalizzato</h2><p>Per aziende e richieste fuori standard: costruisci il menù richiamando le ricette già in catalogo, ordinate per portata. Se attivo, le ricette vanno nel ricettario e il prezzo a persona entra nel preventivo.</p></div></div>
  <div class="card"><div class="row" style="gap:20px"><label class="row" style="gap:8px"><input type="checkbox" data-b="custom.attivo" data-r ${cu.attivo ? 'checked' : ''}> <b>Usa un menù personalizzato per questo evento</b></label>
    ${cu.attivo ? `<label class="row" style="gap:8px"><input type="checkbox" data-b="custom.sostituisce" data-r ${cu.sostituisce ? 'checked' : ''}> Al posto della proposta Diamante (prezzo solo a persona)</label>` : ''}</div></div>
  ${cu.attivo ? `<div class="sp"></div><div class="card"><div class="row" style="gap:8px;margin-bottom:10px"><select id="cm-load" style="min-width:240px"><option value="">Parti da un modello aziende…</option>${lib.map((m, i) => `<option value="${i}">${esc(m.nome || 'Senza nome')}</option>`).join('')}</select><button class="btn sm alt" data-act="cm-load">Carica</button>
    <button class="btn sm alt right" data-act="cm-save-lib">＋ Salva nei modelli aziende</button></div>${cmEditor(C, 'e', cu)}
    <div class="field" style="margin-top:10px"><label>Note</label><textarea data-b="custom.note">${esc(cu.note || '')}</textarea></div></div>` : ''}`;
}
const cmNewSec = () => ({ nome: '', items: [] });
ACTIONS['cm-sec-add'] = el => { const M = cmCtx(el.dataset.ctx); (M.sezioni = M.sezioni || []).push(cmNewSec()); save(); rr(); };
ACTIONS['cm-sec-del'] = el => { if (!confirm('Eliminare la portata?')) return; cmCtx(el.dataset.ctx).sezioni.splice(+el.dataset.si, 1); save(); rr(); };
ACTIONS['cm-sec-move'] = el => { const a = cmCtx(el.dataset.ctx).sezioni, i = +el.dataset.si, j = i + +el.dataset.d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; save(); rr(); };
ACTIONS['cm-rec-add'] = el => { const v = document.getElementById(`cmsel-${el.dataset.ctx}-${el.dataset.si}`).value; if (!v) return; const sz = cmCtx(el.dataset.ctx).sezioni[+el.dataset.si]; if (!sz.items.includes(v)) sz.items.push(v); save(); rr(); };
ACTIONS['cm-rec-del'] = el => { cmCtx(el.dataset.ctx).sezioni[+el.dataset.si].items.splice(+el.dataset.ri, 1); save(); rr(); };
ACTIONS['cm-load'] = () => {
  const E = curEvent(), i = document.getElementById('cm-load').value; if (i === '') return; const m = S.settings.customMenus[+i];
  Object.assign(E.custom, { titolo: m.nome || '', prezzo: m.prezzo === undefined ? '' : m.prezzo, sezioni: clone(m.sezioni || []) }); save(); rr(); toast('Modello caricato');
};
ACTIONS['cm-save-lib'] = () => {
  const E = curEvent(), cu = E.custom, nome = prompt('Nome del modello (es. Cena aziendale classica):', cu.titolo || ''); if (!nome) return;
  (S.settings.customMenus = S.settings.customMenus || []).push({ id: uid(), nome, prezzo: cu.prezzo, sezioni: clone(cu.sezioni || []) }); save(); toast('Salvato nei modelli aziende (Catalogo → Menù aziende)'); rr();
};

/* ---------------------------------------------------------------- PROVE MENÙ · calendario e riepilogo di tutte le degustazioni */
const PV = { y: new Date().getFullYear(), m: new Date().getMonth(), day: '' };
const pvHas = E => E.stato !== 'Annullato' && E.prova && (E.prova.data || ['antipasti', 'entree', 'primi', 'secondi', 'vini'].some(k => (E.prova[k] || []).length));
function pvNames(E) {
  const C0 = catalogFor(E), IDX = recipeIndexOf(C0), p = E.prova, nm = id => (IDX[id] || {}).name || id;
  const isl = id => { const i = C0.isole.find(x => x.items.some(r => r.id === id)); return i ? ` <span class="muted">(${esc(i.nome)})</span>` : ''; };
  return [['Antipasti', p.antipasti.map(id => esc(nm(id)) + isl(id))], ['Entrée', p.entree.map(id => esc(nm(id)))], ['Primi', p.primi.map(id => esc(nm(id)))], ['Secondi', p.secondi.map(id => esc(nm(id)))], ['Vini', p.vini.map(esc)]];
}
function viewProve() {
  const list = S.events.filter(pvHas).sort((a, b) => (a.prova.data || '9999').localeCompare(b.prova.data || '9999') || (a.prova.ora || '').localeCompare(b.prova.ora || ''));
  const byDay = {}; list.forEach(E => { if (E.prova.data) (byDay[E.prova.data] = byDay[E.prova.data] || []).push(E); });
  const first = new Date(PV.y, PV.m, 1), lead = (first.getDay() + 6) % 7, dim = new Date(PV.y, PV.m + 1, 0).getDate(), pad = n => String(n).padStart(2, '0');
  const cells = []; for (let i = 0; i < lead; i++) cells.push('<div class="pvd off"></div>');
  for (let d = 1; d <= dim; d++) { const iso = `${PV.y}-${pad(PV.m + 1)}-${pad(d)}`, n = (byDay[iso] || []).length; cells.push(`<div class="pvd ${n ? 'has' : ''} ${PV.day === iso ? 'sel' : ''} ${iso === isoOf(new Date()) ? 'today' : ''}" data-act="pv-day" data-d="${iso}"><b>${d}</b>${n ? `<span class="pill ok">${n}</span>` : ''}${(byDay[iso] || []).slice(0, 2).map(E => `<div class="small">${esc(E.prova.ora || '')} ${esc(evName(E).split(' & ')[0])}</div>`).join('')}</div>`); }
  const shown = PV.day ? list.filter(E => E.prova.data === PV.day) : list;
  const months = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
  return `<div class="secthead"><div><h1>Prove menù</h1><p>Il calendario di tutte le degustazioni con le scelte fatte dai clienti. Clicca un giorno per filtrare l'elenco.</p></div></div>
  <div class="card"><div class="row" style="margin-bottom:8px"><button class="btn sm alt" data-act="pv-nav" data-d="-1">‹</button><h3 style="min-width:160px;text-align:center">${months[PV.m]} ${PV.y}</h3><button class="btn sm alt" data-act="pv-nav" data-d="1">›</button><button class="btn sm alt" data-act="pv-nav" data-d="0">Oggi</button>${PV.day ? '<button class="btn sm right" data-act="pv-day" data-d="">Mostra tutte</button>' : ''}</div>
    <div class="pvg">${['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(x => `<div class="pvh">${x}</div>`).join('')}${cells.join('')}</div></div>
  <div class="sp"></div><h3 style="margin-bottom:8px">${PV.day ? 'Prove del ' + esc(fmtDate(PV.day)) : 'Tutte le prove'} <span class="muted small">(${shown.length})</span></h3>
  ${shown.map(E => { const p = E.prova; return `<div class="card" style="margin-bottom:12px"><div class="row"><h4 style="flex:1">${esc(evName(E))} <span class="muted small">· evento ${esc(E.q.data ? new Date(E.q.data + 'T12:00:00').toLocaleDateString('it-IT') : '—')}</span></h4>
      <span class="pill ${p.data ? 'ok' : 'warn'}">${p.data ? esc(new Date(p.data + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })) + (p.ora ? ' · ' + esc(p.ora) : '') : 'data da fissare'}</span><span class="pill">${p.persone || 2} persone</span><a class="btn sm alt" href="#/${'e/' + E.id + '/menu/prova'}">Apri</a></div>
      <div class="grid g4" style="margin-top:8px">${pvNames(E).map(([t, a]) => `<div><div class="lbl2">${t} (${a.length})</div>${a.length ? a.map(x => `<div class="small" style="margin:2px 0">${x}</div>`).join('') : '<span class="muted small">—</span>'}</div>`).join('')}</div>${p.note ? `<p class="small muted" style="margin-top:6px">${esc(p.note)}</p>` : ''}</div>`; }).join('') || '<div class="empty">Nessuna prova menù ancora: si compilano da Menù → Prova menù, o dal portale cliente.</div>'}`;
}
ACTIONS['pv-nav'] = el => { const d = +el.dataset.d; if (!d) { PV.y = new Date().getFullYear(); PV.m = new Date().getMonth(); } else { PV.m += d; if (PV.m < 0) { PV.m = 11; PV.y--; } else if (PV.m > 11) { PV.m = 0; PV.y++; } } rr(); };
ACTIONS['pv-day'] = el => { PV.day = PV.day === el.dataset.d ? '' : el.dataset.d; rr(); };
