// draw() cost while the bone is being read. Wraps the game's draw() (outermost, so the CRT pass is included), samples every call and every frame gap:
// 2 s on the idle wall (baseline), then a full reading with real taps (heat, crack, the 0.9 s creep, tag). Also times draw() called directly 200 times with the panel up.
const H=require('./h.cjs');
const med=a=>{if(!a.length)return null;const s=a.slice().sort((x,y)=>x-y);return +s[Math.floor(s.length/2)].toFixed(3)},p95=a=>{if(!a.length)return null;const s=a.slice().sort((x,y)=>x-y);return +s[Math.floor(s.length*.95)].toFixed(3)};
(async()=>{const out=[];let fail=0;
  for(const [w,h] of [[390,844],[360,640],[844,390]])for(const mode of ['sarc','fever']){
    const {page,ctx,errors}=await H.open(process.argv[2]||H.BUILD,{w,h});await page.waitForTimeout(500);if(mode==='sarc')await H.sarcSeed(page,'PERF-');else await H.startSeeded(page,'PERF-'+mode);await page.waitForTimeout(600);
    await page.evaluate(()=>{try{luckSlipHide()}catch(e){}const P=window.__perf={ph:'',d:{},f:{},last:0};const _d=draw;draw=function(){const t=performance.now();const r=_d.apply(this,arguments);if(P.ph)(P.d[P.ph]=P.d[P.ph]||[]).push(performance.now()-t);return r};
      (function raf(t){if(P.ph&&P.last)(P.f[P.ph]=P.f[P.ph]||[]).push(t-P.last);P.last=t;requestAnimationFrame(raf)})(performance.now())});
    await page.evaluate(()=>{__perf.ph='wall'});await page.waitForTimeout(2000);await page.evaluate(()=>{__perf.ph=''});
    if(mode==='fever'){await page.evaluate(()=>{RS().fev=LUCK.jackpot.at-1;luckFever()});await page.waitForSelector('#lkp.bn-fev',{timeout:8000})}else{await H.tapSarc(page)}
    await page.waitForTimeout(700);
    await page.evaluate(()=>{__perf.ph='heat'});await H.boneStep(page,1000);
    await page.evaluate(()=>{__perf.ph='crack'});await H.boneStep(page,900);
    await page.evaluate(()=>{__perf.ph='creep'});await page.locator('#bngo').tap();await page.waitForTimeout(950);
    await page.evaluate(()=>{__perf.ph='tag'});await page.waitForTimeout(900);await page.evaluate(()=>{__perf.ph=''});
    const direct=await page.evaluate(()=>{const a=[];for(let i=0;i<200;i++){const t=performance.now();draw();a.push(performance.now()-t)}return a});
    const P=await page.evaluate(()=>__perf);const bone=[].concat(P.d.heat||[],P.d.crack||[],P.d.creep||[],P.d.tag||[]),bf=[].concat(P.f.heat||[],P.f.crack||[],P.f.creep||[],P.f.tag||[]);
    const row={vp:w+'x'+h,mode,wall_draw_med:med(P.d.wall||[]),wall_n:(P.d.wall||[]).length,bone_draw_calls:bone.length,bone_draw_med:med(bone),bone_draw_p95:p95(bone),creep_draw_med:med(P.d.creep||[]),direct_draw_med:med(direct),direct_draw_p95:p95(direct),frame_gap_wall_med:med(P.f.wall||[]),frame_gap_bone_med:med(bf),frame_gap_creep_p95:p95(P.f.creep||[]),errors:errors.slice().length};
    out.push(row);const m=row.bone_draw_calls?row.bone_draw_med:0;if(m>=2||row.direct_draw_med>=2&&row.bone_draw_calls>0||row.errors)fail++;
    await ctx.close()}
  console.table(out);console.log(fail?'PERF FAIL':'PERF PASS: draw() median under 2 ms during the bone animation at every size');await H.close();process.exit(fail?1:0)})().catch(e=>{console.error(e);process.exit(1)});
