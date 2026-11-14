// Honest fork. Three checks, all against the code the game really runs:
//  1. the printed record equals the table the roll uses (sarcophagus, sarcophagus under Sulfur, second bone);
//  2. over many seeded rolls, the overall distribution matches the printed percentages, and P(result | fork side) matches the pencilled figures;
//  3. on real readings (the panel itself), the fork drawn on the bone goes to the side that holds the saved result, the red strikes are the other side,
//     the pencilled figures are boneRevised(), and the crack ends at the saved result. No reading shows a side that does not contain its result.
const H=require('./h.cjs');const assert=require('assert');
const N=+process.argv[2]||200000,READS=+process.argv[3]||40;
(async()=>{const {page,errors}=await H.open(process.argv[4]||H.BUILD);await page.waitForTimeout(300);await H.startSeeded(page,'FORK-1');await page.waitForTimeout(300);
  const R=await page.evaluate(N=>{
    const out={};
    const run=(name,mode,opt,roll)=>{
      const rows=boneTable(mode,opt),cnt={},side={L:0,R:0},cs={};rows.forEach(r=>{cnt[r.k]=0;cs[r.k]=0});
      for(let n=0;n<N;n++){srand(hashStr('FORK#'+name+'#'+n));const k=roll();cnt[k]++;const s=boneSide(mode,k);side[s]++;cs[k]++}
      const res=[];let worst=0,worstC=0;
      rows.forEach(r=>{const p=cnt[r.k]/N,tw=rows.reduce((a,q)=>a+q.w,0),exp=r.w/tw,se=Math.sqrt(Math.max(exp*(1-exp),1e-9)/N),z=Math.abs(p-exp)/se;if(exp>0)worst=Math.max(worst,z);
        const sN=side[r.side],sw=rows.filter(q=>q.side===r.side).reduce((a,q)=>a+q.w,0),cexp=r.w/sw,cp=sN?cs[r.k]/sN:0,cse=Math.sqrt(Math.max(cexp*(1-cexp),1e-9)/Math.max(1,sN)),cz=Math.abs(cp-cexp)/cse;if(cexp>0)worstC=Math.max(worstC,cz);
        const rev=boneRevised(rows,r.side)[r.k];
        res.push({k:r.k,side:r.side,printed:r.pct,observed:+(p*100).toFixed(2),pencilled:rev===undefined?null:rev,observedGivenSide:+(cp*100).toFixed(2),trueGivenSide:+(cexp*100).toFixed(2)})});
      out[name]={rows:res,forkLeft:+(side.L/N*100).toFixed(2),worstZ:+worst.toFixed(2),worstZcond:+worstC.toFixed(2)}};
    run('sarcophagus','sarc',null,()=>{state.sulfur=false;const r=s9SarcRoll().r;return LK_KINDS.find(k=>r<k[0])[1]});
    run('sarcophagus+sulfur','sarc',{sul:true},()=>{state.sulfur=true;const r=s9SarcRoll().r;return LK_KINDS.find(k=>r<k[0])[1]});
    run('second bone','fever',null,()=>jpRoll().key);
    state.sulfur=false;
    // table = source numbers
    const t=boneTable('sarc'),W=LUCK.jackpot.w;out.tableOk=t.every((r,i)=>Math.abs(r.w-(Math.min(1,LK_KINDS[i][0])-(i?LK_KINDS[i-1][0]:0))*100)<1e-6&&r.k===LK_KINDS[i][1])&&boneTable('fever').every(r=>r.w===W[r.k]);
    return out},N);
  let fail=0;
  for(const k of ['sarcophagus','sarcophagus+sulfur','second bone']){const o=R[k];console.log('\n'+k+' ('+N+' seeded rolls): fork left '+o.forkLeft+'%, worst z overall '+o.worstZ+', worst z given the side '+o.worstZcond);console.table(o.rows);
    if(o.worstZ>4||o.worstZcond>4){fail++;console.log('DISTRIBUTION FAIL')}
    o.rows.forEach(r=>{if(Math.abs(r.printed-r.observed)>0.5+0.4){fail++;console.log('printed vs observed',r)}if(r.pencilled!==null&&Math.abs(r.pencilled-r.observedGivenSide)>0.5+0.5){fail++;console.log('pencilled vs observed',r)}})}
  if(!R.tableOk){fail++;console.log('TABLE MISMATCH')}
  // 3. real readings through the panel
  const tally={n:0,sideOk:0,strikeOk:0,revOk:0,endOk:0,by:{}};
  for(let n=0;n<READS;n++){
    const fev=n%4===3;
    if(fev)await H.startSeeded(page,'FORKUI-'+n);else{await H.sarcSeed(page,'FORKUI-'+n+'-');await page.waitForTimeout(450)} /* the relaunch inside sarcSeed leaves the title closing; let it finish */ await page.evaluate(()=>{Q.speed=6;try{luckSlipHide()}catch(e){}});
    await page.evaluate(([fev,n])=>{if(fev){RS().fev=LUCK.jackpot.at-1;luckFever()}else{if(n%5===0)state.sulfur=true;const f=state.finds.find(f=>f.sarc);f.cells.forEach(([x,y])=>state.dirt[y][x]=0);openSarc(f)}},[fev,n]);
    await page.waitForSelector(fev?'#lkp.bn-fev':'#lkp.bn',{timeout:8000});
    const saved=await page.evaluate(fev=>{const w=JSON.parse(localStorage.getItem('S15T_resume')).w;if(fev)return{mode:'fever',key:w.jpPend.k,sul:false};const r=w.sarcPend.r;return{mode:'sarc',key:LK_KINDS.find(k=>r<k[0])[1],sul:!!w.sarcPend.sul}},fev);
    const exp=await page.evaluate(s=>{const rows=boneTable(s.mode,{sul:s.sul}),side=boneSide(s.mode,s.key);return{side,rev:boneRevised(rows,side),rows:rows.map(r=>[r.k,r.side,r.w])}},saved);
    const click=async()=>{await page.waitForFunction(()=>{const g=document.querySelector('#bngo');return !!g&&!g.disabled},null,{timeout:4000});await page.evaluate(()=>document.querySelector('#bngo').onclick())}; // a tap is only taken when the button is live, as for a player
    await click();await click();await page.waitForFunction(()=>document.getElementById('lkp').classList.contains('s2')&&document.querySelectorAll('#lkp .bn-c.bn-on').length>=2,null,{timeout:4000});
    const mid=await H.boneInfo(page);
    const capSide=/forks left/.test(mid.cap)?'L':/forks right/.test(mid.cap)?'R':'?';
    const drawn=await page.evaluate(()=>{const p=document.querySelectorAll('#lkp .bn-c')[1],d=p.getAttribute('d').split('L').pop().trim().split(' ');return +d[0]<180?'L':'R'}); // where the fork's last point really is on the bone
    tally.n++;if(capSide===exp.side&&drawn===exp.side)tally.sideOk++;else console.log('SIDE MISMATCH',n,saved,capSide,drawn);
    if(mid.rows.every(r=>(r.side!==exp.side)===r.out||(r.side===exp.side&&r.out&&exp.rev[r.k]===undefined)))tally.strikeOk++;else console.log('STRIKE MISMATCH',n,saved,mid.rows);
    if(mid.rows.filter(r=>r.side===exp.side&&exp.rev[r.k]!==undefined).every(r=>(r.rev||r.pct)===exp.rev[r.k]+'%'))tally.revOk++;else console.log('PENCIL MISMATCH',n,saved,mid.rows,exp.rev);
    await click();await page.waitForFunction(()=>{const t=document.getElementById('bntag');return !t||t.classList.contains('bn-show')},null,{timeout:4000});const end=await H.boneInfo(page); // the tag stays up 433 ms at this speed before it closes itself
    if(end.rows.filter(r=>r.hit).map(r=>r.k).join()===saved.key)tally.endOk++;else console.log('END MISMATCH',n,saved,end.rows);
    tally.by[saved.mode+':'+saved.key]=(tally.by[saved.mode+':'+saved.key]||0)+1;
    await page.evaluate(()=>{const g=document.querySelector('#bngo');if(g)g.onclick()});await page.waitForTimeout(60);
    await page.evaluate(()=>{document.getElementById('overlay').hidden=true;try{luckReset()}catch(e){}});
  }
  console.log('\nreal readings:',JSON.stringify(tally));
  if(tally.sideOk!==tally.n||tally.strikeOk!==tally.n||tally.revOk!==tally.n||tally.endOk!==tally.n)fail++;
  const errs=errors.slice();if(errs.length){fail++;console.log(errs)}
  console.log(fail?'FORK FAIL':'FORK PASS');await H.close();process.exit(fail?1:0)})().catch(e=>{console.error(e);process.exit(1)});
