// ================= 4. THE QUARTERMASTER'S BONE (Sprint 15b: replaces the sarcophagus reels and the fourth-Fever wheel) =================
// An ox shoulder blade with the possible answers carved along the top and a pit drilled at the bottom. Heat the pit, the crack forks, read where it ends.
// It is the Quartermaster's own habit (he carries the bones from dig to dig), so it turns up in every tomb without claiming that tomb's people did it.
// HONESTY RULES, all enforced here and tested in work/sprint15b/t:
//  1. The result is rolled and written to the save BEFORE the panel opens (state.sarcPend / state.jpPend). The reading only shows it.
//  2. Which answers sit left and right of the pit is fixed (BONE.side) and printed on the record before the first tap.
//  3. The fork goes to the side that holds the decided answer: boneSide() is a pure function of the result. There is no staged near-miss.
//  4. The figures pencilled in after the fork are the real conditional chances, computed from the same table the roll used (boneRevised()).
const LK_KINDS=[[.2,'relic','star'],[.45,'ore','ore'],[.75,'bones','bones'],[.9,'mimic','mimic'],[1.01,'memory','heart']]; // the existing chances table, unchanged
const JP_KEYS=['ore','memory','gold','relic','nothing']; // the order the fourth-Fever roll walks its weights in, unchanged
const BONE={heatMs:1000,trunkMs:260,forkMs:380,creepMs:900,tagMs:600,holdMs:2600,lockMs:480,
  fastAfter:3, // readings a player has done before the one-tap "Read it at once" is offered
  side:{sarc:{relic:'L',ore:'L',bones:'R',mimic:'R',memory:'R'},fever:{relic:'L',ore:'L',gold:'L',memory:'R',nothing:'R'}},
  col:{relic:'#ff9a1f',ore:'#4fe3d6',bones:'#cfcfcf',mimic:'#d8383f',memory:'#b24b9c',gold:'#f2c14e',nothing:'#8a8a8a'},
  sym:{relic:'star',ore:'ore',bones:'bones',mimic:'mimic',memory:'heart'}};
const boneName=k=>({relic:'A relic',ore:'Ore',bones:'Bones',mimic:'A mimic',memory:'A Memory',gold:LUCK.jackpot.gold+' points',nothing:'Nothing'}[k]);
const jpName=boneName;
function boneTable(mode,o){ // rows in printed order (left of the pit first), each with its weight out of the table's total. Built from the numbers the roll itself uses.
  let rows;
  if(mode==='fever'){const W=LUCK.jackpot.w;rows=['relic','ore','gold','memory','nothing'].map(k=>({k,w:W[k]}))}
  else{rows=LK_KINDS.map((k,i)=>({k:k[1],w:Math.round((Math.min(1,k[0])-(i?LK_KINDS[i-1][0]:0))*1e6)/1e4}));
    if(o&&o.sul){const b=rows.find(r=>r.k==='bones'),m=rows.find(r=>r.k==='mimic');b.w=Math.round((b.w+m.w)*1e4)/1e4;m.w=0;m.sul=true}} // Sulfur: the mimic's share reads as bones (s9SarcRoll)
  let tot=0;rows.forEach(r=>tot+=r.w);
  rows.forEach(r=>{r.side=BONE.side[mode][r.k];r.pct=Math.round(r.w/tot*100)});
  return rows;
}
function boneSide(mode,key){return BONE.side[mode][key]} // rule 3: the fork is a function of the decided answer and nothing else
function boneRevised(rows,side){ // rule 4: what is left after the fork, as whole percents of what is left
  let tot=0;rows.forEach(r=>{if(r.side===side)tot+=r.w});const out={};
  rows.forEach(r=>{if(r.side===side&&r.w>0)out[r.k]=Math.round(r.w/tot*100)});return out;
}
function statsBone(){ST.br=(ST.br||0)+1;stSave()}
// ---- art: the carved signs are the game's own 16x16 symbols, once as a carving (flat umber) and once in colour
function boneSign(k,carved){
  const id='bs'+k+(carved?'c':'');if(_lkc[id])return _lkc[id];
  const s=lkSym(BONE.sym[k]),c=document.createElement('canvas');c.width=c.height=16;const g=c.getContext('2d');g.drawImage(s,0,0);
  if(carved){g.globalCompositeOperation='source-in';g.fillStyle='#5a4526';g.fillRect(0,0,16,16)}
  return _lkc[id]=c.toDataURL();
}
function boneJag(pts){let d='';for(let i=0;i<pts.length-1;i++){const [x0,y0]=pts[i],[x1,y1]=pts[i+1];for(let k=(i?1:0);k<=6;k++){const t=k/6,x=x0+(x1-x0)*t+(k%6?(Math.random()-.5)*9:0),y=y0+(y1-y0)*t+(k%6?(Math.random()-.5)*5:0);d+=(d?'L':'M')+x.toFixed(1)+' '+y.toFixed(1)}}return d} // looks only: never touches the seeded stream
function boneSvg(rows,key){
  const SLOT=[52,116,180,244,308],L=rows.filter(r=>r.side==='L'),R=rows.filter(r=>r.side==='R'),pos={};
  L.forEach((r,i)=>pos[r.k]=SLOT[i]);R.forEach((r,i)=>pos[r.k]=SLOT[5-R.length+i]);
  const side=rows.find(r=>r.k===key).side,fx=side==='L'?118:242,div=(SLOT[L.length-1]+SLOT[L.length])/2;
  let med='';
  rows.forEach(r=>{const x=pos[r.k],gone=r.w<=0;
    let art;
    if(BONE.sym[r.k])art=`<image class="carv" href="${boneSign(r.k,true)}" x="${x-18}" y="94" width="36" height="36"/><image class="colr" href="${boneSign(r.k,false)}" x="${x-18}" y="94" width="36" height="36"/>`;
    else if(r.k==='gold')art=`<text class="carv" x="${x}" y="118" text-anchor="middle" font-family="Cinzel,Georgia,serif" font-weight="900" font-size="17" fill="#5a4526">${LUCK.jackpot.gold}</text><text class="colr" x="${x}" y="118" text-anchor="middle" font-family="Cinzel,Georgia,serif" font-weight="900" font-size="17" fill="#8a5a00">${LUCK.jackpot.gold}</text>`;
    else art=`<path class="carv" d="M${x-10} 112h20" stroke="#5a4526" stroke-width="3.5" stroke-linecap="round"/><path class="colr" d="M${x-10} 112h20" stroke="#3d3c42" stroke-width="3.5" stroke-linecap="round"/>`;
    med+=`<g class="bn-m${gone?' gone':''}" data-k="${r.k}"><circle cx="${x}" cy="112" r="27" fill="#d9cba6" stroke="#8c7748" stroke-width="2"/><circle class="ring" cx="${x}" cy="112" r="27" fill="none" stroke="${BONE.col[r.k]}" stroke-width="4"/>${art}<text x="${x}" y="158" text-anchor="middle" font-family="Alegreya,Georgia,serif" font-style="italic" font-size="13" fill="#4a3a22">${boneName(r.k).replace(/^A /,'').replace(/ points$/,' pts').replace(/^./,c=>c.toUpperCase())}</text></g>`});
  const trunk=boneJag([[180,356],[176,318],[183,286],[180,262]]),fork=boneJag([[180,262],[fx+(side==='L'?26:-26),236],[fx,214]]),end=boneJag([[fx,214],[(fx+pos[key])/2+(side==='L'?6:-6),186],[pos[key],142]]);
  return `<svg viewBox="0 28 360 396" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><defs><radialGradient id="bnlg" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffd66e" stop-opacity=".45"/><stop offset="1" stop-color="#e0a040" stop-opacity="0"/></radialGradient><radialGradient id="bnhot" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff2b0"/><stop offset=".4" stop-color="#ff7a2e"/><stop offset="1" stop-color="#ff3d1e" stop-opacity="0"/></radialGradient></defs>`
   +`<circle class="bn-lamp" cx="60" cy="70" r="210" fill="url(#bnlg)"/>`
   +`<path d="M22 70 Q180 30 338 70 Q346 150 300 250 Q262 330 232 398 Q180 420 128 398 Q98 330 60 250 Q14 150 22 70Z" fill="#e9dfc6" stroke="#8c7748" stroke-width="3"/><path d="M40 84 Q180 50 320 84" fill="none" stroke="#fff8e4" stroke-width="3" opacity=".7"/><path d="M300 250 Q262 330 232 398 Q180 420 128 398" fill="none" stroke="#b9a274" stroke-width="5" opacity=".6"/>`
   +`<path d="M${div} 66V196" stroke="#8c7748" stroke-width="1.5" stroke-dasharray="3 5" opacity=".7"/><text x="${div-8}" y="62" text-anchor="end" font-family="Cinzel,Georgia,serif" font-weight="700" font-size="9" letter-spacing="1.5" fill="#6b5634">LEFT</text><text x="${div+8}" y="62" font-family="Cinzel,Georgia,serif" font-weight="700" font-size="9" letter-spacing="1.5" fill="#6b5634">RIGHT</text>`
   +med
   +`<circle cx="180" cy="358" r="12" fill="#3a2a1b"/><circle cx="180" cy="358" r="7" fill="#17110c"/><circle class="bn-heat" cx="180" cy="358" r="26" fill="url(#bnhot)"/>`
   +`<g fill="none" stroke="#2b1d10" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path class="bn-c" data-c="1" d="${trunk}" pathLength="1"/><path class="bn-c" data-c="2" d="${fork}" pathLength="1"/><path class="bn-c" data-c="3" d="${end}" pathLength="1"/></g>`
   +`<g class="bn-rod"><rect x="176" y="352" width="150" height="8" rx="2" fill="#7d5f22" transform="rotate(-32 180 358)"/><rect x="176" y="352" width="34" height="8" rx="2" fill="#ff9a1f" transform="rotate(-32 180 358)"/><rect x="290" y="349" width="40" height="14" rx="3" fill="#4a3521" transform="rotate(-32 180 358)"/></g></svg>`;
}
// ---- sound and touch: everything is a one-shot from the game's own engine; boneQuiet() stops whatever is still sounding (and any vibration) when a reading is cut short
function boneQuiet(){try{BONE_AU.forEach(n=>{try{n.stop()}catch(e){}});}catch(e){}try{navigator.vibrate&&SETTINGS.haptics&&navigator.vibrate(0)}catch(e){}}
// ---- the reading. mode 'sarc' | 'fever'; key = the answer already decided and saved; done() pays it (called once, when the panel closes)
function luckBoneOpen(mode,rows,key,done){
  const st0=state,fev=mode==='fever',side=boneSide(mode,key),rev=boneRevised(rows,side),nOff=rows.filter(r=>r.side!==side&&r.w>0).length;
  const first=!(ST.br>0),fastOk=(ST.br|0)>=BONE.fastAfter,ctxN=(document.getElementById('hudCtx')||{}).textContent||'101';
  const sp=()=>Math.max(1,Q.speed||1),rm=rmEff();
  lkClose();
  const p=document.createElement('div');p.id='lkp';p.className='bn'+(fev?' bn-fev':'')+(rm?' bn-rm':'');p.setAttribute('role','dialog');p.setAttribute('aria-label',fev?'The Quartermaster’s second bone':'Reading the bone before the lid');
  const col=s=>`<div class="bn-col"><h4>${s==='L'?'Left of the pit':'Right of the pit'}</h4><ul>${rows.filter(r=>r.side===s).map(r=>`<li data-k="${r.k}"${r.w<=0?' class="out nil"':''}><i style="background:${BONE.col[r.k]}"></i><span>${boneName(r.k)}</span><b>${r.pct}%</b><em></em><s></s></li>`).join('')}</ul></div>`;
  const LBL=[['Heat the pit','bronze rod, held steady'],['Wait for the crack','it comes with a sound'],['Read it','follow the crack to its end']];
  p.innerHTML=`<div class="bn-in"><div class="bn-clip"><div class="bn-site"><span>Site GG-26</span><span>Ctx ${esc(ctxN)} &middot; ${fev?'the second bone':'the bone'}</span></div><div class="bn-sheet"><h2><span>${fev?lkOrd(LUCK.jackpot.at)+' Fever':'Burial record'}</span><span>${fev?'the second bone':'sarcophagus'}</span></h2><h3>${fev?'Fever again: he has kept a second bone back':'Before the lid: the bone is asked'}</h3><div class="bn-reg" role="group" aria-label="Chances, printed before you start">${col('L')}${col('R')}</div><p class="bn-note" id="bnnote">Chances as recorded${rows.some(r=>r.sul)?' (Sulfur has seen to the mimic)':''}. Nothing is staked. The answer is in the bone before the rod touches it.</p></div></div>`
   +`<div class="bn-stage" id="bnstage">${boneSvg(rows,key)}<div class="bn-tag" id="bntag" role="status"></div></div>`
   +`<div class="bn-cap" id="bncap" role="status" aria-live="polite"></div>`
   +`<div class="bn-tray"><button type="button" class="bn-go" id="bngo"></button>${fastOk?'<button type="button" class="bn-sm" id="bnfast">Read it at once<small>one tap</small></button>':''}</div></div>`;
  const ovr=document.getElementById('overlay');ovr.parentNode.insertBefore(p,ovr);LK.panel=p;LK.busy=true;document.body.classList.add('lk');
  {const t0=performance.now(),EV=['click','pointerdown','pointerup','mousedown','mouseup','touchstart','touchend']; // the game's rule for anything that appears under a digging thumb (T10)
    EV.forEach(t=>p.addEventListener(t,e=>{if(performance.now()-t0<GUARD.ms){e.stopImmediatePropagation();e.stopPropagation();if(e.cancelable)e.preventDefault()}},true))}
  const $=s=>p.querySelector(s),go=$('#bngo'),fast=$('#bnfast'),cap=$('#bncap'),note=$('#bnnote'),stage=$('#bnstage');
  const live=()=>LK.panel===p&&state===st0;
  const say=t=>{cap.textContent=t};
  const li=k=>p.querySelector('.bn-reg li[data-k="'+k+'"]'),med=k=>p.querySelector('.bn-m[data-k="'+k+'"]');
  const crack=(n,ms)=>{const c=p.querySelector('.bn-c[data-c="'+n+'"]');c.style.transitionDuration=(rm?1:Math.round(ms))+'ms';c.getBoundingClientRect();c.classList.add('on')};
  let step=0,lock=false,closed=false;
  const label=()=>{const L=LBL[step];if(L){go.innerHTML=`${L[0]}<small>${L[1]}</small>`}};
  const hold=ms=>{lock=true;go.disabled=true;if(fast)fast.disabled=true;lkAfter(()=>{if(!live()||closed)return;lock=false;go.disabled=false;if(fast)fast.disabled=false},ms)};
  const close=()=>{if(closed||!live())return;closed=true;done()};
  const s0=quick=>{p.classList.add('s1');if(!quick){luckSfx('hiss');hap([8,60,8,60,12,60,16,60,22])}say('The rod goes in. The bone smells of the kitchen. Nothing yet.')};
  const s1=quick=>{p.classList.add('s2');luckSfx('crack');hap([40,30,20]);if(!rm){stage.classList.add('shk');lkAfter(()=>stage.classList.remove('shk'),480)}
    const tk=quick?90:BONE.trunkMs/sp(),fk=quick?140:BONE.forkMs/sp();crack(1,tk);lkAfter(()=>{if(!live())return;crack(2,fk);if(!quick)luckSfx('creep',{k:0})},rm?0:tk+40);
    rows.forEach(r=>{const el=li(r.k);if(r.side!==side)el.classList.add('out');else if(r.w>0&&rev[r.k]!==r.pct){el.classList.add('rev');el.querySelector('em').textContent=rev[r.k]+'%'}});
    rows.forEach(r=>{if(r.side!==side)med(r.k).classList.add('off')});
    say(`Pok. The crack forks ${side==='L'?'left':'right'}. ${nOff===1?'One answer is':lkNum(nOff)+' answers are'} off the bone; the record is revised.`);
    note.textContent='Evidence so far: which way the crack forked. Red lines are what it cannot be. Red figures are the chances of what is left.'};
  const s2=quick=>{p.classList.add('s3');const T=quick?260:BONE.creepMs/sp();crack(3,T);
    if(!rm&&!quick){luckSfx('creep',{k:1});lkAfter(()=>{if(live())luckSfx('creep',{k:2})},T/3);lkAfter(()=>{if(live())luckSfx('creep',{k:3})},T*2/3);hap([6,120,6,120,30])}
    lkAfter(()=>{if(!live())return;luckSfx('stop');if(rm||quick)hap(30);med(key).classList.add('hit');rows.forEach(r=>{const el=li(r.k);if(r.k===key){el.classList.remove('out');el.classList.add('hit')}else el.classList.add('out')});
      say(`The crack ends at: ${key==='nothing'?'nothing. Robbed in antiquity':boneName(key).replace(/^A /,'a ').replace(/^(Ore|Bones)/,m=>m.toLowerCase())}. ${fev?'The Quartermaster writes it down':'The lid agrees'}.`)},rm?0:T);
    lkAfter(()=>{if(!live())return;tag();go.innerHTML='Back to the wall<small>the record is closed</small>';go.disabled=false;lock=false;go.focus&&go.focus({preventScroll:true});
      lkAfter(close,BONE.holdMs/sp())},rm?160:T+(quick?220:BONE.tagMs/sp()))};
  const tag=()=>{
    const bad=key==='mimic',plain=key==='bones'||key==='nothing',t=$('#bntag'),aeg=bad&&pw('Aegis of Athena');
    const line={relic:fev?'Catalogue it before anyone else does.':'Seal it before the wall takes it back.',ore:'Into the pouch, if there is room.',bones:'The occupant. Recorded, respectfully. They still count.',mimic:aeg?'It met the Aegis and thought better of it.':'The lid bites back. The wall takes the blame.',memory:'Something you had misplaced.',gold:'Grave goods, loose. Banked as found.',nothing:'Robbed in antiquity. Noted without comment.'}[key];
    const art=BONE.sym[key]?`<img class="ico" alt="" src="${boneSign(key,false)}">`:'';
    t.style.setProperty('--tc',BONE.col[key]);
    t.innerHTML=`<u>Find No. ${esc(ctxN)}</u>${art}<b>${boneName(key)}</b><span>${line}</span><i class="bn-stamp">${bad?'Hazard':plain?'Recorded':'Bagged'}</i>`;
    t.classList.add('show');luckSfx('tag');hap(bad?[40,40,120]:plain?[20]:[15,40,15,40,30]);
    if(bad&&!rm){stage.classList.add('shk');lkAfter(()=>stage.classList.remove('shk'),480)}
  };
  const STEPS=[s0,s1,s2];
  go.onclick=()=>{if(!live()||lock)return;if(step>=3){close();return}const k=step++;STEPS[k](false);label();if(k<2)hold(BONE.lockMs/sp());else{lock=true;go.disabled=true;if(fast)fast.remove()}};
  if(fast)fast.onclick=()=>{if(!live()||lock||step>=3)return;lock=true;go.disabled=true;fast.remove();const from=step;step=3;go.innerHTML='Reading…<small>the crack runs</small>';
    if(from<1)s0(true);if(from<2){s1(true);lkAfter(()=>{if(live())s2(true)},rm?60:260)}else s2(true)};
  label();
  say(fev?`${lkOrd(LUCK.jackpot.at).replace(/^./,c=>c.toUpperCase())} Fever of the dig. The Quartermaster has kept a second bone back. Heat the pit.`
     :first?'The Quartermaster carries ox shoulder blades from dig to dig and asks one before every lid. His habit, not the tomb’s. Heat the pit.'
     :'The Quartermaster hands you an ox shoulder blade, a bronze rod and a look. Heat the pit.');
  statsBone();
  return p;
}
function lkNum(n){return({2:'Two',3:'Three',4:'Four'}[n]||String(n))}
function luckBone(r,apply,sul){ // the sarcophagus: called by openSarc() with the roll already made and saved
  const st0=state;
  if(!luckOn()||LK.busy){apply();return}
  const kind=LK_KINDS.find(k=>r<k[0]);
  if((kind[1]==='bones'||kind[1]==='mimic'))srnd(); // one draw is still spent here so a seed's later rolls are exactly what they were in rc9a (it was the near-miss roll once)
  LK.note('reels',r,kind[1]);LK.mode='reels'; // internal names kept: the log and the telemetry keys do not change
  luckBoneOpen('sarc',boneTable('sarc',{sul:!!sul}),kind[1],()=>{
    if(state!==st0){lkDone();return}
    s10GFree('reels',{result:kind[1]});apply();lkDone();
  });
  ui();
}
// ================= 5. THE SECOND BONE (the fourth full Fever of a run) =================
function luckFever(){ // a full Fever has just been reached
  if(!luckOn())return;
  const S=RS();S.fev=(S.fev||0)+1;
  if(S.fev===LUCK.jackpot.at){S.jpOwed=1;luckJackpotSoon(0)}
}
function luckJackpotSoon(n){ // wait for a calm moment (no seal in flight, no card up), then bring out the second bone
  lkAfter(()=>{
    if(!RS().jpOwed||!state||state.over||state.train)return; // a new chamber re-arms it (luckChamberStart)
    const ov=document.getElementById('overlay');
    if(LK.busy||!ov.hidden||state.sealing||PAUSE.on||Q.busy||state.clearing){if(n<80)luckJackpotSoon(n+1);return}
    luckJackpot();
  },n?400:700);
}
function luckJackpot(){ // internal name kept (the app shell hooks it)
  const S=RS(),st0=state;S.jpOwed=0;const W=LUCK.jackpot.w;let tot=0;JP_KEYS.forEach(k=>tot+=W[k]);
  // the roll: the same two draws the wheel made (the second one chose where in its slice the pointer stopped; it is still drawn so every seed plays out as it did)
  let r=srnd()*tot,i=0;for(;i<4;i++){if(r<W[JP_KEYS[i]])break;r-=W[JP_KEYS[i]]}
  const key=JP_KEYS[i];srnd();LK.note('jackpot',(r+(JP_KEYS.slice(0,i).reduce((a,k)=>a+W[k],0)))/tot,key);
  state.jpPend={k:key};try{S11.save()}catch(e){} // decided and saved before anything is shown: closing the app cannot dodge it or reroll it
  LK.mode='jackpot';
  luckBoneOpen('fever',boneTable('fever'),key,()=>{
    if(state!==st0){lkDone();return}
    s10GFree('wheel',{result:key==='gold'?'points':key});jpPay(key);
  });
  ui();
}
function jpPay(key,quiet){ // pays a decided second bone, once: from the reading, or on resume when the app was closed mid-reading
  state.jpPend=null;const out=jpApply(key);
  try{log((quiet?'The second bone had already answered. ':'')+out.t)}catch(e){}
  lkClose();LK.busy=false;LK.mode='';document.body.classList.remove('lk');
  if(out.after)out.after();else{ui();draw();checkClear()}
  try{S11.save()}catch(e){}
}
