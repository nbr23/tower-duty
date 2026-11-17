import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas } from '@napi-rs/canvas';
import { createServer } from 'vite';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(process.argv[2] ?? resolve(root, 'public/cards'));

function writeImage(path, data) {
  if (existsSync(path)) {
    if (readFileSync(path).equals(data)) return;
    const archive = resolve(dirname(path), '.archive');
    mkdirSync(archive, { recursive: true });
    let destination = resolve(archive, basename(path));
    for (let suffix = 1; existsSync(destination); suffix++) {
      destination = resolve(archive, `${basename(path, '.jpg')}-${suffix}.jpg`);
    }
    renameSync(path, destination);
  }
  writeFileSync(path, data);
}

const server = await createServer({
  root,
  configFile: false,
  appType: 'custom',
  logLevel: 'error',
  server: { middlewareMode: true, ws: false, watch: null },
});

try {
  const { CARD_WIDTH, CARD_HEIGHT, drawShareCard } = await server.ssrLoadModule('/src/render/shareCard.ts');
  const { MAP_SELECTOR } = await server.ssrLoadModule('/src/config/maps.ts');
  const { buildWorld } = await server.ssrLoadModule('/src/game/world.ts');
  mkdirSync(outDir, { recursive: true });
  for (const map of MAP_SELECTOR) {
    const world = buildWorld(map);
    const canvas = createCanvas(CARD_WIDTH, CARD_HEIGHT);
    drawShareCard(canvas.getContext('2d'), world, null);
    writeImage(resolve(outDir, `${map.id}.jpg`), canvas.toBuffer('image/jpeg', 85));
  }
  console.log(`${MAP_SELECTOR.length} cards written to ${outDir}`);
} finally {
  await server.close();
}
