// Resume. (1) The app is closed and relaunched (H.relaunch: pagehide fired, storage carried into a new browser context) at each step of a reading: before any tap, after Heat, after the crack, and with the finds tag up.
// The resumed run must end in exactly the state a run that finished the reading normally ends in: same result, same bank, crack, Memories, pouch,
// finds and seeded-generator state. No re-roll, no dodge, paid once. Sarcophagus and second bone. (2) Resume mid-dig restores the same wall, crack and bank.
const H=require('./h.cjs');const assert=require('assert');
const snap=page=>page.evaluate(()=>({i:state.i,banked:run.banked,ch:chBank(),crack:Math.round(state.crack*100)/100,lives:run.lives,pouch:run.pouch.slice(),rs:rngState>>>0,
  finds:state.finds.map(f=>[f.name,f.banked?1:0,f.sarc?1:0,f.relic?1:0,f.worth]),dirt:JSON.stringify(state.dirt),relics:(RS().relics||[]).slice(),sarcPend:state.sarcPend||null,jpPend:state.jpPend||null,fev:RS().fev|0,owed:RS().jpOwed|0}));
async function closeCards(page){for(let k=0;k<6;k++){const b=page.locator('#overlay:not([hidden]) button:visible').first();if(await b.count()){await page.waitForTimeout(H.GUARD);await b.tap().catch(()=>{});await page.waitForTimeout(500)}else break}}
async function setup(seed,mode){
  const o=await H.open(FILE);const {page}=o;await page.waitForTimeout(400);
  if(mode==='sarc')seed=await H.sarcSeed(page,seed+'-');else await H.startSeeded(page,seed);await page.waitForTimeout(500);
  await page.evaluate(()=>{try{luckSlipHide()}catch(e){}});
  if(mode==='fever'){await page.evaluate(()=>{RS().fev=LUCK.jackpot.at-1;luckFever()});await page.waitForSelector('#lkp.bn-fev',{timeout:8000})}
  else{assert(await H.tapSarc(page))}
  await page.waitForTimeout(750);return o;
}
const FILE=process.argv[2]||H.BUILD;
async function resume(o){const n=await H.relaunch(o,FILE);await H.resumeFromTitle(n.page).catch(async e=>{console.log('RESUME DID NOT HAPPEN',JSON.stringify(await n.page.evaluate(()=>({card:(document.querySelector('#card h2')||{}).textContent,rec:(localStorage.getItem('rw_resume')||'').length}))),n.errors);throw e});return n}
(async()=>{let fail=0;const rows=[];
  for(const mode of ['sarc','fever'])for(const seed of (mode==='sarc'?['RES-11','RES-12','RES-15','RES-19']:['RES-21','RES-22','RES-23'])){
    // control: finish the reading with three real taps and a fourth to close
    const c=await setup(seed,mode);const saved=await c.page.evaluate(()=>{const w=JSON.parse(localStorage.getItem('rw_resume')).w;return w.sarcPend?{r:w.sarcPend.r,key:LK_KINDS.find(k=>w.sarcPend.r<k[0])[1]}:{key:w.jpPend.k}});
    await H.boneStep(c.page,700);await H.boneStep(c.page,800);await H.boneStep(c.page,1800);await c.page.locator('#bngo').tap();await c.page.waitForFunction(()=>!LK.busy);await c.page.waitForTimeout(500);await closeCards(c.page);
    const want=await snap(c.page);await c.ctx.close();
    for(let step=0;step<=3;step++){
      process.stdout.write('['+mode+' '+seed+' step '+step+'] ');const o=await setup(seed,mode);for(let k=0;k<step;k++)await H.boneStep(o.page,k===2?1800:750);
      const pre=await o.page.evaluate(()=>{const w=JSON.parse(localStorage.getItem('rw_resume')).w;return{sarc:w.sarcPend,jp:w.jpPend}});
      const e0=o.errors.slice();let q=await resume(o);await closeCards(q.page);
      const got=await snap(q.page);
      const same=JSON.stringify(got)===JSON.stringify(want),paid=!got.sarcPend&&!got.jpPend&&!await q.page.evaluate(()=>!!document.getElementById('lkp'));
      const errs=e0.concat(q.errors.slice());
      rows.push({mode,seed,result:saved.key,closedAt:['before any tap','after Heat','after the crack','tag showing'][step],sameAsFinished:same,paidOnce:paid,errors:errs.length});
      if(!same||!paid||errs.length){fail++;console.log('RESUME MISMATCH',mode,seed,step,'\n want',JSON.stringify(want).slice(0,400),'\n got ',JSON.stringify(got).slice(0,400),'\n pre',JSON.stringify(pre),errs)}
      // a second reload must not pay it again
      if(step===1){await q.page.waitForTimeout(700);q=await resume(q);await closeCards(q.page);const again=await snap(q.page);if(JSON.stringify(again)!==JSON.stringify(want)){fail++;console.log('SECOND RELAUNCH CHANGED STATE',mode,seed,'\n want',JSON.stringify(want).slice(0,300),'\n got ',JSON.stringify(again).slice(0,300))}}
      await q.ctx.close();
    }
  }
  console.table(rows);
  // (2) mid-dig
  for(const seed of ['DIG-1','DIG-2','DIG-3']){
    const o=await H.open(process.argv[2]||H.BUILD);const {page}=o;await page.waitForTimeout(400);await H.startSeeded(page,seed);await page.waitForTimeout(500);
    await page.locator('#pick').tap();
    const cells=await page.evaluate(()=>state.finds.filter(f=>!f.sarc&&!f.relic).slice(0,2).flatMap(f=>f.cells));
    for(const [x,y] of cells)for(let g=0;g<4;g++){if(!await page.evaluate(([x,y])=>state.dirt[y][x],[x,y]))break;const p=await H.cellXY(page,x,y);await H.tapXY(page,p.x,p.y);await page.waitForTimeout(80)}
    await page.evaluate(()=>{Q.speed=4});await page.locator('#seal').tap();await page.waitForFunction(()=>!state.sealing&&!Q.busy,null,{timeout:15000});await page.waitForTimeout(500);
    {const no=page.locator('#lkno');if(await no.count()){await page.waitForTimeout(1300);await no.tap()}}await closeCards(page);
    await page.locator('#hammer').tap();const p=await H.cellXY(page,1,8);await H.tapXY(page,p.x,p.y);await page.waitForTimeout(900); // one more strike after the seal, then the save's 600 ms debounce
    const want=await snap(page);const q=await resume(o);const got=await snap(q.page);
    const same=JSON.stringify(got)===JSON.stringify(want);console.log('mid-dig',seed,same?'same wall, crack and bank':'DIFFERENT',{banked:got.banked,crack:got.crack,rs:got.rs});
    if(!same){fail++;console.log(JSON.stringify(want).slice(0,300),'\n',JSON.stringify(got).slice(0,300))}
    const errs=o.errors.concat(q.errors).slice();if(errs.length){fail++;console.log(errs)}
    await q.ctx.close();
  }
  console.log(fail?'RESUME FAIL':'RESUME PASS: '+rows.length+' reloads mid-reading + 3 mid-dig, every one ends in the same state as the uninterrupted run');await H.close();process.exit(fail?1:0)})().catch(e=>{console.error(e);process.exit(1)});
