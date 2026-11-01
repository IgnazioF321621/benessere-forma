// Icone dell'app (Fondamenta 190; dal 1 novembre 2026, Stile 030, il logo «Le tre zone» scelto da Ignazio):
// fondo verde notte e tre cerchi nelle tinte di Nutrition, Training e Body che si fondono in «screen»
// (dove si incrociano diventano chiari, al centro quasi bianco). Disegnato pixel per pixel e scritto in PNG
// senza librerie (nel contenitore non ci sono né ImageMagick con SVG né Pillow).
//   node tools/icone/genera.js      → assets/icone/icona-{180,192,512}.png (angoli arrotondati, sfondo trasparente)
//                                     assets/icone/icona-maskable-{192,512}.png (quadrato pieno: Android lo ritaglia lui)
// Lo stesso disegno in SVG (viewBox 100, la fusione va su ogni cerchio, non sul gruppo):
//   <rect width="100" height="100" rx="22" fill="#14211E"/>
//   <circle style="mix-blend-mode:screen" cx="50" cy="39" r="21" fill="#FAC775"/>
//   <circle style="mix-blend-mode:screen" cx="39" cy="59" r="21" fill="#B5D4F4"/>
//   <circle style="mix-blend-mode:screen" cx="61" cy="59" r="21" fill="#AFA9EC"/>
// I cerchi stanno fra 18 e 82 su 100: dentro l'80% centrale, la zona sicura della maschera tonda di Android.
// Campionamento 4×4 per pixel per i bordi morbidi.
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const FONDO = [0x14, 0x21, 0x1E];
const CERCHI = [
  { cx: 0.50, cy: 0.39, r: 0.21, colore: [0xFA, 0xC7, 0x75] },   // Nutrition
  { cx: 0.39, cy: 0.59, r: 0.21, colore: [0xB5, 0xD4, 0xF4] },   // Training
  { cx: 0.61, cy: 0.59, r: 0.21, colore: [0xAF, 0xA9, 0xEC] },   // Body
];
// Fusione «screen», canale per canale: 1 − (1 − a)(1 − b). Due colori chiari danno un colore più chiaro.
function screen(a, b) { return a.map((v, i) => 255 - (255 - v) * (255 - b[i]) / 255); }
// Il colore in un punto (coordinate 0..1): il fondo, fuso con ogni cerchio che lo contiene
function colore(x, y) {
  let c = FONDO;
  for (const k of CERCHI) { const dx = x - k.cx, dy = y - k.cy; if (dx * dx + dy * dy <= k.r * k.r) c = screen(c, k.colore); }
  return c;
}
function dentroSfondo(x, y, raggio) {
  if (raggio <= 0) return true;
  const cx = Math.min(Math.max(x, raggio), 1 - raggio), cy = Math.min(Math.max(y, raggio), 1 - raggio);
  const dx = x - cx, dy = y - cy;
  return dx * dx + dy * dy <= raggio * raggio;
}
function disegna(n, raggio) {
  const img = Buffer.alloc(n * n * 4);
  const S = 4;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    let dentro = 0, somma = [0, 0, 0];
    for (let b = 0; b < S; b++) for (let a = 0; a < S; a++) {
      const x = (i + (a + 0.5) / S) / n, y = (j + (b + 0.5) / S) / n;
      if (!dentroSfondo(x, y, raggio)) continue;
      dentro++;
      const c = colore(x, y);
      somma[0] += c[0]; somma[1] += c[1]; somma[2] += c[2];
    }
    const o = (j * n + i) * 4;
    img[o] = dentro ? Math.round(somma[0] / dentro) : 0;
    img[o + 1] = dentro ? Math.round(somma[1] / dentro) : 0;
    img[o + 2] = dentro ? Math.round(somma[2] / dentro) : 0;
    img[o + 3] = Math.round(255 * dentro / (S * S));
  }
  return img;
}
function crc32(buf) {
  let c, crc = 0xFFFFFFFF;
  for (let n = 0; n < buf.length; n++) { c = (crc ^ buf[n]) & 0xFF; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}
function chunk(tipo, dati) {
  const len = Buffer.alloc(4); len.writeUInt32BE(dati.length);
  const td = Buffer.concat([Buffer.from(tipo, 'ascii'), dati]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(n, img) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(n, 0); ihdr.writeUInt32BE(n, 4); ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const righe = Buffer.alloc(n * (n * 4 + 1));
  for (let j = 0; j < n; j++) { righe[j * (n * 4 + 1)] = 0; img.copy(righe, j * (n * 4 + 1) + 1, j * n * 4, (j + 1) * n * 4); }
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(righe, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
const out = path.join(__dirname, '..', '..', 'assets', 'icone');
fs.mkdirSync(out, { recursive: true });
const fatti = [];
for (const [nome, n, raggio] of [['icona-180.png', 180, 0], ['icona-192.png', 192, 0.22], ['icona-512.png', 512, 0.22], ['icona-maskable-192.png', 192, 0], ['icona-maskable-512.png', 512, 0]]) {
  const b = png(n, disegna(n, raggio));
  fs.writeFileSync(path.join(out, nome), b);
  fatti.push(nome + ' ' + n + 'px ' + b.length + ' byte');
}
console.log(fatti.join('\n'));
