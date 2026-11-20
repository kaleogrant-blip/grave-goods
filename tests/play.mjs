// Shared helpers for the tests that play the real game (v1.0-rc10 rules) in a wrapped page.
//
// The convention is the game team's (work/sprint16/LOG.md, "Notes on the tests themselves"): SETUP may be written directly
// (which tiles are still covered, how much crack the wall has, how many Memories are left), so a test needs ten taps and not two
// hundred. Every ACTION is a real touchscreen tap: uncovering a find, taking the last tile of a wall, the Seal button, every card button.
// Nothing here calls strike(), sealGo(), collapse() or endChamber().
export const GUARD = 1100; // the game ignores taps for a moment after a card opens

export const overlayUp = page => page.evaluate(() => !document.getElementById('overlay').hidden);
export const tapSel = async (page, sel, opt = {}) => { const el = typeof sel === 'string' ? page.locator(sel).first() : sel; await el.tap({ timeout: 8000, ...opt }); };
// screen coordinates of the centre of wall cell (x, y)
export const cellXY = (page, x, y) => page.evaluate(([x, y]) => { const c = document.getElementById('c'), r = c.getBoundingClientRect(); return { x: r.left + (x + .5) * cell, y: r.top + (y + TOP + .5) * cell }; }, [x, y]);
// The score sheet opens over the top rows of the wall for a moment after a seal, and toasts sit over its foot: wait until the tap would land on the wall.
async function clearWay(page, p) {
  for (let k = 0; k < 6; k++) {
    const el = await page.evaluate(p => { const e = document.elementFromPoint(p.x, p.y); return e ? e.id || e.className || e.tagName : ''; }, p);
    if (el === 'c') return true;
    if (await page.locator('#strip:visible').count() && await page.evaluate(() => document.getElementById('strip').getAttribute('aria-expanded') === 'true')) await page.locator('#strip').tap().catch(() => {});
    await page.waitForTimeout(500);
  }
  return false;
}
export async function tapCell(page, x, y) { const p = await cellXY(page, x, y); await clearWay(page, p); await page.touchscreen.tap(p.x, p.y); }
// A real tap on the Pick button, so every wall tap below digs one tile.
export const takePick = async page => { if (await overlayUp(page)) throw new Error('a card is over the wall: ' + (await page.evaluate(() => document.getElementById('card').textContent.replace(/\s+/g, ' ').slice(0, 300)))); await tapSel(page, '#pick'); await page.evaluate(() => { try { luckSlipHide(); } catch (e) {} }); };

/* Uncover n buried finds (not relics, not sarcophagi) with n real taps of the pick.
   Setup: each chosen find is left with one covered tile, one strike deep, and Confirm digs is off. Returns the cells tapped. */
export async function uncover(page, n) {
  await takePick(page);
  const cells = await page.evaluate(n => {
    SETTINGS.confirm = false; const out = [];
    for (const f of state.finds) {
      if (out.length >= n) break;
      if (f.sarc || f.relic || f.banked || f.cells.every(([x, y]) => state.dirt[y][x] === 0)) continue;
      f.cells.forEach(([x, y], j) => { state.dirt[y][x] = j === 0 ? 1 : 0; }); out.push(f.cells[0]);
    }
    ui(); draw(); return out;
  }, n);
  for (const [x, y] of cells) { const before = await page.evaluate(() => exposedFinds().length); await tapCell(page, x, y); await page.waitForFunction(b => exposedFinds().length !== b || state.over, before, { timeout: 5000 }); await page.waitForTimeout(80); }
  return cells;
}
/* A real tap on Seal, then wait for the tally to finish. Declines the knucklebone if it is offered (it is a luck moment, not under test). */
export async function seal(page) {
  const before = await page.evaluate(() => { Q.speed = 6; return state.sealed | 0; });
  await tapSel(page, '#seal');
  await page.waitForFunction(b => (state.sealed | 0) > b || state.over, before, { timeout: 8000 });
  await page.waitForFunction(() => !state.sealing && !Q.busy, null, { timeout: 20000 });
  await page.waitForTimeout(500);
  for (let k = 0; k < 3; k++) { const no = page.locator('#lkno'); if (await no.count() && await no.isVisible()) { await page.waitForTimeout(1300); await no.tap().catch(() => {}); await page.waitForTimeout(400); } }
}
/* The Seal button as a player sees it. */
export const sealBtn = page => page.evaluate(() => { const b = document.getElementById('seal'); return { text: b.textContent.replace(/\s+/g, ' ').trim(), disabled: b.disabled, held: typeof sealHeld === 'function' && sealHeld(), tray: trayList().length, loose: exposedFinds().length }; });

/* Bring the wall down with one real tap. Setup: the wall is one strike short of its limit and has one plain dirt tile to hit. */
export async function collapseByTap(page) {
  await takePick(page);
  const c = await page.evaluate(() => {
    SETTINGS.confirm = false; state.crack = maxCrack() - .25;
    for (let y = ROWS - 1; y >= 0; y--) for (let x = 0; x < COLS; x++) if (state.dirt[y][x] > 0 && !(state.owner[y][x] >= 0)) { ui(); draw(); return [x, y]; }
    return null;
  });
  if (!c) throw new Error('no plain dirt tile to strike');
  await tapCell(page, c[0], c[1]);
  await page.waitForFunction(() => state.over, null, { timeout: 8000 });
}
/* Leave the wall bare with one real tap. Setup: every find is already sealed, and one plain tile of dirt is left, one strike deep. */
export async function bareByTap(page) {
  await takePick(page);
  const c = await page.evaluate(() => {
    SETTINGS.confirm = false; let keep = null;
    state.finds.forEach(f => { if (!f.banked) { f.banked = true; delete f.tray; } });
    for (let y = ROWS - 1; y >= 0; y--) for (let x = 0; x < COLS; x++) { if (!keep && !(state.owner[y][x] >= 0)) { keep = [x, y]; state.dirt[y][x] = 1; } else state.dirt[y][x] = 0; }
    state.ores = []; state.crack = 0; ui(); draw(); return keep;
  });
  await tapCell(page, c[0], c[1]);
  await page.waitForFunction(() => state.over, null, { timeout: 8000 });
}
/* Wait for an end-of-chamber card with a #go button (collapse, bare wall) and for its tap guard. */
export async function cardUp(page, sel = '#card #go') { await page.waitForSelector('#overlay:not([hidden]) ' + sel, { timeout: 20000 }); await page.waitForTimeout(GUARD); }
export const cardText = page => page.evaluate(() => document.getElementById('card').textContent.replace(/\s+/g, ' ').trim());
/* Clear the chamber by sealing one full tray with real taps. Setup: the chamber's bank is put just under its target, so the tray finishes it. */
export async function clearChamberBySeal(page) {
  await uncover(page, 6);
  await page.evaluate(() => { state.bankedThisChamber = Math.max(0, TARGETS[state.i] - 1); state.sealsHere = Math.max(1, state.sealsHere | 0); ui(); });
  await seal(page);
}

/* The kit screen offers three pieces of gear, drawn afresh for each run. Pack `want` with a real tap when it is on offer; when it is
   not, it is put in the pack directly once the run has started (setup). Gear matters to these tests: the Looter's Sack fixes a chamber at
   two seals, the Grave Candle cracks the wall on a timer and the Glass Hammer breaks, so a test packs a known one. Returns how it was packed. */
export async function packGear(page, want) {
  const b = page.locator(`#overlay:not([hidden]) .kitgear [data-id="${want}"]:visible`);
  if (await b.count()) { await b.first().tap(); return 'tapped'; }
  return 'setup';
}
export const forceGear = (page, want) => page.evaluate(id => { gear = kitGearList().find(g => g.id === id); try { _kit.gear = id; } catch (e) {} ui(); draw(); return gear.id; }, want);

/* A visitor (a loan, a wager) sometimes knocks when a chamber opens. It is not under test: send them away with a real tap. */
export async function sendVisitorAway(page) {
  await page.waitForTimeout(700);
  for (let k = 0; k < 3; k++) { const no = page.locator('#overlay:not([hidden]) #rvno'); if (!(await no.count())) return; await page.waitForTimeout(GUARD); await no.tap().catch(() => {}); await page.waitForTimeout(700); }
}
