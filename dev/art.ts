/** Dev-only art sheet: every baked sprite at 1x and 4x, for iterating on the art. */
import { bakedAircraft } from '../src/render/pixelArt';
import { AIRCRAFT_TYPES } from '../src/data/aircraft';

const host = document.getElementById('aircraft')!;
const SCALE = 4;

function show(parent: HTMLElement, src: HTMLCanvasElement, label: string, scale: number, shadow?: HTMLCanvasElement): void {
  const cell = document.createElement('div');
  cell.className = 'cell';
  const c = document.createElement('canvas');
  c.width = (src.width + 4) * scale;
  c.height = (src.height + 4) * scale;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#3f4246';
  ctx.fillRect(0, 0, c.width, c.height);
  if (shadow) {
    ctx.globalAlpha = 0.35;
    ctx.drawImage(shadow, 3 * scale, 4 * scale, src.width * scale, src.height * scale);
    ctx.globalAlpha = 1;
  }
  ctx.drawImage(src, scale, scale, src.width * scale, src.height * scale);
  const l = document.createElement('div');
  l.textContent = label;
  cell.append(c, l);
  parent.append(cell);
}

for (const type of AIRCRAFT_TYPES) {
  const row = document.createElement('div');
  row.className = 'row';
  for (const folded of [false, true]) {
    const b = bakedAircraft(type.id, folded, 'VFA-14');
    show(row, b.sprite, `${type.id}${folded ? ' folded' : ''}`, 1, b.shadow);
    show(row, b.sprite, `${type.id}${folded ? ' folded' : ''} x4`, SCALE, b.shadow);
  }
  host.append(row);
}

(window as unknown as { artReady: boolean }).artReady = true;

// Personnel photographs: the first 48 of a fresh company, at 3x, plus the
// same faces tired, unhappy and injured.
import { newCampaign } from '../src/core/newGame';
import { portraitElement } from '../src/render/portrait';

const crewHost = document.createElement('div');
crewHost.className = 'row';
const title = document.createElement('h3');
title.textContent = 'Personnel photographs (3x)';
document.body.append(title, crewHost);
const company = newCampaign(4242).crew;
for (const c of company.slice(0, 48)) {
  const cell = document.createElement('div');
  cell.className = 'cell';
  const label = document.createElement('div');
  label.textContent = `${c.name.split(' ')[0]} ${c.primary}`;
  cell.append(portraitElement(c, 3), label);
  crewHost.append(cell);
}
const moods = document.createElement('div');
moods.className = 'row';
document.body.append(moods);
for (const c of company.slice(0, 4)) {
  for (const [label, patch] of [
    ['happy', { morale: 90, fatigue: 10, health: 'healthy' }],
    ['tired', { morale: 50, fatigue: 90, health: 'healthy' }],
    ['low', { morale: 20, fatigue: 30, health: 'healthy' }],
    ['injured', { morale: 50, fatigue: 30, health: 'injured' }],
  ] as const) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    const l = document.createElement('div');
    l.textContent = label;
    cell.append(portraitElement({ ...c, ...patch }, 3), l);
    moods.append(cell);
  }
}

// The council: sitting officers and candidates at 3x, in all three moods.
import { SEATS_BY_ID } from '../src/core/council';
import { DEPARTMENTS } from '../src/data/specialties';
import { officerPortraitElement } from '../src/render/portrait';

const councilTitle = document.createElement('h3');
councilTitle.textContent = 'Council (3x)';
const councilRow = document.createElement('div');
councilRow.className = 'row';
document.body.append(councilTitle, councilRow);
const campaign = newCampaign(4242);
const officers = [...Object.values(campaign.council!.seats), ...campaign.council!.candidates.slice(0, 8)];
for (const o of officers) {
  if (!o) continue;
  const def = SEATS_BY_ID[o.seat];
  for (const opinion of [60, 0, -50]) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    const l = document.createElement('div');
    l.textContent = `${def.short} ${o.rankCode} ${opinion}`;
    cell.append(
      officerPortraitElement(
        { id: o.id, name: o.name, rankCode: o.rankCode, opinion, aviator: def.aviator, color: DEPARTMENTS[def.dept].color },
        3,
      ),
      l,
    );
    councilRow.append(cell);
  }
}
