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
 getBBox(){return{x:0,y:0,width:100,height:124};} getBoundingClientRect(){return{width:390,height:844};}
 addEventListener(type,fn){(this.handlers[type]??=[]).push(fn);}
 setPointerCapture(id){this.capture=id;} hasPointerCapture(id){return this.capture===id;} releasePointerCapture(){this.capture=null;}
}
function run(pointerEvents){
 let now=0,rafId=0;const frames=new Map(),handlers={};
 const identity=new Element(),svg=new Element('svg'),entry=new Element(),letter=new Element();
 entry.classList.add('letter-entry');letter.classList.add('wordmark-letter');entry.append(letter);svg.append(entry);identity.append(svg);
 const window={PortfolioLetterPhysics:physics,addEventListener:(type,fn)=>(handlers[type]??=[]).push(fn)};
 if(pointerEvents)window.PointerEvent=function(){};
 const document={querySelector:()=>identity,createElementNS:(_,name)=>new Element(name),body:new Element(),hidden:false,addEventListener(){}};
 const context={window,document,matchMedia:()=>({matches:false,addEventListener(){}}),AbortController,performance:{now:()=>now},
 requestAnimationFrame:fn=>{frames.set(++rafId,fn);return rafId;},cancelAnimationFrame:id=>frames.delete(id),setTimeout:()=>0,clearTimeout(){}};
 vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../js/wordmark.js'),'utf8'),context);
 window.initPortfolioWordmark(false);
 const emit=(type,x,y,target=letter,pointerType='touch')=>{
  const event={target,pointerType,pointerId:7,clientX:x,clientY:y,button:0,preventDefault(){}};
  if(type.startsWith('touch'))event.changedTouches=[{identifier:7,clientX:x,clientY:y}];
  handlers[type].forEach(fn=>fn(event));
 };
 const advance=(seconds)=>{for(let i=0;i<seconds*120;i++){now+=1000/120;const pending=[...frames];frames.clear();pending.forEach(([,fn])=>fn(now));}};
 if(pointerEvents){
  const hoverEvent={target:letter,pointerType:'mouse'};
  letter.handlers.pointerenter.forEach(fn=>fn(hoverEvent));advance(.5);
  assert.equal(letter.dataset.motion,'hover','Le survol reste une déviation locale');
  letter.handlers.pointerleave.forEach(fn=>fn(hoverEvent));
  assert.equal(letter.dataset.motion,'hover-returning','La sortie déclenche seulement le retour du survol');
  advance(4);assert.equal(letter.dataset.motion,'idle');
 }
 const types=pointerEvents?['pointerdown','pointermove','pointerup']:['touchstart','touchmove','touchend'];
 emit(types[0],26,422);now+=16;emit(types[1],290,150);emit(types[2],290,150);
 assert.equal(letter.dataset.motion,'floating');
 assert.ok(!svg.hasPointerCapture(7));
 advance(12);assert.equal(letter.dataset.motion,'floating','Le drag tactile ne déclenche aucun reset différé');
 emit(types[0],200,200);emit(types[2],200,200);assert.equal(letter.dataset.motion,'returning','Tap = reset');
 advance(8);assert.equal(letter.dataset.motion,'idle');
 process.stdout.write((pointerEvents?'Pointer Events tactiles':'Fallback touch natif')+' : drag plein écran, lâcher et tap OK\n');
}
run(true);run(false);
