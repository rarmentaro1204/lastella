#!/usr/bin/env node
/* Genera i 40 eventi dimostrativi (deterministici) e li scrive in:
     netlify/lib/demo-seed.json   → il server li crea al primo accesso (database vuoto)
     js/demo-seed.js              → l'app locale / il pulsante «Aggiungi i 40 eventi di esempio»
   Uso: NODE_PATH=$(npm root -g) node tools/make-demo-seed.cjs   (richiede playwright) */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  p.on('pageerror', e => { console.error('PAGEERROR', e.message); process.exit(1); });
  await p.goto('file://' + path.join(root, 'index.html')); await p.waitForTimeout(500);
  const seed = await p.evaluate(() => { const events = buildDemoEvents(); return { settings: { locations: S.settings.locations }, events }; });
  await b.close();
  fs.writeFileSync(path.join(root, 'netlify/lib/demo-seed.json'), JSON.stringify(seed));
  fs.writeFileSync(path.join(root, 'js/demo-seed.js'), '/* generato da tools/make-demo-seed.cjs */\nwindow.DEMO_SEED = ' + JSON.stringify(seed) + ';\n');
  const by = {}; seed.events.forEach(e => { const k = e.q.tipo; by[k] = (by[k] || 0) + 1; });
  console.log('eventi:', seed.events.length, JSON.stringify(by), '| KB:', Math.round(JSON.stringify(seed).length / 1024));
})();
