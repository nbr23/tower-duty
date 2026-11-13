const MIN_DT = 1;
const MAX_DT = 100;
const AVERAGE_FRAMES = 50;

export function startLoop(update: (dt: number) => void, render: () => void): void {
  const samples: number[] = [];
  let sum = 0;
  let last: number | undefined;

  function frame(now: number): void {
    const raw = last === undefined ? MIN_DT : now - last;
    last = now;
    const dt = Math.min(MAX_DT, Math.max(MIN_DT, raw));
    samples.push(dt);
    sum += dt;
    if (samples.length > AVERAGE_FRAMES) sum -= samples.shift()!;
    update(sum / samples.length);
    render();
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}
