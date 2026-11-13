import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync, existsSync, renameSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const outDir = resolve(
  process.argv[2] ?? resolve(dirname(fileURLToPath(import.meta.url)), '../public/icons'),
);

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePNG(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const idat = deflateSync(raw);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

const BACKGROUND = [0xff, 0xd0, 0x2e];
const INK = [0x15, 0x13, 0x0a];
const SAMPLES = 4;
const PLANE_HALF = [
  [1, 0],
  [0.86, 0.13],
  [0.3, 0.16],
  [0.02, 0.95],
  [-0.3, 0.95],
  [-0.14, 0.16],
  [-0.62, 0.14],
  [-0.8, 0.48],
  [-1, 0.48],
  [-0.92, 0],
];

function planeOutline(size, contentScale) {
  const mirrored = PLANE_HALF.slice(1, -1)
    .reverse()
    .map(([x, y]) => [x, -y]);
  const reach = size * 0.36 * contentScale;
  const turn = -Math.PI / 4;
  const cos = Math.cos(turn);
  const sin = Math.sin(turn);
  return [...PLANE_HALF, ...mirrored].map(([x, y]) => [size / 2 + (x * cos - y * sin) * reach, size / 2 + (x * sin + y * cos) * reach]);
}

function inside(polygon, px, py) {
  let hit = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

function coverage(polygon, x, y) {
  let hits = 0;
  for (let sy = 0; sy < SAMPLES; sy++) {
    for (let sx = 0; sx < SAMPLES; sx++) {
      if (inside(polygon, x + (sx + 0.5) / SAMPLES, y + (sy + 0.5) / SAMPLES)) hits++;
    }
  }
  return hits / (SAMPLES * SAMPLES);
}

function drawIcon(size, contentScale = 1) {
  const rgba = Buffer.alloc(size * size * 4);
  const plane = planeOutline(size, contentScale);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const t = coverage(plane, x, y);
      for (let c = 0; c < 3; c++) rgba[i + c] = Math.round(BACKGROUND[c] + (INK[c] - BACKGROUND[c]) * t);
      rgba[i + 3] = 255;
    }
  }
  return rgba;
}

function writeAsset(path, data) {
  mkdirSync(dirname(path), { recursive: true });
  if (existsSync(path)) {
    const archive = resolve(dirname(path), '.archive');
    mkdirSync(archive, { recursive: true });
    const name = path.slice(dirname(path).length + 1);
    let destination = resolve(archive, name);
    let suffix = 1;
    while (existsSync(destination)) destination = resolve(archive, `${name}.${suffix++}`);
    renameSync(path, destination);
  }
  writeFileSync(path, data);
}

function favicon() {
  const sizes = [16, 32, 48];
  const header = Buffer.alloc(6 + sizes.length * 16);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(sizes.length, 4);
  let offset = header.length;
  const images = sizes.map((size, index) => {
    const png = encodePNG(size, size, drawIcon(size));
    const entry = 6 + index * 16;
    header[entry] = size;
    header[entry + 1] = size;
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(png.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += png.length;
    return png;
  });
  return Buffer.concat([header, ...images]);
}

const FONT = Object.fromEntries(Object.entries({
  A: '01110 10001 10001 11111 10001 10001 10001',
  D: '11110 10001 10001 10001 10001 10001 11110',
  E: '11111 10000 10000 11110 10000 10000 11111',
  F: '11111 10000 10000 11110 10000 10000 10000',
  H: '10001 10001 10001 11111 10001 10001 10001',
  I: '11111 00100 00100 00100 00100 00100 11111',
  K: '10001 10010 10100 11000 10100 10010 10001',
  L: '10000 10000 10000 10000 10000 10000 11111',
  N: '10001 11001 11001 10101 10011 10011 10001',
  O: '01110 10001 10001 10001 10001 10001 01110',
  P: '11110 10001 10001 11110 10000 10000 10000',
  R: '11110 10001 10001 11110 10100 10010 10001',
  S: '01111 10000 10000 01110 00001 00001 11110',
  T: '11111 00100 00100 00100 00100 00100 00100',
  U: '10001 10001 10001 10001 10001 10001 01110',
  W: '10001 10001 10001 10101 10101 10101 01010',
  Y: '10001 10001 01010 00100 00100 00100 00100',
}).map(([letter, rows]) => [letter, rows.split(' ')]));

function socialCard() {
  const width = 1200;
  const height = 630;
  const rgba = Buffer.alloc(width * height * 4);
  const plane = planeOutline(300, 1).map(([x, y]) => [x + 790, y + 165]);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const radius = Math.hypot(x - 940, y - 315);
      const grid = x % 60 === 0 || y % 60 === 0;
      const ring = [140, 220, 300].some((size) => Math.abs(radius - size) < 1.5);
      const color = y >= 614 ? BACKGROUND : ring ? [68, 73, 65] : grid ? [27, 34, 42] : [17, 21, 26];
      const blend = coverage(plane, x, y);
      const offset = (y * width + x) * 4;
      for (let channel = 0; channel < 3; channel++) {
        rgba[offset + channel] = Math.round(color[channel] + (BACKGROUND[channel] - color[channel]) * blend);
      }
      rgba[offset + 3] = 255;
    }
  }
  function text(label, left, top, scale, color) {
    for (const [index, letter] of [...label].entries()) {
      if (letter === ' ') continue;
      const rows = FONT[letter];
      if (!rows) throw new Error(`Missing glyph: ${letter}`);
      rows.forEach((row, rowIndex) => {
        [...row].forEach((pixel, column) => {
          if (pixel !== '1') return;
          for (let dy = 0; dy < scale; dy++) {
            for (let dx = 0; dx < scale; dx++) {
              const offset = ((top + rowIndex * scale + dy) * width + left + (index * 6 + column) * scale + dx) * 4;
              color.forEach((value, channel) => { rgba[offset + channel] = value; });
            }
          }
        });
      });
    }
  }
  text('TOWER', 72, 132, 16, [244, 242, 236]);
  text('DUTY', 72, 272, 16, BACKGROUND);
  text('DRAW PATHS  LAND PLANES', 76, 432, 4, [244, 242, 236]);
  text('FREE TO PLAY   WORKS OFFLINE', 76, 494, 3, [154, 163, 173]);
  return encodePNG(width, height, rgba);
}

writeAsset(resolve(outDir, 'icon-192.png'), encodePNG(192, 192, drawIcon(192)));
writeAsset(resolve(outDir, 'icon-512.png'), encodePNG(512, 512, drawIcon(512)));
writeAsset(resolve(outDir, 'maskable-512.png'), encodePNG(512, 512, drawIcon(512, 0.78)));
writeAsset(resolve(outDir, 'apple-touch-icon.png'), encodePNG(180, 180, drawIcon(180)));
const publicDir = resolve(outDir, '..');
writeAsset(resolve(publicDir, 'favicon.ico'), favicon());
writeAsset(resolve(publicDir, 'favicon.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#ffd02e"/><polygon points="${planeOutline(64, 1).map((point) => point.join(',')).join(' ')}" fill="#15130a"/></svg>\n`);
writeAsset(resolve(publicDir, 'social-card.png'), socialCard());
console.log('icons written to', outDir);
