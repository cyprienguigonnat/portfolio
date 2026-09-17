// Physique en pixels CSS, indépendante de la taille du tracé et de l'écran.
(function (root) {
  const COLLISION_SCALE = .82;

  function contain(letter, viewport, bounce = true) {
    const angle = letter.rotation * Math.PI / 180;
    const halfWidth = (Math.abs(Math.cos(angle))*letter.width + Math.abs(Math.sin(angle))*letter.height)/2;
    const halfHeight = (Math.abs(Math.sin(angle))*letter.width + Math.abs(Math.cos(angle))*letter.height)/2;
    const minX = Math.min(halfWidth+2,viewport.width/2), maxX = Math.max(minX,viewport.width-halfWidth-2);
    const minY = Math.min(halfHeight+2,viewport.height/2), maxY = Math.max(minY,viewport.height-halfHeight-2);
    const cx = letter.cx+letter.x, cy = letter.cy+letter.y;
    if (cx < minX) { letter.x=minX-letter.cx; if(bounce)letter.vx=Math.abs(letter.vx)*.86; }
    if (cx > maxX) { letter.x=maxX-letter.cx; if(bounce)letter.vx=-Math.abs(letter.vx)*.86; }
    if (cy < minY) { letter.y=minY-letter.cy; if(bounce)letter.vy=Math.abs(letter.vy)*.86; }
    if (cy > maxY) { letter.y=maxY-letter.cy; if(bounce)letter.vy=-Math.abs(letter.vy)*.86; }
  }
  function step(letter, dt, time, viewport) {
    if (letter.mode === 'floating') {
      // Champ de gravité lent et multidirectionnel, sans attraction vers l'origine.
      letter.vx += Math.sin(time*.57+letter.seed)*64*dt;
      letter.vy += (Math.cos(time*.43+letter.seed)*72+18)*dt;
      const damping = Math.exp(-.08*dt);
      letter.vx=Math.max(-420,Math.min(420,letter.vx*damping));
      letter.vy=Math.max(-420,Math.min(420,letter.vy*damping));
      letter.rotation += Math.sin(time*.6+letter.seed)*12*dt;
    } else if (letter.mode === 'hover' || letter.mode === 'hover-returning' || letter.mode === 'returning') {
      const targetX=letter.mode==='hover'?letter.hoverX:0;
      const targetY=letter.mode==='hover'?letter.hoverY:0;
      letter.vx += (-28*(letter.x-targetX)-10.5*letter.vx)*dt;
      letter.vy += (-28*(letter.y-targetY)-10.5*letter.vy)*dt;
      letter.rotation *= Math.exp(-5*dt);
    } else return;
    letter.x += letter.vx*dt; letter.y += letter.vy*dt;
    contain(letter,viewport);
    if ((letter.mode === 'returning' || letter.mode === 'hover-returning') && Math.abs(letter.x)+Math.abs(letter.y)+Math.abs(letter.vx)+Math.abs(letter.vy)+Math.abs(letter.rotation)<.15) {
      letter.x=letter.y=letter.vx=letter.vy=letter.rotation=0; letter.mode='idle';
    }
  }
  function extents(letter) {
    const angle=letter.rotation*Math.PI/180;
    return {x:(Math.abs(Math.cos(angle))*letter.width+Math.abs(Math.sin(angle))*letter.height)*COLLISION_SCALE/2,
      y:(Math.abs(Math.sin(angle))*letter.width+Math.abs(Math.cos(angle))*letter.height)*COLLISION_SCALE/2};
  }
  function collide(letters, viewport, dragged = null) {
    for(let i=0;i<letters.length;i++)for(let j=i+1;j<letters.length;j++) {
      const first=letters[i],second=letters[j];
      if(first.mode==='idle'&&second.mode==='idle')continue;
      if(first.mode==='returning'||first.mode==='hover'||first.mode==='hover-returning'||second.mode==='returning'||second.mode==='hover'||second.mode==='hover-returning')continue;
      const a=extents(first),b=extents(second);
      const dx=first.cx+first.x-second.cx-second.x,dy=first.cy+first.y-second.cy-second.y;
      const overlapX=a.x+b.x-Math.abs(dx),overlapY=a.y+b.y-Math.abs(dy);
      if(overlapX<=0||overlapY<=0)continue;
      const alongX=overlapX<overlapY,direction=(alongX?dx:dy)>=0?1:-1;
      const penetration=(alongX?overlapX:overlapY)+1;
      const firstFixed=first===dragged,secondFixed=second===dragged;
      const firstShare=firstFixed?0:secondFixed?1:.5,secondShare=secondFixed?0:firstFixed?1:.5;
      if(alongX) {
        first.x+=direction*penetration*firstShare;second.x-=direction*penetration*secondShare;
        const relative=first.vx-second.vx,impact=Math.max(42,Math.abs(relative)*.72);
        if(!firstFixed)first.vx=direction*impact*.72;
        if(!secondFixed)second.vx=-direction*impact*.72;
      } else {
        first.y+=direction*penetration*firstShare;second.y-=direction*penetration*secondShare;
        const relative=first.vy-second.vy,impact=Math.max(42,Math.abs(relative)*.72);
        if(!firstFixed)first.vy=direction*impact*.72;
        if(!secondFixed)second.vy=-direction*impact*.72;
      }
      for(const letter of [first,second])if(letter!==dragged) {
        letter.rotation+=direction*(alongX?3:-3);
        letter.mode='floating';letter.disturbed=true;
        contain(letter,viewport);
      }
      if(dragged)contain(dragged,viewport,false);
    }
  }
  const api={contain,step,collide};
  if(typeof module==='object' && module.exports)module.exports=api;
  else root.PortfolioLetterPhysics=api;
})(typeof window==='undefined'?globalThis:window);
