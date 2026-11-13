import type { Point } from '../game/geometry';

export interface PointerHandlers {
  down(id: number, p: Point): boolean;
  move(id: number, p: Point, final?: boolean): void;
  up(id: number, now: number, p: Point): void;
}

export function attachPointerInput(
  canvas: HTMLCanvasElement,
  toWorld: (clientX: number, clientY: number) => Point,
  handlers: PointerHandlers,
): void {
  const last = new Map<number, Point>();

  canvas.addEventListener('pointerdown', (e) => {
    const p = toWorld(e.clientX, e.clientY);
    if (!handlers.down(e.pointerId, p)) return;
    canvas.setPointerCapture(e.pointerId);
    last.set(e.pointerId, p);
    e.preventDefault();
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!last.has(e.pointerId)) return;
    const coalesced = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [];
    for (const sample of coalesced.length > 0 ? coalesced : [e]) {
      const p = toWorld(sample.clientX, sample.clientY);
      last.set(e.pointerId, p);
      handlers.move(e.pointerId, p);
    }
  });

  const release = (id: number, now: number, p: Point): void => {
    if (!last.delete(id)) return;
    handlers.up(id, now, p);
  };
  canvas.addEventListener('pointerup', (e) => {
    if (!last.has(e.pointerId)) return;
    const p = toWorld(e.clientX, e.clientY);
    handlers.move(e.pointerId, p, true);
    release(e.pointerId, e.timeStamp, p);
  });
  const end = (e: PointerEvent): void => {
    const p = last.get(e.pointerId);
    if (p !== undefined) release(e.pointerId, e.timeStamp, p);
  };
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('lostpointercapture', end);

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) return;
    const now = performance.now();
    for (const [id, p] of [...last]) release(id, now, p);
  });
}
