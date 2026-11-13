import './style.css';
import { createAudio } from './audio/engine';
import { WORLD_HEIGHT, WORLD_WIDTH } from './config/world';
import type { Point } from './game/geometry';
import { startLoop } from './game/loop';
import { attachPointerInput } from './input/pointer';
import { createApp } from './ui/app';
import { choiceFromHash, createDebugMode } from './ui/debugShell';
import type { Mode } from './ui/mode';
import { createAppMode } from './ui/shell';

const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
const ctx = canvas.getContext('2d')!;
const uiRoot = document.querySelector<HTMLElement>('#ui')!;

const params = new URLSearchParams(location.search);

function dprCap(): number {
  const cap = Number.parseFloat(params.get('dpr') ?? '');
  return Number.isFinite(cap) && cap > 0 ? cap : Infinity;
}

const maxDpr = dprCap();

interface Viewport {
  scale: number;
  offsetX: number;
  offsetY: number;
  dpr: number;
}

function safeInset(side: 'top' | 'right' | 'bottom' | 'left'): number {
  const value = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue(`--safe-${side}`));
  return Number.isFinite(value) ? value : 0;
}

function computeViewport(): Viewport {
  const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
  const cssWidth = window.innerWidth;
  const cssHeight = window.innerHeight;
  canvas.width = Math.round(cssWidth * dpr);
  canvas.height = Math.round(cssHeight * dpr);
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;

  const top = safeInset('top');
  const left = safeInset('left');
  const safeWidth = cssWidth - left - safeInset('right');
  const safeHeight = cssHeight - top - safeInset('bottom');
  const scale = Math.min(safeWidth / WORLD_WIDTH, safeHeight / WORLD_HEIGHT);
  const offsetX = left + (safeWidth - WORLD_WIDTH * scale) / 2;
  const offsetY = top + (safeHeight - WORLD_HEIGHT * scale) / 2;
  return { scale, offsetX, offsetY, dpr };
}

let viewport = computeViewport();

function refreshViewport(): void {
  viewport = computeViewport();
}

function refreshViewportNextFrame(): void {
  requestAnimationFrame(refreshViewport);
}

window.addEventListener('resize', refreshViewport);
if (screen.orientation !== undefined) screen.orientation.addEventListener('change', refreshViewportNextFrame);
else window.addEventListener('orientationchange', refreshViewportNextFrame);

function fixedSeed(): number | null {
  const seed = Number.parseInt(params.get('seed') ?? '', 10);
  return Number.isFinite(seed) ? seed : null;
}

const audio = createAudio();
for (const type of ['pointerdown', 'pointerup', 'keydown'] as const) {
  window.addEventListener(type, () => audio.unlock(), { capture: true });
}

const mode: Mode = params.has('debug')
  ? createDebugMode(localStorage, fixedSeed() ?? Date.now() >>> 0, audio)
  : createAppMode(createApp(localStorage, fixedSeed(), choiceFromHash()), audio, uiRoot);

function toWorld(clientX: number, clientY: number): Point {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (clientX - rect.left - viewport.offsetX) / viewport.scale,
    y: (clientY - rect.top - viewport.offsetY) / viewport.scale,
  };
}

attachPointerInput(canvas, toWorld, mode);

const FPS_WINDOW_MS = 500;
const showFps = params.has('fps') || params.has('debug');
let fpsFrames = 0;
let fpsSince = performance.now();
let fps = 0;

function drawFps(): void {
  const now = performance.now();
  fpsFrames++;
  if (now - fpsSince >= FPS_WINDOW_MS) {
    fps = Math.round((fpsFrames * 1000) / (now - fpsSince));
    fpsFrames = 0;
    fpsSince = now;
  }
  ctx.font = '12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.fillText(`${fps} fps`, WORLD_WIDTH / 2, WORLD_HEIGHT - 30);
}

function render(): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#11151a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const { scale, offsetX, offsetY, dpr } = viewport;
  ctx.setTransform(scale * dpr, 0, 0, scale * dpr, offsetX * dpr, offsetY * dpr);
  mode.render(ctx);
  if (showFps) drawFps();
}

startLoop((dt) => mode.update(dt), render);
