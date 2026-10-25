# La Stella · Gestionale eventi

CRM per La Stella Catering (New Concept Banqueting), nello stile delle brochure Diamante 2026.
App statica (HTML/CSS/JS, nessun build): apri `index.html` oppure servi la cartella (`python3 -m http.server`).
In produzione (Netlify) i dati stanno su **Netlify Blobs** tramite la funzione `netlify/functions/api.mts`: login con password, team con approvazione, sincronizzazione tra colleghi (conflitti uniti per sezione, aggiornamenti ogni ~5 s). Aperto da file o con `LASTELLA_CONFIG.api` vuoto funziona in locale (dati nel browser).
Prova in locale con backend incluso: `node tools/dev-server.mjs` (dati in memoria). Il primo utente registrato diventa amministratore; gli altri vanno approvati da Impostazioni → Team.

## Novità (ultima versione)
- **Dashboard**: eventi del mese + calendario, totale preventivato e eventi confermati per anno in corso / futuro, rate in scadenza.
- **Committenti 1/2** (il 1° obbligatorio con telefono ed email: blocca l'avanzamento), **calendario** con date occupate (confermati) non selezionabili e preventivi non confermati in giallo.
- **Scadenze e scadenziario** calcolati dalla data della cerimonia (regole del contratto, modificabili in Impostazioni).
- **Impostazioni**: listini, location con Piano A/B, add-on aggiungibili/eliminabili, costo pasto staff, bambini a € 80.
- **Catalogo menù per anno**: isole, piatti, dolci, bevande e allestimenti creabili; ogni evento usa il catalogo dell'anno della sua data.
- **Customizzazioni**: ogni scostamento da listino/catalogo (spazi, extra, richieste speciali…) è segnalato.

## Sezioni
1. **Evento** – questionario (quando, dove, quanti, spazi Piano A/B), **invitati** (import Excel, icone di allergie / intolleranze / diete), **tavoli e mappa** (tondo/rettangolare, drag & drop, tooltip con tutte le particolarità).
2. **Menù** – isole d'aperitivo (3 show-cooking + 2 a passaggio), buvette, portate a tavola (formule 3/4 ricette, menù consigliati), vini, dessert, lounge/piccola pasticceria, **richieste speciali**.
3. **Allestimento** – tutte le scelte dell'Allegato B (bicchieri, sedute, tavoli, sedie, tovaglie, tovaglioli, posate, sottopiatti, torta) con spunta "scelta" e "confermata dal cliente" e scadenza.
4. **Add-on** – buvette di benvenuto, cocktail bar, corner salato, confettata, sigar corner, tisane, gelati, live pizza…
5. **Economics** – preventivo live con la logica del listino Diamante (sabato/feriale, sconto dal 101° con cocktail bar, −60 € per ospite sotto i 100, supplementi a persona), stampa/PDF ed export Excel.
6. **Ricettario** – ricette dedotte dalle scelte, con check di materie prime / semilavorati / composizione del piatto e lista acquisti aggregata.

## Excel per i clienti
`template/Invitati_e_Tavoli_La_Stella.xlsx` (foglio *Invitati*, foglio *Tavoli*, foglio *Leggimi*).
`esempio/Esempio_compilato.xlsx` è un file di prova con invitati fittizi. Entrambi si rigenerano con `python3 tools/make_excel.py`.

## Da verificare
- Prezzo bambini/neonati (non presenti nel preventivo, default 0) – in Impostazioni.
- Le ricette sono **bozze** ricavate dalle descrizioni del menù, senza grammature: le completa lo chef.
- Il listino è quello del preventivo del 2 dicembre 2025 (La Castella); altri listini si aggiungono/modificano in Impostazioni.
