#!/usr/bin/env python3
# Builds work/sprint16/build.html (v1.0-rc10) from work/tray/build.html (v1.0-tray1, md5 8e42b5f5...).
# Every edit is an exact string replacement with a checked count, so a changed base fails loudly instead of half-applying.
#   python3 work/sprint16/ed.py
# The balance numbers live in ONE block below (TUNE). LOG.md lists every number changed, old -> new.
import hashlib, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', 'tray', 'build.html')
OUT = os.path.join(HERE, 'build.html')
s = open(SRC, encoding='utf-8').read()
assert hashlib.md5(s.encode('utf-8')).hexdigest() == '8e42b5f50349556f81e1631f2f252557', 'base is not tray1'
N = [0]
def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count:
        sys.exit('EDIT %d: expected %d, found %d: %r' % (N[0] + 1, count, n, old[:90]))
    s = s.replace(old, new); N[0] += 1
def frag(name):
    return open(os.path.join(HERE, 'src', name), encoding='utf-8').read()

# ================================================================ TUNE: every balance number of this sprint
exec(open(os.path.join(HERE, 'tune.py'), encoding='utf-8').read())

# ================================================================ 1. back to the main save namespace, version, no test tag
rep('S15T_', 'rw_', s.count('S15T_'))
rep("/profile_tray');", "/profile');")
rep("const GAME_VERSION='v1.0-tray1';", "const GAME_VERSION='v1.0-rc10';")
rep('<title>Grave Goods: Tray Test</title>', '<title>Grave Goods</title>')
rep('/* ---- TRAY TEST (v1.0-tray1) ---- */\n#trayTag{position:fixed;left:50%;top:calc(1px + env(safe-area-inset-top));transform:translateX(-50%);z-index:2147483000;pointer-events:none;padding:1px 7px 0;border-radius:0 0 5px 5px;background:#7a1620;color:#ffe9a8;font:700 9px/13px var(--display);letter-spacing:.12em;white-space:nowrap;box-shadow:0 0 0 1px #000;opacity:.94}\n',
    '/* ---- the finds tray (v1.0-rc10) ---- */\n')
rep('<div id="trayTag" aria-label="Test build: tray rule, version 1.0 tray 1">TRAY TEST &middot; v1.0-tray1</div>\n', '')
rep('TRAY TEST (v1.0-tray1): a finds tray', 'THE FINDS TRAY (v1.0-rc10): a finds tray')
rep('// TRAY TEST: ', '// rc10: ', s.count('// TRAY TEST: '))

# ================================================================ 2. the bare-wall rule (owner ruling 5): one free bare-wall exit per chamber, then it costs a Memory
# run.bx[i] = bare walls already taken in chamber i. It lives on the run, so it is saved and resumed with it. state.bare: 1 = the free one, 2 = one that costs.
rep('''log("The wall is bare and there is nothing left to seal. It comes down anyway, and a bare wall costs nothing.");state.bare=1;collapse();return true}''',
    '''run.bx=run.bx||{};const paid=!state.train&&(run.bx[state.i]|0)>=BARE.free;run.bx[state.i]=(run.bx[state.i]|0)+1;log(paid?"The wall is bare again. This chamber has had its free bare wall, so this one costs a Memory.":"The wall is bare and there is nothing left to seal. It comes down anyway. The first bare wall of a chamber costs nothing; the next one costs a Memory.");if(!paid&&!state.train&&bareCoach())uiToast('A bare wall costs nothing once a chamber. The next one costs a Memory.',5200);state.bare=paid?2:1;collapse();return true}
const BARE={free:1,coach:3}; // rc10: bare walls a chamber that cost nothing; times the coaching line is shown to a profile
function bareCoach(){try{const o=JSON.parse(Store.get('rw_traycoach')||'{}')||{};const n=o.bare|0;if(n>=BARE.coach)return false;o.bare=n+1;Store.set('rw_traycoach',JSON.stringify(o));return true}catch(e){return false}}
function bareLeft(){return !!(state&&run&&!state.train&&((run.bx||{})[state.i]|0)<BARE.free)}''')
rep("let saved='';if(state.bare){saved='bare'}else if(mercyTake())", "let saved='';if(state.bare===1){saved='bare'}else if(mercyTake())")
rep('''saved==='bare'?" · a bare wall costs nothing":""}''', '''saved==='bare'?" · the first bare wall of a chamber costs nothing":state.bare?" · a second bare wall costs a Memory":""}''')
rep('<h2>${state.walked?"You walked away":"The wall collapsed"}<small><span id="adMl">', '<h2>${state.walked?"You walked away":state.bare?"The wall was bare":"The wall collapsed"}<small><span id="adMl">')
# what can still be done on a wall with no dirt left: say what a bare wall will cost here
rep("return short?'No dirt left: '+a.join(' · '):'No dirt is left on this wall. From here: '+a.join(', or ')+'.'}",
    "return short?'No dirt left: '+a.join(' · '):'No dirt is left on this wall. From here: '+a.join(', or ')+'.'+(bareLeft()?'':' This chamber has had its free bare wall: an empty wall now costs a Memory.')}")
# resume: a damaged or edited record cannot carry a negative or absurd count
rep("    r.tries=num(r.tries)&&r.tries>=0?Math.floor(r.tries):0;r.train=false;\n",
    "    r.tries=num(r.tries)&&r.tries>=0?Math.floor(r.tries):0;r.train=false;\n    {const b={};if(r.bx&&typeof r.bx==='object'&&!Array.isArray(r.bx))Object.keys(r.bx).forEach(k=>{if(/^\\d{1,2}$/.test(k)&&num(r.bx[k])&&r.bx[k]>0)b[k]=Math.min(99,Math.floor(r.bx[k]))});r.bx=b}\n")

# ================================================================ 3. polish carried over from the tray log
# 3a. the crumble has its own sound: a dry snap, a pot going to pieces, grit settling, and two falling notes
rep("SND.warn=(t,o,d,O)=>{const l=o.lvl||1;", """SND.crumble=(t,o,d,O)=>{const j=.94+Math.random()*.12; // rc10: a find gives way
  nzz(t,.035,'bandpass',3400*j,5,1200,.36,d,.001);tn(t,'square',2100*j,520,.045,.07,d,.001);
  for(let k=0;k<10;k++){const tt=t+.09+k*.05*(.7+Math.random()*.6);nzz(tt,.05,'bandpass',Math.max(500,2700-k*210+aRnd(-200,200)),5,0,aRnd(.07,.15),d,.001,aRnd(-.6,.6))}
  tn(t+.08,'sine',150*j,46,.32,.3,d,.004);nzz(t+.32,.6,'lowpass',700,.6,140,.13,d,.03,0,true);
  try{tn(t+.14,'sine',392,392,.24,.08,d,.003).connect(O.rvS);tn(t+.34,'sine',311,311,.5,.09,d,.003).connect(O.rvS)}catch(e){}
  auDuck(.7,.06,.2)};
SND.warn=(t,o,d,O)=>{const l=o.lvl||1;""")
rep("const SND_HI=new Set(['relic',", "const SND_HI=new Set(['crumble','relic',")
rep("if(gone.length){try{sfx('dig',{mat:3,big:true,n:2});hap([30,40,60]);", "if(gone.length){try{sfx('crumble',{n:gone.length});hap([30,40,60]);")

# 3b. a loose find is at least 44 px to tap: a tap just outside a find that is drawn smaller than that (28 px tiles in landscape) still moves it on or off the tray
rep("const TRAY={n:6,loose:9,x:3,coach:3};", "const TRAY={n:6,loose:9,x:3,coach:3,tap:44};")
rep("function pos(e){const r=cv.getBoundingClientRect();return{x:Math.floor((e.clientX-r.left)/cell),y:Math.floor((e.clientY-r.top)/cell)-TOP}}",
    "function pos(e){const r=cv.getBoundingClientRect(),px=e.clientX-r.left,py=e.clientY-r.top-TOP*cell;let x=Math.floor(px/cell),y=Math.floor(py/cell);const n=trayNear(px,py,x,y);return n?{x:n[0],y:n[1],near:1}:{x,y}}")
rep("function trayTap(cx,cy){", """function trayNear(px,py,x,y){ // rc10: the loose find a tap at wall pixel (px,py) was meant for, when it landed up to (44 - tile)/2 px outside it. A tap inside a find, a shut sarcophagus or off the wall is never moved.
  try{const m=(TRAY.tap-cell)/2;if(!(m>0)||!state||!state.finds||x<0||y<0||x>=COLS||y>=ROWS||trayAt(x,y)||sarcAt(x,y))return null;
    let best=null,bd=1e9;
    for(let yy=Math.max(0,y-1);yy<=Math.min(ROWS-1,y+1);yy++)for(let xx=Math.max(0,x-1);xx<=Math.min(COLS-1,x+1);xx++){if(!trayAt(xx,yy))continue;
      const dx=Math.abs(px-(xx+.5)*cell),dy=Math.abs(py-(yy+.5)*cell),d=Math.max(dx,dy);if(d<=cell/2+m&&d<bd){bd=d;best=[xx,yy]}}
    return best}catch(e){return null}}
function trayTap(cx,cy){""")

# 3c. toasts never sit over the tool buttons: while a wall is on screen the toast sits over the foot of the wall (taps pass through it)
rep("  el.textContent=msg;el.hidden=false;el.style.animation='none';void el.offsetWidth;el.style.animation='';\n",
    """  el.textContent=msg;el.hidden=false;
  try{const dig=!!state&&_title===null&&document.getElementById('overlay').hidden,r=dig?cv.getBoundingClientRect():null; // rc10
    if(r&&r.width>120&&r.bottom>0){const tag=document.getElementById('looseTag'),low=tag&&!tag.hidden&&tag.getBoundingClientRect().bottom>r.bottom-40?30:0;
      el.style.left=Math.round(r.left+r.width/2)+'px';el.style.bottom=Math.round(Math.max(8,innerHeight-r.bottom+8+low))+'px';el.style.maxWidth=Math.round(r.width-12)+'px';el.style.width='max-content'}
    else{el.style.left='';el.style.bottom='';el.style.maxWidth='';el.style.width=''}}catch(e){}
  el.style.animation='none';void el.offsetWidth;el.style.animation='';
""")

# 3d. a find about to crumble is labelled, and a relic about to crumble cannot be missed
rep("  if(old){crackOn(old,1,1);rim(old,rm||(frame>>4)%2?'#ff6a4d':'#7a1620',Math.max(2,cell*.07))}\n",
    """  if(old){crackOn(old,1,1);const hot=rm||(frame>>4)%2;
    if(old.relic){rim(old,'#000',Math.max(6,cell*.2));rim(old,hot?'#ff3b30':'#ffd44a',Math.max(4,cell*.13));ctx.fillStyle=hot?'rgba(255,59,48,.22)':'rgba(255,212,74,.12)';old.cells.forEach(([x,y])=>ctx.fillRect(x*cell,y*cell,cell,cell))}
    else rim(old,hot?'#ff6a4d':'#7a1620',Math.max(2,cell*.07));
    const xs=old.cells.map(q=>q[0]),ys=old.cells.map(q=>q[1]),x0=Math.min(...xs)*cell,x1=(Math.max(...xs)+1)*cell,y0=Math.min(...ys)*cell,y1=(Math.max(...ys)+1)*cell; // rc10: the words, so nobody has to guess what the crack means
    const txt=old.relic?'★ RELIC CRUMBLES NEXT':'CRUMBLES NEXT',fs=Math.max(10,Math.round(cell*(old.relic?.3:.26)));ctx.save();ctx.font='900 '+fs+'px Cinzel, Georgia, serif';ctx.textAlign='center';ctx.textBaseline='middle';
    const tw=ctx.measureText(txt).width+10,lx=Math.min(COLS*cell-tw/2-2,Math.max(tw/2+2,(x0+x1)/2)),ly=y0>=fs*1.7?y0-fs*.85:y1+fs*.85;
    ctx.fillStyle=old.relic?'#7a1620':'rgba(18,8,6,.92)';ctx.fillRect(lx-tw/2,ly-fs*.75,tw,fs*1.5);ctx.strokeStyle=old.relic?'#ffd44a':'#ff6a4d';ctx.lineWidth=old.relic?2:1;ctx.strokeRect(lx-tw/2+.5,ly-fs*.75+.5,tw-1,fs*1.5-1);ctx.fillStyle=old.relic?'#ffe9a8':'#ffb09a';ctx.fillText(txt,lx,ly+1);ctx.restore()}
""")
# a relic that becomes the oldest of nine is announced every time (not three times a profile, like the plain coaching line)
rep("""    if(trayCoach('cr'))uiToast('No room on the wall. The '+gone[0].name+', your oldest loose find, crumbled. Seal a tray to make room.',5200)}""",
    """    if(trayCoach('cr'))uiToast('No room on the wall. The '+gone[0].name+', your oldest loose find, crumbled. Seal a tray to make room.',5200);
    trayRelicWarn()}""")
rep("""    if(n===TRAY.loose){if(trayCoach('nine'))uiToast('Nine loose finds. The wall has room for no more. Uncover a tenth and the oldest crumbles.',5200)}""",
    """    if(n===TRAY.loose){if(!trayRelicWarn()&&trayCoach('nine'))uiToast('Nine loose finds. The wall has room for no more. Uncover a tenth and the oldest crumbles.',5200)}""")
rep("function trayGoneMsg(g){", """function trayRelicWarn(){const o=state.train?null:trayOldest();if(!o||!o.relic||state.relicWarned===o.id)return false;state.relicWarned=o.id; // a Pyrite decoy is warned about like the relic it pretends to be
  uiToast('★ The '+o.name+' is your oldest loose find. Uncover one more and it crumbles. Seal it first.',6000);try{hap([20,30,20,30,60]);sfx('warn',{lvl:2})}catch(e){}
  setTimeout(()=>{try{if(state&&!state.over)log('★ The '+o.name+' is the oldest of nine loose finds. One more find and it crumbles. Seal a tray with it on.')}catch(e){}},60);return true}
function trayGoneMsg(g){""")

# 3e. coaching that still taught the old rule
rep("'This wall asks more than any seal you have made. Hold your finds: a bigger seal pays more than three small ones.'",
    "'This wall asks more than any seal you have made. Fill the tray before you seal: six finds make a Hoard, and a Hoard doubles the Fame.'")

# ================================================================ 4. upgrade from rc9b (rw_ keys, old rule): see src/migrate.js
rep("})();\nlet COLS=9;const ROWS=10,TOP=2;", "})();\n" + frag('migrate.js') + "let COLS=9;const ROWS=10,TOP=2;")
rep("function reloadFromStore(){\n", "function reloadFromStore(){\n  try{rc10Migrate()}catch(e){} // a cloud copy written by rc9b comes over the same way\n")
rep("function resetProfile(){\n  try{Store.wipe()}catch(e){}ecoReset();", "function resetProfile(){\n  try{Store.wipe()}catch(e){}try{Store.set(RC10.flag,'1')}catch(e){}ecoReset();")
# the saved dig carries a new version number: a record written under the old rule is never laid over a new wall
rep("const rec={v:1,t:Date.now(),", "const rec={v:2,t:Date.now(),")
rep("ok=typeof z==='object'&&!Array.isArray(z)&&z.v===1&&!!z.run", "ok=typeof z==='object'&&!Array.isArray(z)&&z.v===2&&!!z.run")
# the Stats page shows the old-rule bests as old
rep("  const bsS=S.bs?`${S.bsw} × ${S.bsf}${S.bsn?' · '+S.bsn:''}`:'none sealed yet';\n",
    "  const old=rc10Old()||{};\n  const bsS=(S.bs?`${S.bsw} × ${S.bsf}${S.bsn?' · '+S.bsn:''}`:'none sealed yet')+(old.bs?' · under the old rule: '+fmtN(old.bs)+' in old digits':'');\n")
rep("${cell1('Best banked',fmtN(S.best),'one run, all chambers')}", "${cell1('Best banked',fmtN(S.best),old.best?'old rule: '+fmtN(old.best)+', old digits':'one run, all chambers')}")
# the note, once, at the first menu after the upgrade
rep("syncTop();paint();\nwindow.S14={paint,setOpen,setPouch,state:S};\n})();\n",
    "syncTop();paint();\nwindow.S14={paint,setOpen,setPouch,state:S};\n})();\n(function(){const _sm=showMenu;showMenu=function(){const a=arguments,t=this;try{if(rc10Note()&&rc10NoteCard(()=>showMenu.apply(t,a)))return}catch(e){console.error(e)}return _sm.apply(t,a)}})();\n")

# ================================================================ 5. the first tomb (a profile that has never cleared a tomb): the seal waits for a full tray, and chamber 3 asks less
rep("function sarcAt(x,y){", """// ===================== rc10: THE FIRST TOMB =====================
// Why: the plain new-player bot (seals the moment anything shows) cleared 0.5 in 100 tombs. It spent its three free seals on single finds at Fame x1 and died in chamber 3.
// Lower targets alone did not help it (3 in 100 at two thirds of the target); holding the seal for a full tray did. Both rules end with the profile's first cleared tomb. Never on the Daily.
const FT={tray:FT_TRAY_,red:.8,t3:FT_T3_,coach:3};
function ftWon(){try{return (ST.wins|0)>0||(bestGet().wins|0)>0||Object.keys(PROG.tombs.c||{}).length>0}catch(e){return true}}
function ftRun(){return !!(run&&!run.train&&(run.tomb|0)===0&&stakeN()===1&&!s15Daily()&&!ftWon())}
function sealHeld(){ // the Quartermaster keeps his hand on the seal until the tray is full. He lets go in the red, at nine loose finds, and when no dirt is left.
  return !!(state&&state.ft&&!state.train&&!state.over&&trayList().length<FT.tray&&exposedFinds().length<TRAY.loose&&state.crack<maxCrack()*FT.red&&dirtLeft())}
function ftCoach(){try{const o=JSON.parse(Store.get('rw_traycoach')||'{}')||{};const n=o.ft|0;if(n>=FT.coach)return false;o.ft=n+1;Store.set('rw_traycoach',JSON.stringify(o));return true}catch(e){return false}}
function sarcAt(x,y){""".replace("FT_TRAY_", str(FT_TRAY)).replace("FT_T3_", str(FT_T3)))
rep("""  if(!ex.length){log("The tray is empty. Tap a find to put it on the tray.");return}
  if(skillPaid()){skillPayCard();return}""", """  if(!ex.length){log("The tray is empty. Tap a find to put it on the tray.");return}
  if(sealHeld()){const n=ex.length;log("Not yet. On your first tomb the Quartermaster stamps a full tray: "+n+" of "+FT.tray+" so far. He lets go when the wall is in the red, when nine finds lie loose, or when the dirt is gone.");
    if(ftCoach())uiToast("Fill the tray first: six finds make a Hoard, and a Hoard doubles the Fame. In the red you may seal what you have.",5600);hap(6);sfx('tap');return}
  if(skillPaid()){skillPayCard();return}""")
rep("(i===1&&SKILL.ch2T1&&tombN()===1)?SKILL.ch2T1:TARGETS_BASE[i];\n  else{run.tb=run.tb||{};",
    "(i===1&&SKILL.ch2T1&&tombN()===1)?SKILL.ch2T1:(i===2&&FT.t3&&FT.t3<TARGETS_BASE[2]&&ftRun())?FT.t3:TARGETS_BASE[i];\n  else{run.tb=run.tb||{};")
# the chamber knows it is a first-tomb chamber (saved with the wall, so a resumed dig keeps the rule it started with)
rep("function progState(i,TELL){ // the chamber's state exists now\n", "function progState(i,TELL){ // the chamber's state exists now\n  state.ft=ftRun()?1:0;\n  if(state.ft&&i===2&&FT.t3<TARGETS_BASE[2])setTimeout(()=>{try{if(state&&state.i===2&&!state.over&&!(state.strikes|0))log('Your first tomb: this chamber asks '+fmtN(TARGETS[2])+', not '+fmtN(TARGETS_BASE[2])+'. Once you have cleared a tomb it asks the full sum.')}catch(e){}},320);\n")
# the Seal button says so
rep("{const tn=trayList().length,tt=tn?'Tray '+tn+'/'+TRAY.n:'';sm.textContent=sack?", "{const tn=trayList().length,tt=tn?'Tray '+tn+'/'+TRAY.n:'';if(sealHeld()&&tn){sm.textContent=tt+' · fill it'}else sm.textContent=sack?")

# ================================================================ 6. class spread: the two weakest hammers cost a little less crack
rep('d:"Hammer clears 4×4 for 26 crack. Pick is clumsy and cracks 1.5.",pickDmg:1,pickCrack:1.5,hamR:1,hamDmg:3,hamCrack:26,', 'd:"Hammer clears 4×4 for %d crack. Pick is clumsy and cracks 1.5.",pickDmg:1,pickCrack:1.5,hamR:1,hamDmg:3,hamCrack:%d,' % (BRUTE_HAM, BRUTE_HAM))
rep('brute:{d:"Hammer clears 4×4 for 26 crack. The pick is clumsy: 1.5 crack."}', 'brute:{d:"Hammer clears 4×4 for %d crack. The pick is clumsy: 1.5 crack."}' % BRUTE_HAM)
rep("fence:{extraOffers:1,swaps:1,stealMult:.5,pickDmg:1,pickCrack:1,hamR:1,hamDmg:2,hamCrack:12}", "fence:{extraOffers:1,swaps:1,stealMult:.5,pickDmg:1,pickCrack:1,hamR:1,hamDmg:2,hamCrack:%d}" % FENCE_HAM)

open(OUT, 'w', encoding='utf-8').write(s)
print('edits:', N[0], ' bytes:', len(s.encode('utf-8')), ' md5:', hashlib.md5(s.encode('utf-8')).hexdigest())
