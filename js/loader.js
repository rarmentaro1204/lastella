/* Avvio del gestionale. Online il codice dell'app non è un file pubblico: si scarica solo dopo il login (/api/bundle).
   In locale (file://) i file si caricano direttamente. */
(function () {
  const FILES = ['catalog', 'store', 'app', 'sync', 'seatplan', 'views-evento', 'views-menu', 'views-prova', 'views-econ', 'views-home', 'views-portale', 'views-servizio'].map(n => 'js/' + n + '.js');
  const API = (window.LASTELLA_CONFIG || {}).api, TK = 'lastella-token';
  const tok = () => { try { return localStorage.getItem(TK) || ''; } catch { return ''; } };
  const setTok = t => { try { t ? localStorage.setItem(TK, t) : localStorage.removeItem(TK); } catch {} };
  const main = () => document.getElementById('main'), shell = () => document.querySelector('.app');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let mode = 'login', msg = '', done = false;

  const loadSrc = src => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error(src)); document.head.appendChild(s); });
  function inject(code) { const s = document.createElement('script'); s.textContent = code; document.head.appendChild(s); }
  const head = '<div class="authbox"><div class="authlogo"><b>LA STELLA</b><i>NEW CONCEPT BANQUETING</i></div>';
  function show(html) { shell().classList.add('noside'); main().innerHTML = head + html + '</div>'; }
  function login() {
    const m = msg ? `<div class="alert bad" style="margin-bottom:14px">${esc(msg)}</div>` : '';
    show(`${m}<div class="tabs" style="margin:0 0 18px;justify-content:center"><a href="javascript:void 0" data-v="login" class="${mode === 'login' ? 'on' : ''}">Accedi</a><a href="javascript:void 0" data-v="signup" class="${mode === 'signup' ? 'on' : ''}">Registrati</a></div>
    <form id="authf" data-mode="${mode}"><div class="col" style="gap:14px"><div class="field"><label>Email</label><input type="email" name="email" required autocomplete="email"></div>
    <div class="field"><label>Password${mode === 'signup' ? ' (almeno 8 caratteri)' : ''}</label><input type="password" name="password" minlength="${mode === 'signup' ? 8 : 1}" required autocomplete="${mode === 'signup' ? 'new-password' : 'current-password'}"></div>
    <button class="btn" style="justify-content:center">${mode === 'login' ? 'Accedi' : 'Crea account'}</button></div></form>
    <p class="small muted" style="text-align:center;margin-top:16px">${mode === 'signup' ? 'Dopo la registrazione un amministratore deve approvare il tuo account.' : 'Password dimenticata? Chiedi a un amministratore di reimpostarla.'}</p>`);
  }
  function pending() {
    show(`<h3>Accesso in attesa</h3><p>L'account non è ancora stato approvato.</p><p class="muted">Chiedi a un amministratore di La Stella di approvarlo, poi premi «Ricontrolla».</p><div class="row" style="margin-top:16px"><button class="btn" data-go="retry">Ricontrolla</button><button class="btn alt" data-go="out">Esci</button></div>`);
  }
  async function fetchBundle() {
    const r = await fetch(API + '/bundle', { headers: { authorization: 'Bearer ' + tok() } });
    if (r.status === 401) return 'login'; if (r.status === 403) return 'pending';
    if (!r.ok) return 'error';
    inject(await r.text()); return 'ok';
  }
  async function start() {
    if (done) return;
    if (!API) { for (const f of FILES) await loadSrc(f); return finish(); }
    if (!tok()) return login();
    show('<p class="muted" style="text-align:center">Caricamento…</p>');
    let r; try { r = await fetchBundle(); } catch { r = 'error'; }
    if (r === 'login') { setTok(''); msg = 'Sessione scaduta: accedi di nuovo.'; return login(); }
    if (r === 'pending') return pending();
    if (r === 'error') { try { for (const f of FILES) await loadSrc(f); r = 'ok'; } catch { show('<h3>Servizio non raggiungibile</h3><p class="muted">Riprova tra qualche istante.</p><button class="btn" data-go="retry">Riprova</button>'); return; } }
    finish();
  }
  function finish() { done = true; document.removeEventListener('submit', onSubmit); document.removeEventListener('click', onClick); boot(); }
  async function onSubmit(e) {
    if (e.target.id !== 'authf') return; e.preventDefault();
    const fd = new FormData(e.target), body = { email: String(fd.get('email') || '').trim(), password: String(fd.get('password') || '') };
    try {
      const r = await fetch(API + '/' + e.target.dataset.mode, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }), j = await r.json().catch(() => ({}));
      if (!r.ok) { msg = j.error || 'Errore ' + r.status; return login(); }
      msg = ''; setTok(j.token); start();
    } catch (err) { msg = 'Impossibile contattare il server.'; login(); }
  }
  function onClick(e) {
    const a = e.target.closest('[data-v]'); if (a && a.closest('.tabs')) { mode = a.dataset.v; msg = ''; return login(); }
    const g = e.target.closest('[data-go]'); if (!g) return;
    if (g.dataset.go === 'out') { setTok(''); msg = ''; login(); } else start();
  }
  document.addEventListener('submit', onSubmit); document.addEventListener('click', onClick);
  start();
})();
