/* Motore del preventivo per il portale cliente: esegue sul server lo stesso codice del gestionale (catalog.js + store.js)
   in un contesto isolato, così il browser del cliente non riceve né il motore né il listino. */
import vm from 'node:vm';

export function makeQuoteEngine(assets) {
  let ctx = null, failed = false;
  function init() {
    if (ctx || failed) return;
    const cat = assets.read('catalog.js'), store = assets.read('store.js');
    if (!cat || !store) { failed = true; return; }
    try {
      const c = vm.createContext({ window: {}, document: {}, console, localStorage: { getItem: () => null, setItem() {}, removeItem() {} }, Date, JSON, Math });
      vm.runInContext(cat + '\n' + store, c, { timeout: 5000 }); ctx = c;
    } catch (e) { console.error('quote init', e); failed = true; }
  }
  return {
    economics(event, settings) {
      init(); if (!ctx) return null;
      try {
        ctx.__e = event; ctx.__s = settings || null;
        const out = vm.runInContext(`(() => {
          S.settings = hydrateSettings(__s); const E = hydrate(__e), q = computeQuote(E), iva = S.settings.iva;
          const paid = (E.pagamenti || []).map(p => !!p.paid);
          const plan = E.pagAuto ? buildScadenziario(E, q.imponibile) : (E.pagamenti || []).map(p => ({ desc: p.desc, due: p.due, importo: Number(p.importo) || 0 }));
          fixSaldo(plan, q.imponibile);
          return JSON.stringify({ iva, imponibile: q.imponibile, ivaImporto: q.iva, totale: q.totale, infos: q.infos, lines: q.lines.map(l => ({ sec: l.sec, label: l.label, qty: l.qty, unit: l.unit, tot: l.tot })),
            plan: plan.map((p, i) => ({ desc: p.desc, due: p.due, importo: p.importo, lordo: Math.round(p.importo * (1 + iva / 100) * 100) / 100, paid: !!paid[i] })) });
        })()`, ctx, { timeout: 5000 });
        return JSON.parse(out);
      } catch (e) { console.error('quote', e); return null; }
    },
  };
}
