#!/usr/bin/env node
// Genera la coppia di chiavi VAPID per le notifiche (Notifiche 170). Da lanciare in locale, UNA volta, al rilascio:
//
//   node tools/vapid/genera.js
//
// Stampa le due chiavi in base64url (pubblica: 65 byte, punto non compresso; privata: 32 byte) e i comandi
// per metterle nel Worker. NON scrive nessun file e niente finisce nel repo: la chiave privata va solo in
// `wrangler secret put` (e, per le prove in locale, in worker/.dev.vars, che git ignora). La pubblica la
// legge l'app dal Worker (GET /push-chiave): non va copiata nel codice.
//
// Se la coppia cambia, ogni telefono iscritto va iscritto di nuovo: le iscrizioni vecchie rispondono 401/403 e il
// giro delle ore le cancella al primo avviso; l'app si iscrive di nuovo da sola alla prima apertura (pushRiallinea). Per questo si genera una volta sola e si conserva la privata in
// un posto sicuro (il gestore delle password di Ignazio), mai in Evernote né in git.
const { createECDH } = require('node:crypto');
const b64url = (b) => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const k = createECDH('prime256v1');
k.generateKeys();
const pub = b64url(k.getPublicKey()), priv = b64url(k.getPrivateKey());
if (k.getPublicKey().length !== 65 || k.getPrivateKey().length !== 32) { console.error('chiavi di lunghezza inattesa, riprova'); process.exit(1); }
console.log(`Chiave pubblica (VAPID_PUBLIC_KEY, 65 byte):\n${pub}\n`);
console.log(`Chiave privata (VAPID_PRIVATE_KEY, 32 byte) — solo nel Worker e nel gestore delle password:\n${priv}\n`);
console.log('Nel Worker (da worker/), una chiave per comando, incollando il valore quando lo chiede:');
console.log('  wrangler secret put VAPID_PUBLIC_KEY');
console.log('  wrangler secret put VAPID_PRIVATE_KEY');
console.log('  wrangler secret put VAPID_SUBJECT      # mailto:ignazio.f@me.com (il contatto che i servizi push vedono)');
console.log('\nPer le prove in locale (wrangler dev), in worker/.dev.vars:');
console.log(`  VAPID_PUBLIC_KEY=${pub.slice(0, 8)}…\n  VAPID_PRIVATE_KEY=…\n  VAPID_SUBJECT=mailto:ignazio.f@me.com`);
