/* =====================================================================
   Quantità standard di partenza per le ricette del catalogo (a persona, al netto) e scarto tipico.
   Sono valori indicativi da rivedere dallo chef: si applicano solo alle materie prime senza quantità.
   Formato della riga di catalogo:  Nome | quantità a persona | unità | scarto %
   ===================================================================== */
const STD_RULES = [
  [/(carbone|spiedin|stecch|stuzzicadent|alloro in foglia|decorazion|fiori commestibili|ghiaccio|acqua\b)/, null, '', 0],      // non sono materie prime da dosare: restano senza quantità
  [/(brodo|fondo|fumetto|\bjus\b|riduzione|salsa|besciamella|vellutata|\bcrema\b|cremoso)/, 40, 'ml', 0],
  [/\b(uova|uovo|tuorlo|albume|tuorli)\b/, 0.5, 'pz', 0],
  [/\b(olio|oli)\b/, 8, 'ml', 0],
  [/(zafferano|vaniglia|cannella|noce moscata|spezie|pepe\b|sale\b|aromi)/, 1, 'g', 0],
  [/(basilico|prezzemolo|timo|rosmarino|menta|salvia|origano|erbe|erba|maggiorana|erba cipollina|aneto|coriandolo)/, 2, 'g', 30],
  [/(\bvino\b|\bvini\b|vermouth|marsala|liquore|\bgin\b|\brum\b|whisky|brandy|spumante|birra|aceto|cognac|grappa|vodka|campari|aperol|prosecco)/, 15, 'ml', 0],
  [/(panna|crema di latte)/, 30, 'ml', 0], [/\blatte\b/, 50, 'ml', 0], [/(yogurt)/, 40, 'g', 0],
  [/\bburro\b/, 20, 'g', 0], [/(ricotta)/, 40, 'g', 0], [/(mascarpone)/, 30, 'g', 0],
  [/(parmigiano|grana|pecorino|toma|formaggio|fontina|gorgonzola|mozzarella|fior di latte|burrata|caprino|stracchino|taleggio|robiola|provola|bitto|raschera|castelmagno)/, 30, 'g', 3],
  [/(riso|carnaroli|arborio|vialone)/, 80, 'g', 0],
  [/(pasta fresca|tagliolini|tagliatelle|gnocchi|ravioli|agnolotti|tortelli|plin|tajarin)/, 110, 'g', 0], [/(pasta|spaghetti|paccheri|orecchiette|rigatoni|mezze maniche|fusilli)/, 90, 'g', 0],
  [/(pasta sfoglia|sfoglia|frolla|pasta brisée|brisée|pan di spagna|biscotto|savoiardi)/, 35, 'g', 0],
  [/(farina|semola|amido|fecola|pangrattato|pane|focaccia|grissini|crackers|brioche|panino|piadina|tartelletta|cialda)/, 40, 'g', 0],
  [/(zucchero|glucosio|sciroppo|isomalto)/, 25, 'g', 0], [/\bmiele\b/, 10, 'g', 0], [/(cioccolato|cacao|gianduia)/, 30, 'g', 0],
  [/(nocciol|mandorl|pistacchi|noci\b|pinoli|frutta secca|granella|arachidi)/, 12, 'g', 0], [/(marmellata|confettura|composta|gelatina|mostarda|cremoso)/, 20, 'g', 0],
  [/(prosciutto|speck|salume|mortadella|bresaola|lardo|guanciale|pancetta|salame|coppa|culatello|nduja)/, 40, 'g', 3],
  [/(gamber|scamp|mazzancoll|astice|aragosta|granchio|crostace|cicala)/, 100, 'g', 45], [/(polpo|calamar|seppia|totan|cozze|vongole|ostric|molluschi)/, 120, 'g', 30],
  [/(pesce|branzino|orata|rombo|merluzzo|baccal|tonno|salmone|trota|persico|ricciola|spada|sgombro|acciug|alici|sarde|sarda|storione|caviale)/, 150, 'g', 30],
  [/(filetto|manzo|bovino|vitello|carne|costata|controfiletto|maiale|suino|agnello|pollo|anatra|coniglio|fassona|tartare|guancia|scottona|piccione|faraona|cinghiale)/, 160, 'g', 8],
  [/(tartufo)/, 5, 'g', 5], [/(funghi|porcini|champignon|finferli)/, 60, 'g', 15], [/(insalata|rucola|radicchio|valeriana|misticanza|germogli)/, 30, 'g', 20],
  [/(pomodor|datterini|ciliegino)/, 80, 'g', 10],
  [/(patat|carot|zucchin|melanzan|peperon|cipoll|porri|finocch|spinaci|bietol|cavol|broccol|asparag|carciof|zucca|sedano|ortaggi|verdur|cetrioli|fagiol|piselli|ceci|lenticch|mais|barbabietol|rapa|radici|cardo|topinambur|scalogno|aglio)/, 100, 'g', 20],
  [/(limon|aranc|agrum|lime|pompelmo|bergamotto|mandarin|cedro)/, 20, 'g', 40],
  [/(frutt|mela|mele|pera|pere|fragol|lampon|more|mirtill|albicocc|pesca|pesche|ananas|mango|banana|fico|fichi|uva|kiwi|melone|anguria|cocco|passion|cachi|ciliegi|prugn)/, 80, 'g', 20],
  [/(caffè|caffe|\btè\b|infuso|camomilla)/, 5, 'g', 0],
];
/* fattore di porzione per tipo di preparazione (un finger food non pesa come un secondo) */
function stdQty(name, scale) {
  const n = norm(name); let r = [30, 'g', 0];
  for (const [re, q, u, s] of STD_RULES) if (re.test(n)) { r = [q, u, s]; break; }
  if (r[0] === null) return { q: null, u: '', s: 0 };
  let q = r[0] * scale; q = r[1] === 'pz' ? Math.max(0.1, Math.round(q * 10) / 10) : q < 10 ? Math.max(1, Math.round(q)) : q < 40 ? Math.round(q / 2) * 2 : Math.round(q / 5) * 5;
  return { q, u: r[1], s: r[2] };
}
function stdLine(line, scale) {
  const i = parseIng(line); if (i.q !== '' || !i.n || /da definire/i.test(i.n)) return line;
  const x = stdQty(i.n, scale); if (x.q === null) return line;
  return `${i.n} | ${x.q} | ${x.u} | ${x.s}`;
}
/* applica le quantità standard a tutte le ricette di un catalogo; restituisce quante materie prime ha compilato */
function applyStdQuantities(C0) {
  let n = 0;
  const fill = (arr, scale) => (arr || []).forEach(r => { if (!r || !r.ing) return; r.ing = r.ing.map(l => { const x = stdLine(l, scale); if (x !== l) n++; return x; }); });
  (C0.isole || []).forEach(i => fill(i.items, 0.35)); fill(C0.preEntree, 0.5); fill(C0.entree, 0.8);
  (C0.primi || []).forEach(g => fill(g.items, 1)); fill(C0.secondi, 1); fill(C0.formaggi, 0.8); fill(C0.dessert, 0.8);
  if (C0.torta) fill([C0.torta], 1); if (C0.lounge) fill(C0.lounge.dolci, 0.3); if (C0.menuBimbi) fill(C0.menuBimbi.items, 0.7);
  return n;
}
/* una volta sola, al primo avvio dopo l'aggiornamento: compila le quantità mancanti di tutti i cataloghi */
function stdAutoApply() {
  if (S.settings.stdQty || (typeof AUTH !== 'undefined' && (AUTH.cucina || AUTH.status !== 'ready' && CLOUD))) return;
  Object.values(S.settings.catalogs || {}).forEach(applyStdQuantities); S.settings.stdQty = 1; save();
}
