// node sim-probe.cjs out.json.jobs [chamberIndex=2]
// Reads the per-run results of a simulator table that was run with the chamber's target set out of reach (EVAL wraps progTargets), and prints, for every player,
// the target at which a given share of runs would have banked enough in that chamber before the Memories ran out. A first estimate only: it is then confirmed by real runs.
const fs=require('fs');const f=process.argv[2],ci=+(process.argv[3]||2);const by={};
for(const l of fs.readFileSync(f,'utf8').split('\n')){if(!l)continue;const r=JSON.parse(l),[tomb,stake,pol]=r.k.split('|'),k=tomb+':'+stake+' '+pol;(by[k]=by[k]||[]).push(...r.out.map(o=>o.ei===ci?o.eb:o.ei>ci?1e9:0))}
const P=[.8,.75,.7,.65,.6,.55,.5,.45,.4,.35,.3,.25,.2,.15,.1,.05];
console.log('share of runs that reach the target | '+P.map(p=>Math.round(p*100)+'%').join(' | '));
for(const k in by){const a=by[k].sort((x,y)=>y-x);console.log(k+' (n='+a.length+') | '+P.map(p=>a[Math.max(0,Math.ceil(a.length*p)-1)]).join(' | '))}
