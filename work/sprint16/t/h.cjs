// Sprint 15b harness: loads a build file by path in Chromium, taps with a touchscreen, drives seeded runs.
const path=require('path');
let chromium;try{({chromium}=require('/home/claude/.npm-global/lib/node_modules/playwright'))}catch(e){({chromium}=require('playwright'))} // the repo's own node_modules copy does not match the installed browser, so the global one is tried first
const DIR=path.resolve(__dirname,'..');
const BUILD=path.join(DIR,'build.html'),RC9A=path.resolve(DIR,'../../game/current.html'),MAIN=RC9A;
const GUARD=1100;
let _b=null;
async function browser(){return _b||(_b=await chromium.launch())}
async function close(){if(_b){await _b.close();_b=null}}
// open(file,{w,h,rm,storage}) -> {page,ctx,errors}
async function open(file,o={}){
  const b=await browser();
  const ctx=o.ctx||await b.newContext({viewport:{width:o.w||390,height:o.h||844},deviceScaleFactor:1,isMobile:false,hasTouch:true,reducedMotion:o.rm?'reduce':'no-preference'});
  if(!o.ctx)await ctx.addInitScript(o.fresh?'':`try{for(const k of ['rw_train'])if(!localStorage.getItem(k))localStorage.setItem(k,'1')}catch(e){}`);
  if(!o.ctx&&o.init)await ctx.addInitScript(o.init);
  if(!o.ctx)await ctx.addInitScript(`window.__vib=[];window.__vibEarly=[];(()=>{let tapped=false;addEventListener('pointerdown',()=>{tapped=true},true);try{navigator.vibrate=function(p){if(!tapped)window.__vibEarly.push(p);window.__vib.push([Math.round(performance.now()),p]);return true}}catch(e){}})();`); // headless Chromium refuses vibrate, so the calls are recorded instead; __vibEarly holds any made before the first tap (a real browser logs an error for those)
  const page=await ctx.newPage(),errors=[];await page.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.fulfill({status:200,contentType:'text/css',body:''}));
  page.on('pageerror',e=>errors.push('pageerror: '+e.message+'\n'+(e.stack||'').split('\n').slice(0,4).join('\n')));
  page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text())});
  // The game file is a bare fragment with no charset line. Opened from disk, Chromium guesses the encoding, and under heavy CPU load it sometimes guessed wrong (hearts and dots turned to mojibake in screenshots).
  // The real hosts wrap the fragment in a page that declares UTF-8, so the harness serves the file with that header. Same file, same quirks mode, same storage.
  {const F=path.resolve(file);await page.route('file://'+F,r=>r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:require('fs').readFileSync(F)}))}
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
    try{LK.log.length=0}catch(e){} // the boot screen builds a wall from a clock seed and may have logged its tell; the record starts with this run
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
module.exports={chromium,browser,close,open,tap,tapXY,startSeeded,wallSig,cellXY,BUILD,RC9A,MAIN,DIR,GUARD};
// the score sheet opens over the top rows of the wall for a moment after a seal: if it covers the tile about to be tapped, shut it the way a player does (tap the strip)
const clearWay=async(page,p)=>{for(let k=0;k<3;k++){const el=await page.evaluate(p=>{const e=document.elementFromPoint(p.x,p.y);return e?e.id||e.className||e.tagName:''},p);if(el==='c')return true;if(await page.locator('#strip:visible').count()&&await page.evaluate(()=>document.getElementById('strip').getAttribute('aria-expanded')==='true'))await page.locator('#strip').tap().catch(()=>{});await page.waitForTimeout(600)}return false};
// ---- reading helpers
// uncover the first unopened sarcophagus (setup, direct), return a cell of it
const bareSarc=page=>page.evaluate(()=>{try{luckSlipHide()}catch(e){}const f=state.finds.find(f=>f.sarc&&!f.banked);if(!f)return null;f.cells.forEach(([x,y])=>state.dirt[y][x]=0);ui();draw();return f.cells[0]});
// open it with a real tap on the wall
async function tapSarc(page){const c=await bareSarc(page);if(!c)return false;await page.evaluate(()=>{if(typeof setTool==='function')setTool('pick')});const p=await cellXY(page,c[0],c[1]);await page.waitForTimeout(80);await clearWay(page,p);await tapXY(page,p.x,p.y);await page.waitForSelector('#lkp.bn',{timeout:3000});return true}
// force the next sarcophagus roll (screenshots only; never used by the parity or fairness tests)
const forceSarc=(page,r)=>page.evaluate(r=>{const o=s9SarcRoll;s9SarcRoll=function(){const R=o();s9SarcRoll=o;return{r,hit:false,sul:R.sul}}},r);
const boneStep=async(page,wait)=>{await page.locator('#bngo').tap();await page.waitForTimeout(wait==null?700:wait)};
const boneInfo=page=>page.evaluate(()=>{const p=document.getElementById('lkp');if(!p)return null;return{cls:p.className,btn:p.querySelector('#bngo').textContent,dis:p.querySelector('#bngo').disabled,cap:p.querySelector('#bncap').textContent,rows:[...p.querySelectorAll('.bn-reg li')].map(l=>({k:l.dataset.k,pct:l.querySelector('b').textContent,rev:l.classList.contains('bn-rev')?l.querySelector('em').textContent:null,out:l.classList.contains('bn-out'),hit:l.classList.contains('bn-hit'),side:l.closest('.bn-col').querySelector('h4').textContent[0]})),tag:p.querySelector('#bntag').textContent,fast:!!p.querySelector('#bnfast')}});
const noScroll=page=>page.evaluate(()=>({sw:document.documentElement.scrollWidth,iw:innerWidth,ok:document.documentElement.scrollWidth<=innerWidth}));
// the first seed prefix+N whose first wall really has a sarcophagus (the tests never fake one)
const _sarcSeeds={};
async function sarcSeed(page,prefix,keep){ // probing starts throwaway runs, so the page is relaunched clean and the chosen seed is started once (unless keep: the caller starts it)
  let seed=_sarcSeeds[prefix];
  if(!seed){for(let k=0;k<80&&!seed;k++){const s=prefix+k;await startSeeded(page,s);if(await page.evaluate(()=>state.finds.some(f=>f.sarc)))seed=s}if(!seed)throw new Error('no sarcophagus seed found for '+prefix);_sarcSeeds[prefix]=seed;
    await page.evaluate(()=>{try{S15.hold=true;S11.clear()}catch(e){}});await page.reload(); // hold: the page's own pagehide save must not write the throwaway run back
    await page.evaluate(()=>{try{S11.clear()}catch(e){}});await page.reload();await page.waitForFunction(()=>typeof newChamber==='function'&&typeof S11==='object');await page.waitForTimeout(300)}
  if(!keep)await startSeeded(page,seed);return seed}
// "The app is closed and opened again." Headless Chromium on file:// sometimes drops ALL of localStorage across page.reload() (measured: 3 of 30 with rc9a, 6 of 30 with this build,
// every key already gone when the new document starts, no removeItem call), so a relaunch here is explicit: fire the page's own pagehide handlers (the game saves there),
// copy localStorage out, close the context, and boot a new one with that storage in place before the game's script runs.
async function relaunch(o,file,opt){
  const dump=await o.page.evaluate(()=>{window.dispatchEvent(new Event('pagehide'));const d={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);d[k]=localStorage.getItem(k)}return d});
  await o.ctx.close();
  const n=await open(file,Object.assign({},opt,{init:`(()=>{try{if(!sessionStorage.getItem('__restored')){const d=${JSON.stringify(dump)};for(const k in d)localStorage.setItem(k,d[k]);sessionStorage.setItem('__restored','1')}}catch(e){}})();`+((opt&&opt.init)||'')}));
  n.dump=dump;return n}
// after a relaunch the title is up; the Dig button resumes the saved run (the game's S11.take)
async function resumeFromTitle(page){await page.waitForTimeout(GUARD+300);await page.locator('#title button.tl-dig').tap();
  await page.waitForFunction(()=>typeof _title!=='undefined'&&_title===null&&!!state&&!!run&&!!run.tid&&document.getElementById('overlay')!==null,null,{timeout:8000});await page.waitForTimeout(900)}
Object.assign(module.exports,{clearWay,relaunch,resumeFromTitle,sarcSeed,bareSarc,tapSarc,forceSarc,boneStep,boneInfo,noScroll});
