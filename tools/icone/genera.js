// Icone dell'app (Fondamenta 190): quadrato evergreen con «ZT» in bianco, disegnato pixel per pixel e
// scritto in PNG senza librerie (nel contenitore non ci sono né ImageMagick con SVG né Pillow).
//   node tools/icone/genera.js      → assets/icone/icona-{180,192,512}.png (angoli arrotondati, sfondo trasparente)
//                                     assets/icone/icona-maskable-{192,512}.png (quadrato pieno: Android lo ritaglia lui)
// Le lettere sono tratti geometrici (Z = due barre e una diagonale, T = barra e gambo), non un carattere:
// così l'icona è la stessa su ogni macchina. Campionamento 4×4 per pixel per i bordi morbidi.
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const VERDE = [0x2A, 0x7A, 0x6F];

// Distanza di un punto da un segmento, per la diagonale della Z
function distSeg(px, py, ax, ay, bx, by) {
  const vx = bx - ax, vy = by - ay, wx = px - ax, wy = py - ay;
  const t = Math.max(0, Math.min(1, (wx * vx + wy * vy) / (vx * vx + vy * vy)));
  const dx = px - (ax + t * vx), dy = py - (ay + t * vy);
  return Math.sqrt(dx * dx + dy * dy);
}
// Coordinate normalizzate 0..1. Lettere nel riquadro centrale (zona sicura delle icone «maskable»: 80%, qui 60%).
function dentroLettere(x, y) {
  const sp = 0.145;                 // spessore dei tratti
  // Z: da 0.14 a 0.47 in larghezza, 0.26 a 0.74 in altezza
  const zL = 0.13, zR = 0.47, top = 0.27, bot = 0.73;
  if (x >= zL && x <= zR && y >= top && y <= top + sp) return true;           // barra alta
  if (x >= zL && x <= zR && y >= bot - sp && y <= bot) return true;           // barra bassa
  if (x >= zL && x <= zR && y >= top && y <= bot && distSeg(x, y, zR - sp * 0.5, top + sp * 0.5, zL + sp * 0.5, bot - sp * 0.5) <= sp * 0.5) return true; // diagonale, dentro il riquadro della Z
  // T: da 0.53 a 0.87
  const tL = 0.53, tR = 0.87, tc = (tL + tR) / 2;
  if (x >= tL && x <= tR && y >= top && y <= top + sp) return true;           // barra
  if (Math.abs(x - tc) <= sp * 0.5 && y >= top && y <= bot) return true;       // gambo
  return false;
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
    let sfondo = 0, lettera = 0;
    for (let b = 0; b < S; b++) for (let a = 0; a < S; a++) {
      const x = (i + (a + 0.5) / S) / n, y = (j + (b + 0.5) / S) / n;
      if (dentroSfondo(x, y, raggio)) { sfondo++; if (dentroLettere(x, y)) lettera++; }
    }
    const alpha = sfondo / (S * S), bianco = sfondo ? lettera / sfondo : 0;
    const o = (j * n + i) * 4;
    img[o] = Math.round(VERDE[0] + (255 - VERDE[0]) * bianco);
    img[o + 1] = Math.round(VERDE[1] + (255 - VERDE[1]) * bianco);
    img[o + 2] = Math.round(VERDE[2] + (255 - VERDE[2]) * bianco);
    img[o + 3] = Math.round(255 * alpha);
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
