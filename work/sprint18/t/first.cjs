// The first tomb (a profile that has never cleared a tomb): the seal waits for a full tray, and chamber 3 asks less. node first.cjs [build]
// Finds are brought to one tile from open by setup; every uncovering and every Seal press is a real touchscreen tap.
const H=require('./h.cjs');const assert=require('assert');const path=require('path');
const FILE=process.argv[2]||H.BUILD,SHOTS=path.join(__dirname,'..','shots');
const rows=[];let fail=0;
const T=async(name,fn)=>{try{const note=await fn();rows.push([name,'PASS',note||'']);console.log('PASS',name,note||'')}catch(e){fail++;rows.push([name,'FAIL',String(e.message).slice(0,300)]);console.log('FAIL',name,e.stack||e)}};
const almost=(page,n)=>page.evaluate(n=>{try{luckSlipHide()}catch(e){}const out=[];for(const f of state.finds){if(f.sarc||f.relic||f.banked||f.cells.every(([x,y])=>state.dirt[y][x]===0))continue;if(out.length>=n)break;f.cells.forEach(([x,y],j)=>{state.dirt[y][x]=j===0?1:0});out.push({id:f.id,x:f.cells[0][0],y:f.cells[0][1]})}ui();draw();return out},n);
const tapCell=async(page,x,y)=>{const p=await H.cellXY(page,x,y);await H.clearWay(page,p);await H.tapXY(page,p.x,p.y);await page.waitForTimeout(80)};
const st=page=>page.evaluate(()=>({ft:state.ft|0,held:sealHeld(),sealed:state.sealed,loose:exposedFinds().length,tray:trayList().length,seal:document.getElementById('seal').textContent,log:document.getElementById('log').textContent,toast:(document.getElementById('uitoast')||{}).textContent||'',bank:run.banked,tg:TARGETS.slice(0,3)}));
const fresh=async(seed,o)=>{const r=await H.open(FILE,o||{});await r.page.waitForTimeout(500);await H.startSeeded(r.page,seed);await r.page.waitForTimeout(400);await r.page.locator('#pick').tap();return r};
const sealTap=async page=>{await page.evaluate(()=>{Q.speed=4});await page.locator('#seal').tap();await page.waitForTimeout(250);await page.waitForFunction(()=>!state.sealing&&!Q.busy,null,{timeout:15000});await page.waitForTimeout(400);
  for(let k=0;k<3;k++){const no=page.locator('#lkno');if(await no.count()){await page.waitForTimeout(1300);await no.tap().catch(()=>{});await page.waitForTimeout(400)}}};
(async()=>{
  for(const [w,h] of [[390,844],[844,390]])await T('first tomb: Seal with three finds is held, and says why ('+w+'x'+h+')',async()=>{const {page,errors,ctx}=await fresh('FT-A',{w,h});
    const c=await almost(page,7);for(const q of c.slice(0,3))await tapCell(page,q.x,q.y);const a=await st(page);
    assert.strictEqual(a.ft,1,'a first-tomb chamber');assert(a.held,'held');assert(/Tray 3\/6 · fill it/.test(a.seal),a.seal);
    await sealTap(page);const b=await st(page);assert.strictEqual(b.sealed,0,'nothing was sealed');assert.strictEqual(b.loose,3);assert.strictEqual(b.bank,a.bank);
    assert(/Not yet\. On your first tomb the Quartermaster stamps a full tray: 3 of 6 so far/.test(b.log),b.log);assert(/Fill the tray first: six finds make a Hoard/.test(b.toast),b.toast);
    await page.screenshot({path:path.join(SHOTS,'first-tomb-seal-held-'+w+'x'+h+'.png')});
    for(const q of c.slice(3,6))await tapCell(page,q.x,q.y);const d=await st(page);assert(!d.held,'six on the tray: not held');assert(/Tray 6\/6/.test(d.seal)&&!/fill it/.test(d.seal),d.seal);
    await page.evaluate(()=>{TARGETS[state.i]=999999});await sealTap(page);const e=await st(page);assert.strictEqual(e.sealed,1,'a full tray is sealed');assert(e.bank>a.bank);
    assert.strictEqual(errors.length,0,errors.join('\n'));await ctx.close();return 'held at 3, sealed at 6 for '+(e.bank-a.bank)});
  await T('first tomb: in the red the seal is let go',async()=>{const {page,errors,ctx}=await fresh('FT-B',{});
    const c=await almost(page,3);for(const q of c.slice(0,2))await tapCell(page,q.x,q.y);assert((await st(page)).held);
    await page.evaluate(()=>{state.crack=Math.ceil(maxCrack()*.8);ui()});const a=await st(page);assert(!a.held,'not held in the red');assert(!/fill it/.test(a.seal),a.seal);
    await sealTap(page);const b=await st(page);assert.strictEqual(b.sealed,1);assert.strictEqual(errors.length,0,errors.join('\n'));await ctx.close();return 'two finds sealed at 80% crack'});
  await T('first tomb: at nine loose finds the seal is let go even with finds tapped off the tray',async()=>{const {page,errors,ctx}=await fresh('FT-C',{});
    const c=await almost(page,9);for(const q of c.slice(0,8))await tapCell(page,q.x,q.y);let a=await st(page);
    const on=await page.evaluate(()=>trayList().map(f=>f.cells[0]));for(const q of on.slice(0,2))await tapCell(page,q[0],q[1]);for(const q of on.slice(2,4)){await tapCell(page,q[0],q[1])}
    a=await st(page);await tapCell(page,c[8].x,c[8].y);const b=await st(page);assert.strictEqual(b.loose,9);assert(!b.held,'nine loose: not held (tray '+b.tray+')');
    assert.strictEqual(errors.length,0,errors.join('\n'));await ctx.close();return 'tray '+a.tray+' with eight loose (held: '+a.held+'), free at nine'});
  await T('first tomb: chamber 3 asks 7,500; after a cleared tomb it asks the full sum; the Daily is never eased',async()=>{const {page,errors,ctx}=await fresh('FT-D',{});
    await page.evaluate(()=>{document.getElementById('overlay').hidden=true;newChamber(2)});await page.waitForTimeout(700);const a=await page.evaluate(()=>({tg:TARGETS[2],tell:state.tell||'',ft:state.ft,full:TARGETS_BASE[2],log:document.getElementById('log').textContent,t3:FT.t3}));
    const mul=a.tell==='hollow'?1.15:1;assert.strictEqual(a.ft,1);assert(Math.abs(a.tg-Math.round(a.t3*mul/10)*10)<=10||a.tell==='crowded','chamber 3 target '+a.tg+' tell '+a.tell);assert.strictEqual(a.t3,7500);
    await page.screenshot({path:path.join(SHOTS,'first-tomb-chamber3-390x844.png')});
    const b=await page.evaluate(()=>{ST.wins=1;document.getElementById('overlay').hidden=true;run.tellC={};newChamber(2);return{tg:TARGETS[2],ft:state.ft,held:sealHeld(),tell:state.tell||''}});
    assert.strictEqual(b.ft,0);assert(b.tg>=a.full,'full target after a win: '+b.tg);
    const d=await page.evaluate(()=>{ST.wins=0;run.daily=1;run.seed=dailySeed();document.getElementById('overlay').hidden=true;run.tellC={};newChamber(2);return{tg:TARGETS[2],ft:state.ft}});assert.strictEqual(d.ft,0,'no first-tomb rule on the Daily');assert(d.tg>=a.full);
    assert.strictEqual(errors.length,0,errors.join('\n'));await ctx.close();return 'first tomb '+a.tg+(a.tell?' ('+a.tell+')':'')+', after a win '+b.tg+(b.tell?' ('+b.tell+')':'')+', Daily '+d.tg+'; log: '+a.log.slice(0,70)});
  await T('a profile that has cleared a tomb is never held',async()=>{const {page,errors,ctx}=await fresh('FT-A',{won:true});
    const c=await almost(page,3);for(const q of c.slice(0,2))await tapCell(page,q.x,q.y);const a=await st(page);assert.strictEqual(a.ft,0);assert(!a.held);await sealTap(page);assert.strictEqual((await st(page)).sealed,1);
    assert.strictEqual(errors.length,0,errors.join('\n'));await ctx.close();return 'two finds sealed at once'});
  await T('first tomb: the rule survives closing the app mid-dig',async()=>{let o=await fresh('FT-E',{});const c=await almost(o.page,4);for(const q of c.slice(0,3))await tapCell(o.page,q.x,q.y);await o.page.waitForTimeout(800);
    const n=await H.relaunch(o,FILE);await H.resumeFromTitle(n.page);const a=await st(n.page);assert.strictEqual(a.ft,1);assert(a.held);assert.strictEqual(a.loose,3);assert.strictEqual(n.errors.length,0,n.errors.join('\n'));await n.ctx.close();return 'still held after resume, 3 loose'});
  console.log('\n| Test | Result | Note |\n|---|---|---|');rows.forEach(r=>console.log('| '+r.join(' | ')+' |'));
  console.log(fail?'FIRST FAIL '+fail:'FIRST PASS '+rows.length);await H.close();process.exit(fail?1:0)})().catch(e=>{console.error('FIRST ERROR',e);process.exit(1)});
