// Smaller rules, each checked on the real page: Reduce Motion, the one-tap fast path, the tap guard, the first-time line, coaching text vs the kit,
// the version string, the Stats screen, the red-line note, the knucklebone copy.
const H=require('./h.cjs');const FILE=process.argv[2]||H.BUILD;
(async()=>{let fail=0;const say=(ok,msg,x)=>{console.log((ok?'ok   ':'FAIL ')+msg,x===undefined?'':JSON.stringify(x).slice(0,400));if(!ok)fail++};
  // ---- version, title
  {const {page,ctx,errors}=await H.open(FILE);await page.waitForTimeout(1200);
    const v=await page.evaluate(()=>({c:GAME_VERSION,shown:(document.querySelector('.tl-ver')||{}).textContent}));say(v.c==='v1.0-rc9b'&&/v1\.0-rc9b/.test(v.shown||''),'version string on the title',v);
    await H.sarcSeed(page,'EXT-');await page.waitForTimeout(500);
    // ---- first-time line, tap guard
    await page.evaluate(()=>{ST.br=0});await H.tapSarc(page);
    const cap1=await page.evaluate(()=>document.getElementById('bncap').textContent);say(/carries ox shoulder blades from dig to dig/.test(cap1)&&/His habit, not the tomb/.test(cap1),'first reading: the Quartermaster\'s-habit line',cap1);
    await page.locator('#bngo').tap();const early=await page.evaluate(()=>document.getElementById('lkp').className);say(!/s1/.test(early),'a tap in the first 600 ms is ignored (thumb still digging)',early);
    await page.waitForTimeout(700);say(!(await H.boneInfo(page)).fast,'no fast path on the first reading');
    await H.boneStep(page,700);await H.boneStep(page,800);await H.boneStep(page,1800);await page.locator('#bngo').tap();await page.waitForFunction(()=>!LK.busy);
    const br=await page.evaluate(()=>ST.br);say(br===1,'"Bones read" counted once',br);
    // ---- second reading: ordinary line; fast path after BONE.fastAfter readings
    await page.evaluate(()=>{document.getElementById('overlay').hidden=true;ST.br=BONE.fastAfter;const f=state.finds.find(f=>f.sarc);f.banked=false;state.sarcPend=null;state.crack=0});
    await H.tapSarc(page);await page.waitForTimeout(700);const b=await H.boneInfo(page);say(b.fast&&/hands you an ox shoulder blade/.test(b.cap),'after '+br+'+ readings: ordinary line and a "Read it at once" button',b.cap);
    say(b.rows.every(r=>/%$/.test(r.pct)),'fast path: the printed chances are on screen before the tap');
    const saved=await page.evaluate(()=>LK_KINDS.find(k=>state.sarcPend.r<k[0])[1]);
    await page.locator('#bnfast').tap();await page.waitForTimeout(900);const f=await H.boneInfo(page);
    say(f.rows.find(r=>r.k===saved).hit&&f.rows.filter(r=>!r.hit).every(r=>r.out)&&/Find No/.test(f.tag),'fast path: one tap shows the fork revision and ends at the saved result ('+saved+')');
    await page.waitForFunction(()=>!LK.busy,null,{timeout:6000});say(true,'the tag closes by itself if it is not tapped ('+(await page.evaluate(()=>BONE.holdMs))+' ms)');
    // ---- red line
    await page.evaluate(()=>{document.getElementById('overlay').hidden=true;state.over=false;state.crack=maxCrack()*.85;ui()});await page.waitForTimeout(200);
    const red=await page.evaluate(()=>({note:(document.getElementById('lknote')||{}).textContent,pick:document.getElementById('pickO').textContent,ham:document.getElementById('hamO').textContent,w:pressW()}));
    say(red.note===`Wall is talking. Loose ${Math.round(red.w.lucky/(red.w.normal+red.w.lucky+red.w.tremor)*100)} in 100. Tremor ${Math.round(red.w.tremor/(red.w.normal+red.w.lucky+red.w.tremor)*100)} in 100.`,'red line: field note carries the live chances',red.note);
    say(/^×2 if loose$/.test(red.pick)&&red.pick===red.ham,'red line: pencil note on the tools, no percent chip',red.pick);
    await page.evaluate(()=>{state.crack=10;ui()});say(await page.evaluate(()=>!document.getElementById('lknote')&&document.getElementById('pickO').hidden),'below the red line: note and pencil tags are gone');
    // ---- knucklebone copy
    await page.evaluate(()=>{luckCoinOffer({total:3000})});await page.waitForTimeout(300);const kb=await page.evaluate(()=>document.getElementById('lkp').textContent);
    say(/Triple or nothing\?/.test(kb)&&/This is a wager/.test(kb)&&/Pranes, 32%/.test(kb)&&/take the seal back/.test(kb)&&/Wager it/.test(kb),'knucklebone: still triple or nothing, says it is a wager, same chances',kb.slice(0,120));
    await page.evaluate(()=>luckReset());
    // ---- stats screen
    await page.evaluate(()=>showStats());const stx=await page.evaluate(()=>document.getElementById('card').textContent);
    say(/Field conditions/.test(stx)&&/Close shaves/.test(stx)&&/Bones thrown/.test(stx)&&/Loose stone/.test(stx)&&!/Near miss|Jackpot|Coins flipped|Lucky strike|\bLuck\b/.test(stx),'Stats: Field conditions / Close shaves / Bones thrown; no Near misses, Jackpots or Luck heading');
    // ---- how to play and every other text source the game can show: scan the rendered How to Play, Stats, Settings, Ledger and Codex for the retired words
    const pages=await page.evaluate(()=>{const out={};const grab=(n,fn)=>{try{fn();out[n]=document.getElementById('card').textContent}catch(e){out[n]='ERR '+e.message}};
      grab('howto',()=>showHowTo());grab('stats',()=>showStats());grab('settings',()=>showSettings());if(typeof showLedger==='function')grab('ledger',()=>showLedger());if(typeof showCodex==='function')grab('codex',()=>showCodex());return out});
    const RX=/jackpot|\breels?\b|\bspin|\bwheel\b|near.miss|lucky strike|press your luck|coins? flip|\bheads\b|\bodds\b|\btease/i;
    for(const k in pages){const m=pages[k].match(RX);const ok=!m||(/gear wheel|jeweler's wheel/.test(pages[k].slice(Math.max(0,m.index-30),m.index+30)));say(ok&&!/^ERR/.test(pages[k]),'rendered '+k+' ('+pages[k].length+' chars): none of the retired words',m?pages[k].slice(Math.max(0,m.index-40),m.index+40):undefined)}
    // ---- coaching never names a tool the kit lacks: every class x every tool
    const coach=await page.evaluate(()=>{const bad=[],seen=[];const tools=KIT_TOOLS.map(t=>t.id);
      for(const k of Object.keys(CLASSES))for(const T of tools){run.kit=run.kit||{};run.kit.tool=T;const N=kitNames(),line=s12ClassLine(k),damp=TELL_TXT.damp?TELL_TXT.damp()[1]:'',tut=TUT_STEPS[0].t;
        const all=line+' | '+damp+' | '+tut;
        if(!N.ham&&/hammer/i.test(all))bad.push([k,T,'hammer',all]);if(N.ham&&N.ham!=='hammer'&&/hammer/i.test(all))bad.push([k,T,'hammer (kit has a '+N.ham+')',all]);if(N.pick!=='pick'&&/\bpick\b/i.test(all))bad.push([k,T,'pick (kit has a '+N.pick+')',all]);
        if(T==='chisel'||T==='mattock')seen.push(k+'/'+T+': '+line)}
      run.kit.tool='standard';return{bad,n:Object.keys(CLASSES).length*tools.length,seen:seen.slice(0,4),std:s12ClassLine('scholar')}});
    say(coach.bad.length===0,'coaching, Damp slip and the first tutorial card never name a tool the kit lacks ('+coach.n+' class x tool kits)',coach.bad.slice(0,3));console.log('     e.g.',coach.seen.join('\n          '));console.log('     standard kit, unchanged:',coach.std);
    say(errors.filter(e=>!/vibrate/.test(e)).length===0,'no page errors in this pass',errors);await ctx.close()}
  // ---- Reduce Motion
  {const {page,ctx,errors}=await H.open(FILE,{rm:true});await page.waitForTimeout(500);await H.sarcSeed(page,'EXT-');await page.waitForTimeout(500);await H.tapSarc(page);await page.waitForTimeout(700);
    const rmOn=await page.evaluate(()=>rmEff()&&document.getElementById('lkp').classList.contains('bn-rm'));say(rmOn,'Reduce Motion: the reading opens in its still mode');
    await H.boneStep(page,600);await H.boneStep(page,600);const mid=await page.evaluate(()=>({shake:document.getElementById('bnstage').classList.contains('bn-shk'),dur:[...document.querySelectorAll('#lkp .bn-c')].map(c=>getComputedStyle(c).transitionDuration+'/'+getComputedStyle(c).transitionProperty)}));
    say(!mid.shake,'Reduce Motion: no shake at the crack',mid);
    const t0=Date.now();await page.locator('#bngo').tap();await page.waitForFunction(()=>document.getElementById('bntag').classList.contains('bn-show'),null,{timeout:3000});const dt=Date.now()-t0;
    const tg=await page.evaluate(()=>{const t=document.getElementById('bntag'),cs=getComputedStyle(t);return{tr:cs.transitionProperty,dur:cs.transitionDuration}});
    say(dt<700&&/opacity/.test(tg.tr)&&!/transform/.test(tg.tr),'Reduce Motion: a short fade to the result ('+dt+' ms from tap to tag, opacity only)',tg);
    const three=await H.boneInfo(page);say(three.rows.some(r=>r.hit),'Reduce Motion: same three taps, same record');
    say(errors.filter(e=>!/vibrate/.test(e)).length===0,'no page errors under Reduce Motion',errors);await ctx.close()}
  console.log(fail?'EXTRAS FAIL':'EXTRAS PASS');await H.close();process.exit(fail?1:0)})().catch(e=>{console.error(e);process.exit(1)});
