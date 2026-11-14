// Prints the simulator results in sim-out/*.json as Markdown tables. node sim-table.cjs [file.json ...]
const fs=require('fs'),path=require('path'); // extra columns when the table has them: where losing runs died, and the share of profiles with a clear by run kconst D=path.join(__dirname,'sim-out');
const files=process.argv.slice(2).length?process.argv.slice(2):fs.readdirSync(D).filter(f=>f.endsWith('.json')).map(f=>path.join(D,f));
const p=x=>(x*100).toFixed(1)+'%',se=(w,n)=>'±'+(196*Math.sqrt(Math.max(w*(1-w),1e-9)/n)).toFixed(1);
for(const f of files){const o=JSON.parse(fs.readFileSync(f,'utf8'));const rows={},pols=[];
  for(const k in o.rows){const [r,pol]=k.split('|');(rows[r]=rows[r]||{})[pol]=o.rows[k];if(pols.indexOf(pol)<0)pols.push(pol)}
  console.log('\n### '+path.basename(f)+'  ('+o.N+' runs a cell, '+Math.round(o.secs)+' s'+(o.set?', SET '+JSON.stringify(o.set):'')+(/current\.html/.test(o.build)?', MAIN GAME rc9b':'')+')');
  console.log('| Tomb:Stake | '+pols.join(' | ')+' |\n|---|'+pols.map(()=>'---|').join(''));
  for(const r in rows)console.log('| '+r+' | '+pols.map(q=>rows[r][q]?p(rows[r][q].win)+' '+se(rows[r][q].win,rows[r][q].n):'-').join(' | ')+' |');
  const CL=Object.keys(Object.values(o.rows)[0].cls);
  console.log('\n| Row, player | Clears tomb | Clears ch. 1 | Clears ch. 2 | Best seal, median | Best seal, 95th pct | Seals a run | Walls a run | Finds crumbled a run | Bare walls / collapses / walk-aways a run | '+CL.map(c=>c[0].toUpperCase()+c.slice(1)).join(' | ')+' |\n|---|---|---|---|---|---|---|---|---|---|'+CL.map(()=>'---|').join(''));
  for(const k in o.rows){const r=o.rows[k],c=r.cls;console.log('| '+k.replace('|',', ')+' | '+[p(r.win),p(r.c1),p(r.c2),r.best50,r.best95,r.seals.toFixed(1),r.walls.toFixed(1),r.cr.toFixed(1),r.bare.toFixed(2)+' / '+r.col.toFixed(2)+' / '+r.walk.toFixed(2),...CL.map(k=>c[k]+'%')].join(' | ')+' |'+(r.stuck||r.to?' STUCK '+r.stuck+' TIMEOUT '+r.to:''))}
  for(const k in o.rows){const r=o.rows[k];if(r.died)console.log(k.replace('|',', ')+': losing runs ended in chamber 1/2/3/4: '+r.died.join(' / ')+'% of all runs; share of that chamber\'s target banked when they ended: '+r.dfrac.join(' / ')+(r.wonBy&&r.wonBy.length?'; profiles with a clear by run 1..'+r.wonBy.length+': '+r.wonBy.join(' / ')+'%':''))}
  if(o.errors&&o.errors.length)console.log('page errors: '+o.errors.length+' '+String(o.errors[0]).slice(0,160));
  if(o.stuck&&o.stuck.length)console.log('stuck: '+JSON.stringify(o.stuck).slice(0,300));
  const u=Object.keys(o.unknownCards||{});if(u.length)console.log('cards closed by the fallback rule: '+u.join(' ; ').slice(0,300));}
