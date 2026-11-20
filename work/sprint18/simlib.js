// Page-side half of the tray-build simulator. It is injected into the REAL build (work/tray/build.html) after it has loaded,
// and plays whole runs by calling the build's own functions (newChamber, strike, trayTap, seal, the card buttons).
// Nothing about the rules is re-implemented here: walls, Worth, Fame, crack, the red-line rolls, the tray, the crumble, chests,
// Memories and targets are whatever the build does. Only the clock is fake (sim.js installs it before the game boots), so a seal's
// two-second tally costs no real time. What IS made up here: the five players (see POL) and how they tap.
(function(){
const MAIN=typeof TRAY==='undefined',PRE=(typeof GAME_VERSION==='string'&&/tray1/.test(GAME_VERSION))?'S15T_':'rw_'; // the same players can be run on the main build (old seal rule) for a baseline
if(MAIN){window.TRAY={n:99,loose:99};window.trayList=ex=>ex||exposedFinds();window.trayTap=()=>false;window.trayTick=()=>[]}
const SIM=window.SIM={res:null,stuck:[],unknown:{},rec:false,trace:[]};
const REAL=!!window.__SIM_REAL; // sim.cjs verify: the page that replays a recorded run with real taps loads this file only for start(); nothing in the build is replaced there
const rec=e=>{if(SIM.rec)SIM.trace.push(e)};
const sig=()=>[state.i,run.banked,run.lives,Math.round(state.crack*100)/100,exposedFinds().length,state.dirt.reduce((a,r)=>a+r.reduce((b,v)=>b+v,0),0),state.sealed,state.finds.filter(f=>f.lost).length,rngState>>>0].join(',');
SIM.sig=sig;
const $=id=>document.getElementById(id);
// ---------------------------------------------------------------- run plumbing
function profile(novice){ // the same profile before every run, so runs do not leak into each other
  try{Object.keys(localStorage).forEach(k=>{if(k.indexOf(PRE)===0)localStorage.removeItem(k)})}catch(e){}
  [PRE+'train',PRE+'tut',PRE+'first'].forEach(k=>{try{localStorage.setItem(k,'1')}catch(e){}});
  try{localStorage.setItem(PRE+'traycoach',JSON.stringify({six:9,nine:9,cr:9}))}catch(e){}
  _mercy=novice?0:SKILL.mercy.free;                       // a seasoned profile has used its free collapses; the new player still has both
  ST.chambers=novice?1:50;ST.wins=novice?0:5;                // the first-tomb rules (seal held for a full tray, softer chamber 3) end with the first cleared tomb                                // frSoft(): only a profile that has cleared nothing gets the soft first target
  if(novice)try{localStorage.removeItem(PRE+'first')}catch(e){}
}
function start(o){
  SIM.res=null;SIM.o=o;SIM.trace=[];SIM.ends={bare:0,col:0,walk:0};SIM.ch=[];SIM.best=0;SIM.seals=0;SIM.strikes=0;SIM.walls=0;
  if(!o.keep)profile(o.pol==='novice'||o.fresh);
  try{if(_title)_title.done()}catch(e){}
  try{LK.log.length=0}catch(e){}
  cls=CLASSES[o.cls];gear=GEAR[0];relic=o.relic?{name:o.relic,state:'hungry'}:null; // o.relic: one Vault relic equipped, never fed (the cheapest piece of a real player's kit to add)
PROG.sel={tomb:o.tomb||1,stake:o.stake||1,tool:'standard'};
  statsStart(o.cls);TARGETS.length=3;run=newRun(o.seed);run.train=false;$('overlay').hidden=true;
  try{if(typeof _kit2==='object'&&_kit2)_kit2.tool='standard';if(typeof kitRunInit==='function')kitRunInit()}catch(e){}
  s10RunStart({fresh:false,g:gear,tl:'standard',k:o.cls,st:PROG.sel.stake,tb:PROG.sel.tomb,daily:false});
  newChamber(0);
}
function clickable(b){return b&&!b.disabled&&!b.hidden&&b.offsetParent!==null}
function card(){ // something covers the wall: do what a player who wants to get on with the dig does
  const c=$('card'),q=s=>c.querySelector(s);
  __vt.flush(1300); // every card ignores taps for its first second
  if(SIM.res)return;
  const chest=[...c.querySelectorAll('.chest')].find(clickable),go=q('#go');
  if(clickable(go)){rec({a:'c',sel:'#go'});go.click();return}
  if(chest){rec({a:'c',sel:'.chest'});chest.click();__vt.flush(3000);return}
  for(const s of ['#spn','#oskip','#bmSkip','#lkno','#rvno','#pNo','#back','#ok','#skip','#close'])/* not yet, leave the ore, leave the Market, decline */if(clickable(q(s))){rec({a:'c',sel:s});q(s).click();return}
  const bs=[...c.querySelectorAll('button')].filter(clickable);
  const key=(c.querySelector('.tbar')||{}).textContent+'|'+bs.map(b=>b.id||'btn').join(',');SIM.unknown[key]=(SIM.unknown[key]|0)+1;
  // an unlisted card: the last button is the way out on every card this game has (leave, not now, continue)
  if(bs.length){rec({a:'c',sel:'button',last:1});bs[bs.length-1].click()}
}
function settle(){ // run the clock and clear whatever is in the way, until the bot can act again or the run has ended
  for(let k=0;k<400;k++){
    __vt.flush(120);
    if(SIM.res)return false;
    const lp=$('lkp');
    if(lp){__vt.flush(700);const b=['#bnfast','#bngo','#lkno'].map(s=>lp.querySelector(s)).find(clickable)||[...lp.querySelectorAll('button')].find(clickable);if(b){rec({a:'l',sel:b.id?'#'+b.id:'button'});b.click()}else __vt.flush(600);continue}
    if(!$('overlay').hidden){card();continue}
    if(!state)return false;
    if(state.sealing||Q.busy||state.clearing||LK.busy||state.over){__vt.flush(400);continue}
    if(LK.timers.size){__vt.flush(200);continue} // a luck moment is on its way (the second bone comes out 0.7 s after the fourth Fever): the players here wait for it, as the replay with real taps does
    return true;
  }
  SIM.stuck.push({o:SIM.o,i:state&&state.i,over:state&&state.over,ov:!$('overlay').hidden,card:$('card').textContent.slice(0,80),lk:!!$('lkp'),q:Q.busy});
  SIM.res={win:false,stuck:true};return false;
}
// ---------------------------------------------------------------- what a player can see
const open=(x,y)=>state.dirt[y][x]===0;
const isEx=f=>!f.banked&&!f.sarc&&f.cells.every(([x,y])=>open(x,y));
const crackPct=()=>state.crack/maxCrack();
function dirtCells(){const o=[];for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++)if(state.dirt[y][x]>0)o.push([x,y]);return o}
function looseCell(x,y){const o=state.owner[y][x];return o>=0&&isEx(state.finds[o])} // a tap here is a tray tap, not a dig
function planAt(x,y){return strikePlan(x,y)} // the game's own preview: the patch, the crack it costs, the tiles it hits
function bestHammer(R,noise){ // the patch that hits the most dirt (the centre may not be a loose find: that tap moves it on or off the tray)
  setTool('hammer');if(tool!=='hammer')return null;let best=null,bs=-1;
  for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){if(looseCell(x,y)||sarcAt(x,y))continue;const p=planAt(x,y);if(!p||!p.hit||p.idle)continue;const s=p.hit+(noise?R()*noise:0);if(s>bs){bs=s;best={x,y,p}}}
  return best}
function partials(){ // covered tiles of finds that already show a tile: the player can see where the rest of it lies
  const o=[];state.finds.forEach(f=>{if(f.banked||f.sarc)return;const cov=f.cells.filter(([x,y])=>!open(x,y));if(cov.length&&cov.length<f.cells.length)cov.forEach(c=>o.push(c))});return o}
function glints(){ // a relic glints through one layer of dirt
  const o=[];state.finds.forEach(f=>{if(!f.relic||f.banked)return;f.cells.forEach(([x,y])=>{if(state.dirt[y][x]===1)o.push([x,y])})});return o}
function shutSarc(){return state.finds.find(f=>f.sarc&&!f.banked&&f.cells.every(([x,y])=>open(x,y)))}
// ---------------------------------------------------------------- hands
function hit(x,y){SIM.strikes++;rec({a:'s',t:tool,x,y});strike(x,y)}
function ttap(x,y){rec({a:'t',x,y});return trayTap(x,y)}
function digHuman(R,slip){ // mis-taps, uses the hammer on fresh ground and the pick to finish what shows, never touches an ore or the class skill
  const dc=dirtCells();if(!dc.length)return false;
  const red=crackPct()>=.8;
  const sc=shutSarc();if(sc&&state.crack+12<maxCrack()*.8){hit(sc.cells[0][0],sc.cells[0][1]);return true}
  let t=null;
  if(R()<slip){const c=dc[Math.floor(R()*dc.length)];setTool(R()<.5?'pick':'hammer');if(looseCell(c[0],c[1])||tool==='hammer'&&red)setTool('pick');t=c} // a mis-tap: some dirt tile, whatever tool is in hand
  else{
    const pa=partials().concat(glints());
    if(pa.length&&(R()<.75||red)){setTool('pick');t=pa[Math.floor(R()*pa.length)]}
    else{const h=red?null:bestHammer(R,1.5),area=h?(h.p.x1-h.p.x0+1)*(h.p.y1-h.p.y0+1):9;
      if(h&&h.p.hit>=Math.ceil(area*.55)&&state.crack+h.p.crack<maxCrack()*.8){t=[h.x,h.y]}
      else{setTool('pick');const sh=dc.filter(([x,y])=>state.dirt[y][x]===1),pool=pa.length?pa:sh.length&&R()<.7?sh:dc;t=pool[Math.floor(R()*pool.length)]}}
  }
  if(looseCell(t[0],t[1])){setTool('pick');t=dc[Math.floor(R()*dc.length)]}
  hit(t[0],t[1]);return true}
function digHammer(){ // the hammer bot: hammer only, never a wrong tile
  const sc=shutSarc();if(sc&&state.crack+12<maxCrack()*.85){hit(sc.cells[0][0],sc.cells[0][1]);return true}
  const h=bestHammer(null,0);if(h){hit(h.x,h.y);return true}
  setTool('pick');const dc=dirtCells().filter(([x,y])=>!looseCell(x,y));if(!dc.length)return false;hit(dc[0][0],dc[0][1]);return true} // (a spent Glass Hammer, or a kit that has none)
function digNovice(R){ // taps dirt more or less at random, mostly with the pick; opens every sarcophagus
  const dc=dirtCells();if(!dc.length)return false;
  const sc=shutSarc();if(sc){hit(sc.cells[0][0],sc.cells[0][1]);return true}
  const pa=partials(),c=pa.length&&R()<.5?pa[Math.floor(R()*pa.length)]:dc[Math.floor(R()*dc.length)];
  setTool(R()<.3?'hammer':'pick');if(looseCell(c[0],c[1]))setTool('pick');hit(c[0],c[1]);return true}
// ---------------------------------------------------------------- choosing six
function setTray(want){ // put exactly these finds on the tray, with the game's own tray taps
  const W=new Set(want);
  for(let pass=0;pass<4;pass++){
    exposedFinds().forEach(f=>{if(!W.has(f)&&trayList().indexOf(f)>=0)ttap(f.cells[0][0],f.cells[0][1])});
    exposedFinds().forEach(f=>{if(W.has(f)&&trayList().indexOf(f)<0)ttap(f.cells[0][0],f.cells[0][1])});
    const L=trayList();if(L.length===W.size&&L.every(f=>W.has(f)))return true}
  return false}
function choose(){ // "picks a good six": every way of splitting the loose finds into this tray and the next, scored by the game's own score()
  const ex=exposedFinds(),n=ex.length;if(n<=1)return;
  const k=Math.min(TRAY.n,n);let best=null,bv=-1;
  const rec=(i,cur)=>{if(cur.length===k){const rest=ex.filter(f=>cur.indexOf(f)<0),v=score(cur).total+(rest.length&&state.sealed+1<skillBudget()?score(trayList(rest)).total:0);if(v>bv){bv=v;best=cur.slice()}return}
    if(i>=n||cur.length+(n-i)<k)return;cur.push(ex[i]);rec(i+1,cur);cur.pop();rec(i+1,cur)};
  rec(0,[]);
  if(n<=TRAY.n){ // six or fewer: is it better to hold some back for the next seal?
    for(let m=1;m<(1<<n)-1;m++){const a=ex.filter((f,j)=>m>>j&1),b=ex.filter((f,j)=>!(m>>j&1));if(a.length<3||!(state.sealed+1<skillBudget()))continue;const v=score(a).total+score(b).total;if(v>bv*1.02){bv=v;best=a}}}
  if(best)setTray(best)}
// ---------------------------------------------------------------- when to seal
function held(){try{return typeof sealHeld==='function'&&!!sealHeld()}catch(e){return false}}
function freeLeft(){return skillBudget()-state.sealed}
function canFree(){return exposedFinds().length>0&&!sackSpent()&&!skillPaid()}
function doSeal(pick){if(pick)choose();const t=score(trayList()).total;if(t>SIM.best)SIM.best=t;SIM.seals++;rec({a:'seal'});seal()}
function endgame(o,R){ // out of free seals and the target not met
  const need=TARGETS[state.i]-chBank(),t=score(trayList()).total;
  if(skillPaid()&&exposedFinds().length&&t>=need&&run.lives>SKILL.seals.memory){ // a paid seal that clears the chamber is worth a Memory
    SIM.seals++;if(t>SIM.best)SIM.best=t;rec({a:'seal'});seal();__vt.flush(1300);const c=$('card').querySelector('#spy');if(!$('overlay').hidden&&c){rec({a:'c',sel:'#spy'});c.click();__vt.flush(600);const c2=$('card').querySelector('#spy');if(!$('overlay').hidden&&c2){rec({a:'c',sel:'#spy',again:1});c2.click()} /* a paid button wants two taps */return true}return false}
  return false}
const POL={
  // Early sealer: seals when the tray looks full (six loose), or when the wall is nearly gone. Never chooses.
  early:{hands:'human',slip:.12,seal:()=>canFree()&&(exposedFinds().length>=6||crackPct()>=.85)},
  // Holder, no choosing: waits for the red bar, then taps Seal until nothing is left to seal. Takes the default six.
  hold:{hands:'human',slip:.12,seal:()=>canFree()&&crackPct()>=.8},
  // Holder who will not lose a find to the nine-find limit: seals the default six when nine lie loose, otherwise waits for the red bar. (Extra row.)
  hold9:{hands:'human',slip:.12,seal:()=>canFree()&&(crackPct()>=.8||(exposedFinds().length>=TRAY.loose&&freeLeft()>1))},
  // Holder who chooses: the same timing, but picks the six.
  pick:{hands:'human',slip:.12,pick:true,seal:()=>canFree()&&crackPct()>=.8},
  // Holder who chooses and will not lose a find to the nine-find limit: also seals a chosen tray when nine lie loose. (Extra row: the proposal has no such player.)
  pick9:{hands:'human',slip:.12,pick:true,seal:()=>canFree()&&(crackPct()>=.8||(exposedFinds().length>=TRAY.loose&&freeLeft()>1))},
  // Hammer bot: hammer only, no mis-taps, seals at 85% crack. Never chooses.
  hammer:{hands:'hammer',seal:()=>canFree()&&crackPct()>=.85},
  // New player: seals the moment anything is uncovered, as long as a free seal is left.
  novice:{hands:'novice',seal:()=>canFree()&&exposedFinds().length>0&&!held()}, // held(): the Seal button is shut by the game itself (the first-tomb guard); the bot presses it the moment it opens
};
function step(o,R){
  const P=POL[o.pol];
  if(chWon()){checkClear();return} // (the game does this by itself a moment after the seal lands)
  if(P.seal()){doSeal(P.pick);return}
  const dug=P.hands==='hammer'?digHammer():P.hands==='novice'?digNovice(R):digHuman(R,P.slip);
  if(dug)return;
  // no dirt left
  if(canFree()){doSeal(P.pick);return}
  if(endgame(o,R))return;
  const sc=shutSarc();if(sc){hit(sc.cells[0][0],sc.cells[0][1]);return}
  if(!bareCheck()){rec({a:'walk'});walkAway()}
}
function mulb(a){return function(){a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
SIM.run=function(o){ // one whole run. o: {seed,cls,tomb,stake,pol}
  const R=mulb(hashStr('bot|'+o.seed+'|'+o.pol));
  start(o);
  let maxI=0,guard=0,wallId=null,first=null;
  while(guard++<6000){
    if(!settle())break;
    rec({a:'cp',sig:sig()});
    if(state.i>maxI)maxI=state.i;
    if(wallId!==state){ // a new wall
      if(wallId&&first===null)first=null;wallId=state;SIM.walls++}
    // out of free seals, target not met, nothing to gain: the endgame (a paid seal that clears, else dig on to the end of the wall)
    if(!canFree()&&!chWon()&&endgame(o,R))continue;
    step(o,R);
  }
  const r=SIM.res||{win:false,timeout:true};
  return{eb:state?Math.round(chBank()):0,ei:state?state.i:-1,ef:state&&TARGETS[state.i]?Math.min(1,chBank()/TARGETS[state.i]):0,et:state?TARGETS[state.i]:0,w:r.win?1:0,ch:r.win?CHN():maxI,c1:maxI>=1||r.win?1:0,c2:maxI>=2||r.win?1:0,best:SIM.best,seals:SIM.seals,strikes:SIM.strikes,walls:SIM.walls,cr:(RS().cr|0),bare:SIM.ends.bare,col:SIM.ends.col,walk:SIM.ends.walk,banked:run.banked,stuck:r.stuck?1:0,to:r.timeout?1:0,lives:run.lives};
};
SIM.start=start;
SIM.batch=function(o,seeds){const out=[];for(const s of seeds){
  if(o.seq){ // one profile, o.seq runs in a row: the profile is made once and then left alone, so free collapses, the soft first wall and any first-tomb easing run out as they would for a person
    let won=0;const r0={seq:[]};for(let k=0;k<o.seq;k++){const r=SIM.run(Object.assign({},o,{seed:s+'#'+k,keep:k>0}));
      if(!r.w)try{s16RunLost()}catch(e){} // the build counts a lost run in showSummary, which the simulator replaces
      if(k===0)Object.assign(r0,r);r0.seq.push(r.w);if(r.w&&!won){won=k+1;break}}
    r0.won=won;out.push(r0)}
  else out.push(SIM.run(Object.assign({},o,{seed:s})))}return out};
if(REAL)return;
// the end of a run, win or lose, is the summary card: note it and do not build it
showSummary=function(kind){SIM.res={win:kind==='win'};try{$('overlay').hidden=true}catch(e){}};
{const _ec=endChamber;endChamber=function(win,lost){if(state&&!state.ended&&!win){if(state.bare)SIM.ends.bare++;else if(state.walked)SIM.ends.walk++;else SIM.ends.col++}return _ec.apply(this,arguments)}}
draw=function(){};                                         // nothing is painted
// The panel is not painted either. ui() in the build fills the clipboard, the buttons and the strip (5 ms a call, most of a run's time); the one thing in it that
// is a rule and not paint is trayTick(), kept here. `node sim.cjs verify` replays sim runs on the untouched build in real time to check that nothing else was lost.
ui=function(){trayTick()};
sfx=function(){};
try{S15.hold=true}catch(e){}                               // no autosave while simulating
try{SETTINGS.haptics=false}catch(e){}
})();
