/**
 * Génération des icônes de la PWA.
 *
 *   node scripts/generate-icons.mjs
 *
 * Le motif — une maison, puisque « minka » (民家) désigne la maison
 * traditionnelle japonaise — est dessiné par calcul plutôt que stocké en
 * binaire : changer la couleur de marque ou la taille se fait en modifiant
 * deux constantes, sans logiciel de dessin.
 *
 * L'encodeur PNG tient en une trentaine de lignes (aucune dépendance) : une
 * image RGBA sans filtrage, compressée par zlib.
 */

import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const publicDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');

const BRAND = [0x0d, 0x7c, 0x66]; // --color-brand-600
const WHITE = [0xff, 0xff, 0xff];

// --- Encodeur PNG -----------------------------------------------------------

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([length, body, crc]);
}

function encodePng(size, rgba) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // 8 bits par canal
  header[9] = 6; // RGBA

  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y += 1) {
    raw[y * (stride + 1)] = 0; // type de filtre : aucun
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// --- Géométrie (coordonnées normalisées 0 → 1) ------------------------------

function inRoundedSquare(x, y, radius) {
  if (x < 0 || x > 1 || y < 0 || y > 1) return false;
  // On ne teste la distance au centre de l'arrondi que dans les quatre coins.
  const dx = x < radius ? radius - x : x > 1 - radius ? x - (1 - radius) : 0;
  const dy = y < radius ? radius - y : y > 1 - radius ? y - (1 - radius) : 0;
  return dx * dx + dy * dy <= radius * radius;
}

function inTriangle(px, py, [ax, ay], [bx, by], [cx, cy]) {
  const sign = (x1, y1, x2, y2, x3, y3) => (x1 - x3) * (y2 - y3) - (x2 - x3) * (y1 - y3);
  const d1 = sign(px, py, ax, ay, bx, by);
  const d2 = sign(px, py, bx, by, cx, cy);
  const d3 = sign(px, py, cx, cy, ax, ay);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}

/** Silhouette de la maison, dans sa propre boîte normalisée. */
function inHouse(x, y) {
  if (x < 0 || x > 1 || y < 0 || y > 1) return false;

  // Toit débordant, comme celui d'une minka.
  const roof = inTriangle(x, y, [0.5, 0.02], [0.0, 0.46], [1.0, 0.46]);
  // Murs, en retrait sous le toit.
  const walls = x >= 0.15 && x <= 0.85 && y >= 0.44 && y <= 0.98;
  // Porte évidée : elle laisse réapparaître le fond.
  const door = x >= 0.4 && x <= 0.6 && y >= 0.64 && y <= 0.98;

  return (roof || walls) && !door;
}

// --- Composition ------------------------------------------------------------

/**
 * @param {number} size        côté en pixels
 * @param {object} options
 * @param {number} options.radius     arrondi du fond (0 = carré, 0.5 = cercle)
 * @param {number} options.motifScale part de l'image occupée par la maison
 */
function drawIcon(size, { radius, motifScale }) {
  const rgba = Buffer.alloc(size * size * 4);
  const SAMPLES = 3; // 3×3 sous-pixels : suffit à lisser les diagonales du toit
  const motifOffset = (1 - motifScale) / 2;

  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      let bg = 0;
      let fg = 0;

      for (let sy = 0; sy < SAMPLES; sy += 1) {
        for (let sx = 0; sx < SAMPLES; sx += 1) {
          const x = (px + (sx + 0.5) / SAMPLES) / size;
          const y = (py + (sy + 0.5) / SAMPLES) / size;

          if (!inRoundedSquare(x, y, radius)) continue;
          bg += 1;

          const hx = (x - motifOffset) / motifScale;
          // Motif très légèrement remonté : optiquement mieux centré que le
          // centrage géométrique strict.
          const hy = (y - motifOffset + 0.012) / motifScale;
          if (inHouse(hx, hy)) fg += 1;
        }
      }

      const total = SAMPLES * SAMPLES;
      const alpha = bg / total;
      const mix = bg === 0 ? 0 : fg / bg;

      const offset = (py * size + px) * 4;
      for (let channel = 0; channel < 3; channel += 1) {
        rgba[offset + channel] = Math.round(BRAND[channel] * (1 - mix) + WHITE[channel] * mix);
      }
      rgba[offset + 3] = Math.round(alpha * 255);
    }
  }

  return encodePng(size, rgba);
}

// --- Écriture ---------------------------------------------------------------

mkdirSync(publicDir, { recursive: true });

const files = [
  // Icônes classiques : coins arrondis dessinés par nos soins.
  ['icon-192.png', drawIcon(192, { radius: 0.22, motifScale: 0.6 })],
  ['icon-512.png', drawIcon(512, { radius: 0.22, motifScale: 0.6 })],
  // Maskable : fond carré plein et motif réduit, car Android recadre l'icône
  // dans la forme du système (cercle, goutte, squircle…).
  ['icon-maskable-512.png', drawIcon(512, { radius: 0, motifScale: 0.46 })],
  // iOS applique lui-même son masque : on lui fournit un carré plein.
  ['apple-touch-icon.png', drawIcon(180, { radius: 0, motifScale: 0.6 })],
];

for (const [name, buffer] of files) {
  writeFileSync(path.join(publicDir, name), buffer);
  console.log(`${name} — ${(buffer.length / 1024).toFixed(1)} Ko`);
}

// Le favicon reste en SVG : net à toutes les tailles, et quelques centaines
// d'octets seulement.
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="22" fill="#0d7c66"/>
  <path d="M50 22 L18 50 L30 50 L30 78 L44 78 L44 62 L56 62 L56 78 L70 78 L70 50 L82 50 Z" fill="#fff"/>
</svg>
`;
writeFileSync(path.join(publicDir, 'favicon.svg'), favicon);
console.log('favicon.svg');
