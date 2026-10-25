/* =====================================================================
   Cloud: autenticazione + sincronizzazione eventi su Supabase
   - un record per evento (jsonb) con revisione ottimistica
   - se due colleghi modificano lo stesso evento, i conflitti si risolvono
     per sezione (questionario, invitati, tavoli, menù…): vince chi ha toccato la sezione
   - aggiornamenti dei colleghi in tempo reale
   ===================================================================== */
const CFG = window.LASTELLA_CONFIG || {};
const CLOUD = !!(CFG.url && CFG.key && window.supabase);
const AUTH = { status: CLOUD ? 'loading' : 'local', user: null, admin: false, msg: '', mode: 'login', team: [], localOnly: [] };
const BASE = {}, REV = {};           // ultimo stato noto sul server (json string) e revisione, per evento
let SBASE = null, SREV = null, sb = null, pushTimer = null, pushing = false, again = false, pendingRender = false;
const ME = uid();
const meLabel = () => (AUTH.user ? AUTH.user.email : '') + '#' + ME;
const shortUser = u => (u || '').split('#')[0];

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
  sb = window.supabase.createClient(CFG.url, CFG.key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  sb.auth.onAuthStateChange((ev, sess) => {
    if (ev === 'PASSWORD_RECOVERY') { AUTH.status = 'recovery'; render(); }
    else if (ev === 'SIGNED_OUT' && AUTH.status !== 'signedout') { resetLocalCache(); AUTH.status = 'signedout'; AUTH.user = null; render(); }
  });
  const { data: { session } } = await sb.auth.getSession();
  if (AUTH.status === 'recovery') return;
  if (!session) { AUTH.status = 'signedout'; return; }
  await afterLogin(session.user);
}
async function afterLogin(user) {
  AUTH.user = user; AUTH.msg = '';
  try {
    let { data: ok, error } = await sb.rpc('lastella_is_member');
    if (error) throw error;
    if (!ok) { const { data: claimed } = await sb.rpc('lastella_claim_admin'); ok = !!claimed; }
    if (!ok) { AUTH.status = 'pending'; return; }
    AUTH.admin = !!(await sb.rpc('lastella_is_admin')).data;
    await cloudLoad(); subscribeRealtime();
    AUTH.status = 'ready'; setSync('ok');
  } catch (e) { AUTH.status = 'signedout'; AUTH.msg = 'Errore di connessione: ' + (e.message || e); }
}
function resetLocalCache() { try { localStorage.removeItem(KEY); } catch {} S.events = []; S.settings = defaultSettings(); for (const k in BASE) delete BASE[k]; for (const k in REV) delete REV[k]; if (sb) sb.removeAllChannels(); }

async function authSubmit(mode, email, password) {
  AUTH.msg = '';
  try {
    if (mode === 'login') {
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error; await afterLogin(data.user);
    } else if (mode === 'signup') {
      const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: location.origin + location.pathname } });
      if (error) throw error;
      if (data.session) await afterLogin(data.user);
      else AUTH.msg = 'ok:Registrazione inviata. Controlla la posta e clicca il link di conferma, poi accedi.';
    } else if (mode === 'reset') {
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
      if (error) throw error; AUTH.msg = 'ok:Se l\'indirizzo è registrato riceverai un\'email con il link per scegliere una nuova password.';
    } else if (mode === 'recovery') {
      const { error } = await sb.auth.updateUser({ password }); if (error) throw error;
      const { data: { user } } = await sb.auth.getUser(); await afterLogin(user);
    }
  } catch (e) {
    const m = e.message || String(e);
    AUTH.msg = /Invalid login/i.test(m) ? 'Email o password non corretti.' : /not confirmed/i.test(m) ? 'Email non ancora confermata: apri il link ricevuto per posta.' : /already registered/i.test(m) ? 'Indirizzo già registrato: usa «Accedi».' : /Password should/i.test(m) ? 'La password deve avere almeno 6 caratteri.' : m;
  }
  render();
}
async function signOut() { resetLocalCache(); AUTH.status = 'signedout'; AUTH.user = null; AUTH.admin = false; await sb.auth.signOut(); render(); }

/* ---------------------------------------------------------------- caricamento */
async function cloudLoad() {
  const [ev, st, tm] = await Promise.all([sb.from('lastella_events').select('*'), sb.from('lastella_settings').select('*').maybeSingle(), sb.from('lastella_members').select('*').order('added_at')]);
  if (ev.error) throw ev.error;
  const local = S.events.slice();                   // eventuali eventi creati prima del cloud (stesso browser)
  S.events = ev.data.map(r => { const h = hydrate(r.data); BASE[r.id] = JSON.stringify(h); REV[r.id] = r.rev; return h; });
  AUTH.localOnly = local.filter(e => !(e.id in REV));
  if (st.data) { S.settings = Object.assign(defaultSettings(), st.data.data); SBASE = JSON.stringify(S.settings); SREV = st.data.rev; }
  else { SBASE = null; SREV = null; }
  AUTH.team = tm.data || [];
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
  } catch (e) { setSync(navigator.onLine ? 'error' : 'offline', e.message); console.warn('sync', e); setTimeout(cloudPush, 8000); }
  finally { pushing = false; if (again) { again = false; doPush(); } }
}
const topMerge = (base, local, remote) => { const out = {}; for (const k of new Set([...Object.keys(remote), ...Object.keys(local)])) out[k] = JSON.stringify(local[k]) !== JSON.stringify(base[k]) ? local[k] : remote[k]; return out; };
async function pushEvent(id, tries = 0) {
  const E = S.events.find(e => e.id === id); if (!E) return;
  const js = JSON.stringify(E);
  if (REV[id] === undefined) {
    const { error } = await sb.from('lastella_events').insert({ id, data: E, rev: 1, updated_by: meLabel() });
    if (!error) { REV[id] = 1; BASE[id] = js; return; }
    if (error.code !== '23505') throw error;
    const { data: row } = await sb.from('lastella_events').select('*').eq('id', id).maybeSingle(); if (!row) throw error;
    REV[id] = row.rev; BASE[id] = '{}';                       // già esiste: proseguiamo come aggiornamento con merge
    return pushEvent(id, tries + 1);
  }
  const { data, error } = await sb.from('lastella_events').update({ data: E, rev: REV[id] + 1, updated_at: new Date().toISOString(), updated_by: meLabel() }).eq('id', id).eq('rev', REV[id]).select('rev');
  if (error) throw error;
  if (data.length) { REV[id] = data[0].rev; BASE[id] = js; return; }
  // conflitto: un collega ha salvato nel frattempo
  const { data: row, error: e2 } = await sb.from('lastella_events').select('*').eq('id', id).maybeSingle();
  if (e2) throw e2;
  if (!row) { S.events = S.events.filter(e => e.id !== id); delete REV[id]; delete BASE[id]; toast('L\'evento è stato eliminato da un collega'); scheduleRender(); return; }
  if (tries > 4) throw new Error('Conflitto non risolvibile, riprova');
  const remote = hydrate(row.data), merged = hydrate(topMerge(JSON.parse(BASE[id] || '{}'), E, remote));
  S.events[S.events.findIndex(e => e.id === id)] = merged;
  REV[id] = row.rev; BASE[id] = JSON.stringify(remote);
  toast(`Modifiche unite a quelle di ${shortUser(row.updated_by) || 'un collega'}`); scheduleRender();
  return pushEvent(id, tries + 1);
}
async function pushSettings(tries = 0) {
  const js = JSON.stringify(S.settings);
  if (SREV === null) {
    const { error } = await sb.from('lastella_settings').insert({ id: 1, data: S.settings, rev: 1, updated_by: meLabel() });
    if (!error) { SREV = 1; SBASE = js; return; }
    const { data: row } = await sb.from('lastella_settings').select('*').eq('id', 1).maybeSingle(); if (!row) throw error;
    SREV = row.rev; SBASE = '{}'; return pushSettings(tries + 1);
  }
  const { data, error } = await sb.from('lastella_settings').update({ data: S.settings, rev: SREV + 1, updated_at: new Date().toISOString(), updated_by: meLabel() }).eq('id', 1).eq('rev', SREV).select('rev');
  if (error) throw error;
  if (data.length) { SREV = data[0].rev; SBASE = js; return; }
  const { data: row } = await sb.from('lastella_settings').select('*').eq('id', 1).maybeSingle();
  if (tries > 4 || !row) throw new Error('Conflitto impostazioni');
  S.settings = Object.assign(defaultSettings(), topMerge(JSON.parse(SBASE || '{}'), S.settings, row.data)); SREV = row.rev; SBASE = JSON.stringify(row.data);
  return pushSettings(tries + 1);
}
async function cloudDelete(id) {
  const { data, error } = await sb.from('lastella_events').delete().eq('id', id).select('id');
  if (error || !data.length) { toast('Solo un amministratore può eliminare gli eventi'); return false; }
  delete REV[id]; delete BASE[id]; return true;
}
async function uploadLocalOnly() {
  S.events.push(...AUTH.localOnly); AUTH.localOnly = []; save(); await doPush(); render(); toast('Eventi caricati nel cloud');
}

/* ---------------------------------------------------------------- realtime */
function subscribeRealtime() {
  sb.channel('lastella-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'lastella_events' }, p => {
      if (p.eventType === 'DELETE') {
        const id = p.old.id; if (!S.events.some(e => e.id === id)) return;
        S.events = S.events.filter(e => e.id !== id); delete REV[id]; delete BASE[id];
        if (ROUTE.view === 'event' && ROUTE.id === id) { toast('Evento eliminato da un collega'); location.hash = '#/home'; } scheduleRender(); return;
      }
      const row = p.new; if (row.rev <= (REV[row.id] ?? 0)) return;
      applyRemote(row);
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'lastella_settings' }, p => {
      const row = p.new; if (!row || row.rev <= (SREV ?? 0)) return;
      const dirty = SBASE !== null && JSON.stringify(S.settings) !== SBASE;
      S.settings = Object.assign(defaultSettings(), dirty ? topMerge(JSON.parse(SBASE), S.settings, row.data) : row.data); SREV = row.rev; SBASE = JSON.stringify(row.data); if (dirty) cloudPush(); scheduleRender();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'lastella_members' }, async () => { const { data } = await sb.from('lastella_members').select('*').order('added_at'); AUTH.team = data || []; if (ROUTE.view === 'settings') scheduleRender(); })
    .subscribe(st => { if (st === 'SUBSCRIBED') setSync('ok'); else if (st === 'CHANNEL_ERROR' || st === 'TIMED_OUT') setSync('error', 'Connessione in tempo reale interrotta'); });
  window.addEventListener('online', () => { cloudLoadMerge(); });
}
async function cloudLoadMerge() { try { const { data } = await sb.from('lastella_events').select('*'); (data || []).forEach(r => { if (r.rev > (REV[r.id] ?? 0)) applyRemote(r, true); }); cloudPush(); } catch {} }
function applyRemote(row, silent) {
  const remote = hydrate(row.data), idx = S.events.findIndex(e => e.id === row.id), local = S.events[idx];
  let next = remote;
  if (local && BASE[row.id] !== undefined && JSON.stringify(local) !== BASE[row.id]) next = hydrate(topMerge(JSON.parse(BASE[row.id]), local, remote));
  if (idx >= 0) S.events[idx] = next; else S.events.unshift(next);
  REV[row.id] = row.rev; BASE[row.id] = JSON.stringify(remote);
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {}
  if (next !== remote) cloudPush();
  if (!silent && shortUser(row.updated_by) && row.updated_by !== meLabel()) { const evName_ = [remote.q.sposo1, remote.q.sposo2].filter(Boolean).join(' & ') || 'un evento'; toast(`${shortUser(row.updated_by)} ha aggiornato «${evName_}»`); }
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
  if (st === 'pending') return head + `<h3>Accesso in attesa</h3><p>Hai effettuato l'accesso come <b>${esc(AUTH.user.email)}</b>, ma questo indirizzo non è ancora abilitato.</p><p class="muted">Chiedi a un amministratore di La Stella di aggiungerlo dalla sezione <i>Impostazioni → Team</i>, poi premi «Ricontrolla».</p>
    <div class="row" style="margin-top:16px"><button class="btn" data-act="auth-recheck">Ricontrolla</button><button class="btn alt" data-act="signout">Esci</button></div></div>`;
  if (st === 'recovery') return head + `<h3>Nuova password</h3>${msg}<form id="authf" data-mode="recovery"><div class="field"><label>Scegli la nuova password</label><input type="password" name="password" minlength="6" required autocomplete="new-password"></div><div class="acts"><button class="btn">Salva e accedi</button></div></form></div>`;
  const mode = AUTH.mode;
  return head + `<div class="tabs" style="margin:0 0 18px;justify-content:center"><a href="javascript:void 0" data-act="auth-mode" data-v="login" class="${mode === 'login' ? 'on' : ''}">Accedi</a><a href="javascript:void 0" data-act="auth-mode" data-v="signup" class="${mode === 'signup' ? 'on' : ''}">Registrati</a></div>${msg}
    <form id="authf" data-mode="${mode}"><div class="col" style="gap:14px"><div class="field"><label>Email</label><input type="email" name="email" required autocomplete="email"></div>
    ${mode === 'reset' ? '' : `<div class="field"><label>Password</label><input type="password" name="password" minlength="6" required autocomplete="${mode === 'signup' ? 'new-password' : 'current-password'}"></div>`}
    <button class="btn" style="justify-content:center">${mode === 'login' ? 'Accedi' : mode === 'signup' ? 'Crea account' : 'Invia link'}</button></div></form>
    <p class="small muted" style="text-align:center;margin-top:16px">${mode === 'reset' ? '<a href="javascript:void 0" data-act="auth-mode" data-v="login">Torna all\'accesso</a>' : '<a href="javascript:void 0" data-act="auth-mode" data-v="reset">Password dimenticata?</a>'}</p>
    <p class="small muted" style="text-align:center">Dopo la registrazione un amministratore deve abilitare il tuo indirizzo. Il primo utente registrato diventa amministratore.</p></div>`;
}
document.addEventListener('submit', e => {
  if (e.target.id !== 'authf') return; e.preventDefault();
  const fd = new FormData(e.target); authSubmit(e.target.dataset.mode, (fd.get('email') || '').toString().trim(), (fd.get('password') || '').toString());
});
ACTIONS['auth-mode'] = el => { AUTH.mode = el.dataset.v; AUTH.msg = ''; render(); };
ACTIONS.signout = () => signOut();
ACTIONS['auth-recheck'] = async () => { await afterLogin(AUTH.user); render(); };

function teamCard() {
  if (!CLOUD) return `<div class="card"><h3>Team</h3><p class="muted">Modalità locale: i dati restano su questo browser. Configura Supabase in <code>js/config.js</code> per lavorare in più persone sugli stessi eventi.</p></div>`;
  const rows = AUTH.team.map(m => `<tr><td>${esc(m.email)}${m.email === (AUTH.user.email || '').toLowerCase() ? ' <span class="pill">tu</span>' : ''}</td><td>${m.role === 'admin' ? 'Amministratore' : 'Operatore'}</td><td class="num">${AUTH.admin && m.email !== (AUTH.user.email || '').toLowerCase() ? `<button class="btn ghost sm" data-act="team-del" data-e="${esc(m.email)}">Rimuovi</button>` : ''}</td></tr>`).join('');
  return `<div class="card"><h3>Team</h3><p class="muted">Accesso come <b>${esc(AUTH.user.email)}</b> (${AUTH.admin ? 'amministratore' : 'operatore'}). Tutti gli abilitati vedono e modificano gli stessi eventi, con aggiornamenti in tempo reale.</p>
    <table class="tb"><thead><tr><th>Email</th><th>Ruolo</th><th></th></tr></thead><tbody>${rows}</tbody></table>
    ${AUTH.admin ? `<form id="teamf" class="row" style="margin-top:14px"><input type="email" name="email" placeholder="email del collega (deve registrarsi con questo indirizzo)" required style="max-width:380px"><select name="role" style="width:auto"><option value="staff">Operatore</option><option value="admin">Amministratore</option></select><button class="btn">＋ Abilita</button></form><p class="hint">Gli operatori possono creare e modificare eventi; solo gli amministratori eliminano eventi e gestiscono il team.</p>` : '<p class="hint">Solo gli amministratori possono abilitare nuovi colleghi.</p>'}
    <div class="row" style="margin-top:12px"><button class="btn alt" data-act="signout">Esci dall'account</button></div></div>`;
}
document.addEventListener('submit', async e => {
  if (e.target.id !== 'teamf') return; e.preventDefault();
  const fd = new FormData(e.target), email = fd.get('email').toString().trim().toLowerCase();
  const { error } = await sb.from('lastella_members').insert({ email, role: fd.get('role'), added_by: AUTH.user.email });
  if (error) { toast(error.code === '23505' ? 'Indirizzo già abilitato' : 'Errore: ' + error.message); return; }
  const { data } = await sb.from('lastella_members').select('*').order('added_at'); AUTH.team = data || []; toast(email + ' abilitato'); rr();
});
ACTIONS['team-del'] = async el => {
  if (!confirm('Rimuovere ' + el.dataset.e + ' dal team?')) return;
  const { error } = await sb.from('lastella_members').delete().eq('email', el.dataset.e); if (error) { toast('Errore: ' + error.message); return; }
  const { data } = await sb.from('lastella_members').select('*').order('added_at'); AUTH.team = data || []; rr();
};
