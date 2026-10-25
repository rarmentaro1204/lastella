/* =====================================================================
   La Stella Catering – catalogo dati (menù 2026, allestimenti, add-on)
   Fonti: MENU_2026, CATALOGO_ALLESTIMENTI_2026, BROCHURE DIAMANTE 2026,
          preventivo Diamante + Allegato B.
   Le ricette sono BOZZE ricavate dalle descrizioni del menù: lo chef le valida.
   ===================================================================== */

// compatta la definizione di una ricetta: ingredienti / semilavorati separati da ";"
function R(id, name, desc, ing, semi, asm, tags) {
  const sp = s => (s ? s.split(';').map(x => x.trim()).filter(Boolean) : []);
  return {
    id, name, desc: desc || '', ing: sp(ing), semi: sp(semi),
    asm: sp(asm || 'Mise en place stoviglie e supporti;Composizione / impiattamento secondo scheda;Controllo finale al passe'),
    tags: tags || [],
  };
}

const CAT = {};

/* ---------------------------------------------------------------- esigenze */
CAT.allergie = [
  { k: 'glutine', label: 'Glutine (cereali)', icon: '🌾' },
  { k: 'crostacei', label: 'Crostacei', icon: '🦐' },
  { k: 'uova', label: 'Uova', icon: '🥚' },
  { k: 'pesce', label: 'Pesce', icon: '🐟' },
  { k: 'arachidi', label: 'Arachidi', icon: '🥜' },
  { k: 'soia', label: 'Soia', icon: '🫘' },
  { k: 'latte', label: 'Latte e derivati', icon: '🥛' },
  { k: 'guscio', label: 'Frutta a guscio', icon: '🌰' },
  { k: 'sedano', label: 'Sedano', icon: '🥬' },
  { k: 'senape', label: 'Senape', icon: '🟡' },
  { k: 'sesamo', label: 'Sesamo', icon: '⚪' },
  { k: 'solfiti', label: 'Solfiti', icon: '🍷' },
  { k: 'lupini', label: 'Lupini', icon: '🌼' },
  { k: 'molluschi', label: 'Molluschi', icon: '🐚' },
];
CAT.intolleranze = [
  { k: 'celiachia', label: 'Celiachia', icon: '🚫🌾' },
  { k: 'lattosio', label: 'Lattosio', icon: '🥛' },
  { k: 'nichel', label: 'Nichel', icon: '⚙️' },
  { k: 'istamina', label: 'Istamina', icon: '🧪' },
  { k: 'fruttosio', label: 'Fruttosio', icon: '🍯' },
  { k: 'favismo', label: 'Favismo', icon: '🫛' },
];
CAT.diete = [
  { k: 'Vegetariano', label: 'Vegetariano', icon: '🥕' },
  { k: 'Vegano', label: 'Vegano', icon: '🌱' },
  { k: 'Fruttariano', label: 'Fruttariano', icon: '🍎' },
  { k: 'Pescetariano', label: 'Pescetariano', icon: '🐠' },
  { k: 'Crudista', label: 'Crudista', icon: '🥗' },
  { k: 'Halal', label: 'Halal', icon: '☪️' },
  { k: 'Kosher', label: 'Kosher', icon: '✡️' },
];
CAT.fasce = [
  { k: 'Adulto', label: 'Adulto', icon: '' },
  { k: 'Bambino', label: 'Bambino (3-10)', icon: '🧒' },
  { k: 'Neonato', label: 'Neonato (0-2)', icon: '🍼' },
];

/* ---------------------------------------------------------------- aperitivo */
CAT.isole = [
  { id: 'grill', tipo: 'show', nome: 'Streeturin Grill', sub: 'Sfiziosità in griglia al carbone di cocco', items: [
    R('ap-arrosticino', 'Arrosticino', 'arrosticini di pollo e verdure', 'Pollo (coscia/petto);Zucchine;Peperoni;Cipolla rossa;Olio EVO;Sale;Spiedini;Carbone di cocco', 'Pollo a cubetti marinato;Verdure tagliate e infilzate;Spiedini composti'),
    R('ap-miniribs', 'Mini ribs CBT', 'mini costine cotte a bassa temperatura, affumicate e grigliate', 'Costine di maiale;Rub di spezie;Salsa BBQ;Trucioli per affumicatura;Carbone di cocco', 'Costine cotte a bassa temperatura (sottovuoto);Rub di spezie;Salsa BBQ;Affumicatura', 'Rigenerare le costine;Grigliare e glassare alla BBQ al momento;Servire'),
    R('ap-panytomate', 'Pan y tomate', 'bruschetta, crema di pomodori confit, scamorza, polvere di basilico', 'Pane per bruschetta;Pomodori datterini;Scamorza affumicata;Basilico;Olio EVO;Sale', 'Pomodori confit;Crema di pomodori confit;Polvere di basilico;Pane tostato'),
    R('ap-minidrink-crodino', 'Mini drink · Crodino con porto', 'crodino con porto', 'Crodino;Porto;Ghiaccio;Arancia (garnish);Bicchierini', '', 'Preparare i bicchierini;Miscelare al momento'),
  ] },
  { id: 'burger', tipo: 'show', nome: 'Streeturin Burger', sub: 'Il design street creativo', items: [
    R('ap-burger-piem', 'Burger piemontese', 'hamburger di salsiccia di vitello cruda, morbido al blu vaccino, rucola', 'Salsiccia di vitello;Blu vaccino;Rucola;Mini panini', 'Hamburger di salsiccia formati;Mini panini scaldati;Morbido al blu vaccino'),
    R('ap-cheeseburger', 'Cheeseburger', 'hamburger alla piastra, toma, insalate dell’orto e cipolle caramellate', 'Macinato di manzo;Toma;Insalate dell’orto;Cipolle;Zucchero di canna;Mini panini', 'Hamburger formati;Cipolle caramellate;Mini panini scaldati'),
    R('ap-burger-veg', 'Burger vegetariano', 'mini parmigiana di melanzane, basilico', 'Melanzane;Passata di pomodoro;Parmigiano;Mozzarella;Basilico;Mini panini', 'Mini parmigiana di melanzane;Mini panini scaldati', '', ['vegetariano']),
    R('ap-minidrink-birra', 'Mini drink · Birra artigianale', 'birra artigianale', 'Birra artigianale;Bicchierini', '', 'Raffreddare;Servire in mini calice'),
  ] },
  { id: 'tacos', tipo: 'show', nome: 'Streeturin Tacos', sub: 'Mex vibes', items: [
    R('ap-chili', 'Mexican chili', 'chili con carne, friggitelli, nachos, salse', 'Macinato di manzo;Fagioli;Pomodoro;Friggitelli;Nachos;Spezie tex-mex;Salse (guacamole, salsa piccante)', 'Chili con carne;Friggitelli fritti;Salse'),
    R('ap-taco-veg', 'Taco vegetariano', 'insalata coleslaw, microgreen', 'Tortillas / shell di taco;Cavolo cappuccio;Carote;Maionese;Microgreen', 'Insalata coleslaw;Taco shell scaldati', '', ['vegetariano']),
    R('ap-taco-pesce', 'Taco di pesce', 'salmone marinato alla barbabietola, maionese al wasabi, ravanelli', 'Salmone;Barbabietola;Sale e zucchero;Wasabi;Maionese;Ravanelli;Tortillas / shell di taco', 'Salmone marinato alla barbabietola;Maionese al wasabi;Ravanelli a lamelle'),
    R('ap-minidrink-margarita', 'Mini drink · Margarita', 'margarita', 'Tequila;Triple sec;Lime;Sale;Ghiaccio', '', 'Bordare i bicchierini;Shakerare e servire'),
  ] },
  { id: 'eno', tipo: 'show', nome: 'Percorso enogastronomico', sub: 'La degustazione', items: [
    R('ap-eno-formaggi', 'Degustazione 5 formaggi', '5 formaggi', 'Formaggi (5 tipologie)', 'Formaggi porzionati;Tagliere composto'),
    R('ap-eno-salumi', 'Degustazione 2 salumi', '2 salumi', 'Salumi (2 tipologie)', 'Salumi affettati;Tagliere composto'),
    R('ap-eno-pani', 'Pane di campagna e pane alle nocciole e uvetta', '', 'Pane di campagna;Pane alle nocciole e uvetta', 'Pani affettati e scaldati'),
    R('ap-eno-accomp', 'Marmellata di agrumi e degustazione di oli', '', 'Marmellata di agrumi;Oli EVO (degustazione)', 'Marmellata servita;Oli in ciotoline'),
    R('ap-eno-wine', 'Wine pairing · 3 etichette', '3 etichette di vini in abbinamento', 'Vini (3 etichette);Bicchieri da degustazione', '', 'Selezione e raffreddamento vini;Servizio con abbinamento'),
  ] },
  { id: 'trattoria', tipo: 'show', nome: 'Trattoria 2.0', sub: 'Trattoria italiana in chiave moderna', items: [
    R('ap-finto-pomodoro', 'Finto pomodoro', 'di pappa al pomodoro, crema di bufala', 'Pane raffermo;Pomodoro;Basilico;Bufala;Olio EVO', 'Pappa al pomodoro (sfera);Crema di bufala;Rivestimento “finto pomodoro”'),
    R('ap-burro-acciughe', 'Burro e acciughe', 'crostino, burro montato alle nocciole, acciuga', 'Pane per crostini;Burro;Nocciole;Acciughe', 'Burro montato alle nocciole;Crostini tostati'),
    R('ap-battuta-coltello', 'Battuta al coltello', 'tartare di manzo affumicata al cannello, sesamo in due consistenze', 'Manzo (fesa/fassone);Sesamo;Olio EVO;Sale', 'Tartare di manzo tagliata al coltello;Sesamo in due consistenze (tostato / crema);Affumicatura al cannello'),
    R('ap-minidrink-fiaschetta', 'Mini drink · Fiaschetta', 'fiaschetta con succo di mela e mirtillo', 'Succo di mela;Succo di mirtillo;Fiaschette', '', 'Riempire le fiaschette;Raffreddare'),
  ] },
  { id: 'scarpetta', tipo: 'show', nome: 'Scarpetta culinaria', sub: 'Ricordo popolare italiano', items: [
    R('ap-carbonara', '“A carbonara”', 'spuma alla carbonara, guanciale; la sua scarpetta: pasta soffiata croccante', 'Uova;Pecorino;Guanciale;Pepe;Panna;Pasta per soffiatura', 'Spuma alla carbonara;Guanciale croccante;Pasta soffiata'),
    R('ap-nerano', '“Bella Nerano”', 'crema al ‘cacio e pepe’, zucchine in scapece; la sua scarpetta: crostino al basilico', 'Pecorino;Pepe;Zucchine;Aceto;Menta;Pane;Basilico', 'Crema cacio e pepe;Zucchine in scapece;Crostino al basilico'),
    R('ap-cicheto', '“Cicheto veneziano”', 'baccalà mantecato, olive tostate; la sua scarpetta: focaccia croccante al mais pignoletto', 'Baccalà;Latte;Olio EVO;Olive;Farina di mais pignoletto', 'Baccalà mantecato;Olive tostate;Focaccia croccante al mais'),
  ] },
  { id: 'crudite', tipo: 'show', nome: 'Crudité di pesce', sub: 'Purezza', items: [
    R('ap-salmerino', 'Salmerino di fiume', 'marinato ed affumicato, gel di carpione al passito di malvasia moscata, maionese alla salvia, crescione', 'Salmerino;Passito di malvasia;Aceto;Salvia;Uova;Olio;Crescione', 'Salmerino marinato e affumicato;Gel di carpione al passito;Maionese alla salvia'),
    R('ap-tonno', 'Tonno', 'tartare di tonno, lemongrass, arancia marinata e grigliata', 'Tonno;Lemongrass;Arance;Olio EVO', 'Tartare di tonno;Arancia marinata e grigliata;Olio al lemongrass'),
    R('ap-gambero', 'Gambero', 'in purezza, sale Maldon', 'Gamberi;Sale Maldon;Olio EVO', 'Gamberi puliti e abbattuti'),
    R('ap-minidrink-alkemy', 'Mini drink · Alkemy in provetta', 'alkemy drink in provetta', 'Ingredienti cocktail alkemy;Provette', '', 'Preparare le provette;Servire'),
  ] },
  { id: 'tartufo', tipo: 'show', nome: 'Tartufo', sub: 'Il protagonista', items: [
    R('ap-tartufo-battuta', 'Battuta al coltello', 'tartare di manzo, tartufo', 'Manzo;Tartufo;Olio EVO;Sale', 'Tartare di manzo al coltello'),
    R('ap-tartufo-funghi', 'Sauté di funghi', 'crema di topinambur, chips, tartufo', 'Funghi;Topinambur;Panna / brodo;Tartufo;Olio EVO', 'Sauté di funghi;Crema di topinambur;Chips di topinambur'),
    R('ap-tartufo-tagliolino', 'Tagliolino fritto', 'spuma al parmigiano, tartufo', 'Tagliolini;Parmigiano;Panna;Tartufo;Olio per frittura', 'Tagliolini lessati e fritti;Spuma al parmigiano'),
  ] },
  // ---- servizio a passaggio
  { id: 'radici', tipo: 'passaggio', nome: 'Radici', sub: 'Piemonte da un’altra prospettiva', items: [
    R('ap-involtino', 'Involtino', 'di verdure e coda di vitello, salsa agrodolce di prugne fermentate', 'Verdure;Coda di vitello;Prugne;Aceto;Zucchero', 'Coda di vitello brasata;Involtini formati;Salsa agrodolce di prugne fermentate'),
    R('ap-bigne', 'Bignè', 'gorgonzola e noci, glassa alla barbabietola', 'Farina;Burro;Uova;Gorgonzola;Noci;Barbabietola', 'Bignè cotti;Crema di gorgonzola e noci;Glassa alla barbabietola'),
    R('ap-giardiniera', 'Insalata giardiniera', 'con polvere di ginepro', 'Verdure sott’aceto / giardiniera;Bacche di ginepro', 'Giardiniera;Polvere di ginepro', '', ['vegetariano']),
  ] },
  { id: 'ospitalita', tipo: 'passaggio', nome: 'Ospitalità italiana', sub: 'Cucina moderna', items: [
    R('ap-macaron', 'Macaron', 'al mirtillo salato, spumino di brie, speck d’anatra', 'Farina di mandorle;Albume;Zucchero;Mirtilli;Brie;Speck d’anatra', 'Gusci di macaron;Ripieno al mirtillo salato;Spumino di brie'),
    R('ap-seadas', 'Seadas salata', 'riduzione al genepì', 'Pasta per seadas;Formaggio;Genepì;Olio per frittura', 'Seadas fritte;Riduzione al genepì'),
    R('ap-sorbetto', 'Mini sorbetto di stagione', 'al bicchierino', 'Frutta di stagione;Zucchero', 'Sorbetto di stagione mantecato', 'Bicchierini in abbattitore;Servizio al passaggio', ['vegano']),
  ] },
  { id: 'correnti', tipo: 'passaggio', nome: 'Correnti', sub: 'La nostra cucina nel mondo', items: [
    R('ap-ceviche', 'Ceviche', 'ceviche di branzino, pomodori confit, cipolla, friggitelli, frutti rossi', 'Branzino;Lime / agrumi;Pomodori;Cipolla;Friggitelli;Frutti rossi', 'Branzino marinato (leche de tigre);Pomodori confit;Friggitelli'),
    R('ap-poke', 'Poké “il mercato”', '', 'Riso;Pesce fresco;Verdure di mercato;Salsa poké', 'Riso condito;Pesce tagliato;Verdure'),
    R('ap-caesar', 'Caesar salad', 'maionese all’aneto, guanciale croccante', 'Lattuga;Crostini;Parmigiano;Guanciale;Aneto;Uova', 'Maionese all’aneto;Guanciale croccante;Crostini'),
  ] },
  { id: 'vegan', tipo: 'passaggio', nome: 'Vegan taste', sub: 'La natura', items: [
    R('ap-ins-radici', 'Insalata di radici', 'gel di agrumi, cialda di semi', 'Radici (carote, barbabietole, rape);Agrumi;Agar agar;Semi misti', 'Gel di agrumi;Cialda di semi;Radici tagliate', '', ['vegano']),
    R('ap-cous', 'Cous cous', 'olio alla menta, fave croccanti, sedano', 'Cous cous;Menta;Olio EVO;Fave;Sedano', 'Cous cous sgranato;Olio alla menta;Fave croccanti', '', ['vegano']),
    R('ap-hummus', 'Hummus di ceci', 'alla barbabietola con noci tostate', 'Ceci;Tahina;Limone;Barbabietola;Noci', 'Hummus di ceci;Barbabietola cotta;Noci tostate', '', ['vegano']),
  ] },
];

CAT.aperitivoRegole = {
  show: 3, passaggio: 2, buvette: 1, durataOre: 2, maxRicette: 24,
  nota: 'Le isole d’aperitivo non sono scomponibili. Le proposte definitive vengono comunicate la settimana del ricevimento.',
};

CAT.buvette = {
  bollicina: 'Metodo Martinotti Piemontese ‘Sciarmat’ Extra Dry, Cascina Albano',
  cocktail: ['Kombucha alla Verbena', 'Aperol Spritz', 'Campari Spritz', 'Hugo', 'Negroni Sbagliato', 'Gin Tanqueray Tonic'],
  succhi: ['Ananas', 'Arancia'],
  fissi: ['Coca Cola in vetro', 'Acqua naturale e frizzante ‘Sparea Splendida’'],
  extra: {
    'Bollicine': ['Chardonnay Brut Martinotti 8 mesi, Borgo Maragliano', 'Blanc de Blancs Brut Alta Langa DOCG, F. Galliano', 'Brut Rosé Alta Langa DOCG, G. Galliano', 'Champagne ‘Blanc de Noirs’ Justin Maillard', 'Bellavista ‘Alma Grand Cuvée’ Franciacorta'],
    'Cocktail': ['Gin Mare Tonic'],
    'Birre': ['Birra artigianale', 'Birra analcolica'],
    'Analcolici': ['Succo di frutta all’arancia', 'Succo di frutta all’ananas', 'Cocktail analcolico', 'Acqua profumata'],
  },
};

/* “Mi sono innamorato di…” – singola ricetta in esclusiva (quotazione separata) */
CAT.esclusivaNota = 'Singola ricetta in esclusiva tra quelle del servizio a passaggio · prodotto soggetto a quotazione separata';

/* ---------------------------------------------------------------- a tavola */
CAT.preEntree = [
  R('pe-limone', 'Sorbetto al limone, nocciola cristallizzata, Hendrick’s gin, pepe jamaicano', '', 'Limoni;Zucchero;Nocciole;Hendrick’s gin;Pepe jamaicano', 'Sorbetto al limone;Nocciola cristallizzata', '', ['vegano']),
  R('pe-zenzero', 'Sorbetto all’estratto di zenzero e miele, tuile di parmigiano', '', 'Zenzero;Miele;Acqua;Parmigiano', 'Sorbetto zenzero e miele;Tuile di parmigiano'),
  R('pe-melisse', 'Tre Melisse: sorbetto, foglia, infuso', '', 'Melissa fresca;Zucchero;Acqua', 'Sorbetto alla melissa;Foglie candite;Infuso di melissa', '', ['vegano']),
];
CAT.entree = [
  R('en-parmigiana', 'Parmigiana di melanzane destrutturata', '', 'Melanzane;Pomodoro;Parmigiano;Mozzarella / fior di latte;Basilico', 'Melanzane cotte;Salsa di pomodoro;Crema di parmigiano;Elementi croccanti', '', ['vegetariano']),
  R('en-vitello', 'Vitello tonnato, reinterpretazione moderna', '', 'Vitello (girello);Tonno;Capperi;Acciughe;Maionese;Brodo aromatico', 'Vitello cotto a bassa temperatura;Salsa tonnata;Polvere / gel di capperi'),
  R('en-fassone', 'Battuta di fassone, ricordo del peperone e bagna cauda, verza croccante', '', 'Fassone;Peperoni;Aglio;Acciughe;Olio EVO;Verza', 'Battuta di fassone;Crema di peperone;Bagna cauda;Verza croccante'),
  R('en-salmone', 'Salmone marinato e affumicato, crema di stracciatella, mandorle tostate, barbabietola', '', 'Salmone;Sale e zucchero;Stracciatella;Mandorle;Barbabietola', 'Salmone marinato e affumicato;Crema di stracciatella;Mandorle tostate;Barbabietola cotta'),
  R('en-polpo', 'Polpo scottato, verdure agrodolci al lime e sesamo, salmorejo', '', 'Polpo;Verdure;Lime;Sesamo;Pomodoro;Pane;Aglio;Olio EVO', 'Polpo cotto;Verdure agrodolci;Salmorejo'),
  R('en-radici', 'Insalata di radici, yuzu candito, cialda di semi, granita alla barbabietola', '', 'Radici;Yuzu;Zucchero;Semi misti;Barbabietola', 'Radici cotte/marinate;Yuzu candito;Cialda di semi;Granita alla barbabietola', '', ['vegano']),
];
CAT.primi = [
  { gruppo: 'I risotti', items: [
    R('pr-risotto-toma', 'Carnaroli Riserva alla Toma di Bobbio Pellice, mirtilli fermentati, tartufo', '', 'Riso Carnaroli Riserva;Toma di Bobbio Pellice;Mirtilli;Tartufo;Burro;Brodo vegetale', 'Brodo;Crema di toma;Mirtilli fermentati;Tostatura e cottura del riso', 'Mantecatura a pass;Impiattamento;Tartufo a lamelle', ['vegetariano']),
    R('pr-risotto-erbette', 'Carnaroli Riserva alle erbette, mantecato al gel di agrumi, brodo di camomilla, fiori di campo', '', 'Riso Carnaroli Riserva;Erbette;Agrumi;Camomilla;Fiori eduli', 'Crema di erbette;Gel di agrumi;Brodo di camomilla;Tostatura e cottura del riso', 'Mantecatura a pass;Impiattamento;Fiori di campo', ['vegetariano']),
    R('pr-risotto-zafferano', 'Carnaroli Riserva allo zafferano, crudo di salsiccia di vitello, mosto cotto, fondo tiepido al midollo', '', 'Riso Carnaroli Riserva;Zafferano;Salsiccia di vitello;Mosto cotto;Midollo;Brodo', 'Brodo;Fondo al midollo;Crudo di salsiccia;Tostatura e cottura del riso', 'Mantecatura a pass;Impiattamento;Fondo tiepido e mosto'),
  ] },
  { gruppo: 'I plin', items: [
    R('pr-plin-parmigiana', 'Raviolini del Plin ripieni alla parmigiana di melanzane, crema di basilico, spuma al fior di latte, tarallo napoletano', '', 'Farina;Uova;Melanzane;Pomodoro;Parmigiano;Basilico;Fior di latte;Tarallo', 'Sfoglia;Ripieno alla parmigiana;Plin formati;Crema di basilico;Spuma al fior di latte;Tarallo sbriciolato', 'Cottura plin;Impiattamento'),
    R('pr-plin-carne', 'Raviolini del Plin ripieni di carne, saltati nel sugo d’arrosto, crudo di salsiccia di vitello, chips dell’orto', '', 'Farina;Uova;Carni miste per ripieno;Sugo d’arrosto;Salsiccia di vitello;Verdure per chips', 'Sfoglia;Ripieno di carne;Plin formati;Sugo d’arrosto;Chips dell’orto', 'Cottura e salto dei plin;Impiattamento'),
  ] },
  { gruppo: 'Lo gnocco', items: [
    R('pr-gnocchi', 'Gnocchetti di patate, sugo ai tre datterini dell’orto, basilico, crudo di gamberi', '', 'Patate;Farina;Uova;Datterini (3 colori);Basilico;Gamberi', 'Gnocchetti formati;Sugo ai tre datterini;Gamberi crudi puliti', 'Cottura gnocchetti;Condimento;Impiattamento'),
  ] },
  { gruppo: 'Le paste di Gragnano', items: [
    R('pr-mischiata', 'Pasta mischiata, amatriciana di mare, guanciale croccante', '', 'Pasta mischiata di Gragnano;Pomodoro;Frutti di mare / pesce;Guanciale;Cipolla;Vino bianco', 'Sugo amatriciana di mare;Guanciale croccante', 'Cottura pasta;Mantecatura nel sugo;Impiattamento'),
    R('pr-fusilloni', 'Fusilloni, crema di cicorie, crumble alle nocciole', '', 'Fusilloni;Cicorie;Aglio;Olio EVO;Nocciole;Pangrattato', 'Crema di cicorie;Crumble alle nocciole', 'Cottura pasta;Mantecatura nella crema;Impiattamento', ['vegetariano']),
  ] },
];
CAT.secondi = [
  R('se-filetto', 'Filetto di bovino a bassa temperatura, patata sfogliata, riduzione al vermouth', '', 'Filetto di bovino;Patate;Vermouth;Fondo bruno;Burro', 'Filetto cotto a bassa temperatura;Patata sfogliata;Riduzione al vermouth', 'Rigenerare / rosolare il filetto;Impiattamento;Salsa al pass'),
  R('se-stracotto', 'Stracotto di manzo, purè di carote, fondo bruno al cioccolato, polvere di vinacce', '', 'Manzo (cappello del prete / guancia);Vino rosso;Carote;Cioccolato fondente;Vinacce', 'Stracotto;Purè di carote;Fondo bruno al cioccolato;Polvere di vinacce'),
  R('se-maialino', 'Filetto di maialino, roll di sedano rapa, mele, liquirizia', '', 'Filetto di maialino;Sedano rapa;Mele;Liquirizia', 'Filetto cotto;Roll di sedano rapa;Mele;Salsa alla liquirizia'),
  R('se-merluzzo', 'Merluzzo in crosta, green curry di piselli, scalogno caramellato', '', 'Merluzzo;Crosta (pane/erbe);Piselli;Curry verde;Scalogno', 'Merluzzo in crosta;Green curry di piselli;Scalogno caramellato'),
  R('se-ombrina', 'Ombrina alla piastra, purè di patate, fumetto alla barbabietola', '', 'Ombrina;Patate;Barbabietola;Fumetto di pesce', 'Purè di patate;Fumetto alla barbabietola', 'Cottura alla piastra;Impiattamento'),
  R('se-millefoglie', 'Millefoglie vegetale, borlotti e cannellini, fondo bruno di verdure', '', 'Verdure (melanzane, zucchine, peperoni…);Fagioli borlotti;Fagioli cannellini;Fondo di verdure', 'Verdure grigliate;Crema di borlotti e cannellini;Fondo bruno di verdure;Millefoglie composta', '', ['vegano']),
];
CAT.formaggi = [
  R('fo-degustazione', 'Degustazione di formaggi', 'tre tipologie di formaggi, in abbinamento miele, confettura, mostarda', 'Formaggi (3 tipologie);Miele;Confettura;Mostarda', 'Formaggi porzionati;Accompagnamenti in ciotolina', 'Composizione dei taglieri;Servizio a tavola'),
];
CAT.menuConsigliati = [
  { id: 'dintorni', nome: 'Dintorni', entree: 'en-vitello', primo: 'pr-risotto-toma', secondo: 'se-filetto' },
  { id: 'riflessi', nome: 'Riflessi Mediterranei', entree: 'en-parmigiana', primo: 'pr-mischiata', secondo: 'se-merluzzo' },
];
CAT.formule = [
  { id: '3a', nome: '3 portate · entrée + primo + secondo', pre: 0, entree: 1, primi: 1, secondi: 1 },
  { id: '3b', nome: '3 portate · 2 primi + secondo', pre: 0, entree: 0, primi: 2, secondi: 1 },
  { id: '4a', nome: '4 ricette · pre-entrée + entrée + primo + secondo', pre: 1, entree: 1, primi: 1, secondi: 1 },
];

/* vini a tavola (inclusi nella proposta Diamante) */
CAT.vini = {
  bianchi: ['‘Sibilla’ Langhe Arneis, Cantina Molino', '‘Sciarmat’ Metodo Martinotti Extra Dry, Cascina Albano', '‘El Bertu’ Timorasso, L’Autin'],
  rossi: ['Langhe Nebbiolo DOC, Cantina Sordo', '‘Superiore’ Barbera d’Alba Superiore, Cantina Molino', '‘Ai Cruss’ Barbera d’Asti, Cantina Brema', '‘Le Querce’ Dolcetto d’Alba, Cantina Molino'],
  extra: {
    'Bollicine': CAT.buvette.extra['Bollicine'],
    'Bianchi': ['‘Roero Arneis’ Arneis, Cascina Albano', '‘Vigneto Ca’ da Rena’ Pigato, Punta Crena', '‘Sofia’ Chardonnay, Cantina Molino'],
    'Rossi': ['‘Renero’ Pinot Nero, L’Autin', '‘Volpettona’ Barbera d’Asti DOCG, Cantine Brema', '‘Azörd’ Monferrato Rosso DOC, Cantina Scagliola Sansì'],
    'Passito (con i formaggi)': ['‘Passi di Gio’ Passito Malvasia Moscata, L’Autin'],
  },
};

/* ---------------------------------------------------------------- dessert / lounge */
CAT.dessert = [
  R('de-creamtart', 'Cream Tart', 'crema alla nocciola, frolla al cacao, albicocche', 'Nocciole;Cacao;Burro;Farina;Zucchero;Uova;Albicocche', 'Frolla al cacao;Crema alla nocciola;Albicocche', 'Montaggio monoporzioni;Decorazione'),
  R('de-bavarese', 'Bavarese al cioccolato fondente', 'caramello salato, marquise al cacao', 'Cioccolato fondente;Panna;Latte;Tuorli;Gelatina;Zucchero;Burro', 'Bavarese;Caramello salato;Marquise al cacao', 'Montaggio monoporzioni;Decorazione'),
  R('de-mousse', 'Mousse al lampone', 'pralinè e biscuit al pistacchio', 'Lamponi;Panna;Zucchero;Gelatina;Pistacchio;Nocciole;Uova;Farina', 'Mousse al lampone;Pralinè;Biscuit al pistacchio', 'Montaggio monoporzioni;Decorazione'),
  R('de-crostata', 'Crostata di frutta', 'lemon curd, frutta di stagione', 'Farina;Burro;Zucchero;Uova;Limoni;Frutta di stagione', 'Frolla;Lemon curd;Frutta tagliata', 'Montaggio;Decorazione'),
  R('de-torta', 'Torta da taglio ad un piano', 'su alzata, con servizio di porzionamento', 'Ingredienti torta (da definire con il pasticcere);Decorazioni', 'Pan di spagna / base;Farcitura;Copertura', 'Assemblaggio torta;Posizionamento su alzata'),
];
CAT.brindisi = 'Spumante Brut e Moscato d’Asti, in accompagnamento al taglio torta';
CAT.lounge = {
  dolci: [
    R('lo-frutta', 'Frutta di stagione', '', 'Frutta di stagione', 'Frutta pulita e tagliata', 'Presentazione al bicchierino / alzata', ['vegano']),
    R('lo-krapfen', 'Mini krapfen farciti', 'serviti caldi', 'Farina;Lievito;Uova;Burro;Zucchero;Creme per farcitura;Olio per frittura', 'Impasto lievitato;Crema di farcitura;Frittura al momento'),
    R('lo-cocco', 'Mignon al cocco', '', 'Cocco rapé;Albumi;Zucchero', 'Mignon cotti'),
    R('lo-brownie', 'Brownie al cioccolato e frutti rossi', '', 'Cioccolato fondente;Burro;Uova;Zucchero;Farina;Frutti rossi', 'Brownie cotto e porzionato'),
    R('lo-cannoli', 'Mini cannoli farciti', 'ricotta, miele, frutta secca', 'Cialde di cannolo;Ricotta;Miele;Frutta secca', 'Crema di ricotta;Cialde', 'Farcitura al momento in showcooking'),
  ],
  caffe: ['Specialty coffee · degustazione guidata di 3 tipologie', 'Alternative: orzo, dec, ginseng'],
  amari: 'Selezione di amari di erbe, fiori e radici di produzione artigianale',
  vermouth: 'Vermouth corner · bianco e rosso, premium selection',
};

/* ---------------------------------------------------------------- allestimenti */
/* sur = supplemento € a persona oltre iva (null = incluso); sx = nota/quotazione */
CAT.allestimenti = [
  { gruppo: 'Cerimonia', voci: [
    { id: 'cer_all', nome: 'Allestimento cerimonia', fisso: true, info: 'A cura della location · un’ora extra dalle 16:30 alle 18:00 (ora anticipo)' },
  ] },
  { gruppo: 'Aperitivo', voci: [
    { id: 'ap_bicchieri', nome: 'Bicchieri aperitivo', opts: [
      { id: 'supremo', nome: 'Linea Supremo', sur: 0 },
      { id: 'riedel', nome: 'Linea Riedel Ultrafine', sur: 5 },
    ] },
    { id: 'ap_salottini', nome: 'Salottini d’aperitivo (50% degli ospiti) + Tavoli Senior', opts: [
      { id: 'rattan', nome: 'Rattan bianco · divanetto, 2 poltroncine, tavolino', sur: 0 },
      { id: 'vimini', nome: 'Vimini · divanetto, 2 poltroncine, tavolino', sur: 0 },
      { id: 'bamboo', nome: 'Bamboo · divanetto, 2 sedie, tavolino', sur: 0 },
      { id: 'ferro', nome: 'Ferro battuto bianco · 2 sedie, tavolino', sur: 0 },
    ], info: 'Tavoli Senior = tavoli rotondi con tovaglia + sedie (stessa sedia di cerimonia e tavola)' },
    { id: 'ap_incl', nome: 'Inclusi nell’aperitivo', fisso: true, info: 'Banconi di design per isole e buvette · tavolini mangiainpiedi · finger food in vetro e porcellana plastic-free · ombrelloni sulle isole · caposala, camerieri e barman' },
  ] },
  { gruppo: 'A tavola', voci: [
    { id: 'tv_tavoli', nome: 'Tavoli', opts: [
      { id: 'rotondi', nome: 'Rotondi con tovagliato', sur: 0, nota: 'da 8 a 11 persone per tavolo, bambini e neonati compresi' },
      { id: 'imp_tov', nome: 'Imperiale con tovagliato', sur: 5 },
      { id: 'imp_leg', nome: 'Imperiale in legno senza tovaglia', sur: 5 },
      { id: 'mix', nome: 'Mix tavoli rotondi + imperiale con tovaglia', sur: 5 },
    ] },
    { id: 'tv_sedia', nome: 'Sedia a tavola (e cerimonia)', opts: [
      { id: 'chiav_b', nome: 'Chiavarina bianca (cuscino bianco)', sur: 0 },
      { id: 'chiav_d', nome: 'Chiavarina decapata (cuscino bianco/avorio)', sur: 0 },
      { id: 'cross', nome: 'Cross in legno naturale', sur: 0 },
      { id: 'parigina', nome: 'Parigina decapata (cuscino bianco/avorio)', sur: 0 },
      { id: 'trasp', nome: 'Sedia trasparente', sur: 3 },
    ] },
    { id: 'tv_tovaglia', nome: 'Colore tovaglia', color: true, opts: [
      { id: 'bianco', nome: 'Bianco ottico', hex: '#ffffff', sur: 0 },
      { id: 'avorio', nome: 'Avorio Matrix', hex: '#efe6d2', sur: 0 },
      { id: 'rosaantico', nome: 'Rosa antico', hex: '#d3a5a0', sur: 0 },
      { id: 'salvia', nome: 'Verde salvia', hex: '#9aa88a', sur: 0 },
      { id: 'rosso', nome: 'Rosso', hex: '#a3202b', sur: 0 },
      { id: 'bordeaux', nome: 'Bordeaux', hex: '#5e1a2b', sur: 0 },
      { id: 'blu', nome: 'Blu trama quadrata', hex: '#2c3e63', sur: 0 },
      { id: 'grigio', nome: 'Grigio', hex: '#8d9096', sur: 0 },
      { id: 'azzurro', nome: 'Azzurro lucido', hex: '#8fb4d8', sur: 0 },
      { id: 'oro', nome: 'Oro', hex: '#c9a54a', sur: 0 },
      { id: 'nero', nome: 'Nero', hex: '#1b1b1b', sur: 0 },
    ], info: 'Novità di colori e tessuti presso lo showroom' },
    { id: 'tv_tovaglioli', nome: 'Colore tovaglioli', opts: [
      { id: 'come', nome: 'Come la tovaglia', sur: 0 },
      { id: 'altro', nome: 'Altro colore rispetto alla tovaglia', sur: 0, testo: true },
    ] },
    { id: 'tv_bicchieri', nome: 'Bicchieri a tavola', opts: [
      { id: 'supremo', nome: 'Linea Supremo', sur: 0 },
      { id: 'melodia', nome: 'Linea Melodia', sur: 0 },
      { id: 'riedel', nome: 'Linea Riedel Ultrafine', sur: 3 },
    ] },
    { id: 'tv_posate', nome: 'Posate', opts: [
      { id: 'olimpo', nome: 'Olimpo · acciaio moderno', sur: 0 },
      { id: 'glamour', nome: 'Glamour · acciaio moderno', sur: 0 },
      { id: 'nera', nome: 'Nera lucida', sur: 0 },
      { id: 'oro', nome: 'Oro', sur: 5 },
    ] },
    { id: 'tv_sottopiatti', nome: 'Sottopiatti', opts: [
      { id: 'nessuno', nome: 'Nessun sottopiatto', sur: 0 },
      { id: 'rattan', nome: 'Rattan', sur: 0, quota: true },
      { id: 'vetro', nome: 'Vetro', sur: 0, quota: true },
      { id: 'vetro_oro', nome: 'Vetro filo oro', sur: 0, quota: true },
    ], info: 'Non indicato nell’Allegato B: eventuale quotazione dedicata · personalizzazioni in showroom' },
    { id: 'tv_incl', nome: 'Inclusi a tavola', fisso: true, info: 'Piatti di design in porcellana bianca · servizio impiattato a tavola · cambio posata ad ogni portata · caposala e camerieri' },
  ] },
  { gruppo: 'Torta nuziale', voci: [
    { id: 'tt_tavolo', nome: 'Tavolo per il taglio torta', opts: [
      { id: 'rot', nome: 'Tavolo rotondo 120/160 con tovaglia', sur: 0 },
      { id: 'rett', nome: 'Tavolo rettangolare 180×70 con tovaglia', sur: 0 },
      { id: 'legno', nome: 'Tavolo in legno', sur: 0, fix: 60, nota: '€ 60 + trasporto da quantificare in base alla location (incluso se scelto anche per la cerimonia)' },
    ] },
    { id: 'tt_sedute', nome: 'Sedute per il 25% degli ospiti', fisso: true, info: 'Di proprietà della location · stessa tipologia dell’aperitivo' },
  ] },
  { gruppo: 'Cocktail bar', voci: [
    { id: 'cb_all', nome: 'Allestimento cocktail bar', fisso: true, info: 'Bancone dedicato · bicchieri in vetro · sedute per il 25% degli ospiti (location) · barman e pulizia' },
  ] },
];

/* ---------------------------------------------------------------- add-on */
/* prezzo = € a persona oltre iva (ospiti adulti) · fisso = € forfait · nessuno = su preventivo */
CAT.addons = [
  { id: 'buv_ben', nome: 'Buvette di benvenuto in accompagnamento alla cerimonia', cat: 'Cerimonia',
    desc: 'Analcolico al bergamotto e acqua naturale e frizzante. Disponibile dalle 11:30 (pranzo, aperitivo ore 13:00) o dalle 16:30 (cena, aperitivo ore 18:00). In caso di anticipi si applicano i costi di extra time.',
    varianti: [{ id: 'base', nome: 'Solo buvette di benvenuto', prezzo: 5 }, { id: 'allest', nome: 'Buvette + allestimento cerimonia (tavolo celebrante con tovaglia + sedute per il 40% degli ospiti)', prezzo: 9 }],
    ricetta: ['Analcolico al bergamotto', 'Acqua naturale e frizzante'] },
  { id: 'cocktail', nome: 'Cocktail bar · formula illimitata open bar', cat: 'Serale',
    desc: 'Carta: cocktail d’autore, grandi classici, analcolici. Bancone dedicato, bicchieri in vetro, barman e pulizia. Calcolato sulla totalità degli ospiti adulti. Con il cocktail bar sconto di € 10 a persona dal 101° ospite.',
    varianti: [{ id: '3h', nome: '3 ore · 18:00–21:00 (pranzo) / 23:00–02:00 (cena)', prezzo: 15 }, { id: '4h', nome: '4 ore · 18:00–22:00 (pranzo) / 23:00–03:00 (cena)', prezzo: 20 }],
    ricetta: ['Spirits e liquori per carta cocktail', 'Mixer e soft drink', 'Ghiaccio', 'Frutta e garnish', 'Bicchieri in vetro'] },
  { id: 'salato', nome: 'Corner salato in box · in accompagnamento al cocktail bar', cat: 'Serale',
    desc: 'Tre soluzioni a scelta.',
    varianti: [
      { id: 's1', nome: 'Soluzione 1 · salatini, pizzette, focacce, pop corn', prezzo: 5, items: ['Salatini assortiti', 'Pizzette', 'Focacce', 'Pop corn'] },
      { id: 's2', nome: 'Soluzione 2 · + panzerotti e tramezzini', prezzo: 8, items: ['Salatini assortiti', 'Pizzette', 'Focacce', 'Pop corn', 'Tramezzini assortiti', 'Panzerotti'] },
      { id: 's3', nome: 'Soluzione 3 · + mozzarelle in carrozza, arancini, cuoppo di patate', prezzo: 12, items: ['Salatini assortiti', 'Pizzette', 'Focacce', 'Pop corn', 'Tramezzini assortiti', 'Panzerotti', 'Mozzarelle in carrozza', 'Arancini', 'Cuoppo di patate rustiche alle erbe con ketchup artigianale'] },
    ] },
  { id: 'confettata', nome: 'Confettata & candies', cat: 'Dolci',
    desc: 'Gusti a scelta tra i nostri assortimenti.',
    varianti: [{ id: 'c5', nome: '5 gusti di confetti', prezzo: 8, items: ['Confetti · 5 gusti'] }, { id: 'c33', nome: '3 gusti di confetti + 3 tipologie di candies', prezzo: 8, items: ['Confetti · 3 gusti', 'Candies · 3 tipologie'] }] },
  { id: 'sigar', nome: 'Sigar corner · servizio di 1 ora', cat: 'Serale',
    desc: '40 sigari (italiani, cubani, aromatizzati – 5 tipologie), rum e whiskey (3 tipologie), cioccolato fondente. Quotazione per un minimo di 40 persone (€ 600).',
    prezzo: 15, minPers: 40, ricetta: ['Sigari (5 tipologie)', 'Rum (3 tipologie)', 'Whiskey', 'Cioccolato fondente'] },
  { id: 'tisane', nome: 'Angolo tisane · servizio di 1 ora', cat: 'Dolci',
    desc: 'Tisane fredde (2 aromaticità di erbe stagionali) e calde (relax, digestiva, depurativa). Tazze in vetro termico, banconi di design.',
    prezzo: 5, ricetta: ['Erbe per tisane fredde (2 aromaticità)', 'Tisane calde: relax, digestiva, depurativa', 'Tazze in vetro termico'] },
  { id: 'imperiale', nome: 'Tavolo imperiale', cat: 'Tavolo', link: 'tv_tavoli',
    desc: 'Gestito nella sezione Allestimento (Tavoli). In legno senza tovaglia oppure con tovagliato a scelta tra i nostri colori: + € 5,00 a persona.', prezzo: 5 },
  { id: 'gelati', nome: 'Carretto dei gelati', cat: 'Dolci', desc: 'Soggetto a quotazione personalizzata.', quota: true, ricetta: ['Gelati (gusti da definire)', 'Coni e coppette'] },
  { id: 'pizza', nome: 'Live pizza', cat: 'Serale', desc: 'Soggetto a quotazione personalizzata.', quota: true, ricetta: ['Impasto per pizza', 'Pomodoro', 'Mozzarella', 'Condimenti (da definire)'] },
  { id: 'extratime', nome: 'Ora anticipo / extra time orario', cat: 'Cerimonia', desc: 'Costi di extra time orario in caso di anticipi o prolungamenti (non indicati in preventivo: quotare).', quota: true },
];

/* ---------------------------------------------------------------- preventivo (listini) */
CAT.listiniDefault = [
  { id: 'castella', nome: 'La Castella (San Secondo di Pinerolo)', listino: 179, sabato: 145, feriale: 140,
    minAdulti: 100, scontoOltre: 10, scontoMancante: 60, minGarantito: 60,
    spazi: [
      { momento: 'Cerimonia', a: 'Boschetto', b: 'Salone' },
      { momento: 'Aperitivo', a: 'Bosco', b: 'Sale interne' },
      { momento: 'Cena', a: 'Fronte villa / Fienile', b: 'Fienile' },
      { momento: 'Taglio torta', a: 'Bosco', b: 'Salone' },
      { momento: 'Caffè e dolci / Lounge bar', a: 'Bosco', b: 'Salone' },
      { momento: 'Cocktail bar', a: 'Cantina', b: 'Cantina' },
    ] },
  { id: 'generico', nome: 'Altra location (tariffa listino)', listino: 179, sabato: 179, feriale: 179,
    minAdulti: 100, scontoOltre: 10, scontoMancante: 60, minGarantito: 60,
    spazi: [
      { momento: 'Cerimonia', a: '', b: '' }, { momento: 'Aperitivo', a: '', b: '' }, { momento: 'Cena', a: '', b: '' },
      { momento: 'Taglio torta', a: '', b: '' }, { momento: 'Caffè e dolci / Lounge bar', a: '', b: '' }, { momento: 'Cocktail bar', a: '', b: '' },
    ] },
];
