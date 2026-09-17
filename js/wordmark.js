window.initPortfolioWordmark = function (animateEntry = true) {
  const identity=document.querySelector('#site-shell .home-identity');
  if(!identity)return ()=>{};
  const svg=identity.querySelector('svg'),hint=identity.querySelector('.wordmark-hint'),status=identity.querySelector('.wordmark-status'),physics=window.PortfolioLetterPhysics;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const controller=new AbortController(), options={signal:controller.signal};
  const layout=document.createElementNS('http://www.w3.org/2000/svg','g');
  layout.classList.add('wordmark-layout');
  const entries=[...svg.querySelectorAll('.letter-entry')];
  entries.forEach(entry=>layout.append(entry));
  svg.append(layout);
  const letters=entries.map((entry,index)=>{
    const el=entry.querySelector('.wordmark-letter'), box=el.getBBox();
    el.setAttribute('role','button');
    el.setAttribute('tabindex','0');
    el.setAttribute('aria-label','Lettre '+ 'CYPRIENGUIGONNAT'[index] +' : Entrée pour bousculer ou ramener, flèches pour déplacer');
    const hitbox=document.createElementNS(svg.namespaceURI,'rect');
    hitbox.classList.add('letter-hitbox');
    hitbox.setAttribute('x',box.x-3);hitbox.setAttribute('y',box.y-3);
    hitbox.setAttribute('width',box.width+6);hitbox.setAttribute('height',box.height+6);
    el.prepend(hitbox);
    entry.style.setProperty('--entry-offset',(Math.random()<.5?-1:1)*(90+Math.random()*65)+'px');
    return {el,box,glyphX:box.x+box.width/2,glyphY:box.y+box.height/2,
      cx:0,cy:0,width:0,height:0,x:0,y:0,vx:0,vy:0,rotation:0,mode:'idle',seed:index*.73,
      disturbed:false,hoverX:Math.sin(index*1.91)*9,hoverY:-7-Math.abs(Math.cos(index*1.37))*8};
  });
  svg.removeAttribute('aria-hidden');
  svg.setAttribute('role','group');
  svg.setAttribute('aria-label','Cyprien Guigonnat, lettres interactives');
  let size={width:0,height:0},scale=1,frame=0,last=0,dragged=null,hovered=null,disposed=false;
  let entranceTimer;
  const clamp=(n,max)=>Math.max(-max,Math.min(max,n));
  function render(letter) {
    letter.el.setAttribute('transform','translate('+(letter.x/scale).toFixed(3)+' '+(letter.y/scale).toFixed(3)+') rotate('+letter.rotation.toFixed(3)+' '+letter.glyphX+' '+letter.glyphY+')');
    letter.el.dataset.motion=letter.mode;
  }
  function updateHint() {
    const returning=letters.some(letter=>letter.disturbed);
    hint?.classList.toggle('is-returning',returning);
    if(status && status.dataset.returning!==String(returning)) {
      status.dataset.returning=String(returning);
      status.textContent=returning?'Ramenez-moi':'Bousculez-moi';
    }
  }
  function measure() {
    const old=size;
    const viewport=identity.getBoundingClientRect();
    size={width:viewport.width,height:viewport.height};
    scale=Math.max(.01,(size.width-32)/1841);
    identity.style.setProperty('--wordmark-height',(124*scale)+'px');
    svg.setAttribute('viewBox','0 0 '+size.width+' '+size.height);
    identity.classList.add('wordmark-ready');
    layout.setAttribute('transform','translate(16 '+(size.height-124*scale)/2+') scale('+scale+')');
    for(const letter of letters) {
      const oldX=letter.cx+letter.x,oldY=letter.cy+letter.y;
      letter.cx=16+letter.glyphX*scale;
      letter.cy=(size.height-124*scale)/2+letter.glyphY*scale;
      letter.width=letter.box.width*scale;letter.height=letter.box.height*scale;
      if(old.width && letter.mode!=='idle') {
        letter.x=oldX*size.width/old.width-letter.cx;
        letter.y=oldY*size.height/old.height-letter.cy;
      }
      physics.contain(letter,size,false);render(letter);
    }
  }
  function start() {
    if(!frame && !disposed && !document.hidden && !reduced.matches && letters.some(letter=>letter.mode!=='idle')) {
      last=performance.now();frame=requestAnimationFrame(tick);
    }
  }
  function tick(now) {
    frame=0;
    if(disposed || document.hidden || reduced.matches)return;
    const elapsed=Math.min((now-last)/1000,.05);last=now;
    const steps=Math.max(1,Math.ceil(elapsed/(1/120)));
    for(let i=0;i<steps;i++) {
      for(const letter of letters)if(letter!==dragged)physics.step(letter,elapsed/steps,now/1000,size);
      physics.collide(letters,size,dragged);
    }
    for(const letter of letters)if(letter.disturbed && letter.mode==='idle')letter.disturbed=false;
    letters.forEach(render);
    updateHint();
    if(letters.some(letter=>letter.mode!=='idle'))frame=requestAnimationFrame(tick);
  }
  function float(letter) {
    letter.mode='floating';
    render(letter);start();
  }
  function resetLetter(letter) {
    letter.mode='returning';letter.vx=letter.vy=0;
    if(reduced.matches) {letter.x=letter.y=letter.rotation=0;letter.mode='idle';letter.disturbed=false;}
    render(letter);updateHint();start();
  }
  function setHovered(letter) {
    for(const other of letters)if(other!==letter && other.mode==='hover')other.mode='hover-returning';
    if(letter===hovered && letter?.mode==='hover')return;
    hovered=letter;
    if(letter?.mode==='idle') {
      letter.mode='hover';letter.rotation=Math.sin(letter.seed)*2.2;start();
    }
  }
  function targetLetter(event) {
    if(event.target.closest?.('a,button,input,textarea,select'))return null;
    return letters.find(letter=>letter.el.contains(event.target))||null;
  }
  function down(event) {
    if(dragged || document.body.classList.contains('is-navigating') || (event.button!==undefined && event.button!==0) || identity.classList.contains('is-arriving'))return;
    const letter=targetLetter(event);
    if(!letter)return;
    event.preventDefault();
    if(hovered?.mode==='hover')hovered.mode='hover-returning';
    dragged=letter;hovered=null;
    Object.assign(letter,{mode:'dragging',pointerId:event.pointerId,startX:letter.x,startY:letter.y,
      startPX:event.clientX,startPY:event.clientY,lastPX:event.clientX,lastPY:event.clientY,lastTime:performance.now(),moved:false,vx:0,vy:0});
    letter.el.classList.add('is-dragging');
    if(event.pointerId!==undefined && 'PointerEvent' in window)svg.setPointerCapture(event.pointerId);
    render(letter);
  }
  function move(event) {
    if(dragged) {
      if(event.pointerId!==undefined && event.pointerId!==dragged.pointerId)return;
      event.preventDefault();
      const letter=dragged,now=performance.now(),dt=Math.max((now-letter.lastTime)/1000,.008);
      const dx=event.clientX-letter.startPX,dy=event.clientY-letter.startPY;
      letter.moved ||= Math.hypot(dx,dy)>5;
      if(letter.moved) {
        letter.x=letter.startX+dx;letter.y=letter.startY+dy;
        letter.disturbed=true;
        letter.vx=clamp((event.clientX-letter.lastPX)/dt,650);
        letter.vy=clamp((event.clientY-letter.lastPY)/dt,650);
        letter.rotation=clamp(letter.vx*.02,14);
        physics.contain(letter,size,false);
        physics.collide(letters,size,letter);
        updateHint();
        letters.forEach(render);
      }
      letter.lastPX=event.clientX;letter.lastPY=event.clientY;letter.lastTime=now;
    } else if(event.pointerType!=='touch' && !reduced.matches && !identity.classList.contains('is-arriving')) {
      setHovered(targetLetter(event));
    }
  }
  function up(event,cancelled=false) {
    if(!dragged || (event.pointerId!==undefined && event.pointerId!==dragged.pointerId))return;
    const letter=dragged;dragged=null;hovered=null;
    letter.el.classList.remove('is-dragging');
    if(letter.pointerId!==undefined && svg.hasPointerCapture?.(letter.pointerId))svg.releasePointerCapture(letter.pointerId);
    if(!letter.moved && !cancelled)resetLetter(letter);
    else {
      if(performance.now()-letter.lastTime>100)letter.vx=letter.vy=0;
      float(letter);
    }
  }
  for(const letter of letters)letter.el.addEventListener('keydown',event=>{
    if(document.body.classList.contains('is-navigating') || identity.classList.contains('is-arriving'))return;
    const directions={ArrowLeft:[-16,0],ArrowRight:[16,0],ArrowUp:[0,-16],ArrowDown:[0,16]};
    if(event.key==='Enter' || event.key===' ') {
      event.preventDefault();
      if(letter.disturbed)resetLetter(letter);
      else {
        letter.disturbed=true;letter.y-=16;
        physics.contain(letter,size,false);
        if(reduced.matches)render(letter);else float(letter);
      }
    } else if(directions[event.key]) {
      event.preventDefault();
      const [x,y]=directions[event.key];
      letter.x+=x;letter.y+=y;letter.disturbed=true;
      physics.contain(letter,size,false);
      if(reduced.matches)render(letter);else float(letter);
    } else return;
    updateHint();
  },options);
  // Écoute sur toute la fenêtre et capture du pointeur : souris, stylet et tactile.
  if('PointerEvent' in window) {
    for(const letter of letters) {
      letter.el.addEventListener('pointerenter',event=>{
        if(!dragged && event.pointerType!=='touch' && !reduced.matches && !identity.classList.contains('is-arriving'))setHovered(letter);
      },options);
      letter.el.addEventListener('pointerleave',event=>{
        if(!dragged && event.pointerType!=='touch' && letter.mode==='hover') {
          letter.mode='hover-returning';
          if(hovered===letter)hovered=null;
          render(letter);
          start();
        }
      },options);
    }
    window.addEventListener('pointerdown',down,{...options,passive:false});
    window.addEventListener('pointermove',move,{...options,passive:false});
    window.addEventListener('pointerup',event=>up(event),options);
    window.addEventListener('pointercancel',event=>up(event,true),options);
    svg.addEventListener('lostpointercapture',event=>up(event,true),options);
  } else {
    window.addEventListener('mousedown',down,options);
    window.addEventListener('mousemove',move,options);
    window.addEventListener('mouseup',event=>up(event),options);
    const touchEvent=(event,touch)=>({target:event.target,pointerType:'touch',pointerId:touch.identifier,
      clientX:touch.clientX,clientY:touch.clientY,preventDefault:()=>event.preventDefault()});
    window.addEventListener('touchstart',event=>{if(!dragged)down(touchEvent(event,event.changedTouches[0]));},{...options,passive:false});
    window.addEventListener('touchmove',event=>{
      const touch=[...event.changedTouches].find(t=>t.identifier===dragged?.pointerId);
      if(touch)move(touchEvent(event,touch));
    },{...options,passive:false});
    for(const type of ['touchend','touchcancel'])window.addEventListener(type,event=>{
      const touch=[...event.changedTouches].find(t=>t.identifier===dragged?.pointerId);
      if(touch)up(touchEvent(event,touch),type==='touchcancel');
    },options);
  }
  function pause() {
    up({},true);cancelAnimationFrame(frame);frame=0;
    if(hovered?.mode==='hover')hovered.mode='hover-returning';
    hovered=null;
  }
  window.addEventListener('blur',pause,options);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();else start();},options);
  window.addEventListener('focus',start,options);
  window.addEventListener('resize',()=>{measure();start();},options);
  reduced.addEventListener('change',()=>{cancelAnimationFrame(frame);frame=0;identity.classList.remove('is-arriving');if(!reduced.matches)start();},options);
  measure();
  updateHint();start();
  if(animateEntry && !reduced.matches) {
    identity.classList.add('is-arriving');
    entranceTimer=setTimeout(()=>identity.classList.remove('is-arriving'),1000);
  }
  return ()=>{
    disposed=true;pause();controller.abort();clearTimeout(entranceTimer);
    identity.classList.remove('is-arriving');
    entries.forEach(entry=>{entry.querySelector('.letter-hitbox')?.remove();entry.querySelector('.wordmark-letter').removeAttribute('transform');svg.append(entry);});
    layout.remove();
    svg.setAttribute('viewBox','0 0 1841 124');
    svg.setAttribute('aria-hidden','true');
    svg.removeAttribute('role');svg.removeAttribute('aria-label');
    identity.classList.remove('wordmark-ready');
  };
};
