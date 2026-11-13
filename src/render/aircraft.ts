import type { MapDef, Strip } from '../config/maps';
import { WORLD_HEIGHT, WORLD_WIDTH } from '../config/world';
import type { Aircraft } from '../game/aircraft';
import { altitude, fadeAlpha, smoothstep } from '../game/landing';
import type { World } from '../game/world';
import { hex, mix } from './color';

const UNCOLORED = 0xffffff;
const INK = 0x11151a;
const DETAIL_SHADE = 0.42;
const OUTLINE_SHADE = 0.6;
const OUTLINE_WIDTH = 1.25;
const FACET = 'rgba(17, 21, 26, 0.13)';
const SELECT_RING = 'rgba(244, 242, 236, 0.9)';
const SELECT_PAD = 5;
const CRASH_FLICKER_MS = 100;
const CRASH_FLICKER_ALPHA = 0.3;
const ROTOR_SPEED = 0.03;
const ENTERING_MIN_SCALE = 0.5;
const SHADOW_FLYING = { x: 4, y: 6, alpha: 0.18 };
const SHADOW_GROUND = { x: 1.2, y: 1.8, alpha: 0.25 };
const GROUND_SCALE = 0.85;
const LIGHT_DUTY = 0.3;
const LIGHT_CORE = 1.3;
const LIGHT_HALO = 3.4;
const LIGHT_HALO_ALPHA = 0.35;
const LIGHT_PHASE_SPAN = 10000;

type Polygon = readonly (readonly [number, number])[];

interface Rotor {
  x: number;
  y: number;
  r: number;
  blades: number;
}

interface Light {
  x: number;
  y: number;
  color: string;
  period?: number;
  phase?: number;
}

export interface Sprite {
  body: readonly Polygon[];
  details?: readonly Polygon[];
  rotors?: readonly Rotor[];
  lights?: readonly Light[];
}

function mirrored(half: Polygon): Polygon {
  const back = half.slice(1, -1).reverse().map(([x, y]) => [x, -y] as const);
  return [...half, ...back];
}

function ellipse(cx: number, cy: number, rx: number, ry: number, points = 16): Polygon {
  return Array.from({ length: points }, (_, i) => {
    const a = (i / points) * Math.PI * 2;
    return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry] as const;
  });
}

function rect(x0: number, y0: number, x1: number, y1: number): Polygon {
  return [
    [x1, y0],
    [x1, y1],
    [x0, y1],
    [x0, y0],
  ];
}

function wing(back: number, front: number, span: number): Polygon {
  return mirrored([
    [front, 0],
    [front, span - 0.06],
    [front - 0.04, span],
    [back + 0.04, span],
    [back, span - 0.06],
    [back, 0],
  ]);
}

function tailBoom(from: number, to: number, width: number): Polygon {
  return mirrored([
    [from, 0],
    [from, width],
    [to, width * 0.7],
    [to, 0],
  ]);
}

const CIVIL_MEDIUM: Sprite = {
  body: [
    mirrored([
      [1, 0],
      [0.8, 0.1],
      [0.2, 0.12],
      [-0.1, 0.9],
      [-0.3, 0.9],
      [-0.2, 0.12],
      [-0.7, 0.1],
      [-0.9, 0.42],
      [-1, 0.42],
      [-0.95, 0],
    ]),
  ],
  details: [ellipse(0.78, 0, 0.1, 0.06), rect(0, 0.42, 0.12, 0.5), rect(0, -0.5, 0.12, -0.42)],
};

const CIVIL: Record<string, readonly Sprite[]> = {
  medium: [CIVIL_MEDIUM],
  fast: [
    {
      body: [
        mirrored([
          [1, 0],
          [0.55, 0.1],
          [-0.5, 0.9],
          [-0.72, 0.9],
          [-0.62, 0.1],
          [-0.82, 0.1],
          [-1, 0.38],
          [-1, 0],
        ]),
      ],
      details: [ellipse(0.62, 0, 0.12, 0.05)],
    },
  ],
  small: [
    {
      body: [
        mirrored([
          [0.85, 0],
          [0.8, 0.12],
          [0.38, 0.12],
          [0.38, 0.95],
          [0.1, 0.95],
          [0.1, 0.12],
          [-0.7, 0.08],
          [-0.75, 0.4],
          [-0.95, 0.4],
          [-0.95, 0],
        ]),
      ],
      details: [ellipse(0.5, 0, 0.1, 0.08)],
    },
  ],
  'cargo jet': [
    {
      body: [
        mirrored([
          [1, 0],
          [0.85, 0.16],
          [0.15, 0.18],
          [0.05, 0.95],
          [-0.2, 0.95],
          [-0.25, 0.18],
          [-0.8, 0.12],
          [-0.85, 0.5],
          [-1, 0.5],
          [-1, 0],
        ]),
      ],
      details: [rect(0.02, 0.45, 0.16, 0.56), rect(0.02, -0.56, 0.16, -0.45)],
    },
  ],
  'cargo superjet': [
    {
      body: [
        mirrored([
          [1, 0],
          [0.8, 0.2],
          [0.62, 0.22],
          [0.48, 0.48],
          [0.36, 0.48],
          [0.4, 0.22],
          [0.25, 0.22],
          [0.05, 0.45],
          [0.15, 0.5],
          [-0.05, 0.62],
          [-0.25, 0.98],
          [-0.45, 0.98],
          [-0.32, 0.22],
          [-0.75, 0.18],
          [-0.95, 0.55],
          [-1.05, 0.55],
          [-1, 0],
        ]),
      ],
    },
  ],
  heli: [
    {
      body: [
        ellipse(0.2, 0, 0.55, 0.4),
        tailBoom(0, -1.15, 0.09),
        wing(-1.15, -1, 0.32),
        rect(-0.25, 0.43, 0.65, 0.5),
        rect(-0.25, -0.5, 0.65, -0.43),
      ],
      details: [ellipse(0.42, 0, 0.22, 0.26)],
      rotors: [{ x: 0.18, y: 0, r: 1.25, blades: 2 }],
    },
    {
      body: [ellipse(0.1, 0, 0.75, 0.38), tailBoom(-0.4, -1.2, 0.11), wing(-1.2, -1.03, 0.36)],
      details: [ellipse(0.6, 0, 0.14, 0.26)],
      rotors: [{ x: 0.1, y: 0, r: 1.3, blades: 4 }],
    },
    {
      body: [
        mirrored([
          [1.05, 0],
          [1, 0.22],
          [0.88, 0.34],
          [-0.88, 0.34],
          [-1, 0.22],
          [-1.05, 0],
        ]),
      ],
      details: [ellipse(0.86, 0, 0.12, 0.2), rect(-0.65, 0.15, 0.45, 0.2), rect(-0.65, -0.2, 0.45, -0.15)],
      rotors: [
        { x: 0.6, y: 0, r: 0.8, blades: 3 },
        { x: -0.6, y: 0, r: 0.8, blades: 3 },
      ],
    },
  ],
};

const CARRIER: Record<string, readonly Sprite[]> = {
  jet: [
    {
      body: [
        mirrored([
          [1, 0],
          [0.75, 0.08],
          [0.35, 0.14],
          [0.05, 0.62],
          [-0.2, 0.66],
          [-0.3, 0.18],
          [-0.55, 0.18],
          [-0.75, 0.42],
          [-0.95, 0.42],
          [-0.9, 0.12],
          [-1, 0.1],
          [-1, 0],
        ]),
      ],
      details: [ellipse(0.5, 0, 0.18, 0.06), rect(-0.85, 0.12, -0.55, 0.17), rect(-0.85, -0.17, -0.55, -0.12)],
    },
  ],
  superjet: [
    {
      body: [
        mirrored([
          [1, 0],
          [0.7, 0.07],
          [0.5, 0.1],
          [0.42, 0.28],
          [0.32, 0.28],
          [0.3, 0.12],
          [0, 0.14],
          [-0.7, 0.7],
          [-0.85, 0.7],
          [-0.8, 0.16],
          [-1, 0.12],
          [-1, 0],
        ]),
      ],
      details: [ellipse(0.6, 0, 0.16, 0.05), rect(-0.95, -0.05, -0.4, 0.05)],
    },
  ],
  'B2 bomber': [
    {
      body: [
        mirrored([
          [0.55, 0],
          [0.45, 0.08],
          [-0.25, 0.95],
          [-0.38, 1],
          [-0.42, 0.85],
          [-0.25, 0.68],
          [-0.4, 0.5],
          [-0.25, 0.32],
          [-0.38, 0.15],
          [-0.3, 0],
        ]),
      ],
      details: [ellipse(0.32, 0, 0.1, 0.06), ellipse(0, 0.2, 0.16, 0.05), ellipse(0, -0.2, 0.16, 0.05)],
    },
  ],
  'fast plane': [
    {
      body: [
        mirrored([
          [1.2, 0],
          [0.6, 0.07],
          [0.1, 0.1],
          [-0.3, 0.45],
          [-0.55, 0.47],
          [-0.55, 0.12],
          [-0.75, 0.1],
          [-0.9, 0.3],
          [-1, 0.3],
          [-0.95, 0],
        ]),
      ],
      details: [ellipse(0.55, 0, 0.16, 0.04)],
    },
  ],
  helicopter: [
    {
      body: [ellipse(0.15, 0, 0.55, 0.36), wing(-0.05, 0.15, 0.58), tailBoom(-0.2, -0.95, 0.1), wing(-1, -0.86, 0.3)],
      details: [ellipse(0.52, 0, 0.12, 0.22)],
      rotors: [{ x: 0.1, y: 0, r: 1, blades: 4 }],
    },
    {
      body: [ellipse(0.2, 0, 0.62, 0.16), wing(0, 0.18, 0.45), tailBoom(-0.3, -0.98, 0.07), wing(-1, -0.88, 0.26)],
      details: [ellipse(0.55, 0, 0.18, 0.08), rect(0, 0.36, 0.22, 0.44), rect(0, -0.44, 0.22, -0.36)],
      rotors: [{ x: 0.15, y: 0, r: 0.95, blades: 4 }],
    },
    {
      body: [
        mirrored([
          [0.95, 0],
          [0.9, 0.22],
          [0.8, 0.32],
          [-0.8, 0.32],
          [-0.9, 0.22],
          [-0.95, 0],
        ]),
        rect(-0.25, 0.32, 0.25, 0.42),
        rect(-0.25, -0.42, 0.25, -0.32),
      ],
      details: [ellipse(0.78, 0, 0.1, 0.2)],
      rotors: [
        { x: 0.55, y: 0, r: 0.72, blades: 3 },
        { x: -0.55, y: 0, r: 0.72, blades: 3 },
      ],
    },
  ],
};

function biplane(length: number, span: number, props: readonly Rotor[]): Sprite {
  return {
    body: [
      wing(-0.05 * span, 0.22, span * 0.85),
      mirrored([
        [length, 0],
        [length - 0.08, 0.13],
        [0.3, 0.15],
        [-0.72, 0.06],
        [-0.86, 0],
      ]),
      mirrored([
        [-0.6, 0],
        [-0.62, 0.32],
        [-0.84, 0.32],
        [-0.88, 0],
      ]),
      wing(0.18, 0.5, span),
    ],
    details: [
      ellipse(0.05, 0, 0.1, 0.08),
      rect(0.2, span * 0.55, 0.48, span * 0.6),
      rect(0.2, -span * 0.6, 0.48, -span * 0.55),
    ],
    rotors: props,
  };
}

const VINTAGE: Record<string, readonly Sprite[]> = {
  zeppelin: [
    {
      body: [
        mirrored([
          [-0.62, 0],
          [-0.8, 0.48],
          [-1, 0.5],
          [-0.96, 0],
        ]),
        ellipse(0, 0, 1, 0.27, 28),
      ],
      details: [
        ellipse(0.25, 0, 0.2, 0.06),
        rect(-0.7, -0.015, 0.85, 0.015),
        rect(-0.6, 0.13, 0.7, 0.15),
        rect(-0.6, -0.15, 0.7, -0.13),
      ],
      rotors: [
        { x: -0.3, y: 0.32, r: 0.08, blades: 2 },
        { x: -0.3, y: -0.32, r: 0.08, blades: 2 },
      ],
    },
  ],
  small: [biplane(0.9, 0.82, [{ x: 0.95, y: 0, r: 0.32, blades: 2 }])],
  medium: [biplane(0.95, 0.95, [{ x: 1, y: 0, r: 0.36, blades: 2 }])],
  big: [biplane(1, 1, [{ x: 1.05, y: 0, r: 0.4, blades: 3 }])],
  'big double': [
    biplane(0.85, 1, [
      { x: 0.62, y: 0.42, r: 0.3, blades: 2 },
      { x: 0.62, y: -0.42, r: 0.3, blades: 2 },
    ]),
  ],
};

function pods(x: number, spans: readonly number[]): Polygon[] {
  return spans.flatMap((y) => [rect(x, y - 0.05, x + 0.2, y + 0.05), rect(x, -y - 0.05, x + 0.2, -y + 0.05)]);
}

function liveries(base: Sprite, variants: readonly (readonly Polygon[])[]): Sprite[] {
  return variants.map((details) => ({ body: base.body, details }));
}

const TAIL_STRIPE = rect(-1, -0.04, -0.55, 0.04);

function vtolJet(span: number, tail: number): Sprite {
  return {
    body: [
      mirrored([
        [1, 0],
        [0.8, 0.1],
        [0.35, 0.15],
        [0.15, span],
        [-0.15, span],
        [-0.2, 0.15],
        [-0.6, 0.12],
        [-0.82, tail],
        [-0.96, tail],
        [-0.9, 0],
      ]),
    ],
    details: [ellipse(0.62, 0, 0.16, 0.06), rect(0.1, 0.15, 0.4, 0.24), rect(0.1, -0.24, 0.4, -0.15)],
  };
}

function tiltrotor(rotor: number, blades: number): Sprite {
  return {
    body: [ellipse(0.05, 0, 0.95, 0.16), rect(-0.08, -0.82, 0.14, 0.82), wing(-0.98, -0.82, 0.34)],
    details: [ellipse(0.72, 0, 0.14, 0.09), rect(-0.04, 0.7, 0.24, 0.9), rect(-0.04, -0.9, 0.24, -0.7)],
    rotors: [
      { x: 0.12, y: 0.8, r: rotor, blades },
      { x: 0.12, y: -0.8, r: rotor, blades },
    ],
  };
}

const B2_BASE = CARRIER['B2 bomber']![0]!;
const CARGO_JET_BASE = CIVIL['cargo jet']![0]!;
const CARGO_SUPERJET_BASE = CIVIL['cargo superjet']![0]!;

const MILITARY: Record<string, readonly Sprite[]> = {
  'cargo jet': liveries(CARGO_JET_BASE, [
    pods(0.02, [0.5]),
    pods(0.02, [0.35, 0.65]),
    [...pods(0.02, [0.5]), TAIL_STRIPE],
    [...pods(0.02, [0.35, 0.65]), TAIL_STRIPE, ellipse(0.82, 0, 0.1, 0.07)],
  ]),
  'cargo superjet': liveries(CARGO_SUPERJET_BASE, [
    [ellipse(0.85, 0, 0.1, 0.08)],
    [...pods(-0.15, [0.4, 0.7]), ellipse(0.85, 0, 0.1, 0.08)],
    [TAIL_STRIPE, ellipse(0.85, 0, 0.1, 0.08)],
    [...pods(-0.15, [0.4, 0.7]), TAIL_STRIPE],
  ]),
  'B2 bomber': liveries(B2_BASE, [
    B2_BASE.details ?? [],
    [ellipse(0.32, 0, 0.1, 0.06), ellipse(-0.05, 0.3, 0.12, 0.04), ellipse(-0.05, -0.3, 0.12, 0.04)],
    [ellipse(0.32, 0, 0.12, 0.05), rect(-0.2, -0.04, 0.2, 0.04)],
    [
      ellipse(0.3, 0, 0.1, 0.06),
      ellipse(0.05, 0.15, 0.14, 0.05),
      ellipse(0.05, -0.15, 0.14, 0.05),
      ellipse(-0.2, 0.55, 0.1, 0.04),
      ellipse(-0.2, -0.55, 0.1, 0.04),
    ],
    [ellipse(0.34, 0, 0.08, 0.05)],
  ]),
  'military plane': [
    vtolJet(0.6, 0.38),
    vtolJet(0.7, 0.34),
    vtolJet(0.52, 0.42),
    tiltrotor(0.42, 3),
    tiltrotor(0.38, 4),
    tiltrotor(0.45, 3),
  ],
  plane: [
    {
      body: [
        mirrored([
          [1, 0],
          [0.88, 0.14],
          [-0.75, 0.12],
          [-0.92, 0.42],
          [-1, 0.42],
          [-1, 0],
        ]),
        wing(0.05, 0.3, 0.95),
      ],
      details: [ellipse(0.8, 0, 0.1, 0.07), rect(0.18, 0.36, 0.42, 0.48), rect(0.18, -0.48, 0.42, -0.36)],
      rotors: [
        { x: 0.45, y: 0.42, r: 0.28, blades: 4 },
        { x: 0.45, y: -0.42, r: 0.28, blades: 4 },
      ],
    },
  ],
  'fast jet': [
    {
      body: [
        mirrored([
          [1.1, 0],
          [0.7, 0.08],
          [0.25, 0.14],
          [-0.55, 0.7],
          [-0.7, 0.7],
          [-0.6, 0.14],
          [-0.8, 0.12],
          [-0.95, 0.38],
          [-1.05, 0.38],
          [-1, 0],
        ]),
      ],
      details: [ellipse(0.6, 0, 0.18, 0.05), rect(-1.02, -0.06, -0.85, 0.06)],
    },
  ],
  small: [
    CIVIL.small![0]!,
    {
      body: [
        mirrored([
          [0.9, 0],
          [0.82, 0.1],
          [0.25, 0.12],
          [0.2, 0.9],
          [-0.05, 0.9],
          [-0.1, 0.12],
          [-0.72, 0.07],
          [-0.8, 0.36],
          [-0.95, 0.36],
          [-0.95, 0],
        ]),
      ],
      details: [ellipse(0.45, 0, 0.22, 0.07)],
    },
  ],
  'military heli': CARRIER.helicopter!,
  stealth: [
    {
      body: [
        mirrored([
          [1.05, 0],
          [0.3, 0.22],
          [-0.45, 0.95],
          [-0.65, 0.88],
          [-0.5, 0.36],
          [-0.82, 0.3],
          [-0.95, 0.12],
          [-0.75, 0],
        ]),
      ],
      details: [
        mirrored([
          [0.7, 0],
          [0.45, 0.08],
          [0.25, 0],
        ]),
        rect(-0.6, 0.18, -0.35, 0.24),
        rect(-0.6, -0.24, -0.35, -0.18),
      ],
    },
  ],
};

const SKI_PLANE: Sprite = {
  body: [
    mirrored([
      [0.9, 0],
      [0.86, 0.12],
      [0.3, 0.15],
      [-0.7, 0.06],
      [-0.92, 0.06],
      [-0.92, 0],
    ]),
    wing(0.1, 0.38, 1),
    wing(-0.92, -0.72, 0.38),
  ],
  details: [ellipse(0.52, 0, 0.1, 0.08), rect(0.4, 0.18, 0.78, 0.25), rect(0.4, -0.25, 0.78, -0.18)],
  rotors: [{ x: 0.95, y: 0, r: 0.32, blades: 2 }],
};

const TURBOPROP: Sprite = {
  body: [
    mirrored([
      [1, 0],
      [0.92, 0.15],
      [0.7, 0.19],
      [-0.55, 0.17],
      [-0.92, 0.07],
      [-1, 0],
    ]),
    wing(0.02, 0.26, 1),
    wing(-0.98, -0.8, 0.42),
  ],
  details: [ellipse(0.84, 0, 0.1, 0.1), ...pods(0.14, [0.36, 0.68])],
  rotors: [0.36, 0.68, -0.36, -0.68].map((y) => ({ x: 0.4, y, r: 0.2, blades: 4 })),
};

const ARCTIC: Record<string, readonly Sprite[]> = {
  'ski plane': [SKI_PLANE],
  turboprop: [TURBOPROP, { ...TURBOPROP, details: [...(TURBOPROP.details ?? []), rect(0.55, -0.19, 0.65, 0.19), TAIL_STRIPE] }],
  jet: [CIVIL_MEDIUM],
};

function floatplane(span: number, extra: readonly Polygon[] = []): Sprite {
  return {
    body: [
      rect(-0.35, 0.22, 0.7, 0.32),
      rect(-0.35, -0.32, 0.7, -0.22),
      mirrored([
        [0.9, 0],
        [0.84, 0.12],
        [0.3, 0.14],
        [-0.72, 0.06],
        [-0.92, 0.06],
        [-0.92, 0],
      ]),
      wing(0.08, 0.36, span),
      wing(-0.92, -0.74, 0.36),
    ],
    details: [ellipse(0.5, 0, 0.1, 0.08), ...extra],
    rotors: [{ x: 0.95, y: 0, r: 0.32, blades: 2 }],
  };
}

const FLYING_BOAT: Sprite = {
  body: [
    mirrored([
      [1, 0],
      [0.9, 0.16],
      [0.55, 0.2],
      [-0.5, 0.14],
      [-0.95, 0.05],
      [-1, 0],
    ]),
    wing(0, 0.24, 1),
    rect(-0.05, 0.86, 0.2, 0.96),
    rect(-0.05, -0.96, 0.2, -0.86),
    wing(-0.98, -0.8, 0.4),
  ],
  details: [ellipse(0.82, 0, 0.1, 0.1), ...pods(0.1, [0.34])],
  rotors: [
    { x: 0.36, y: 0.34, r: 0.24, blades: 3 },
    { x: 0.36, y: -0.34, r: 0.24, blades: 3 },
  ],
};

const VOLCANO: Record<string, readonly Sprite[]> = {
  seaplane: [floatplane(1), floatplane(0.9, [TAIL_STRIPE])],
  'flying boat': [FLYING_BOAT],
  'island hopper': CIVIL.small!,
};

const NAV_PORT = '#ff4040';
const NAV_STARBOARD = '#40ff70';
const STROBE = '#ffffff';
const STROBE_MS = 1100;

function navLights(tipX: number, span: number, tailX: number): Light[] {
  return [
    { x: tipX, y: -span, color: NAV_PORT },
    { x: tipX, y: span, color: NAV_STARBOARD },
    { x: tailX, y: 0, color: STROBE, period: STROBE_MS },
  ];
}

const AIRLINER_LIGHTS = navLights(-0.2, 0.9, -0.95);
const AIRLINER_DETAILS = CIVIL_MEDIUM.details ?? [];
const CIVIL_FAST = CIVIL.fast![0]!;
const CIVIL_HELI = CIVIL.heli![0]!;

const NIGHT: Record<string, readonly Sprite[]> = {
  airliner: [
    AIRLINER_DETAILS,
    [...AIRLINER_DETAILS, TAIL_STRIPE],
    [...AIRLINER_DETAILS, rect(0.3, -0.11, 0.42, 0.11)],
  ].map((details) => ({ body: CIVIL_MEDIUM.body, details, lights: AIRLINER_LIGHTS })),
  jumbo: [
    {
      body: CARGO_SUPERJET_BASE.body,
      details: [ellipse(0.85, 0, 0.1, 0.08), ...pods(-0.15, [0.4, 0.7])],
      lights: navLights(-0.35, 0.98, -1),
    },
  ],
  regional: [
    {
      body: [
        mirrored([
          [1, 0],
          [0.86, 0.11],
          [0.1, 0.12],
          [-0.15, 0.8],
          [-0.32, 0.8],
          [-0.3, 0.12],
          [-0.78, 0.1],
          [-0.9, 0.42],
          [-1, 0.42],
          [-0.98, 0],
        ]),
      ],
      details: [ellipse(0.8, 0, 0.1, 0.06), rect(-0.7, 0.12, -0.45, 0.22), rect(-0.7, -0.22, -0.45, -0.12)],
      lights: navLights(-0.24, 0.8, -0.99),
    },
  ],
  bizjet: [
    {
      body: CIVIL_FAST.body,
      details: [...(CIVIL_FAST.details ?? []), rect(-0.8, 0.1, -0.6, 0.18), rect(-0.8, -0.18, -0.6, -0.1)],
      lights: navLights(-0.61, 0.9, -1),
    },
  ],
  heli: [{ ...CIVIL_HELI, lights: navLights(0.2, 0.42, -1.12) }],
};

function strut(angle: number, from: number, to: number, width: number): Polygon {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const px = -s * width;
  const py = c * width;
  return [
    [c * from - px, s * from - py],
    [c * to - px, s * to - py],
    [c * to + px, s * to + py],
    [c * from + px, s * from + py],
  ];
}

function lander(offset: number, cabin: readonly Polygon[]): Sprite {
  const angles = [0, 1, 2, 3].map((i) => offset + (i * Math.PI) / 2);
  return {
    body: [
      ellipse(0, 0, 0.52, 0.52, 8),
      ...angles.map((a) => strut(a, 0.45, 0.92, 0.05)),
      ...angles.map((a) => ellipse(Math.cos(a) * 0.95, Math.sin(a) * 0.95, 0.12, 0.12, 10)),
    ],
    details: cabin,
  };
}

function lightRing(count: number, radius: number, color: string, period: number): Light[] {
  return Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2;
    return { x: Math.cos(a) * radius, y: Math.sin(a) * radius, color, period, phase: (i * period) / count };
  });
}

const LUNAR: Record<string, readonly Sprite[]> = {
  shuttle: [
    {
      body: [
        mirrored([
          [1, 0],
          [0.9, 0.1],
          [0.55, 0.16],
          [0.2, 0.2],
          [-0.55, 0.88],
          [-0.78, 0.9],
          [-0.8, 0.2],
          [-0.95, 0.16],
          [-0.95, 0],
        ]),
      ],
      details: [
        ellipse(0.92, 0, 0.08, 0.07),
        rect(-0.45, -0.1, 0.5, 0.1),
        ellipse(-0.98, 0, 0.05, 0.05),
        ellipse(-0.98, 0.09, 0.05, 0.05),
        ellipse(-0.98, -0.09, 0.05, 0.05),
      ],
    },
  ],
  'space plane': [
    {
      body: [
        mirrored([
          [1, 0],
          [0.8, 0.2],
          [0.3, 0.34],
          [-0.5, 0.46],
          [-0.8, 0.72],
          [-0.95, 0.7],
          [-0.9, 0.3],
          [-0.95, 0],
        ]),
      ],
      details: [ellipse(0.62, 0, 0.14, 0.09), rect(-0.9, -0.08, -0.7, 0.08)],
    },
  ],
  lander: [
    lander(Math.PI / 4, [rect(-0.2, -0.22, 0.25, 0.22), ellipse(0.3, 0, 0.08, 0.06)]),
    lander(0, [ellipse(0, 0, 0.26, 0.26, 6), rect(0.22, -0.06, 0.4, 0.06)]),
  ],
  rocket: [
    {
      body: [
        mirrored([
          [1, 0],
          [0.8, 0.14],
          [0.5, 0.22],
          [-0.7, 0.22],
          [-0.75, 0.2],
          [-0.75, 0],
        ]),
        mirrored([
          [-0.35, 0],
          [-0.35, 0.22],
          [-0.75, 0.55],
          [-0.95, 0.55],
          [-0.85, 0.22],
          [-0.85, 0],
        ]),
      ],
      details: [rect(0.35, -0.22, 0.45, 0.22), ellipse(-0.9, 0, 0.12, 0.14)],
    },
  ],
  UFO: [
    {
      body: [ellipse(0, 0, 1, 1, 24)],
      details: [
        ellipse(0, 0, 0.42, 0.42, 16),
        ...Array.from({ length: 8 }, (_, i) => {
          const a = ((i + 0.5) / 8) * Math.PI * 2;
          return ellipse(Math.cos(a) * 0.86, Math.sin(a) * 0.86, 0.07, 0.07, 8);
        }),
      ],
      lights: lightRing(8, 0.72, '#fff2a0', 900),
    },
  ],
};

const FAMILIES: Record<string, Record<string, readonly Sprite[]>> = {
  'fleet': CARRIER,
  'airshow': VINTAGE,
  'coast': MILITARY,
  'arctic-outpost': ARCTIC,
  'volcano-island': VOLCANO,
  'city-lights': NIGHT,
  'moon-base': LUNAR,
};

function spriteFor(map: MapDef, strip: Strip | undefined, variant: number): Sprite {
  const family = FAMILIES[map.background];
  const name = strip?.name ?? '';
  const set = family?.[name] ?? CIVIL[name] ?? CARRIER[name] ?? [CIVIL_MEDIUM];
  return set[variant % set.length] ?? CIVIL_MEDIUM;
}

function starboard(polygon: Polygon): Polygon {
  const out: (readonly [number, number])[] = [];
  polygon.forEach(([x, y], i) => {
    const [px, py] = polygon[(i + polygon.length - 1) % polygon.length]!;
    if (py >= 0 !== y >= 0) out.push([px + ((x - px) * -py) / (y - py), 0]);
    if (y >= 0) out.push([x, y]);
  });
  return out;
}

function pathOf(polygons: readonly Polygon[]): Path2D {
  const path = new Path2D();
  for (const polygon of polygons) {
    polygon.forEach(([x, y], i) => (i === 0 ? path.moveTo(x, y) : path.lineTo(x, y)));
    path.closePath();
  }
  return path;
}

interface Shape {
  body: Path2D;
  facet: Path2D;
  details: Path2D | null;
}

const shapes = new WeakMap<Sprite, Shape>();

function shapeOf(sprite: Sprite): Shape {
  let shape = shapes.get(sprite);
  if (shape === undefined) {
    shape = {
      body: pathOf(sprite.body),
      facet: pathOf(sprite.body.map(starboard).filter((polygon) => polygon.length >= 3)),
      details: sprite.details === undefined ? null : pathOf(sprite.details),
    };
    shapes.set(sprite, shape);
  }
  return shape;
}

function drawRotors(ctx: CanvasRenderingContext2D, sprite: Sprite, r: number, angle: number): void {
  if (sprite.rotors === undefined) return;
  for (const [i, rotor] of sprite.rotors.entries()) {
    const cx = rotor.x * r;
    const cy = rotor.y * r;
    const radius = rotor.r * r;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(17, 21, 26, 0.1)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(17, 21, 26, 0.75)';
    ctx.lineWidth = Math.max(1, radius * 0.08);
    ctx.lineCap = 'round';
    ctx.beginPath();
    const spin = angle * (i % 2 === 0 ? 1 : -1);
    for (let b = 0; b < rotor.blades; b++) {
      const a = spin + (b / rotor.blades) * Math.PI * 2;
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius);
    }
    ctx.stroke();
  }
}

const lightPhases = new WeakMap<Aircraft, number>();

function lightPhase(a: Aircraft): number {
  let phase = lightPhases.get(a);
  if (phase === undefined) {
    phase = Math.random() * LIGHT_PHASE_SPAN;
    lightPhases.set(a, phase);
  }
  return phase;
}

function lit(light: Light, clock: number): boolean {
  if (light.period === undefined) return true;
  return (clock + (light.phase ?? 0)) % light.period < light.period * LIGHT_DUTY;
}

function drawLights(ctx: CanvasRenderingContext2D, sprite: Sprite, r: number, clock: number): void {
  if (sprite.lights === undefined) return;
  const base = ctx.globalAlpha;
  for (const light of sprite.lights) {
    if (!lit(light, clock)) continue;
    const x = light.x * r;
    const y = light.y * r;
    ctx.fillStyle = light.color;
    ctx.globalAlpha = base * LIGHT_HALO_ALPHA;
    ctx.beginPath();
    ctx.arc(x, y, LIGHT_HALO, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = base;
    ctx.beginPath();
    ctx.arc(x, y, LIGHT_CORE, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = base;
}

export function stripColor(world: World, a: Aircraft): number | undefined {
  const strip = world.map.strips[a.stripIndex];
  return strip === undefined ? undefined : world.map.colors[strip.color];
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

function enteringScale(a: Aircraft): number {
  if (!a.flags.entering) return 1;
  const { x, y } = a.position;
  const inset = Math.min(x, WORLD_WIDTH - x, y, WORLD_HEIGHT - y);
  const t = Math.max(0, Math.min(1, (inset + a.radius) / (2 * a.radius)));
  return ENTERING_MIN_SCALE + (1 - ENTERING_MIN_SCALE) * smoothstep(t);
}

function drawOne(ctx: CanvasRenderingContext2D, world: World, a: Aircraft, clock: number): void {
  const sprite = spriteFor(world.map, world.map.strips[a.stripIndex], a.variant);
  const shape = shapeOf(sprite);
  const alt = altitude(a, clock);
  const r = a.radius * enteringScale(a) * lerp(GROUND_SCALE, 1, alt);
  const flicker = a.flags.crashed && Math.floor(clock / CRASH_FLICKER_MS) % 2 === 1 ? CRASH_FLICKER_ALPHA : 1;
  const alpha = fadeAlpha(a, clock) * flicker;
  const shadow = {
    x: lerp(SHADOW_GROUND.x, SHADOW_FLYING.x, alt),
    y: lerp(SHADOW_GROUND.y, SHADOW_FLYING.y, alt),
    alpha: lerp(SHADOW_GROUND.alpha, SHADOW_FLYING.alpha, alt),
  };
  const heading = (a.heading * Math.PI) / 180;
  const color = stripColor(world, a) ?? UNCOLORED;

  ctx.save();
  ctx.globalAlpha = alpha * shadow.alpha;
  ctx.translate(a.position.x + shadow.x, a.position.y + shadow.y);
  ctx.rotate(heading);
  ctx.scale(r, r);
  ctx.fillStyle = hex(INK);
  ctx.fill(shape.body);
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(a.position.x, a.position.y);
  if (a.flags.dragged) {
    ctx.beginPath();
    ctx.arc(0, 0, r + SELECT_PAD, 0, Math.PI * 2);
    ctx.strokeStyle = SELECT_RING;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.rotate(heading);
  ctx.save();
  ctx.scale(r, r);
  ctx.fillStyle = hex(color);
  ctx.fill(shape.body);
  ctx.fillStyle = FACET;
  ctx.fill(shape.facet);
  if (shape.details !== null) {
    ctx.fillStyle = hex(mix(color, INK, DETAIL_SHADE));
    ctx.fill(shape.details);
  }
  ctx.lineWidth = OUTLINE_WIDTH / r;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = hex(mix(color, INK, OUTLINE_SHADE));
  ctx.stroke(shape.body);
  ctx.restore();
  const spinning = a.behaviour !== 'parked' && !a.flags.crashed;
  drawRotors(ctx, sprite, r, (spinning ? clock * ROTOR_SPEED : 0) + a.variant);
  drawLights(ctx, sprite, r, clock + lightPhase(a));
  ctx.restore();
}

export function drawAircraft(
  ctx: CanvasRenderingContext2D,
  world: World,
  aircraft: readonly Aircraft[],
  clock: number,
): void {
  const landed = aircraft.filter((a) => a.behaviour !== 'flying');
  const flying = aircraft.filter((a) => a.behaviour === 'flying');
  for (const a of [...landed, ...flying]) drawOne(ctx, world, a, clock);
}
