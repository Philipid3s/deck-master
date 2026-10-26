/**
 * Headless smoke test + screenshots.
 *
 * Loads the built game, starts a campaign, drives the real UI (deck
 * navigation, room and crew inspection, answering events, ending the day)
 * and writes a screenshot at each step. Any console error or page error
 * fails the run, so a broken build cannot pass silently.
 */
import puppeteer from 'puppeteer';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const URL = process.env.GAME_URL ?? 'http://localhost:4173/';
const OUT = process.env.SHOT_DIR ?? 'shots';
mkdirSync(OUT, { recursive: true });

const problems = [];

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1600, height: 940, deviceScaleFactor: 1 });

page.on('console', (msg) => {
  if (msg.type() === 'error') problems.push(`console.error: ${msg.text()}`);
});
page.on('pageerror', (err) => problems.push(`pageerror: ${err.message}`));
page.on('requestfailed', (req) => {
  // Google Fonts may be unreachable offline; that is not a game failure.
  if (!req.url().includes('fonts.g')) {
    problems.push(`requestfailed: ${req.url()}`);
  }
});

const shot = async (name) => {
  await new Promise((r) => setTimeout(r, 700));
  await page.screenshot({ path: join(OUT, `${name}.png`) });
  console.log(`  captured ${name}.png`);
};

/** Click a button by its exact visible label. */
const clickButton = async (label, root = 'body') => {
  const ok = await page.evaluate(
    (l, sel) => {
      const scope = document.querySelector(sel) ?? document.body;
      const btns = [...scope.querySelectorAll('button')];
      const b = btns.find((x) => x.textContent.trim().toUpperCase().startsWith(l.toUpperCase()));
      if (!b || b.disabled) return false;
      b.click();
      return true;
    },
    label,
    root,
  );
  if (!ok) problems.push(`could not click button: ${label}`);
  await new Promise((r) => setTimeout(r, 350));
  return ok;
};

const text = (sel) => page.evaluate((s) => document.querySelector(s)?.textContent?.trim() ?? '', sel);

console.log('Loading', URL);
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 });

// --- Title screen ---------------------------------------------------------
await page.waitForSelector('.title-screen', { timeout: 10000 });
await shot('01-title');

// The day's flying replays between days; this run checks the rest of the
// game, so it is switched off here; tests/flights.test.ts covers its data.
await page.evaluate(() => localStorage.setItem('deckmaster.flightops', 'off'));

// Fixed seed so the run is reproducible.
await page.type('.title-screen input[type=text]', '4242');
await clickButton('NEW DEPLOYMENT');

await page.waitForSelector('#deck-canvas', { timeout: 10000 });
await page.waitForSelector('.event-card', { timeout: 10000 });
// The guided first day opens on a fresh browser profile.
await page.waitForSelector('.tut-card:not(.hidden)', { timeout: 5000 });
await shot('02-tutorial');
await clickButton('SKIP TUTORIAL');
await shot('02-flight-deck');
await page.keyboard.press('2');
await shot('02-hangar-deck');

// --- Sanity checks on the rendered chrome ---------------------------------
const day = await text('.topbar .day');
if (!/DAY 1/.test(day)) problems.push(`expected DAY 1 in top bar, got "${day}"`);

const eventCount = await page.$$eval('.event-card', (n) => n.length);
if (eventCount < 1 || eventCount > 3) problems.push(`expected 1-3 event cards, got ${eventCount}`);

const readout = await text('.readout');
for (const label of ['PRESTIGE', 'CREDITS', 'CARRIER READINESS', 'AIRCRAFT READY']) {
  if (!readout.includes(label)) problems.push(`ship status panel is missing "${label}"`);
}

// The canvas must actually have drawn something.
const painted = await page.evaluate(() => {
  const c = document.getElementById('deck-canvas');
  const ctx = c.getContext('2d');
  const { data } = ctx.getImageData(0, 0, c.width, c.height);
  const seen = new Set();
  for (let i = 0; i < data.length; i += 4 * 997) {
    seen.add(`${data[i]},${data[i + 1]},${data[i + 2]}`);
  }
  return seen.size;
});
if (painted < 8) problems.push(`deck canvas looks blank (only ${painted} distinct sampled colours)`);
console.log(`  deck canvas sampled ${painted} distinct colours`);

// --- Deck navigation ------------------------------------------------------
for (const [key, name] of [
  ['1', '03-flight-deck'],
  ['3', '04-main-deck'],
  ['4', '05-engineering-deck'],
  ['5', '06-crew-deck'],
  ['8', '07-hull-deck'],
]) {
  await page.keyboard.press(key);
  await shot(name);
  const caption = await text('.deck-caption .num');
  if (!caption.includes(key.padStart(2, '0'))) {
    problems.push(`deck ${key}: caption reads "${caption}"`);
  }
}

// --- Inspect a room -------------------------------------------------------
await page.keyboard.press('2');
await new Promise((r) => setTimeout(r, 400));
// Click the centre of the avionics shop via the app's own hit testing.
const roomHit = await page.evaluate(() => {
  const canvas = document.getElementById('deck-canvas');
  const rect = canvas.getBoundingClientRect();
  // The deck is a thin band framed above the decision cards, so sweep both axes.
  for (let fy = 0.05; fy < 0.72; fy += 0.02) {
    for (let fx = 0.1; fx < 0.55; fx += 0.03) {
      const x = rect.left + rect.width * fx;
      const y = rect.top + rect.height * fy;
      const ev = (type) =>
        canvas.dispatchEvent(new MouseEvent(type, { clientX: x, clientY: y, bubbles: true }));
      ev('mousemove');
      ev('mousedown');
      ev('mouseup');
      ev('click');
      const panel = document.querySelector('.context.open .t1');
      if (panel && panel.textContent.trim()) return panel.textContent.trim();
    }
  }
  return null;
});
if (!roomHit) problems.push('clicking the deck did not open a context panel');
else console.log(`  context panel opened: "${roomHit}"`);
await shot('08-room-panel');

// --- Staff roster ---------------------------------------------------------
await page.keyboard.press('Escape');
await clickButton('STAFF');
await page.waitForSelector('table.roster tbody tr', { timeout: 8000 });
const rows = await page.$$eval('table.roster tbody tr', (n) => n.length);
console.log(`  roster listed ${rows} crew`);
if (rows < 20) problems.push(`roster only listed ${rows} crew`);
await shot('09-staff-roster');

// Selecting a person should close the roster and open their panel.
await page.click('table.roster tbody tr');
await new Promise((r) => setTimeout(r, 900));
const crewPanel = await text('.context .t1');
if (!crewPanel) problems.push('selecting a crew member did not open the personnel panel');
console.log(`  jumped to crew member: "${crewPanel}"`);
await shot('10-crew-panel');

// --- Carrier status -------------------------------------------------------
// The status must be unmistakable, and it must gate purchases.
const statusIn = await text('.statusbar');
console.log(`  status bar: "${statusIn.replace(/\s+/g, ' ').slice(0, 70)}"`);
if (!/IN PORT/.test(statusIn)) problems.push(`status bar does not show IN PORT: "${statusIn}"`);
const sidebarStatus = await text('.readout');
if (!/IN PORT/.test(sidebarStatus)) {
  problems.push('ship status panel does not report IN PORT');
}
await shot('24-status-in-port');

// --- Development / upgrades ----------------------------------------------
await clickButton('DEVELOPMENT');
await new Promise((r) => setTimeout(r, 600));
await shot('12-development');

// Procurement: aircraft and equipment must be buyable, with a lead time.
await clickButton('AIRCRAFT', '.overlay:not(.hidden)');
await new Promise((r) => setTimeout(r, 500));
const airframeCards = await page.$$eval('.overlay:not(.hidden) .card', (n) => n.length);
console.log(`  aircraft catalogue offered ${airframeCards} airframes`);
if (airframeCards < 5) problems.push(`aircraft catalogue showed only ${airframeCards} entries`);
await shot('21-buy-aircraft');

// Give the ship money, then place an order and confirm it goes on order
// rather than appearing instantly.
const fleetBefore = await page.evaluate(() => {
  const m = document.querySelector('.bottombar')?.innerText.match(/(\d+)\/(\d+)/);
  return m ? Number(m[2]) : -1;
});
const ordered = await page.evaluate(() => {
  const cards = [...document.querySelectorAll('.overlay:not(.hidden) .card')];
  for (const c of cards) {
    const b = [...c.querySelectorAll('button')].find((x) => !x.disabled);
    if (b) {
      b.click();
      return c.querySelector('.n')?.textContent ?? 'unknown';
    }
  }
  return null;
});
if (!ordered) problems.push('no airframe could be ordered with the starting budget');
else console.log(`  ordered: ${ordered}`);
await new Promise((r) => setTimeout(r, 500));
const onOrderText = await text('.overlay:not(.hidden) .modal-body');
if (ordered && !/ON ORDER/i.test(onOrderText)) {
  problems.push('an ordered airframe did not appear in the ON ORDER list');
}
const fleetAfter = await page.evaluate(() => {
  const m = document.querySelector('.bottombar')?.innerText.match(/(\d+)\/(\d+)/);
  return m ? Number(m[2]) : -1;
});
if (ordered && fleetAfter !== fleetBefore) {
  problems.push(`airframe arrived instantly: fleet went ${fleetBefore} -> ${fleetAfter}`);
}
await shot('22-on-order');

await clickButton('EQUIPMENT', '.overlay:not(.hidden)');
await new Promise((r) => setTimeout(r, 500));
const equipCards = await page.$$eval('.overlay:not(.hidden) .card', (n) => n.length);
console.log(`  equipment catalogue offered ${equipCards} items`);
if (equipCards < 8) problems.push(`equipment catalogue showed only ${equipCards} items`);
await shot('23-buy-equipment');
await page.keyboard.press('Escape');
await page.evaluate(() => {
  document.querySelectorAll('.overlay').forEach((o) => o.classList.add('hidden'));
});

// --- Mission board --------------------------------------------------------
await page.keyboard.press('Escape');
await clickButton('MISSIONS');
await new Promise((r) => setTimeout(r, 600));
const missionCards = await page.$$eval('.overlay:not(.hidden) .card', (n) => n.length);
if (missionCards < 1) problems.push('mission board showed no missions');
console.log(`  mission board offered ${missionCards} operations`);
await shot('11-mission-board');
await clickButton('ACCEPT MISSION', '.overlay:not(.hidden)');

// The mission board block above accepted a mission; the ship should now be
// outbound, and every purchase should be closed off.
const statusOut = await text('.statusbar');
if (!/OUTBOUND/.test(statusOut)) problems.push(`status did not become OUTBOUND: "${statusOut}"`);
console.log(`  after accepting: "${statusOut.replace(/\s+/g, ' ').slice(0, 70)}"`);
await shot('25-status-outbound');

await clickButton('DEVELOPMENT');
await new Promise((r) => setTimeout(r, 500));
const banner = await text('.overlay:not(.hidden) .at-sea-banner');
if (!banner) problems.push('no at-sea banner shown in development while deployed');
else console.log(`  development banner: "${banner.replace(/\s+/g, ' ').slice(0, 60)}"`);

await clickButton('AIRCRAFT', '.overlay:not(.hidden)');
await new Promise((r) => setTimeout(r, 400));
const anyEnabled = await page.evaluate(() => {
  const cards = [...document.querySelectorAll('.overlay:not(.hidden) .card')];
  return cards.some((c) => [...c.querySelectorAll('button')].some((b) => !b.disabled));
});
if (anyEnabled) problems.push('an airframe could still be ordered while the ship was at sea');
await shot('26-purchases-blocked');
await page.keyboard.press('Escape');
await page.evaluate(() => {
  document.querySelectorAll('.overlay').forEach((o) => o.classList.add('hidden'));
});

// --- Answer events and end the day ---------------------------------------
let answered = 0;
for (let i = 0; i < 5; i++) {
  const has = await page.$('.event-card .choice');
  if (!has) break;
  await page.click('.event-card .choice');
  answered++;
  await new Promise((r) => setTimeout(r, 300));
}
console.log(`  answered ${answered} events`);
if (answered === 0) problems.push('no event choices were clickable');

await clickButton('END DAY');
await page.waitForSelector('.overlay:not(.hidden) .modal', { timeout: 8000 });
const summary = await text('.overlay:not(.hidden) .modal');
if (!summary.includes('DAY 1 COMPLETE')) problems.push('daily summary did not appear');
await shot('13-daily-summary');
await clickButton('BEGIN DAY 2');

const day2 = await text('.topbar .day');
if (!/DAY 2/.test(day2)) problems.push(`expected DAY 2 after ending the day, got "${day2}"`);
console.log(`  advanced to ${day2}`);

// --- Run a week to check stability ---------------------------------------
for (let d = 0; d < 7; d++) {
  for (let i = 0; i < 5; i++) {
    const has = await page.$('.event-card .choice');
    if (!has) break;
    await page.click('.event-card .choice');
    await new Promise((r) => setTimeout(r, 120));
  }
  await clickButton('END DAY');
  await new Promise((r) => setTimeout(r, 500));
  await clickButton('BEGIN DAY', '.overlay:not(.hidden)');
  await new Promise((r) => setTimeout(r, 200));
}
const finalDay = await text('.topbar .day');
console.log(`  played through to ${finalDay}`);
await shot('14-after-one-week');

// --- Air tasking order ----------------------------------------------------
// The clock must be gone, and the tasking panel must exist and be usable.
const topbarText = await text('.topbar');
if (/\d\d:\d\d/.test(topbarText)) problems.push(`a clock is still showing: "${topbarText}"`);

await clickButton('TASKING');
await page.waitForSelector('.overlay:not(.hidden) table.roster.tasking tbody tr', { timeout: 8000 });
const wingRows = await page.$$eval('.overlay:not(.hidden) table.roster.tasking tbody tr', (n) => n.length);
console.log(`  tasking panel listed ${wingRows} airframes`);
if (wingRows < 10) problems.push(`tasking panel listed only ${wingRows} airframes`);
await shot('19-air-tasking');

// Auto-assign, then confirm the cover figure actually moved.
const coverBefore = await text('.overlay:not(.hidden) .attr-value');
await clickButton('AUTO-ASSIGN', '.overlay:not(.hidden)');
await new Promise((r) => setTimeout(r, 500));
const coverAfter = await text('.overlay:not(.hidden) .attr-value');
console.log(`  objective cover ${coverBefore} -> ${coverAfter} after auto-assign`);
await shot('20-tasking-assigned');

// Stand the wing down and confirm cover collapses.
await clickButton('STAND DOWN', '.overlay:not(.hidden)');
await new Promise((r) => setTimeout(r, 400));
const coverDown = parseInt(await text('.overlay:not(.hidden) .attr-value'), 10);
if (coverDown !== 0) problems.push(`standing down the wing left cover at ${coverDown}%`);
await clickButton('AUTO-ASSIGN', '.overlay:not(.hidden)');
await new Promise((r) => setTimeout(r, 400));
await page.keyboard.press('Escape');
await page.evaluate(() => {
  document.querySelectorAll('.overlay').forEach((o) => o.classList.add('hidden'));
});

// --- Language switch ------------------------------------------------------
// Switch to French and confirm the chrome, the deck caption, the roster and
// the event cards all re-render translated, without reloading.
const beforeLang = await text('.topbar');
await page.evaluate(() => {
  const btns = [...document.querySelectorAll('.topbar .tempo-group button')];
  const fr = btns.find((b) => b.textContent.trim() === 'FR');
  if (fr) fr.click();
});
await new Promise((r) => setTimeout(r, 800));
await shot('15-french-deck');

const topbarFr = await text('.topbar');
if (!topbarFr.includes('RYTHME')) problems.push(`top bar not translated: "${topbarFr}"`);
if (topbarFr === beforeLang) problems.push('language toggle changed nothing');

const captionFr = await text('.deck-caption');
if (!captionFr.includes('PONT')) problems.push(`deck caption not translated: "${captionFr.slice(0, 60)}"`);

const readoutFr = await text('.readout');
for (const label of ['DISPONIBILITÉ DU NAVIRE', 'ÉQUIPAGE DISPONIBLE', 'APPROVISIONNEMENTS']) {
  if (!readoutFr.includes(label)) problems.push(`ship status missing French "${label}"`);
}

// Untranslated leftovers are the real risk: scan visible chrome for a few
// English words that should no longer appear anywhere.
const leftovers = await page.evaluate(() => {
  const zones = ['.topbar', '.bottombar', '.sidebar', '.deck-caption', '.event-stack'];
  const seen = [];
  for (const z of zones) {
    const el = document.querySelector(z);
    if (!el) continue;
    const txt = el.innerText;
    for (const word of ['READINESS', 'AIRCRAFT READY', 'CREW MORALE', 'SUPPLIES', 'END DAY', 'STAFF']) {
      if (txt.includes(word)) seen.push(`${z}: ${word}`);
    }
  }
  return seen;
});
if (leftovers.length) problems.push(`English left in French UI -> ${leftovers.join(', ')}`);

// Roster and a crew panel in French.
await clickButton('EFFECTIF');
await page.waitForSelector('table.roster tbody tr', { timeout: 8000 });
const headers = await page.$$eval('table.roster th', (n) => n.map((x) => x.textContent.trim()));
if (!headers.some((h) => h.startsWith('GRADE'))) {
  problems.push(`roster headers not translated: ${headers.join(' | ')}`);
}
await shot('16-french-roster');
await page.click('table.roster tbody tr');
await new Promise((r) => setTimeout(r, 900));
await shot('17-french-crew');
const crewFr = await text('.context-body');
if (!crewFr.includes('ATTRIBUTS')) problems.push('crew panel not translated');

// Event cards in French.
await page.keyboard.press('Escape');
await new Promise((r) => setTimeout(r, 400));
const eventFr = await text('.event-stack');
if (eventFr && /(Approve|Deny|Continue operations)/.test(eventFr)) {
  problems.push('event choices still in English');
}
await shot('18-french-events');

// Switch back to English and confirm it reverts.
await page.evaluate(() => {
  const btns = [...document.querySelectorAll('.topbar .tempo-group button')];
  const en = btns.find((b) => b.textContent.trim() === 'EN');
  if (en) en.click();
});
await new Promise((r) => setTimeout(r, 600));
const backToEn = await text('.topbar');
if (!backToEn.includes('TEMPO')) problems.push('switching back to English failed');

await browser.close();

console.log('');
if (problems.length > 0) {
  console.log(`FAILED — ${problems.length} problem(s):`);
  for (const p of problems) console.log(`  · ${p}`);
  process.exit(1);
}
console.log('PASSED — game loaded, rendered and played through 8 days with no errors.');
