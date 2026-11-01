// Icone dell'app (Fondamenta 190; dal 1 novembre 2026, Stile 030, il logo «ZT con le tre zone» scelto da Ignazio):
// quadrato evergreen, tre cerchi nelle tinte di Nutrition, Training e Body che si fondono in «screen» (dove si
// incrociano diventano chiari, al centro quasi bianco) e sotto «ZT» in Syne ExtraBold, bianco osso.
// Disegnato pixel per pixel e scritto in PNG senza librerie (nel contenitore non ci sono né ImageMagick con SVG né Pillow).
//   node tools/icone/genera.js      → assets/icone/icona-{180,192,512}.png (angoli arrotondati, sfondo trasparente)
//                                     assets/icone/icona-maskable-{192,512}.png (quadrato pieno: Android lo ritaglia lui)
// Lo stesso disegno in SVG (viewBox 100; la fusione va su ogni cerchio, non sul gruppo):
//   <rect width="100" height="100" rx="22" fill="#2A7A6F"/>
//   <circle cx="50" cy="28" r="17" fill="#FAC775" style="mix-blend-mode: screen"/>
//   <circle cx="41" cy="43" r="17" fill="#B5D4F4" style="mix-blend-mode: screen"/>
//   <circle cx="59" cy="43" r="17" fill="#AFA9EC" style="mix-blend-mode: screen"/>
//   <text x="50" y="86" text-anchor="middle" font-family="Syne" font-weight="800" font-size="26" letter-spacing="-0.5" fill="#F5F3EE">ZT</text>
// Lo strumento non ha caratteri: «ZT» è una maschera a 1 bit del testo di quell'SVG, disegnata una volta da Chrome
// col Syne 800 a 16 pixel per unità (il 1 novembre 2026), compressa e messa qui come dati (MASCHERA_ZT). Per
// cambiare il testo si rifà quel render; per cambiare colori o cerchi basta cambiare i numeri qui sotto.
// Nelle icone «maskable» tutto il disegno è rimpicciolito a MASKABLE_SCALA attorno al centro: il bordo più lontano
// del disegno intero (gli angoli bassi di «ZT») sta a 46,3 unità dal centro, e nella maschera tonda di Android deve
// stare dentro 40, cioè l'80 per cento centrale. Campionamento 4×4 per pixel per i bordi morbidi.
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const FONDO = [0x2A, 0x7A, 0x6F];
const TESTO = [0xF5, 0xF3, 0xEE];
const CERCHI = [
  { cx: 0.50, cy: 0.28, r: 0.17, colore: [0xFA, 0xC7, 0x75] },   // Nutrition
  { cx: 0.41, cy: 0.43, r: 0.17, colore: [0xB5, 0xD4, 0xF4] },   // Training
  { cx: 0.59, cy: 0.43, r: 0.17, colore: [0xAF, 0xA9, 0xEC] },   // Body
];
const MASKABLE_SCALA = 0.86;
// La maschera di «ZT»: angolo in alto a sinistra in unità del viewBox (0..100), larghezza e altezza in pixel,
// pixel per unità, righe di bit da sinistra a destra (1 = dentro la lettera), compresse con deflate, in base64.
const MASCHERA_ZT = { x0: 22.4375, y0: 69.375, w: 907, h: 266, scala: 16, dati: 'eNrt281trEAURGEQi14SAqEQWjs0h+IQvPTi6eEEsH2r6iLL0mHN6NOUps/8SHNd1vWyLMtpPfLtQkRERERERERERERERERERERERERERERERERERERERERERPwlcfnhGrcP+//V7Wvprm+v+yfy/qB4P83rc+L9qNfynHjcgh8PilN8vcXi9vXZeEjcb8F/y3Pi1M5GLq7qqLG4a8FpEE/xbOSiGJxcVIOTi4c8aioab3CZuOmjhuKhBicWp/GpIRL14KTiboyaiada8VRc9eCE4pArnop6xVPRGjURneBkohOcTJze1xRf3JzgROLujRqI0wlOIq7mqL7oBScRveAkohecQBxecALxcEe1RfN3EV90g+OLbnB80Q2OLa7+qKa4u8GxxdMf1RNXOziu6AfHFf3guKIfHFPcklEt8fCDY4pBcDwxCY4nJsHxxDMa1RCj4FjiyEY1xDMJjiVGwXHELDiOmAXHEWc4qixuWXAMMQyOIWYVN8Q0OLqYj6qKaXB0MR9VFEcaHFmMgyOLacVlMQ+OKnaMqol5cESxITii2BAcUWwIjib2jKqIHcHRxJ5RFbEjOJLYEhxJbAmOJLYERxG7Rq2LPcFRxNlzNupiU3AEsSk4gnh2jVoWm4JTF0fX2SiLXcGpi1dTcMri1jdqUWwLTlmcfaPWxL7gVMW9LThVsS84RXHtC05RHJ2jlsTG4BTFxuDUxM7g1MSjMTg1cbaOWhGDfyIgIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIi/jHxEy6Tn/4=' };
const bitZT = zlib.inflateSync(Buffer.from(MASCHERA_ZT.dati, 'base64'));
const passoRiga = Math.ceil(MASCHERA_ZT.w / 8);
function dentroZT(x, y) {   // x, y in unità del viewBox 0..100
  const px = Math.floor((x - MASCHERA_ZT.x0) * MASCHERA_ZT.scala), py = Math.floor((y - MASCHERA_ZT.y0) * MASCHERA_ZT.scala);
  if (px < 0 || py < 0 || px >= MASCHERA_ZT.w || py >= MASCHERA_ZT.h) return false;
  return (bitZT[py * passoRiga + (px >> 3)] & (0x80 >> (px & 7))) !== 0;
}
// Fusione «screen», canale per canale: 1 − (1 − a)(1 − b). Due colori chiari danno un colore più chiaro.
function screen(a, b) { return a.map((v, i) => 255 - (255 - v) * (255 - b[i]) / 255); }
// Il colore in un punto (coordinate 0..1): le lettere sopra tutto; altrimenti il fondo fuso con ogni cerchio che lo contiene
function colore(x, y) {
  if (dentroZT(x * 100, y * 100)) return TESTO;
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
// scala < 1 rimpicciolisce il disegno attorno al centro (icone «maskable»)
function disegna(n, raggio, scala) {
  const img = Buffer.alloc(n * n * 4);
  const S = 4;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    let dentro = 0, somma = [0, 0, 0];
    for (let b = 0; b < S; b++) for (let a = 0; a < S; a++) {
      const x = (i + (a + 0.5) / S) / n, y = (j + (b + 0.5) / S) / n;
      if (!dentroSfondo(x, y, raggio)) continue;
      dentro++;
      const c = colore((x - 0.5) / scala + 0.5, (y - 0.5) / scala + 0.5);
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
for (const [nome, n, raggio, scala] of [['icona-180.png', 180, 0, 1], ['icona-192.png', 192, 0.22, 1], ['icona-512.png', 512, 0.22, 1], ['icona-maskable-192.png', 192, 0, MASKABLE_SCALA], ['icona-maskable-512.png', 512, 0, MASKABLE_SCALA]]) {
  const b = png(n, disegna(n, raggio, scala));
  fs.writeFileSync(path.join(out, nome), b);
  fatti.push(nome + ' ' + n + 'px ' + b.length + ' byte');
}
console.log(fatti.join('\n'));
