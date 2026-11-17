export function drawBackdrop(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.resetTransform();
  ctx.fillStyle = '#0c1521';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
}
