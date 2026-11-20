#!/usr/bin/env python3
# Builds work/sprint18/build.html (v1.0-rc10a) from work/sprint16/build.html (v1.0-rc10, md5 42116621...).
# Every edit is an exact string replacement with a checked count, so a changed base fails loudly instead of half-applying.
#   python3 work/sprint18/ed.py
# No balance number changes here. Four fixes: (1) the play log's resume check reads record version 2, (2) telemetry for the tray rule,
# (3) Stake and bare-wall text written from SKILL.stakeT / SKILL.bare.free, (4) no seal slip for a run that carries the Looter's Sack.
import hashlib, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', 'sprint16', 'build.html')
OUT = os.path.join(HERE, 'build.html')
s = open(SRC, encoding='utf-8').read()
assert hashlib.md5(s.encode('utf-8')).hexdigest() == '421166210941d55e890a27378f833bea', 'base is not rc10'
DASH0 = s.count('—')
N = [0]
def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count:
        sys.exit('EDIT %d: expected %d, found %d: %r' % (N[0] + 1, count, n, old[:90]))
    s = s.replace(old, new); N[0] += 1

# ================================================================ 0. version
rep("const GAME_VERSION='v1.0-rc10';", "const GAME_VERSION='v1.0-rc10a';")

# ================================================================ 1. the play log: a dig that will resume is not closed as "interrupted" (the saved-dig record is version 2 since rc10)
rep("if(rz&&rz.v===1&&rz.tid===rec.id&&Date.now()-rz.t<14*864e5)return}", "if(rz&&rz.v===2&&rz.tid===rec.id&&Date.now()-rz.t<14*864e5)return}")

# ================================================================ 2. telemetry for the tray rule (same telEmit path as every other event: same buffer, same switch, same gg:tel hand-off)
# 2a. crumble: one row per find that crumbled. kind = the find's name (a game item, not a person), relic, chamber, loose = finds lying loose when it went.
rep("gone.forEach(f=>{f.banked=true;f.lost=true;f.crumb=1;delete f.tray;(state.crumbs=state.crumbs||[]).push({id:f.id,t0:performance.now()});RS().cr=(RS().cr|0)+1});",
    "gone.forEach(f=>{f.banked=true;f.lost=true;f.crumb=1;delete f.tray;(state.crumbs=state.crumbs||[]).push({id:f.id,t0:performance.now()});RS().cr=(RS().cr|0)+1;telTray('crumble',{kind:String(f.name||''),relic:!!f.relic,loose:ex.length})});")
# helpers, next to the tray code
rep("function traySealed(){state.finds.forEach(f=>{if(f.tray!=null)delete f.tray})}",
    """function telTray(name,d){try{if(run&&run.tid&&state&&!state.train)telEmit(name,Object.assign({chamber:state.i+1,wall_index:state.wn|0},d))}catch(e){}} // rc10a: rows for the tray rule
function telTrayPick(all,ex){ // rc10a: one row per seal, and only when the tray that is sealed is not the one the game would have laid out
  try{const def=new Set(trayList(all.map(f=>{const q=Object.assign({},f);delete q.tray;return q})).map(f=>f.id)),on=new Set(ex.map(f=>f.id));
    let put=0,held=0;on.forEach(id=>{if(!def.has(id))put++});def.forEach(id=>{if(!on.has(id))held++});
    if(put||held)telTray('tray_pick',{tray:ex.length,loose:all.length,put_on:put,held_back:held})}catch(e){}}
function traySealed(){state.finds.forEach(f=>{if(f.tray!=null)delete f.tray})}""")
# 2b. tray_pick: at the seal itself, before the finds are banked
rep("function sealGo(ex){\n  const s=score(ex);", "function sealGo(ex){\n  telTrayPick(exposedFinds(),ex);\n  const s=score(ex);")
# 2c. seal_held: the first-tomb guard refused a seal. One row per wall and tray count, so a thumb that hammers the button does not flood the log.
rep("""if(ftCoach())uiToast("Fill the tray first: six finds make a Hoard, and a Hoard doubles the Fame. In the red you may seal what you have.",5600);hap(6);sfx('tap');return}""",
    """if(ftCoach())uiToast("Fill the tray first: six finds make a Hoard, and a Hoard doubles the Fame. In the red you may seal what you have.",5600);hap(6);sfx('tap');
    {const k=(run.tid||'')+':'+state.i+':'+(state.wn|0)+':'+n;if(S10.shK!==k){S10.shK=k;telTray('seal_held',{tray:n,loose:all.length,crack_pct:Math.round(state.crack/maxCrack()*100)})}}return}""")
# 2d. bare_wall: free or charged (charged = it goes down the collapse path that costs a Memory; a free collapse or a relic may still cover it)
rep("state.bare=paid?2:1;collapse();return true}", "state.bare=paid?2:1;telTray('bare_wall',{charged:paid,nth:run.bx[state.i]|0});collapse();return true}")
# 2e. one field each on the rows that already exist: finds loose on the wall at the seal; finds crumbled on the wall the chamber ended on
rep("worth:s.worth,fame:s.fame,total:s.total,finds:ex.length,notes:(s.notes||[]).slice(0,6)});",
    "worth:s.worth,fame:s.fame,total:s.total,finds:ex.length,loose:ex.length+exposedFinds().length,notes:(s.notes||[]).slice(0,6)});")
rep("unsealed_lost_value:lv,memories_left:run.lives,", "unsealed_lost_value:lv,crumbled:state.finds.filter(f=>f.crumb).length,memories_left:run.lives,")

# ================================================================ 3. text written from the numbers
# 3a. Stake cards: the "Targets" part comes from SKILL.stakeT, read when the card is drawn
rep('''const STAKES=[
 {id:1,n:"Shallow Grave",rule:"The game as it stands.",leg:1,epic:2},
 {id:2,n:"Loose Mortar",rule:`In the red, the chances are ${LUCK.press.w.normal} / ${LUCK.press.w.lucky+SKILL.press2.lucky} / ${LUCK.press.w.tremor+SKILL.press2.tremor} in 100 (steady, loose stone, tremor).`,leg:1,epic:2},
 {id:3,n:"Thin Air",rule:"The wall holds 125 crack, not 150.",leg:2,epic:2},
 {id:4,n:"Hungry Dead",rule:"Relics start Dormant and need one feed to wake. The Blighted finish can turn up. Targets +5%.",leg:2,epic:3},
 {id:5,n:"Gilded Lies",rule:"Every chamber carries a Pyrite decoy relic. Chests hold 2 dust, not 1. Targets +10%.",leg:3,epic:3},
 {id:6,n:"The Long Dark",rule:"Targets +15%, the knucklebone is off, and a fourth chamber is mandatory.",leg:4,epic:3}
];''',
'''// rc10a: what a Stake does to the targets, as words, from SKILL.stakeT (so a remote change of the number changes the card). '' when it does nothing.
function stakeTgtTxt(id){const m=+SKILL.stakeT[id-1];if(!(m>0))return'';const p=Math.round((m-1)*1000)/10;return p>0?'Targets +'+p+'%':p<0?'Targets '+(-p)+'% lower':''}
const stakeRule=(id,base)=>{const t=stakeTgtTxt(id);return t?base+' '+t+'.':base};
const STAKES=[
 {id:1,n:"Shallow Grave",get rule(){return stakeRule(1,"The game as it stands.")},leg:1,epic:2},
 {id:2,n:"Loose Mortar",get rule(){return stakeRule(2,`In the red, the chances are ${LUCK.press.w.normal} / ${LUCK.press.w.lucky+SKILL.press2.lucky} / ${LUCK.press.w.tremor+SKILL.press2.tremor} in 100 (steady, loose stone, tremor).`)},leg:1,epic:2},
 {id:3,n:"Thin Air",get rule(){return stakeRule(3,"The wall holds 125 crack, not 150.")},leg:2,epic:2},
 {id:4,n:"Hungry Dead",get rule(){return stakeRule(4,"Relics start Dormant and need one feed to wake. The Blighted finish can turn up.")},leg:2,epic:3},
 {id:5,n:"Gilded Lies",get rule(){return stakeRule(5,"Every chamber carries a Pyrite decoy relic. Chests hold 2 dust, not 1.")},leg:3,epic:3},
 {id:6,n:"The Long Dark",get rule(){const t=stakeTgtTxt(6);return t?t+", the knucklebone is off, and a fourth chamber is mandatory.":"The knucklebone is off, and a fourth chamber is mandatory."},leg:4,epic:3}
];''')
rep("condition:s.id>1?{stake:s.id-1,perClass:true}:null,line:s.rule}));", "condition:s.id>1?{stake:s.id-1,perClass:true}:null,get line(){return s.rule}}));")

# 3b. bare-wall lines from SKILL.bare.free (0, 1, 2 or 3)
rep('''log(paid?"The wall is bare again. This chamber has had its free bare wall, so this one costs a Memory.":"The wall is bare and there is nothing left to seal. It comes down anyway. The first bare wall of a chamber costs nothing; the next one costs a Memory.");if(!paid&&!state.train&&bareCoach())uiToast('A bare wall costs nothing once a chamber. The next one costs a Memory.',5200);''',
    '''log(bareTxt(paid?'logPaid':'logFree'));if(!paid&&!state.train&&bareCoach())uiToast(bareTxt('coach'),5200);''')
rep("function bareLeft(){", '''// rc10a: every bare-wall line is written from BARE.free, so the words follow the number (0: every bare wall costs; 1: as rc10; 2 and up: "the first two", "twice")
function bareTxt(k){const n=Math.max(0,BARE.free|0),W=['no','one','two','three','four'][n]||String(n),X=['','once','twice','three times'][n]||n+' times',O=['','second','third','fourth'][n]||'further';
  if(n<1)return{logPaid:"The wall is bare and there is nothing left to seal. It comes down, and a bare wall costs a Memory.",logFree:"The wall is bare and there is nothing left to seal. It comes down anyway.",coach:"A bare wall costs a Memory.",
    cardFree:"a bare wall costs nothing here",cardPaid:"a bare wall costs a Memory",exits:" An empty wall costs a Memory.",how:"A wall dug bare, with nothing left to seal, comes down and costs a Memory."}[k];
  if(n===1)return{logPaid:"The wall is bare again. This chamber has had its free bare wall, so this one costs a Memory.",logFree:"The wall is bare and there is nothing left to seal. It comes down anyway. The first bare wall of a chamber costs nothing; the next one costs a Memory.",coach:"A bare wall costs nothing once a chamber. The next one costs a Memory.",
    cardFree:"the first bare wall of a chamber costs nothing",cardPaid:"a second bare wall costs a Memory",exits:" This chamber has had its free bare wall: an empty wall now costs a Memory.",how:"A wall dug bare, with nothing left to seal, comes down free once a chamber. The next bare wall costs a Memory."}[k];
  return{logPaid:"The wall is bare again. This chamber has had its "+W+" free bare walls, so this one costs a Memory.",logFree:"The wall is bare and there is nothing left to seal. It comes down anyway. The first "+W+" bare walls of a chamber cost nothing; the next one costs a Memory.",coach:"A bare wall costs nothing "+X+" a chamber. The next one costs a Memory.",
    cardFree:"the first "+W+" bare walls of a chamber cost nothing",cardPaid:"a "+O+" bare wall costs a Memory",exits:" This chamber has had its "+W+" free bare walls: an empty wall now costs a Memory.",how:"A wall dug bare, with nothing left to seal, comes down free "+X+" a chamber. The next bare wall costs a Memory."}[k]}
function bareLeft(){''')
rep('''saved==='bare'?" · the first bare wall of a chamber costs nothing":state.bare?" · a second bare wall costs a Memory":""}''',
    '''saved==='bare'?" · "+bareTxt('cardFree'):state.bare?" · "+bareTxt('cardPaid'):""}''')
rep("(bareLeft()?'':' This chamber has had its free bare wall: an empty wall now costs a Memory.')}", "(bareLeft()?'':bareTxt('exits'))}")
rep("{h:'Memories and walking away',t:'You have three Memories. A collapse costs one and takes everything unsealed with it; the very first one is on the house. Clearing a chamber gives one back. When the wall is spent, you can walk away: the wall stands, your bank stays, one Memory goes. A wall dug bare, with nothing left to seal, comes down free once a chamber. The next bare wall costs a Memory.',",
    "{h:'Memories and walking away',get t(){return 'You have three Memories. A collapse costs one and takes everything unsealed with it; the very first one is on the house. Clearing a chamber gives one back. When the wall is spent, you can walk away: the wall stands, your bank stays, one Memory goes. '+bareTxt('how')},")

# ================================================================ 4. no seal slip for a run that carries the Looter's Sack (the Sack fixes a chamber at two seals; the extra seal would do nothing)
rep("<button id=\"go\" hidden>Go deeper</button>${adSlip('seal')}</div>`;", "<button id=\"go\" hidden>Go deeper</button>${gear&&gear.id==='sack'?'':adSlip('seal')}</div>`;")

assert s.count('—') == DASH0, 'an em dash was added'
open(OUT, 'w', encoding='utf-8').write(s)
print('edits:', N[0], ' em dashes:', s.count('—'), '(base %d)' % DASH0, ' bytes:', len(s.encode('utf-8')), ' md5:', hashlib.md5(s.encode('utf-8')).hexdigest())
