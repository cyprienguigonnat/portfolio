// Physique en pixels CSS, indépendante de la taille du tracé et de l'écran.
(function (root) {
  const COLLISION_SCALE = .82;
  // Seule la lettre tenue peut interrompre un retour ou un regroupement.
  const PROTECTED_MODES = new Set(['returning','gathering']);
  // Passes de relaxation entre lettres libres tant qu'une lettre est tenue.
  const SETTLE_PASSES = 4;
  // Tampons réutilisés : aucune allocation par frame dans le solveur.
  const bounds = [];
  let struck = new Uint8Array(32), pinned = new Uint8Array(32);

  // Courbe partagée avec les transitions CSS, fournie par le contrôleur.
  function glide(letter, dt, x, y, rotation) {
    if(letter.motion?.mode!==letter.mode)letter.motion={mode:letter.mode,x:letter.x,y:letter.y,rotation:letter.rotation,elapsed:0};
    const motion=letter.motion;
    motion.elapsed+=dt;
    const progress=Math.min(1,motion.elapsed/.2),ease=letter.ease?letter.ease(progress):progress;
    letter.x=motion.x+(x-motion.x)*ease;
    letter.y=motion.y+(y-motion.y)*ease;
    letter.rotation=motion.rotation+(rotation-motion.rotation)*ease;
    letter.vx=letter.vy=0;
    if(progress===1) {
      letter.motion=null;
      if(letter.mode==='hover')letter.hoverSettled=true;
      else letter.mode='idle';
    }
  }

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
    if(letter.mode==='gathering') {
      glide(letter,dt,0,0,0);
      contain(letter,viewport,false);
      return;
    }
    if(letter.mode==='hover' && letter.hoverSettled)return;
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
    if(letter.mode==='hover' && Math.abs(letter.x-letter.hoverX)+Math.abs(letter.y-letter.hoverY)+Math.abs(letter.vx)+Math.abs(letter.vy)+Math.abs(letter.rotation)<.15) {
      letter.x=letter.hoverX;letter.y=letter.hoverY;letter.vx=letter.vy=letter.rotation=0;letter.hoverSettled=true;
    }
    if ((letter.mode === 'returning' || letter.mode === 'hover-returning') && Math.abs(letter.x)+Math.abs(letter.y)+Math.abs(letter.vx)+Math.abs(letter.vy)+Math.abs(letter.rotation)<.15) {
      letter.x=letter.y=letter.vx=letter.vy=letter.rotation=0; letter.mode='idle';
    }
  }
  function extents(letter, out = {x:0,y:0}) {
    const angle=letter.rotation*Math.PI/180,cos=Math.abs(Math.cos(angle)),sin=Math.abs(Math.sin(angle));
    out.x=(cos*letter.width+sin*letter.height)*COLLISION_SCALE/2;
    out.y=(sin*letter.width+cos*letter.height)*COLLISION_SCALE/2;
    return out;
  }
  // La lettre tenue est toujours solide. Entre lettres libres, une paire
  // n'interagit que si l'une d'elles flotte : le nom composé reste au repos.
  function interacts(first, second, held) {
    if(first===held || second===held)return true;
    if(PROTECTED_MODES.has(first.mode) || PROTECTED_MODES.has(second.mode))return false;
    return first.mode==='floating' || second.mode==='floating';
  }
  function knock(letter, alongX, velocity) {
    if(alongX)letter.vx=velocity;else letter.vy=velocity;
    letter.mode='floating';letter.hoverSettled=false;letter.disturbed=true;
  }
  // Une lettre calée contre un bord ne peut pas reculer sur cet axe.
  function blocked(letter, bound, alongX, shift, viewport) {
    if(!shift)return false;
    const half=(alongX?bound.x:bound.y)/COLLISION_SCALE,size=alongX?viewport.width:viewport.height;
    const centre=(alongX?letter.cx+letter.x:letter.cy+letter.y)+shift;
    return centre-half<2 || centre+half>size-2;
  }
  // Sépare la paire i/j si elle se recouvre ; renvoie true s'il y avait contact.
  function separate(letters, i, j, held, viewport) {
    const first=letters[i],second=letters[j],a=bounds[i],b=bounds[j];
    const dx=first.cx+first.x-second.cx-second.x,dy=first.cy+first.y-second.cy-second.y;
    const overlapX=a.x+b.x-Math.abs(dx),overlapY=a.y+b.y-Math.abs(dy);
    if(overlapX<=0||overlapY<=0)return false;
    // Propagation du choc : une lettre déjà poussée par la lettre tenue reste
    // en place face aux suivantes, la file se range en une passe.
    const firstFixed=first===held || pinned[i],secondFixed=second===held || pinned[j];
    const firstShare=firstFixed===secondFixed?.5:firstFixed?0:1;
    if(firstFixed!==secondFixed)pinned[firstFixed?j:i]=1;
    // Axe de moindre recouvrement, sauf si une lettre est calée contre un bord :
    // elle s'échappe alors par l'autre axe. À égalité, côtés alternés.
    let alongX=overlapX<overlapY;
    for(let tries=0;tries<2;tries++) {
      const offset=alongX?dx:dy,direction=offset>0 || (!offset && j&1)?1:-1;
      const depth=((alongX?overlapX:overlapY)+1)*direction;
      if(tries || (!blocked(first,a,alongX,depth*firstShare,viewport) && !blocked(second,b,alongX,-depth*(1-firstShare),viewport))) {
        if(alongX){first.x+=depth*firstShare;second.x-=depth*(1-firstShare);}
        else {first.y+=depth*firstShare;second.y-=depth*(1-firstShare);}
        // La lettre tenue frappe toujours ; entre lettres libres, impulsion
        // seulement si elles se rapprochent. Une seule par lettre et par appel :
        // un amas dense ne fait pas tourner ses lettres en boucle.
        const relative=alongX?first.vx-second.vx:first.vy-second.vy;
        if(first===held || second===held || relative*direction<=0) {
          // Entre lettres libres, la vitesse commune (la gravité) est conservée et
          // seul l'écart rebondit : un amas continue de tomber au lieu de flotter.
          const hit=first===held || second===held,speed=Math.abs(relative),spin=direction*(alongX?3:-3);
          const shared=hit?0:(alongX?first.vx+second.vx:first.vy+second.vy)/2;
          const bounce=direction*(hit?Math.max(42,speed*.72)*.72:speed*.36);
          if(first!==held && !struck[i]){struck[i]=1;knock(first,alongX,shared+bounce);first.rotation+=spin;extents(first,a);}
          if(second!==held && !struck[j]){struck[j]=1;knock(second,alongX,shared-bounce);second.rotation+=spin;extents(second,b);}
        }
        break;
      }
      alongX=!alongX;
    }
    if(first!==held)contain(first,viewport);
    if(second!==held)contain(second,viewport);
    return true;
  }
  // Prépare les tampons d'un appel et renvoie l'indice de la lettre tenue.
  function prepare(letters, held) {
    const count=letters.length;
    for(let i=0;i<count;i++)bounds[i]=extents(letters[i],bounds[i]);
    if(struck.length<count){struck=new Uint8Array(count);pinned=new Uint8Array(count);}
    struck.fill(0,0,count);
    return held?letters.indexOf(held):-1;
  }
  // La lettre tenue est cinématique : elle écarte entièrement chaque lettre
  // qu'elle touche. Coût linéaire.
  function clear(letters, h, viewport) {
    for(let j=0;j<letters.length;j++)if(j!==h)separate(letters,h,j,letters[h],viewport);
  }
  // Les passes propagent le choc au groupe ; la lettre tenue écarte ensuite
  // tout ce qui la touche encore, rien ne reste dessous au rendu.
  function solve(letters, viewport, held, h, passes) {
    const count=letters.length;
    pinned.fill(0,0,count);
    for(let pass=0;pass<passes;pass++) {
      let touched=false;
      for(let i=0;i<count;i++)for(let j=i+1;j<count;j++)
        if(interacts(letters[i],letters[j],held) && separate(letters,i,j,held,viewport))touched=true;
      if(!touched)break;
    }
    if(held)clear(letters,h,viewport);
  }
  // Le déplacement est découpé en pas plus courts que la demi-lettre tenue :
  // elle ne peut plus sauter par-dessus une lettre, même lorsqu'un seul
  // événement traverse tout le nom. Un geste lent reste en un seul pas.
  function drag(held, x, y, letters, viewport) {
    const h=prepare(letters,held),fromX=held.x,fromY=held.y,a=bounds[h];
    held.x=x;held.y=y;contain(held,viewport,false);
    const dx=held.x-fromX,dy=held.y-fromY;
    const steps=Math.max(1,Math.ceil(Math.max(Math.abs(dx)/a.x,Math.abs(dy)/a.y)));
    for(let k=1;k<=steps;k++) {
      held.x=fromX+dx*k/steps;held.y=fromY+dy*k/steps;
      solve(letters,viewport,held,h,1);
    }
    solve(letters,viewport,held,h,SETTLE_PASSES);
  }
  function collide(letters, viewport, held = null) {
    solve(letters,viewport,held,prepare(letters,held),held?SETTLE_PASSES:1);
  }
  const api={contain,step,collide,drag};
  if(typeof module==='object' && module.exports)module.exports=api;
  else root.PortfolioLetterPhysics=api;
})(typeof window==='undefined'?globalThis:window);
