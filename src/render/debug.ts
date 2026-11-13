import { WORLD_HEIGHT, WORLD_WIDTH } from '../config/world';
import { isAirborne } from '../game/aircraft';
import type { Game } from '../game/game';
import type { Point } from '../game/geometry';
import type { HelipadZone, RunwayZone, World } from '../game/world';
import { footprints, layoutIssues } from './footprint';
import { drawMap, stripColor, zoneColor } from './map';

const LEGEND_WIDTH = 300;
const LEGEND_ROW = 14;

function drawGrid(ctx: CanvasRenderingContext2D): void {
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 50; x < WORLD_WIDTH; x += 50) {
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, WORLD_HEIGHT);
  }
  for (let y = 50; y < WORLD_HEIGHT; y += 50) {
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(WORLD_WIDTH, y + 0.5);
  }
  ctx.stroke();
}

function drawLabel(ctx: CanvasRenderingContext2D, text: string, at: Point): void {
  ctx.font = '11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.strokeText(text, at.x, at.y);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, at.x, at.y);
}

function drawRunwayDebug(ctx: CanvasRenderingContext2D, runway: RunwayZone, index: number): void {
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.lineWidth = 1;
  for (const path of runway.taxiPaths) {
    ctx.beginPath();
    path.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
    for (const p of path) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(runway.start.x, runway.start.y, 3, 0, Math.PI * 2);
  ctx.fill();

  const angle = (runway.heading * Math.PI) / 180;
  const mid = {
    x: (runway.start.x + runway.end.x) / 2 + Math.sin(angle) * 14,
    y: (runway.start.y + runway.end.y) / 2 - Math.cos(angle) * 14,
  };
  drawLabel(ctx, `R${index + 1} ${runway.heading.toFixed(1)}°`, mid);
}

function drawHelipadDebug(ctx: CanvasRenderingContext2D, world: World, pad: HelipadZone, index: number): void {
  ctx.strokeStyle = zoneColor(world, pad);
  ctx.setLineDash([4, 4]);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(pad.center.x, pad.center.y, pad.captureRadius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  drawLabel(ctx, `H${index + 1}`, { x: pad.center.x, y: pad.center.y - pad.captureRadius - 8 });
}

function zonesAccepting(world: World, stripIndex: number): string {
  const zones = [
    ...world.runways.flatMap((r, i) => (r.filter.has(stripIndex) ? [`R${i + 1}`] : [])),
    ...world.helipads.flatMap((h, i) => (h.filter.has(stripIndex) ? [`H${i + 1}`] : [])),
  ];
  return zones.length > 0 ? zones.join(' ') : '-';
}

function drawLegend(ctx: CanvasRenderingContext2D, world: World): void {
  const { map } = world;
  const rows = map.strips.length + 1;
  const x = WORLD_WIDTH - LEGEND_WIDTH - 8;
  const y = 8;
  const height = 24 + rows * LEGEND_ROW;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(x, y, LEGEND_WIDTH, height);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText(map.title, x + 8, y + 12);

  ctx.font = '11px system-ui, sans-serif';
  let rowY = y + 12 + LEGEND_ROW + 2;
  map.strips.forEach((strip, i) => {
    ctx.fillStyle = stripColor(world, i);
    ctx.fillRect(x + 8, rowY - 4, 8, 8);
    ctx.fillStyle = '#ffffff';
    const tags = strip.special ? ' special' : '';
    ctx.fillText(
      `${strip.name}${tags}  t${strip.type} w${strip.weight} sp${strip.speed} r${strip.radius}  → ${zonesAccepting(world, i)}`,
      x + 22,
      rowY,
    );
    rowY += LEGEND_ROW;
  });

  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.fillText(`hold ${map.landedHoldMs} ms  decay ${map.intervalDecay}/${map.pauseDecay}`, x + 8, rowY);
}

function drawFootprints(ctx: CanvasRenderingContext2D, world: World): void {
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  for (const f of footprints(world)) {
    for (const line of f.outline) line.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  }
  ctx.stroke();
  ctx.setLineDash([]);
}

const issueCache = new WeakMap<World, string[]>();

function drawLayoutIssues(ctx: CanvasRenderingContext2D, world: World): void {
  let issues = issueCache.get(world);
  if (issues === undefined) {
    issues = layoutIssues(world);
    issueCache.set(world, issues);
  }
  const x = 8;
  const y = 8;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(x, y, 250, 12 + Math.max(1, issues.length) * LEGEND_ROW);
  ctx.font = '11px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = issues.length === 0 ? '#8fe38f' : '#ff7a7a';
  if (issues.length === 0) ctx.fillText('layout ok', x + 8, y + 6 + LEGEND_ROW / 2);
  issues.forEach((issue, i) => ctx.fillText(issue, x + 8, y + 6 + LEGEND_ROW / 2 + i * LEGEND_ROW));
}

function drawFooter(ctx: CanvasRenderingContext2D, world: World): void {
  ctx.font = '11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.fillText(
    `${world.map.id}  ←/→ map  F fast-forward  T taxi  R restart  drag to draw`,
    WORLD_WIDTH / 2,
    WORLD_HEIGHT - 6,
  );
}

export function drawMapDebug(ctx: CanvasRenderingContext2D, world: World): void {
  drawMap(ctx, world, true);
  drawGrid(ctx);
  world.runways.forEach((r, i) => drawRunwayDebug(ctx, r, i));
  world.helipads.forEach((h, i) => drawHelipadDebug(ctx, world, h, i));
  drawFootprints(ctx, world);
  drawLegend(ctx, world);
  drawLayoutIssues(ctx, world);
  drawFooter(ctx, world);
}

function spawnDebugLines(game: Game): string[] {
  const d = game.director;
  const airborne = game.aircraft.filter(isAirborne).length;
  const nextIn = Math.max(0, d.nextSpawnAt - game.clock);
  const special =
    d.specialDueLevel === null ? '-' : `L${d.specialDueLevel}${d.specialPending ? ' pending' : ''}`;
  const event =
    game.lastEvent === undefined
      ? '-'
      : `${game.lastEvent.name} @${(game.lastEvent.at / 1000).toFixed(1)}s`;
  return [
    `seed ${game.seed}  clock ${(game.clock / 1000).toFixed(1)}s  ${game.fastForward ? 'FF 2x' : '1x'}`,
    `level ${d.level}  spawned ${d.spawnedThisLevel}/${d.quota}`,
    `interval ${d.interval}  pause ${d.pause}  next in ${Math.round(nextIn)}`,
    `holding ${d.holding ? `yes (<= ${d.level + 2})` : d.beginnerAid ? 'no' : 'off'}  airborne ${airborne}`,
    `special ${special}  slots ${d.recentSlots.join(',') || '-'}`,
    `score ${game.score}  taxi ${game.taxi ? 'on' : 'off'}`,
    `crash ${crashStatus(game)}`,
    `event ${event}`,
  ];
}

function crashStatus(game: Game): string {
  if (game.gameOver) return 'game over';
  if (game.gameOverAt === undefined) return '-';
  return `grace ${((game.gameOverAt - game.clock) / 1000).toFixed(1)}s`;
}

export function drawSpawnDebug(ctx: CanvasRenderingContext2D, game: Game): void {
  const lines = spawnDebugLines(game);
  const x = 8;
  const height = 10 + lines.length * LEGEND_ROW;
  const y = WORLD_HEIGHT - 24 - height;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(x, y, 250, height);
  ctx.font = '11px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  lines.forEach((line, i) => ctx.fillText(line, x + 8, y + 12 + i * LEGEND_ROW));
}

export function drawGameOver(ctx: CanvasRenderingContext2D, game: Game): void {
  if (!game.gameOver) return;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 48px system-ui, sans-serif';
  ctx.fillText('GAME OVER', WORLD_WIDTH / 2, WORLD_HEIGHT / 2 - 30);
  ctx.font = '18px system-ui, sans-serif';
  ctx.fillText(`Score ${game.score}`, WORLD_WIDTH / 2, WORLD_HEIGHT / 2 + 14);
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillText('R to restart', WORLD_WIDTH / 2, WORLD_HEIGHT / 2 + 42);
}
