import { WORLD_HEIGHT, WORLD_WIDTH } from '../config/world';

export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface Screen {
  width: number;
  height: number;
  insets: Insets;
  overscan: number;
}

export interface Fit {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export function fitViewport({ width, height, insets, overscan }: Screen): Fit {
  const safeWidth = width - insets.left - insets.right;
  const safeHeight = height - insets.top - insets.bottom;
  const widthFit = safeWidth / WORLD_WIDTH;
  const scale = Math.min(Math.min(widthFit, safeHeight / WORLD_HEIGHT) * overscan, widthFit);
  const worldWidth = WORLD_WIDTH * scale;
  const centered = (width - worldWidth) / 2;
  return {
    scale,
    offsetX: Math.max(insets.left, Math.min(width - insets.right - worldWidth, centered)),
    offsetY: insets.top + (safeHeight - WORLD_HEIGHT * scale) / 2,
  };
}
