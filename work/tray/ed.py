#!/usr/bin/env python3
# Builds work/tray/build.html (v1.0-tray1, the "tray of six, room for nine" test build) from game/current.html (v1.0-rc9b).
# Every edit is an exact string replacement with a checked count, so a changed base fails loudly instead of half-applying.
#   python3 work/tray/ed.py
import hashlib, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', '..', 'game', 'current.html')
OUT = os.path.join(HERE, 'build.html')
s = open(SRC, encoding='utf-8').read()
assert hashlib.md5(s.encode('utf-8')).hexdigest() == '6fd8da9d13ffa9be150ed06466b93888', 'base is not rc9b'
N = [0]
def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count:
        sys.exit('EDIT %d: expected %d, found %d: %r' % (N[0] + 1, count, n, old[:90]))
    s = s.replace(old, new); N[0] += 1

# ---------------------------------------------------------------- 1. its own save namespace, version, tag
rep('rw_', 'S15T_', s.count('rw_'))                       # every storage key of this build starts S15T_: it can never read or write a main-game (rw_) key
rep("/profile');", "/profile_tray');")                    # and its own cloud doc, should the runtime ever grant one
rep("const GAME_VERSION='v1.0-rc9b';", "const GAME_VERSION='v1.0-tray1';")
rep('<title>Grave Goods</title>', '<title>Grave Goods: Tray Test</title>')
rep('</style>', '''/* ---- TRAY TEST (v1.0-tray1) ---- */
#trayTag{position:fixed;left:50%;top:calc(1px + env(safe-area-inset-top));transform:translateX(-50%);z-index:2147483000;pointer-events:none;padding:1px 7px 0;border-radius:0 0 5px 5px;background:#7a1620;color:#ffe9a8;font:700 9px/13px var(--display);letter-spacing:.12em;white-space:nowrap;box-shadow:0 0 0 1px #000;opacity:.94}
#looseTag{position:absolute;right:6px;top:6px;z-index:3;pointer-events:none;padding:2px 8px;border-radius:3px;background:rgba(18,13,8,.9);color:#f0d27a;font:700 11px/16px var(--display);letter-spacing:.06em;box-shadow:0 0 0 1px #000,inset 0 0 0 1px #7d5f22;white-space:nowrap}
#looseTag[hidden]{display:none}
@media (orientation:landscape) and (max-height:560px){#looseTag{top:auto;bottom:6px}} /* the toast sits at the top of the wall in landscape */
#looseTag.near{color:#ffcf5a;box-shadow:0 0 0 1px #000,inset 0 0 0 1px #c9a24a}
#looseTag.full{background:#5a1218;color:#ffe9a8;box-shadow:0 0 0 1px #000,inset 0 0 0 1px #ff7a7f}
</style>''')
rep('<div id="purse" hidden', '<div id="looseTag" hidden role="status"></div><div id="purse" hidden')
rep('<div class="win hx">', '<div id="trayTag" aria-label="Test build: tray rule, version 1.0 tray 1">TRAY TEST &middot; v1.0-tray1</div>\n<div class="win hx">')

# ---------------------------------------------------------------- 2. numbers: targets, caps off, x3
rep('targets:[300,900,4500],', 'targets:[900,2700,9000],            // TRAY TEST: 300 / 900 / 3,000 (was 4,500), then every Worth and target x3')
rep("deepMul,i-2)*(stakeN()>=6&&i===3?SKILL.long4:1)/500)*500;", "deepMul,i-2)*(stakeN()>=6&&i===3?SKILL.long4:1)/1500)*1500;")
rep('cap:{fame:120,reward:1.5},', 'cap:{fame:Infinity,reward:Infinity}, // TRAY TEST: both caps off')
rep('ch2T1:400, ', 'ch2T1:1200,')
rep('firstReal:200, ', 'firstReal:600,')
rep('const FIRST={on:true,target:300};', 'const FIRST={on:true,target:900};')
rep('const TRAIN_T=30;', 'const TRAIN_T=90;')
rep('coin:{min:2500,', 'coin:{min:2700,')               # the proposal: "if the wager stays, lower to about 900"; x3
rep('    gold:500,\n', '    gold:1500,\n')
rep('const MEMFULL={points:25};', 'const MEMFULL={points:75};')
rep('25 points if you have all three.', '75 points if you have all three.')
rep('it is only 25 points.', 'it is only 75 points.')
rep('sealDiv:100, ', 'sealDiv:300, ')
rep('Math.floor(xb/100)*XP.hundred', 'Math.floor(xb/300)*XP.hundred')
rep('${XP.hundred} per 100 banked', '${XP.hundred} per 300 banked', 3)
rep('cyrus:{flat:8}', 'cyrus:{flat:24}')
rep("if(pw('Draupnir')){worth+=3*list.length;notes.push('Draupnir +'+3*list.length)}", "if(pw('Draupnir')){worth+=3*TRAY.x*list.length;notes.push('Draupnir +'+3*TRAY.x*list.length)}")
rep('"Every find sealed drips +3."', '"Every find sealed drips +9."')
rep('"Every sealed find drips +3 worth."', '"Every sealed find drips +9 worth."')
rep('sieve:{pyrite:5}', 'sieve:{pyrite:15}')
rep("PROG_DATA.gear.sieve.pyrite:1}", "PROG_DATA.gear.sieve.pyrite:TRAY.x}")
rep('${PROG_DATA.gear.sieve.pyrite} gold, not 1`', '${PROG_DATA.gear.sieve.pyrite} gold, not 3`')
rep("'Pyrite is worth 5, not 1.'", "'Pyrite is worth 15, not 3.'")
rep('"Pyrite pays 5, not 1.', '"Pyrite pays 15, not 3.')
rep('''"Pyrite. Fool's gold. Worth exactly 1."''', '''"Pyrite. Fool's gold. Worth exactly "+pv+"."''')
rep('function findWorth(f){return Math.round(findWorth0(f)*progWorthMul(f)*(f.lucky?LUCK.press.luckyMult:1)*kitWorthMul())}',
    'function findWorth(f){const w=Math.round(findWorth0(f)*(f.fake?1/TRAY.x:1)*progWorthMul(f)*(f.lucky?LUCK.press.luckyMult:1)*kitWorthMul());return w*TRAY.x} // TRAY TEST: every Worth x3 (Pyrite is already x3 in kitPyrite)')
rep('hunger:"a find worth 6 or more"', 'hunger:"a find worth 18 or more before its age"')
rep('hunger:"a find worth 3 or less"', 'hunger:"a find worth 9 or less before its age"', 2)
rep('hunger:"a find worth 8 or more"', 'hunger:"a find worth 24 or more before its age"')
rep('hunger:"a find worth 5 or more"', 'hunger:"a find worth 15 or more before its age"')
rep('w.pend.t>1e6', 'w.pend.t>1e9'); rep('w.coinPend.t>1e6', 'w.coinPend.t>1e9')
rep('s.total>=(state.train?1:15)', 's.total>=(state.train?1:45)')

# ---------------------------------------------------------------- 3. Hoard and the relics that count finds
rep("rhind:{hoard:6}", "rhind:{hoard:5}")
rep("A Hoard needs ${R.rhind.hoard} finds, not 8.", "A Hoard needs ${R.rhind.hoard} finds, not a full tray of ${TRAY.n}.")
rep("function hoardMin(){return pw('Rhind Mathematical Papyrus')?PROG_DATA.rel.rhind.hoard:8}", "function hoardMin(){return pw('Rhind Mathematical Papyrus')?PROG_DATA.rel.rhind.hoard:TRAY.n}")
rep("row('Relic ×2, each more ×1.5 · Hoard ×2 ('+hoardMin()+'+ finds) · one Timeline a seal · Fame tops out at ×'+SKILL.cap.fame,'',' how')",
    "row('Relic ×2, each more ×1.5 · Hoard ×2 ('+(hoardMin()>=TRAY.n?'a full tray of '+TRAY.n:hoardMin()+'+ finds')+') · one Timeline a seal','',' how')")

# ---------------------------------------------------------------- 4. the tray module
MODULE = r'''
// ===================== TRAY TEST (v1.0-tray1): a finds tray holds six, and the wall has room for nine loose finds =====================
// f.ord  = the find's place in the order of uncovering on this wall (1 = first). Saved with the find, so a resumed dig keeps every age.
// f.tray = the player's own choice: 1 on the tray, 0 left on the wall, absent = the default (the six worth most go on).
const TRAY={n:6,loose:9,x:3,coach:3};
const trayByOrd=(a,b)=>(a.ord|0)-(b.ord|0)||a.id-b.id;
function trayRank(f){return f.fake?findWorth(Object.assign({},f,{fake:false})):findWorth(f)} // a Pyrite relic is ranked as the relic it pretends to be, so the default pick never gives it away
function trayList(ex){ // the finds the next seal takes: the ones tapped on first, then the most valuable of the rest, six at most
  ex=ex||exposedFinds();
  const on=ex.filter(f=>f.tray===1).sort(trayByOrd).slice(0,TRAY.n);
  const auto=ex.filter(f=>f.tray!==1&&f.tray!==0).sort((a,b)=>trayRank(b)-trayRank(a)||trayByOrd(a,b)).slice(0,TRAY.n-on.length);
  const S=new Set(on.concat(auto));return ex.filter(f=>S.has(f))}
function trayOldest(){const ex=exposedFinds();return ex.length>=TRAY.loose?ex.slice().sort(trayByOrd)[0]:null}
function trayCoach(k){try{const o=JSON.parse(Store.get('S15T_traycoach')||'{}')||{};const n=o[k]|0;if(n>=(k==='six'?2:TRAY.coach))return false;o[k]=n+1;Store.set('S15T_traycoach',JSON.stringify(o));return true}catch(e){return false}}
function trayTick(){ // after anything that can uncover a find: stamp the new ones, and if more than nine lie loose the oldest crumble
  if(!state||!state.finds||state.over)return[];
  const ex=exposedFinds(),fresh=ex.filter(f=>f.ord==null);
  if(!fresh.length)return[];
  fresh.sort((a,b)=>trayRank(a)-trayRank(b)||a.id-b.id).forEach(f=>{state.useq=(state.useq|0)+1;f.ord=state.useq}); // several in one strike: the lowest Worth counts as oldest
  const gone=ex.length>TRAY.loose?ex.slice().sort(trayByOrd).slice(0,ex.length-TRAY.loose):[];
  gone.forEach(f=>{f.banked=true;f.lost=true;f.crumb=1;delete f.tray;(state.crumbs=state.crumbs||[]).push({id:f.id,t0:performance.now()});RS().cr=(RS().cr|0)+1});
  if(gone.length){try{sfx('dig',{mat:3,big:true,n:2});hap([30,40,60]);if(!rmEff())shake(7)}catch(e){}
    if(trayCoach('cr'))uiToast('No room on the wall. The '+gone[0].name+', your oldest loose find, crumbled. Seal a tray to make room.',5200)}
  else if(!state.train){const n=ex.length;
    if(n===TRAY.loose){if(trayCoach('nine'))uiToast('Nine loose finds. The wall has room for no more. Uncover a tenth and the oldest crumbles.',5200)}
    else if(n>TRAY.n&&n-fresh.length<=TRAY.n){if(trayCoach('six'))uiToast('A tray holds six. The six worth most are on it. Tap a find to swap it on or off.',5200)}}
  return gone}
function trayGoneMsg(g){return g.length?'Crumbled: '+g.map(f=>(f.relic?'★ ':'')+f.name+' (age '+f.age+')').join(', ')+'. ':''}
function trayAt(cx,cy){ // the loose find under a tap, when a tap there means "move it on or off the tray"
  if(!state||state.over||state.sealing||state.train||feedMode||tool==='xray'||tool==='lode'||tool==='blast')return null;
  const row=state.owner[cy],o=row?row[cx]:-1;if(!(o>=0))return null;const f=state.finds[o];
  return f&&!f.banked&&!f.sarc&&f.cells.every(([x,y])=>state.dirt[y][x]===0)?f:null}
function trayTap(cx,cy){ // one tap on an uncovered find swaps it on or off the tray. Never digs, never costs crack.
  const f=trayAt(cx,cy);if(!f)return false;
  const ex=exposedFinds(),L=trayList(ex),say=()=>{const n=trayList().length;return' Tray '+n+'/'+TRAY.n+'.'};
  if(L.indexOf(f)>=0){f.tray=0;log((f.relic?'★ ':'')+f.name+' left on the wall for a later seal.'+say())}
  else if(L.length>=TRAY.n&&L.every(q=>q.tray===1)){log('The tray is full. Tap one of its six to take it off first.');hap(6);return true}
  else{f.tray=1;log((f.relic?'★ ':'')+f.name+' goes on the tray.'+say())}
  RS().tp=(RS().tp|0)+1;hap(8);sfx('tap');try{juice(f.j,.35,.2)}catch(e){}
  ui();draw();try{S15.touch()}catch(e){}
  return true}
function traySealed(){state.finds.forEach(f=>{if(f.tray!=null)delete f.tray})} // a seal is made: whatever was held back goes on the next tray by default
function trayUi(all,L){ // "Loose 7/9" over the wall
  const el=document.getElementById('looseTag');if(!el)return;
  const n=all.length,show=n>0&&!state.train&&!state.over;
  el.hidden=!show;if(!show)return;
  const t='Loose '+n+'/'+TRAY.loose+(n>=TRAY.loose?' · full':'');if(el.textContent!==t)el.textContent=t;
  el.classList.toggle('near',n===TRAY.loose-1);el.classList.toggle('full',n>=TRAY.loose);
  el.title=n>=TRAY.loose?'The wall has room for nine loose finds. Uncover a tenth and the oldest crumbles.':'Loose finds on the wall. Room for nine.'}
function trayDraw(){ // marks on the wall: which finds are on the tray, the crack on the oldest when nine lie loose, and anything crumbling
  if(!state||state.falling)return;
  const ex=exposedFinds(),L=new Set(trayList(ex)),mark=!state.train&&!state.over&&(ex.length>TRAY.n||ex.some(f=>f.tray===0)),old=state.train||state.over?null:trayOldest(),rm=rmEff();
  const has=(f,x,y)=>f.cells.some(c=>c[0]===x&&c[1]===y);
  const rim=(f,col,w,dash)=>{ctx.save();ctx.strokeStyle=col;ctx.lineWidth=w;if(dash)ctx.setLineDash(dash);ctx.beginPath();const h=w/2;
    f.cells.forEach(([x,y])=>{const X=x*cell,Y=y*cell;
      if(!has(f,x,y-1)){ctx.moveTo(X,Y+h);ctx.lineTo(X+cell,Y+h)}if(!has(f,x,y+1)){ctx.moveTo(X,Y+cell-h);ctx.lineTo(X+cell,Y+cell-h)}
      if(!has(f,x-1,y)){ctx.moveTo(X+h,Y);ctx.lineTo(X+h,Y+cell)}if(!has(f,x+1,y)){ctx.moveTo(X+cell-h,Y);ctx.lineTo(X+cell-h,Y+cell)}});ctx.stroke();ctx.restore()};
  const crackOn=(f,k,a)=>{ // a zigzag crack across each tile, grown to k (0..1)
    ctx.save();ctx.globalAlpha=a;ctx.lineJoin='round';
    f.cells.forEach(([x,y],i)=>{const X=x*cell,Y=y*cell,P=[[.18,.05],[.42,.3],[.3,.52],[.58,.68],[.5,.95]],m=Math.max(2,Math.round(P.length*k));
      for(const [col,w] of [['#120a06',Math.max(2.5,cell*.09)],['#ff6a4d',Math.max(1,cell*.035)]]){ctx.strokeStyle=col;ctx.lineWidth=w;ctx.beginPath();
        P.slice(0,m).forEach(([u,v],j)=>{const px=X+(i%2?1-u:u)*cell,py=Y+v*cell;if(j)ctx.lineTo(px,py);else ctx.moveTo(px,py)});
        if(k>.6){ctx.moveTo(X+(i%2?.7:.3)*cell,Y+.52*cell);ctx.lineTo(X+(i%2?.92:.08)*cell,Y+.66*cell)}ctx.stroke()}});
    ctx.restore()};
  if(mark)ex.forEach(f=>{
    if(L.has(f)){rim(f,'#000',Math.max(4,cell*.12));rim(f,'#ffd44a',Math.max(2,cell*.07));
      const c=f.cells[0],s=Math.max(11,Math.round(cell*.36)),x=(c[0]+1)*cell-s-2,y=c[1]*cell+2; // a brass tick in the corner: on the tray
      ctx.fillStyle='#000';ctx.fillRect(x-1,y-1,s+2,s+2);ctx.fillStyle='#ffd44a';ctx.fillRect(x,y,s,s);
      ctx.strokeStyle='#2a1a06';ctx.lineWidth=Math.max(2,s*.18);ctx.beginPath();ctx.moveTo(x+s*.2,y+s*.55);ctx.lineTo(x+s*.42,y+s*.76);ctx.lineTo(x+s*.82,y+s*.26);ctx.stroke();ctx.lineWidth=1}
    else{ctx.fillStyle='rgba(8,6,10,.58)';f.cells.forEach(([x,y])=>ctx.fillRect(x*cell,y*cell,cell,cell));rim(f,'#8a8a92',Math.max(1.5,cell*.045),[cell*.14,cell*.1])}});
  if(old){crackOn(old,1,1);rim(old,rm||(frame>>4)%2?'#ff6a4d':'#7a1620',Math.max(2,cell*.07))}
  const C=state.crumbs;if(!C||!C.length)return;
  const now=performance.now(),D=rm?1600:1500; // long enough to be read: half a second of cracking, a second of falling
  state.crumbs=C.filter(c=>now-c.t0<D&&state.finds[c.id]);
  state.crumbs.forEach(c=>{const f=state.finds[c.id],p=Math.max(0,Math.min(1,(now-c.t0)/D)),pal=f.relic?["#ffd27a","#ff9a1f","#8a4a00"]:civPal(f.civ);
    const xs=f.cells.map(q=>q[0]),ys=f.cells.map(q=>q[1]),x0=Math.min(...xs)*cell,y0=Math.min(...ys)*cell,x1=(Math.max(...xs)+1)*cell,y1=(Math.max(...ys)+1)*cell;
    const body=a=>{ctx.save();ctx.globalAlpha=a;if(f.relic&&RELIC_BY[f.name]){ctx.fillStyle='#2a1d08';ctx.fillRect(x0,y0,x1-x0,y1-y0);drawSprite(ctx,f,x0,y0,cell/8)}else if(!drawItem(f,x0,y0,cell/8,pal)){ctx.fillStyle=pal[1];f.cells.forEach(([x,y])=>ctx.fillRect(x*cell+1,y*cell+1,cell-2,cell-2))}ctx.restore()};
    if(rm){const a=p<.45?1:Math.max(0,1-(p-.45)/.55);body(a);crackOn(f,1,a)} // Reduce Motion: no travel, no shake; the cracked find fades where it lies
    else if(p<.38){const k=p/.38,j=(1-k)*0+Math.sin(now/18)*cell*.04;ctx.save();ctx.translate(j,0);body(1);crackOn(f,k,1);ctx.fillStyle='rgba(255,90,60,'+(.28*k).toFixed(2)+')';f.cells.forEach(([x,y])=>ctx.fillRect(x*cell,y*cell,cell,cell));ctx.restore()}
    else{const q=(p-.38)/.62,h=cell/2;ctx.save();ctx.globalAlpha=Math.max(0,1-q*q);
      f.cells.forEach(([x,y],i)=>{for(let k=0;k<4;k++){const sx=x*cell+(k%2)*h,sy=y*cell+(k>>1)*h,dx=((k%2)?1:-1)*q*cell*(.25+((i+k)%3)*.12),dy=q*q*cell*(1.4+((i*3+k)%4)*.35)-q*cell*.25;
        ctx.fillStyle=k%2?pal[1]:pal[0];ctx.fillRect(sx+dx+1,sy+dy+1,h-2,h-2);ctx.fillStyle='rgba(0,0,0,.35)';ctx.fillRect(sx+dx+1,sy+dy+h-4,h-2,3)}});ctx.restore()}
    const a=rm?(p<.6?1:Math.max(0,1-(p-.6)/.4)):Math.min(1,(1-p)*4),fs=Math.max(11,Math.round(cell*.3));ctx.save();ctx.globalAlpha=Math.max(0,a);ctx.font='900 '+fs+'px Cinzel, Georgia, serif';ctx.textAlign='center';ctx.textBaseline='middle';
    const tw=ctx.measureText('CRUMBLED').width+12,lx=Math.min(COLS*cell-tw/2-2,Math.max(tw/2+2,(x0+x1)/2)),ly=Math.max(fs,y0-fs*.8)-(rm?0:p*cell*.3);
    ctx.fillStyle='rgba(18,8,6,.92)';ctx.fillRect(lx-tw/2,ly-fs*.75,tw,fs*1.5);ctx.strokeStyle='#ff6a4d';ctx.lineWidth=1;ctx.strokeRect(lx-tw/2+.5,ly-fs*.75+.5,tw-1,fs*1.5-1);ctx.fillStyle='#ffb09a';ctx.fillText('CRUMBLED',lx,ly+1);ctx.restore()});
}
'''
rep("function sarcAt(x,y){", MODULE + "function sarcAt(x,y){")

# ui(): the panel, the Seal button and the strip price the tray, not everything uncovered
rep("  const ex=exposedFinds();const s=score(ex);\n", "  trayTick();const exAll=exposedFinds(),ex=trayList(exAll);const s=score(ex);trayUi(exAll,ex);\n")
rep("(ex.length?`<span class=\"t\">${ex.length} uncovered · badge = age · no sets yet</span>`:'<span class=\"t\">Nothing uncovered</span>')",
    "(ex.length?`<span class=\"t\">${ex.length} on the tray · badge = age · no sets yet</span>`:exAll.length?'<span class=\"t\">Tray empty · tap a find</span>':'<span class=\"t\">Nothing uncovered</span>')")
rep("function canSeal(){return exposedFinds().length>0&&!sackSpent()}", "function canSeal(){return exposedFinds().length>0&&!sackSpent()} // TRAY TEST: an emptied tray can be refilled with a tap, so loose finds still count as something to do")
# strike(): stamp and crumble before the messages; a tap on a loose find is a tray tap
rep('  let msg="";\n  let oreMsg=false;\n', '  const _gone=trayTick();\n  let msg="";\n  let oreMsg=false;\n')
rep("  if(state.finds.some(f=>f.sarc&&!f.banked&&f.cells.every(([a,b])=>state.dirt[b][a]===0)))msg=\"A sarcophagus.", "  if(_gone.length)msg=trayGoneMsg(_gone)+msg;\n  if(state.finds.some(f=>f.sarc&&!f.banked&&f.cells.every(([a,b])=>state.dirt[b][a]===0)))msg=\"A sarcophagus.")
rep('  if(tool==="xray")xray(p.x,p.y);else if(tool==="lode")lodestone(p.x,p.y);else if(tool==="blast")blast(p.x,p.y);else strike(p.x,p.y)\n',
    '  if(trayTap(p.x,p.y))return;\n  if(tool==="xray")xray(p.x,p.y);else if(tool==="lode")lodestone(p.x,p.y);else if(tool==="blast")blast(p.x,p.y);else strike(p.x,p.y)\n')
rep("const cf=confirmOn(),now=!cf&&instantTool(),h=hold={", "const tf=!!trayAt(p.x,p.y),cf=confirmOn()&&!tf,now=tf||(!cf&&instantTool()),h=hold={") # a tray tap never waits for Confirm digs: it cannot dig
rep("  {const _po=kitPlanOverride(cx,cy);if(_po)return _po}\n", "  {const tf=trayAt(cx,cy);if(tf){const xs=tf.cells.map(c=>c[0]),ys=tf.cells.map(c=>c[1]),on=trayList().indexOf(tf)>=0;return{x0:Math.min(...xs),y0:Math.min(...ys),x1:Math.max(...xs),y1:Math.max(...ys),crack:0,hit:0,idle:true,label:on?'On the tray · tap to leave it':'Off the tray · tap to add it'}}}\n  {const _po=kitPlanOverride(cx,cy);if(_po)return _po}\n")
# seal(): six at most, the player's pick
rep('''  const ex=exposedFinds();
  if(!ex.length){log("Nothing uncovered yet. Dig first.");return}
  if(skillPaid()){skillPayCard();return}''', '''  const all=exposedFinds();
  if(!all.length){log("Nothing uncovered yet. Dig first.");return}
  const ex=trayList(all);
  if(!ex.length){log("The tray is empty. Tap a find to put it on the tray.");return}
  if(skillPaid()){skillPayCard();return}''')
rep("const s=score(ex);s.gold=ecoSealG(s);ex.forEach(f=>f.banked=true);state.sealed++;", "const s=score(ex);s.gold=ecoSealG(s);ex.forEach(f=>f.banked=true);traySealed();state.sealed++;")
rep("    shut();const ex=exposedFinds();\n", "    shut();const ex=trayList();\n")
rep("document.removeEventListener('keydown',esc2,true);const ex=exposedFinds();\n      if(!state||state.over||state.sealing||!ex.length||run.lives<=M||!skillPaid()){s10OfferRes", "document.removeEventListener('keydown',esc2,true);const ex=trayList();\n      if(!state||state.over||state.sealing||!ex.length||run.lives<=M||!skillPaid()){s10OfferRes")
rep("const sv=score(exposedFinds()),tg=TARGETS[state.i]", "const sv=score(trayList()),tg=TARGETS[state.i]")
rep("The finds that glow are banked either way.", "The finds on the tray are banked either way.")
# what a collapse quotes and what Hammurabi pays: the best tray of what was lost, never more than six finds in one score
rep("lost.paid=score(lost).total;run.banked+=lost.paid", "lost.paid=score(trayList(lost)).total;run.banked+=lost.paid")
rep("worth ${fmtN(score(lost).total)}.", "a tray of them worth ${fmtN(score(trayList(lost)).total)}.")
rep("const lv=(!win&&lost&&lost.length)?score(lost).total:0;", "const lv=(!win&&lost&&lost.length)?score(trayList(lost)).total:0;")
rep("hit.forEach(f=>{f.banked=true;f.lost=true});state.crack=Math.round(maxCrack()*.3)", "hit.forEach(f=>{f.banked=true;f.lost=true;delete f.tray});state.crack=Math.round(maxCrack()*.3)")
# draw(): the marks
rep("  if(SETTINGS.cb)cbGlyphs();\n  luckDrawMarks();\n", "  if(SETTINGS.cb)cbGlyphs();\n  trayDraw();\n  luckDrawMarks();\n")
# the Seal button says how full the tray is
rep("sm.textContent=sack?(n>=B?'sack is full':n?'LAST seal':'TWO seals'):state.train?'bank what glows':n>=B?'costs a Memory':n===B-1?'last free seal':'bank what glows';",
    "{const tn=trayList().length,tt=tn?'Tray '+tn+'/'+TRAY.n:'';sm.textContent=sack?(n>=B?'sack is full':tt?tt+(n?' · LAST':''):n?'LAST seal':'TWO seals'):state.train?'bank what glows':n>=B?'costs a Memory':tt?tt+(n===B-1?' · last free':''):n===B-1?'last free seal':'tray of six'}")
# the strip chip: loose finds, not "n finds"
rep("el.chip.textContent=n+(n===1?' find':' finds')+(b?", "el.chip.textContent='Loose '+n+'/'+TRAY.loose+(b?")
rep("(n?n+' finds open. ':'')", "(n?n+' loose finds of '+TRAY.loose+'. ':'')")
# toasts can stay up long enough to be read
rep("function uiToast(msg){", "function uiToast(msg,ms){")
rep("clearTimeout(_toastT);_toastT=setTimeout(()=>{el.hidden=true},1800);", "clearTimeout(_toastT);_toastT=setTimeout(()=>{el.hidden=true},ms||1800);")
# save: the crumble effect is not state
rep("const DROP={flash:1,", "const DROP={crumbs:1,flash:1,")

# ---------------------------------------------------------------- 5. words: tutorial, How to Play, coaching
rep("t:'Seal banks everything that glows: Worth × Fame, straight into Banked. Unsealed finds are the wall\\'s.'",
    "t:'Seal banks the tray: six finds at most, Worth × Fame, straight into Banked. Unsealed finds are the wall\\'s.'")
rep("Finds that glow are uncovered. Tap Seal to bank them before the wall comes down.", "Finds that glow are uncovered. Tap Seal to bank a tray of them, six at most, before the wall comes down.")
rep("A relic, a hoard of eight and a Fever each double it.", "A relic, a full tray of six (a Hoard) and a Fever each double it.")
rep(" {h:'Worth × Fame',t:'", r''' {h:'The finds tray',t:'A finds tray holds six. Seal takes the six finds worth most, and the rest wait on the wall for a later seal. Tap any uncovered find to move it on or off the tray; a brass tick marks the ones that go. The wall has room for nine loose finds. Uncover a tenth and the oldest one crumbles, so seal a tray before you dig past nine.',
  d(g){
   g.fillStyle='#17141c';g.fillRect(0,0,264,120);
   hText(g,'TRAY 6/6',10,12,{s:8,c:'#ffd44a'});hText(g,'LOOSE 9/9',254,12,{a:'right',s:8,c:'#ff9a8a'});
   g.fillStyle='#000';g.fillRect(6,22,164,40);g.fillStyle='#5a4228';g.fillRect(8,24,160,36);g.fillStyle='#c9a24a';g.fillRect(8,24,160,2);g.fillRect(8,58,160,2);
   const tick=(x,y)=>{g.fillStyle='#000';g.fillRect(x+14,y,10,10);g.fillStyle='#ffd44a';g.fillRect(x+15,y+1,8,8);g.strokeStyle='#2a1a06';g.lineWidth=1.6;g.beginPath();g.moveTo(x+16.5,y+5.5);g.lineTo(x+18.5,y+7.5);g.lineTo(x+21.5,y+3);g.stroke()};
   [[0,3],[0,4],[1,5],[1,6],[1,7],[2,9]].forEach(([civ,age],k)=>{const x=12+k*26;g.fillStyle='#17141c';g.fillRect(x-1,29,26,26);hFind(g,'Coin',civ,x,30,age);tick(x,30)});
   [[3,2,0],[2,11,0],[0,1,1]].forEach(([civ,age,old],k)=>{const x=180+k*26,y=30;hFind(g,'Coin',civ,x,y,age);
     if(old){g.strokeStyle='#120a06';g.lineWidth=3;g.beginPath();g.moveTo(x+5,y+1);g.lineTo(x+11,y+8);g.lineTo(x+8,y+13);g.lineTo(x+15,y+17);g.lineTo(x+12,y+23);g.stroke();g.strokeStyle='#ff6a4d';g.lineWidth=1.2;g.stroke();g.strokeStyle='#ff6a4d';g.lineWidth=1.5;g.strokeRect(x+.5,y+.5,23,23)}
     else{g.fillStyle='rgba(8,6,10,.5)';g.fillRect(x,y,24,24)}});
   hText(g,'OLDEST',244,64,{a:'center',s:7,c:'#ff9a8a'});
   hText(g,'Seal takes six. You choose which.',10,82,{it:1,s:11,c:'#e8dcc0'});
   hText(g,'A tenth find, and the oldest crumbles.',10,102,{it:1,s:11,c:'#e8dcc0'});
  }},
 {h:'Worth × Fame',t:''' + "'")
rep("Nothing from training counts toward it: not the tally, not the seals.</p>",
    "Nothing from training counts toward it: not the tally, not the seals.</p><p>One rule of the tomb proper. A finds tray holds six, and the wall has room for nine loose finds. Uncover a tenth and the oldest crumbles.</p>")
rep("log('That was Fame ×1: base value only. Three finds of one civilization, or three ages in a row, multiply it. Hold the seal for them.')",
    "log('That was Fame ×1: base value only. Three finds of one civilization, or three ages in a row, multiply it. Hold the seal for them, but not past nine loose finds.')")

open(OUT, 'w', encoding='utf-8').write(s)
print('edits:', N[0], ' bytes:', len(s.encode('utf-8')), ' md5:', hashlib.md5(s.encode('utf-8')).hexdigest())
