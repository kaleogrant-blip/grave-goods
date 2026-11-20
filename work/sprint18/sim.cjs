#!/usr/bin/env node
/* Grave Goods tray build: balance simulator.
 *
 * It does not re-implement the game. It opens the real build (work/tray/build.html) in headless Chromium, swaps the page clock for a
 * fake one, and lets five scripted players (simlib.js) play whole runs through the build's own functions. So the rules are checked by
 * construction; `verify` additionally plays the same scripted digs once with the fake clock and direct calls and once in real time
 * with real touchscreen taps, and compares the results.
 *
 *   node sim.cjs verify [build]                     fake clock + calls  vs  real time + real taps
 *   node sim.cjs table  [N=1500] [rows] [pols]      rows like 1:1,1:3,3:1,5:1,5:6 (tomb:stake); pols like early,hold,pick,hammer,novice
 *   node sim.cjs one <tomb> <stake> <pol> <cls> <seed>   one run, verbose
 * Env: BUILD=path, PAGES=2, OUT=file.json, EVAL='js run in the page after loading (for retunes)', SET='{"SKILL.targets.2":8000}' (numbers poked into the build before the runs, for retunes)
 */
'use strict';
const path = require('path'), fs = require('fs');
let chromium; try { ({ chromium } = require('/home/claude/.npm-global/lib/node_modules/playwright')); } catch (e) { ({ chromium } = require('playwright')); }
const BUILD = path.resolve(process.env.BUILD || path.join(__dirname, 'build.html'));
const CLASSES = (process.env.CLS || 'scholar,brute,medium,fence,cartographer,mystic').split(',');
const SEQ = +process.env.SEQ || 0; // SEQ=5: every profile plays up to five runs in a row (new-player rows)
const VT = `(()=>{let now=1e6,id=1;const q=[];window.__real=performance.now.bind(performance);
 window.__vt={q,get now(){return now},flush(ms){const end=now+ms;let n=0;for(;;){let b=-1;for(let i=0;i<q.length;i++){const e=q[i];if(e.t<=end&&(b<0||e.t<q[b].t||(e.t===q[b].t&&e.id<q[b].id)))b=i}
   if(b<0)break;const e=q[b];if(e.t>now)now=e.t;if(e.iv)e.t=now+e.iv;else q.splice(b,1);try{e.fn()}catch(x){(window.__vtErr=window.__vtErr||[]).push(String(x&&x.stack||x).slice(0,600))}if(++n>50000)break}now=end}};
 window.setTimeout=(fn,ms,...a)=>{if(typeof fn!=='function')return 0;q.push({id,t:now+(+ms||0),fn:()=>fn(...a)});return id++};
 window.setInterval=(fn,ms)=>{if(fn&&/^(auWatch|musicTick)$/.test(fn.name))return 0; /* the music clock and its watchdog: sound only, most of the timer load */q.push({id,t:now+Math.max(1,+ms||0),fn,iv:Math.max(1,+ms||0)});return id++};
 window.clearTimeout=window.clearInterval=i=>{const k=q.findIndex(e=>e.id===i);if(k>=0)q.splice(k,1)};
 window.requestAnimationFrame=()=>0;window.cancelAnimationFrame=()=>{};
 performance.now=()=>now;const D0=Date.now();Date.now=()=>D0+now-1e6;
 try{navigator.vibrate=()=>true}catch(e){}
})();`;
async function openSim(browser, set) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: 'reduce' });
  await ctx.addInitScript(VT);
  const page = await ctx.newPage(), errors = [];
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  page.on('pageerror', e => errors.push(String(e.message)));
  await page.route('file://' + BUILD, r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(BUILD) })); // the fragment declares no charset; say UTF-8 as the real hosts do
  await page.goto('file://' + BUILD);
  await page.waitForFunction(() => typeof newChamber === 'function' && typeof S11 === 'object');
  await page.addScriptTag({ path: path.join(__dirname, 'simlib.js') });
  if (set) await page.evaluate(set => { for (const k in set) { const p = k.split('.'); let o = window.eval(p[0]); for (let i = 1; i < p.length - 1; i++) o = o[p[i]]; o[p[p.length - 1]] = set[k]; } if (typeof TARGETS_BASE !== 'undefined') for (let i = 0; i < 3; i++) TARGETS_BASE[i] = SKILL.targets[i]; }, set);
  if (process.env.EVAL) await page.evaluate(code => { (0, eval)(code); }, process.env.EVAL); // a retune tried without touching the build, e.g. other Stake multipliers
  return { page, ctx, errors };
}
function agg(rs) {
  const n = rs.length, s = k => rs.reduce((a, r) => a + (r[k] || 0), 0), srt = rs.map(r => r.best).sort((a, b) => a - b);
  const L = rs.filter(r => !r.w), dl = i => L.filter(r => r.ei === i), seqN = rs[0] && rs[0].seq ? Math.max(...rs.map(r => r.seq.length)) : 0;
  const seq = []; for (let k = 1; k <= (SEQ || 0); k++) seq.push(+(rs.filter(r => r.won && r.won <= k).length / n * 100).toFixed(1));
  return { n, died: [0, 1, 2, 3].map(i => +(dl(i).length / n * 100).toFixed(1)), dfrac: [0, 1, 2, 3].map(i => dl(i).length ? +(dl(i).reduce((a, r) => a + r.ef, 0) / dl(i).length).toFixed(2) : 0), wonBy: seq, win: s('w') / n, c1: s('c1') / n, c2: s('c2') / n, best50: srt[Math.floor(n * .5)], best95: srt[Math.floor(n * .95)], seals: s('seals') / n, walls: s('walls') / n, cr: s('cr') / n, bare: s('bare') / n, col: s('col') / n, walk: s('walk') / n, strikes: s('strikes') / n, stuck: s('stuck'), to: s('to') };
}
async function table(N, rows, pols, set) {
  const browser = await chromium.launch(), P = +process.env.PAGES || 2, per = Math.ceil(N / CLASSES.length), B = SEQ ? 4 : 10;
  const jobs = [];
  for (const [tomb, stake] of rows) for (const pol of pols) for (const cls of CLASSES) for (let a = 0; a < per; a += B)
    jobs.push({ o: Object.assign({ tomb, stake, pol, cls }, SEQ ? { seq: SEQ } : {}, process.env.RELIC ? { relic: process.env.RELIC } : {}), seeds: Array.from({ length: Math.min(B, per - a) }, (_, k) => 'S' + tomb + '-' + stake + '-' + cls + '-' + (a + k)) });
  const res = {}, t0 = Date.now(); let done = 0, next = 0; const errs = [], unknown = {}, stuck = [];
  // every finished batch is appended to <OUT>.jobs, so a run that is cut off carries on from there when started again
  const JF = process.env.OUT ? process.env.OUT + '.jobs' : null, have = {};
  if (JF && fs.existsSync(JF)) for (const l of fs.readFileSync(JF, 'utf8').split('\n')) { if (!l) continue; try { const r = JSON.parse(l); have[r.k] = r.out; } catch (e) { } }
  const keyOf = j => [j.o.tomb, j.o.stake, j.o.pol, j.o.cls, j.seeds[0], j.seeds.length].join('|');
  const take = (j, out) => { const k = j.o.tomb + ':' + j.o.stake + '|' + j.o.pol; (res[k] = res[k] || { all: [], by: {} }); res[k].all.push(...out); (res[k].by[j.o.cls] = res[k].by[j.o.cls] || []).push(...out); done += out.length; };
  let resumed = 0; for (const j of jobs) { const h = have[keyOf(j)]; if (h) { take(j, h); j.done = true; resumed += h.length; } }
  if (resumed) process.stderr.write(`  carried on: ${resumed} runs were already done\n`);
  await Promise.all(Array.from({ length: P }, async () => {
    let s = await openSim(browser, set), used = 0;
    while (next < jobs.length) {
      const j = jobs[next++]; if (j.done) continue;
      if (used++ >= 40) { await s.ctx.close(); s = await openSim(browser, set); used = 0; } // a fresh page now and then keeps memory flat
      let out;
      try { out = await s.page.evaluate(([o, seeds]) => SIM.batch(o, seeds), [j.o, j.seeds]); }
      catch (e) { errs.push('batch failed ' + JSON.stringify(j.o) + ' ' + String(e).slice(0, 200)); try { await s.ctx.close(); } catch (_) { } s = await openSim(browser, set); used = 0; continue; }
      take(j, out); if (JF) fs.appendFileSync(JF, JSON.stringify({ k: keyOf(j), out }) + '\n');
      if (s.errors.length) { errs.push(...s.errors.splice(0)); }
      if (jobs.length > 20 && next % Math.ceil(jobs.length / 20) === 0) process.stderr.write(`  ${done} runs, ${((Date.now() - t0) / 1000).toFixed(0)} s\n`);
    }
    const x = await s.page.evaluate(() => ({ u: SIM.unknown, s: SIM.stuck.slice(0, 5), e: window.__vtErr || [] }));
    Object.assign(unknown, x.u); stuck.push(...x.s); errs.push(...x.e.slice(0, 5)); await s.ctx.close();
  }));
  await browser.close();
  const out = { build: BUILD, set: set || null, N: per * CLASSES.length, secs: (Date.now() - t0) / 1000, rows: {}, errors: errs.slice(0, 20), unknownCards: unknown, stuck: stuck.slice(0, 10) };
  for (const k in res) { out.rows[k] = agg(res[k].all); out.rows[k].cls = {}; for (const c in res[k].by) out.rows[k].cls[c] = +(agg(res[k].by[c]).win * 100).toFixed(1); }
  return out;
}
const pct = x => (x * 100).toFixed(1) + '%';
function print(out, rows, pols) {
  console.log(`\n${out.N} runs a cell (${CLASSES.length} classes: ${CLASSES.join(', ')}), ${out.secs.toFixed(0)} s. Tomb clear rate.` + (out.set ? ' SET ' + JSON.stringify(out.set) : ''));
  console.log('| Tomb:Stake | ' + pols.join(' | ') + ' |\n|---|' + pols.map(() => '---|').join(''));
  for (const [t, s] of rows) console.log(`| ${t}:${s} | ` + pols.map(p => { const r = out.rows[t + ':' + s + '|' + p]; return r ? pct(r.win) : '-'; }).join(' | ') + ' |');
  console.log('\ndetail: win, cleared ch1, cleared ch2, best seal median / 95th pct, seals a run, walls a run, crumbles a run, bare walls / collapses / walk-aways a run, strikes a run, by class');
  for (const k in out.rows) { const r = out.rows[k]; console.log(`${k.padEnd(12)} ${pct(r.win).padStart(6)} ${pct(r.c1).padStart(6)} ${pct(r.c2).padStart(6)}  ${String(r.best50).padStart(5)} / ${String(r.best95).padStart(5)}  ${r.seals.toFixed(1)}  ${r.walls.toFixed(1)}  ${r.cr.toFixed(2)}  ${r.bare.toFixed(2)}/${r.col.toFixed(2)}/${r.walk.toFixed(2)}  ${r.strikes.toFixed(0)}  ${JSON.stringify(r.cls)} died@ch ${JSON.stringify(r.died)} frac ${JSON.stringify(r.dfrac)}${r.wonBy.length ? ' wonBy ' + JSON.stringify(r.wonBy) : ''}${r.stuck || r.to ? '  STUCK ' + r.stuck + ' TIMEOUT ' + r.to : ''}`); }
  if (out.errors.length) console.log('PAGE ERRORS', out.errors.length, [...new Set(out.errors.map(e => String(e).slice(0, 160)))].slice(0, 3));
  if (Object.keys(out.unknownCards).length) console.log('cards closed by the fallback rule:', JSON.stringify(out.unknownCards).slice(0, 600));
  if (out.stuck.length) console.log('stuck:', JSON.stringify(out.stuck));
}
(async () => {
  const cmd = process.argv[2];
  const set = process.env.SET ? JSON.parse(process.env.SET) : null;
  if (cmd === 'table') {
    const N = +process.argv[3] || 1500, rows = (process.argv[4] || '1:1').split(',').map(s => s.split(':').map(Number)), pols = (process.argv[5] || 'early,hold,pick,hammer,novice').split(',');
    const out = await table(N, rows, pols, set); print(out, rows, pols);
    if (process.env.OUT) fs.writeFileSync(process.env.OUT, JSON.stringify(out, null, 1));
  } else if (cmd === 'one') {
    const browser = await chromium.launch(), s = await openSim(browser, set);
    const r = await s.page.evaluate(o => SIM.run(o), { tomb: +process.argv[3], stake: +process.argv[4], pol: process.argv[5], cls: process.argv[6], seed: process.argv[7] });
    console.log(r, s.errors, await s.page.evaluate(() => ({ u: SIM.unknown, s: SIM.stuck, e: window.__vtErr || [] }))); await browser.close();
  } else if (cmd === 'verify') { await require('./sim-verify.cjs')(openSim, chromium, BUILD); }
  else console.log('usage: node sim.cjs verify | table [N] [rows] [pols] | one <tomb> <stake> <pol> <cls> <seed>');
})().catch(e => { console.error(e); process.exit(1); });
