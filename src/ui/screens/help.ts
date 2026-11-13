import { MEADOW } from '../../config/maps';
import { WORLD_HEIGHT, WORLD_WIDTH } from '../../config/world';
import { createAircraft, type Aircraft } from '../../game/aircraft';
import type { Crash } from '../../game/game';
import type { Point } from '../../game/geometry';
import { drawAircraft } from '../../render/aircraft';
import { drawCrashFx, drawWarningRings } from '../../render/collision';
import { drawArrowhead, drawMap } from '../../render/map';
import { drawHighlights, drawPaths } from '../../render/path';
import { goto, previewWorld } from '../app';
import type { Screen } from '../screen';
import { button, h, iconButton, screen, screenHeader } from '../widgets';
import { drawBackdrop } from './backdrop';

const CRASH_LOOP_MS = 2400;

interface Slide {
  caption: string;
  aircraft: Aircraft[];
  crashes?: Crash[];
  finger?: Point;
  arrows?: boolean;
}

const world = previewWorld(MEADOW);

function plane(strip: number, x: number, y: number, heading: number, path: Point[] = [], dragged = false): Aircraft {
  const a = createAircraft(MEADOW, strip, { x, y }, heading);
  a.flags.entering = false;
  a.path = path;
  a.flags.dragged = dragged;
  return a;
}

function slides(): Slide[] {
  const [runwayA, runwayB] = world.runways;
  const [pad] = world.helipads;

  const drawn = plane(0, 120, 90, 15, [{ x: 200, y: 110 }, { x: 280, y: 100 }, { x: 350, y: 130 }], true);

  const landing = plane(0, 120, 300, -40, [
    { x: 170, y: 255 },
    { x: 220, y: 222 },
    { x: 265, y: 203 },
    { ...runwayA!.start },
    { ...runwayA!.end },
  ], true);
  landing.target = runwayA!;

  const red = plane(0, 140, 150, 20, [{ x: 220, y: 185 }, { ...runwayA!.start }, { ...runwayA!.end }]);
  const blue = plane(2, 190, 440, -40, [{ x: 250, y: 400 }, { ...runwayB!.start }, { ...runwayB!.end }]);
  const yellow = plane(3, 710, 360, -140, [{ x: 640, y: 290 }, { ...pad!.center }]);
  yellow.variant = 1;

  const warnA = plane(0, 130, 300, 10);
  const warnB = plane(2, 180, 330, -150);
  warnA.flags.danger = true;
  warnB.flags.danger = true;
  const crashA = plane(0, 700, 340, 30);
  const crashB = plane(1, 718, 352, 200);
  crashA.flags.crashed = true;
  crashB.flags.crashed = true;

  const entering = [plane(0, -4, 150, 0), plane(2, 560, 486, -90), plane(3, 860, 300, 180)];
  for (const a of entering) a.flags.entering = true;

  return [
    { caption: 'Touch an aircraft and drag to draw its flight path.', aircraft: [drawn], finger: { x: 350, y: 130 } },
    { caption: 'Aircraft follow their path. Lead it onto a runway to land.', aircraft: [landing] },
    { caption: 'Each aircraft lands only on the runway or helipad of its colour.', aircraft: [red, blue, yellow] },
    {
      caption: 'Keep aircraft apart: a red ring warns, a collision ends the game.',
      aircraft: [warnA, warnB, crashA, crashB],
      crashes: [{ at: { x: 709, y: 346 }, time: 0 }],
    },
    { caption: 'New aircraft enter from the edges and can be guided once fully on screen.', aircraft: entering, arrows: true },
  ];
}

let cache: Slide[] | null = null;

function slideAt(index: number): Slide {
  cache ??= slides();
  return cache[index]!;
}

export const HELP_SLIDES = 5;
const SWIPE_PX = 40;

function drawFinger(ctx: CanvasRenderingContext2D, p: Point): void {
  ctx.fillStyle = 'rgba(244, 242, 236, 0.35)';
  ctx.strokeStyle = '#f4f2ec';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function drawEntryArrows(ctx: CanvasRenderingContext2D, aircraft: readonly Aircraft[]): void {
  ctx.fillStyle = '#f4f2ec';
  for (const a of aircraft) {
    const angle = (a.heading * Math.PI) / 180;
    const tip = { x: a.position.x + Math.cos(angle) * 50, y: a.position.y + Math.sin(angle) * 50 };
    drawArrowhead(ctx, tip, a.heading, 16);
  }
}

function drawScene(ctx: CanvasRenderingContext2D, slide: Slide, now: number, width: number, height: number): void {
  const clock = now % CRASH_LOOP_MS;
  ctx.setTransform(width / WORLD_WIDTH, 0, 0, height / WORLD_HEIGHT, 0, 0);
  drawMap(ctx, world);
  drawHighlights(ctx, slide.aircraft);
  drawWarningRings(ctx, slide.aircraft, clock);
  drawPaths(ctx, world, slide.aircraft, clock);
  drawAircraft(ctx, world, slide.aircraft, clock);
  if (slide.crashes !== undefined) drawCrashFx(ctx, slide.crashes, clock);
  if (slide.arrows) drawEntryArrows(ctx, slide.aircraft);
  if (slide.finger !== undefined) drawFinger(ctx, slide.finger);
}

function sceneCanvas(caption: string): HTMLCanvasElement {
  const canvas = h('canvas', { class: 'help-scene', role: 'img', 'aria-label': caption });
  let startX: number | null = null;
  canvas.addEventListener('pointerdown', (e) => {
    startX = e.clientX;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointerup', (e) => {
    if (startX === null) return;
    const dx = e.clientX - startX;
    startX = null;
    if (Math.abs(dx) < SWIPE_PX) return;
    const target = canvas.closest('.screen')?.querySelector<HTMLButtonElement>(`[data-action="${dx < 0 ? 'next' : 'prev'}"]`);
    target?.click();
  });
  canvas.addEventListener('pointercancel', () => {
    startX = null;
  });
  return canvas;
}

function dots(index: number): HTMLElement {
  return h(
    'div',
    { class: 'dots' },
    ...Array.from({ length: HELP_SLIDES }, (_, i) =>
      h('button', {
        type: 'button',
        class: 'dot',
        'data-action': `slide-${i}`,
        'aria-label': `Step ${i + 1}`,
        'aria-current': i === index ? 'step' : undefined,
      }),
    ),
  );
}

export const helpScreen: Screen = {
  view(app) {
    const index = app.helpSlide;
    const slide = slideAt(index);
    const last = index === HELP_SLIDES - 1;
    return screen(
      'sub',
      { 'data-screen': 'help' },
      screenHeader('How to play', h('span', { class: 'counter' }, `${index + 1} / ${HELP_SLIDES}`)),
      h(
        'div',
        { class: 'help' },
        sceneCanvas(slide.caption),
        h(
          'div',
          { class: 'help-side' },
          h('p', { class: 'help-caption' }, slide.caption),
          h(
            'div',
            { class: 'help-nav' },
            iconButton('prev', 'back', 'Previous', { disabled: index === 0 }),
            dots(index),
            last ? button('back', 'Got it', { variant: 'primary', autofocus: true }) : iconButton('next', 'next', 'Next', { autofocus: true }),
          ),
        ),
      ),
    );
  },
  press(app, id) {
    if (id === 'prev') app.helpSlide = Math.max(0, app.helpSlide - 1);
    else if (id === 'next') app.helpSlide = Math.min(HELP_SLIDES - 1, app.helpSlide + 1);
    else if (id.startsWith('slide-')) app.helpSlide = Math.min(HELP_SLIDES - 1, Math.max(0, Number(id.slice(6))));
    else if (id === 'back') goto(app, app.back, 'menu');
  },
  draw(ctx, app) {
    drawBackdrop(ctx, app);
  },
  frame(view, app, now) {
    const canvas = view.querySelector<HTMLCanvasElement>('canvas.help-scene');
    if (canvas === null) return;
    const dpr = window.devicePixelRatio || 1;
    const width = Math.round(canvas.clientWidth * dpr);
    const height = Math.round(canvas.clientHeight * dpr);
    if (width === 0 || height === 0) return;
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (ctx !== null) drawScene(ctx, slideAt(app.helpSlide), now, width, height);
  },
  keys: { ArrowLeft: 'prev', ArrowRight: 'next', Escape: 'back' },
};
