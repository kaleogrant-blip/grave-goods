from ed import run
run([
# luckUi: the field note on the clipboard and a pencil note on the tool
("""function luckUi(){ // the odds print on the Pick and Hammer buttons only while the wall is in the red
  const hot=luckOn()&&!state.over&&state.crack/maxCrack()>=LUCK.press.at,w=state.quartz?{normal:0,lucky:1,tremor:0}:pressW();
  const t=`${lkPct(w,'lucky')}% lucky · ${lkPct(w,'tremor')}% tremor`;
  ['pickO','hamO'].forEach(id=>{const el=document.getElementById(id);if(!el)return;el.hidden=!hot;if(hot&&el.textContent!==t){el.textContent='';const a=document.createElement('span'),b=document.createElement('span');a.textContent=`${lkPct(w,'lucky')}% lucky ·`;b.textContent=`${lkPct(w,'tremor')}% tremor`;el.append(a,' ',b)}});
  document.body.classList.toggle('lkhot',!!hot);document.body.classList.toggle('lkres',luckOn());
}""",
"""function luckFieldNote(w){return`Wall is talking. Loose ${lkPct(w,'lucky')} in 100. Tremor ${lkPct(w,'tremor')} in 100.`}
function luckUi(){ // past the red line: one line of field notes hangs from the clipboard with the real chances, and the tools carry a pencil note of what loose stone is worth
  const hot=luckOn()&&!state.over&&state.crack/maxCrack()>=LUCK.press.at,w=state.quartz?{normal:0,lucky:1,tremor:0}:pressW();
  const t='×'+LUCK.press.luckyMult+' if loose';
  ['pickO','hamO'].forEach(id=>{const el=document.getElementById(id);if(!el)return;el.hidden=!hot;if(hot&&el.textContent!==t)el.textContent=t});
  let nt=document.getElementById('lknote');
  if(hot){const tx=luckFieldNote(w);if(!nt){nt=document.createElement('div');nt.id='lknote';nt.className='lknote';nt.setAttribute('role','status');document.getElementById('wrap').appendChild(nt)}if(nt.textContent!==tx)nt.textContent=tx}
  else if(nt)nt.remove();
  document.body.classList.toggle('lkhot',!!hot);document.body.classList.toggle('lkres',luckOn());
}"""),
("""function luckDrawMarks(){ // a gold x2 tag on every lucky find that is lying open""","""function luckDrawMarks(){ // a pencilled x2 note on every find that loose stone touched and that is lying open"""),
("""    ctx.fillStyle='rgba(30,20,4,.9)';ctx.fillRect(x1-w-2,y0+2,w,h);ctx.strokeStyle='#ffd44a';ctx.lineWidth=1;ctx.strokeRect(x1-w-1.5,y0+2.5,w-1,h-1);
    ctx.fillStyle='#ffd44a';ctx.font=`900 ${Math.floor(cell*.26)}px Cinzel, serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('×'+LUCK.press.luckyMult,x1-w/2-2,y0+2+h/2+.5);""",
"""    ctx.fillStyle='#efe2c2';ctx.fillRect(x1-w-2,y0+2,w,h);ctx.strokeStyle='#8c7748';ctx.lineWidth=1;ctx.strokeRect(x1-w-1.5,y0+2.5,w-1,h-1);
    ctx.fillStyle='#33506b';ctx.font=`italic 700 ${Math.floor(cell*.3)}px Alegreya, Georgia, serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('×'+LUCK.press.luckyMult,x1-w/2-2,y0+2+h/2+.5);"""),
# css
("""/* -- odds line under Pick and Hammer, only while the wall is in the red -- */
button small.odds span{display:block}
@media(min-width:480px){button small.odds span{display:inline}}
button small.odds{white-space:normal;overflow:visible;line-height:1.05;font-size:10.5px;color:#ffd27a;margin-top:1px;letter-spacing:0}
body.lkhot #pick,body.lkhot #hammer{box-shadow:inset 0 0 0 1px #ffd44a,inset 0 1px 0 rgba(255,255,255,.12),0 2px 0 #000}""",
"""/* -- past the red line: a pencil note on Pick and Hammer, and one line of field notes hanging from the clipboard (Sprint 15b; the ids keep their old names) -- */
button small.odds{display:inline-block;align-self:center;white-space:nowrap;overflow:visible;line-height:1.15;font:italic 700 11px var(--body);color:#33506b;background:#efe2c2;border:1px solid #8c7748;border-radius:1px;padding:0 4px;margin-top:2px;letter-spacing:0;text-transform:none;text-shadow:none;transform:rotate(-2deg)}
.lknote{position:absolute;z-index:4;right:6px;top:0;max-width:calc(100% - 84px);box-sizing:border-box;padding:3px 9px 4px;font:italic 700 12.5px/1.15 var(--body);color:#33506b;background:linear-gradient(180deg,#e9d9b2,#f3e7c8);border:1px solid #8c7748;border-top:0;border-radius:0 0 3px 3px;box-shadow:0 3px 6px rgba(0,0,0,.55);pointer-events:none;transform:rotate(-.6deg);transform-origin:top right;text-align:center;border-bottom:2px solid #b3261e}"""),
# ---- item 3: the knucklebone says plainly that it is a wager
("""<div class="lkt"><b>${lkCoinName()} or nothing?</b><span>A knucklebone has four faces, and none of them are fair. That seal banked ${fmtN(s.total)}. It pays ${LUCK.coin.mult} times over (+${fmtN(s.total*(LUCK.coin.mult-1))}) only if it lands on its back: Pranes, ${pc.pranes}%. Hyption ${pc.hyption}%, Chios ${pc.chios}% and Kos ${pc.kos}% take the seal back.</span><div class="lkb"><button type="button" id="lkyes">Yes · throw</button><button type="button" id="lkno">Keep</button></div></div>""",
 """<div class="lkt"><b>${lkCoinName()} or nothing?</b><span>This is a wager on the seal you just banked: ${fmtN(s.total)}. Throw the knucklebone and it pays ${LUCK.coin.mult} times over (+${fmtN(s.total*(LUCK.coin.mult-1))}) only if it lands on its back: Pranes, ${pc.pranes}%. Hyption ${pc.hyption}%, Chios ${pc.chios}% and Kos ${pc.kos}% take the seal back (−${fmtN(s.total)}). Four faces, and none of them are fair.</span><div class="lkb"><button type="button" id="lkyes">Wager it · throw</button><button type="button" id="lkno">Keep ${fmtN(s.total)}</button></div></div>"""),
("/* -- panels that sit on the wall: the coin and the reels -- */","/* -- the panel that sits on the wall: the knucklebone -- */"),
])
