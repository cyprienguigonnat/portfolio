const assert=require('node:assert/strict');
const physics=require('../js/letter-physics.js');
const viewport={width:390,height:844};
const make=()=>({cx:195,cy:422,width:34,height:48,x:0,y:0,vx:100,vy:100,rotation:32,seed:1,mode:'floating'});
for(const [axis,edge,velocity] of [['x',-1000,'vx'],['x',1000,'vx'],['y',-1000,'vy'],['y',1000,'vy']]) {
  const letter=make();letter[axis]=edge;letter[velocity]=Math.sign(edge)*200;
  physics.contain(letter,viewport);
  assert.equal(Math.sign(letter[velocity]),-Math.sign(edge),'Rebond sur chaque bord');
}
const free=make();
for(let i=0;i<120*60;i++) {
  physics.step(free,1/120,i/120,viewport);
  const angle=free.rotation*Math.PI/180;
  const hw=(Math.abs(Math.cos(angle))*free.width+Math.abs(Math.sin(angle))*free.height)/2;
  const hh=(Math.abs(Math.sin(angle))*free.width+Math.abs(Math.cos(angle))*free.height)/2;
  assert.ok(free.cx+free.x-hw>=0 && free.cx+free.x+hw<=viewport.width);
  assert.ok(free.cy+free.y-hh>=0 && free.cy+free.y+hh<=viewport.height);
  assert.equal(free.mode,'floating','Aucun retour automatique, même après une minute');
}
free.mode='returning';
for(let i=0;i<120*10;i++)physics.step(free,1/120,i/120,viewport);
assert.equal(free.mode,'idle');assert.equal(free.x,0);assert.equal(free.y,0);
const hover=make();Object.assign(hover,{mode:'hover',hoverX:8,hoverY:-12,vx:0,vy:0});
for(let i=0;i<120;i++)physics.step(hover,1/120,i/120,viewport);
assert.ok(Math.abs(hover.x-8)<1 && Math.abs(hover.y+12)<1,'Le survol dévie localement');
hover.mode='hover-returning';for(let i=0;i<240;i++)physics.step(hover,1/120,i/120,viewport);
assert.equal(hover.mode,'idle','La sortie du survol remet la lettre à sa place');
const restingA={...make(),cx:100,cy:200,width:100,height:60,vx:0,vy:0,mode:'idle'};
const restingB={...make(),cx:150,cy:200,width:100,height:60,vx:0,vy:0,mode:'idle'};
physics.collide([restingA,restingB],viewport);
assert.equal(restingA.x,0);assert.equal(restingB.x,0);
assert.equal(restingA.mode,'idle');assert.equal(restingB.mode,'idle','Deux lettres au repos ne se repoussent pas');
const near={...make(),cx:100,cy:260,width:100,height:60,vx:0,vy:0,rotation:0,mode:'floating'};
const nearIdle={...make(),cx:188,cy:260,width:100,height:60,vx:0,vy:0,rotation:0,mode:'idle'};
physics.collide([near,nearIdle],viewport);
assert.equal(nearIdle.mode,'idle','La zone physique réduite évite les collisions fantômes');
const dragged={...make(),cx:160,cy:300,width:50,height:60,vx:280,vy:0,mode:'dragging'};
const neighbour={...make(),cx:198,cy:300,width:50,height:60,vx:0,vy:0,mode:'idle'};
physics.collide([dragged,neighbour],viewport,dragged);
assert.equal(neighbour.mode,'floating');assert.ok(neighbour.vx>0,'La lettre touchée est repoussée');
assert.ok(dragged.cx+dragged.x < neighbour.cx+neighbour.x,'Les hitbox sont séparées');
const moving={...make(),cx:120,cy:500,width:50,height:60,x:40,vx:180,vy:0,disturbed:true};
const idle={...make(),cx:198,cy:500,width:50,height:60,x:0,vx:0,vy:0,mode:'idle',disturbed:false};
for(let i=0;i<30;i++){
  physics.step(moving,1/120,i/120,viewport);
  physics.step(idle,1/120,i/120,viewport);
  physics.collide([moving,idle],viewport);
}
assert.equal(idle.mode,'floating','Les collisions restent actives après le relâchement');
assert.equal(idle.disturbed,true,'Une collision marque aussi la lettre percutée comme déplacée');
// Un seul mouvement traverse entièrement les obstacles, sans frame intermédiaire.
function fastDrag(mode, from, to, obstacle, reverse=false) {
  const held={...make(),cx:from[0],cy:from[1],width:30,height:40,rotation:0,vx:650,vy:650,mode:'dragging'};
  const hit={...make(),cx:obstacle[0],cy:obstacle[1],width:30,height:40,rotation:0,vx:0,vy:0,mode};
  const pair=reverse?[hit,held]:[held,hit];
  physics.drag(held,to[0]-held.cx,to[1]-held.cy,pair,viewport);
  return {held,hit};
}
for(const mode of ['idle','hover','hover-returning','floating'])for(const reverse of [false,true]) {
  const {hit}=fastDrag(mode,[40,300],[340,300],[160,300],reverse);
  assert.equal(hit.mode,'floating','Un drag rapide percute aussi une lettre '+mode);
  assert.ok(hit.disturbed && hit.x>0,'Le choc est visible avant la prochaine frame et avant le lâcher');
}
for(const [from,to,obstacle,axis,sign] of [
  [[340,300],[40,300],[160,300],'x',-1],
  [[160,100],[160,700],[160,300],'y',1],
  [[160,700],[160,100],[160,300],'y',-1],
  [[40,100],[340,700],[160,340],'y',1]
]) {
  const {hit}=fastDrag('idle',from,to,obstacle);
  assert.ok(hit.disturbed && hit[axis]*sign>0,'Le balayage fonctionne dans chaque direction et en diagonale');
}
assert.equal(fastDrag('idle',[40,100],[340,100],[160,300]).hit.mode,'idle','Un passage éloigné ne produit aucun choc');
assert.equal(fastDrag('returning',[40,300],[340,300],[160,300]).hit.mode,'floating','La lettre tenue ne traverse pas une lettre en cours de retour');
const thrown={...make(),cx:160,cy:300,width:50,height:60,rotation:0,mode:'floating',vx:300,vy:0};
const homing={...make(),cx:180,cy:300,width:50,height:60,rotation:0,mode:'returning',vx:0,vy:0};
physics.collide([thrown,homing],viewport);
assert.equal(homing.mode,'returning','Une lettre lancée ne perturbe pas le retour explicite');
const stacked={...make(),cx:160,cy:300,width:50,height:60,rotation:0,mode:'hover',vx:0,vy:0};
const held={...make(),cx:160,cy:300,width:50,height:60,rotation:0,mode:'dragging'};
physics.drag(held,0,0,[held,stacked],viewport);
assert.equal(stacked.mode,'floating','Un chevauchement avec une lettre survolée est résolu immédiatement');
const group=[100,200,260,320].map((cx,i)=>({...make(),cx,cy:400,width:50,height:60,rotation:0,vx:i?0:650,vy:0,mode:i?'idle':'dragging'}));
physics.drag(group[0],160,0,group,{width:900,height:800});
for(let i=0;i<group.length;i++)for(let j=i+1;j<group.length;j++) {
  const extent=l=>{const a=l.rotation*Math.PI/180;return (Math.abs(Math.cos(a))*l.width+Math.abs(Math.sin(a))*l.height)*.41;};
  assert.ok(Math.abs(group[i].cx+group[i].x-group[j].cx-group[j].x)>=extent(group[i])+extent(group[j])-.5,'Le choc se propage au groupe avant tout rendu');
}
// Lancer d'un seul événement jusqu'au bord : sans place pour toutes, les
// lettres poussées s'échappent par l'autre axe au lieu de se recouvrir.
const row=[60,120,180,240,300,360,420].map((cx,i)=>({...make(),cx,cy:400,width:50,height:60,rotation:0,vx:i?0:650,vy:0,mode:i?'idle':'dragging'}));
physics.drag(row[0],900,0,row,{width:500,height:800});
const box=l=>{const a=l.rotation*Math.PI/180,c=Math.abs(Math.cos(a)),s=Math.abs(Math.sin(a));return {x:l.cx+l.x,y:l.cy+l.y,w:(c*l.width+s*l.height)*.41,h:(s*l.width+c*l.height)*.41};};
for(let i=0;i<row.length;i++)for(let j=i+1;j<row.length;j++) {
  const a=box(row[i]),b=box(row[j]);
  assert.ok(Math.abs(a.x-b.x)>=a.w+b.w-.5 || Math.abs(a.y-b.y)>=a.h+b.h-.5,'Aucune lettre ne reste coincée sous une autre contre le bord');
}
// Deux lettres qui tombent ensemble et se touchent gardent leur chute commune.
const falling=[300,349].map(cy=>({...make(),cx:200,cy,width:50,height:60,rotation:0,vx:0,vy:cy===300?130:100}));
physics.collide(falling,viewport);
assert.ok(Math.abs(falling[0].vy+falling[1].vy-230)<1e-9 && falling[0].vy<falling[1].vy,'Un contact entre lettres libres ne fige pas leur gravité');
process.stdout.write('Rebonds, survol local, repos stable, hitbox physique, collisions permanentes, mouvement persistant et retour explicite : OK\n');
