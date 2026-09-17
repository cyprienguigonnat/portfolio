// Vérifie le seuil d'affichage, le vrai progrès et le déblocage du chargement.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const script = fs.readFileSync(path.join(__dirname,'../content/boot.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
function scenario(reduced = false) {
  let now=0, id=0, removed=false;
  const tasks=new Map(), classes=new Set(), counter={textContent:'0 %'}, shell={inert:false};
  const loader={hidden:true,classList:{add(){}},querySelector:()=>counter,remove:()=>{removed=true;}};
  const schedule=(fn,delay=0)=>{tasks.set(++id,{fn,time:now+delay});return id;};
  const context={window:{},matchMedia:()=>({matches:reduced}),
    document:{documentElement:{classList:{add:name=>classes.add(name),remove:name=>classes.delete(name)}},
      getElementById:name=>name==='site-shell'?shell:removed?null:loader},
    setTimeout:schedule,clearTimeout:key=>tasks.delete(key),
    requestAnimationFrame:fn=>schedule(fn,16),cancelAnimationFrame:key=>tasks.delete(key)};
  vm.runInNewContext(script,context);
  function advance(ms) {
    const end=now+ms;
    for (;;) {
      const next=[...tasks].filter(([,task])=>task.time<=end).sort((a,b)=>a[1].time-b[1].time)[0];
      if(!next)break;
      now=next[1].time;tasks.delete(next[0]);next[1].fn(now);
    }
    now=end;
  }
  return {boot:context.window.portfolioBoot,advance,loader,shell,counter,classes,get removed(){return removed;}};
}
(async()=>{
  const fast=scenario();
  fast.advance(100);fast.boot.progress(100);await fast.boot.finish();fast.advance(1000);
  assert.equal(fast.loader.hidden,true,'Pas de flash sur un chargement rapide');
  assert.equal(fast.removed,true);
  assert.equal(fast.classes.has('is-booting'),false);
  const slow=scenario();
  slow.advance(219);assert.equal(slow.loader.hidden,true);
  slow.advance(1);assert.equal(slow.loader.hidden,false);assert.equal(slow.shell.inert,true);
  slow.boot.progress(50);slow.advance(1000);assert.equal(slow.counter.textContent,'50 %');
  slow.advance(1000);assert.equal(slow.counter.textContent,'50 %','Le temps seul ne simule pas de progression');
  const finish=slow.boot.finish();slow.advance(500);await finish;
  assert.equal(slow.counter.textContent,'100 %');assert.equal(slow.removed,true);assert.equal(slow.shell.inert,false);
  assert.equal(slow.classes.has('loading-visible'),false);
  assert.equal(slow.classes.has('is-booting'),false);
  const stalled=scenario();stalled.advance(8500);assert.equal(stalled.removed,true);assert.equal(stalled.shell.inert,false);
  const reduced=scenario(true);reduced.advance(220);const done=reduced.boot.finish();reduced.advance(0);await done;
  assert.equal(reduced.removed,true);
  process.stdout.write('Chargement rapide, lent, bloqué et mouvement réduit : OK\n');
})().catch(error=>{console.error(error);process.exitCode=1;});
