# La Stella · Gestionale eventi

CRM per La Stella Catering (New Concept Banqueting), nello stile delle brochure Diamante 2026.
App statica (HTML/CSS/JS, nessun build): apri `index.html` oppure servi la cartella (`python3 -m http.server`).
I dati stanno nel `localStorage` del browser; backup/ripristino JSON dalle **Impostazioni**.

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
- Aliquota IVA (default 10 %), prezzo bambini/neonati (non presenti nel preventivo, default 0) – in Impostazioni.
- Le ricette sono **bozze** ricavate dalle descrizioni del menù, senza grammature: le completa lo chef.
- Il listino è quello del preventivo del 2 dicembre 2025 (La Castella); altri listini si aggiungono/modificano in Impostazioni.
