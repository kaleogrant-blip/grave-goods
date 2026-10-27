/* DORMANT. NOT LOADED BY ANYTHING. Do not add a <script> for this file.
 *
 * Verbatim extract from team/monetization/paywall-build-from-other-session.html (built on v1.0-rc5a), kept for a later cosmetics pass:
 *   1. the full-game unlock + Payments bridge + unlock sheet + gating helpers (gg_full, PAID_CLS)      -> NOT used: v1 has no content gate
 *   2. the Drops table, Drops tab items, ggBuyItem / ecoDropBuy / ggPaymentResult wrap                 -> NOT used: Drops are not in v1
 * It was written against the rc5a game, where those functions live INSIDE the game file. The current game (rc7) has none of it and
 * its Shop differs (see README.md in this folder). Treat it as design reference, not as code that runs.
 */

/* ===== 1. full-game unlock, Payments bridge, unlock sheet, and the gates that read fullOk() (monetization build lines 7007-7041) ===== */
// ---- the full-game unlock (one non-consumable, gg_full). rw_full is device-local (see Store.keys); rw_devfull / window.DEV_FULL force it on for testing. No consts here: these run during load.
var PRICE_FULL='$4.99',PAID_CLS=['fence','cartographer','mystic'];
function fullOk(){try{return Store.get('rw_full')==='1'||Store.get('rw_devfull')==='1'||window.DEV_FULL===true}catch(e){return false}}
function ugTel(n,d){try{if(typeof telEmit==='function')telEmit(n,d)}catch(e){}}
var Payments={last:'',
 go(action){this.last=action;const h=window.webkit&&window.webkit.messageHandlers&&window.webkit.messageHandlers.payments;
  if(h){try{h.postMessage({action:action,product:'gg_full'})}catch(e){uiToast('The store did not answer. Try again.')}return}
  uiToast('Purchases work in the App Store build');
  if(Store.get('rw_devfull')==='1'||window.DEV_FULL===true)window.ggPaymentResult({product:'gg_full',ok:true});
 },
 buyFull(){this.go('buy')},restore(){this.go('restore')}};
window.ggPaymentResult=function(r){ // called by the native bridge
 if(!r||r.product!=='gg_full')return;
 if(!r.ok){uiToast(Payments.last==='restore'?'Nothing to restore':'Purchase cancelled');return}
 Store.set('rw_full','1');ugTel('unlock_result',{result:Payments.last==='restore'?'restored':'purchased',price:PRICE_FULL});
 uiToast('Full game unlocked');
 try{const lay=document.getElementById('ugov');if(lay){lay.remove();return}if(document.getElementById('ugsheet')||document.querySelector('#card .kit'))showLoadout()}catch(e){}
};
function showUnlock(where){ // the unlock sheet: opened from the Tomb 2 win, or from any locked item on the kit screen
 const base=document.getElementById('card');if(!base)return;
 const layer=where==='tomb2_clear';let card=base; // the Tomb 2 offer is layered over the summary card, never replacing it
 if(layer){const old=document.getElementById('ugov');if(old)old.remove();const ov=document.createElement('div');ov.id='ugov';ov.style.cssText='position:fixed;inset:0;z-index:60;background:rgba(8,6,10,.78);display:flex;align-items:flex-start;justify-content:center;padding:14px 14px calc(14px + env(safe-area-inset-bottom));overflow-y:auto;box-sizing:border-box';card=document.createElement('div');card.className='card';ov.appendChild(card);document.body.appendChild(ov)}
 card.innerHTML=`<div class="tbar">The Deeper Tombs</div><div class="body" id="ugsheet"><h2>The deeper tombs are open<small>Full game · ${PRICE_FULL}, once</small></h2><p>The Ziggurat of Ur, Jelling Mounds, Tikal Understory, the Palace of Knossos and the Terracotta Pit, plus three more classes (the Fence, the Cartographer and the Mystic) and Stakes III to VI.</p><p>Nothing you have earned is taken away.</p><div class="choices"><button id="ugbuy" type="button">Unlock the full game · ${PRICE_FULL}</button><button id="ugno" type="button">Not now</button></div><button id="ugres" type="button" style="font-size:.8em;opacity:.8;margin-top:10px">Restore purchase</button></div>`;
 card.querySelector('#ugbuy').onclick=()=>Payments.buyFull();
 card.querySelector('#ugres').onclick=()=>Payments.restore();
 card.querySelector('#ugno').onclick=()=>{ugTel('unlock_result',{result:'declined',price:PRICE_FULL});if(layer){const o=document.getElementById('ugov');if(o)o.remove()}else showLoadout()};
}
function stakeMax(k){const m=Math.max(1,Math.min(6,(PROG.stakes.u[k]|0)||1));return fullOk()?m:Math.min(m,2)}
function clearsAt(t,s){let n=0;for(let k=s||1;k<=6;k++)n+=PROG.tombs.c[t+'.'+k]|0;return n}
function tombOpen(n){return n<=1||((n<3||fullOk())&&clearsAt(n-1,1)>0)}
function relicOk(r,forTomb){return((r.civ|0)<2||(r.civ|0)>5||fullOk())&&(r.civ!==4||tombOpen(5)||forTomb===5)&&(r.civ!==5||chinaGate(forTomb))}
function pickOk(list){const a=list.filter(r=>relicOk(RELIC_BY[r[0]]));return a.length?a[rnd(a.length)]:list[rnd(list.length)]}
function tierW(name,st){const k=RARITY[name]||'uncommon',S=STAKES[(st||stakeN())-1];return k==='legendary'?S.leg:k==='epic'?S.epic:TIERS[k].w}
function finOf(name){return PROG.stakes.fin[name]||''}
function classOk(k){if(PAID_CLS.indexOf(k)>=0&&!fullOk())return false;const u=UNLOCKS.find(x=>x.id==='class:'+k);return !u||uStatus(u).ok}

/* ===== 2. Drops: table, tab items, purchase request, result wrap (lines 8437-8498) ===== */
// ---- C2: Drops. Cosmetics sold for money (never for Gold), through Payments.buyItem(productId). Looks only: nothing in this block reads or writes ECON or any gameplay stat.
// Greek set: Tetradrachm, Petasos, Sulphur, Knossos at Dusk. Norse set: Hildisvíni, Valkyrie wing helm, Aurora green, Aurora over the Mounds. Bundle gg_drops_launch grants all eight.
const DROPS=[
 {id:'gg_drop_tetradrachm',set:'Greek',kind:'skin',cls:'scholar',n:1,usd:2.99,own:'skin:scholar.1'},
 {id:'gg_drop_petasos',set:'Greek',kind:'hat',ref:'petasos',usd:1.99,own:'hat:petasos'},
 {id:'gg_drop_sulphur',set:'Greek',kind:'lamp',ref:'sulphur',usd:1.99,own:'lamp:sulphur'},
 {id:'gg_drop_knossos',set:'Greek',kind:'scene',ref:'knossos',usd:3.99,own:'title:knossos'},
 {id:'gg_drop_hildisvini',set:'Norse',kind:'skin',cls:'brute',n:2,usd:2.99,own:'skin:brute.2'},
 {id:'gg_drop_valkyrie',set:'Norse',kind:'hat',ref:'valkyrie',usd:1.99,own:'hat:valkyrie'},
 {id:'gg_drop_aurora_green',set:'Norse',kind:'lamp',ref:'auroragreen',usd:1.99,own:'lamp:auroragreen'},
 {id:'gg_drop_aurora_mounds',set:'Norse',kind:'scene',ref:'aurora',usd:3.99,own:'title:aurora'}];
const DROP_BUNDLE={id:'gg_drops_launch',n:'Greek + Norse Drops',usd:12.99};
const DROP_BY_OWN=Object.fromEntries(DROPS.map(d=>[d.own,d]));
const DROP_BY_ID=Object.fromEntries(DROPS.concat([DROP_BUNDLE]).map(d=>[d.id,d]));
function dropPaid(key){const d=DROP_BY_OWN[key];return !!(d&&SHOP&&SHOP.own&&Array.isArray(SHOP.own.paid)&&SHOP.own.paid.includes(d.id))}
function dropGrant(pid){ // ownership only; the shop screen repaints from ggPaymentResult
  if(!DROP_BY_ID[pid])return false;
  if(!Array.isArray(SHOP.own.paid))SHOP.own.paid=[];
  const P=SHOP.own.paid,add=x=>{if(!P.includes(x))P.push(x)};
  if(pid===DROP_BUNDLE.id)DROPS.forEach(d=>add(d.id));
  add(pid);ecoSave();return true;
}
function dropItems(){ // the Drops tab. price is 0 and usd is the price: Gold is never involved.
  const out=[],mk=d=>{
    const b={price:0,usd:d.usd,product:d.id};
    if(d.kind==='skin'){const s=COSM.skins[d.cls][d.n-1];return Object.assign(b,{key:'skin:'+d.cls+':'+d.n,kind:'skin',cls:d.cls,id:d.n,name:s.n,line:s.line})}
    if(d.kind==='hat'){const h=COSM.hats.find(x=>x.id===d.ref);return Object.assign(b,{key:'hat:'+h.id,kind:'hat',id:h.id,name:h.n,line:h.line})}
    if(d.kind==='lamp'){const l=COSM.lamps.find(x=>x.id===d.ref);return Object.assign(b,{key:'lamp:'+l.id,kind:'lamp',id:l.id,name:l.n,line:l.line,rgb:l.rgb})}
    const s=COSM.titles.find(x=>x.id===d.ref);return Object.assign(b,{key:'scene:'+s.id,kind:'scene',id:s.id,name:s.n,line:s.line});
  };
  out.push({sec:'Launch bundle'});
  out.push({key:'drop:bundle',kind:'bundle',name:DROP_BUNDLE.n,price:0,usd:DROP_BUNDLE.usd,product:DROP_BUNDLE.id,art:'vault',line:'All eight Drops below, Greek and Norse: two skins, two hats, two lamps, two title scenes. Looks only. Nothing here makes you stronger.'});
  ['Greek','Norse'].forEach(set=>{out.push({sec:set+' Drops'});DROPS.filter(d=>d.set===set).forEach(d=>out.push(mk(d)))});
  return out;
}
function ggBuyItem(id){ // the store-purchase request. rw_devfull simulates a successful purchase; the App Store build posts to the native bridge.
  let dev=false;try{const v=localStorage.getItem('rw_devfull');dev=!!v&&v!=='0'}catch(e){}
  if(dev){setTimeout(()=>{try{window.ggPaymentResult({product:id,ok:true})}catch(e){}},60);return'dev'}
  try{const h=window.webkit&&window.webkit.messageHandlers&&window.webkit.messageHandlers.payments;if(h){h.postMessage({action:'buy',product:id});return'sent'}}catch(e){}
  console.log('Purchases work in the App Store build');return'none';
}
if(!window.Payments)window.Payments={};
if(window.Payments&&!window.Payments.buyItem)window.Payments.buyItem=ggBuyItem;
function ecoDropBuy(it){ // returns the Quartermaster's line; the purchase itself lands later in ggPaymentResult. Never touches the wallet.
  if(!it||!it.usd||!it.product)return'Not for sale.';
  if(ecoItemState(it).own)return'You own that already.';
  let r='none';
  try{const P=typeof Payments!=='undefined'?Payments:window.Payments;r=(P&&typeof P.buyItem==='function')?P.buyItem(it.product):ggBuyItem(it.product)}catch(e){r=ggBuyItem(it.product)}
  return r==='none'?'Purchases work in the App Store build.':'Waiting on the App Store…';
}
(function(){ // a cosmetic product id grants ownership; any other product falls through to whoever defined ggPaymentResult first
  const prev=window.ggPaymentResult;
  window.ggPaymentResult=function(r){
    const d=r&&DROP_BY_ID[r.product];
    if(!d)return typeof prev==='function'?prev.apply(this,arguments):undefined;
    if(r.ok&&dropGrant(r.product)){
      try{if(typeof telEmit==='function')telEmit('shop_buy',{item:r.product,kind:d.kind||'bundle',price:d.usd,currency:'usd',wallet_after:_gold})}catch(e){}
      try{uiToast(d.id===DROP_BUNDLE.id?'All eight Drops are yours.':'Yours.')}catch(e){}
    }
    try{if(typeof window.ggShopRepaint==='function')window.ggShopRepaint()}catch(e){}
  };
})();
