// After every action the tray rules are checked: never more than nine loose finds, never more than six on the tray, every loose find has an age, no two share one,
// a crumbled find is banked and lost, and the Seal button agrees with the tray. Taps on loose finds (tray taps) are part of the mix.
// Random-action fuzz with real touchscreen taps. node fuzz.cjs [runs=5] [actions=1500] [build] [seed0]
// Fails on: any page error; a stuck state (nothing about the game changes for 120 actions in a row and no way forward is found).
// Logs every "tap that should dig but does not": the wall is showing, nothing covers it, the tool is the pick or hammer, the tapped tile has dirt and is
// not a sarcophagus, and yet no dirt went and no strike was counted. Each one is written out with the state needed to explain it.
const H=require('./h.cjs');const fs=require('fs');const path=require('path');
const RUNS=+process.argv[2]||5,ACTS=+process.argv[3]||1500,FILE=process.argv[4]||H.BUILD,SEED0=+process.argv[5]||1;
const VPS=process.env.FUZZ_VP?[process.env.FUZZ_VP.split('x').map(Number)]:[[390,844],[360,640],[844,390],[390,844],[412,915]];
// every pointerdown the page receives is noted (capture phase, before the game sees it): time, target, position. A tap that digs nothing can then be traced to where it actually went.
const PDLOG=`window.__pd=[];document.addEventListener('pointerdown',e=>{const t=e.target;__pd.push({t:Math.round(performance.now()),id:(t&&(t.id||t.className||t.tagName))||'?',x:Math.round(e.clientX),y:Math.round(e.clientY),pt:e.pointerType});if(__pd.length>6)__pd.shift()},true);`;
const ctxOf=page=>page.evaluate(()=>{const ov=document.getElementById('overlay'),lp=document.getElementById('lkp'),sh=document.getElementById('shareSheet');
  const vis=e=>!!e&&e.offsetParent!==null;
  return{title:typeof _title!=='undefined'&&_title!==null,ov:!ov.hidden,panel:lp?lp.className:'',share:!!sh,pause:typeof PAUSE!=='undefined'&&PAUSE.on,hasState:!!state,
    over:!!(state&&state.over),sealing:!!(state&&state.sealing),clearing:!!(state&&state.clearing),falling:!!(state&&state.falling),qbusy:!!(typeof Q!=='undefined'&&Q.busy),lk:LK.busy,lkmode:LK.mode,lkt:LK.timers.size,
    tool:typeof tool==='string'?tool:'',feed:typeof feedMode!=='undefined'&&!!feedMode,confirm:typeof confirmOn==='function'&&!!confirmOn(),kit:typeof kitTool==='function'?kitTool():'',train:!!(state&&state.train),
    i:state?state.i:-1,crack:state?Math.round(state.crack*10)/10:0,banked:run?run.banked:0,lives:run?run.lives:0,taps:run&&run.st?run.st.taps:0,strikes:state?state.strikes|0:0,
    dirtSum:state?state.dirt.reduce((a,r)=>a+r.reduce((b,v)=>b+v,0),0):0,card:(document.querySelector('#card h2')||{}).textContent||'',log:document.getElementById('log').textContent,
    guard:window.__ovGuard?Math.round(__ovGuard.left()):0,menu:vis(document.getElementById('mDig')),ores:run?run.pouch.length:0,ore:state?state.activeOre:-1,glass:state?state.glassUses|0:0,drill:state&&state.kit?state.kit.drill:null,
    inv:(()=>{if(!state||!state.finds||state.over)return'';try{const ex=exposedFinds(),L=trayList(),bad=[];if(ex.length>TRAY.loose)bad.push('loose '+ex.length);if(L.length>TRAY.n)bad.push('tray '+L.length);
      if(!state.sealing&&ex.some(f=>f.ord==null))bad.push('a loose find with no age');const o=ex.map(f=>f.ord).filter(v=>v!=null);if(new Set(o).size!==o.length)bad.push('two finds share an age');
      if(state.finds.some(f=>f.crumb&&!(f.banked&&f.lost)))bad.push('a crumbled find is not gone');if(L.some(f=>ex.indexOf(f)<0))bad.push('tray holds a find that is not loose');
      const sm=document.getElementById('sealS').textContent,m=/Tray (\d+)\/6/.exec(sm);if(m&&+m[1]!==L.length&&!state.sealing)bad.push('button says '+m[1]+', tray has '+L.length);
      return bad.join('; ')}catch(e){return'invariant check threw: '+e.message}})(),loose:state&&state.finds?exposedFinds().length:0,tp:run&&run.st?run.st.tp|0:0,cr:run&&run.st?run.st.cr|0:0}});
const fp=c=>[c.title,c.ov,c.panel,c.pause,c.over,c.i,c.crack,c.banked,c.lives,c.taps,c.dirtSum,c.card,c.menu,c.share,c.tool,c.lk].join('|');
(async()=>{const report={runs:[],nodig:[],stuck:[],errors:[],inv:[]};
  for(let r=0;r<RUNS;r++){
    const [w,h]=VPS[r%VPS.length];const {page,errors,ctx}=await H.open(FILE,{w,h,init:PDLOG,won:r%3!==2}); // two profiles in three have cleared a tomb; the third plays under the first-tomb rules
    let s=(SEED0+r)*2654435761>>>0;const R=()=>(s=(Math.imul(s,1664525)+1013904223)>>>0)/4294967296;
    await page.waitForTimeout(1200);
    const kinds={},stat={digTaps:0,dug:0,nodig:0,bones:0,runsEnded:0,chambers:new Set(),maxI:0};let lastFp='',same=0,stuckHit=false;
    const note=k=>kinds[k]=(kinds[k]||0)+1;
    for(let a=0;a<ACTS&&!stuckHit;a++){
      const c=await ctxOf(page);
      if(c.inv){report.inv.push({run:r,action:a,inv:c.inv});if(report.inv.length>40)break}stat.maxLoose=Math.max(stat.maxLoose|0,c.loose);stat.tp=Math.max(stat.tp|0,c.tp);stat.crSum=(stat.crSum|0);if(c.cr>(stat.crLast|0))stat.crSum+=c.cr-(stat.crLast|0);stat.crLast=c.cr;
      const f=fp(c);if(f===lastFp)same++;else{same=0;lastFp=f}
      if(c.panel.includes('bn'))stat.bones++;stat.maxI=Math.max(stat.maxI,c.i);
      if(same>=120){ // nothing has changed for 120 actions: try the obvious ways forward before calling it stuck
        const way=await page.evaluate(()=>[...document.querySelectorAll('button')].filter(b=>b.offsetParent!==null&&!b.disabled).map(b=>(b.id||b.className||'?')+':'+b.textContent.trim().slice(0,18)).slice(0,30));
        // probe: what is really under the HUD buttons, and does a real tap on Pick change the tool?
        const probe=await page.evaluate(()=>{const o={};['#pick','#hammer','#seal','#pause','#c'].forEach(q=>{const e=document.querySelector(q),r=e.getBoundingClientRect(),t=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);o[q]={at:[Math.round(r.left+r.width/2),Math.round(r.top+r.height/2)],top:t?(t.id||t.className||t.tagName)+'<'+(t.parentNode&&(t.parentNode.id||t.parentNode.className||t.parentNode.tagName)):'none',dis:!!e.disabled}});
          o.fixed=[...document.querySelectorAll('body *')].filter(e=>{const cs=getComputedStyle(e);return cs.position==='fixed'&&cs.display!=='none'&&cs.visibility!=='hidden'&&e.offsetWidth>50&&e.offsetHeight>50}).map(e=>(e.id||e.className)+':'+getComputedStyle(e).zIndex+':'+getComputedStyle(e).pointerEvents+':'+getComputedStyle(e).opacity).slice(0,12);
          o.pause=JSON.stringify(PAUSE).slice(0,120);o.tool=tool;o.aim=typeof aimGet==='function'&&aimGet()?[aimGet().x,aimGet().y]:null;o.body=document.body.className;o.pd=__pd.slice(-4);return o});
        // proof of progress: do what a player would do. Tap one dirt tile twice with the pick (twice covers Confirm digs, where the first tap only aims).
        await page.locator('#pick').tap({timeout:800,force:true}).catch(e=>{probe.pickTapError=String(e).slice(0,120)});await page.waitForTimeout(120);
        const tile=await page.evaluate(()=>{for(let y=ROWS-1;y>=0;y--)for(let x=0;x<COLS;x++){const o=state.owner[y][x],f=o>=0?state.finds[o]:null;if(state.dirt[y][x]>0&&!(f&&f.sarc)){const r=document.getElementById('c').getBoundingClientRect();return{x,y,px:r.left+(x+.5)*cell,py:r.top+(y+TOP+.5)*cell,sum:state.dirt.reduce((a,r)=>a+r.reduce((b,v)=>b+v,0),0)}}}return null});
        let recovered=false;
        if(tile){await H.tapXY(page,tile.px,tile.py);await page.waitForTimeout(160);await H.tapXY(page,tile.px,tile.py);await page.waitForTimeout(250);
          const now=await ctxOf(page);probe.afterDoubleTap={dirtSum:now.dirtSum,was:tile.sum,over:now.over,ov:now.ov,panel:now.panel};recovered=now.dirtSum<tile.sum||now.over||now.ov||!!now.panel||now.i!==c.i}
        else{const now=await ctxOf(page);recovered=fp(now)!==f;probe.noDirt=true}
        report.stuck.push({run:r,action:a,ctx:c,buttons:way,probe,verdict:recovered?'NOT STUCK: tapping a dirt tile twice dug it. The random taps had simply not hit the same tile twice (Confirm digs was on: '+c.confirm+')':'STUCK'});
        if(recovered){same=0;lastFp='';report.stuck[report.stuck.length-1].false=true;continue}
        stuckHit=true;break}
      const covered=c.title||c.ov||c.share||c.pause||c.panel;
      const x=R();
      if(c.title){ // title: Dig (or sometimes the Daily)
        await page.waitForTimeout(250);const b=page.locator(R()<.85?'#title button.tl-dig':'#title .tl-c.daily').first();if(await b.count())await b.tap({timeout:2000}).catch(()=>{});note('title');await page.waitForTimeout(200);continue}
      if(covered||c.menu){ // a card, menu, pause sheet, share sheet or luck panel: tap one of its visible, enabled controls (or, sometimes, anywhere)
        if(x<.08){await H.tapXY(page,5+R()*(w-10),5+R()*(h-10));note('anywhere');continue}
        const n=await page.evaluate(([q])=>{const root=document.getElementById('shareSheet')||(!document.getElementById('overlay').hidden&&document.getElementById('overlay'))||document.getElementById('lkp')||document.body;
          const bs=[...root.querySelectorAll('button,[role=button],[role=radio],.chest,.tl-c,.got,.tab,input[type=range],select')].filter(b=>b.offsetParent!==null&&!b.disabled);
          // never leave the game or wipe the profile by accident: skip links out and the reset button
          const ok=bs.filter(b=>!/reset|erase|delete/i.test(b.textContent)&&!/reset/i.test(b.id||''));if(!ok.length)return null;
          // favour the way forward so runs get deep: primary buttons three times as likely
          const pri=ok.filter(b=>/^(go|dig|bngo|mDig|just|pYes|rvno|lkno|lkyes)$/.test(b.id||''));const pick=(pri.length&&q[0]<.55)?pri[Math.floor(q[1]*pri.length)]:ok[Math.floor(q[1]*ok.length)];
          const r=pick.getBoundingClientRect();pick.scrollIntoView({block:'nearest'});const r2=pick.getBoundingClientRect();return{x:r2.left+r2.width/2,y:r2.top+r2.height/2,id:pick.id||pick.className}},[[R(),R()]]);
        if(n&&n.x>=0&&n.y>=0&&n.x<w&&n.y<h){await H.tapXY(page,n.x,n.y);note(c.panel.includes('bn')?'bone-button':c.panel?'knucklebone-button':'card-button')}else{await H.tapXY(page,w/2,h*0.3+R()*h*0.5);note('card-anywhere')}
        await page.waitForTimeout(c.panel?70:130);continue}
      if(!c.hasState){await page.waitForTimeout(100);continue}
      if(x<.07){const ids=['#pick','#hammer','#special','#pouchBtn','#strip','#speed'];await page.locator(ids[Math.floor(R()*ids.length)]).tap({timeout:800,force:true}).catch(()=>{});note('hud');continue}
      if(x<.14&&!(process.env.FUZZ_HOLD&&R()<.92)){await page.locator('#seal').tap({timeout:800,force:true}).catch(()=>{});note('seal');await page.waitForTimeout(60);continue} // FUZZ_HOLD=1: hardly ever seals, so walls fill past nine loose finds and the crumble is hit often
      if(x<.17){const o=page.locator('#pouch .ore:visible');const n=await o.count();if(n)await o.nth(Math.floor(R()*n)).tap({timeout:800,force:true}).catch(()=>{});note('ore');continue}
      if(x<.185){await page.locator(R()<.5?'#walk':'#pause').tap({timeout:800,force:true}).catch(()=>{});note('walk/pause');continue}
      if(x<.21){await H.tapXY(page,5+R()*(w-10),5+R()*(h-10));note('anywhere');continue}
      if(x<.30){const q=await page.evaluate(([u])=>{const ex=exposedFinds();if(!ex.length)return null;const f=ex[Math.floor(u*ex.length)],c=f.cells[0],r=document.getElementById('c').getBoundingClientRect();return{px:r.left+(c[0]+.5)*cell,py:r.top+(c[1]+TOP+.5)*cell}},[R()]);if(q){await H.tapXY(page,q.px,q.py);note('tray-tap');continue}}
      // a wall tile: mostly ones with dirt, sometimes any
      const t=await page.evaluate(([q])=>{const cs=[];for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++)if(q[2]<.9?state.dirt[y][x]>0:true)cs.push([x,y]);if(!cs.length)return null;const [x,y]=cs[Math.floor(q[0]*cs.length)];
        const cv=document.getElementById('c'),r=cv.getBoundingClientRect(),px=r.left+(x+.2+q[1]*.6)*cell,py=r.top+(y+TOP+.2+q[3]*.6)*cell,el=document.elementFromPoint(px,py),o=state.owner[y][x],f=o>=0?state.finds[o]:null;
        return{x,y,px,py,el:el?(el.id||el.tagName):'none',dirt:state.dirt[y][x],sarc:!!(f&&f.sarc&&!f.banked),strikes:state.strikes|0,taps:RS().taps,dirtSum:state.dirt.reduce((a,r)=>a+r.reduce((b,v)=>b+v,0),0),t:performance.now(),rect:[Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height)],cell:Math.round(cell*100)/100,log:document.getElementById('log').textContent}},[[R(),R(),R(),R()]]);
      if(!t){note('bare');await page.locator('#seal').tap({timeout:500,force:true}).catch(()=>{});continue}
      const should=!c.over&&!c.lk&&(c.tool==='pick'||c.tool==='hammer')&&!c.feed&&t.dirt>0&&!t.sarc&&t.el==='c';
      await H.tapXY(page,t.px,t.py);note('wall');
      if(should){stat.digTaps++;
        const after=await page.evaluate(([x,y,px,py])=>{const cv=document.getElementById('c'),r=cv.getBoundingClientRect(),el=document.elementFromPoint(px,py),ut=document.getElementById('uitoast'),ur=ut?ut.getBoundingClientRect():null;
          return{dirt:state.dirt[y]?state.dirt[y][x]:-1,taps:RS().taps,strikes:state.strikes|0,dirtSum:state.dirt.reduce((a,r)=>a+r.reduce((b,v)=>b+v,0),0),i:state.i,over:state.over,log:document.getElementById('log').textContent,t:performance.now(),
            toolNow:typeof tool==='string'?tool:'',pd:__pd.slice(-2),rect:[Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height)],cell:Math.round(cell*100)/100,elNow:el?(el.id||el.className||el.tagName):'none',
            mapsTo:[Math.floor((px-r.left)/cell),Math.floor((py-r.top)/cell)-TOP],holdOpen:typeof hold!=='undefined'&&!!hold,toast:ur&&ur.width?[Math.round(ur.left),Math.round(ur.top),Math.round(ur.width),Math.round(ur.height),getComputedStyle(ut).pointerEvents,getComputedStyle(ut).opacity]:null,sealing:!!state.sealing,lk:LK.busy,pause:PAUSE.on}},[t.x,t.y,t.px,t.py]);
        const dug=after.dirtSum<t.dirtSum||after.i!==c.i||(after.over&&!c.over);
        if(dug)stat.dug++;else{stat.nodig++;
          const reached=after.taps>t.taps; // did the tap reach act() at all?
          const lastPd=after.pd[after.pd.length-1],gotEvent=!!lastPd&&lastPd.t>=Math.floor(t.t)-1,moved=JSON.stringify(after.rect)!==JSON.stringify(t.rect)||after.cell!==t.cell;
          let why=c.confirm?'Confirm digs is on (first tap only aims)'
            :!reached&&!gotEvent?'NO POINTERDOWN reached the page'
            :!reached&&lastPd.id!=='c'?'the tap landed on another element: '+lastPd.id
            :!reached&&moved?'the wall moved or resized between aiming and the tap (layout change), so the tap missed the tile'
            :!reached&&(after.pause||after.lk)?'a pause sheet or luck panel opened in the same instant'
            :!reached?'REACHED THE CANVAS BUT NOT act(): UNEXPLAINED'
            :c.sealing||after.sealing?'a seal was being counted (strike() ignores taps while state.sealing)'
            :/out of rope|out of bit|is spent|only tool|retires|left to dig|Dig the rest/i.test(after.log)?'the tool or the tile refused, and said so: '+after.log
            :(after.toolNow!==c.tool||/X-ray|Lodestone|blast/i.test(after.log))&&after.log!==t.log?'the tap before it had armed a one-shot tool (its click landed after this tap was aimed), so this tap used that tool instead: '+after.log
            :c.clearing||c.qbusy?'the chamber was ending (queue busy)':'UNEXPLAINED';
          report.nodig.push({run:r,action:a,why,reachedHandler:reached,tile:[t.x,t.y],tapAt:[Math.round(t.px),Math.round(t.py)],dirtBefore:t.dirt,dirtAfter:after.dirt,ms:Math.round(after.t-t.t),toast:after.log.slice(0,90),toastBefore:t.log.slice(0,60),pointerdowns:after.pd,canvasBefore:t.rect,canvasAfter:after.rect,cellBefore:t.cell,cellAfter:after.cell,elementNow:after.elNow,tapMapsToTile:after.mapsTo,holdOpen:after.holdOpen,uitoast:after.toast,ctx:{tool:c.tool,kit:c.kit,sealing:c.sealing,clearing:c.clearing,falling:c.falling,qbusy:c.qbusy,lk:c.lk,lkmode:c.lkmode,pause:c.pause,confirm:c.confirm,feed:c.feed,guardLeft:c.guard,crack:c.crack,i:c.i,train:c.train,ore:c.ore,glass:c.glass,drill:c.drill}})}}
      if(a%7===0)await page.waitForTimeout(30);
    }
    const end=await ctxOf(page);const errs=errors.slice();errs.forEach(e=>report.errors.push({run:r,e}));
    const sc=await H.noScroll(page);
    report.runs.push({run:r,vp:w+'x'+h,actions:ACTS,kinds,digTaps:stat.digTaps,dug:stat.dug,noDig:stat.nodig,boneActions:stat.bones,deepestChamber:stat.maxI+1,maxLoose:stat.maxLoose|0,trayTaps:stat.tp|0,crumbles:stat.crSum|0,pageErrors:errs.length,scrollOk:sc.ok,endState:{title:end.title,card:end.card.slice(0,40),over:end.over,i:end.i}});
    console.log(JSON.stringify(report.runs[report.runs.length-1]));
    await ctx.close();
  }
  const un=report.nodig.filter(n=>/UNEXPLAINED|NO POINTERDOWN/.test(n.why));const odd=report.nodig.filter(n=>!n.reachedHandler&&!/Confirm digs/.test(n.why));const by={};report.nodig.forEach(n=>{const k=n.why.replace(/: .*$/,'');by[k]=(by[k]||0)+1});
  console.log('taps that should dig but did not:',report.nodig.length,JSON.stringify(by));un.slice(0,12).forEach(n=>console.log(' UNEXPLAINED',JSON.stringify(n)));odd.slice(0,10).forEach(n=>console.log(' NEVER REACHED act()',JSON.stringify(n)));
  report.stuck.forEach(s=>console.log(' STUCK',JSON.stringify(s).slice(0,900)));report.errors.slice(0,10).forEach(e=>console.log(' ERROR',JSON.stringify(e).slice(0,600)));
  fs.writeFileSync(path.join(__dirname,process.env.FUZZ_OUT||'fuzz-report.json'),JSON.stringify(report,null,1));
  report.inv.slice(0,10).forEach(e=>console.log(' TRAY RULE BROKEN',JSON.stringify(e)));
  const realStuck=report.stuck.filter(x=>!x.false);const fail=report.errors.length||realStuck.length||report.inv.length;
  console.log((fail?'FUZZ FAIL':'FUZZ PASS')+`: ${RUNS} runs x ${ACTS} actions, ${report.errors.length} page errors, ${report.inv.length} tray-rule breaks, ${realStuck.length} stuck (${report.stuck.length-realStuck.length} false alarms probed), ${report.nodig.length} no-dig taps (${un.length} unexplained)`);
  await H.close();process.exit(fail?1:0)})().catch(e=>{console.error(e);process.exit(1)});
