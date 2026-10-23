const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const physics=require('../js/letter-physics.js');
class Element {
 constructor(name='g'){this.name=name;this.namespaceURI='http://www.w3.org/2000/svg';this.children=[];this.attrs={};this.dataset={};this.classes=new Set();this.classList={add:(s)=>this.classes.add(s),remove:(s)=>this.classes.delete(s),contains:(s)=>this.classes.has(s)};this.style={setProperty(){}};this.handlers={};}
 append(el){el.parent?.children.splice(el.parent.children.indexOf(el),1);el.parent=this;this.children.push(el);}
 prepend(el){el.parent=this;this.children.unshift(el);}
 remove(){this.parent?.children.splice(this.parent.children.indexOf(this),1);}
 setAttribute(k,v){this.attrs[k]=String(v);} removeAttribute(k){delete this.attrs[k];}
 querySelectorAll(selector){return this.children.flatMap(c=>[...(selector==='svg'?c.name==='svg':c.classes.has(selector.slice(1)))?[c]:[],...c.querySelectorAll(selector)]);}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
 contains(el){return el===this||this.children.some(c=>c.contains(el));} closest(){return null;}
 getBBox(){return this.box??{x:0,y:0,width:100,height:124};}
 getBoundingClientRect(){
  if(!this.classes.has('wordmark-letter'))return{width:390,height:844};
  const box=this.getBBox(),scale=358/1841,translate=this.attrs.transform?.match(/translate\(([-\d.]+) ([-\d.]+)\)/);
  const x=16+(box.x+Number(translate?.[1]||0))*scale,y=(844-124*scale)/2+(box.y+Number(translate?.[2]||0))*scale;
  return{x,y,left:x,top:y,right:x+box.width*scale,bottom:y+box.height*scale,width:box.width*scale,height:box.height*scale};
 }
 addEventListener(type,fn){(this.handlers[type]??=[]).push(fn);}
 setPointerCapture(id){this.capture=id;} hasPointerCapture(id){return this.capture===id;} releasePointerCapture(){this.capture=null;}
}
function run(pointerEvents){
 let now=0,rafId=0;const frames=new Map(),handlers={};
 const identity=new Element(),svg=new Element('svg'),entry=new Element(),letter=new Element();
 const hint=new Element('p'),toggleButton=new Element('button'),scatterLabel=new Element('span'),returnLabel=new Element('span'),status=new Element('span');
 entry.classList.add('letter-entry');letter.classList.add('wordmark-letter');entry.append(letter);svg.append(entry);identity.append(svg);
 const secondEntry=new Element(),secondLetter=new Element();
 secondEntry.classList.add('letter-entry');secondLetter.classList.add('wordmark-letter');
 secondLetter.box={x:125,y:0,width:100,height:124};secondEntry.append(secondLetter);svg.append(secondEntry);
 hint.classList.add('wordmark-hint');toggleButton.classList.add('wordmark-toggle');scatterLabel.classList.add('wordmark-hint-default');returnLabel.classList.add('wordmark-hint-return');status.classList.add('wordmark-status');
 returnLabel.hidden=true;toggleButton.append(scatterLabel);toggleButton.append(returnLabel);hint.append(toggleButton);identity.append(hint);identity.append(status);
 const window={PortfolioLetterPhysics:physics,addEventListener:(type,fn)=>(handlers[type]??=[]).push(fn)};
 if(pointerEvents)window.PointerEvent=function(){};
 const document={querySelector:()=>identity,createElementNS:(_,name)=>new Element(name),body:new Element(),hidden:false,addEventListener(){}};
 const context={window,document,matchMedia:()=>({matches:false,addEventListener(){}}),getComputedStyle:()=>({getPropertyValue:()=> 'cubic-bezier(.22, 1, .36, 1)'}),AbortController,performance:{now:()=>now},
 requestAnimationFrame:fn=>{frames.set(++rafId,fn);return rafId;},cancelAnimationFrame:id=>frames.delete(id),setTimeout:()=>0,clearTimeout(){}};
 vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../js/wordmark.js'),'utf8'),context);
 window.initPortfolioWordmark(false);
 const emit=(type,x,y,target=letter,pointerType='touch')=>{
  const event={target,pointerType,pointerId:7,clientX:x,clientY:y,button:0,preventDefault(){}};
  if(type.startsWith('touch'))event.changedTouches=[{identifier:7,clientX:x,clientY:y}];
  handlers[type].forEach(fn=>fn(event));
 };
 const advance=(seconds)=>{for(let i=0;i<seconds*120;i++){now+=1000/120;const pending=[...frames];frames.clear();pending.forEach(([,fn])=>fn(now));}};
 const types=pointerEvents?['pointerdown','pointermove','pointerup']:['touchstart','touchmove','touchend'];
 emit(types[0],26,422);now+=8;emit(types[1],200,422);
 assert.equal(secondLetter.dataset.motion,'floating','Un événement rapide traversant la voisine déclenche immédiatement le choc');
 emit(types[2],200,422);toggleButton.handlers.click[0]();advance(8);
 emit(types[0],26,422);now+=8;emit(types[2],200,422);
 assert.equal(secondLetter.dataset.motion,'floating','La dernière position du relâchement participe aussi aux collisions');
 toggleButton.handlers.click[0]();advance(8);
 emit(types[0],26,422);now+=16;emit(types[1],50,422);
 assert.equal(secondLetter.dataset.motion,'floating','La collision tactile réveille la lettre voisine');
 const collisionTransform=secondLetter.attrs.transform;
 advance(.2);
 assert.notEqual(secondLetter.attrs.transform,collisionTransform,'La lettre percutée continue à bouger pendant le maintien du doigt');
 assert.equal(letter.dataset.motion,'dragging');
 const toggle=()=>toggleButton.handlers.click[0]();
 emit(types[2],50,422);toggle();advance(8);
 toggle();
 assert.equal(letter.dataset.motion,'floating','Bousculez-moi disperse la lettre');
 assert.equal(letter.attrs.transform,'translate(0.000 0.000) rotate(0.000 50 62)','La dispersion part de la position initiale');
 assert.equal(scatterLabel.hidden,true);assert.equal(returnLabel.hidden,false);
 advance(.2);assert.notEqual(letter.attrs.transform,'translate(0.000 0.000) rotate(0.000 50 62)');
 toggle();
 assert.equal(scatterLabel.hidden,false);assert.equal(returnLabel.hidden,true,'Le bouton rebascule sans attendre la fin du retour');
 const interruptedTransform=letter.attrs.transform;
 toggle();
 assert.equal(letter.attrs.transform,interruptedTransform,'Une relance ne téléporte pas la lettre');
 assert.equal(letter.dataset.motion,'gathering');
 advance(.25);assert.equal(letter.dataset.motion,'floating','La dispersion reprend après le recentrage');
 toggle();
 advance(8);
 assert.equal(letter.dataset.motion,'idle','Ramenez-moi replace la lettre');
 assert.equal(letter.attrs.transform,'translate(0.000 0.000) rotate(0.000 50 62)');
 assert.equal(scatterLabel.hidden,false);assert.equal(returnLabel.hidden,true);
 if(pointerEvents){
  const hoverEvent={target:letter,pointerType:'mouse'};
  letter.handlers.pointerenter.forEach(fn=>fn(hoverEvent));advance(.25);
  assert.equal(letter.dataset.motion,'hover','Le survol reste une déviation locale');
  assert.ok(frames.size>0,'Le ressort conserve son approche progressive au-delà de 200 ms');
  advance(3);
  assert.equal(frames.size,0,'Le survol stabilisé ne garde aucune boucle RAF');
  letter.handlers.pointerleave.forEach(fn=>fn(hoverEvent));
  assert.equal(letter.dataset.motion,'hover-returning','La sortie déclenche seulement le retour du survol');
  advance(3);assert.equal(letter.dataset.motion,'idle','Le retour de survol amorti rejoint le repos');
 }
 emit(types[0],26,422);now+=16;emit(types[1],290,150);emit(types[2],290,150);
 assert.equal(letter.dataset.motion,'floating');
 assert.ok(!svg.hasPointerCapture(7));
 advance(12);assert.equal(letter.dataset.motion,'floating','Le drag tactile ne déclenche aucun reset différé');
 const tapBox=letter.getBoundingClientRect(),tapX=tapBox.x+tapBox.width/2,tapY=tapBox.y+tapBox.height/2;
 emit(types[0],tapX,tapY);emit(types[2],tapX,tapY);assert.equal(letter.dataset.motion,'returning','Tap = reset');
 advance(8);assert.equal(letter.dataset.motion,'idle');
 // Départ hors du tracé, dans sa marge tactile : le SVG est la cible native.
 emit(types[0],26,400,svg);assert.equal(letter.dataset.motion,'dragging','La marge tactile sélectionne la lettre la plus proche');
 emit(types[2],26,400);advance(8);
 process.stdout.write((pointerEvents?'Pointer Events tactiles':'Fallback touch natif')+' : drag plein écran, lâcher et tap OK\n');
}
run(true);run(false);
