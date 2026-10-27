import { describe, expect, it } from 'vitest';
import { FR } from '../src/i18n/fr';
import { getLocale, setLocale, t, tf, tnote, formatMoney } from '../src/i18n';
import { collectAll } from '../scripts/extract-strings.mjs';

/**
 * Guards the translation table.
 *
 * The point of these tests is that adding a room, mission, course or event
 * without its French text is a build failure rather than a screen that
 * quietly falls back to English.
 */

const { content, ui } = await collectAll();

describe('French coverage', () => {
  it('translates every piece of game content', () => {
    const missing = [...content].filter((key) => FR[key] === undefined);
    expect(missing, `Untranslated content:\n${missing.join('\n')}`).toEqual([]);
  });

  it('translates every UI string', () => {
    const missing = [...ui].filter((key) => FR[key] === undefined);
    expect(missing, `Untranslated UI strings:\n${missing.join('\n')}`).toEqual([]);
  });

  it('has no French entry that is not actually used', () => {
    const used = new Set([...content, ...ui]);
    const orphans = Object.keys(FR).filter((k) => !used.has(k));
    expect(orphans, `Unused translations:\n${orphans.join('\n')}`).toEqual([]);
  });
});

describe('placeholder integrity', () => {
  it('keeps every {placeholder} present in the source string', () => {
    const broken: string[] = [];
    for (const [source, translated] of Object.entries(FR)) {
      const inSource = [...source.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
      const inTarget = [...translated.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
      if (inSource.join(',') !== inTarget.join(',')) {
        broken.push(`${source}\n  -> ${translated}`);
      }
    }
    expect(broken, `Placeholder mismatch:\n${broken.join('\n')}`).toEqual([]);
  });

  it('never leaves a translation empty', () => {
    const empty = Object.entries(FR)
      .filter(([, v]) => v.trim() === '')
      .map(([k]) => k);
    expect(empty).toEqual([]);
  });
});

describe('translation behaviour', () => {
  it('returns the source string in English', () => {
    setLocale('en');
    expect(t('STAFF')).toBe('STAFF');
    expect(getLocale()).toBe('en');
  });

  it('translates in French and falls back for unknown strings', () => {
    setLocale('fr');
    expect(t('STAFF')).toBe('EFFECTIF');
    expect(t('a string nobody translated')).toBe('a string nobody translated');
    setLocale('en');
  });

  it('prefers a context-qualified entry over the bare one', () => {
    setLocale('fr');
    // "Engine" is a trade and an aircraft system; they differ in French.
    expect(t('Engine')).toBe('Moteurs');
    expect(t('Engine', 'system')).toBe('Moteur');
    setLocale('en');
  });

  it('substitutes placeholders', () => {
    setLocale('fr');
    expect(tf('DAY {n}', { n: 12 })).toBe('JOUR 12');
    setLocale('en');
    expect(tf('DAY {n}', { n: 12 })).toBe('DAY 12');
  });

  it('renders deferred notes, translating tvars but not vars', () => {
    setLocale('fr');
    const rendered = tnote({
      key: '{name} injured — {days} days off duty',
      vars: { name: 'J. Miller', days: 6 },
    });
    expect(rendered).toBe('J. Miller blessé — 6 jours d’indisponibilité');

    const withT = tnote({
      key: 'Course: {course}',
      tvars: { course: 'Advanced Avionics' },
    });
    expect(withT).toBe('Stage : Avionique avancée');
    setLocale('en');
  });

  it('formats money for the active locale', () => {
    setLocale('en');
    expect(formatMoney(1234567)).toBe('$1,234,567');
    setLocale('fr');
    // French uses a narrow no-break space as the group separator.
    expect(formatMoney(1234567).endsWith('$')).toBe(true);
    expect(formatMoney(1234567).replace(/[\s\u202f\u00a0]/g, '')).toBe('1234567$');
    setLocale('en');
  });
});
