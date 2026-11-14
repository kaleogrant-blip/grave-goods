// node sim-same.cjs a.json.jobs b.json.jobs
// Two simulator runs use the same seeds, and a run is fully decided by its seed. So if the rules a row depends on are the same in two builds, every run in both files must end the same way:
// same result, same bank, same number of seals, strikes and walls. Prints how many shared runs were compared and how many differ.
const fs=require('fs');const rd=f=>{const m={};for(const l of fs.readFileSync(f,'utf8').split('\n')){if(!l)continue;const r=JSON.parse(l);m[r.k]=r.out}return m};
const A=rd(process.argv[2]),B=rd(process.argv[3]);let n=0,d=0,rows={};
for(const k in B){if(!A[k])continue;const row=k.split('|').slice(0,3).join('|');rows[row]=rows[row]||[0,0];B[k].forEach((r,i)=>{const a=A[k][i];n++;rows[row][0]++;if(!a||a.w!==r.w||a.banked!==r.banked||a.seals!==r.seals||a.strikes!==r.strikes||a.walls!==r.walls){d++;rows[row][1]++}})}
console.log(JSON.stringify(rows));console.log(n+' shared runs compared, '+d+' differ');
