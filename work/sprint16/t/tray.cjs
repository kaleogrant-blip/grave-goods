// Tray rule on the real build, real touchscreen taps for every player action. node tray.cjs [build]
// Setup (which tiles are still covered) is written directly so a test needs ten taps, not two hundred; every uncovering, pick, unpick and seal is a real tap.
const H=require('./h.cjs');const assert=require('assert');const path=require('path');
const FILE=process.argv[2]||H.BUILD,SHOTS=path.join(__dirname,'results','shots');try{require('fs').mkdirSync(SHOTS,{recursive:true})}catch(e){} // working pictures; the owner's set is made by shots.cjs
const rows=[];let fail=0;
const T=async(name,fn)=>{try{const note=await fn();rows.push([name,'PASS',note||'']);console.log('PASS',name,note||'')}catch(e){fail++;rows.push([name,'FAIL',String(e.message).slice(0,300)]);console.log('FAIL',name,e.stack||e)}};
// leave the first n ordinary finds one tile from open; returns [{id,x,y}] of the tile still covered
const almost=(page,n,skip)=>page.evaluate(([n,skip])=>{try{luckSlipHide()}catch(e){}const out=[];let k=0;
  for(const f of state.finds){if(f.sarc||f.banked||f.cells.every(([x,y])=>state.dirt[y][x]===0))continue;if(k++<(skip||0))continue;if(out.length>=n)break;
    f.cells.forEach(([x,y],j)=>{state.dirt[y][x]=j===0?1:0});out.push({id:f.id,x:f.cells[0][0],y:f.cells[0][1]})}
  ui();draw();return out},[n,skip||0]);
const tapCell=async(page,x,y)=>{const p=await H.cellXY(page,x,y);await H.tapXY(page,p.x,p.y);await page.waitForTimeout(70)};
const st=page=>page.evaluate(()=>({ex:exposedFinds().map(f=>f.id),tray:trayList().map(f=>f.id),ord:state.finds.map(f=>f.ord==null?null:f.ord),pick:state.finds.map(f=>f.tray==null?null:f.tray),useq:state.useq|0,
  crack:state.crack,banked:run.banked,ch:chBank(),sealed:state.sealed,lost:state.finds.filter(f=>f.lost).map(f=>f.id),crumb:state.finds.filter(f=>f.crumb).map(f=>f.id),rs:rngState>>>0,
  seal:document.getElementById('seal').textContent,loose:document.getElementById('looseTag').hidden?'':document.getElementById('looseTag').textContent,chip:document.getElementById('sChip').textContent,
  total:+document.getElementById('hTotal').dataset.to,score:score(trayList()).total,log:document.getElementById('log').textContent,dirt:JSON.stringify(state.dirt),worth:state.finds.map(f=>findWorth(f))}));
const fresh=async(seed,o)=>{const r=await H.open(FILE,o||{});await r.page.waitForTimeout(500);await H.startSeeded(r.page,seed);await r.page.waitForTimeout(400);await r.page.locator('#pick').tap();return r};
const sealWait=async page=>{await page.evaluate(()=>{Q.speed=4});await page.locator('#seal').tap();await page.waitForFunction(()=>!state.sealing&&!Q.busy,null,{timeout:15000});await page.waitForTimeout(500);
  for(let k=0;k<3;k++){const no=page.locator('#lkno');if(await no.count()){await page.waitForTimeout(1300);await no.tap();await page.waitForTimeout(400)}}};
(async()=>{
  await T('default tray: the six worth most of eight',async()=>{const {page,errors,ctx}=await fresh('TRAY-A');
    const c=await almost(page,8);for(const q of c)await tapCell(page,q.x,q.y);const s=await st(page);
    assert.strictEqual(s.ex.length,8);assert.strictEqual(s.tray.length,6);
    const byW=s.ex.slice().sort((a,b)=>s.worth[b]-s.worth[a]||s.ord[a]-s.ord[b]).slice(0,6).sort((a,b)=>a-b);assert.deepStrictEqual(s.tray.slice().sort((a,b)=>a-b),byW,'six highest Worth');
    assert(/Tray 6\/6/.test(s.seal),'Seal button says Tray 6/6: '+s.seal);assert(/Loose 8\/9/.test(s.loose),'wall tag: '+s.loose);assert(/Loose 8\/9/.test(s.chip),'strip chip: '+s.chip);
    assert.strictEqual(s.total,s.score,'the panel prices the tray');assert.deepStrictEqual(s.ord.filter(v=>v!=null).slice().sort((a,b)=>a-b),[1,2,3,4,5,6,7,8],'ages 1..8');
    assert.strictEqual(errors.length,0,errors.join('\n'));await ctx.close();return 'tray '+JSON.stringify(s.tray)+' of '+JSON.stringify(s.ex)});

  await T('pick and unpick by tapping finds; a tap on a find never digs',async()=>{const {page,errors,ctx}=await fresh('TRAY-B');
    const c=await almost(page,8);for(const q of c)await tapCell(page,q.x,q.y);const a=await st(page);
    const on=a.tray[0],off=a.ex.filter(i=>a.tray.indexOf(i)<0);const cellOf=id=>page.evaluate(id=>state.finds[id].cells[state.finds[id].cells.length-1],id);
    let q=await cellOf(on);await tapCell(page,q[0],q[1]);const b=await st(page);
    assert.strictEqual(b.pick[on],0,'tapped find is off');assert(b.tray.indexOf(on)<0);assert.strictEqual(b.tray.length,6,'the next most valuable took its place');
    assert.strictEqual(b.crack,a.crack,'no crack');assert.strictEqual(b.dirt,a.dirt,'no dirt moved');assert(/left on the wall/.test(b.log),b.log);
    // take the two that are now off... put the first one back on: it must come on, and an unpicked one drops
    q=await cellOf(on);await tapCell(page,q[0],q[1]);const c2=await st(page);assert.strictEqual(c2.pick[on],1);assert(c2.tray.indexOf(on)>=0,'back on');assert.strictEqual(c2.tray.length,6);assert(/goes on the tray/.test(c2.log),c2.log);
    // hammer selected: a tap on a loose find still only moves it (never a 3x3 dig)
    await page.locator('#hammer').tap();q=await cellOf(off[0]);await tapCell(page,q[0],q[1]);const d=await st(page);
    assert.strictEqual(d.crack,a.crack,'hammer tap on a find: no crack');assert.strictEqual(d.dirt,a.dirt,'hammer tap on a find: no dirt moved');assert.notStrictEqual(d.pick[off[0]],null);
    // fill the tray by hand, then a seventh is refused
    await page.locator('#pick').tap();
    for(let k=0;k<12;k++){const s=await st(page);const cand=s.ex.find(i=>s.pick[i]!==1);if(s.ex.filter(i=>s.pick[i]===1).length>=6||cand==null)break;if(s.tray.indexOf(cand)>=0){ // on by default: tap off then on makes it a hand pick
        q=await cellOf(cand);await tapCell(page,q[0],q[1])}q=await cellOf(cand);await tapCell(page,q[0],q[1])}
    const e=await st(page);assert.strictEqual(e.ex.filter(i=>e.pick[i]===1).length,6,'six hand picks');const left=e.ex.filter(i=>e.pick[i]!==1);
    q=await cellOf(left[0]);await tapCell(page,q[0],q[1]);const f=await st(page);assert(/tray is full/i.test(f.log),f.log);assert.strictEqual(f.tray.length,6);assert(f.tray.indexOf(left[0])<0);
    assert.strictEqual(errors.length,0,errors.join('\n'));await page.screenshot({path:path.join(SHOTS,'tray-pick-390.png')});await ctx.close();return 'on/off/on, hammer tap safe, seventh refused'});

  await T('seal takes exactly the tray; the rest stay loose; picks reset',async()=>{const {page,errors,ctx}=await fresh('TRAY-C');
    const c=await almost(page,8);for(const q of c)await tapCell(page,q.x,q.y);let a=await st(page);
    const off=a.ex.filter(i=>a.tray.indexOf(i)<0)[0];const q=await page.evaluate(id=>state.finds[id].cells[0],off);await tapCell(page,q[0],q[1]);a=await st(page);assert(a.tray.indexOf(off)>=0,'chosen find is on');
    const want=a.tray.slice(),tot=a.score,b0=a.banked;await sealWait(page);const b=await st(page);
    const banked=await page.evaluate(ids=>ids.map(i=>!!state.finds[i].banked&&!state.finds[i].lost),want);assert(banked.every(Boolean),'all six banked');
    assert.strictEqual(b.ex.length,2,'two stay loose');assert.deepStrictEqual(b.ex.slice().sort(),a.ex.filter(i=>want.indexOf(i)<0).sort());
    assert(b.pick.every(v=>v==null),'picks cleared');assert.strictEqual(b.sealed,1);
    const coin=await page.evaluate(()=>RS().coinLost|0);assert(b.banked===b0+tot||coin,'bank rose by the tray total: '+b0+'+'+tot+' -> '+b.banked);
    assert(/Tray 2\/6/.test(b.seal),b.seal);assert.strictEqual(errors.length,0,errors.join('\n'));await ctx.close();return 'banked '+tot+' for '+want.length+' finds'});

  for(const rm of [false,true])await T('tenth find: the oldest crumbles, state and screen agree'+(rm?' (Reduce Motion)':''),async()=>{const {page,errors,ctx}=await fresh('TRAY-D',{rm});
    const c=await almost(page,10);for(const q of c.slice(0,9))await tapCell(page,q.x,q.y);const a=await st(page);
    assert.strictEqual(a.ex.length,9);assert(/Loose 9\/9/.test(a.loose),a.loose);assert.strictEqual(a.lost.length,0);
    const oldest=a.ex.slice().sort((x,y)=>a.ord[x]-a.ord[y])[0];assert.strictEqual(oldest,c[0].id,'the first one tapped is the oldest');
    assert.strictEqual(await page.evaluate(()=>trayOldest().id),oldest,'the cracked one is the oldest');
    if(!rm)await page.screenshot({path:path.join(SHOTS,'nine-loose-390.png')});
    const px=async()=>page.evaluate(id=>{const f=state.finds[id],cv=document.getElementById('c'),g=cv.getContext('2d'),k=cv.width/cv.getBoundingClientRect().width;let sum=0,n=0;
      f.cells.forEach(([x,y])=>{const d=g.getImageData(Math.round((x+.25)*cell*k),Math.round((y+TOP+.25)*cell*k),Math.max(1,Math.round(cell*k*.5)),Math.max(1,Math.round(cell*k*.5))).data;for(let i=0;i<d.length;i+=4){sum+=d[i]+d[i+1]+d[i+2];n++}});return sum/n},oldest);
    const lum0=await px();
    await tapCell(page,c[9].x,c[9].y);const mid=await st(page);
    assert.deepStrictEqual(mid.lost,[oldest],'exactly the oldest is gone');assert.deepStrictEqual(mid.crumb,[oldest]);assert.strictEqual(mid.ex.length,9,'nine remain');assert(mid.ex.indexOf(c[9].id)>=0,'the tenth is there');assert(mid.ex.indexOf(oldest)<0);
    assert(/Crumbled: /.test(mid.log),mid.log);const toast=await page.evaluate(()=>{const e=document.getElementById('uitoast');return e&&!e.hidden?e.textContent:''});assert(/crumbled/.test(toast),'first-time toast: '+toast);
    const anim=await page.evaluate(()=>(state.crumbs||[]).length);assert.strictEqual(anim,1,'crumble effect running');
    await page.waitForTimeout(rm?330:300);await page.screenshot({path:path.join(SHOTS,rm?'crumble-rm-390.png':'crumble-390.png')});
    const shake=await page.evaluate(()=>typeof shakeAmt==='number'?shakeAmt:0);if(rm)assert.strictEqual(shake,0,'Reduce Motion: no shake');
    await page.waitForTimeout(1300);assert.strictEqual(await page.evaluate(()=>(state.crumbs||[]).length),0,'effect over');
    const lum1=await px();assert(lum1<lum0*.5&&lum1<120,'the crumbled find is drawn as a dark hole: '+lum0.toFixed(0)+' -> '+lum1.toFixed(0));
    await page.screenshot({path:path.join(SHOTS,rm?'crumble-after-rm-390.png':'crumble-after-390.png')});
    assert.strictEqual(errors.length,0,errors.join('\n'));await ctx.close();return 'find '+oldest+' gone, pixels '+lum0.toFixed(0)+' -> '+lum1.toFixed(0)});

  await T('several in one strike: the lowest Worth counts as oldest; a sarcophagus does not count',async()=>{const {page,errors,ctx}=await fresh('TRAY-E');
    // two finds finished by one hammer strike: both get stamped in the same tick
    const r=await page.evaluate(()=>{try{luckSlipHide()}catch(e){}const fs=state.finds.filter(f=>!f.sarc);let best=null;
      for(const a of fs)for(const b of fs){if(a.id>=b.id||findWorth(a)===findWorth(b))continue;for(const ca of a.cells)for(const cb of b.cells){if(Math.abs(ca[0]-cb[0])<=2&&Math.abs(ca[1]-cb[1])<=2&&!best){const cx=Math.round((ca[0]+cb[0])/2),cy=Math.round((ca[1]+cb[1])/2);
        if(Math.abs(ca[0]-cx)<=1&&Math.abs(ca[1]-cy)<=1&&Math.abs(cb[0]-cx)<=1&&Math.abs(cb[1]-cy)<=1&&state.owner[cy][cx]!==a.id&&state.owner[cy][cx]!==b.id)best={a:a.id,b:b.id,ca,cb,cx,cy}}}}
      if(!best)return null;for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++)state.dirt[y][x]=0;state.finds.forEach(f=>{if(f.id!==best.a&&f.id!==best.b)f.cells.forEach(([x,y])=>state.dirt[y][x]=3)});
      state.dirt[best.ca[1]][best.ca[0]]=1;state.dirt[best.cb[1]][best.cb[0]]=1;if(state.dirt[best.cy][best.cx]===0)state.dirt[best.cy][best.cx]=1;ui();draw();return best});
    if(!r)return 'SKIPPED: no adjacent pair on this seed';
    await page.locator('#hammer').tap();await tapCell(page,r.cx,r.cy);const s=await st(page);
    assert(s.ex.indexOf(r.a)>=0&&s.ex.indexOf(r.b)>=0,'both uncovered by one strike');const lo=s.worth[r.a]<s.worth[r.b]?r.a:r.b,hi=lo===r.a?r.b:r.a;assert(s.ord[lo]<s.ord[hi],'lower Worth is older: '+s.ord[lo]+' < '+s.ord[hi]);
    const sc=await page.evaluate(()=>{const f=state.finds.find(f=>f.sarc);if(!f)return null;f.cells.forEach(([x,y])=>state.dirt[y][x]=0);ui();return{ex:exposedFinds().some(q=>q.sarc),ord:f.ord==null}});
    if(sc){assert(!sc.ex&&sc.ord,'a sarcophagus is not a loose find')}
    assert.strictEqual(errors.length,0,errors.join('\n'));await ctx.close();return 'ord '+s.ord[lo]+' (worth '+s.worth[lo]+') before '+s.ord[hi]+' (worth '+s.worth[hi]+')'+(sc?'; sarcophagus not counted':'; no sarcophagus on this wall')});

  await T('resume mid-pick: tray picks and find ages come back exactly',async()=>{let o=await fresh('TRAY-F');let page=o.page;
    const c=await almost(page,9);for(const q of c)await tapCell(page,q.x,q.y);let a=await st(page);
    const cellOf=id=>page.evaluate(id=>state.finds[id].cells[0],id);
    let q=await cellOf(a.tray[1]);await tapCell(page,q[0],q[1]);a=await st(page);const off=a.ex.filter(i=>a.tray.indexOf(i)<0&&a.pick[i]==null)[0];q=await cellOf(off);await tapCell(page,q[0],q[1]);
    const want=await st(page);assert(want.pick.filter(v=>v===0).length===1&&want.pick.filter(v=>v===1).length===1,'one off, one on by hand');
    const e0=o.errors.slice();o=await H.relaunch(o,FILE);page=o.page;await H.resumeFromTitle(page);const got=await st(page);
    for(const k of ['ex','tray','ord','pick','useq','crack','banked','ch','dirt','rs','score'])assert.deepStrictEqual(got[k],want[k],'after resume: '+k);
    assert(/Tray 6\/6/.test(got.seal)&&/Loose 9\/9/.test(got.loose),got.seal+' | '+got.loose);
    // and the rule carries on from the restored ages: a tenth find takes the same oldest
    const oldest=want.ex.slice().sort((x,y)=>want.ord[x]-want.ord[y])[0];const d=await almost(page,1);await page.locator('#pick').tap();await tapCell(page,d[0].x,d[0].y);const after=await st(page);
    assert.deepStrictEqual(after.lost,[oldest],'after resume the oldest is still the oldest');
    assert.strictEqual(e0.length+o.errors.length,0,e0.concat(o.errors).join('\n'));await o.ctx.close();return 'picks '+JSON.stringify(want.pick.map((v,i)=>v==null?null:i+':'+v).filter(Boolean))+', ages kept, crumble after resume took find '+oldest});

  await T('seeded determinism: same seed and same taps give the same result, twice',async()=>{const run1=async()=>{const {page,errors,ctx}=await fresh('TRAY-G');
      const c=await almost(page,10);for(const q of c.slice(0,7))await tapCell(page,q.x,q.y);let s=await st(page);const q=await page.evaluate(id=>state.finds[id].cells[0],s.tray[2]);await tapCell(page,q[0],q[1]);
      for(const z of c.slice(7))await tapCell(page,z.x,z.y);
      // some honest digging too
      const cells=await page.evaluate(()=>{const o=[];for(let y=0;y<ROWS&&o.length<10;y++)for(let x=0;x<COLS&&o.length<10;x++)if(state.dirt[y][x]>0)o.push([x,y]);return o});for(const [x,y] of cells)await tapCell(page,x,y);
      await sealWait(page);s=await st(page);const sig=JSON.stringify([s.ex,s.tray,s.ord,s.lost,s.crack,s.banked,s.ch,s.rs,s.dirt,await H.wallSig(page)]);assert.strictEqual(errors.length,0,errors.join('\n'));await ctx.close();return{sig,s}};
    const a=await run1(),b=await run1();assert.strictEqual(a.sig,b.sig,'two runs differ');return 'banked '+a.s.banked+', crack '+a.s.crack+', rng '+a.s.rs+' both times'});

  await T('Hoard is a full tray; numbers are x3; caps are off; version and tag',async()=>{const {page,errors,ctx}=await fresh('TRAY-H');
    const r=await page.evaluate(()=>{const fs=state.finds.filter(f=>!f.sarc).slice(0,7);const s6=score(fs.slice(0,6)),s5=score(fs.slice(0,5));
      return{h6:s6.notes.some(n=>/^Hoard 6/.test(n)),h5:s5.notes.some(n=>/^Hoard/.test(n)),hm:hoardMin(),t:[SKILL.targets[0],SKILL.ch2T1,SKILL.targets[2]],cap:[SKILL.cap.fame,SKILL.cap.reward],ver:GAME_VERSION,tag:document.getElementById('trayTag').textContent,
        tagVis:(()=>{const b=document.getElementById('trayTag').getBoundingClientRect();return b.width>40&&b.top>=0&&b.bottom<=innerHeight})(),w3:state.finds.every(f=>findWorth(f)%3===0),credit:skillCredit(1e7),
        keys:Object.keys(localStorage).filter(k=>!/^S15T_/.test(k)&&!/^__/.test(k)&&k!=='rw_train')}});
    assert(r.h6&&!r.h5&&r.hm===6,'Hoard at six, not five');assert.deepStrictEqual(r.t,[900,1200,9000]);assert.deepStrictEqual(r.cap,[null,null].map(()=>Infinity));assert.strictEqual(r.ver,'v1.0-tray1');assert(/TRAY TEST/.test(r.tag)&&r.tagVis,'tag on screen');
    assert(r.w3,'every Worth is a multiple of 3');assert.strictEqual(r.credit,1e7,'payout cap off');assert.deepStrictEqual(r.keys,[],'no key outside S15T_: '+r.keys);
    assert.strictEqual(errors.length,0,errors.join('\n'));await ctx.close();return 'targets '+r.t.join('/')+', Hoard 6, '+r.tag});

  console.log('\n| Test | Result | Note |\n|---|---|---|');rows.forEach(r=>console.log('| '+r.join(' | ')+' |'));
  console.log(fail?'TRAY FAIL '+fail:'TRAY PASS '+rows.length);await H.close();process.exit(fail?1:0)})().catch(e=>{console.error('TRAY ERROR',e);process.exit(1)});
