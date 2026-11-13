// Same seed, same everything: drives rc9a.html and build.html with the same scripted play and compares, per seed,
//  - the wall layout of chambers 1 to 3 (dirt, finds, ores, tell, target),
//  - the full luck log (every seeded roll: tells, red-line rolls, sarcophagus results, the fourth-Fever result) and
//  - the seeded generator's state and the bank at the end of each chamber.
// The play script uses its own little generator (not the game's), so both builds get the same taps.
const H=require('./h.cjs');
const N=+process.argv[2]||20,START=+process.argv[4]||0; // node parity.cjs [seeds] [build] [first seed index]
async function settle(page){ // resolve whatever luck screen or card is up, the same way in both builds; return when the wall is idle
  for(let n=0;n<400;n++){
    const s=await page.evaluate(()=>{
      const ov=document.getElementById('overlay');
      if(state.over)return'over';
      if(LK.panel){
        if(LK.panel.classList.contains('bn')){const g=LK.panel.querySelector('#bngo');if(g&&!g.disabled)g.onclick();return'bone'}
        const no=LK.panel.querySelector('#lkno');if(no&&!LK.panel.querySelector('.lkb').hidden){no.onclick();return'knuckle'}
        return'panel'}
      if(!ov.hidden){const jp=ov.querySelector('#jpgo');if(jp){if(!jp.disabled)jp.onclick();return'wheel'}
        const b=[...ov.querySelectorAll('#go,.chest,button')].find(b=>b.offsetParent&&!b.disabled);if(b){if(typeof b.onclick==='function')b.onclick();else b.dispatchEvent(new MouseEvent('click',{bubbles:true}))}return'card'}
      if(LK.busy||Q.busy||state.sealing||state.clearing||RS().jpOwed)return'busy';
      return'idle'});
    if(s==='idle'||s==='over')return s;
    await page.waitForTimeout(s==='card'?700:25);
  }
  return'stuck';
}
async function play(file,seed){
  const {page,errors,ctx}=await H.open(file);await page.waitForTimeout(300);
  await H.startSeeded(page,seed);
  const rec={seed,walls:[],ends:[],stuck:0};
  for(let i=0;i<3;i++){
    if(i>0)await page.evaluate(i=>{document.getElementById('overlay').hidden=true;try{luckReset()}catch(e){}newChamber(i)},i);
    await page.evaluate(()=>{Q.speed=12;try{luckSlipHide()}catch(e){}});
    rec.walls.push(await H.wallSig(page));
    let s=1+i*977+[...seed].reduce((a,c)=>a*31+c.charCodeAt(0)>>>0,7);const R=()=>(s=(Math.imul(s,1664525)+1013904223)>>>0)/4294967296;
    for(let k=0;k<70;k++){
      const a=[R(),R(),R(),R()];
      const st=await page.evaluate(([a,k])=>{
        if(state.over)return'over';
        const sc=state.finds.find(f=>f.sarc&&!f.banked&&f.cells.every(([x,y])=>state.dirt[y][x]===0));
        if(sc){openSarc(sc);return'sarc'}
        if(k%9===8){luckFever();return'fever'}                                   // counts a full Fever, as strike() does; the fourth one of the run brings the wheel / second bone
        if(k%13===12&&exposedFinds().length>=2&&!state.sealing){seal();return'seal'}
        const cells=[];for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++)if(state.dirt[y][x]>0)cells.push([x,y]);
        if(!cells.length)return'bare';
        const c=cells[Math.floor(a[0]*cells.length)];setTool(a[1]<.7?'pick':'hammer');strike(c[0],c[1]);return'dig'},[a,k]);
      const w=await settle(page);if(w==='stuck'){rec.stuck++;break}
      if(st==='over'||w==='over'||st==='bare')break;
    }
    // a wall that fell or was cleared runs its own ending (dust, tally, card). Let it finish before the next chamber is built, or it would land on the next wall at a moment that depends on the clock.
    if(await page.evaluate(()=>!!state.over)){await page.waitForFunction(()=>!document.getElementById('overlay').hidden&&!Q.busy,null,{timeout:20000}).catch(()=>{rec.stuck++});await page.waitForTimeout(400)}
    rec.ends.push(await page.evaluate(()=>({rs:rngState>>>0,banked:run.banked,crack:Math.round(state.crack*10)/10,over:!!state.over,lives:run.lives})));
  }
  rec.log=await page.evaluate(()=>LK.log.map(e=>[e.k,e.r,e.o]));
  rec.errors=errors.slice();
  await ctx.close();return rec;
}
(async()=>{let bad=0,sarc=0,jp=0,press=0,walls=0;const dist={};
  for(let n=START;n<START+N;n++){const seed=['OWL','BOAR','CAT','TOMB','JADE','GOLD','BONE','DUST','HORN','RING'][n%10]+'-'+(1000+n*137);
    const a=await play(H.RC9A,seed),b=await play(process.argv[3]||H.BUILD,seed);
    const same=k=>JSON.stringify(a[k])===JSON.stringify(b[k]);
    const ok=same('walls')&&same('log')&&same('ends')&&!a.stuck&&!b.stuck&&!a.errors.length&&!b.errors.length;
    const sr=a.log.filter(e=>e[0]==='reels'),jr=a.log.filter(e=>e[0]==='jackpot');sarc+=sr.length;jp+=jr.length;press+=a.log.filter(e=>e[0]==='press').length;walls+=a.walls.length;
    sr.concat(jr).forEach(e=>{dist[e[0]+':'+e[2]]=(dist[e[0]+':'+e[2]]||0)+1});
    if(!ok){bad++;console.log('DIFF',seed,{walls:same('walls'),log:same('log'),ends:same('ends'),stuck:[a.stuck,b.stuck],errs:[a.errors,b.errors]});
      if(!same('log')){const i=a.log.findIndex((e,i)=>JSON.stringify(e)!==JSON.stringify(b.log[i]));console.log(' first log diff at',i,a.log[i],b.log[i],'lens',a.log.length,b.log.length)}
      if(!same('ends'))console.log(' ends',JSON.stringify(a.ends),JSON.stringify(b.ends))}
    else console.log('same',seed,'walls',a.walls.length,'rolls',a.log.length,'sarc',sr.map(e=>e[2]).join(',')||'-','fever4',jr.map(e=>e[2]).join(',')||'-');
  }
  console.log(`PARITY ${bad?'FAIL':'PASS'}: ${N} seeds, ${walls} walls, ${sarc} sarcophagus results, ${jp} fourth-Fever results, ${press} red-line rolls compared; ${bad} seeds differ`);console.log(JSON.stringify(dist));
  await H.close();process.exit(bad?1:0)})().catch(e=>{console.error(e);process.exit(1)});
