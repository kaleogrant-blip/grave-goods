// TRAY TEST build. End-to-end at three viewports, real taps for everything a player taps (now with the tray: eight loose finds, a pick, an unpick, a six-find seal):
// title -> kit -> dig -> seal -> sarcophagus reading (3 taps) -> second bone at the fourth Fever (3 taps) -> chamber cleared -> Market.
// Checks: zero page errors, document.scrollWidth <= viewport at every stop, the reading's printed record against boneTable().
const H=require('./h.cjs');const assert=require('assert');
const VPS=[[390,844],[360,640],[844,390]];
(async()=>{let fail=0;const out=[];
for(const [w,h] of VPS){
  const {page,errors,ctx}=await H.open(process.argv[2]||H.BUILD,{w,h});const stops=[];
  const stop=async n=>{const s=await H.noScroll(page);stops.push(n+':'+s.sw+'/'+s.iw);if(!s.ok){fail++;console.log('SCROLL',w,h,n,s)}};
  await page.waitForTimeout(600);const seed=await H.sarcSeed(page,'FLOW-'+w+'-',true); // a seed whose first wall has a real sarcophagus, then a clean launch
  await page.waitForTimeout(1300);await stop('title');
  await page.locator('#title button.tl-dig').tap();await page.waitForSelector('#overlay:not([hidden]) #dig, #mDig');await page.waitForTimeout(H.GUARD);
  if(await page.locator('#mDig:visible').count()){await stop('camp');await page.locator('#mDig').tap();await page.waitForSelector('#overlay:not([hidden]) #dig');await page.waitForTimeout(H.GUARD)}await stop('kit'); // a profile that has dug before lands on the camp menu first
  await page.evaluate(s=>{run.seed=s},seed);
  await page.locator('#overlay:not([hidden]) #dig').tap();
  await page.waitForFunction(()=>state&&!state.train&&document.getElementById('overlay').hidden);await page.waitForTimeout(900);await stop('wall');
  // dig: real taps on the cells of two finds, with the pick
  await page.locator('#pick').tap();
  const cells=await page.evaluate(()=>state.finds.filter(f=>!f.sarc&&!f.relic).slice(0,2).flatMap(f=>f.cells));
  let dug=0;for(const [x,y] of cells){for(let g=0;g<4;g++){const d=await page.evaluate(([x,y])=>state.dirt[y][x],[x,y]);if(!d)break;const p=await H.cellXY(page,x,y);await H.tapXY(page,p.x,p.y);dug++;await page.waitForTimeout(90)}}
  const ex=await page.evaluate(()=>exposedFinds().length);assert(ex>=1,'real taps uncovered a find');await stop('dug');
  // the tray: eight loose finds (their last tiles dug by real taps), one tapped off, one tapped on, then Seal
  const last=await page.evaluate(()=>{const out=[];for(const f of state.finds){if(f.sarc||f.banked||f.cells.every(([x,y])=>state.dirt[y][x]===0))continue;if(exposedFinds().length+out.length>=8)break;f.cells.forEach(([x,y],j)=>{state.dirt[y][x]=j===0?1:0});out.push(f.cells[0])}ui();draw();return out});
  for(const [x,y] of last){const p=await H.cellXY(page,x,y);await H.tapXY(page,p.x,p.y);await page.waitForTimeout(90)}
  const t0=await page.evaluate(()=>({ex:exposedFinds().map(f=>f.id),tray:trayList().map(f=>f.id),seal:document.getElementById('seal').textContent,tag:document.getElementById('trayTag').getBoundingClientRect().width>40}));
  assert.strictEqual(t0.ex.length,8,'eight loose finds');assert.strictEqual(t0.tray.length,6,'six on the tray');assert(/Tray 6\/6/.test(t0.seal),t0.seal);assert(t0.tag,'TRAY TEST tag');await stop('tray8');
  const offId=t0.ex.find(i=>t0.tray.indexOf(i)<0),onId=t0.tray[0];
  for(const id of [offId,onId]){ // put a left-out find on (the least valuable default drops out), then take one of the six off (the next most valuable steps in)
  const c=await page.evaluate(id=>state.finds[id].cells[0],id);const p=await H.cellXY(page,c[0],c[1]);
    if(await page.evaluate(p=>{const e=document.elementFromPoint(p.x,p.y);return !e||e.id!=='c'},p)){await page.locator('#strip').tap();await page.waitForTimeout(500)} // the score sheet is open over the top rows: shut it as a player would
    await H.tapXY(page,p.x,p.y);await page.waitForTimeout(120)}
  const t1=await page.evaluate(()=>({tray:trayList().map(f=>f.id),pick:state.finds.map(f=>f.tray==null?null:f.tray),tot:score(trayList()).total,b:run.banked}));
  assert(t1.tray.indexOf(onId)<0&&t1.tray.indexOf(offId)>=0&&t1.tray.length===6,'picked by tap: '+JSON.stringify(t1.tray));await stop('picked');
  await page.evaluate(()=>{Q.speed=4;TARGETS[state.i]=999999;document.getElementById('target').textContent=TARGETS[state.i]}); // setup: a six-find tray would clear this first wall, and the flow still has a sarcophagus and a second bone to read on it
  await page.locator('#seal').tap();await page.waitForFunction(()=>!state.sealing&&!Q.busy,null,{timeout:15000});await page.waitForTimeout(600);
  // a knucklebone offer or a relic card may be up: decline / close
  for(let k=0;k<4;k++){const no=page.locator('#lkno');if(await no.count()){await page.waitForTimeout(1300);await no.tap();await page.waitForTimeout(400)}const go=page.locator('#overlay:not([hidden]) #go:visible');if(await go.count()){await page.waitForTimeout(H.GUARD);await go.tap();await page.waitForTimeout(500)}}
  const banked=await page.evaluate(()=>run.banked);assert(banked>0,'the seal banked something');
  const t2=await page.evaluate(ids=>({b:ids.every(i=>state.finds[i].banked),loose:exposedFinds().length,coin:!!document.getElementById('lkp')}),t1.tray);assert(t2.b,'the six on the tray were sealed');assert.strictEqual(t2.loose,2,'two finds stayed on the wall');await stop('sealed');
  // sarcophagus: real tap on the wall, three real taps on the bone
  await page.evaluate(()=>{Q.speed=1});
  assert(await H.tapSarc(page),'a sarcophagus opened the bone');
  const pend=await page.evaluate(()=>JSON.parse(localStorage.getItem('S15T_resume')).w.sarcPend);assert(pend&&typeof pend.r==='number','the result is in the save before the first tap');
  await page.waitForTimeout(700);
  const b0=await H.boneInfo(page),tbl=await page.evaluate(()=>boneTable('sarc'));
  assert.deepStrictEqual(b0.rows.map(r=>[r.k,r.pct,r.side]),tbl.map(r=>[r.k,r.pct+'%',r.side]),'printed record = boneTable');await stop('bone0');
  await H.boneStep(page,800);await stop('bone1');
  await H.boneStep(page,900);const b2=await H.boneInfo(page);await stop('bone2');
  const key=await page.evaluate(r=>LK_KINDS.find(k=>r<k[0])[1],pend.r),side=await page.evaluate(k=>boneSide('sarc',k),key),rev=await page.evaluate(s=>boneRevised(boneTable('sarc'),s),side);
  b2.rows.forEach(r=>{if(r.side!==side)assert(r.out,'other side struck: '+r.k);else assert.strictEqual(r.rev,rev[r.k]+'%','pencilled figure for '+r.k)});
  await H.boneStep(page,1800);const b3=await H.boneInfo(page);assert(b3.rows.find(r=>r.k===key).hit,'the crack ended at the saved result');assert(/Find No/.test(b3.tag),'finds tag shown');await stop('bone3');
  await page.locator('#bngo').tap();await page.waitForFunction(()=>!document.getElementById('lkp')&&!LK.busy,null,{timeout:5000});
  assert.strictEqual(await page.evaluate(()=>state.sarcPend),null,'paid once, pending cleared');await page.waitForTimeout(500);
  // a relic or ore card may follow; close it
  for(let k=0;k<3;k++){const go=page.locator('#overlay:not([hidden]) #go:visible');if(await go.count()){await page.waitForTimeout(H.GUARD);await go.tap();await page.waitForTimeout(500)}}
  let res={sarc:key};
  // fourth Fever: the game's own counter, then the second bone by real taps
  if(await page.evaluate(()=>!state.over)){
    await page.evaluate(()=>{const S=RS();S.fev=LUCK.jackpot.at-1;luckFever()});
    await page.waitForSelector('#lkp.bn-fev',{timeout:8000});await page.waitForTimeout(800);
    const jp=await page.evaluate(()=>JSON.parse(localStorage.getItem('S15T_resume')).w.jpPend);assert(jp&&jp.k,'second bone: result saved before the first tap');
    const f0=await H.boneInfo(page),ft=await page.evaluate(()=>boneTable('fever'));assert.deepStrictEqual(f0.rows.map(r=>[r.k,r.pct,r.side]),ft.map(r=>[r.k,r.pct+'%',r.side]));await stop('fev0');
    await H.boneStep(page,800);await H.boneStep(page,900);await stop('fev2');await H.boneStep(page,1800);
    const f3=await H.boneInfo(page);assert(f3.rows.find(r=>r.k===jp.k).hit,'second bone ended at the saved result');await stop('fev3');
    await page.locator('#bngo').tap();await page.waitForFunction(()=>!document.getElementById('lkp')&&!LK.busy,null,{timeout:5000});await page.waitForTimeout(600);
    assert.strictEqual(await page.evaluate(()=>state.jpPend),null);res.fever=jp.k;
    for(let k=0;k<4;k++){const b=page.locator('#overlay:not([hidden]) button:visible').first();if(await b.count()){await page.waitForTimeout(H.GUARD);await b.tap();await page.waitForTimeout(600)}}
  }
  // clear the chamber and walk the cards to the Market
  await page.evaluate(()=>{Q.speed=4;if(!state.over){const need=TARGETS[state.i]-chBank();if(need>0){state.bankedThisChamber+=need;run.banked+=need}ui();checkClear()}});
  let market=false;
  for(let k=0;k<14&&!market;k++){await page.waitForTimeout(1500);
    market=await page.evaluate(()=>!document.getElementById('overlay').hidden&&/market/i.test(document.getElementById('card').textContent));if(market)break;
    const go=page.locator('#overlay:not([hidden]) #go:visible');const ch=page.locator('#overlay:not([hidden]) .chest:visible').first();
    if(await go.count())await go.tap();else if(await ch.count())await ch.tap()}
  assert(market,'reached the Market');await stop('market');
  const early=await page.evaluate(()=>__vibEarly.length);assert.strictEqual(early,0,'no vibrate() call before the first tap of this launch');
  const real=errors.slice();
  out.push({vp:w+'x'+h,errors:real.length,taps_dug:dug,tray:t1.tray,sealed:t1.tot,res,stops:stops.join(' ')});if(real.length){fail++;console.log(real)}
  await ctx.close();
}
console.log(JSON.stringify(out,null,1));console.log(fail?'FLOW FAIL':'FLOW PASS: 3 viewports, 0 page errors, no horizontal scroll');await H.close();process.exit(fail?1:0)})().catch(e=>{console.error('FLOW ERROR',e);process.exit(1)});
