import { rankFor } from '../game/ranks';

export const SAVE_KEY = 'tower-duty/v1';

export interface MapStats {
  highscore: number;
  bestRank: number;
  flightTimeMs: number;
  maxInAir: number;
  landed: number;
}

export interface Prefs {
  sound: boolean;
  highlights: boolean;
  clouds: boolean;
  taxi: boolean;
  fastForwardOnStart: boolean;
  language: 'en';
  fullscreen: boolean;
}

export interface Save {
  maps: Record<string, MapStats>;
  landedTotal: number;
  prefs: Prefs;
  lastMap: number;
}

export interface GameResult {
  score: number;
  flightTimeMs: number;
  maxInAir: number;
}

export interface RecordOutcome {
  rank: number;
  newHighscore: boolean;
}

export const DEFAULT_PREFS: Prefs = {
  sound: false,
  highlights: true,
  clouds: true,
  taxi: true,
  fastForwardOnStart: false,
  language: 'en',
  fullscreen: false,
};

const EMPTY_STATS: MapStats = { highscore: 0, bestRank: 0, flightTimeMs: 0, maxInAir: 0, landed: 0 };

export function defaultSave(): Save {
  return {
    maps: {},
    landedTotal: 0,
    prefs: { ...DEFAULT_PREFS },
    lastMap: 0,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function num(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function parseStats(value: unknown): MapStats {
  const v = isRecord(value) ? value : {};
  return {
    highscore: num(v.highscore, 0),
    bestRank: num(v.bestRank, 0),
    flightTimeMs: num(v.flightTimeMs, 0),
    maxInAir: num(v.maxInAir, 0),
    landed: num(v.landed, 0),
  };
}

function parsePrefs(value: unknown): Prefs {
  const v = isRecord(value) ? value : {};
  return {
    sound: bool(v.sound, DEFAULT_PREFS.sound),
    highlights: bool(v.highlights, DEFAULT_PREFS.highlights),
    clouds: bool(v.clouds, DEFAULT_PREFS.clouds),
    taxi: bool(v.taxi, DEFAULT_PREFS.taxi),
    fastForwardOnStart: bool(v.fastForwardOnStart, DEFAULT_PREFS.fastForwardOnStart),
    language: 'en',
    fullscreen: bool(v.fullscreen, DEFAULT_PREFS.fullscreen),
  };
}

export function parseSave(raw: string | null): Save {
  const save = defaultSave();
  if (raw === null) return save;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return save;
  }
  if (!isRecord(data)) return save;
  if (isRecord(data.maps)) {
    for (const [id, stats] of Object.entries(data.maps)) save.maps[id] = parseStats(stats);
  }
  save.landedTotal = num(data.landedTotal, 0);
  save.prefs = parsePrefs(data.prefs);
  save.lastMap = num(isRecord(data.lastMap) ? data.lastMap.index : data.lastMap, 0);
  return save;
}

export function loadSave(storage: Storage): Save {
  try {
    return parseSave(storage.getItem(SAVE_KEY));
  } catch {
    return defaultSave();
  }
}

export function writeSave(storage: Storage, save: Save): void {
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    return;
  }
}

export function mapStats(save: Save, mapId: string): MapStats {
  return save.maps[mapId] ?? { ...EMPTY_STATS };
}

export function recordGame(save: Save, mapId: string, result: GameResult): RecordOutcome {
  const prev = mapStats(save, mapId);
  const rank = rankFor(mapId, result.score);
  save.maps[mapId] = {
    highscore: Math.max(prev.highscore, result.score),
    bestRank: Math.max(prev.bestRank, rank),
    flightTimeMs: prev.flightTimeMs + result.flightTimeMs,
    maxInAir: Math.max(prev.maxInAir, result.maxInAir),
    landed: prev.landed + result.score,
  };
  save.landedTotal += result.score;
  return { rank, newHighscore: result.score > prev.highscore };
}
