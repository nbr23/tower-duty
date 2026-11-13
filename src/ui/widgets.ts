export type Child = Node | string | null | undefined | false;
type Attr = string | number | boolean | null | undefined;

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Readonly<Record<string, Attr>> = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) {
    if (value === undefined || value === null || value === false) continue;
    el.setAttribute(name, value === true ? '' : String(value));
  }
  for (const child of children) if (child !== null && child !== undefined && child !== false) el.append(child);
  return el;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
const STROKE = 'fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"';

const ICONS = {
  pause: '<rect x="6" y="5" width="4.5" height="14" rx="1"/><rect x="13.5" y="5" width="4.5" height="14" rx="1"/>',
  fastForward: '<path d="M3.5 6.2v11.6a.6.6 0 0 0 .95.5L12 13v4.8a.6.6 0 0 0 .95.5l8-5.8a.6.6 0 0 0 0-1l-8-5.8a.6.6 0 0 0-.95.5V11L4.45 5.7a.6.6 0 0 0-.95.5z"/>',
  back: `<path d="M15 5l-7 7 7 7" ${STROKE}/>`,
  next: `<path d="M9 5l7 7-7 7" ${STROKE}/>`,
  play: '<path d="M7.5 5.3v13.4a.7.7 0 0 0 1.08.59l10.3-6.7a.7.7 0 0 0 0-1.18L8.58 4.71a.7.7 0 0 0-1.08.59z"/>',
  help: `<path d="M8.4 9.1a3.6 3.6 0 1 1 5.7 2.9c-1.2.9-2.1 1.5-2.1 3" ${STROKE}/><circle cx="12" cy="19" r="1.5"/>`,
  trophy:
    '<path fill-rule="evenodd" d="M7 3.5h10V5h3v2.5a4 4 0 0 1-3.6 4 5 5 0 0 1-3.4 3.4V17h2.5a1 1 0 0 1 1 1v2.5h-9V18a1 1 0 0 1 1-1H11v-2.1a5 5 0 0 1-3.4-3.4A4 4 0 0 1 4 7.5V5h3V3.5zM7 6.5H5.5v1A2.5 2.5 0 0 0 7 9.8V6.5zm10 0v3.3a2.5 2.5 0 0 0 1.5-2.3v-1H17z"/>',
  settings: `<path d="M4 7h16M4 12h16M4 17h16" ${STROKE}/><circle cx="9" cy="7" r="2.6"/><circle cx="15.5" cy="12" r="2.6"/><circle cx="8" cy="17" r="2.6"/>`,
  home: '<path d="M12 3.2L2.8 11h2.7v8.5a.5.5 0 0 0 .5.5h4v-5.5h4V20h4a.5.5 0 0 0 .5-.5V11h2.7L12 3.2z"/>',
  retry: `<path d="M19 12a7 7 0 1 1-2.05-4.95" ${STROKE}/><path d="M19.5 3.8v4.7h-4.7" ${STROKE}/>`,
  share: `<path d="M12 15V3m-4 4 4-4 4 4M5 13v7h14v-7" ${STROKE}/>`,
  github:
    '<path d="M12 .3a12 12 0 0 0-3.8 23.38c.6.12.83-.26.83-.57l-.02-2.04c-3.34.72-4.04-1.6-4.04-1.6-.55-1.4-1.33-1.77-1.33-1.77-1.09-.74.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.49 1 .1-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.64 1.66.24 2.88.12 3.18a4.65 4.65 0 0 1 1.23 3.22c0 4.61-2.8 5.63-5.48 5.92.43.37.81 1.1.81 2.22l-.01 3.29c0 .32.21.69.82.57A12 12 0 0 0 12 .3"/>',
} as const;

export type IconName = keyof typeof ICONS;

export function icon(name: IconName): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', 'icon');
  svg.innerHTML = ICONS[name];
  return svg;
}

const MARK_PLANE =
  'M1 0L.86 .13L.3 .16L.02 .95L-.3 .95L-.14 .16L-.62 .14L-.8 .48L-1 .48L-.92 0L-1-.48L-.8-.48L-.62-.14L-.14-.16L-.3-.95L.02-.95L.3-.16L.86-.13z';

export function logo(): HTMLHeadingElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 48 48');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', 'logo-mark');
  svg.innerHTML = `<rect class="mark-bg" width="48" height="48" rx="9"/><path class="mark-plane" transform="translate(24 24) rotate(-45) scale(17.5)" d="${MARK_PLANE}"/>`;
  return h('h1', { class: 'logo' }, svg, 'Tower Duty');
}

export interface ButtonOptions {
  variant?: 'primary' | 'secondary';
  icon?: IconName;
  sub?: string;
  disabled?: boolean;
  autofocus?: boolean;
  trigger?: 'down';
  pressed?: boolean;
  label?: string;
  className?: string;
}

export function button(id: string, content: Child, opts: ButtonOptions = {}): HTMLButtonElement {
  const classes = ['btn', `btn-${opts.variant ?? 'secondary'}`, opts.className].filter(Boolean).join(' ');
  return h(
    'button',
    {
      type: 'button',
      class: classes,
      'data-action': id,
      'data-autofocus': opts.autofocus,
      'data-trigger': opts.trigger,
      disabled: opts.disabled,
      'aria-label': opts.label,
      'aria-pressed': opts.pressed === undefined ? undefined : String(opts.pressed),
    },
    opts.icon === undefined ? null : icon(opts.icon),
    opts.sub === undefined
      ? content
      : h('span', { class: 'btn-text' }, h('span', { class: 'btn-label' }, content), h('span', { class: 'btn-sub' }, opts.sub)),
  );
}

export function iconButton(id: string, name: IconName, label: string, opts: ButtonOptions = {}): HTMLButtonElement {
  return button(id, icon(name), { ...opts, label, className: ['btn-icon', opts.className].filter(Boolean).join(' ') });
}

export function toggle(id: string, label: string, checked: boolean): HTMLLabelElement {
  return h(
    'label',
    { class: 'setting' },
    h('span', { class: 'setting-label' }, label),
    h('input', { type: 'checkbox', role: 'switch', class: 'switch-input', 'data-action': id, checked }),
    h('span', { class: 'switch', 'aria-hidden': 'true' }),
  );
}

export function screenHeader(title: string, extra: Child = null, backId = 'back'): HTMLElement {
  return h('header', { class: 'screen-header' }, iconButton(backId, 'back', 'Back'), h('h1', {}, title), extra);
}

export function screen(name: string, attrs: Readonly<Record<string, Attr>>, ...children: Child[]): HTMLDivElement {
  return h('div', { ...attrs, class: `screen screen-${name}` }, ...children);
}
