// Bone sound and touch. Every audio source a reading starts is recorded by wrapping AudioScheduledSourceNode.start/stop in the page (independent of the
// game's own BONE_AU set). Checks: each node is given a stop time when it starts; none is left sounding 3.5 s after a full reading; none is left after
// luckReset() mid-hiss (the path every chamber change and menu return takes), and vibration is cancelled; none is left after the app is hidden and shown
// mid-hiss; no luck timer is left pending; the removed reel / wheel effects are gone; haptics fire in the right order.
const H=require('./h.cjs');const assert=require('assert');
const INIT=`(()=>{const A=window.AudioScheduledSourceNode;if(!A)return;const T=window.__bn={all:[],live:new Set()};
  const st=A.prototype.start,sp=A.prototype.stop;
  const wrap=(P,orig)=>{P.start=function(){let tag=0;try{tag=_bnAu}catch(e){}if(tag){const rec={type:this.constructor.name,loop:!!this.loop,t0:performance.now(),stop:null,ended:null};this.__bn=rec;T.all.push(rec);T.live.add(this);this.addEventListener('ended',()=>{rec.ended=performance.now();T.live.delete(this)})}return orig.apply(this,arguments)}};
  wrap(A.prototype,st);if(window.AudioBufferSourceNode&&Object.prototype.hasOwnProperty.call(AudioBufferSourceNode.prototype,'start'))wrap(AudioBufferSourceNode.prototype,AudioBufferSourceNode.prototype.start); // buffer sources have their own start()
  A.prototype.stop=function(t){if(this.__bn&&this.__bn.stop===null)this.__bn.stop=(t===undefined?this.context.currentTime:t)-this.context.currentTime;return sp.apply(this,arguments)};})();`;
const st=page=>page.evaluate(()=>({all:__bn.all.length,noStop:__bn.all.filter(r=>r.stop===null).length,maxStop:Math.max(0,...__bn.all.map(r=>r.stop||0)),live:__bn.live.size,game:BONE_AU.size,timers:LK.timers.size,ctx:typeof ac==='object'&&ac?ac.state:'none',loops:__bn.all.filter(r=>r.loop).length,loopsNoStop:__bn.all.filter(r=>r.loop&&r.stop===null).length}));
async function start(mode){const o=await H.open(process.argv[2]||H.BUILD,{init:INIT});const {page}=o;await page.waitForTimeout(400);if(mode==='sarc')await H.sarcSeed(page,'AUD-');else await H.startSeeded(page,'AUD-'+mode);await page.waitForTimeout(400);
  await page.evaluate(()=>{try{luckSlipHide()}catch(e){};SFX.off=false});
  await page.locator('#pick').tap(); // a real gesture wakes the audio context
  if(mode==='fever'){await page.evaluate(()=>{RS().fev=LUCK.jackpot.at-1;luckFever()});await page.waitForSelector('#lkp.bn-fev',{timeout:8000})}else{await H.tapSarc(page)}
  await page.waitForTimeout(750);return o}
(async()=>{let fail=0;const say=(ok,msg,x)=>{console.log((ok?'ok   ':'FAIL ')+msg,x===undefined?'':JSON.stringify(x));if(!ok)fail++};
  // removed effects
  {const o=await start('sarc');const gone=await o.page.evaluate(()=>['k_reeltick','k_reelstop','k_wheel','k_jackpot'].filter(k=>SND[k]||SND_LV[k]!==undefined||SND_HI.has(k)));say(gone.length===0,'reel and wheel effects removed from SND, SND_LV, SND_HI',gone);
    const have=await o.page.evaluate(()=>['k_hiss','k_crack','k_creep','k_stop','k_tag'].every(k=>typeof SND[k]==='function'));say(have,'bone effects present');
    const bells=await o.page.evaluate(()=>['k_hiss','k_crack','k_creep','k_stop','k_tag'].filter(k=>/bellA|aTick/.test(SND[k].toString())||/bellA/.test(String(SND[k]))));say(bells.length===0,'no bell voices in the bone effects');
    // full reading, real taps
    for(const mode of ['sarc','fever']){const q=mode==='sarc'?o:await start('fever');const page=q.page;
      const s0=await st(page);say(s0.ctx==='running','['+mode+'] audio context is running in this browser',s0.ctx);
      await page.evaluate(()=>{__vib.length=0});
      await H.boneStep(page,300);const a=await st(page);say(a.live>0&&a.game>0,'['+mode+'] hiss is sounding 0.3 s after Heat',a);
      await page.waitForTimeout(900);await H.boneStep(page,900);await H.boneStep(page,1900);
      const b=await st(page);say(b.noStop===0,'['+mode+'] every node was given a stop time when it started ('+b.all+' nodes, longest '+b.maxStop.toFixed(2)+' s, '+b.loops+' looping buffers all with a stop)',{noStop:b.noStop,loopsNoStop:b.loopsNoStop});
      say(b.maxStop<=3.05,'['+mode+'] no node is scheduled to live longer than 3 s');
      await page.locator('#bngo').tap();await page.waitForFunction(()=>!LK.busy);await page.waitForTimeout(3600);
      const c=await st(page);say(c.live===0&&c.game===0,'['+mode+'] 3.6 s after the reading: nothing still sounding',{live:c.live,game:c.game});say(c.timers===0,'['+mode+'] no luck timer left pending',c.timers);
      const vib=await page.evaluate(()=>__vib.map(v=>v[1]));say(vib.length>=8,'['+mode+'] haptics fired: '+JSON.stringify(vib));
      const hs=vib.slice(0,4);say(hs.every(v=>typeof v==='number')&&hs.every((v,i,a)=>i===0||v>a[i-1]),'['+mode+'] heating: four separate pulses, each longer than the last',hs);
      say(vib[4]>=100,'['+mode+'] the crack is one hard tap (100 ms; the iOS shell maps a peak of 100+ to a medium impact, anything less to a light one)',vib[4]);
      say(JSON.stringify(vib.slice(5,9))==='[6,6,6,30]','['+mode+'] creep: three small ticks, then the stop',vib.slice(5,9));
      const errs=q.errors.slice();say(errs.length===0,'['+mode+'] no page errors',errs);if(q!==o)await q.ctx.close()}
    await o.ctx.close()}
  // quit mid-reading, at each step
  for(const step of [1,2,3]){const o=await start('sarc');const page=o.page;
    for(let k=0;k<step;k++){await page.locator('#bngo').tap();if(k<step-1)await page.waitForTimeout(650)}
    await page.waitForTimeout(120);const a=await st(page);await page.evaluate(()=>{__vib.length=0;luckReset()});await page.waitForTimeout(250);const b=await st(page);
    const vib0=await page.evaluate(()=>__vib.some(v=>v[1]===0));
    say(b.live===0&&b.game===0&&b.timers===0,'quit '+['','mid-hiss','just after the crack','while the crack creeps'][step]+': '+a.live+' node(s) sounding before, 0 after luckReset(), no timers',b);say(vib0,'  vibration cancelled');
    await page.waitForTimeout(1500);const c=await st(page);say(c.live===0&&c.all===b.all,'  and nothing new started in the next 1.5 s',{live:c.live,started:c.all-b.all});
    await o.ctx.close()}
  // app hidden and shown mid-hiss
  {const o=await start('sarc');const page=o.page;await page.locator('#bngo').tap();await page.waitForTimeout(150);
    await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>'hidden'});document.dispatchEvent(new Event('visibilitychange'))});
    await page.waitForTimeout(1500);
    await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>'visible'});document.dispatchEvent(new Event('visibilitychange'))});
    await page.locator('#bngo').tap().catch(()=>{});await page.waitForTimeout(3800);const c=await st(page);say(c.live===0&&c.game===0,'app hidden mid-hiss, shown again: nothing left sounding 3.8 s later',c);
    const errs=o.errors.slice();say(errs.length===0,'  no page errors',errs);await o.ctx.close()}
  console.log(fail?'AUDIO FAIL':'AUDIO PASS');await H.close();process.exit(fail?1:0)})().catch(e=>{console.error(e);process.exit(1)});
