/* Backend: funzione serverless Netlify (/api) con archivio Netlify Blobs.
   Lasciando `api` vuoto l'app funziona in modalità locale (dati solo nel browser). */
window.LASTELLA_CONFIG = { api: location.protocol.startsWith('http') ? '/api' : '' };
