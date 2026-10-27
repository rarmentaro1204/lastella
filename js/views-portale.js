/* =====================================================================
   Accesso cliente (staff): genera/revoca il link del portale e mostra le modifiche fatte dal cliente
   ===================================================================== */
const SEEN_KEY = 'lastella-portal-seen';
const seenMap = () => { try { return JSON.parse(localStorage.getItem(SEEN_KEY) || '{}'); } catch { return {}; } };
const portalNew = E => !!(E.portale && E.portale.ultimaModifica && (seenMap()[E.id] || '') < E.portale.ultimaModifica);
const portalUrl = E => location.origin + '/portale.html#' + E.portale.token;
const dtIt = iso => new Date(iso).toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

HOOKS.noop = () => {};
VIEWS.portale = E => {
  const P = E.portale || {}, on = !!P.token;
  if (P.ultimaModifica) { const m = seenMap(); m[E.id] = P.ultimaModifica; try { localStorage.setItem(SEEN_KEY, JSON.stringify(m)); } catch {} }
  const mail = on ? `mailto:${encodeURIComponent(E.q.email || '')}?subject=${encodeURIComponent('La Stella · scegliete menù e allestimenti del vostro evento')}&body=${encodeURIComponent(`Buongiorno ${E.q.sposo1 || ''},\n\ncon questo link riservato potete scegliere menù e allestimenti, inserire gli invitati e segnalare allergie o richieste speciali:\n\n${portalUrl(E)}\n\nLe scelte si salvano con il pulsante in fondo alla pagina e sono modificabili fino alle scadenze indicate.\n\nA presto,\nLa Stella Catering`)}` : '';
  return `<div class="secthead"><div><h2>Accesso cliente</h2><p>Un link privato per far scegliere ai committenti menù, allestimenti, invitati e allergie direttamente dal loro telefono. Le loro scelte arrivano qui in tempo reale; prezzi, contatti e dati economici non sono visibili al cliente.</p></div></div>
  ${CLOUD ? '' : '<div class="alert">Il portale funziona solo con il gestionale pubblicato online (modalità cloud).</div>'}
  <div class="card">${on ? `<div class="row"><span class="pill ok">Link attivo</span><span class="muted small">creato il ${esc(dtIt(P.creato || P.ultimaModifica || new Date().toISOString()))}</span></div>
    <div class="field" style="margin-top:10px"><label>Link da inviare ai committenti</label><input type="text" id="portal-url" readonly value="${esc(portalUrl(E))}" onclick="this.select()"></div>
    <div class="row" style="margin-top:10px"><button class="btn" data-act="portal-copy">Copia link</button><a class="btn alt" href="${mail}">Prepara email</a><a class="btn alt" href="${esc(portalUrl(E))}" target="_blank" rel="noopener">Anteprima</a><button class="btn ghost right" data-act="portal-revoke">Revoca accesso</button></div>
    <p class="hint">Chi possiede il link può modificare le scelte di questo evento: invialo solo ai committenti. Se finisce nelle mani sbagliate, revoca e rigenera.</p>`
    : `<p>${P.attivo === false ? 'L\'accesso cliente è disattivato.' : 'Nessun link ancora generato.'}</p><button class="btn" data-act="portal-create" ${CLOUD ? '' : 'disabled'}>Genera link per il cliente</button>`}</div>
  ${on ? `<div class="grid g2"><div class="card"><h4>Stato scelte del cliente</h4><p>${P.confermatoAt ? `<span class="pill ok">Confermate il ${esc(dtIt(P.confermatoAt))} · modifiche bloccate</span> <button class="btn sm alt" data-act="portal-reopen">Riapri le modifiche al cliente</button>` : '<span class="pill warn">Non ancora confermate</span>'}</p>${P.nota ? `<div class="lbl2">Messaggio del cliente</div><div class="small" style="white-space:pre-wrap">${esc(P.nota)}</div>` : ''}
      <div class="hint" style="margin-top:8px">Il cliente può modificare il menù fino al ${E.q.scadenzaMenu ? new Date(E.q.scadenzaMenu + 'T12:00:00').toLocaleDateString('it-IT') : '—'}, gli allestimenti fino al ${E.q.scadenzaAllest ? new Date(E.q.scadenzaAllest + 'T12:00:00').toLocaleDateString('it-IT') : '—'} e gli invitati fino a 10 giorni prima dell'evento. Poi le sezioni si bloccano da sole; il link smette di funzionare anche dopo la data dell'evento e, per le modifiche, dopo la conferma finale del cliente.</div></div>
    <div class="card"><h4>Cronologia modifiche</h4>${(P.log || []).length ? (P.log || []).map(l => `<div class="small" style="padding:4px 0;border-bottom:1px solid #eee8e0"><b>${esc(dtIt(l.at))}</b> · ${esc(l.txt)}</div>`).join('') : '<p class="muted small">Nessuna modifica del cliente per ora.</p>'}</div></div>` : ''}`;
};
async function portalCall(act) {
  const E = curEvent(); catalogFor(E); SBASE = null; save();      // il catalogo dell'anno deve essere sul server perché il cliente lo veda
  await doPush();
  const r = await http('POST', 'portal/' + act, { id: E.id });
  if (!r.ok) { toast(r.body.error || 'Errore'); return; }
  E.portale = E.portale || {};
  if (act === 'create') { E.portale.token = r.body.token; E.portale.attivo = true; E.portale.creato = new Date().toISOString(); } else { delete E.portale.token; E.portale.attivo = false; }
  REV[E.id] = r.body.rev; BASE[E.id] = JSON.stringify(E);
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {}
  rr(); toast(act === 'create' ? 'Link generato' : 'Accesso revocato');
}
ACTIONS['portal-create'] = () => portalCall('create');
ACTIONS['portal-revoke'] = () => { if (confirm('Revocare l\'accesso? Il link smetterà subito di funzionare.')) portalCall('revoke'); };
ACTIONS['portal-copy'] = async () => { const v = $('#portal-url').value; try { await navigator.clipboard.writeText(v); toast('Link copiato'); } catch { $('#portal-url').select(); toast('Seleziona e copia il link'); } };
ACTIONS['portal-reopen'] = () => { if (!confirm('Il cliente potrà di nuovo modificare le sue scelte. Procedere?')) return; const E = curEvent(); E.portale.confermatoAt = ''; save(); rr(); toast('Modifiche riaperte al cliente'); };
