import { place, type Frame } from '../game/geometry';

export interface ParkSlot {
  cx: number;
  cy: number;
  r: number;
}

export interface Strip {
  name: string;
  weight: number;
  type: number;
  speed: number;
  radius: number;
  color: number;
  turnRate?: number;
  special?: boolean;
  parkSlotScale?: number;
  parkSlots?: ParkSlot[];
  variants?: number;
}

export interface Runway {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  strips: number[];
  taxiPaths: number[][];
}

export type PadMark = 'helipad' | 'target';

export interface Helipad {
  x: number;
  y: number;
  strips: number[];
  mark?: PadMark;
}

export type SpecialEvent = 'zeppelin_arriving' | 'fastplanewarn' | 'ufo_arriving';

export type Weather = 'snow' | 'ash';

export interface SpecialDef {
  stripIndex: number;
  recurRandom?: number;
  recurBase?: number;
  event?: SpecialEvent;
}

export interface MapDef {
  id: string;
  title: string;
  background: string;
  planesPerLevel: number[];
  intervals: number[];
  levelUpPause: number[];
  intervalDecay: number;
  pauseDecay: number;
  colors: number[];
  strips: Strip[];
  runways: Runway[];
  helipads: Helipad[];
  landedHoldMs: number;
  special?: SpecialDef;
  worldScale?: number;
  clouds?: boolean;
  weather?: Weather;
  parkedWarningMargin?: number;
}

function slot(x: number, y: number, w: number, h: number, r: number): ParkSlot {
  return { cx: x - w / 2, cy: y - h / 2, r };
}

type Local = readonly [u: number, v: number];

function tenth(n: number): number {
  return Math.round(n * 10) / 10;
}

function flatIn(f: Frame, at: Local): number[] {
  const p = place(f, ...at);
  return [tenth(p.x), tenth(p.y)];
}

function runwayIn(f: Frame, from: Local, to: Local, strips: number[], taxi: readonly Local[][] = []): Runway {
  const [x1, y1] = flatIn(f, from) as [number, number];
  const [x2, y2] = flatIn(f, to) as [number, number];
  return { x1, y1, x2, y2, strips, taxiPaths: taxi.map((path) => path.flatMap((q) => flatIn(f, q))) };
}

function padIn(f: Frame, at: Local, strips: number[]): Helipad {
  const [x, y] = flatIn(f, at) as [number, number];
  return { x, y, strips };
}

function standPaths(lead: readonly Local[], lane: number, park: number, stands: readonly number[], from: -1 | 1): Local[][] {
  const turn = (park - lane) * 0.4;
  return stands.map((u): Local[] => [...lead, [u + from * 14, lane], [u, lane + turn], [u, park]]);
}

const RED_BLUE_YELLOW = [0xf15c6f, 0x39aadc, 0xc1cd00];

const MEADOW_STRIPS: Strip[] = [
  { name: 'medium', weight: 2, type: 0, speed: 1.55, radius: 15, color: 0 },
  { name: 'fast', weight: 2, type: 2, speed: 2.4, radius: 15, color: 0 },
  { name: 'small', weight: 2, type: 0, speed: 1.05, radius: 11, color: 1 },
  { name: 'heli', weight: 2, type: 0, speed: 0.81, radius: 10.5, color: 2, variants: 3 },
];

const LAKE_DESERT_LEVELS = {
  planesPerLevel: [4, 4, 6, 6, 8, 12, 12, 12, 16],
  intervals: [
    6000, 5750, 5500, 5250, 5000, 4750, 4500, 4350, 4150, 4000, 3900, 3800, 3700, 3600, 3500,
    3400, 3300, 3200, 3150,
  ],
  levelUpPause: [3000, 5000, 6000, 6000, 6000, 6000, 6000, 5500, 5500, 6000, 5000, 5000],
  intervalDecay: 20,
  pauseDecay: 100,
};

const MEADOW_LEVELS = {
  planesPerLevel: [3, 3, 5, 6, 8, 8, 12, 13, 13, 13, 16],
  intervals: [
    6000, 5750, 5500, 5250, 5000, 4500, 4100, 3750, 3500, 3300, 3200, 3100, 3000, 2950, 2900,
    2850, 2800, 2750, 2700, 2675,
  ],
  levelUpPause: [
    3000, 3000, 3000, 4500, 5000, 5500, 6000, 6000, 5500, 5000, 5000, 5000, 5000, 4500, 4500,
    4500, 4500, 4500, 4500, 4000, 3500, 3000,
  ],
  intervalDecay: 10,
  pauseDecay: 10,
};

const AIRSHOW_LEVELS = {
  planesPerLevel: [3, 4, 6, 7, 8, 9, 10, 11, 12, 13, 16],
  intervals: [
    6000, 5500, 5000, 4750, 4500, 4350, 4200, 4000, 3850, 3700, 3550, 3450, 3350, 3275, 3200,
    3150, 3125, 3100, 3075, 3050, 3025, 3000, 2975, 2950, 2925, 2900, 2875, 2850, 2825, 2800,
    2775, 2750, 2725,
  ],
  levelUpPause: [
    3000, 3000, 4500, 5000, 5500, 5500, 6000, 6000, 5500, 5000, 5000, 5000, 5000, 4500, 4500,
    4500, 4500, 4500, 4500, 4000,
  ],
  intervalDecay: 10,
  pauseDecay: 40,
};

export const MEADOW_SITE: Frame = { origin: { x: 312, y: 192 }, angle: -8 };
export const MEADOW_APRON = { lane: 40, park: 72, stands: [94, 128, 162, 196] };

const MEADOW_EXIT: Local[] = [
  [193, 3],
  [203, 18],
];

const MEADOW_TAXI_A: Local[][] = [
  [...MEADOW_EXIT, [204, 38], [197, 54], [196, 72]],
  ...standPaths([...MEADOW_EXIT, [200, 36]], 40, 72, [162, 128, 94], 1),
];

const MEADOW_TAXI_B: Local[][] = [
  [
    [60, 58],
    [74, 46],
    [92, 54],
    [94, 72],
  ],
  ...standPaths(
    [
      [60, 58],
      [74, 42],
    ],
    40,
    72,
    [128, 162, 196],
    -1,
  ),
];

export const MEADOW: MapDef = {
  id: 'meadow',
  title: 'Meadow',
  background: 'meadow',
  ...MEADOW_LEVELS,
  colors: RED_BLUE_YELLOW,
  strips: MEADOW_STRIPS,
  runways: [
    runwayIn(MEADOW_SITE, [0, 0], [180, 0], [0, 1], MEADOW_TAXI_A),
    runwayIn(MEADOW_SITE, [-36, 160], [52, 70], [2], MEADOW_TAXI_B),
  ],
  helipads: [padIn(MEADOW_SITE, [246, 66], [3])],
  landedHoldMs: 1000,
};

export const FLEET_CARRIER: Frame = { origin: { x: 425, y: 240 }, angle: -5 };
export const FLEET_ESCORT: Frame = { origin: { x: 640, y: 410 }, angle: -5 };

export const FLEET: MapDef = {
  id: 'fleet',
  title: 'Fleet',
  background: 'fleet',
  planesPerLevel: [3, 4, 6, 7, 8, 9, 10, 11, 12, 13, 16],
  intervals: [
    5500, 5000, 4500, 4000, 3750, 3500, 3300, 3100, 2950, 2800, 2650, 2500, 2400, 2300, 2200,
    2100, 2000, 1950, 1900, 1875, 1850, 1825, 1800,
  ],
  levelUpPause: [
    3000, 3000, 3500, 4000, 4250, 4500, 4500, 4500, 4000, 3500, 3500, 3500, 3250, 3250, 3250,
    3250, 3250, 3250, 3250, 3250, 3250, 3250, 3250,
  ],
  intervalDecay: 10,
  pauseDecay: 40,
  colors: [0xffffff],
  strips: [
    {
      name: 'jet',
      weight: 2,
      type: 0,
      speed: 1.85,
      radius: 19,
      color: 0,
      parkSlots: [
        slot(19, 24, 48, 48, 8),
        slot(16, 10, 48, 48, 3),
        slot(16, 38, 48, 48, 3),
        slot(8, 24, 48, 48, 4),
        slot(35, 24, 48, 48, 2),
      ],
    },
    {
      name: 'superjet',
      weight: 2,
      type: 1,
      speed: 2.6,
      radius: 22,
      color: 0,
      parkSlots: [
        slot(17, 24, 48, 48, 9.5),
        slot(37, 24, 48, 48, 2),
        slot(10.5, 37, 48, 48, 3.5),
        slot(10.5, 11, 48, 48, 3.5),
      ],
    },
    {
      name: 'B2 bomber',
      weight: 1.4,
      type: 3,
      speed: 1.25,
      radius: 30,
      color: 0,
      parkSlotScale: 1.42,
      parkSlots: [
        slot(24, 5, 64, 64, 2),
        slot(24, 57, 64, 64, 2),
        slot(29, 11, 64, 64, 2),
        slot(29, 52, 64, 64, 2),
        slot(34, 32, 64, 64, 14),
      ],
    },
    {
      name: 'helicopter',
      weight: 2,
      type: 0,
      speed: 0.9,
      radius: 19,
      color: 0,
      variants: 3,
      parkSlots: [
        slot(29.5, 24.5, 48, 48, 13),
        slot(9, 24.5, 48, 48, 2),
        slot(13, 24.5, 48, 48, 2),
      ],
    },
    {
      name: 'fast plane',
      weight: 2,
      type: 5,
      speed: 4.5,
      radius: 18,
      color: 0,
      special: true,
      parkSlots: [
        slot(22, 24.5, 48, 48, 10),
        slot(23, 8, 48, 48, 1),
        slot(23, 40, 48, 48, 1),
        slot(12, 24, 48, 48, 5),
        slot(36, 24, 48, 48, 2),
        slot(39, 24, 48, 48, 1),
      ],
    },
  ],
  runways: [
    runwayIn(FLEET_CARRIER, [-20, 16], [180, 16], [2, 4]),
    runwayIn(FLEET_CARRIER, [-245, 10], [-60, -22], [1, 0]),
  ],
  helipads: [padIn(FLEET_CARRIER, [30, -42], [3]), padIn(FLEET_ESCORT, [-72, 0], [3])],
  landedHoldMs: 500,
  special: { stripIndex: 4 },
};

export const LAKESIDE_SITE: Frame = { origin: { x: 250, y: 250 }, angle: 10 };
export const LAKESIDE_APRON = { lane: -40, park: -62, stands: [150, 184, 218] };

const LAKESIDE_EXIT: Local[] = [
  [242, -4],
  [250, -18],
];

export const LAKESIDE: MapDef = {
  id: 'lakeside',
  title: 'Lakeside',
  background: 'lakeside',
  ...LAKE_DESERT_LEVELS,
  colors: RED_BLUE_YELLOW,
  strips: MEADOW_STRIPS,
  runways: [
    runwayIn(LAKESIDE_SITE, [0, 0], [230, 0], [0, 1], [
      [...LAKESIDE_EXIT, [240, -36], [222, -46], [218, -62]],
      ...standPaths([...LAKESIDE_EXIT, [244, -36]], -40, -62, [184, 150], 1),
    ]),
    runwayIn(LAKESIDE_SITE, [330, -160], [330, -45], [2], standPaths([[320, -38]], -40, -62, [218, 184, 150], 1)),
  ],
  helipads: [padIn(LAKESIDE_SITE, [110, 104], [3]), padIn(LAKESIDE_SITE, [108, -62], [3])],
  landedHoldMs: 1000,
};

export const AIRSHOW_SITE: Frame = { origin: { x: 150, y: 305 }, angle: 7.4 };

export const AIRSHOW: MapDef = {
  id: 'airshow',
  title: 'Airshow',
  background: 'airshow',
  ...AIRSHOW_LEVELS,
  colors: [0xc9b700, 0xde8027, 0xcdb679, 0xe6dd84],
  strips: [
    {
      name: 'zeppelin',
      weight: 2,
      type: 3,
      speed: 0.3,
      radius: 88,
      color: 3,
      turnRate: 0.2,
      special: true,
      parkSlots: [
        slot(93, 114, 178, 48, 112),
        slot(93, -66, 178, 48, 112),
        slot(24, 37, 178, 48, 5),
        slot(24, 11, 178, 48, 5),
        slot(163, 24, 178, 48, 11),
      ],
    },
    {
      name: 'small',
      weight: 1,
      type: 1,
      speed: 1.0,
      radius: 18,
      color: 0,
      parkSlots: [
        slot(28, 10.5, 48, 48, 1.5),
        slot(28, 37.5, 48, 48, 1.5),
        slot(12, 20, 48, 48, 1),
        slot(12, 28, 48, 48, 1),
        slot(13, 24, 48, 48, 3),
        slot(28, 24, 48, 48, 9),
      ],
    },
    {
      name: 'medium',
      weight: 2,
      type: 0,
      speed: 1.4,
      radius: 20,
      color: 1,
      parkSlots: [
        slot(28.7, 7, 48, 48, 1.5),
        slot(28.7, 41, 48, 48, 1.5),
        slot(13.92, 20.64, 48, 48, 1),
        slot(13.92, 27.84, 48, 48, 1),
        slot(14.88, 24, 48, 48, 3),
        slot(28.8, 24, 48, 48, 9),
      ],
    },
    {
      name: 'big',
      weight: 1,
      type: 2,
      speed: 2.2,
      radius: 24,
      color: 2,
      parkSlots: [
        slot(21.96, 5, 36, 48, 2),
        slot(21.96, 43, 36, 48, 2),
        { cx: 0, cy: 0, r: 14.4 },
      ],
    },
    {
      name: 'big double',
      weight: 2,
      type: 0,
      speed: 1.55,
      radius: 23,
      color: 2,
      parkSlots: [
        slot(29.28, 6, 48, 48, 2),
        slot(29.28, 42, 48, 48, 2),
        slot(11.04, 20.16, 48, 48, 2),
        slot(11.04, 29.76, 48, 48, 2),
        slot(12, 24, 48, 48, 4),
        slot(31.2, 24, 48, 48, 9),
      ],
    },
  ],
  runways: [
    runwayIn(AIRSHOW_SITE, [0, 0], [232, 0], [4, 3]),
    runwayIn(AIRSHOW_SITE, [262, -231], [125, -127], [1, 2]),
  ],
  helipads: [padIn(AIRSHOW_SITE, [466, -101], [0])],
  landedHoldMs: 1000,
  special: { stripIndex: 0, recurRandom: 2, recurBase: 5, event: 'zeppelin_arriving' },
};

export const CANYON: MapDef = {
  id: 'canyon',
  title: 'Canyon',
  background: 'canyon',
  ...LAKE_DESERT_LEVELS,
  colors: RED_BLUE_YELLOW,
  strips: [
    { name: 'medium', weight: 2, type: 0, speed: 1.25, radius: 15, color: 0 },
    { name: 'fast', weight: 1, type: 2, speed: 2.0, radius: 17, color: 0 },
    { name: 'small', weight: 2, type: 0, speed: 1.1, radius: 11, color: 1 },
    { name: 'heli', weight: 1.5, type: 1, speed: 1.0, radius: 12, color: 2 },
  ],
  runways: [
    {
      x1: 508,
      y1: 398,
      x2: 280,
      y2: 398,
      strips: [0, 1],
      taxiPaths: [
        [265, 398, 257, 384, 258, 342, 260, 318],
        [265, 398, 257, 384, 262, 352, 284, 342, 294, 318],
        [265, 398, 257, 384, 254, 352, 236, 342, 226, 318],
      ],
    },
    {
      x1: 128,
      y1: 158,
      x2: 128,
      y2: 319,
      strips: [2],
      taxiPaths: [
        [138, 336, 160, 345, 212, 344, 226, 334, 226, 318],
        [138, 336, 160, 345, 246, 344, 260, 334, 260, 318],
        [138, 336, 160, 345, 280, 344, 294, 334, 294, 318],
      ],
    },
  ],
  helipads: [{ x: 174, y: 287, strips: [3] }],
  landedHoldMs: 1000,
};

export const COAST_CARRIER: Frame = { origin: { x: 290, y: 335 }, angle: -15 };
export const COAST_ASSAULT_SHIP: Frame = { origin: { x: 170, y: 120 }, angle: -15 };

export const COAST: MapDef = {
  id: 'coast',
  title: 'Coast',
  background: 'coast',
  planesPerLevel: [3, 4, 6, 7, 8, 9, 10, 11, 12, 13, 16],
  intervals: [
    8250, 7500, 6750, 6000, 5625, 5250, 4950, 4650, 4425, 4200, 3975, 3750, 3600, 3450, 3300,
    3150, 3000, 2925, 2850, 2812.5, 2775, 2737.5, 2700,
  ],
  levelUpPause: [
    6000, 6000, 7000, 8000, 8500, 9000, 9000, 9000, 8000, 7000, 7000, 7000, 7000, 7000, 7000,
    7000, 7000, 7000, 7000, 7000, 7000, 7000, 7000,
  ],
  intervalDecay: 7,
  pauseDecay: 30,
  colors: [0xffffff, 0xf15c6f, 0x39aadc, 0xc1cd00, 0x41db49, 0xdbaa41, 0x7f41d8],
  strips: [
    {
      name: 'cargo jet',
      weight: 2,
      type: 0,
      speed: 0.925,
      radius: 18,
      color: 5,
      variants: 4,
      parkSlotScale: 0.5333,
      parkSlots: [slot(17, 23, 48, 48, 15), slot(37, 24, 48, 48, 2)],
    },
    {
      name: 'cargo superjet',
      weight: 2,
      type: 1,
      speed: 1.3,
      radius: 25,
      color: 5,
      variants: 4,
      parkSlotScale: 0.64,
      parkSlots: [
        slot(17, 24, 48, 48, 10),
        slot(38, 24, 48, 48, 2),
        slot(11, 10, 48, 48, 3),
        slot(11, 38, 48, 48, 3),
      ],
    },
    {
      name: 'B2 bomber',
      weight: 1.4,
      type: 3,
      speed: 0.625,
      radius: 30,
      color: 0,
      variants: 5,
      parkSlotScale: 0.7556,
      parkSlots: [
        slot(25, 8, 64, 64, 2),
        slot(25, 54, 64, 64, 2),
        slot(30, 14, 64, 64, 2),
        slot(30, 49, 64, 64, 2),
        slot(34, 32, 64, 64, 12),
      ],
    },
    {
      name: 'military plane',
      weight: 1.33,
      type: 0,
      speed: 0.45,
      radius: 19,
      color: 4,
      variants: 6,
      parkSlotScale: 0.5333,
      parkSlots: [slot(29.5, 24.5, 48, 48, 13), slot(9, 24.5, 48, 48, 2), slot(13, 24.5, 48, 48, 2)],
    },
    {
      name: 'plane',
      weight: 2,
      type: 0,
      speed: 0.775,
      radius: 20,
      color: 1,
      parkSlotScale: 0.5333,
      parkSlots: [slot(20, 20, 48, 48, 14), slot(23.5, 5, 48, 48, 1.8), slot(23.5, 35, 48, 48, 1.8)],
    },
    { name: 'fast jet', weight: 2, type: 2, speed: 1.2, radius: 15, color: 1, parkSlotScale: 0.5333 },
    {
      name: 'small',
      weight: 2,
      type: 0,
      speed: 0.525,
      radius: 16,
      color: 2,
      variants: 2,
      parkSlotScale: 0.5333,
      parkSlots: [
        slot(27, 23, 48, 48, 9),
        slot(28, 9, 48, 48, 3),
        slot(28, 39, 48, 48, 3),
        slot(15, 20, 48, 48, 2),
        slot(15, 28, 48, 48, 2),
      ],
    },
    {
      name: 'military heli',
      weight: 1,
      type: 0,
      speed: 0.405,
      radius: 11.5,
      color: 3,
      variants: 3,
      parkSlotScale: 0.5333,
    },
    {
      name: 'stealth',
      weight: 2,
      type: 5,
      speed: 2.25,
      radius: 18,
      color: 6,
      special: true,
      parkSlots: [
        slot(22, 24.5, 48, 48, 10),
        slot(23, 8, 48, 48, 1),
        slot(23, 40, 48, 48, 1),
        slot(12, 24, 48, 48, 5),
        slot(36, 24, 48, 48, 2),
        slot(39, 24, 48, 48, 1),
      ],
    },
  ],
  runways: [
    runwayIn(COAST_CARRIER, [-15, 15], [150, 15], [2, 8]),
    runwayIn(COAST_CARRIER, [-200, 8], [-58, -18], [1, 0]),
    { x1: 560, y1: 72, x2: 730, y2: 64, strips: [4, 5], taxiPaths: [] },
    { x1: 610, y1: 186, x2: 696, y2: 118, strips: [6], taxiPaths: [] },
  ],
  helipads: [
    padIn(COAST_ASSAULT_SHIP, [-52, 0], [3]),
    padIn(COAST_CARRIER, [25, -41], [3]),
    { x: 770, y: 142, strips: [7] },
  ],
  landedHoldMs: 500,
  special: { stripIndex: 8 },
  worldScale: 2,
  clouds: false,
  parkedWarningMargin: 16,
};

export const ARCTIC_ICEBREAKER: Frame = { origin: { x: 740, y: 379 }, angle: -15 };

export const ARCTIC_OUTPOST: MapDef = {
  id: 'arctic-outpost',
  title: 'Arctic Outpost',
  background: 'arctic-outpost',
  ...LAKE_DESERT_LEVELS,
  colors: [0xe8454f, 0x2f7fd6, 0xf09a1e],
  strips: [
    { name: 'ski plane', weight: 2, type: 0, speed: 1.05, radius: 12, color: 0 },
    { name: 'turboprop', weight: 2, type: 0, speed: 1.4, radius: 18, color: 2, variants: 2 },
    { name: 'jet', weight: 1.5, type: 2, speed: 2.2, radius: 16, color: 2 },
    { name: 'heli', weight: 2, type: 0, speed: 0.85, radius: 11, color: 1, variants: 2 },
  ],
  runways: [
    { x1: 170, y1: 345, x2: 400, y2: 312, strips: [1, 2], taxiPaths: [] },
    { x1: 575, y1: 95, x2: 610, y2: 215, strips: [0], taxiPaths: [] },
  ],
  helipads: [{ x: 470, y: 292, strips: [3] }, padIn(ARCTIC_ICEBREAKER, [-36, 0], [3])],
  landedHoldMs: 1000,
  weather: 'snow',
};

export const VOLCANO_ISLAND: MapDef = {
  id: 'volcano-island',
  title: 'Volcano Island',
  background: 'volcano-island',
  ...MEADOW_LEVELS,
  colors: [0xffd23f, 0xf15c6f, 0xffffff],
  strips: [
    { name: 'seaplane', weight: 2, type: 0, speed: 1.2, radius: 15, color: 0, variants: 2 },
    { name: 'flying boat', weight: 1.5, type: 2, speed: 1.7, radius: 20, color: 0 },
    { name: 'island hopper', weight: 2, type: 0, speed: 1.05, radius: 12, color: 1 },
    { name: 'heli', weight: 2, type: 1, speed: 0.85, radius: 11, color: 2 },
  ],
  runways: [
    { x1: 90, y1: 380, x2: 250, y2: 330, strips: [0, 1], taxiPaths: [] },
    { x1: 425, y1: 330, x2: 565, y2: 342, strips: [2], taxiPaths: [] },
  ],
  helipads: [
    { x: 430, y: 120, strips: [3] },
    { x: 700, y: 336, strips: [3] },
  ],
  landedHoldMs: 1000,
  weather: 'ash',
};

export const CITY_LIGHTS: MapDef = {
  id: 'city-lights',
  title: 'City Lights',
  background: 'city-lights',
  ...MEADOW_LEVELS,
  colors: [0xffb648, 0x4fc3ff, 0xff5c8a],
  strips: [
    { name: 'airliner', weight: 2, type: 0, speed: 1.5, radius: 17, color: 0, variants: 3 },
    { name: 'jumbo', weight: 1.5, type: 2, speed: 2.1, radius: 21, color: 0 },
    { name: 'regional', weight: 2, type: 0, speed: 1.15, radius: 13, color: 1 },
    { name: 'heli', weight: 2, type: 1, speed: 0.85, radius: 11, color: 2 },
    { name: 'bizjet', weight: 1.5, type: 3, speed: 2.0, radius: 12, color: 1 },
  ],
  runways: [
    {
      x1: 170,
      y1: 310,
      x2: 420,
      y2: 310,
      strips: [0, 1],
      taxiPaths: [
        [438, 304, 438, 286, 370, 286, 370, 268],
        [438, 304, 438, 286, 330, 286, 330, 268],
        [438, 304, 438, 286, 290, 286, 290, 268],
      ],
    },
    {
      x1: 400,
      y1: 160,
      x2: 210,
      y2: 160,
      strips: [2, 4],
      taxiPaths: [
        [194, 166, 194, 190, 270, 190, 270, 208],
        [194, 166, 194, 190, 310, 190, 310, 208],
        [194, 166, 194, 190, 350, 190, 350, 208],
      ],
    },
  ],
  helipads: [
    { x: 690, y: 150, strips: [3] },
    { x: 640, y: 360, strips: [3] },
  ],
  landedHoldMs: 1000,
  clouds: false,
};

export const MOON_BASE: MapDef = {
  id: 'moon-base',
  title: 'Moon Base',
  background: 'moon-base',
  ...AIRSHOW_LEVELS,
  colors: [0xffffff, 0x39d0dc, 0xe6b422, 0xf07a2a, 0x7cf05a],
  strips: [
    { name: 'shuttle', weight: 2, type: 0, speed: 1.5, radius: 17, color: 0 },
    { name: 'space plane', weight: 2, type: 1, speed: 2.2, radius: 13, color: 1 },
    { name: 'lander', weight: 2, type: 0, speed: 0.8, radius: 12, color: 2, variants: 2 },
    { name: 'rocket', weight: 1.5, type: 2, speed: 1.0, radius: 10, color: 3 },
    { name: 'UFO', weight: 2, type: 4, speed: 1.8, radius: 14, color: 4, special: true },
  ],
  runways: [
    { x1: 150, y1: 360, x2: 420, y2: 300, strips: [0], taxiPaths: [] },
    { x1: 600, y1: 110, x2: 720, y2: 200, strips: [1], taxiPaths: [] },
  ],
  helipads: [
    { x: 330, y: 170, strips: [2], mark: 'target' },
    { x: 520, y: 290, strips: [2], mark: 'target' },
    { x: 720, y: 380, strips: [3], mark: 'target' },
    { x: 160, y: 150, strips: [4], mark: 'target' },
  ],
  landedHoldMs: 1000,
  special: { stripIndex: 4, recurRandom: 2, recurBase: 3, event: 'ufo_arriving' },
  clouds: false,
};

export const ALTIPORT: MapDef = {
  id: 'altiport',
  title: 'Altiport',
  background: 'altiport',
  ...MEADOW_LEVELS,
  colors: RED_BLUE_YELLOW,
  strips: [
    { name: 'glider', weight: 2, type: 0, speed: 0.6, turnRate: 0.3, radius: 16, color: 1 },
    { name: 'turboprop', weight: 2, type: 0, speed: 1.4, radius: 18, color: 0 },
    { name: 'bizjet', weight: 1.5, type: 2, speed: 2.0, radius: 12, color: 0 },
    { name: 'rescue heli', weight: 2, type: 0, speed: 0.85, radius: 11, color: 2 },
  ],
  runways: [
    { x1: 390, y1: 230, x2: 530, y2: 170, strips: [1, 2], taxiPaths: [] },
    { x1: 390, y1: 290, x2: 570, y2: 320, strips: [0], taxiPaths: [] },
  ],
  helipads: [{ x: 650, y: 220, strips: [3] }],
  landedHoldMs: 1000,
  weather: 'snow',
};

export const MAP_SELECTOR: MapDef[] = [
  MEADOW,
  FLEET,
  LAKESIDE,
  AIRSHOW,
  CANYON,
  COAST,
  ARCTIC_OUTPOST,
  VOLCANO_ISLAND,
  CITY_LIGHTS,
  MOON_BASE,
  ALTIPORT,
];
