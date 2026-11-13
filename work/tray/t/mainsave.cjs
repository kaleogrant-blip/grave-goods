// The test build must never read or damage a main-game save, even in the same browser profile.
// 1. Play the MAIN game (game/current.html, rc9b) with real taps until it has a resume record, stats and settings. Copy every storage key out.
// 2. In the SAME browser context (same storage), open the tray build, play it from the title with real taps (dig, pick, seal), close it.
// 3. Every main-game key must be byte-identical, none added, none removed; the tray build's keys must all start S15T_.
// 4. Open the main game again: it must offer the same run and resume the same wall.
const H=require('./h.cjs');const assert=require('assert');
const dumpAll=page=>page.evaluate(()=>{const d={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);d[k]=localStorage.getItem(k)}return d});
const digSome=async(page,n)=>{await page.locator('#pick').tap();const cells=await page.evaluate(n=>{const o=[];for(let y=ROWS-1;y>=0&&o.length<n;y--)for(let x=0;x<COLS&&o.length<n;x++)if(state.dirt[y][x]>0)o.push([x,y]);return o},n);
  for(const [x,y] of cells){const p=await H.cellXY(page,x,y);await H.tapXY(page,p.x,p.y);await page.waitForTimeout(80)}};
(async()=>{
  // ---- 1. main game
  const m=await H.open(H.MAIN,{});let page=m.page;const ctx=m.ctx;await page.waitForTimeout(1300);
  await page.locator('#title button.tl-dig').tap();await page.waitForSelector('#overlay:not([hidden]) #dig, #mDig');await page.waitForTimeout(H.GUARD);
  if(await page.locator('#mDig:visible').count()){await page.locator('#mDig').tap();await page.waitForSelector('#overlay:not([hidden]) #dig');await page.waitForTimeout(H.GUARD)}
  await page.locator('#overlay:not([hidden]) #dig').tap();await page.waitForFunction(()=>state&&!state.train&&document.getElementById('overlay').hidden);await page.waitForTimeout(900);
  await digSome(page,14);
  const mainVer=await page.evaluate(()=>GAME_VERSION),sig0=await H.wallSig(page),bank0=await page.evaluate(()=>({crack:state.crack,banked:run.banked,seed:run.seed,taps:RS().taps}));
  await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));await page.waitForTimeout(200);
  const A=await dumpAll(page);const mainKeys=Object.keys(A).filter(k=>!/^__/.test(k));
  assert(A.rw_resume&&JSON.parse(A.rw_resume).w,'the main game wrote a resume record with a wall');
  await page.close();
  // ---- 2. tray build, same context
  const t=await H.open(H.BUILD,{ctx});page=t.page;await page.waitForTimeout(1300);
  const shared=await page.evaluate(()=>!!localStorage.getItem('rw_resume')); // can this page even see the main game's storage? (file:// pages share one store in Chromium)
  const offered=await page.evaluate(()=>!!S11.peekResume());assert(!offered,'the tray build does not see a resumable run (the main one is not its own)');
  await page.locator('#title button.tl-dig').tap();await page.waitForSelector('#overlay:not([hidden]) #dig, #mDig');await page.waitForTimeout(H.GUARD);
  if(await page.locator('#mDig:visible').count()){await page.locator('#mDig').tap();await page.waitForSelector('#overlay:not([hidden]) #dig');await page.waitForTimeout(H.GUARD)}
  await page.locator('#overlay:not([hidden]) #dig').tap();await page.waitForFunction(()=>state&&!state.train&&document.getElementById('overlay').hidden);await page.waitForTimeout(900);
  const ver=await page.evaluate(()=>GAME_VERSION);
  await digSome(page,10);
  const last=await page.evaluate(()=>{const out=[];for(const f of state.finds){if(f.sarc||f.banked||f.cells.every(([x,y])=>state.dirt[y][x]===0))continue;if(exposedFinds().length+out.length>=8)break;f.cells.forEach(([x,y],j)=>{state.dirt[y][x]=j===0?1:0});out.push(f.cells[0])}ui();draw();return out});
  for(const [x,y] of last){const p=await H.cellXY(page,x,y);await H.tapXY(page,p.x,p.y);await page.waitForTimeout(80)}
  const c=await page.evaluate(()=>trayList()[0].cells[0]);{const p=await H.cellXY(page,c[0],c[1]);await H.tapXY(page,p.x,p.y)}
  await page.evaluate(()=>{Q.speed=4});await page.locator('#seal').tap();await page.waitForFunction(()=>!state.sealing&&!Q.busy,null,{timeout:15000});await page.waitForTimeout(600);
  const trayBank=await page.evaluate(()=>run.banked);assert(trayBank>0,'the tray build sealed something');
  // settings and stats writes too
  await page.evaluate(()=>{try{setSet('rm',true)}catch(e){}try{stSave&&stSave()}catch(e){}window.dispatchEvent(new Event('pagehide'))});await page.waitForTimeout(1300);
  const B=await dumpAll(page);
  const diff=[];mainKeys.forEach(k=>{if(B[k]!==A[k])diff.push(k+(k in B?' changed':' removed'))});
  const added=Object.keys(B).filter(k=>!(k in A)&&!/^__/.test(k)),foreign=added.filter(k=>!/^S15T_/.test(k));
  assert.deepStrictEqual(diff,[],'main-game keys changed: '+diff.join(', '));assert.deepStrictEqual(foreign,[],'keys outside S15T_ written: '+foreign.join(', '));
  assert(added.indexOf('S15T_resume')>=0,'the tray build keeps its own resume record');
  const tErr=t.errors.slice();await page.close();
  // ---- 4. main game again
  const m2=await H.open(H.MAIN,{ctx});page=m2.page;await page.waitForTimeout(600);
  const C=await dumpAll(page);const diff2=mainKeys.filter(k=>k!=='rw_tel'&&k!=='rw_tel_open'&&k!=='rw_ua'&&C[k]!==A[k]); // the main game itself may add a launch line to its own play log on boot
  await H.resumeFromTitle(page);const sig1=await H.wallSig(page),bank1=await page.evaluate(()=>({crack:state.crack,banked:run.banked,seed:run.seed,taps:RS().taps}));
  assert.strictEqual(sig1,sig0,'the main game resumed the same wall');assert.deepStrictEqual(bank1,bank0,'same crack, bank, seed and tap count');
  const errs=m.errors.concat(tErr,m2.errors);assert.strictEqual(errs.length,0,errs.join('\n'));
  console.log(JSON.stringify({main:mainVer,tray:ver,storageSharedBetweenTheTwoFiles:shared,mainKeys:mainKeys.length,mainKeysChangedByTray:diff.length,trayKeysAdded:added.length,trayKeys:added.sort(),mainKeysDifferentAtRelaunch:diff2,resumedSameWall:true,pageErrors:errs.length},null,1));
  console.log('MAINSAVE PASS');await H.close();process.exit(0)})().catch(async e=>{console.error('MAINSAVE FAIL',e);try{await H.close()}catch(_){}process.exit(1)});
