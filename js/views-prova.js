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
