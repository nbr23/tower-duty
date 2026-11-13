import { describe, expect, it } from 'vitest';
import { MAP_SELECTOR, type MapDef } from '../config/maps';
import { spriteFor } from '../render/aircraft';
import { mulberry32 } from './rng';
import { createDirector, tickSpawn, type SpawnResult } from './spawn';

const SPAWNS = 400;
const CAMEO_SALT = 0x51ed;

function run(map: MapDef, seed: number, cameoChance: number): SpawnResult[] {
  const director = createDirector(map, mulberry32(seed), 0, mulberry32(seed ^ CAMEO_SALT));
  director.cameoChance = cameoChance;
  const spawns: SpawnResult[] = [];
  while (spawns.length < SPAWNS) {
    const spawn = tickSpawn(director, director.nextSpawnAt, [], true);
    if (spawn !== null) spawns.push(spawn);
  }
  return spawns;
}

describe('cameos', () => {
  it.each(MAP_SELECTOR)('$id dresses only regular arrivals of strips that list cameos', (map) => {
    for (const { aircraft, special } of run(map, 7, 1)) {
      const cameos = map.strips[aircraft.stripIndex]!.cameos;
      if (special || cameos === undefined) expect(aircraft.cameo).toBeUndefined();
      else expect(cameos).toContain(aircraft.cameo);
    }
  });

  it.each(MAP_SELECTOR)('$id spawns identically whether or not cameos roll', (map) => {
    const plain = run(map, 11, 0).map(({ aircraft, slot }) => [aircraft.stripIndex, slot, aircraft.position, aircraft.variant]);
    const dressed = run(map, 11, 1).map(({ aircraft, slot }) => [aircraft.stripIndex, slot, aircraft.position, aircraft.variant]);
    expect(dressed).toEqual(plain);
  });

  it('stays rare at the default chance', () => {
    const director = createDirector(MAP_SELECTOR[0]!, mulberry32(3), 0, mulberry32(4));
    let dressed = 0;
    for (let i = 0; i < 4000; i++) {
      if (tickSpawn(director, director.nextSpawnAt, [], true)?.aircraft.cameo !== undefined) dressed++;
    }
    expect(dressed).toBeGreaterThan(0);
    expect(dressed).toBeLessThan(80);
  });

  it('has a sprite for every cameo a strip lists', () => {
    for (const map of MAP_SELECTOR) {
      const fallback = spriteFor(map, '', 0);
      for (const cameo of map.strips.flatMap((strip) => strip.cameos ?? [])) {
        expect(spriteFor(map, cameo, 0), `${map.id}: ${cameo}`).not.toBe(fallback);
      }
    }
  });
});
