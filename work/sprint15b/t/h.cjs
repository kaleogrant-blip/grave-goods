// Sprint 15b harness: loads a build file by path in Chromium, taps with a touchscreen, drives seeded runs.
const path=require('path');
let chromium;try{({chromium}=require('playwright'))}catch(e){({chromium}=require('/home/claude/.npm-global/lib/node_modules/playwright'))}
const DIR=path.resolve(__dirname,'..');
const BUILD=path.join(DIR,'build.html'),RC9A=path.join(DIR,'rc9a.html');
const GUARD=1100;
let _b=null;
async function browser(){return _b||(_b=await chromium.launch())}
async function close(){if(_b){await _b.close();_b=null}}
// open(file,{w,h,rm,storage}) -> {page,ctx,errors}
async function open(file,o={}){
  const b=await browser();
  const ctx=o.ctx||await b.newContext({viewport:{width:o.w||390,height:o.h||844},deviceScaleFactor:1,isMobile:false,hasTouch:true,reducedMotion:o.rm?'reduce':'no-preference'});
  if(!o.ctx)await ctx.addInitScript(o.fresh?'':`try{if(!localStorage.getItem('rw_train'))localStorage.setItem('rw_train','1')}catch(e){}`);
  if(!o.ctx&&o.init)await ctx.addInitScript(o.init);
  if(!o.ctx)await ctx.addInitScript(`window.__vib=[];try{navigator.vibrate=function(p){window.__vib.push([Math.round(performance.now()),p]);return true}}catch(e){}`); // headless Chromium refuses vibrate; record the calls instead
  const page=await ctx.newPage(),errors=[];await page.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.fulfill({status:200,contentType:'text/css',body:''}));
  page.on('pageerror',e=>errors.push('pageerror: '+e.message+'\n'+(e.stack||'').split('\n').slice(0,4).join('\n')));
  page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text())});
  await page.goto('file://'+path.resolve(file));
  await page.waitForFunction(()=>typeof newChamber==='function'&&typeof S11==='object');
  return{page,ctx,errors};
}
const tap=async(page,sel)=>{const el=typeof sel==='string'?page.locator(sel).first():sel;await el.tap()};
const tapXY=(page,x,y)=>page.touchscreen.tap(x,y);
// Start a seeded run without the menus (the same statements the Dig button runs). opts: cls, stake, tomb
async function startSeeded(page,seed,o={}){
  await page.evaluate(([seed,o])=>{
    try{if(_title)_title.done()}catch(e){}
    const k=o.cls||Object.keys(CLASSES)[0];cls=CLASSES[k];gear=GEAR[0];relic=null;
    PROG.sel={tomb:o.tomb||1,stake:o.stake||1,tool:'standard'};
    statsStart(k);TARGETS.length=3;run=newRun(seed);run.train=false;document.getElementById('overlay').hidden=true;
    try{if(typeof _kit2==='object'&&_kit2)_kit2.tool='standard';if(typeof kitRunInit==='function')kitRunInit()}catch(e){}
    s10RunStart({fresh:false,g:gear,tl:'standard',k,st:PROG.sel.stake,tb:PROG.sel.tomb,daily:false});
    newChamber(0);
  },[seed,o]);
}
// wall layout fingerprint
const wallSig=page=>page.evaluate(()=>JSON.stringify({i:state.i,d:state.dirt,f:state.finds.map(f=>[f.name,f.cells,f.sarc?1:0,f.relic?1:0,f.worth,f.age]),o:state.ores.map(o=>[o.x,o.y,o.type]),tell:state.tell||null,tg:TARGETS[state.i]}));
// screen coordinates of the centre of wall cell (x,y)
const cellXY=(page,x,y)=>page.evaluate(([x,y])=>{const c=document.getElementById('c'),r=c.getBoundingClientRect();return{x:r.left+(x+.5)*cell,y:r.top+(y+TOP+.5)*cell}},[x,y]);
module.exports={chromium,browser,close,open,tap,tapXY,startSeeded,wallSig,cellXY,BUILD,RC9A,DIR,GUARD};
// ---- reading helpers
// uncover the first unopened sarcophagus (setup, direct), return a cell of it
const bareSarc=page=>page.evaluate(()=>{try{luckSlipHide()}catch(e){}const f=state.finds.find(f=>f.sarc&&!f.banked);if(!f)return null;f.cells.forEach(([x,y])=>state.dirt[y][x]=0);ui();draw();return f.cells[0]});
// open it with a real tap on the wall
async function tapSarc(page){const c=await bareSarc(page);if(!c)return false;await page.evaluate(()=>{if(typeof setTool==='function')setTool('pick')});const p=await cellXY(page,c[0],c[1]);await page.waitForTimeout(80);await tapXY(page,p.x,p.y);await page.waitForSelector('#lkp.bn',{timeout:3000});return true}
// force the next sarcophagus roll (screenshots only; never used by the parity or fairness tests)
const forceSarc=(page,r)=>page.evaluate(r=>{const o=s9SarcRoll;s9SarcRoll=function(){const R=o();s9SarcRoll=o;return{r,hit:false,sul:R.sul}}},r);
const boneStep=async(page,wait)=>{await page.locator('#bngo').tap();await page.waitForTimeout(wait==null?700:wait)};
const boneInfo=page=>page.evaluate(()=>{const p=document.getElementById('lkp');if(!p)return null;return{cls:p.className,btn:p.querySelector('#bngo').textContent,dis:p.querySelector('#bngo').disabled,cap:p.querySelector('#bncap').textContent,rows:[...p.querySelectorAll('.bn-reg li')].map(l=>({k:l.dataset.k,pct:l.querySelector('b').textContent,rev:l.classList.contains('bn-rev')?l.querySelector('em').textContent:null,out:l.classList.contains('bn-out'),hit:l.classList.contains('bn-hit'),side:l.closest('.bn-col').querySelector('h4').textContent[0]})),tag:p.querySelector('#bntag').textContent,fast:!!p.querySelector('#bnfast')}});
const noScroll=page=>page.evaluate(()=>({sw:document.documentElement.scrollWidth,iw:innerWidth,ok:document.documentElement.scrollWidth<=innerWidth}));
Object.assign(module.exports,{bareSarc,tapSarc,forceSarc,boneStep,boneInfo,noScroll});
