// The bare-wall rule (owner ruling 5): one free bare-wall exit per chamber, then it costs a Memory. node bare.cjs [build]
// Setup is written directly (every find but one is put away and the dirt is cleared, so a wall needs two taps, not two hundred).
// The last uncovering and the seal that empties the wall are real touchscreen taps, and so is every card button.
const H=require('./h.cjs');const assert=require('assert');const path=require('path');
const FILE=process.argv[2]||H.BUILD;
const rows=[];let fail=0;
const T=async(name,fn)=>{try{const note=await fn();rows.push([name,'PASS',note||'']);console.log('PASS',name,note||'')}catch(e){fail++;rows.push([name,'FAIL',String(e.message).slice(0,300)]);console.log('FAIL',name,e.stack||e)}};
const USED=`try{localStorage.setItem('rw_mercy','2');localStorage.setItem('rw_first','1')}catch(e){}`; // a seasoned profile: its two free collapses are spent
// leave one ordinary find one tile from open and nothing else on the wall
const almostBare=page=>page.evaluate(()=>{try{luckSlipHide()}catch(e){}const k=state.finds.find(f=>!f.sarc&&!f.relic&&!f.banked);
  state.finds.forEach(f=>{if(f!==k)f.banked=true});for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++)state.dirt[y][x]=0;state.ores.forEach(o=>o.taken=true);
  state.dirt[k.cells[0][1]][k.cells[0][0]]=1;ui();draw();return k.cells[0]});
const info=page=>page.evaluate(()=>({i:state.i,lives:run.lives,bx:JSON.stringify(run.bx||{}),ch:chBank(),bare:state.bare|0,over:!!state.over,ov:!document.getElementById('overlay').hidden,
  h2:(document.querySelector('#card h2')||{}).textContent||'',toast:(document.getElementById('uitoast')||{}).textContent||'',toastUp:!!document.getElementById('uitoast')&&!document.getElementById('uitoast').hidden,log:document.getElementById('log').textContent}));
// uncover the last find (tap), seal it (tap): the wall is bare and comes down. Returns what was on screen while it fell and after.
async function goBare(page){
  const c=await almostBare(page);await page.locator('#pick').tap();const p=await H.cellXY(page,c[0],c[1]);await H.clearWay(page,p);await H.tapXY(page,p.x,p.y);await page.waitForTimeout(150);
  assert.strictEqual(await page.evaluate(()=>exposedFinds().length),1,'one loose find, no dirt');
  const before=await info(page);
  await page.evaluate(()=>{Q.speed=4});await page.locator('#seal').tap();
  await page.waitForFunction(()=>state.bare>0,null,{timeout:15000});const mid=await info(page);
  await page.waitForFunction(()=>!document.getElementById('overlay').hidden,null,{timeout:15000});await page.waitForTimeout(300);
  return{before,mid,after:await info(page)}}
const next=async page=>{await page.waitForTimeout(H.GUARD+200);await page.locator('#card #go').tap();await page.waitForFunction(()=>document.getElementById('overlay').hidden&&state&&!state.over,null,{timeout:8000});await page.waitForTimeout(500)};
(async()=>{
  let o=null;
  await T('first bare wall of a chamber costs nothing, and says so',async()=>{o=await H.open(FILE,{init:USED});await o.page.waitForTimeout(500);await H.startSeeded(o.page,'BARE-A');await o.page.waitForTimeout(400);
    const r=await goBare(o.page);
    assert.strictEqual(r.after.lives,3,'no Memory lost');assert.strictEqual(r.after.bx,'{"0":1}');assert.strictEqual(r.mid.bare,1);
    assert(/The wall was bare/.test(r.after.h2)&&/first bare wall of a chamber costs nothing/.test(r.after.h2),r.after.h2);
    assert(/A bare wall costs nothing once a chamber\. The next one costs a Memory\./.test(r.mid.toast)&&r.mid.toastUp,'coaching line: '+r.mid.toast);
    assert(r.after.ch>0,'the sealed find stays banked in the chamber');return 'Memories 3, card: '+r.after.h2.replace(/\s+/g,' ').slice(0,90)});
  await T('the count is saved: app closed and reopened on the next wall',async()=>{await next(o.page);const a=await info(o.page);assert.strictEqual(a.i,0);
    await o.page.evaluate(()=>{state.dirt[0][0]=Math.max(1,state.dirt[0][0]);ui()});await o.page.waitForTimeout(800);
    const n=await H.relaunch(o,FILE,{init:USED});await H.resumeFromTitle(n.page);o=n;const b=await info(o.page);
    assert.strictEqual(b.bx,'{"0":1}','run.bx after resume: '+b.bx);assert.strictEqual(b.i,0);assert.strictEqual(b.ch,a.ch);return 'run.bx '+b.bx+' after relaunch'});
  await T('second bare wall of the same chamber costs a Memory',async()=>{const r=await goBare(o.page);
    assert.strictEqual(r.after.lives,2,'one Memory lost: '+r.after.lives);assert.strictEqual(r.mid.bare,2);assert.strictEqual(r.after.bx,'{"0":2}');
    assert(/second bare wall costs a Memory/.test(r.after.h2),r.after.h2);assert(/has had its free bare wall, so this one costs a Memory/.test(r.mid.log),r.mid.log);
    return 'Memories 3 to 2, card: '+r.after.h2.replace(/\s+/g,' ').slice(0,90)});
  await T('the wall before it says what an empty wall will cost',async()=>{await next(o.page);const c=await almostBare(o.page);await o.page.locator('#pick').tap();const p=await H.cellXY(o.page,c[0],c[1]);await H.clearWay(o.page,p);await H.tapXY(o.page,p.x,p.y);await o.page.waitForTimeout(200);
    const log=await o.page.evaluate(()=>document.getElementById('log').textContent);assert(/No dirt is left on this wall/.test(log)&&/an empty wall now costs a Memory/.test(log),log);return log.slice(-90)});
  await T('a new chamber has its own free bare wall',async()=>{await o.page.evaluate(()=>{document.getElementById('overlay').hidden=true;newChamber(1)});await o.page.waitForTimeout(600);const l0=(await info(o.page)).lives;
    const r=await goBare(o.page);assert.strictEqual(r.after.lives,l0,'no Memory lost in chamber 2');assert.strictEqual(JSON.parse(r.after.bx)['1'],1);assert(/first bare wall of a chamber costs nothing/.test(r.after.h2),r.after.h2);
    assert.strictEqual(o.errors.length,0,o.errors.join('\n'));await o.ctx.close();return 'Memories '+l0+' kept'});
  await T('a bare wall that costs the last Memory ends the run',async()=>{const q=await H.open(FILE,{init:USED});await q.page.waitForTimeout(500);await H.startSeeded(q.page,'BARE-B');await q.page.waitForTimeout(400);
    await q.page.evaluate(()=>{run.bx={0:1};run.lives=1;ui()});const c=await almostBare(q.page);await q.page.locator('#pick').tap();const p=await H.cellXY(q.page,c[0],c[1]);await H.tapXY(q.page,p.x,p.y);await q.page.waitForTimeout(150);
    await q.page.evaluate(()=>{Q.speed=4});await q.page.locator('#seal').tap();await q.page.waitForFunction(()=>!document.getElementById('overlay').hidden&&/forgotten you/.test(document.getElementById('card').textContent),null,{timeout:20000});
    const lives=await q.page.evaluate(()=>run.lives);assert.strictEqual(lives,0);assert.strictEqual(q.errors.length,0,q.errors.join('\n'));await q.ctx.close();return 'summary card shown'});
  await T('a new profile: its free collapses cover a second bare wall',async()=>{const q=await H.open(FILE,{});await q.page.waitForTimeout(500);await H.startSeeded(q.page,'BARE-C');await q.page.waitForTimeout(400);
    await goBare(q.page);await next(q.page);const r=await goBare(q.page);assert.strictEqual(r.after.lives,3,'covered by the first free collapse');assert(/on the house/.test(r.after.h2),r.after.h2);
    assert.strictEqual(q.errors.length,0,q.errors.join('\n'));await q.ctx.close();return r.after.h2.replace(/\s+/g,' ').slice(0,90)});
  await T('a seal that clears the chamber on an empty wall is a clear, not a bare wall',async()=>{const q=await H.open(FILE,{init:USED});await q.page.waitForTimeout(500);await H.startSeeded(q.page,'BARE-D');await q.page.waitForTimeout(400);
    const c=await almostBare(q.page);await q.page.evaluate(()=>{state.bankedThisChamber=TARGETS[0]-1;ui()});await q.page.locator('#pick').tap();const p=await H.cellXY(q.page,c[0],c[1]);await H.tapXY(q.page,p.x,p.y);await q.page.waitForTimeout(150);
    await q.page.evaluate(()=>{Q.speed=4});await q.page.locator('#seal').tap();await q.page.waitForFunction(()=>!document.getElementById('overlay').hidden,null,{timeout:20000});
    const r=await q.page.evaluate(()=>({t:document.getElementById('card').textContent,bx:JSON.stringify(run.bx||{}),bare:state.bare|0}));assert(/CHAMBER CLEARED/.test(r.t),r.t.slice(0,80));assert.strictEqual(r.bare,0);assert.strictEqual(r.bx,'{}');
    assert.strictEqual(q.errors.length,0,q.errors.join('\n'));await q.ctx.close();return 'chamber cleared, run.bx '+r.bx});
  console.log('\n| Test | Result | Note |\n|---|---|---|');rows.forEach(r=>console.log('| '+r.join(' | ')+' |'));
  console.log(fail?'BARE FAIL '+fail:'BARE PASS '+rows.length);await H.close();process.exit(fail?1:0)})().catch(e=>{console.error('BARE ERROR',e);process.exit(1)});
