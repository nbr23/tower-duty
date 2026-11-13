import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas } from '@napi-rs/canvas';
import { createServer } from 'vite';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(process.argv[2] ?? resolve(root, 'public/cards'));

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
    const canvas = createCanvas(CARD_WIDTH, CARD_HEIGHT);
    drawShareCard(canvas.getContext('2d'), buildWorld(map), null);
    writeFileSync(resolve(outDir, `${map.id}.jpg`), canvas.toBuffer('image/jpeg', 85));
  }
  console.log(`${MAP_SELECTOR.length} cards written to ${outDir}`);
} finally {
  await server.close();
}
