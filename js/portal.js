/* Portale cliente: pagina privata raggiunta dal link personale (#token). Nessun accesso ad altri dati del gestionale. */
const $ = s => document.querySelector(s);
const TOKEN = (location.hash.replace(/^#\/?/, '') || new URLSearchParams(location.search).get('t') || '').trim();
const API = '/api/portal/' + encodeURIComponent(TOKEN);
const ALLERGIE = [['glutine', 'Glutine'], ['crostacei', 'Crostacei'], ['uova', 'Uova'], ['pesce', 'Pesce'], ['arachidi', 'Arachidi'], ['soia', 'Soia'], ['latte', 'Latte'], ['guscio', 'Frutta a guscio'], ['sedano', 'Sedano'], ['senape', 'Senape'], ['sesamo', 'Sesamo'], ['solfiti', 'Solfiti'], ['lupini', 'Lupini'], ['molluschi', 'Molluschi']];
const INTOLL = [['celiachia', 'Celiachia'], ['lattosio', 'Lattosio'], ['nichel', 'Nichel'], ['istamina', 'Istamina'], ['fruttosio', 'Fruttosio'], ['favismo', 'Favismo'], ['gravidanza', 'Gravidanza'], ['funghi', 'Funghi']];
const DIETE = ['', 'Vegetariano', 'Vegano', 'Fruttariano', 'Pescetariano', 'Crudista', 'Halal', 'Kosher'];
const TABS = [['home', 'Il tuo evento'], ['aperitivo', 'Aperitivo'], ['tavola', 'A tavola'], ['dolci', 'Dolci e vini'], ['allest', 'Allestimenti'], ['invitati', 'Invitati'], ['tavoli', 'Tavoli'], ['richieste', 'Richieste speciali'], ['fine', 'Note e conferma'], ['eco', 'Riepilogo economico']];
let EV = null, D = null, tab = 'home', dirty = false, msg = '', saving = false;

const fmt = iso => iso ? new Date(iso + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '—';

async function call(method, body) {
  const r = await fetch(API, { method, headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  return { ok: r.ok, status: r.status, body: await r.json().catch(() => ({})) };
}
function loadEv(ev) {
  EV = ev; D = { menu: clone(ev.menu), allest: clone(ev.allest), guests: clone(ev.guests), tables: clone(ev.tables || []), special: clone(ev.special), nota: ev.nota || '' }; dirty = false;
  const m = D.menu; for (const k of ['show', 'passaggio', 'extraBuvette', 'pre', 'entree', 'primi', 'secondi', 'extraVini', 'lounge']) m[k] = m[k] || [];
}
async function boot() {
  if (!TOKEN) { $('#app').innerHTML = '<div class="card"><h2>Link non valido</h2><p class="muted">Apri il link personale che ti ha inviato La Stella.</p></div>'; return; }
  const r = await call('GET');
  if (!r.ok) { $('#app').innerHTML = `<div class="card"><h2>Link non valido o scaduto</h2><p class="muted">${esc(r.body.error || 'Contatta La Stella per ricevere un nuovo link.')}</p></div>`; return; }
  loadEv(r.body.event); draw();
}

const locked = k => EV.locks.all || EV.locks[k];
const dis = k => (locked(k) ? 'disabled' : '');
const get = path => path.split('.').reduce((o, k) => (o == null ? o : o[k]), D);
function set(path, v) { const ks = path.split('.'), last = ks.pop(); const o = ks.reduce((o, k) => (o[k] = o[k] || {}), D); o[last] = v; dirty = true; }
const radio = (path, v, label, d, lk) => `<label class="opt ${get(path) === v ? 'on' : ''} ${locked(lk) ? 'dis' : ''}"><input type="radio" name="${esc(path)}" data-set="${esc(path)}" data-v="${esc(v)}" ${get(path) === v ? 'checked' : ''} ${dis(lk)}><div><b>${esc(label)}</b>${d ? `<div class="d">${esc(d)}</div>` : ''}</div></label>`;
const check = (path, v, label, d, lk) => `<label class="opt ${(get(path) || []).includes(v) ? 'on' : ''} ${locked(lk) ? 'dis' : ''}"><input type="checkbox" data-tog="${esc(path)}" data-v="${esc(v)}" ${(get(path) || []).includes(v) ? 'checked' : ''} ${dis(lk)}><div><b>${esc(label)}</b>${d ? `<div class="d">${esc(d)}</div>` : ''}</div></label>`;
const lockNote = k => (locked(k) ? `<div class="alert">${EV.confermatoAt ? 'Avete confermato le vostre scelte: non sono più modificabili da qui' : EV.locks.all ? 'Questa pratica è chiusa' : 'Il termine per questa sezione è scaduto'}: per modifiche contattate La Stella.</div>` : '');
const dishes = (path, arr, lk) => arr.map(r => check(path, r.id, r.name, r.desc, lk)).join('');

function view() {
  const C = EV.catalog, q = EV.q;
  if (!C) return '<div class="card">Il catalogo non è ancora disponibile.</div>';
  if (tab === 'home') {
    const dl = (iso, l) => iso ? `<tr><td>${l}</td><td><b>${esc(fmt(iso))}</b></td></tr>` : '';
    return `<div class="card"><h2>Benvenuti!</h2><p>Da qui potete scegliere il menù, gli allestimenti e inserire l'elenco degli invitati con eventuali allergie. Le scelte si salvano con il pulsante in basso e il nostro staff le vede subito. Potete tornare quante volte volete fino alle scadenze.</p>
      <table><tr><td>Data evento</td><td><b>${esc(fmt(q.data))}</b></td></tr><tr><td>Location</td><td><b>${esc(q.locationNome || '—')}</b></td></tr><tr><td>Ospiti</td><td><b>${+q.adulti || 0} adulti${+q.bambini ? ` · ${q.bambini} bambini` : ''}${+q.neonati ? ` · ${q.neonati} neonati` : ''}</b></td></tr>${dl(q.scadenzaMenu, 'Scelta menù entro')}${dl(q.scadenzaAllest, 'Scelta allestimenti entro')}</table></div>
      ${EV.confermatoAt ? `<div class="alert ok">Avete confermato le vostre scelte il ${esc(new Date(EV.confermatoAt).toLocaleDateString('it-IT'))}. Se serve cambiare qualcosa scrivete al nostro staff.</div>` : ''}
      <div class="alert">Le scelte che comportano supplementi o personalizzazioni sono soggette a conferma e quotazione da parte di La Stella.</div>`;
  }
  if (tab === 'aperitivo') return `<h2>Aperitivo</h2>${lockNote('menu')}
    <h3>Isole show-cooking</h3>${C.isole.filter(i => i.tipo === 'show').map(i => check('menu.show', i.id, i.nome, i.sub + ' — ' + i.items.map(x => x.name).join(', '), 'menu')).join('')}
    <h3>Isole a passaggio</h3>${C.isole.filter(i => i.tipo !== 'show').map(i => check('menu.passaggio', i.id, i.nome, i.sub + ' — ' + i.items.map(x => x.name).join(', '), 'menu')).join('')}
    <h3>Cocktail d'aperitivo</h3>${C.buvette.cocktail.map(c => radio('menu.cocktail', c, c, '', 'menu')).join('')}
    <h3>Succo di frutta</h3>${C.buvette.succhi.map(c => radio('menu.succo', c, c, '', 'menu')).join('')}
    <h3>Note sull'aperitivo</h3><textarea data-set="menu.noteAperitivo" ${dis('menu')}>${esc(D.menu.noteAperitivo || '')}</textarea>`;
  if (tab === 'tavola') return `<h2>A tavola</h2>${lockNote('menu')}
    <h3>Pre-entrée</h3>${dishes('menu.pre', C.preEntree, 'menu')}<h3>Entrée</h3>${dishes('menu.entree', C.entree, 'menu')}
    <h3>Primo piatto</h3>${C.primi.map(g => `<div class="muted small" style="margin:8px 0 4px">${esc(g.gruppo)}</div>${dishes('menu.primi', g.items, 'menu')}`).join('')}
    <h3>Secondo piatto</h3>${dishes('menu.secondi', C.secondi, 'menu')}
    ${C.formaggi.length ? `<h3>Formaggi</h3><label class="opt ${D.menu.formaggi ? 'on' : ''} ${locked('menu') ? 'dis' : ''}"><input type="checkbox" data-flag="menu.formaggi" ${D.menu.formaggi ? 'checked' : ''} ${dis('menu')}><div><b>${esc(C.formaggi[0].name)}</b><div class="d">${esc(C.formaggi[0].desc)}</div></div></label>` : ''}
    <h3>Note sul menù a tavola</h3><textarea data-set="menu.noteMenu" ${dis('menu')}>${esc(D.menu.noteMenu || '')}</textarea>`;
  if (tab === 'dolci') return `<h2>Dolci e vini</h2>${lockNote('menu')}
    <h3>Dessert nuziale</h3>${C.dessert.map(r => radio('menu.dessert', r.id, r.name, r.desc, 'menu')).join('')}
    <h3>Lounge bar · piccola pasticceria</h3>${dishes('menu.lounge', C.lounge, 'menu')}
    <h3>Vino bianco</h3>${C.vini.bianchi.map(v => radio('menu.bianco', v, v, '', 'menu')).join('')}<h3>Vino rosso</h3>${C.vini.rossi.map(v => radio('menu.rosso', v, v, '', 'menu')).join('')}`;
  if (tab === 'allest') return `<h2>Allestimenti</h2>${lockNote('allest')}${C.allestimenti.map(g => `<h3>${esc(g.gruppo)}</h3>${g.voci.map(v => v.fisso ? `<div class="card"><b>${esc(v.nome)}</b> <span class="pill ok">incluso</span><div class="muted small">${esc(v.info)}</div></div>` : allestVoce(v)).join('')}`).join('')}`;
  if (tab === 'invitati') return guestsView();
  if (tab === 'tavoli') return `<h2>Tavoli</h2>${lockNote('guests')}<p class="muted">Create i tavoli e sistemate gli invitati: trascinate un invitato su un posto e trascinate il tavolo dal titolo per spostarlo in sala. Tavolo tondo da 8 a 11 persone, rettangolare senza limiti. La disposizione sarà rifinita insieme al nostro staff.</p>${SeatPlan.html(SeatPlan.host())}`;
  if (tab === 'richieste') return `<h2>Richieste speciali</h2>${lockNote('all')}<p class="muted">Un piatto fuori menù, un'isola personalizzata, una variante per allergie o diete particolari: descrivetela e il nostro chef vi risponderà con fattibilità e costo.</p>
    ${D.special.map((s, i) => `<div class="card"><div class="row"><select data-sp="${i}" data-f="kind" style="max-width:260px" ${dis('all')}>${[['piatto', 'Piatto personalizzato'], ['isola', 'Isola personalizzata'], ['dieta', 'Variante dietetica / allergeni'], ['altro', 'Altro']].map(([k, l]) => `<option value="${k}" ${s.kind === k ? 'selected' : ''}>${l}</option>`).join('')}</select>${s.stato ? `<span class="pill ${s.stato === 'Approvato' ? 'ok' : 'warn'}">${esc(s.stato)}</span>` : ''}<button class="btn alt sm" data-spdel="${i}" ${dis('all')}>Elimina</button></div>
      <div style="margin-top:8px"><input type="text" data-sp="${i}" data-f="titolo" placeholder="Titolo (es. Torta senza glutine)" value="${esc(s.titolo)}" ${dis('all')}></div><div style="margin-top:8px"><textarea data-sp="${i}" data-f="descr" placeholder="Descrizione" ${dis('all')}>${esc(s.descr)}</textarea></div></div>`).join('') || '<div class="muted">Nessuna richiesta.</div>'}
    <button class="btn alt" data-spadd ${dis('all')}>＋ Aggiungi richiesta</button>`;
  if (tab === 'eco') return ecoView();
  return `<h2>Note e conferma</h2>${EV.confermatoAt ? '' : lockNote('all')}<div class="card"><label class="f">Messaggio per lo staff</label><textarea data-set="nota" ${dis('all')}>${esc(D.nota)}</textarea></div>
    <div class="card"><h4>Conferma finale</h4>${EV.confermatoAt ? `<div class="alert ok">Scelte confermate il ${esc(new Date(EV.confermatoAt).toLocaleDateString('it-IT'))}. Non è più possibile modificarle da qui: per qualsiasi cambiamento contattate La Stella.</div>`
      : `<div class="alert"><b>Attenzione:</b> dopo la conferma <b>non sarà più possibile modificare</b> le scelte (menù, allestimenti, invitati, richieste). Per eventuali cambiamenti dovrete contattare direttamente La Stella, che valuterà la fattibilità.</div><p class="muted">Quando avete deciso tutto premete «Conferma definitivamente»: lo staff riceve l'avviso e procede con l'organizzazione.</p><button class="btn" data-confirm ${dis('all')}>Conferma definitivamente</button>`}</div>`;
}
function ecoView() {
  const pr = EV.pricing; if (!pr) return '<div class="card">Riepilogo non disponibile.</div>';
  let Q, plan;
  try {
    S.settings = hydrateSettings(pr.settings);
    const E = hydrate({ q: pr.event.q, allest: D.allest, addons: pr.event.addons, special: pr.event.special, econ: pr.event.econ, pagAuto: pr.event.pagAuto });
    Q = computeQuote(E);
    plan = pr.event.pagAuto ? buildScadenziario(E, Q.imponibile).map((p, i) => ({ ...p, paid: !!(pr.event.pagamenti[i] && pr.event.pagamenti[i].paid) })) : pr.event.pagamenti;
  } catch (err) { return '<div class="card">Non è stato possibile calcolare il riepilogo: contattate La Stella.</div>'; }
  const iva = S.settings.iva, secs = [...new Set(Q.lines.map(l => l.sec))];
  return `<h2>Riepilogo economico</h2>${dirty ? '<div class="alert">Avete modifiche non salvate: salvatele per aggiornare il riepilogo.</div>' : ''}
  <p class="muted">Preventivo aggiornato in base alle vostre scelte. È indicativo: le voci «da valutare» o a quotazione dedicata saranno confermate da La Stella.</p>
  ${secs.map(sec => `<h3>${esc(sec)}</h3><div class="card"><table>${Q.lines.filter(l => l.sec === sec).map(l => `<tr><td>${esc(l.label)}${l.qty > 1 ? `<div class="muted small">${l.qty} × ${eur(l.unit)}</div>` : ''}</td><td style="text-align:right;white-space:nowrap"><b>${eur(l.tot)}</b></td></tr>`).join('')}</table></div>`).join('')}
  <div class="card"><table><tr><td>Imponibile</td><td style="text-align:right">${eur(Q.imponibile)}</td></tr><tr><td>IVA ${iva}%</td><td style="text-align:right">${eur(Q.iva)}</td></tr><tr><td><b>Totale (IVA inclusa)</b></td><td style="text-align:right;font-size:20px"><b>${eur(Q.totale)}</b></td></tr></table></div>
  ${Q.infos.length ? Q.infos.map(i => `<div class="alert ok">${esc(i)}</div>`).join('') : ''}
  ${plan && plan.length ? `<h3>Scadenze di pagamento</h3><div class="card"><table><tr><th>Quando</th><th>Descrizione</th><th style="text-align:right">Importo IVA incl.</th></tr>${plan.map(p => `<tr><td style="white-space:nowrap">${p.due ? esc(new Date(p.due + 'T12:00:00').toLocaleDateString('it-IT')) : '—'}</td><td>${esc(p.desc)}${p.paid ? ' <span class="pill ok">pagato</span>' : ''}</td><td style="text-align:right;white-space:nowrap">${eur(p.importo * (1 + iva / 100))}</td></tr>`).join('')}</table></div>` : ''}`;
}
function allestVoce(v) {
  const st = D.allest[v.id] || {}, sel = v.opts.find(o => o.id === st.opt), sur = o => (o.sur ? ` · +€${o.sur}/pers` : o.fix ? ` · €${o.fix}` : o.quota ? ' · su quotazione' : '');
  return `<div class="card"><div class="row"><b style="flex:1">${esc(v.nome)}</b>${st.ok ? '<span class="pill ok">confermato</span>' : st.opt ? '<span class="pill">scelto</span>' : '<span class="pill warn">da scegliere</span>'}</div>
    <div style="margin-top:8px">${v.opts.map(o => `<label class="opt ${st.opt === o.id ? 'on' : ''} ${locked('allest') ? 'dis' : ''}"><input type="radio" name="al-${esc(v.id)}" data-al="${esc(v.id)}" data-f="opt" data-v="${esc(o.id)}" ${st.opt === o.id ? 'checked' : ''} ${dis('allest')}><div>${v.color && o.hex ? `<span class="sw" style="background:${esc(o.hex)}"></span>` : ''}<b>${esc(o.nome)}</b>${esc(sur(o))}${o.nota ? `<div class="d">${esc(o.nota)}</div>` : ''}</div></label>`).join('')}</div>
    ${sel && sel.testo ? `<div style="margin-top:6px"><label class="f">Indicate il colore</label><input type="text" data-al="${esc(v.id)}" data-f="testo" value="${esc(st.testo || '')}" ${dis('allest')}></div>` : ''}
    <div style="margin-top:8px"><input type="text" data-al="${esc(v.id)}" data-f="note" placeholder="Note" value="${esc(st.note || '')}" ${dis('allest')}></div>${v.info ? `<div class="muted small" style="margin-top:6px">${esc(v.info)}</div>` : ''}</div>`;
}
function guestsView() {
  const lk = locked('guests'), n = D.guests.length;
  return `<h2>Invitati</h2>${lockNote('guests')}
  <div class="card"><h4>Compilate l'elenco con Excel</h4><p class="muted small">Scaricate il modello, compilatelo (una riga per invitato, con allergie e intolleranze) e caricatelo qui: importiamo tutte le informazioni in automatico.</p>
    <div class="row"><a class="btn alt" href="template/Invitati_e_Tavoli_La_Stella.xlsx" download>⭳ Scarica il modello Excel</a><label class="btn ${lk ? 'alt' : ''}" style="${lk ? 'opacity:.5;pointer-events:none' : ''}">⭱ Carica il file compilato<input type="file" id="xls" accept=".xlsx,.xls,.csv" hidden ${lk ? 'disabled' : ''}></label></div></div>
  <p class="muted">Oppure inserite gli invitati e segnalate allergie, intolleranze o diete: è fondamentale per la sicurezza in cucina. La disposizione ai tavoli viene definita insieme al nostro staff. Invitati inseriti: <b>${n}</b>.</p>
  ${D.guests.map((g, i) => `<div class="card"><div class="grid2"><div><label class="f">Nome</label><input type="text" data-g="${i}" data-f="nome" value="${esc(g.nome)}" ${lk ? 'disabled' : ''}></div><div><label class="f">Cognome</label><input type="text" data-g="${i}" data-f="cognome" value="${esc(g.cognome)}" ${lk ? 'disabled' : ''}></div>
    <div><label class="f">Fascia</label><select data-g="${i}" data-f="fascia" ${lk ? 'disabled' : ''}>${['Adulto', 'Bambino', 'Neonato'].map(f => `<option ${g.fascia === f ? 'selected' : ''}>${f}</option>`).join('')}</select></div>
    <div><label class="f">Dieta</label><select data-g="${i}" data-f="dieta" ${lk ? 'disabled' : ''}>${DIETE.map(f => `<option value="${f}" ${g.dieta === f ? 'selected' : ''}>${f || '—'}</option>`).join('')}</select></div></div>
    <div style="margin-top:8px"><label class="f">Allergie</label><div class="chips">${ALLERGIE.map(([k, l]) => `<span class="chip ${g.allergie.includes(k) ? 'on' : ''}" data-gt="${i}" data-f="allergie" data-v="${k}">${l}</span>`).join('')}</div></div>
    <div style="margin-top:8px"><label class="f">Intolleranze</label><div class="chips">${INTOLL.map(([k, l]) => `<span class="chip ${g.intolleranze.includes(k) ? 'on' : ''}" data-gt="${i}" data-f="intolleranze" data-v="${k}">${l}</span>`).join('')}</div></div>
    <div class="row" style="margin-top:8px"><input type="text" style="flex:1;min-width:200px" data-g="${i}" data-f="altro" placeholder="Altre esigenze" value="${esc(g.altro)}" ${lk ? 'disabled' : ''}><button class="btn alt sm" data-gdel="${i}" ${lk ? 'disabled' : ''}>Elimina</button></div></div>`).join('')}
  <button class="btn alt" data-gadd ${lk ? 'disabled' : ''}>＋ Aggiungi invitato</button>`;
}

function draw() {
  const y = scrollY;
  $('#app').innerHTML = `<div class="muted small" style="text-align:center">${esc(EV.q.tipo || '')}</div><h1 style="text-align:center">${esc([EV.q.sposo1, EV.q.sposo2].filter(Boolean).join(' & '))}</h1>
    <div class="tabs">${TABS.map(([k, t]) => `<button class="${tab === k ? 'on' : ''}" data-tab="${k}">${t}</button>`).join('')}</div>${view()}`;
  const b = $('#bar'); b.hidden = tab === 'home' && !dirty;
  b.innerHTML = `${msg ? `<span class="${msg.startsWith('✓') ? '' : 'muted'}">${esc(msg)}</span>` : dirty ? '<span class="muted">Modifiche non salvate</span>' : ''}<button class="btn" data-save ${dirty && !saving ? '' : 'disabled'}>${saving ? 'Salvataggio…' : 'Salva le modifiche'}</button>`;
  scrollTo(0, y);
}
async function savePortal(extra = {}) {
  saving = true; msg = ''; draw();
  const body = { menu: D.menu, allest: D.allest, guests: D.guests, tables: D.tables, special: D.special, nota: D.nota, ...extra };
  const r = await call('PUT', body); saving = false;
  if (!r.ok) { msg = r.body.error || 'Errore, riprova'; draw(); return; }
  const keep = tab; loadEv(r.body.event); tab = keep;
  msg = r.body.denied && r.body.denied.length ? 'Alcune parti sono chiuse e non sono state salvate: ' + r.body.denied.join(', ') : '✓ Salvato';
  draw();
}

document.addEventListener('click', e => {
  const t = e.target.closest('[data-tab],[data-save],[data-gadd],[data-gdel],[data-gt],[data-spadd],[data-spdel],[data-confirm]'); if (!t) return;
  if (t.dataset.tab) { tab = t.dataset.tab; msg = ''; draw(); scrollTo(0, 0); }
  else if ('save' in t.dataset) savePortal();
  else if ('confirm' in t.dataset) { if (confirm('Dopo la conferma NON potrete più modificare le scelte. Confermare definitivamente?')) savePortal({ conferma: true }); }
  else if ('gadd' in t.dataset) { D.guests.push({ id: uid(), nome: '', cognome: '', fascia: 'Adulto', dieta: '', allergie: [], intolleranze: [], altro: '', note: '', seggiolone: false }); dirty = true; msg = ''; draw(); }
  else if (t.dataset.gdel !== undefined) { if (confirm('Eliminare questo invitato?')) { D.guests.splice(+t.dataset.gdel, 1); syncSeats(); dirty = true; draw(); } }
  else if (t.dataset.gt !== undefined) { if (locked('guests')) return; const a = D.guests[+t.dataset.gt][t.dataset.f], v = t.dataset.v, i = a.indexOf(v); i < 0 ? a.push(v) : a.splice(i, 1); dirty = true; msg = ''; draw(); }
  else if ('spadd' in t.dataset) { D.special.push({ id: uid(), kind: 'piatto', titolo: '', descr: '', stato: '' }); dirty = true; draw(); }
  else if (t.dataset.spdel !== undefined) { D.special.splice(+t.dataset.spdel, 1); dirty = true; draw(); }
});
const isText = t => t.tagName === 'TEXTAREA' || t.type === 'text';
function updBar() { const b = $('#bar'); b.hidden = false; const sv = b.querySelector('[data-save]'); if (sv) sv.disabled = !dirty || saving; const s = b.querySelector('span'); if (s) s.textContent = 'Modifiche non salvate'; else b.insertAdjacentHTML('afterbegin', '<span class="muted">Modifiche non salvate</span>'); }
document.addEventListener('input', e => {
  const t = e.target; if (!isText(t)) return; msg = '';
  if (t.dataset.set !== undefined) set(t.dataset.set, t.value);
  else if (t.dataset.al !== undefined) { const st = (D.allest[t.dataset.al] = D.allest[t.dataset.al] || {}); st[t.dataset.f] = t.value; dirty = true; }
  else if (t.dataset.g !== undefined) { D.guests[+t.dataset.g][t.dataset.f] = t.value; dirty = true; }
  else if (t.dataset.sp !== undefined) { D.special[+t.dataset.sp][t.dataset.f] = t.value; dirty = true; }
  else return;
  updBar();
});
document.addEventListener('change', e => {
  const t = e.target; if (isText(t)) return; msg = '';
  if (t.dataset.set !== undefined) { set(t.dataset.set, t.dataset.v !== undefined ? t.dataset.v : t.value); draw(); }
  else if (t.dataset.tog !== undefined) { const a = get(t.dataset.tog) || [], i = a.indexOf(t.dataset.v); i < 0 ? a.push(t.dataset.v) : a.splice(i, 1); set(t.dataset.tog, a); draw(); }
  else if (t.dataset.flag !== undefined) { set(t.dataset.flag, t.checked); draw(); }
  else if (t.dataset.al !== undefined) { const st = (D.allest[t.dataset.al] = D.allest[t.dataset.al] || {}); st[t.dataset.f] = t.dataset.v !== undefined ? t.dataset.v : t.value; dirty = true; draw(); }
  else if (t.dataset.g !== undefined) { D.guests[+t.dataset.g][t.dataset.f] = t.value; dirty = true; draw(); }
  else if (t.dataset.sp !== undefined) { D.special[+t.dataset.sp][t.dataset.f] = t.value; dirty = true; draw(); }
});

/* ---- import da Excel (stesso modello usato dallo staff) ---- */
function parseGuests(wb) {
  const sh = wb.Sheets[wb.SheetNames.find(n => /invitat/.test(norm(n))) || wb.SheetNames[0]]; if (!sh) return [];
  const rows = XLSX.utils.sheet_to_json(sh, { header: 1, defval: '', raw: false }), head = (rows[0] || []).map(norm), col = {}, aC = [], iC = [];
  head.forEach((h, i) => {
    if (h === 'nome') col.nome = i; else if (h === 'cognome') col.cognome = i; else if (h === 'fascia') col.fascia = i; else if (h === 'dieta') col.dieta = i; else if (h.startsWith('seggiolon')) col.segg = i;
    else if (h.startsWith('allergia')) { const t = h.replace(/^allergia\s*/, ''), k = ALLERGIE.find(([, l]) => t.startsWith(norm(l).split(' ')[0])); if (k) aC.push([i, k[0]]); }
    else if (h.startsWith('intolleranza')) { const t = h.replace(/^intolleranza\s*/, ''), k = INTOLL.find(([, l]) => t.startsWith(norm(l))); if (k) iC.push([i, k[0]]); }
    else if (h.startsWith('altre allergie')) col.altro = i; else if (h.startsWith('note')) col.note = i;
  });
  const yes = v => { const s = norm(v); return s !== '' && !['no', '0', 'n', 'false'].includes(s); }, dm = Object.fromEntries(DIETE.filter(Boolean).map(d => [norm(d), d]));
  return rows.slice(1).map(r => {
    const nome = String(r[col.nome] ?? '').trim(), cognome = String(r[col.cognome] ?? '').trim(); if (!nome && !cognome) return null;
    const f = norm(r[col.fascia]), d = norm(r[col.dieta]);
    return { id: uid(), nome, cognome, fascia: f.startsWith('b') ? 'Bambino' : f.startsWith('n') ? 'Neonato' : 'Adulto', dieta: dm[d] || '', allergie: aC.filter(([i]) => yes(r[i])).map(([, k]) => k), intolleranze: iC.filter(([i]) => yes(r[i])).map(([, k]) => k),
      altro: [String(r[col.altro] ?? '').trim(), d && !dm[d] ? 'Dieta: ' + r[col.dieta] : ''].filter(Boolean).join(' · '), note: String(r[col.note] ?? '').trim(), seggiolone: col.segg != null && yes(r[col.segg]) };
  }).filter(Boolean);
}
document.addEventListener('change', async e => {
  if (e.target.id !== 'xls' || !e.target.files[0]) return;
  try {
    const list = parseGuests(XLSX.read(await e.target.files[0].arrayBuffer(), { type: 'array' }));
    if (!list.length) { alert('Nessun invitato trovato nel file: usate il modello scaricato da questa pagina.'); return; }
    const keep = D.guests.length && !confirm(`Il file contiene ${list.length} invitati.\n\nOK = sostituisce l'elenco attuale (${D.guests.length}).\nAnnulla = li aggiunge a quelli già inseriti.`);
    D.guests = keep ? D.guests.concat(list) : list; syncSeats(); dirty = true; msg = `Importati ${list.length} invitati: controllate e premete «Salva le modifiche».`; draw();
  } catch (err) { alert('Impossibile leggere il file: ' + (err.message || err)); }
});

/* ---- tavoli: stesso componente del gestionale ---- */
function syncSeats() { const ids = new Set(D.guests.map(g => g.id)); D.tables.forEach(t => { t.seats = t.seats.map(x => (ids.has(x) ? x : null)); }); }
function toastP(m) { const d = document.createElement('div'); d.textContent = m; d.style.cssText = 'position:fixed;left:50%;bottom:90px;transform:translateX(-50%);background:#2e3540;color:#fff;padding:10px 16px;border-radius:8px;z-index:9999;font-size:14px;max-width:90vw;text-align:center'; document.body.appendChild(d); setTimeout(() => d.remove(), 3200); }
SeatPlan.host = () => (EV && D && tab === 'tavoli' ? { guests: D.guests, tables: D.tables, change() { dirty = true; msg = ''; updBar(); }, ro: locked('guests'), toast: toastP, newId: uid } : null);
boot();
