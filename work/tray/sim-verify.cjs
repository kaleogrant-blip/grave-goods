// node sim.cjs verify
// Is the simulator the real game? The simulator plays with a fake clock, direct function calls, and with ui(), draw(), sound and autosave switched off.
// Here a simulated run is recorded (every strike, tray tap, seal and card button, with a fingerprint of the game before each decision), and the same
// actions are then made on an untouched copy of the build in real time with real touchscreen taps. Before every decision the fingerprint must match:
// chamber, bank, Memories, crack, loose finds, dirt left, seals, finds lost, and the state of the seeded generator.
'use strict';
const path = require('path');
module.exports = async function (openSim, chromium, BUILD) {
  const CASES = [{ tomb: 1, stake: 1, pol: 'early', cls: 'scholar', seed: 'V-1' }, { tomb: 1, stake: 1, pol: 'pick9', cls: 'medium', seed: 'V-2' }, { tomb: 1, stake: 1, pol: 'hammer', cls: 'brute', seed: 'V-3' }, { tomb: 3, stake: 3, pol: 'hold', cls: 'fence', seed: 'V-4' }];
  const MAX = +process.env.VERIFY_ACTIONS || 220;
  const browser = await chromium.launch(); let fail = 0; const rows = [];
  for (const o of (process.env.VERIFY_ONLY ? [CASES[+process.env.VERIFY_ONLY]] : CASES)) {
    // 1. the simulated run, recorded
    const s = await openSim(browser);
    const tr = await s.page.evaluate(o => { SIM.rec = true; const r = SIM.run(o); SIM.rec = false; return { r, trace: SIM.trace }; }, o);
    await s.ctx.close();
    const trace = tr.trace.slice(0, MAX);
    // 2. the same actions on the untouched build: real clock, real taps
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: 'reduce' });
    await ctx.addInitScript('window.__SIM_REAL=1;try{navigator.vibrate=()=>true}catch(e){}');
    const page = await ctx.newPage(), errors = [];
    await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
    page.on('pageerror', e => errors.push(String(e.message)));
    await page.goto('file://' + BUILD); await page.waitForFunction(() => typeof newChamber === 'function' && typeof S11 === 'object');
    await page.addScriptTag({ path: path.join(__dirname, 'simlib.js') });
    await page.waitForTimeout(600);
    await page.evaluate(o => { SIM.start(o); Q.speed = 4; }, o); // Q.speed is the game's own animation-speed button
    const cellXY = (x, y) => page.evaluate(([x, y]) => { const r = document.getElementById('c').getBoundingClientRect(); return { x: r.left + (x + .5) * cell, y: r.top + (y + TOP + .5) * cell }; }, [x, y]);
    const idle = () => page.waitForFunction(() => !document.getElementById('lkp') && document.getElementById('overlay').hidden && state && !state.sealing && !Q.busy && !state.clearing && !LK.busy && !LK.timers.size && !state.over, null, { timeout: 30000 });
    let n = 0, cps = 0, bad = null, taps = 0;
    try {
      for (const e of trace) {
        n++;
        if (e.a === 'cp') { await idle(); await page.waitForTimeout(140); await idle(); const got = await page.evaluate(() => SIM.sig()); cps++; if (got !== e.sig) { bad = { at: n, want: e.sig, got, prev: trace[n - 2] }; break; } }
        else if (e.a === 's') { const cur = await page.evaluate(() => tool); if (cur !== e.t) { await page.locator('#' + e.t).tap(); } const p = await cellXY(e.x, e.y); await page.touchscreen.tap(p.x, p.y); taps++; await page.waitForTimeout(50); }
        else if (e.a === 't') { const p = await cellXY(e.x, e.y); await page.touchscreen.tap(p.x, p.y); taps++; await page.waitForTimeout(50); }
        else if (e.a === 'seal') { await idle(); await page.locator('#seal').tap(); taps++; await page.waitForTimeout(80); }
        else if (e.a === 'walk') { await page.locator('#walk').tap(); await page.waitForTimeout(600); await page.locator('#walk').tap().catch(() => { }); taps += 2; await page.waitForTimeout(200); }
        else if (e.a === 'c') {
          await page.waitForFunction(() => !document.getElementById('overlay').hidden, null, { timeout: 30000 }); await page.waitForTimeout(e.again ? 600 : 1350);
          const loc = e.last ? page.locator('#card button:visible:not([disabled])').last() : page.locator('#card ' + e.sel + ':visible:not([disabled])').first();
          await loc.scrollIntoViewIfNeeded().catch(() => { }); await loc.tap({ timeout: 8000 }); taps++; await page.waitForTimeout(e.sel === '.chest' ? 1600 : 250);
        }
        else if (e.a === 'l') { // a bone reading or the knucklebone: the panel may also close by itself (2.6 s after the result), so a recorded tap that has nothing left to tap is skipped
          await page.waitForTimeout(950);
          const bone = e.sel === '#bnfast' || e.sel === '#bngo'; // a reading is decided before its first tap, and a profile with three readings behind it gets a one-tap button: so a reading is simply tapped through to its end
          for (let k = 0; k < 60; k++) { if (!await page.locator('#lkp').count()) break; const b = page.locator(bone ? '#lkp #bnfast:visible:not([disabled]), #lkp #bngo:visible:not([disabled])' : '#lkp ' + e.sel + ':visible:not([disabled])').first(); if (await b.count()) { await b.tap({ timeout: 3000 }).catch(() => { }); taps++; if (!bone) break; await page.waitForTimeout(500); } else await page.waitForTimeout(200); }
          await page.waitForTimeout(300);
        }
      }
    } catch (x) { bad = { at: n, error: String(x).slice(0, 120), entry: trace[n - 1], before: trace.slice(Math.max(0, n - 6), n - 1), screen: await page.evaluate(() => ({ ov: !document.getElementById('overlay').hidden, card: document.getElementById('card').textContent.slice(0, 140), lkp: !!document.getElementById('lkp'), lk: LK.busy, q: Q.busy, sealing: state.sealing, over: state.over, clearing: state.clearing, sig: SIM.sig() })).catch(() => null) }; }
    const ok = !bad && !errors.length; if (!ok) fail++;
    rows.push(`| ${o.pol} / ${o.cls} / Tomb ${o.tomb} Stake ${o.stake} / ${o.seed} | ${n} of ${tr.trace.length} recorded steps, ${taps} real taps | ${cps} | ${ok ? 'PASS' : 'FAIL ' + JSON.stringify(bad || errors).slice(0, 1400)} |`);
    console.log(rows[rows.length - 1]);
    await ctx.close();
  }
  await browser.close();
  console.log('\n| Run | Replayed | Fingerprints compared | Result |\n|---|---|---|---|\n' + rows.join('\n'));
  console.log(fail ? 'VERIFY FAIL ' + fail : 'VERIFY PASS: the fake-clock simulator and real-time play with real taps agree at every decision point');
  process.exit(fail ? 1 : 0);
};
