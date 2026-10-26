import { formatMoney, t } from '../i18n';

/**
 * Tiny DOM helpers — the UI is hand-built, with no framework.
 *
 * The label-shaped helpers translate their label argument themselves, so
 * call sites stay readable and no screen can quietly go untranslated
 * because someone forgot a `t(...)`.
 */

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function div(className?: string, text?: string): HTMLDivElement {
  return el('div', className, text);
}

export function span(className?: string, text?: string): HTMLSpanElement {
  return el('span', className, text);
}

export function button(label: string, className = '', onClick?: () => void): HTMLButtonElement {
  const b = el('button', `btn ${className}`.trim(), t(label));
  if (onClick) b.addEventListener('click', onClick);
  return b;
}

export function clear(node: HTMLElement): void {
  while (node.firstChild) node.removeChild(node.firstChild);
}

export function append(parent: HTMLElement, ...children: (Node | null | undefined)[]): void {
  for (const c of children) if (c) parent.appendChild(c);
}

/** Label/value row used throughout the panels. */
export function statRow(label: string, value: string, valueClass = ''): HTMLDivElement {
  const row = div('stat-row');
  row.appendChild(span('stat-label', t(label)));
  row.appendChild(span(`stat-value ${valueClass}`.trim(), value));
  return row;
}

/** A 0-100 bar with an optional colour override. */
export function bar(value: number, color?: string, max = 100): HTMLDivElement {
  const wrap = div('bar');
  const fill = div('bar-fill');
  fill.style.width = `${Math.max(0, Math.min(100, (value / max) * 100))}%`;
  if (color) fill.style.background = color;
  wrap.appendChild(fill);
  return wrap;
}

/** Attribute row: name, numeric value, and a bar — the crew panel's staple. */
export function attrRow(label: string, value: number, color?: string): HTMLDivElement {
  const row = div('attr-row');
  row.appendChild(span('attr-label', t(label)));
  row.appendChild(bar(value, color));
  row.appendChild(span('attr-value', String(Math.round(value))));
  return row;
}

export function sectionTitle(text: string): HTMLDivElement {
  return div('section-title', t(text));
}

/** Explanatory prose. Always translated. */
export function note(text: string): HTMLDivElement {
  return div('note', t(text));
}

/** A translated block of text with {named} values already substituted. */
export function noteRaw(text: string): HTMLDivElement {
  return div('note', text);
}

export function pill(text: string, className = ''): HTMLSpanElement {
  return span(`pill ${className}`.trim(), t(text));
}

export function formatCredits(n: number): string {
  return formatMoney(n);
}

export function formatDelta(n: number, digits = 0): string {
  const v = digits > 0 ? n.toFixed(digits) : String(Math.round(n));
  return n > 0 ? `+${v}` : v;
}

export function deltaClass(n: number): string {
  if (n > 0.05) return 'good';
  if (n < -0.05) return 'bad';
  return 'neutral';
}

/** Escape hatch for text that came from data files. */
export function text(node: HTMLElement, value: string): void {
  node.textContent = value;
}
