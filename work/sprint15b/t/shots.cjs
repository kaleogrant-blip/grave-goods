// Screenshots for review, deviceScaleFactor 1, real taps on the bone. Results are forced for the pictures only (H.forceSarc / a pinned draw); no test uses that.
const H=require('./h.cjs');const path=require('path');const OUT=path.join(H.DIR,'shots');const FILE=process.argv[2]||H.BUILD;
const shot=(page,n)=>page.screenshot({path:path.join(OUT,n+'.png')});
async function reading(name,r,w,h,steps,o={}){
  const {page,ctx,errors}=await H.open(FILE,{w,h,rm:o.rm});await page.waitForTimeout(500);await H.sarcSeed(page,'SHOT-');await page.waitForTimeout(700);
  if(o.read)await page.evaluate(n=>{ST.br=n},o.read);
  if(o.fever){await page.evaluate(k=>{luckSlipHide();const W=LUCK.jackpot.w,o=srnd;let n=0,acc=0,tot=0;JP_KEYS.forEach(q=>tot+=W[q]);for(const q of JP_KEYS){if(q===k)break;acc+=W[q]}const v=(acc+W[k]/2)/tot;srnd=function(){if(n++===0)return v;srnd=o;return o()};RS().fev=LUCK.jackpot.at-1;luckFever()},o.fever);await page.waitForSelector('#lkp.bn-fev',{timeout:8000})}
  else{if(o.sul)await page.evaluate(()=>{state.sulfur=true});await H.forceSarc(page,r);await H.tapSarc(page)}
  await page.waitForTimeout(900);
  for(let i=0;i<4;i++){if(steps.includes(i))await shot(page,name+'-'+(i+1)+['-record','-heat','-fork','-read'][i]);if(i<3)await H.boneStep(page,i===2?1900:1000)}
  const sc=await H.noScroll(page);console.log(name,w+'x'+h,'scroll ok',sc.ok,'errors',errors.filter(e=>!/vibrate/.test(e)).length);await ctx.close()}
(async()=>{
  await reading('relic',.1,390,844,[0,1,2,3]);
  await reading('mimic',.8,390,844,[0,1,2,3]);
  await reading('bones',.6,390,844,[0,1,2,3]);
  await reading('second-bone-nothing',0,390,844,[0,2,3],{fever:'nothing'});
  await reading('small-360x640-bones',.6,360,640,[2,3]);
  await reading('landscape-844x390-relic',.1,844,390,[2,3]);
  await reading('fastpath-sulfur',.5,390,844,[0],{read:5,sul:true});
  // red line, stats, how to play, knucklebone
  {const {page,ctx}=await H.open(FILE);await page.waitForTimeout(500);await H.startSeeded(page,'SHOT-RED');await page.waitForTimeout(800);
    await page.evaluate(()=>{luckSlipHide();const f=state.finds.find(f=>!f.sarc);f.cells.forEach(([x,y])=>state.dirt[y][x]=0);f.lucky=true;state.crack=maxCrack()*.84;ui();draw()});await page.waitForTimeout(500);await shot(page,'red-line-field-note');
    await page.evaluate(()=>{state.crack=20;ui();luckCoinOffer({total:3200})});await page.waitForTimeout(900);await shot(page,'knucklebone-wager');
    await page.evaluate(()=>{luckReset();ST.lk=7;ST.tr=3;ST.cf=4;ST.cw=1;ST.nm=2;ST.br=9;showStats()});await page.waitForTimeout(700);
    await page.evaluate(()=>{const s=[...document.querySelectorAll('#card .sec')].find(e=>/Field/.test(e.textContent));s.scrollIntoView({block:'center'})});await page.waitForTimeout(300);await shot(page,'stats-field-conditions');
    await page.evaluate(()=>{showHowTo();_how.go(HOW.findIndex(c=>c.h==='Chances'))});await page.waitForTimeout(900);await shot(page,'how-to-play-chances');
    await page.evaluate(()=>{document.getElementById('overlay').scrollTop=9999});await page.waitForTimeout(300);await shot(page,'how-to-play-chances-2');
    await ctx.close()}
  await H.close()})().catch(e=>{console.error(e);process.exit(1)});
