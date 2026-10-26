import { FR } from './fr';
import type { LogNote } from '../core/types';

/**
 * Translation layer.
 *
 * English source strings are the keys — there is no English table to keep in
 * sync, and an untranslated string falls through to the original rather than
 * rendering a raw key. `tests/i18n.test.ts` asserts that every piece of game
 * content actually has a French entry, so the fallback stays a safety net
 * rather than a hiding place.
 */

export type Locale = 'en' | 'fr';

export const LOCALES: Locale[] = ['en', 'fr'];

export const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  fr: 'Français',
};

const STORAGE_KEY = 'deck-master.locale';

type Table = Record<string, string>;

const TABLES: Record<Locale, Table | null> = {
  en: null, // English is the source language
  fr: FR,
};

function detect(): Locale {
  try {
    const stored = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'fr') return stored;
  } catch {
    // Storage can be unavailable; fall through to browser detection.
  }
  const nav = globalThis.navigator?.language ?? 'en';
  return nav.toLowerCase().startsWith('fr') ? 'fr' : 'en';
}

let locale: Locale = detect();
const listeners = new Set<() => void>();

export function getLocale(): Locale {
  return locale;
}

export function setLocale(next: Locale): void {
  if (next === locale) return;
  locale = next;
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, next);
  } catch {
    // Persisting is a convenience, not a requirement.
  }
  for (const fn of listeners) fn();
}

/** Called whenever the language changes, so the UI can re-render in place. */
export function onLocaleChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Translate a source string.
 *
 * `ctx` disambiguates identical English words that need different French
 * ones — "Engine" the aircraft system versus "Engine" the trade, say. A
 * context-qualified entry wins over the bare one.
 */
export function t(text: string, ctx?: string): string {
  const table = TABLES[locale];
  if (!table) return text;
  if (ctx) {
    const scoped = table[`${ctx}|${text}`];
    if (scoped !== undefined) return scoped;
  }
  return table[text] ?? text;
}

/** Translate a template and substitute {named} placeholders. */
export function tf(template: string, vars?: Record<string, string | number>): string {
  const translated = t(template);
  if (!vars) return translated;
  return translated.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = vars[key];
    return value === undefined ? match : String(value);
  });
}

/**
 * Render a deferred log note: translate the template, translate any
 * translatable values, then substitute.
 */
export function tnote(note: LogNote): string {
  const merged: Record<string, string | number> = { ...(note.vars ?? {}) };
  for (const [key, value] of Object.entries(note.tvars ?? {})) {
    merged[key] = t(value);
  }
  return tf(note.key, merged);
}

/** Numbers, formatted for the active locale. */
export function formatNumber(n: number): string {
  return n.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US');
}

/** Currency, formatted for the active locale. */
export function formatMoney(n: number): string {
  const sign = n < 0 ? '-' : '';
  const abs = formatNumber(Math.abs(Math.round(n)));
  // French convention puts the unit after the amount.
  return locale === 'fr' ? `${sign}${abs} $` : `${sign}$${abs}`;
}

/** True when a source string has no translation in the active locale. */
export function isUntranslated(text: string): boolean {
  const table = TABLES[locale];
  if (!table) return false;
  return table[text] === undefined;
}

export function tableFor(l: Locale): Table | null {
  return TABLES[l];
}
