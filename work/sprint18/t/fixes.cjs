// Sprint 18 (v1.0-rc10a): the four fixes, on the real build, with real touchscreen taps. node fixes.cjs [build]
// Setup is written directly (a find one tile from open, the bank one point under the target); every uncovering, tray tap, Seal press and card button is a tap.
// Where a fix is a correction of rc10, the same steps are also run on rc10 to show the test can tell the two apart.
const H=require('./h.cjs');const assert=require('assert');
const FILE=process.argv[2]||H.BUILD;
const rows=[];let fail=0;
const T=async(name,fn)=>{try{const note=await fn();rows.push([name,'PASS',note||'']);console.log('PASS',name,note||'')}catch(e){fail++;rows.push([name,'FAIL',String(e.message).slice(0,300)]);console.log('FAIL',name,e.stack||e)}};
const USED=`try{localStorage.setItem('rw_mercy','2');localStorage.setItem('rw_first','1')}catch(e){}`;
const SPY=`window.__tel=[];document.addEventListener('gg:tel',e=>{window.__tel.push(e.detail)});`; // what the app shell would be handed
const almost=(page,n)=>page.evaluate(n=>{try{luckSlipHide()}catch(e){}const out=[];for(const f of state.finds){if(f.sarc||f.relic||f.banked||f.cells.every(([x,y])=>state.dirt[y][x]===0))continue;if(out.length>=n)break;f.cells.forEach(([x,y],j)=>{state.dirt[y][x]=j===0?1:0});out.push({id:f.id,x:f.cells[0][0],y:f.cells[0][1],name:f.name})}ui();draw();return out},n);
const almostBare=page=>page.evaluate(()=>{try{luckSlipHide()}catch(e){}const k=state.finds.find(f=>!f.sarc&&!f.relic&&!f.banked);
  state.finds.forEach(f=>{if(f!==k)f.banked=true});for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++)state.dirt[y][x]=0;state.ores.forEach(o=>o.taken=true);
  state.dirt[k.cells[0][1]][k.cells[0][0]]=1;ui();draw();return k.cells[0]});
const tapCell=async(page,x,y)=>{const p=await H.cellXY(page,x,y);await H.clearWay(page,p);await H.tapXY(page,p.x,p.y);await page.waitForTimeout(90)};
const tel=(page,name)=>page.evaluate(n=>(window.GG_TEL||[]).filter(e=>!n||e.event===n),name||'');
const spy=(page,name)=>page.evaluate(n=>(window.__tel||[]).filter(e=>!n||e.event===n),name||'');
const fresh=async(file,seed,o)=>{const r=await H.open(file,Object.assign({init:SPY},o||{}));await r.page.waitForTimeout(500);await H.startSeeded(r.page,seed,o&&o.run);await r.page.waitForTimeout(400);await r.page.locator('#pick').tap();return r};
const sealTap=async page=>{await page.evaluate(()=>{Q.speed=4});await page.locator('#seal').tap();await page.waitForTimeout(250);await page.waitForFunction(()=>!state.sealing&&!Q.busy,null,{timeout:15000});await page.waitForTimeout(400);
  for(let k=0;k<3;k++){const no=page.locator('#lkno');if(await no.count()){await page.waitForTimeout(1300);await no.tap().catch(()=>{});await page.waitForTimeout(400)}}};
const next=async page=>{await page.waitForTimeout(H.GUARD+200);await page.locator('#card #go').tap();await page.waitForFunction(()=>document.getElementById('overlay').hidden&&state&&!state.over,null,{timeout:8000});await page.waitForTimeout(500)};
async function goBare(page){const c=await almostBare(page);await page.locator('#pick').tap();await tapCell(page,c[0],c[1]);await page.evaluate(()=>{Q.speed=4});await page.locator('#seal').tap();
  await page.waitForFunction(()=>state.bare>0,null,{timeout:15000});const log=await page.evaluate(()=>document.getElementById('log').textContent);const toast=await page.evaluate(()=>(document.getElementById('uitoast')||{}).textContent||'');
  await page.waitForFunction(()=>!document.getElementById('overlay').hidden,null,{timeout:15000});await page.waitForTimeout(300);
  return page.evaluate(([log,toast])=>({log,toast,h2:(document.querySelector('#card h2')||{}).textContent||'',lives:run.lives,bare:state.bare|0,dead:!run.lives}),[log,toast])}
const ALLOWED={crumble:['chamber','wall_index','kind','relic','loose'],tray_pick:['chamber','wall_index','tray','loose','put_on','held_back'],seal_held:['chamber','wall_index','tray','loose','crack_pct'],bare_wall:['chamber','wall_index','charged','nth']};
const ENV=['event','event_id','run_id','session_id','seq','build','config_version','ts_client','tz_offset_min']; // the envelope every game event already carries
const tiny=ev=>{const extra=Object.keys(ev).filter(k=>ENV.indexOf(k)<0).sort();assert.deepStrictEqual(extra,ALLOWED[ev.event].slice().sort(),ev.event+' carries only its own small fields');assert.strictEqual(ev.build,'v1.0-rc10a');assert(JSON.stringify(ev).length<420,'small: '+JSON.stringify(ev).length)};

// a seed whose first wall has at least n plain finds (probed in its own page, so the test page starts clean)
const _seeds={};async function seedWith(n){if(_seeds[n])return _seeds[n];const o=await H.open(FILE,{won:true});await o.page.waitForTimeout(400);let got=null;
  for(let k=0;k<200&&!got;k++){const s='FX-N'+n+'-'+k;await H.startSeeded(o.page,s);if(await o.page.evaluate(()=>state.finds.filter(f=>!f.sarc&&!f.relic).length)>=n)got=s}
  await o.page.evaluate(()=>{try{S15.hold=true;S11.clear()}catch(e){}});await o.ctx.close();if(!got)throw new Error('no seed with '+n+' plain finds');return _seeds[n]=got}
(async()=>{
  // ---------------------------------------------------------------- 1. the play log and a dig that resumes
  const midDig=async file=>{let o=await fresh(file,'FX-R',{won:true});const c=await almost(o.page,2);for(const q of c)await tapCell(o.page,q.x,q.y);
    const rid=await o.page.evaluate(()=>run.tid);const sig=await H.wallSig(o.page);
    o=await H.relaunch(o,file,{won:true,init:SPY});await o.page.waitForTimeout(600);
    const boot=(await tel(o.page,'run_end')).filter(e=>e.run_id===rid);
    await H.resumeFromTitle(o.page);const after=await tel(o.page);const sig2=await H.wallSig(o.page);
    const r={rid,boot,ends:after.filter(e=>e.event==='run_end'&&e.run_id===rid),resume:after.filter(e=>e.event==='run_resume'&&e.run_id===rid),same:sig===sig2,errors:o.errors.slice(),v:JSON.parse(o.dump.rw_resume).v};await o.ctx.close();return r};
  await T('1. relaunch in the middle of a dig: the play log shows a resume, not an interruption',async()=>{const r=await midDig(FILE);
    assert.strictEqual(r.v,2,'the saved-dig record is version 2');
    assert(!r.boot.some(e=>e.recovered),'at launch the dig is not closed as interrupted: '+JSON.stringify(r.boot));
    assert.strictEqual(r.resume.length,1,'one run_resume row');assert(r.same,'the same wall came back');
    assert.strictEqual(r.ends.filter(e=>!e.provisional).length,0,'no final run_end for a dig that is still going: '+JSON.stringify(r.ends));
    assert.strictEqual(r.ends.length,0,'the provisional row is withdrawn once the dig is resumed');
    assert.strictEqual(r.errors.length,0,r.errors.join('\n'));return 'run_resume 1, run_end 0, same wall'});
  await T('1b. the same steps on rc10 do close it (so the test above can tell the difference)',async()=>{const r=await midDig(H.RC10);
    assert(r.boot.some(e=>e.recovered&&e.outcome==='interrupted'),'rc10 turns the provisional row into a final one: '+JSON.stringify(r.boot));return 'rc10: run_end interrupted, recovered'});

  // ---------------------------------------------------------------- 2. telemetry for the tray rule
  await T('2a. crumble: a tenth find uncovered sends one small row (kind, relic, chamber, loose)',async()=>{const {page,errors,ctx}=await fresh(FILE,await seedWith(10),{won:true});
    const c=await almost(page,10);assert.strictEqual(c.length,10,'ten plain finds on this wall');for(const q of c.slice(0,9))await tapCell(page,q.x,q.y);
    assert.strictEqual((await tel(page,'crumble')).length,0,'nine loose: nothing has crumbled');
    const oldest=await page.evaluate(()=>trayOldest().name);await tapCell(page,c[9].x,c[9].y);await page.waitForTimeout(200);
    const ev=await tel(page,'crumble'),sp=await spy(page,'crumble');assert.strictEqual(ev.length,1);assert.strictEqual(sp.length,1,'handed to the shell on gg:tel');tiny(ev[0]);
    assert.strictEqual(ev[0].kind,oldest);assert.strictEqual(ev[0].relic,false);assert.strictEqual(ev[0].chamber,1);assert.strictEqual(ev[0].loose,10);
    assert.strictEqual(await page.evaluate(()=>exposedFinds().length),9);assert.strictEqual(errors.length,0,errors.join('\n'));await ctx.close();return JSON.stringify({kind:ev[0].kind,relic:ev[0].relic,chamber:ev[0].chamber,loose:ev[0].loose})});
  await T('2b. crumble of a relic says so',async()=>{const {page,errors,ctx}=await fresh(FILE,'FX-C2',{won:true});
    await page.evaluate(()=>{const f=state.finds.find(f=>!f.sarc&&!f.banked&&!f.relic);f.relic=true}); // setup: mark the find that will be oldest as a relic
    const c=await page.evaluate(()=>{const out=[];const R=state.finds.find(f=>f.relic&&!f.sarc);const L=[R].concat(state.finds.filter(f=>f!==R&&!f.sarc&&!f.relic&&!f.banked)).slice(0,10);L.forEach(f=>{f.cells.forEach(([x,y],j)=>{state.dirt[y][x]=j===0?1:0});out.push({x:f.cells[0][0],y:f.cells[0][1],name:f.name})});ui();draw();return out});
    for(const q of c){await tapCell(page,q.x,q.y);const lp=page.locator('#lkp #lkno');if(await lp.count()){await page.waitForTimeout(1300);await lp.tap().catch(()=>{})}}
    const ev=await tel(page,'crumble');assert.strictEqual(ev.length,1,JSON.stringify(ev));tiny(ev[0]);assert.strictEqual(ev[0].relic,true);assert.strictEqual(ev[0].kind,c[0].name);
    assert.strictEqual(errors.length,0,errors.join('\n'));await ctx.close();return JSON.stringify({kind:ev[0].kind,relic:true})});
  await T('2c. tray_pick: one row per seal, only when the tray was changed; the seal row gains "loose"',async()=>{const {page,errors,ctx}=await fresh(FILE,await seedWith(10),{won:true});
    await page.evaluate(()=>{TARGETS[state.i]=999999});
    let c=await almost(page,8);for(const q of c)await tapCell(page,q.x,q.y);
    // first seal: three taps (one off, one more off, one of them back on), then Seal: ONE row
    const on=await page.evaluate(()=>trayList().map(f=>f.cells[0]));await tapCell(page,on[0][0],on[0][1]);await tapCell(page,on[1][0],on[1][1]);await tapCell(page,on[1][0],on[1][1]);
    assert.strictEqual((await tel(page,'tray_pick')).length,0,'no row per tap');
    const want=await page.evaluate(()=>trayList().length);await sealTap(page);
    let ev=await tel(page,'tray_pick');assert.strictEqual(ev.length,1,'one row at the seal');tiny(ev[0]);assert.strictEqual(ev[0].tray,want);assert.strictEqual(ev[0].loose,8);assert(ev[0].held_back>=1,'one of the default six was held back');assert.strictEqual(ev[0].put_on,ev[0].held_back,'and one took its place');
    let se=await tel(page,'seal');assert.strictEqual(se.length,1);assert.strictEqual(se[0].finds,6);assert.strictEqual(se[0].loose,8,'seal.loose = finds loose when the seal was pressed');
    // second seal: the default tray, untouched: no row
    await sealTap(page);
    assert.strictEqual((await tel(page,'tray_pick')).length,1,'a default tray sends nothing');se=await tel(page,'seal');assert.strictEqual(se.length,2);assert.strictEqual(se[1].finds,2);assert.strictEqual(se[1].loose,2);
    // third seal: a find tapped off and tapped back on: the tray is the default one again: no row
    c=await almost(page,2);assert.strictEqual(c.length,2);for(const q of c)await tapCell(page,q.x,q.y);const one=await page.evaluate(()=>trayList()[0].cells[0]);await tapCell(page,one[0],one[1]);await tapCell(page,one[0],one[1]);
    assert.strictEqual(await page.evaluate(()=>state.finds.filter(f=>f.tray===1).length),1,'the find carries the player\'s mark');
    await sealTap(page);assert.strictEqual((await tel(page,'seal')).length,3);assert.strictEqual((await tel(page,'tray_pick')).length,1,'off and on again is not a change')
    assert.strictEqual((await spy(page,'tray_pick')).length,1);assert.strictEqual(errors.length,0,errors.join('\n'));await ctx.close();return JSON.stringify(ev[0],['tray','loose','put_on','held_back'])});
  await T('2d. seal_held: the first-tomb guard refusing a seal sends one row per tray count, not one per tap',async()=>{const {page,errors,ctx}=await fresh(FILE,'FT-A',{});
    const c=await almost(page,5);for(const q of c.slice(0,3))await tapCell(page,q.x,q.y);assert(await page.evaluate(()=>sealHeld()),'held');
    for(let k=0;k<3;k++){await page.locator('#seal').tap();await page.waitForTimeout(200)}
    let ev=await tel(page,'seal_held');assert.strictEqual(ev.length,1,'three presses, one row');tiny(ev[0]);assert.strictEqual(ev[0].tray,3);assert.strictEqual(ev[0].loose,3);assert.strictEqual(ev[0].chamber,1);
    await tapCell(page,c[3].x,c[3].y);await page.locator('#seal').tap();await page.waitForTimeout(200);ev=await tel(page,'seal_held');assert.strictEqual(ev.length,2);assert.strictEqual(ev[1].tray,4);
    assert.strictEqual((await tel(page,'seal')).length,0,'nothing was sealed');assert.strictEqual(await page.evaluate(()=>state.sealed),0);
    assert.strictEqual(errors.length,0,errors.join('\n'));await ctx.close();return 'rows at tray 3 and tray 4'});
  await T('2e. bare_wall: free, then charged; chamber_end gains "crumbled"',async()=>{const {page,errors,ctx}=await fresh(FILE,'BARE-A',{init:USED+SPY});
    const a=await goBare(page);let ev=await tel(page,'bare_wall');assert.strictEqual(ev.length,1);tiny(ev[0]);assert.strictEqual(ev[0].charged,false);assert.strictEqual(ev[0].nth,1);assert.strictEqual(a.lives,3);
    await next(page);const b=await goBare(page);ev=await tel(page,'bare_wall');assert.strictEqual(ev.length,2);tiny(ev[1]);assert.strictEqual(ev[1].charged,true);assert.strictEqual(ev[1].nth,2);assert.strictEqual(b.lives,2);
    await next(page);const ce=await tel(page,'chamber_end');assert(ce.length>=2,'chamber_end rows');ce.forEach(e=>assert.strictEqual(e.crumbled,0,'no find crumbled on these walls'));
    assert.strictEqual(errors.length,0,errors.join('\n'));await ctx.close();return 'free nth 1, charged nth 2'});
  await T('2f. chamber_end.crumbled counts the finds that crumbled on that wall',async()=>{const {page,errors,ctx}=await fresh(FILE,await seedWith(10),{won:true});
    const c=await almost(page,10);for(const q of c)await tapCell(page,q.x,q.y);await page.evaluate(()=>{state.crack=maxCrack()-1;window.__c=null;for(let y=ROWS-1;y>=0&&!window.__c;y--)for(let x=0;x<COLS;x++)if(state.dirt[y][x]>0&&state.owner[y][x]<0){window.__c=[x,y];break}ui()});
    const cc=await page.evaluate(()=>window.__c);await page.evaluate(()=>{Q.speed=4});await tapCell(page,cc[0],cc[1]); // the wall is one strike from its limit: this tap brings it down
    await page.waitForFunction(()=>!document.getElementById('overlay').hidden,null,{timeout:15000});await next(page);
    const ce=await tel(page,'chamber_end');assert.strictEqual(ce.length,1);assert.strictEqual(ce[0].outcome,'collapse');assert.strictEqual(ce[0].crumbled,1);
    assert.strictEqual(errors.length,0,errors.join('\n'));await ctx.close();return 'crumbled 1 on a collapsed wall'});
  await T('2g. Play log switched off: none of the new rows is written or handed on',async()=>{const {page,errors,ctx}=await fresh(FILE,await seedWith(10),{won:true,init:`try{localStorage.setItem('rw_tel_off','1')}catch(e){}`+SPY});
    const c=await almost(page,10);for(const q of c)await tapCell(page,q.x,q.y);assert.strictEqual(await page.evaluate(()=>exposedFinds().length),9,'the tenth crumbled');
    assert.strictEqual((await tel(page)).length,0);assert.strictEqual((await spy(page)).length,0);assert.strictEqual(errors.length,0,errors.join('\n'));await ctx.close();return '0 rows'});

  // ---------------------------------------------------------------- 3. text written from the numbers
  const TXT=()=>({stakes:STAKES.map(s=>s.rule),unl:UNLOCKS.filter(u=>u.kind==='stake').map(u=>u.line),how:HOW.find(c=>/Memories and walking away/.test(c.h)).t});
  await T('3a. with the shipped numbers every Stake card and the How to Play card read exactly as in rc10',async()=>{const a=await H.open(H.RC10,{}),b=await H.open(FILE,{});
    const x=await a.page.evaluate(TXT),y=await b.page.evaluate(TXT);assert.deepStrictEqual(y,x);assert(/Targets \+5%\.$/.test(y.stakes[3])&&/Targets \+10%\.$/.test(y.stakes[4])&&/^Targets \+15%, the knucklebone/.test(y.stakes[5]),JSON.stringify(y.stakes));
    await a.ctx.close();await b.ctx.close();return y.stakes.slice(3).map(s=>s.match(/Targets [^.,]*/)[0]).join(' | ')});
  await T('3b. Stake cards follow SKILL.stakeT (kit screen, real taps), for +, 0 and a lower target',async()=>{const {page,errors,ctx}=await H.open(FILE,{won:true});await page.waitForTimeout(1300);await page.evaluate(()=>{Object.keys(CLASSES).forEach(k=>{PROG.stakes.u[k]=6})}); // setup: every Stake open, so each card can be tapped
    await page.locator('#title button.tl-dig').tap();await page.waitForSelector('#overlay:not([hidden]) #dig, #mDig');await page.waitForTimeout(H.GUARD);
    if(await page.locator('#mDig:visible').count()){await page.locator('#mDig').tap();await page.waitForSelector('#overlay:not([hidden]) #dig');await page.waitForTimeout(H.GUARD)}
    const more=page.locator('#more:visible');if(await more.count()){await more.tap();await page.waitForTimeout(400)}
    const read=async s=>{await page.locator('.kitstake .ks').nth(s-1).tap();await page.waitForTimeout(150);return page.evaluate(()=>document.getElementById('ks').textContent)};
    const a4=await read(4),a6=await read(6);assert(/Targets \+5%\./.test(a4),a4);assert(/Targets \+15%, the knucklebone is off/.test(a6),a6);
    await page.evaluate(()=>{const a=SKILL.stakeT;a[1]=1.05;a[3]=1.2;a[4]=1;a[5]=0.9}); // what a remote config does: the numbers are changed in place
    const b2=await read(2),b4=await read(4),b5=await read(5),b6=await read(6);
    assert(/tremor\)\. Targets \+5%\./.test(b2),b2);assert(/Targets \+20%\./.test(b4)&&!/\+5%/.test(b4),b4);assert(!/Targets/.test(b5),b5);assert(/Targets 10% lower, the knucklebone is off/.test(b6),b6);
    await page.evaluate(()=>{SKILL.stakeT[5]=1});const c6=await read(6);assert(/Costs\s*The knucklebone is off, and a fourth chamber is mandatory\./.test(c6),c6);
    const tg=await page.evaluate(()=>{PROG.sel={tomb:1,stake:4,tool:'standard'};return 0});
    const led=await page.evaluate(()=>UNLOCKS.filter(u=>u.kind==='stake').map(u=>u.line));assert(/Targets \+20%\./.test(led[3]),'the Ledger line follows too: '+led[3]);
    assert.strictEqual(errors.length,0,errors.join('\n'));await ctx.close();return 'stake 2 +5% | stake 4 +20% | stake 5 none | stake 6 10% lower, then none'});
  await T('3c. the target on the wall and the Stake card agree after a change',async()=>{const {page,errors,ctx}=await H.open(FILE,{won:true});await page.waitForTimeout(500);
    await page.evaluate(()=>{SKILL.stakeT[3]=1;PROG.stakes.u.scholar=6});await H.startSeeded(page,'FX-S',{stake:4});await page.waitForTimeout(300);const base=await page.evaluate(()=>TARGETS[0]);
    await page.evaluate(()=>{SKILL.stakeT[3]=1.2});await H.startSeeded(page,'FX-S',{stake:4});await page.waitForTimeout(300);
    const r=await page.evaluate(base=>({t:TARGETS[0],base,rule:STAKES[3].rule,shown:document.getElementById('target').textContent}),base);
    assert(/Targets \+20%\./.test(r.rule));assert(Math.abs(r.t/r.base-1.2)<.02,JSON.stringify(r));assert.strictEqual(+String(r.shown).replace(/\D/g,''),r.t);assert.strictEqual(errors.length,0,errors.join('\n'));await ctx.close();return 'chamber 1 asks '+r.t+' ('+r.base+' x 1.2)'});
  for(const free of [0,2,3])await T('3d. bare-wall lines with SKILL.bare.free = '+free,async()=>{const {page,errors,ctx}=await fresh(FILE,'BARE-A',{init:USED});
    await page.evaluate(n=>{SKILL.bare.free=n},free);const seen=[];
    for(let k=1;k<=free+1;k++){const r=await goBare(page);const paid=k>free;seen.push(r.h2);
      assert.strictEqual(r.bare,paid?2:1,'wall '+k+' is '+(paid?'charged':'free'));assert.strictEqual(r.lives,paid?2:3);
      if(free===0){assert(/It comes down, and a bare wall costs a Memory\./.test(r.log),r.log);assert(/a bare wall costs a Memory/.test(r.h2)&&!/second|first/.test(r.h2),r.h2);assert(!/once a chamber|costs nothing/.test(r.log+r.h2+r.toast),'nothing promises a free one')}
      else if(!paid){const W=free===2?'two':'three';assert(new RegExp('The first '+W+' bare walls of a chamber cost nothing; the next one costs a Memory\\.').test(r.log),r.log);assert(new RegExp('the first '+W+' bare walls of a chamber cost nothing').test(r.h2),r.h2);
        if(k===1)assert(new RegExp('A bare wall costs nothing '+(free===2?'twice':'three times')+' a chamber\\. The next one costs a Memory\\.').test(r.toast),r.toast);assert(!/once a chamber/.test(r.log+r.toast+r.h2))}
      else{const W=free===2?'two':'three',O=free===2?'third':'fourth';assert(new RegExp('This chamber has had its '+W+' free bare walls, so this one costs a Memory\\.').test(r.log),r.log);assert(new RegExp('a '+O+' bare wall costs a Memory').test(r.h2),r.h2)}
      if(k<=free)await next(page)}
    const how=await page.evaluate(()=>HOW.find(c=>/Memories and walking away/.test(c.h)).t);
    assert(free===0?/comes down and costs a Memory\.$/.test(how):new RegExp('comes down free '+(free===2?'twice':'three times')+' a chamber\\. The next bare wall costs a Memory\\.$').test(how),how);
    assert.strictEqual(errors.length,0,errors.join('\n'));await ctx.close();return seen.map(s=>s.replace(/^.*· /,'')).join(' | ')});
  await T('3e. the "no dirt left" line follows the number too',async()=>{const {page,errors,ctx}=await fresh(FILE,'BARE-A',{init:USED});
    await page.evaluate(()=>{SKILL.bare.free=0});const c=await almostBare(page);await tapCell(page,c[0],c[1]);await page.waitForTimeout(250);const log=await page.evaluate(()=>document.getElementById('log').textContent);
    assert(/No dirt is left on this wall\..* An empty wall costs a Memory\./.test(log),log);assert(!/has had its free bare wall/.test(log));assert.strictEqual(errors.length,0,errors.join('\n'));await ctx.close();return 'An empty wall costs a Memory.'});

  // ---------------------------------------------------------------- 4. no seal slip with the Looter's Sack
  const chest=async(file,sack)=>{const {page,errors,ctx}=await fresh(file,'BARE-D',{init:USED});
    if(sack)await page.evaluate(()=>{gear=GEAR.find(g=>g.id==='sack');ui()}); // setup: the run carries the Sack
    const c=await almostBare(page);await page.evaluate(()=>{state.bankedThisChamber=TARGETS[0]-1;ui()});await tapCell(page,c[0],c[1]);
    await page.evaluate(()=>{Q.speed=4});await page.locator('#seal').tap();await page.waitForFunction(()=>!document.getElementById('overlay').hidden,null,{timeout:20000});await page.waitForTimeout(300);
    const r=await page.evaluate(()=>({t:document.getElementById('card').textContent,slip:document.querySelectorAll('#card [data-gg-ad="seal"]').length,mem:document.querySelectorAll('#card [data-gg-ad]').length,gear:gear.id}));
    const e=errors.slice();await ctx.close();assert(/CHAMBER CLEARED/.test(r.t),r.t.slice(0,80));assert.strictEqual(e.length,0,e.join('\n'));return r};
  await T('4a. chamber cleared with the Looter\'s Sack: the chest card has no seal slip in it',async()=>{const r=await chest(FILE,true);assert.strictEqual(r.gear,'sack');assert.strictEqual(r.slip,0);assert.strictEqual(r.mem,0);return 'slips on the card: 0'});
  await T('4b. without the Sack the slip is still written into the card',async()=>{const r=await chest(FILE,false);assert.strictEqual(r.slip,1);return 'slips on the card: 1'});
  await T('4c. rc10 wrote the slip for a Sack carrier (so 4a can tell the difference)',async()=>{const r=await chest(H.RC10,true);assert.strictEqual(r.slip,1);return 'rc10: 1'});

  console.log('\n| Check | Result | Note |\n|---|---|---|');rows.forEach(r=>console.log('| '+r.join(' | ')+' |'));
  console.log(fail?'FIXES FAIL: '+fail+' of '+rows.length:'FIXES PASS: '+rows.length+' of '+rows.length);await H.close();process.exit(fail?1:0)})().catch(e=>{console.error(e);process.exit(1)});
