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
process.stdout.write('Rebonds, survol local, repos stable, hitbox physique, collisions permanentes, mouvement persistant et retour explicite : OK\n');
