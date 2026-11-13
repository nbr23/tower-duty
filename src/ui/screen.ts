import type { App } from './app';

export interface Screen {
  view(app: App): HTMLElement;
  press(app: App, id: string, now: number): void;
  draw(ctx: CanvasRenderingContext2D, app: App, now: number): void;
  frame?(view: HTMLElement, app: App, now: number): void;
  keys?: Readonly<Record<string, string>>;
}
