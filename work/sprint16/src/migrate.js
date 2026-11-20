// ===================== rc10: a profile from v1.0-rc9b or earlier (old seal rule, old digits) comes over once =====================
// Kept as they are: profile, Vault, collection, Codex, rank and XP, Gold, tombs, Stakes, unlocks, settings, kit, counts of runs / tombs / taps / collapses / relics.
// Changed, because one seal now takes six finds and every Worth and target is three times the old digits:
//   - the old best haul, best seal and Daily bests are not scaled and not compared with new ones. They are set aside in rw_rc9 and shown on the Stats page as old-rule scores.
//   - the bars of the last-runs chart are redrawn at three times their old height (same digits as the new runs beside them).
//   - a dig left open under the old rule is closed: its purse goes to the wallet, and a note says so at the next menu.
const RC10={flag:'rw_rc10',old:'rw_rc9',note:'rw_rc10note',resume:'rw_resume',x:3};
function rc10Migrate(){
  try{
    if(Store.get(RC10.flag))return false;
    const J=k=>{try{const v=JSON.parse(Store.get(k)||'null');return v&&typeof v==='object'&&!Array.isArray(v)?v:null}catch(e){return null}};
    const num=v=>typeof v==='number'&&isFinite(v)&&v>0?Math.floor(v):0;
    const B=J('rw_best'),S=J('rw_stats'),D=J('rw_daily');let Z=null;
    try{Z=JSON.parse(localStorage.getItem(RC10.resume)||'null')}catch(e){Z=null}
    const had=!!(B||S||D||Z);
    if(had){
      const old={t:Date.now(),best:Math.max(num(B&&B.best),num(S&&S.best)),bs:num(S&&S.bs),bsw:num(S&&S.bsw),bsf:S&&typeof S.bsf==='number'&&isFinite(S.bsf)&&S.bsf>0?S.bsf:0,bsn:S&&typeof S.bsn==='string'?S.bsn.slice(0,120):'',daily:{}};
      if(D)Object.keys(D).forEach(k=>{if(/^\d{8}$/.test(k)&&num(+D[k]))old.daily[k]=num(+D[k])});
      if(B){B.best=0;Store.set('rw_best',JSON.stringify(B))}
      if(S){S.best=0;S.bs=0;S.bsw=0;S.bsf=0;S.bsn='';if(Array.isArray(S.hist))S.hist.forEach(h=>{if(h&&typeof h==='object'&&typeof h.b==='number')h.b=Math.round(h.b*RC10.x)});Store.set('rw_stats',JSON.stringify(S))}
      if(D)Store.set('rw_daily','{}');
      Store.set(RC10.old,JSON.stringify(old));
      const note={v:1};
      if(Z&&typeof Z==='object'){ // a dig in progress from the old rule: close it, keep its purse
        const r=Z.run&&typeof Z.run==='object'?Z.run:{},g=Math.min(1e6,num(r.gold));
        if(g>0){const w=Math.floor(+Store.get('rw_gold')||0);Store.set('rw_gold',String(Math.max(0,isFinite(w)?w:0)+g))}
        note.dig={ch:Number.isInteger(Z.i)&&Z.i>=0&&Z.i<=24?Z.i+1:0,gold:g};
        try{localStorage.removeItem(RC10.resume)}catch(e){}
      }
      Store.set(RC10.note,JSON.stringify(note));
    }
    Store.set(RC10.flag,'1');
    return had;
  }catch(e){try{console.error('rc10 upgrade: '+e.message)}catch(_){}return false}
}
function rc10Old(){try{const o=JSON.parse(Store.get(RC10.old)||'null');return o&&typeof o==='object'&&!Array.isArray(o)?o:null}catch(e){return null}}
function rc10Note(){try{const o=JSON.parse(Store.get(RC10.note)||'null');return o&&typeof o==='object'?o:null}catch(e){return null}}
function rc10NoteCard(done){ // shown once, at the first menu after the upgrade
  const n=rc10Note();if(!n)return false;
  const card=document.getElementById('card'),ov=document.getElementById('overlay');if(!card||!ov)return false;
  const dig=n.dig?'<p><b>Your open dig was closed.</b> '+(n.dig.ch?'You were in chamber '+n.dig.ch+', on':'It was on')+' a wall cut for the old rule, so it could not be carried over.'+(n.dig.gold>0?' Its purse of '+n.dig.gold+' Gold is in your wallet.':'')+' Nothing else was lost.</p>':'';
  card.innerHTML='<div class="tbar">Field notes · '+GAME_VERSION+'</div><div class="body"><h2>The rules of the dig changed<small>Your profile came with you.</small></h2>'
    +'<p><b>The finds tray.</b> A seal now takes a tray of six finds at most, and you choose which six. The wall has room for nine loose finds. Uncover a tenth and the oldest crumbles.</p>'
    +'<p><b>New digits.</b> Every Worth and every target is three times what it was. Gold and rank are paid as before.</p>'
    +'<p><b>Old scores.</b> Your best haul and best seal were made under the old rule, so they are kept on the Stats page, marked as old, and new bests start from here. Your Vault, Codex, rank, Gold, tombs, Stakes, unlocks and settings are untouched.</p>'
    +dig+'<p class="cite">How to play has a new card, The finds tray.</p><button id="go" type="button">Carry on</button></div>';
  card.querySelector('#go').onclick=()=>{try{Store.remove(RC10.note)}catch(e){}try{done&&done()}catch(e){console.error(e)}};
  ov.hidden=false;return true;
}
try{rc10Migrate()}catch(e){}
