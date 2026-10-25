/* =====================================================================
   Cloud: autenticazione + sincronizzazione eventi con la funzione Netlify /api
   - un record per evento con revisione ottimistica
   - se due colleghi modificano lo stesso evento, i conflitti si risolvono
     per sezione (questionario, invitati, tavoli, menù…): vince chi ha toccato la sezione
   - aggiornamenti dei colleghi ogni pochi secondi (polling dell'indice)
   ===================================================================== */
const CFG = window.LASTELLA_CONFIG || {};
const CLOUD = !!CFG.api;
const AUTH = { status: CLOUD ? 'loading' : 'local', user: null, admin: false, msg: '', mode: 'login', team: [], localOnly: [], sync: { state: 'ok' } };
const BASE = {}, REV = {};           // ultimo stato noto sul server (json string) e revisione, per evento
const TOKEN_KEY = 'lastella-token', POLL_MS = 5000;
let SBASE = null, SREV = 0, pushTimer = null, pushing = false, again = false, pendingRender = false, pollTimer = null;
const ME = uid();
const meLabel = () => (AUTH.user ? AUTH.user.email : '');
const shortUser = u => (u || '').split('@')[0];
const getToken = () => { try { return localStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; } };
const setToken = t => { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch {} };

async function http(method, path, body) {
  const r = await fetch(CFG.api + '/' + path, { method, headers: { 'content-type': 'application/json', ...(getToken() ? { authorization: 'Bearer ' + getToken() } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  let j = {}; try { j = await r.json(); } catch {}
  return { status: r.status, ok: r.ok, body: j };
}

function setSync(state, msg) {
  AUTH.sync = { state, msg };
  const el = $('#sync-ind'); if (el) el.innerHTML = syncHtml();
}
function syncHtml() {
  const s = AUTH.sync || { state: 'ok' };
  if (!CLOUD) return '<span title="Dati salvati solo in questo browser">💾 Solo locale</span>';
  if (s.state === 'saving') return '<span>⟳ Salvataggio…</span>';
  if (s.state === 'error') return `<span style="color:#f0a090" title="${esc(s.msg || '')}">⚠ Non sincronizzato</span>`;
  if (s.state === 'offline') return '<span style="color:#f0c890">⚠ Offline</span>';
  return '<span>☁ Sincronizzato</span>';
}

/* ---------------------------------------------------------------- init & login */
async function cloudInit() {
  if (!CLOUD) return;
  if (!getToken()) { AUTH.status = 'signedout'; return; }
  try {
    const r = await http('GET', 'me');
    if (r.status === 401) { setToken(''); AUTH.status = 'signedout'; return; }
    if (!r.ok) throw new Error(r.body.error || 'Errore ' + r.status);
    await afterLogin(r.body.user);
  } catch (e) { AUTH.status = 'signedout'; AUTH.msg = 'Impossibile contattare il server: ' + (e.message || e); }
}
async function afterLogin(user) {
  AUTH.user = user; AUTH.admin = user.role === 'admin'; AUTH.msg = '';
  if (!user.approved) { AUTH.status = 'pending'; return; }
  try { await cloudLoad(); startPolling(); AUTH.status = 'ready'; setSync('ok'); }
  catch (e) {
    if (e.pending) { AUTH.status = 'pending'; return; }
    AUTH.status = 'signedout'; AUTH.msg = 'Errore di connessione: ' + (e.message || e);
  }
}
function resetLocalCache() { try { localStorage.removeItem(KEY); } catch {} S.events = []; S.settings = defaultSettings(); for (const k in BASE) delete BASE[k]; for (const k in REV) delete REV[k]; SBASE = null; SREV = 0; clearInterval(pollTimer); }

async function authSubmit(mode, email, password) {
  AUTH.msg = '';
  try {
    if (mode === 'login' || mode === 'signup') {
      const r = await http('POST', mode, { email, password });
      if (!r.ok) throw new Error(r.body.error || 'Errore ' + r.status);
      setToken(r.body.token); await afterLogin(r.body.user);
    }
  } catch (e) { AUTH.msg = e.message || String(e); }
  render();
}
async function signOut() { resetLocalCache(); setToken(''); AUTH.status = 'signedout'; AUTH.user = null; AUTH.admin = false; render(); }

/* ---------------------------------------------------------------- caricamento */
async function cloudLoad() {
  const [st, tm] = await Promise.all([http('GET', 'state'), http('GET', 'team')]);
  if (st.status === 403 && st.body.pending) { const e = new Error('pending'); e.pending = true; throw e; }
  if (st.status === 401) { setToken(''); throw new Error('Sessione scaduta'); }
  if (!st.ok) throw new Error(st.body.error || 'Errore ' + st.status);
  const local = S.events.slice();                   // eventuali eventi creati prima del cloud (stesso browser)
  S.events = st.body.events.map(r => { const h = hydrate(r.data); BASE[r.id] = JSON.stringify(h); REV[r.id] = r.rev; return h; });
  AUTH.localOnly = local.filter(e => !(e.id in REV));
  if (st.body.settings && st.body.settings.data) { S.settings = Object.assign(defaultSettings(), st.body.settings.data); SBASE = JSON.stringify(S.settings); SREV = st.body.settings.rev; }
  else { SBASE = null; SREV = 0; }
  AUTH.team = tm.ok ? tm.body.team : [];
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {}
}

/* ---------------------------------------------------------------- push */
function cloudPush() {
  if (!CLOUD || AUTH.status !== 'ready') return;
  clearTimeout(pushTimer); pushTimer = setTimeout(doPush, 700);
}
async function doPush() {
  if (pushing) { again = true; return; }
  pushing = true; let touched = false;
  try {
    for (const E of S.events.slice()) { const js = JSON.stringify(E); if (BASE[E.id] === js) continue; if (!touched) setSync('saving'); touched = true; await pushEvent(E.id); }
    const sj = JSON.stringify(S.settings);
    if (SBASE !== sj) { if (!touched) setSync('saving'); touched = true; await pushSettings(); }
    setSync('ok');
  } catch (e) {
    if (e.auth) { setToken(''); AUTH.status = 'signedout'; AUTH.msg = 'Sessione scaduta: accedi di nuovo.'; render(); }
    else { setSync(navigator.onLine ? 'error' : 'offline', e.message); console.warn('sync', e); setTimeout(cloudPush, 8000); }
  } finally { pushing = false; if (again) { again = false; doPush(); } }
}
const topMerge = (base, local, remote) => { const out = {}; for (const k of new Set([...Object.keys(remote), ...Object.keys(local)])) out[k] = JSON.stringify(local[k]) !== JSON.stringify(base[k]) ? local[k] : remote[k]; return out; };
function check(r) { if (r.status === 401) { const e = new Error('Sessione scaduta'); e.auth = true; throw e; } if (!r.ok && r.status !== 409 && r.status !== 404) throw new Error(r.body.error || 'Errore ' + r.status); return r; }
async function pushEvent(id, tries = 0) {
  const E = S.events.find(e => e.id === id); if (!E) return;
  const js = JSON.stringify(E);
  const r = check(await http('PUT', 'event/' + id, { rev: REV[id] || 0, data: E }));
  if (r.ok) { REV[id] = r.body.rev; BASE[id] = js; return; }
  if (r.status === 404 && r.body.deleted) { S.events = S.events.filter(e => e.id !== id); delete REV[id]; delete BASE[id]; toast('L\'evento è stato eliminato da un collega'); scheduleRender(); return; }
  // conflitto: un collega ha salvato nel frattempo
  if (tries > 4 || !r.body.current) throw new Error('Conflitto non risolvibile, riprova');
  const row = r.body.current, remote = hydrate(row.data), merged = hydrate(topMerge(JSON.parse(BASE[id] || '{}'), E, remote));
  S.events[S.events.findIndex(e => e.id === id)] = merged;
  REV[id] = row.rev; BASE[id] = JSON.stringify(remote);
  toast(`Modifiche unite a quelle di ${shortUser(row.by) || 'un collega'}`); scheduleRender();
  return pushEvent(id, tries + 1);
}
async function pushSettings(tries = 0) {
  const js = JSON.stringify(S.settings);
  const r = check(await http('PUT', 'settings', { rev: SREV, data: S.settings }));
  if (r.ok) { SREV = r.body.rev; SBASE = js; return; }
  if (tries > 4 || !r.body.current) throw new Error('Conflitto impostazioni');
  const cur = r.body.current;
  S.settings = Object.assign(defaultSettings(), cur.data ? topMerge(JSON.parse(SBASE || '{}'), S.settings, cur.data) : S.settings); SREV = cur.rev; SBASE = JSON.stringify(cur.data || {});
  return pushSettings(tries + 1);
}
async function cloudDelete(id) {
  const r = await http('DELETE', 'event/' + id);
  if (!r.ok) { toast(r.body.error || 'Eliminazione non riuscita'); return false; }
  delete REV[id]; delete BASE[id]; return true;
}
async function uploadLocalOnly() {
  S.events.push(...AUTH.localOnly); AUTH.localOnly = []; save(); await doPush(); render(); toast('Eventi caricati nel cloud');
}

/* ---------------------------------------------------------------- aggiornamenti dei colleghi (polling) */
function startPolling() {
  clearInterval(pollTimer);
  pollTimer = setInterval(() => { if (document.visibilityState === 'visible' && AUTH.status === 'ready') poll(); }, POLL_MS);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && AUTH.status === 'ready') poll(); });
  window.addEventListener('online', () => { poll(); cloudPush(); });
}
let polling = false;
async function poll() {
  if (polling || pushing) return; polling = true;
  try {
    const r = await http('GET', 'index'); if (r.status === 401) { setToken(''); AUTH.status = 'signedout'; AUTH.msg = 'Sessione scaduta: accedi di nuovo.'; render(); return; }
    if (!r.ok) throw new Error(r.body.error || 'Errore ' + r.status);
    const idx = r.body;
    // eliminati
    for (const e of S.events.slice()) if (REV[e.id] !== undefined && !(e.id in idx.events)) {
      S.events = S.events.filter(x => x.id !== e.id); delete REV[e.id]; delete BASE[e.id];
      if (ROUTE.view === 'event' && ROUTE.id === e.id) { toast('Evento eliminato da un collega'); location.hash = '#/home'; } scheduleRender();
    }
    // nuovi / modificati
    for (const [id, m] of Object.entries(idx.events)) if (m.rev > (REV[id] ?? 0)) { const g = await http('GET', 'event/' + id); if (g.ok) applyRemote({ id, rev: g.body.rev, data: g.body.data, updated_by: g.body.by }); }
    // impostazioni
    if (idx.settings && idx.settings.rev > SREV) {
      const g = await http('GET', 'settings');
      if (g.ok && g.body.data) { const dirty = SBASE !== null && JSON.stringify(S.settings) !== SBASE; S.settings = Object.assign(defaultSettings(), dirty ? topMerge(JSON.parse(SBASE), S.settings, g.body.data) : g.body.data); SREV = g.body.rev; SBASE = JSON.stringify(g.body.data); if (dirty) cloudPush(); scheduleRender(); }
    }
    if (ROUTE.view === 'settings') syncTeam();
    if (AUTH.sync.state === 'offline' || AUTH.sync.state === 'error') setSync('ok');
  } catch (e) { setSync(navigator.onLine ? 'error' : 'offline', e.message); }
  finally { polling = false; }
}
function applyRemote(row) {
  const remote = hydrate(row.data), idx = S.events.findIndex(e => e.id === row.id), local = S.events[idx];
  let next = remote;
  if (local && BASE[row.id] !== undefined && JSON.stringify(local) !== BASE[row.id]) next = hydrate(topMerge(JSON.parse(BASE[row.id]), local, remote));
  if (idx >= 0) S.events[idx] = next; else S.events.unshift(next);
  REV[row.id] = row.rev; BASE[row.id] = JSON.stringify(remote);
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {}
  if (next !== remote) cloudPush();
  if (row.updated_by && row.updated_by !== meLabel()) { const nm = [remote.q.sposo1, remote.q.sposo2].filter(Boolean).join(' & ') || 'un evento'; toast(`${shortUser(row.updated_by)} ha aggiornato «${nm}»`); }
  scheduleRender();
}
/* ridisegna solo se l'utente non sta scrivendo */
function scheduleRender() {
  const a = document.activeElement, typing = a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a.closest('#main, #modal-root');
  if (typing || $('#modal-root').firstChild) { pendingRender = true; return; }
  rr();
}
document.addEventListener('focusout', () => { if (pendingRender) setTimeout(() => { const a = document.activeElement; if (!(a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) && !$('#modal-root').firstChild) { pendingRender = false; rr(); } }, 200); });

/* ---------------------------------------------------------------- viste: login, team */
function viewAuth() {
  const st = AUTH.status, m = AUTH.msg || '', ok = m.startsWith('ok:'), txt = m.replace(/^ok:/, '');
  const msg = txt ? `<div class="alert ${ok ? 'ok' : 'bad'}" style="margin-bottom:14px">${esc(txt)}</div>` : '';
  const head = '<div class="authbox"><div class="authlogo"><b>LA STELLA</b><i>NEW CONCEPT BANQUETING</i></div>';
  if (st === 'loading') return head + '<p class="muted" style="text-align:center">Connessione in corso…</p></div>';
  if (st === 'pending') return head + `<h3>Accesso in attesa</h3><p>Hai effettuato l'accesso come <b>${esc(AUTH.user.email)}</b>, ma l'account non è ancora stato approvato.</p><p class="muted">Chiedi a un amministratore di La Stella di approvarlo da <i>Impostazioni → Team</i>, poi premi «Ricontrolla».</p>
    <div class="row" style="margin-top:16px"><button class="btn" data-act="auth-recheck">Ricontrolla</button><button class="btn alt" data-act="signout">Esci</button></div></div>`;
  const mode = AUTH.mode;
  return head + `<div class="tabs" style="margin:0 0 18px;justify-content:center"><a href="javascript:void 0" data-act="auth-mode" data-v="login" class="${mode === 'login' ? 'on' : ''}">Accedi</a><a href="javascript:void 0" data-act="auth-mode" data-v="signup" class="${mode === 'signup' ? 'on' : ''}">Registrati</a></div>${msg}
    <form id="authf" data-mode="${mode}"><div class="col" style="gap:14px"><div class="field"><label>Email</label><input type="email" name="email" required autocomplete="email"></div>
    <div class="field"><label>Password${mode === 'signup' ? ' (almeno 8 caratteri)' : ''}</label><input type="password" name="password" minlength="${mode === 'signup' ? 8 : 1}" required autocomplete="${mode === 'signup' ? 'new-password' : 'current-password'}"></div>
    <button class="btn" style="justify-content:center">${mode === 'login' ? 'Accedi' : 'Crea account'}</button></div></form>
    <p class="small muted" style="text-align:center;margin-top:16px">${mode === 'signup' ? 'Dopo la registrazione un amministratore deve approvare il tuo account. Il primo utente registrato diventa amministratore.' : 'Password dimenticata? Chiedi a un amministratore di reimpostarla da Impostazioni → Team.'}</p></div>`;
}
document.addEventListener('submit', e => {
  if (e.target.id !== 'authf') return; e.preventDefault();
  const fd = new FormData(e.target); authSubmit(e.target.dataset.mode, (fd.get('email') || '').toString().trim(), (fd.get('password') || '').toString());
});
ACTIONS['auth-mode'] = el => { AUTH.mode = el.dataset.v; AUTH.msg = ''; render(); };
ACTIONS.signout = () => signOut();
ACTIONS['auth-recheck'] = async () => { const r = await http('GET', 'me'); if (r.ok) await afterLogin(r.body.user); else if (r.status === 401) { setToken(''); AUTH.status = 'signedout'; } render(); };

let teamBusy = false;
async function syncTeam() { if (teamBusy || AUTH.status !== 'ready') return; teamBusy = true; const before = JSON.stringify(AUTH.team); try { await refreshTeam(); if (JSON.stringify(AUTH.team) !== before && ROUTE.view === 'settings') scheduleRender(); } finally { teamBusy = false; } }
async function refreshTeam() { const r = await http('GET', 'team'); if (r.ok) AUTH.team = r.body.team; }
function teamCard() {
  if (!CLOUD) return `<div class="card"><h3>Team</h3><p class="muted">Modalità locale: i dati restano su questo browser. Pubblicato su Netlify, il gestionale permette di lavorare in più persone sugli stessi eventi.</p></div>`;
  const rows = AUTH.team.map(m => { const you = m.email === AUTH.user.email; return `<tr><td>${esc(m.email)}${you ? ' <span class="pill">tu</span>' : ''}</td>
    <td>${m.approved ? (m.role === 'admin' ? 'Amministratore' : 'Operatore') : '<span class="pill warn">in attesa di approvazione</span>'}</td>
    <td class="num">${AUTH.admin && !you ? `${!m.approved ? `<button class="btn sm" data-act="team-act" data-a="approve" data-e="${esc(m.email)}">Approva</button> ` : `<button class="btn sm alt" data-act="team-act" data-a="role" data-e="${esc(m.email)}" data-r="${m.role === 'admin' ? 'staff' : 'admin'}">${m.role === 'admin' ? 'Rendi operatore' : 'Rendi admin'}</button> `}<button class="btn sm alt" data-act="team-reset" data-e="${esc(m.email)}">Nuova password</button> <button class="btn ghost sm" data-act="team-act" data-a="remove" data-e="${esc(m.email)}">Rimuovi</button>` : ''}</td></tr>`; }).join('');
  return `<div class="card"><h3>Team</h3><p class="muted">Accesso come <b>${esc(AUTH.user.email)}</b> (${AUTH.admin ? 'amministratore' : 'operatore'}). Tutti gli approvati vedono e modificano gli stessi eventi; gli aggiornamenti dei colleghi arrivano in pochi secondi.</p>
    <table class="tb"><thead><tr><th>Email</th><th>Stato</th><th></th></tr></thead><tbody>${rows}</tbody></table>
    ${AUTH.admin ? `<h4 style="margin:18px 0 8px">Aggiungi un collega</h4><form id="teamf" class="row"><input type="email" name="email" placeholder="email" required style="max-width:260px"><input type="text" name="password" placeholder="password provvisoria (min. 8)" minlength="8" required style="max-width:260px"><select name="role" style="width:auto"><option value="staff">Operatore</option><option value="admin">Amministratore</option></select><button class="btn">＋ Crea account</button></form><p class="hint">Comunica la password provvisoria al collega: potrà cambiarla da qui sotto. In alternativa può registrarsi da solo e tu lo approvi dalla lista.</p>` : '<p class="hint">Solo gli amministratori possono approvare colleghi e gestire il team.</p>'}
    <div class="row" style="margin-top:14px"><button class="btn alt" data-act="pw-change">Cambia la mia password</button><button class="btn alt" data-act="signout">Esci dall'account</button></div></div>`;
}
document.addEventListener('submit', async e => {
  if (e.target.id !== 'teamf') return; e.preventDefault();
  const fd = new FormData(e.target);
  const r = await http('POST', 'team/add', { email: fd.get('email'), password: fd.get('password'), role: fd.get('role') });
  if (!r.ok) { toast(r.body.error || 'Errore'); return; }
  await refreshTeam(); toast('Account creato: comunica la password al collega'); rr();
});
ACTIONS['team-act'] = async el => {
  if (el.dataset.a === 'remove' && !confirm('Rimuovere ' + el.dataset.e + ' dal team?')) return;
  const r = await http('POST', 'team/' + el.dataset.a, { email: el.dataset.e, role: el.dataset.r }); if (!r.ok) { toast(r.body.error || 'Errore'); return; }
  await refreshTeam(); rr();
};
ACTIONS['team-reset'] = async el => {
  const pw = prompt('Nuova password provvisoria per ' + el.dataset.e + ' (min. 8 caratteri):'); if (!pw) return;
  const r = await http('POST', 'team/reset', { email: el.dataset.e, password: pw }); toast(r.ok ? 'Password reimpostata' : (r.body.error || 'Errore'));
};
ACTIONS['pw-change'] = async () => {
  const old = prompt('Password attuale:'); if (!old) return; const next = prompt('Nuova password (min. 8 caratteri):'); if (!next) return;
  const r = await http('POST', 'password', { old, next }); toast(r.ok ? 'Password cambiata' : (r.body.error || 'Errore'));
};
