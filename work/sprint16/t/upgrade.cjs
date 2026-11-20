// Upgrade from a real rc9b profile (game/current.html, rw_ keys, old seal rule) into this build. node upgrade.cjs [build]
// The rc9b profile is made by rc9b itself: its title, menu and Dig button are tapped, tiles are dug and a seal is made with real taps, and the rest of the
// profile (a Vault relic, Gold, rank, a tomb on record, a setting, a Daily best) is written by rc9b's own save functions, so every format is rc9b's own.
// Case A: the app is closed with a dig in progress. Case B: the run was finished first (no dig in progress).
const H=require('./h.cjs');const assert=require('assert');const path=require('path');
const FILE=process.argv[2]||H.BUILD;
const rows=[];let fail=0;
const T=async(name,fn)=>{try{const note=await fn();rows.push([name,'PASS',note||'']);console.log('PASS',name,note||'')}catch(e){fail++;rows.push([name,'FAIL',String(e.message).slice(0,400)]);console.log('FAIL',name,e.stack||e)}};
const toDig=async page=>{await page.waitForTimeout(1300);await page.locator('#title button.tl-dig').tap();await page.waitForSelector('#overlay:not([hidden]) #dig, #mDig');await page.waitForTimeout(H.GUARD);
  if(await page.locator('#mDig:visible').count()){await page.locator('#mDig').tap();await page.waitForSelector('#overlay:not([hidden]) #dig');await page.waitForTimeout(H.GUARD)}
  await page.locator('#overlay:not([hidden]) #dig').tap();await page.waitForFunction(()=>state&&!state.train&&document.getElementById('overlay').hidden);await page.waitForTimeout(900)};
const uncover=async(page,n)=>{await page.locator('#pick').tap();
  const cells=await page.evaluate(n=>{try{luckSlipHide()}catch(e){}const out=[];for(const f of state.finds){if(f.sarc||f.relic||f.banked||f.cells.every(([x,y])=>state.dirt[y][x]===0))continue;if(out.length>=n)break;f.cells.forEach(([x,y],j)=>{state.dirt[y][x]=j===0?1:0});out.push(f.cells[0])}ui();draw();return out},n);
  for(const [x,y] of cells){const p=await H.cellXY(page,x,y);await H.clearWay(page,p);await H.tapXY(page,p.x,p.y);await page.waitForTimeout(90)}};
const sealNow=async page=>{await page.evaluate(()=>{Q.speed=4});await page.locator('#seal').tap();await page.waitForFunction(()=>!state.sealing&&!Q.busy,null,{timeout:15000});await page.waitForTimeout(700);
  for(let k=0;k<3;k++){const no=page.locator('#lkno');if(await no.count()){await page.waitForTimeout(1300);await no.tap().catch(()=>{});await page.waitForTimeout(400)}}};
const prof=page=>page.evaluate(()=>{stSave();return{ver:GAME_VERSION,coll:loadColl(),seen:loadSeen().sort(),xp:PROG.rank.xp,rank:PROG.rank.r,tombs:JSON.stringify(PROG.tombs.c),stakes:JSON.stringify(PROG.stakes.u),gold:_gold,unl:localStorage.getItem('rw_unl'),
  set:localStorage.getItem('rw_settings'),runs:ST.runs,wins:ST.wins,taps:ST.taps,col:ST.col,rel:ST.rel,chambers:ST.chambers,best:ST.best,bs:ST.bs,bsn:ST.bsn,hist:JSON.stringify(ST.hist),bbest:bestGet().best|0,bruns:bestGet().runs|0,bwins:bestGet().wins|0,
  daily:JSON.stringify(dailyGet()),streak:JSON.stringify(streakGet()),kit2:localStorage.getItem('rw_kit2'),cos:localStorage.getItem('rw_cos'),shop:localStorage.getItem('rw_shop'),train:localStorage.getItem('rw_train')}});
// ---- make the rc9b profile
async function makeOld(finish){
  const o=await H.open(H.MAIN,{});const page=o.page;await toDig(page);
  assert.strictEqual(await page.evaluate(()=>GAME_VERSION),'v1.0-rc9b');
  await page.evaluate(()=>{TARGETS[state.i]=999999;document.getElementById('target').textContent=TARGETS[state.i]}); // setup: seven finds would clear rc9b's first wall, and the dig has to stay open
  await uncover(page,7);await sealNow(page); // rc9b: one seal takes all seven
  await page.evaluate(()=>{ // the rest of a lived-in profile, through rc9b's own functions
    saveColl(['Ankh','Heart Scarab']);ecoWalletEarn(140);PROG.rank.xp=xpAt(7)+5;PROG.rank.r=rankFor(PROG.rank.xp);progSaveRank();PROG.tombs.c['1.1']=2;PROG.tombs.c['2.1']=1;progSaveTombs();PROG.stakes.u.scholar=2;progSaveStakes();progGrantLegacy();
    setSet('rm',true);const d=dailyGet();d['20261101']=4321;dailyPut(d);ST.wins=2;ST.chambers=9;ST.hist.push({b:5700,w:1,d:0,c:'scholar'});stSave();const B=bestGet();B.wins=2;B.best=Math.max(B.best|0,6100);B.runs=Math.max(B.runs|0,3);bestPut(B);ST.best=Math.max(ST.best,6100);stSave();run.gold=(run.gold|0)+17;ui()});
  await uncover(page,3); // leave three finds loose on the wall
  if(finish){ // the wall comes down on the last Memory: the run ends and rc9b writes its own summary and best scores
    await page.evaluate(()=>{run.lives=1;_mercy=SKILL.mercy.free;state.crack=maxCrack()-.5;ui()});
    const c=await page.evaluate(()=>{for(let y=ROWS-1;y>=0;y--)for(let x=0;x<COLS;x++)if(state.dirt[y][x]>0&&!(state.owner[y][x]>=0&&state.finds[state.owner[y][x]].sarc))return[x,y]});
    await page.locator('#pick').tap();const p=await H.cellXY(page,c[0],c[1]);await H.clearWay(page,p);await H.tapXY(page,p.x,p.y);
    await page.waitForFunction(()=>!document.getElementById('overlay').hidden&&/forgotten you/.test(document.getElementById('card').textContent),null,{timeout:20000});await page.waitForTimeout(H.GUARD+300);
    await page.locator('#card #go').tap();await page.waitForTimeout(900)}
  const before=await prof(page);const purse=await page.evaluate(()=>run&&run.gold|0),ch=await page.evaluate(()=>state.i+1);
  await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));await page.waitForTimeout(250);
  const keys=await page.evaluate(()=>Object.keys(localStorage).filter(k=>/^rw_/.test(k)).sort());
  assert.strictEqual(o.errors.length,0,'rc9b page errors: '+o.errors.join('\n'));
  return{o,before,purse,ch,keys}}
async function check(label,finish){
  let old=null,n=null,after=null;
  await T(label+': rc9b profile made by playing rc9b',async()=>{old=await makeOld(finish);const has=old.keys.indexOf('rw_resume')>=0;assert.strictEqual(has,!finish,'dig in progress: '+has);
    assert(old.before.bs>0&&old.before.best>0&&old.before.coll.length===2&&old.before.gold>=140,JSON.stringify(old.before).slice(0,300));return old.keys.length+' rw_ keys, best haul '+old.before.best+', best seal '+old.before.bs+', dig in progress: '+has});
  await T(label+': the build opens on it with no error and offers no broken dig',async()=>{n=await H.relaunch(old.o,FILE);const page=n.page;await page.waitForTimeout(1300);
    const s=await page.evaluate(()=>({ver:GAME_VERSION,flag:localStorage.getItem('rw_rc10'),resume:localStorage.getItem('rw_resume'),peek:!!S11.peekResume(),note:JSON.parse(localStorage.getItem('rw_rc10note')||'null'),old:JSON.parse(localStorage.getItem('rw_rc9')||'null')}));
    assert.strictEqual(s.ver,'v1.0-rc10');assert.strictEqual(s.flag,'1');assert.strictEqual(s.resume,null,'old dig record removed');assert(!s.peek);assert(s.note,'a note is waiting');
    assert.strictEqual(!!s.note.dig,!finish);if(!finish){assert.strictEqual(s.note.dig.gold,old.purse);assert.strictEqual(s.note.dig.ch,old.ch)}
    assert.strictEqual(s.old.best,old.before.best);assert.strictEqual(s.old.bs,old.before.bs);assert.strictEqual(s.old.daily['20261101'],4321);
    assert.strictEqual(n.errors.length,0,n.errors.join('\n'));return 'note '+JSON.stringify(s.note)+', old bests set aside '+s.old.best+' / '+s.old.bs});
  await T(label+': everything else came over unchanged',async()=>{after=await prof(n.page);const b=old.before,a=after;
    for(const k of ['coll','seen'])assert.deepStrictEqual(a[k],b[k],k);
    for(const k of ['xp','rank','tombs','stakes','unl','set','runs','wins','taps','col','rel','chambers','bruns','bwins','streak','kit2','cos','shop','train'])assert.strictEqual(a[k],b[k],k+': '+b[k]+' -> '+a[k]);
    assert.strictEqual(a.gold,b.gold+(finish?0:old.purse),'Gold: wallet '+b.gold+' + purse '+old.purse+' -> '+a.gold);
    assert.strictEqual(a.best,0);assert.strictEqual(a.bs,0);assert.strictEqual(a.bbest,0);assert.strictEqual(a.daily,'{}');
    const h0=JSON.parse(b.hist),h1=JSON.parse(a.hist);assert.strictEqual(h1.length,h0.length);h0.forEach((h,i)=>{assert.strictEqual(h1[i].b,h.b*3);assert.strictEqual(h1[i].w,h.w)});
    return 'Vault '+a.coll.join(', ')+'; rank '+a.rank+' ('+a.xp+' XP); Gold '+a.gold+'; '+a.runs+' runs, '+a.wins+' tombs; tombs '+a.tombs+'; Reduce Motion kept; chart bars x3'});
  await T(label+': the note is shown once, in plain words, and the menu follows',async()=>{const page=n.page;await page.locator('#title button.tl-dig').tap();await page.waitForSelector('#overlay:not([hidden]) #card #go');
    const t=await page.evaluate(()=>document.getElementById('card').textContent);assert(/The rules of the dig changed/.test(t)&&/tray of six/.test(t)&&/three times what it was/.test(t)&&/Stats page/.test(t),t.slice(0,200));
    assert.strictEqual(/Your open dig was closed/.test(t),!finish,'dig paragraph');if(!finish)assert(new RegExp('purse of '+old.purse+' Gold is in your wallet').test(t)&&new RegExp('chamber '+old.ch).test(t),t);assert(!/—/.test(t),'no em dash');
    const sc=await H.noScroll(page);assert(sc.ok,'no horizontal scroll');await page.screenshot({path:path.join(__dirname,'..','shots','upgrade-note-'+(finish?'no-dig':'open-dig')+'-390x844.png')});
    await page.waitForTimeout(H.GUARD);await page.locator('#card #go').tap();await page.waitForSelector('#overlay:not([hidden]) #mDig, #overlay:not([hidden]) #dig',{timeout:8000});
    assert.strictEqual(await page.evaluate(()=>localStorage.getItem('rw_rc10note')),null);return (finish?'no dig paragraph':'dig paragraph with chamber and purse')});
  await T(label+': Stats shows the old bests as old; a new dig, seal and resume work',async()=>{const page=n.page;
    await page.evaluate(()=>showStats());await page.waitForTimeout(500);const st=await page.evaluate(()=>document.getElementById('card').textContent);
    assert(new RegExp('old rule: '+old.before.best.toLocaleString('en-US')).test(st),'best haul line: '+st.slice(0,260));assert(/under the old rule: /.test(st),'best seal line');
    await page.screenshot({path:path.join(__dirname,'..','shots','upgrade-stats-'+(finish?'no-dig':'open-dig')+'-390x844.png')});
    await page.evaluate(()=>showMenu());await page.waitForTimeout(H.GUARD);if(await page.locator('#mDig:visible').count()){await page.locator('#mDig').tap();await page.waitForSelector('#overlay:not([hidden]) #dig');await page.waitForTimeout(H.GUARD)}
    await page.locator('#overlay:not([hidden]) #dig').tap();await page.waitForFunction(()=>state&&!state.train&&document.getElementById('overlay').hidden);await page.waitForTimeout(900);
    await uncover(page,8);const tr=await page.evaluate(()=>trayList().length);assert.strictEqual(tr,6,'six on the tray');await sealNow(page);
    const s1=await page.evaluate(()=>({bank:run.banked,loose:exposedFinds().length,bs:ST.bs,rec:JSON.parse(localStorage.getItem('rw_resume')||'{}').v}));assert(s1.bank>0&&s1.loose===2&&s1.bs>0);
    await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));const sig=await H.wallSig(page);
    const m=await H.relaunch(n,FILE);await H.resumeFromTitle(m.page);const sig2=await H.wallSig(m.page),s2=await m.page.evaluate(()=>({bank:run.banked,loose:exposedFinds().length,old:JSON.parse(localStorage.getItem('rw_rc9')).best,flag:localStorage.getItem('rw_rc10'),note:localStorage.getItem('rw_rc10note')}));
    assert.strictEqual(sig2,sig,'same wall after resume');assert.strictEqual(s2.bank,s1.bank);assert.strictEqual(s2.loose,2);assert.strictEqual(s2.old,old.before.best,'the upgrade ran once only');assert.strictEqual(s2.note,null);
    assert.strictEqual(n.errors.concat(m.errors).length,0,n.errors.concat(m.errors).join('\n'));await m.ctx.close();return 'new best seal '+s1.bs+'; resumed the same wall; old bests still '+s2.old});
}
(async()=>{
  await check('A, dig in progress',false);
  await check('B, no dig in progress',true);
  await T('a brand-new profile is not treated as an old one',async()=>{const o=await H.open(FILE,{fresh:true});await o.page.waitForTimeout(800);
    const s=await o.page.evaluate(()=>({flag:localStorage.getItem('rw_rc10'),old:localStorage.getItem('rw_rc9'),note:localStorage.getItem('rw_rc10note')}));assert.deepStrictEqual(s,{flag:'1',old:null,note:null});
    assert.strictEqual(o.errors.length,0,o.errors.join('\n'));await o.ctx.close();return JSON.stringify(s)});
  console.log('\n| Test | Result | Note |\n|---|---|---|');rows.forEach(r=>console.log('| '+r.join(' | ')+' |'));
  console.log(fail?'UPGRADE FAIL '+fail:'UPGRADE PASS '+rows.length);await H.close();process.exit(fail?1:0)})().catch(async e=>{console.error('UPGRADE ERROR',e);try{await H.close()}catch(_){}process.exit(1)});
