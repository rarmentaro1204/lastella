/* =====================================================================
   Piano dei tavoli: elenco invitati + sala con tavoli trascinabili.
   Condiviso fra gestionale e portale cliente. Chi lo usa fornisce SeatPlan.host():
   { guests, tables, change(), ro, toast(msg), newId(), print }  oppure null se la vista non è aperta.
   Regole: tavolo tondo da 8 a 12 posti (massimo vincolante); rettangolare nessun limite (1–24).
   ===================================================================== */
const SeatPlan = (() => {
  const LIM = { tondo: [8, 12], rett: [1, 24] };
  const lim = t => LIM[t.forma === 'rett' ? 'rett' : 'tondo'];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const nrm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const full = g => [g.nome, g.cognome].filter(Boolean).join(' ') || 'Senza nome';
  const ini = g => ((g.nome || '')[0] || '') + ((g.cognome || '')[0] || '') || '?';
  const arr = a => (Array.isArray(a) ? a : []);
  const flag = g => (arr(g.allergie).length || g.altro ? 'sa' : arr(g.intolleranze).length ? 'si' : g.dieta ? 'sd' : '');
  const tip = g => [full(g) + ' · ' + g.fascia, g.dieta && 'Dieta: ' + g.dieta, g.seggiolone && 'Seggiolone', arr(g.allergie).length && 'ALLERGIE: ' + g.allergie.join(', '), arr(g.intolleranze).length && 'Intolleranze: ' + g.intolleranze.join(', '), g.altro && 'Altro: ' + g.altro].filter(Boolean).join('\n');
  const CATK = (list, k) => (typeof CAT !== 'undefined' && CAT[list] ? CAT[list].find(x => x.k === k) : null);
  /* esigenze di un invitato come [icona, testo, classe] */
  function flagsOf(g) {
    const o = [];
    arr(g.allergie).forEach(k => { const c = CATK('allergie', k); o.push([(c && c.icon) || '⚠', (c && c.label.replace(/ \(.*\)/, '')) || k, 'sa']); });
    arr(g.intolleranze).forEach(k => { const c = CATK('intolleranze', k); o.push([(c && c.icon) || '⚠', (c && c.label) || k, 'si']); });
    if (g.altro) o.push(['⚠', g.altro, 'sa']);
    if (g.dieta) { const c = CATK('diete', g.dieta); o.push([(c && c.icon) || '🌱', g.dieta, 'sd']); }
    return o;
  }
  const flagHtml = (f, max) => { const shown = f.slice(0, max || 99), more = f.length - shown.length; return shown.map(([i, l, c]) => `<span class="fl ${c}">${i} ${esc(l)}</span>`).join('') + (more > 0 ? `<span class="fl">+${more}</span>` : ''); };
  const S = { sel: null, selT: null, q: '', tab: 'free', det: true, zoom: 0.75, auto: true };
  let drag = null;
  const H = () => (SeatPlan.host ? SeatPlan.host() : null);
  const msg = (h, m) => (h.toast ? h.toast(m) : alert(m));

  /* ---- geometria ---- */
  const LW = 104, LH = 58;
  function geometry(t, detOverride) {
    const n = t.seats.length, det = detOverride === undefined ? S.det : detOverride;
    if (!det) {
      if (t.forma !== 'rett') {
        const R = Math.max(58, Math.ceil(n * 44 / (2 * Math.PI))), size = 2 * (R + 26), c = size / 2, d = 2 * (R - 26);
        return { w: size, h: size, table: { x: c - d / 2, y: c - d / 2, w: d, h: d, round: true }, pos: t.seats.map((_, i) => { const a = (-90 + i * 360 / n) * Math.PI / 180; return [c + R * Math.cos(a), c + R * Math.sin(a)]; }), lab: [] };
      }
      const top = Math.ceil(n / 2), step = 42, w = Math.max(top, 3) * step + 30, h = 138;
      return { w, h, table: { x: 14, y: 50, w: w - 28, h: 38, round: false }, pos: t.seats.map((_, i) => i < top ? [20 + step / 2 + i * step, 26] : [20 + step / 2 + (i - top) * step, h - 26]), lab: [] };
    }
    if (t.forma !== 'rett') {                       // tondo con etichette (nome + esigenze) all'esterno di ogni posto
      const R = Math.max(74, Math.ceil(n * 62 / (2 * Math.PI))), pos = [], lab = [];
      t.seats.forEach((_, i) => {
        const a = (-90 + i * 360 / n) * Math.PI / 180, ux = Math.cos(a), uy = Math.sin(a), sx = R * ux, sy = R * uy;
        const d = 17 + 6 + Math.abs(ux) * LW / 2 + Math.abs(uy) * LH / 2 + (Math.abs(uy) > .55 && i % 2 ? 26 : 0);
        pos.push([sx, sy]); lab.push([sx + ux * d, sy + uy * d]);
      });
      const xs = [...pos.map(p => p[0] - 17), ...pos.map(p => p[0] + 17), ...lab.map(p => p[0] - LW / 2), ...lab.map(p => p[0] + LW / 2)], ys = [...pos.map(p => p[1] - 17), ...pos.map(p => p[1] + 17), ...lab.map(p => p[1] - LH / 2), ...lab.map(p => p[1] + LH / 2)];
      const x0 = Math.min(...xs) - 6, y0 = Math.min(...ys) - 6, w = Math.max(...xs) + 6 - x0, h = Math.max(...ys) + 6 - y0, rr = R - 26;
      return { w, h, table: { x: -x0 - rr, y: -y0 - rr, w: 2 * rr, h: 2 * rr, round: true }, pos: pos.map(p => [p[0] - x0, p[1] - y0]), lab: lab.map(p => [p[0] - x0, p[1] - y0]) };
    }
    const top = Math.ceil(n / 2), step = LW + 4, w = Math.max(top, 3) * step + 20, sy1 = LH + 12 + 17, ty = sy1 + 17 + 8, sy2 = ty + 38 + 8 + 17, h = sy2 + 17 + 6 + LH + 6;
    const pos = t.seats.map((_, i) => i < top ? [10 + step / 2 + i * step, sy1] : [10 + step / 2 + (i - top) * step, sy2]);
    return { w, h, table: { x: 8, y: ty, w: w - 16, h: 38, round: false }, pos, lab: pos.map((p, i) => [p[0], i < top ? p[1] - 17 - 6 - LH / 2 : p[1] + 17 + 6 + LH / 2]) };
  }
  const HEAD = 30, size = t => { const g = geometry(t, true); return { w: g.w, h: g.h + HEAD }; };   // ingombro sempre «con nomi»: le posizioni non dipendono dalla modalità di visualizzazione
  const hit = (a, b) => a.x < b.x + b.w + 14 && b.x < a.x + a.w + 14 && a.y < b.y + b.h + 14 && b.y < a.y + a.h + 14;
  function findSpot(tables, s, skip) {
    const others = tables.filter(t => t !== skip && Number.isFinite(t.x) && Number.isFinite(t.y)).map(t => ({ x: t.x, y: t.y, ...size(t) }));
    for (let y = 16; y < 4000; y += 20) for (let x = 16; x <= 1500 - s.w; x += 20) if (!others.some(o => hit({ x, y, ...s }, o))) return { x, y };
    return { x: 16, y: 16 };
  }
  /* posiziona i tavoli senza coordinate e sposta quelli che si sovrappongono ad altri */
  function ensurePos(h, resolve) {
    let ch = false; const placed = [], bad = t => !Number.isFinite(t.x) || !Number.isFinite(t.y);
    h.tables.slice().sort((a, b) => (bad(a) - bad(b)) || (a.num - b.num)).forEach(t => {
      const sz = size(t);
      if (bad(t) || (resolve && placed.some(o => hit({ x: t.x, y: t.y, ...sz }, o)))) { Object.assign(t, findSpot(placed.map(o => o.t), sz, t)); ch = true; }
      placed.push({ x: t.x, y: t.y, ...sz, t });
    });
    return ch;
  }

  /* ---- logica dei posti ---- */
  const seatOf = (h, gid) => { for (const t of h.tables) { const i = t.seats.indexOf(gid); if (i >= 0) return { t, i }; } return null; };
  const unseat = (h, gid) => { const p = seatOf(h, gid); if (p) p.t.seats[p.i] = null; };
  function place(h, gid, t, i) {
    const prev = seatOf(h, gid), occ = t.seats[i]; if (occ === gid) return;
    if (prev) prev.t.seats[prev.i] = occ || null;
    t.seats[i] = gid; t.posti = t.seats.length;
  }
  function firstFree(t, h) { let i = t.seats.indexOf(null); if (i < 0 && !(h && h.fixed) && t.seats.length < lim(t)[1]) { t.seats.push(null); t.posti = t.seats.length; i = t.seats.length - 1; } return i; }
  const occOf = t => t.seats.filter(Boolean).length;
  const label = t => t.nome || 'Tavolo ' + t.num;

  function addTable(h, forma) {
    const n = forma === 'rett' ? 14 : 10, t = { id: h.newId(), num: h.tables.reduce((m, x) => Math.max(m, x.num || 0), 0) + 1, nome: '', forma, posti: n, seats: Array(n).fill(null) };
    Object.assign(t, findSpot(h.tables, size(t), t)); h.tables.push(t); S.selT = t.id; return t;
  }
  function setSeats(h, t, n) {
    const [mn, mx] = lim(t); n = Math.max(mn, Math.min(mx, n));
    if (n === t.seats.length) { if (n === mx || n === mn) msg(h, t.forma === 'rett' ? 'Tavolo rettangolare: da 1 a 24 posti' : `Tavolo tondo: da ${mn} a ${mx} posti`); return false; }
    if (n < t.seats.length) {
      const last = t.seats[t.seats.length - 1];
      if (last) { const g = h.guests.find(x => x.id === last); if (!confirm(`Il posto ${t.seats.length} è occupato da ${g ? full(g) : 'un invitato'}: tornerà «da assegnare». Procedere?`)) return false; }
      t.seats.pop();
    } else t.seats.push(null);
    t.posti = t.seats.length; return true;
  }
  function setForma(h, t, f) {
    if (t.forma === f) return false;
    if (f === 'tondo') {
      const occ = occOf(t); if (occ > 12) { msg(h, `Il tavolo ha ${occ} persone: un tavolo tondo ne contiene al massimo 12. Spostane alcune e riprova.`); return false; }
      t.forma = 'tondo'; const seated = t.seats.filter(Boolean); const n = Math.max(8, Math.min(12, Math.max(t.seats.length, occ)));
      t.seats = [...seated, ...Array(Math.max(0, n - seated.length)).fill(null)].slice(0, 12);
    } else t.forma = 'rett';
    t.posti = t.seats.length; return true;
  }
  function autoSeat(h) {
    const free = h.guests.filter(g => g.fascia !== 'Neonato' && !seatOf(h, g.id)); if (!free.length) { msg(h, 'Nessun invitato da assegnare'); return; }
    let n = 0; h.tables.slice().sort((a, b) => a.num - b.num).forEach(t => { let i; while (free.length && (i = firstFree(t, h)) >= 0) { t.seats[i] = free.shift().id; n++; } });
    msg(h, n + ' invitati assegnati' + (free.length ? ` · ${free.length} senza posto: tutti i tavoli sono al massimo, aggiungi un tavolo` : ''));
  }

  /* ---- HTML ---- */
  function seatHtml(h, t, i, p) {
    const gid = t.seats[i], g = gid && h.guests.find(x => x.id === gid), st = `left:${p[0]}px;top:${p[1]}px`;
    if (!g) return `<div class="sp-seat" style="${st}" data-t="${t.id}" data-i="${i}" title="Posto ${i + 1} libero">${i + 1}</div>`;
    const cls = ['sp-seat', 'f', g.fascia === 'Bambino' ? 'b' : g.fascia === 'Neonato' ? 'n' : '', flag(g), S.sel === g.id ? 'sel' : ''].join(' '), fl = flagsOf(g);
    return `<div class="${cls}" style="${st}" data-t="${t.id}" data-i="${i}" data-g="${g.id}" title="${esc(tip(g))}">${esc(ini(g))}${fl.length ? `<span class="bd">${fl[0][0]}</span>` : ''}</div>`;
  }
  function labHtml(h, gid, l, p) {
    const g = gid && h.guests.find(x => x.id === gid); if (!g) return '';
    return `<div class="sp-lab" style="left:${l[0]}px;top:${l[1]}px;width:${LW}px;min-height:${LH}px"><b>${esc(g.nome || "")}</b><br>${esc(g.cognome || "")}<div class="fls">${flagHtml(flagsOf(g), 2)}</div></div>`;
  }
  function tableHtml(h, t) {
    const g = geometry(t), occ = occOf(t), [mn, mx] = lim(t), sel = S.selT === t.id, bad = t.forma !== 'rett' && occ > 0 && occ < mn;
    const ctl = sel && !h.ro && !h.fixed ? `<div class="sp-tc"><button data-spa="minus" data-t="${t.id}" title="Togli un posto">−</button><b>${t.seats.length}</b><button data-spa="plus" data-t="${t.id}" title="Aggiungi un posto">＋</button><button data-spa="forma" data-t="${t.id}" title="Cambia forma">${t.forma === 'rett' ? '◯ Tondo' : '▭ Rett.'}</button><button data-spa="name" data-t="${t.id}" title="Rinomina">✎</button><button data-spa="del" data-t="${t.id}" title="Elimina tavolo">🗑</button></div>` : '';
    return `<div class="sp-tbl ${sel ? 'sel' : ''}" data-tbl="${t.id}" style="left:${t.x}px;top:${t.y}px;width:${g.w}px"><div class="sp-th" data-tdrag="${t.id}" title="Trascina per spostare il tavolo"><b>${esc(label(t))}</b><span class="pill ${occ === t.seats.length ? 'ok' : ''}">${occ}/${t.seats.length}</span>${bad ? `<span class="pill warn" title="Un tavolo tondo prevede da ${mn} a ${mx} persone">min ${mn}</span>` : ''}</div>${ctl}
      <div class="sp-map" style="width:${g.w}px;height:${g.h}px"><div class="sp-tb" data-tdrag="${t.id}" style="left:${g.table.x}px;top:${g.table.y}px;width:${g.table.w}px;height:${g.table.h}px;border-radius:${g.table.round ? '50%' : '8px'}"><div>${t.num}<small>${t.forma === 'rett' ? 'rettangolare' : 'tondo'}</small></div></div>${t.seats.map((_, i) => seatHtml(h, t, i, g.pos[i])).join('')}${S.det ? t.seats.map((id, i) => labHtml(h, id, g.lab[i], g.pos[i])).join('') : ''}</div></div>`;
  }
  function roomSize(h) { let w = 1200, ht = 640; h.tables.forEach(t => { const s = size(t); w = Math.max(w, t.x + s.w + 40); ht = Math.max(ht, t.y + s.h + 40); }); return [w, ht]; }
  const roomHtml = h => h.tables.map(t => tableHtml(h, t)).join('') || '<div class="sp-empty">Nessun tavolo: aggiungine uno con i pulsanti in alto.</div>';
  function chipHtml(h, g) {
    const p = seatOf(h, g.id), f = flag(g);
    return `<div class="sp-chip ${S.sel === g.id ? 'sel' : ''} ${p ? 'seated' : ''}" data-g="${g.id}" title="${esc(tip(g))}"><span class="gh">⠿</span><span class="nm">${esc(full(g))}</span>${g.fascia !== 'Adulto' ? `<span class="tg">${esc(g.fascia)}</span>` : ''}${f ? `<div class="fls" style="flex-basis:100%">${flagHtml(flagsOf(g))}</div>` : ''}${p ? `<span class="tg t">${esc(label(p.t))}</span>` : ''}</div>`;
  }
  function listHtml(h) {
    const q = nrm(S.q), list = h.guests.filter(g => (S.tab === 'all' || !seatOf(h, g.id)) && (!q || nrm(full(g)).includes(q)));
    return list.map(g => chipHtml(h, g)).join('') || `<p class="muted small" style="padding:8px">${q ? 'Nessun invitato trovato.' : S.tab === 'free' ? 'Tutti gli invitati hanno un posto 🎉' : 'Nessun invitato.'}</p>`;
  }
  function statsHtml(h) {
    const seats = h.tables.reduce((a, t) => a + t.seats.length, 0), seated = h.guests.filter(g => seatOf(h, g.id)).length;
    return `<span><b>${h.tables.length}</b> tavoli</span><span><b>${seats}</b> posti</span><span><b>${seated}</b>/${h.guests.length} assegnati</span>`;
  }
  const tabsHtml = h => { const nf = h.guests.filter(g => !seatOf(h, g.id)).length; return `<button class="${S.tab === 'free' ? 'on' : ''}" data-spa="tab" data-v="free">Da assegnare <i>${nf}</i></button><button class="${S.tab === 'all' ? 'on' : ''}" data-spa="tab" data-v="all">Tutti <i>${h.guests.length}</i></button>`; };

  function html(h) {
    if (ensurePos(h, !h.fixed) && h.change && !h.fixed) h.change();      // le posizioni calcolate vengono salvate: stessa sala per tutti
    const [w, ht] = roomSize(h); setTimeout(autoFit, 0);
    return `<div class="spw" id="sp-root"><aside class="sp-list noprint"><input type="text" id="sp-q" placeholder="🔍 Cerca invitato…" value="${esc(S.q)}" autocomplete="off"><div class="sp-tabs" id="sp-tabs">${tabsHtml(h)}</div><div class="sp-items" id="sp-items">${listHtml(h)}</div>
      <p class="hint" style="margin:6px 2px 0">${h.ro ? 'Sola lettura.' : h.fixed ? 'Trascina un invitato su un posto (o toccalo e poi tocca il posto). Trascina un invitato seduto su un altro posto per scambiarli, o qui per liberarlo. I tavoli sono disposti da La Stella.' : 'Trascina un invitato su un posto (o toccalo e poi tocca il posto). Trascina il tavolo dal suo titolo per spostarlo in sala. Trascina un invitato seduto su un altro posto per scambiarli, o qui per liberarlo.'}</p></aside>
      <section class="sp-main"><div class="sp-bar noprint">${h.ro || h.fixed ? '' : `<button class="btn alt sm" data-spa="add" data-f="tondo">＋ Tavolo tondo <small>(8–12)</small></button><button class="btn alt sm" data-spa="add" data-f="rett">＋ Tavolo rettangolare</button><button class="btn sand sm" data-spa="auto">Assegna automaticamente</button><button class="btn alt sm" data-spa="reflow" title="Rimette in ordine i tavoli in sala">Riordina</button>`}<button class="btn alt sm" data-spa="det" title="Mostra o nasconde nomi ed esigenze accanto ai posti">${S.det ? '☑' : '☐'} Nomi ed esigenze</button>${h.print ? '<button class="btn alt sm" data-spa="print">🖨 Stampa</button>' : ''}<span class="sp-zoom" title="Zoom (anche Ctrl + rotellina)"><button data-spa="zout">−</button><b id="sp-zl">${Math.round(S.zoom * 100)}%</b><button data-spa="zin">＋</button><button data-spa="zfit">Adatta</button></span><span class="sp-stats" id="sp-stats">${statsHtml(h)}</span></div>
      <div class="sp-canvas" id="sp-canvas"><div class="sp-zw" id="sp-zw" style="width:${w * S.zoom}px;height:${ht * S.zoom}px"><div class="sp-room" id="sp-room" style="width:${w}px;height:${ht}px;transform:scale(${S.zoom})">${roomHtml(h)}</div></div></div></section></div>`;
  }
  function refresh() {
    const h = H(), root = document.getElementById('sp-root'); if (!h || !root) return;
    ensurePos(h); const [w, ht] = roomSize(h), room = root.querySelector('#sp-room');
    room.style.width = w + 'px'; room.style.height = ht + 'px'; room.style.transform = `scale(${S.zoom})`; room.innerHTML = roomHtml(h);
    const zw = root.querySelector('#sp-zw'); zw.style.width = w * S.zoom + 'px'; zw.style.height = ht * S.zoom + 'px'; const zl = root.querySelector('#sp-zl'); if (zl) zl.textContent = Math.round(S.zoom * 100) + '%';
    root.querySelector('#sp-items').innerHTML = listHtml(h); root.querySelector('#sp-tabs').innerHTML = tabsHtml(h); root.querySelector('#sp-stats').innerHTML = statsHtml(h);
  }
  const setZoom = z => { S.zoom = Math.max(.25, Math.min(1.6, Math.round(z * 100) / 100)); refresh(); };
  function fitZoom(h) { const cv = document.getElementById('sp-canvas'), [w, ht] = roomSize(h); return cv && cv.clientWidth > 50 ? Math.min((cv.clientWidth - 4) / w, 1.2) : S.zoom; }
  document.addEventListener('wheel', e => { if (!e.ctrlKey || !e.target.closest || !e.target.closest('#sp-canvas')) return; e.preventDefault(); setZoom(S.zoom + (e.deltaY < 0 ? .08 : -.08)); }, { passive: false });
  function autoFit() { const h = H(); if (!h || !S.auto || !document.getElementById('sp-canvas')) return; const z = Math.max(.5, Math.min(1, fitZoom(h))); if (Math.abs(z - S.zoom) > .01) setZoom(z); }
  window.addEventListener('resize', () => { if (S.auto) autoFit(); });
  const commit = h => { if (h.change) h.change(); refresh(); };

  /* ---- interazione ---- */
  document.addEventListener('input', e => { if (e.target.id === 'sp-q') { S.q = e.target.value; const h = H(); if (h) document.getElementById('sp-items').innerHTML = listHtml(h); } });
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-spa]'); const h = H(); if (!b || !h || !e.target.closest('#sp-root')) return;
    const t = h.tables.find(x => x.id === b.dataset.t), a = b.dataset.spa;
    if (a === 'tab') { S.tab = b.dataset.v; refresh(); return; }
    if (a === 'print') { window.print(); return; }
    if (a === 'det') { S.det = !S.det; if (ensurePos(h, true) && h.change) h.change(); refresh(); return; }
    if (a === 'zin' || a === 'zout' || a === 'zfit') { S.auto = a === 'zfit'; setZoom(a === 'zin' ? S.zoom + .1 : a === 'zout' ? S.zoom - .1 : fitZoom(h)); return; }
    if (h.ro || h.fixed) return;
    if (a === 'add') { addTable(h, b.dataset.f); commit(h); }
    else if (a === 'auto') { autoSeat(h); commit(h); }
    else if (a === 'reflow') { h.tables.forEach(t => { t.x = t.y = undefined; }); h.tables.slice().sort((x, y) => x.num - y.num).forEach(t => { Object.assign(t, findSpot(h.tables, size(t), t)); }); commit(h); }
    else if (a === 'plus' && t) { if (setSeats(h, t, t.seats.length + 1)) commit(h); else if (t.seats.length >= lim(t)[1]) msg(h, t.forma === 'rett' ? 'Massimo 24 posti' : 'Un tavolo tondo ospita al massimo 12 persone'); }
    else if (a === 'minus' && t) { if (t.seats.length <= lim(t)[0]) { msg(h, t.forma === 'rett' ? 'Almeno 1 posto' : 'Un tavolo tondo ha almeno 8 posti'); return; } if (setSeats(h, t, t.seats.length - 1)) commit(h); }
    else if (a === 'forma' && t) { if (setForma(h, t, t.forma === 'rett' ? 'tondo' : 'rett')) commit(h); }
    else if (a === 'name' && t) { const v = prompt('Nome del tavolo (vuoto = «Tavolo ' + t.num + '»):', t.nome || ''); if (v !== null) { t.nome = v.trim().slice(0, 40); commit(h); } }
    else if (a === 'del' && t) { if (confirm(`Eliminare «${label(t)}»? Gli invitati tornano «da assegnare».`)) { h.tables.splice(h.tables.indexOf(t), 1); S.selT = null; commit(h); } }
  });

  const down = e => {
    const h = H(), root = e.target.closest && e.target.closest('#sp-root'); if (!h || !root || e.button > 0) return;
    if (e.target.closest('input,select,textarea,button')) return;
    const seat = e.target.closest('.sp-seat[data-g]'), chip = e.target.closest('.sp-chip'), th = e.target.closest('[data-tdrag]') || (!e.target.closest('.sp-seat,.sp-tc') && e.target.closest('.sp-tbl') ? { dataset: { tdrag: e.target.closest('.sp-tbl').dataset.tbl } } : null), emptySeat = e.target.closest('.sp-seat');
    drag = { x0: e.clientX, y0: e.clientY, on: false, id: e.pointerId };
    if (seat && !h.ro) Object.assign(drag, { kind: 'guest', gid: seat.dataset.g, src: seat });
    else if (chip && !h.ro) Object.assign(drag, { kind: 'guest', gid: chip.dataset.g, src: chip });
    else if (th && !h.ro && !h.fixed) { const t = h.tables.find(x => x.id === th.dataset.tdrag); Object.assign(drag, { kind: 'table', t, tx: t.x, ty: t.y, el: root.querySelector(`[data-tbl="${t.id}"]`) }); S.selT !== t.id && (S.selT = t.id); }
    else drag.kind = emptySeat ? 'seatclick' : 'none';
    drag.emptySeat = emptySeat; drag.chip = chip; drag.seat = seat;
    document.addEventListener('pointermove', move); document.addEventListener('pointerup', up); document.addEventListener('pointercancel', cancel);
  };
  document.addEventListener('pointerdown', down);
  function move(e) {
    if (!drag) return; const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
    if (!drag.on && Math.hypot(dx, dy) < 6) return;
    if (!drag.on) {
      drag.on = true; document.body.classList.add('sp-dragging');
      if (drag.kind === 'guest') { const h = H(), g = h.guests.find(x => x.id === drag.gid); drag.ghost = document.createElement('div'); drag.ghost.className = 'sp-ghost'; drag.ghost.textContent = full(g); document.body.appendChild(drag.ghost); drag.src.classList.add('lifted'); }
      else if (drag.kind === 'table' && drag.el) drag.el.classList.add('dragging');
    }
    e.preventDefault();
    const cv = document.getElementById('sp-canvas');
    if (drag.kind === 'guest') {
      drag.ghost.style.left = e.clientX + 12 + 'px'; drag.ghost.style.top = e.clientY + 8 + 'px';
      document.querySelectorAll('.sp-seat.over,.sp-tbl.over').forEach(x => x.classList.remove('over'));
      const el = document.elementFromPoint(e.clientX, e.clientY), s = el && el.closest('.sp-seat'), tb = el && el.closest('.sp-tbl');
      (s || tb) && (s || tb).classList.add('over');
    } else if (drag.kind === 'table' && cv) {
      const r = cv.getBoundingClientRect(); if (e.clientX > r.right - 40) cv.scrollLeft += 18; else if (e.clientX < r.left + 40) cv.scrollLeft -= 18; if (e.clientY > r.bottom - 40) cv.scrollTop += 18; else if (e.clientY < r.top + 40) cv.scrollTop -= 18;
      drag.nx = Math.max(0, Math.round(drag.tx + dx / S.zoom)); drag.ny = Math.max(0, Math.round(drag.ty + dy / S.zoom)); drag.el.style.left = drag.nx + 'px'; drag.el.style.top = drag.ny + 'px';
    }
  }
  function finish() { document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up); document.removeEventListener('pointercancel', cancel); document.body.classList.remove('sp-dragging'); document.querySelectorAll('.sp-seat.over,.sp-tbl.over,.lifted').forEach(x => x.classList.remove('over', 'lifted')); if (drag && drag.ghost) drag.ghost.remove(); drag = null; }
  function cancel() { finish(); refresh(); }
  function up(e) {
    const d = drag, h = H(); if (!d || !h) { finish(); return; }
    const el = document.elementFromPoint(e.clientX, e.clientY); finish();
    if (d.on) {
      if (d.kind === 'table') { d.t.x = d.nx ?? d.t.x; d.t.y = d.ny ?? d.t.y; commit(h); return; }
      if (d.kind === 'guest') {
        const s = el && el.closest('.sp-seat'), tb = el && el.closest('.sp-tbl'), list = el && el.closest('.sp-list');
        if (s) place(h, d.gid, h.tables.find(x => x.id === s.dataset.t), +s.dataset.i);
        else if (tb) { const t = h.tables.find(x => x.id === tb.dataset.tbl), i = firstFree(t, h); if (i < 0) { msg(h, `Tavolo completo: massimo ${lim(t)[1]} posti`); refresh(); return; } place(h, d.gid, t, i); }
        else if (list) unseat(h, d.gid);
        else { refresh(); return; }
        S.sel = null; commit(h);
      }
      return;
    }
    /* semplice tocco/clic */
    if (d.kind === 'guest' && d.chip) { S.sel = S.sel === d.gid ? null : d.gid; refresh(); return; }
    if (d.kind === 'guest' && d.seat) {                       // tocco su posto occupato
      if (S.sel && S.sel !== d.gid) { place(h, S.sel, h.tables.find(x => x.id === d.seat.dataset.t), +d.seat.dataset.i); S.sel = null; commit(h); } else { S.sel = S.sel === d.gid ? null : d.gid; refresh(); }
      return;
    }
    if (d.kind === 'seatclick' && d.emptySeat) { if (S.sel && !h.ro) { place(h, S.sel, h.tables.find(x => x.id === d.emptySeat.dataset.t), +d.emptySeat.dataset.i); S.sel = null; commit(h); } return; }
    if (d.kind === 'table') { refresh(); return; }
    const th = e.target.closest && e.target.closest('[data-tbl]'); if (th) { S.selT = th.dataset.tbl; refresh(); } else if (e.target.closest && e.target.closest('#sp-canvas')) { S.selT = null; S.sel = null; refresh(); }
  }
  return { html, refresh, host: null, state: S };
})();
