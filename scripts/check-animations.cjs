const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..','dist');
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.woff2':'font/woff2','.png':'image/png','.webp':'image/webp','.ico':'image/x-icon'};
const server=http.createServer((request,response)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(new URL(request.url,'http://localhost').pathname).replace(/\/$/,'/index.html'));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){response.writeHead(404);response.end();return;}
  response.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');
  fs.createReadStream(file).pipe(response);
});
async function settled(page){await page.waitForFunction(()=>!document.documentElement.classList.contains('is-booting')&&!document.body.classList.contains('is-navigating'));}
async function returnNavigation(page,action,destination){
  await page.evaluate(()=>window.navigationAnimations=[]);
  await action();await page.waitForURL(destination);await settled(page);
  assert.ok((await page.evaluate(()=>window.navigationAnimations)).includes('site-shell'),'Le retour de projet doit rester fluide');
  assert.equal(await page.locator('#transition-layer > *').count(),0);
  if(await page.locator('.home-identity').count()){
    assert.equal(await page.locator('.home-identity.is-arriving').count(),0,'Pas de nouvelle animation d’entrée au retour');
  }
}
async function animatedNavigation(page,action,destination,{imageFlight=false,sourceBox=null}={}){
  await page.evaluate(()=>window.transitionEvidence={snapshots:0,images:0,flight:null});
  await action();
  // Conserver la preuve dans la page : une transition courte peut être terminée
  // avant le prochain aller-retour du pilote, surtout sur une machine chargée.
  await page.waitForFunction(()=>window.transitionEvidence.snapshots>0);
  if(imageFlight){
    await page.waitForFunction(()=>window.transitionEvidence.flight);
    const flight=await page.evaluate(()=>window.transitionEvidence.flight);
    assert.ok(flight.complete&&flight.naturalWidth>0,'Image de transition non décodée');
    assert.equal(flight.frames.length,2,'Trajectoire de transition absente');
    assert.notEqual(flight.frames[0],flight.frames[1],'Image de transition immobile');
    if(sourceBox){
      for(const key of ['x','y','width','height'])assert.ok(Math.abs(flight[key]-sourceBox[key])<1,'La transition doit partir de la miniature mobile : '+key);
      assert.equal(await page.locator('.home-thumbnail').count(),0,'Aucun aperçu central sur mobile');
    }
  }
  const active=await page.evaluate(()=>window.transitionEvidence);
  assert.ok(active.snapshots>0,'Instantané de transition absent');
  if(imageFlight)assert.ok(active.images>0,'Animation d’image absente');
  if(imageFlight && process.env.MOTION_OUTPUT){
    const output=path.resolve(process.env.MOTION_OUTPUT);
    fs.mkdirSync(output,{recursive:true});
    await page.evaluate(()=>{
      window.capturedMotion=document.getAnimations().filter(animation=>animation.effect.target.matches('#site-shell,.transition-image,.transition-snapshot'));
      const elapsed=window.capturedMotion.find(animation=>animation.effect.target.matches('.transition-image')).effect.getTiming().duration*.5;
      window.capturedMotion.forEach(animation=>{animation.pause();animation.currentTime=Math.min(elapsed,animation.effect.getTiming().duration);});
    });
    await page.screenshot({path:path.join(output,'transition-'+page.viewportSize().width+'.png')});
    await page.evaluate(()=>{window.capturedMotion.forEach(animation=>animation.play());delete window.capturedMotion;});
  }
  await page.waitForURL(destination);
  await settled(page);
  assert.equal(await page.locator('#transition-layer > *').count(),0,'Calque de transition non nettoyé');
}
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({headless:true});
  const errors=[];
  try{
    const page=await browser.newPage({viewport:{width:1440,height:900}});
    const observeAnimations=()=>{
      window.navigationAnimations=[];
      window.wordmarkEntered=false;
      document.addEventListener('animationstart',event=>{
        if(event.animationName==='letter-arrive')window.wordmarkEntered=true;
      });
      const animate=Element.prototype.animate;
      Element.prototype.animate=function(...args){
        if(this.matches('#site-shell,.transition-snapshot,.transition-image'))window.navigationAnimations.push(this.className||this.id);
        const evidence=window.transitionEvidence;
        if(evidence && this.matches('#site-shell,.transition-snapshot,.transition-image')) {
          evidence.snapshots=Math.max(evidence.snapshots,document.querySelectorAll('.transition-snapshot').length);
          evidence.images=Math.max(evidence.images,document.querySelectorAll('.transition-image').length);
          if(this.matches('.transition-image')) {
            const frames=args[0],start=new DOMMatrix(frames[0].transform);
            evidence.flight={complete:this.complete,naturalWidth:this.naturalWidth,frames:frames.map(frame=>frame.transform),x:start.e,y:start.f,width:parseFloat(this.style.width),height:parseFloat(this.style.height)};
          }
        }
        return animate.apply(this,args);
      };
    };
    await page.addInitScript(observeAnimations);
    page.on('pageerror',error=>errors.push(error.message));
    page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
    await page.goto(base+'/index.html');
    await page.waitForSelector('.home-identity.wordmark-ready');
    await page.waitForFunction(()=>window.wordmarkEntered);
    await settled(page);
    // Mesurer au moment de l'apparition, sans dépendre de la latence du pilote.
    await page.evaluate(()=>{
      const observer=new MutationObserver(()=>{
        const image=document.querySelector('.home-thumbnail.is-visible');
        if(!image)return;
        window.previewEntrance={opacity:Number(getComputedStyle(image).opacity),transitions:image.getAnimations().map(animation=>animation.transitionProperty)};
        observer.disconnect();
      });
      observer.observe(document.querySelector('.preview-stage'),{subtree:true,attributes:true,attributeFilter:['class']});
    });
    const first=page.locator('.project-link').first();
    await first.hover();
    await page.waitForFunction(()=>window.previewEntrance);
    const entrance=await page.evaluate(()=>window.previewEntrance);
    assert.ok(entrance.opacity<1,'Le premier aperçu doit apparaître progressivement');
    assert.ok(entrance.transitions.includes('opacity')&&entrance.transitions.includes('transform'),'Transitions du premier aperçu absentes');
    // Simuler un décodage lent : sortir du titre avant que son image soit prête.
    await page.mouse.move(0,0);
    await page.waitForFunction(()=>!document.querySelector('.home-thumbnail'));
    await page.evaluate(()=>{
      const decode=HTMLImageElement.prototype.decode;
      HTMLImageElement.prototype.decode=function(){
        const ready=decode.call(this);
        return this.classList.contains('home-thumbnail')
          ? Promise.all([ready,new Promise(resolve=>setTimeout(resolve,300))])
          : ready;
      };
      window.latePreview=false;
      const observer=new MutationObserver(()=>{
        if(document.querySelector('.home-thumbnail.is-visible'))window.latePreview=true;
      });
      observer.observe(document.querySelector('.preview-stage'),{subtree:true,attributes:true,attributeFilter:['class']});
      window.previewObserver=observer;
    });
    await first.hover();
    await page.mouse.move(0,0);
    await page.waitForFunction(()=>!document.querySelector('.home-thumbnail'));
    assert.equal(await page.evaluate(()=>window.latePreview),false,'Un aperçu quitté pendant le décodage ne doit pas apparaître');
    await page.evaluate(()=>window.previewObserver.disconnect());
    const letter=page.locator('.wordmark-letter').first();
    const initial=await letter.getAttribute('transform');
    await letter.hover();
    await page.waitForFunction(value=>document.querySelector('.wordmark-letter').getAttribute('transform')!==value,initial);
    await page.waitForTimeout(2500);
    const settledHoverMutations=await page.evaluate(()=>new Promise(resolve=>{
      let mutations=0;
      const observer=new MutationObserver(records=>mutations+=records.length);
      observer.observe(document.querySelector('.home-identity'),{subtree:true,attributes:true});
      setTimeout(()=>{observer.disconnect();resolve(mutations);},300);
    }));
    assert.equal(settledHoverMutations,0,'Aucune mutation au survol une fois la lettre stabilisée');
    const box=await letter.boundingBox();
    await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
    await page.mouse.down();
    await page.mouse.move(box.x+box.width/2+96,box.y+box.height/2-64,{steps:8});
    await page.mouse.up();
    assert.equal(await letter.getAttribute('data-motion'),'floating');
    await animatedNavigation(page,()=>first.click(),/\/projets\/infomaniak\.html$/,{imageFlight:true});
    await animatedNavigation(page,()=>page.locator('[rel=next]').click(),/\/projets\/france-titres\.html$/);
    await animatedNavigation(page,()=>page.locator('[rel=prev]').click(),/\/projets\/infomaniak\.html$/);
    assert.match(await page.locator('.project-close').getAttribute('href'),/\/index\.html$/);
    await returnNavigation(page,()=>page.locator('.project-close').click(),/\/index\.html$/);
    await animatedNavigation(page,()=>page.getByRole('link',{name:'Informations',exact:true}).click(),/\/informations\.html$/);
    await animatedNavigation(page,()=>page.getByRole('link',{name:'Données du site',exact:true}).click(),/\/donnees-du-site\.html$/);
    await animatedNavigation(page,()=>page.locator('a[href="projets/infomaniak.html"]').click(),/\/projets\/infomaniak\.html$/);
    assert.match(await page.locator('.project-close').getAttribute('href'),/\/donnees-du-site\.html$/);
    await returnNavigation(page,()=>page.locator('.project-close').click(),/\/donnees-du-site\.html$/);
    for(const width of [1440,390]){
      await page.setViewportSize({width,height:900});
      await page.goto(base+'/projets/infomaniak.html');await settled(page);
      await returnNavigation(page,()=>page.getByRole('link',{name:'Accueil',exact:true}).click(),/\/index\.html$/);
      await page.goto(base+'/projets/infomaniak.html');await settled(page);
      await returnNavigation(page,()=>page.locator('.project-close').click(),/\/index\.html$/);
      if(width<=700)await page.getByRole('button',{name:'Menu',exact:true}).click();
      await page.getByRole('link',{name:'Données du site',exact:true}).click();await settled(page);
      await page.locator('a[href="projets/infomaniak.html"]').click();await settled(page);
      await returnNavigation(page,()=>page.locator('.project-close').click(),/\/donnees-du-site\.html$/);
    }
    // Un retour navigateur pendant le trajet doit finir sur l'accueil sans calque résiduel.
    await page.goto(base+'/index.html');await settled(page);
    await page.locator('.project-link').first().click();
    await page.waitForSelector('.transition-image');
    await page.goBack();
    await page.waitForFunction(()=>document.querySelector('#site-shell').dataset.page==='home');
    await settled(page);
    assert.equal(await page.locator('#transition-layer > *').count(),0);
    assert.match(page.url(),/\/index\.html$/);
    // La préférence de réduction du mouvement conserve une navigation immédiate.
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.evaluate(()=>window.navigationAnimations=[]);
    await page.locator('.project-link').first().click();await settled(page);
    await page.locator('.project-close').click();
    await page.waitForFunction(()=>document.querySelector('#site-shell').dataset.page==='home');await settled(page);
    assert.deepEqual(await page.evaluate(()=>window.navigationAnimations),[]);
    assert.deepEqual(errors,[]);
    const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    await mobile.addInitScript(observeAnimations);
    mobile.on('pageerror',error=>errors.push(error.message));
    await mobile.goto(base+'/index.html');await settled(mobile);
    const thumbnailBox=await mobile.locator('.project-mobile-thumbnail').first().boundingBox();
    await animatedNavigation(mobile,()=>mobile.locator('.project-link').first().tap(),/\/projets\/infomaniak\.html$/,{imageFlight:true,sourceBox:thumbnailBox});
    await mobile.locator('.project-close').tap();await mobile.waitForURL(/\/index\.html$/);await settled(mobile);
    await mobile.waitForFunction(()=>!document.querySelector('.home-identity').classList.contains('is-arriving'));
    const touch=await mobile.context().newCDPSession(mobile);
    const boxes=await Promise.all([0,1].map(i=>mobile.locator('.wordmark-letter').nth(i).boundingBox()));
    const center=box=>({x:box.x+box.width/2,y:box.y+box.height/2});
    await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[center(boxes[0])]});
    await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[center(boxes[1])]});
    await mobile.waitForFunction(()=>document.querySelectorAll('.wordmark-letter')[1].dataset.motion==='floating');
    const pushed=await mobile.locator('.wordmark-letter').nth(1).getAttribute('transform');
    await mobile.waitForFunction(value=>document.querySelectorAll('.wordmark-letter')[1].getAttribute('transform')!==value,pushed);
    assert.equal(await mobile.locator('.wordmark-letter').first().getAttribute('data-motion'),'dragging','La lettre percutée bouge avant le lâcher du doigt');
    await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await mobile.getByRole('button',{name:/Ramenez-moi/}).click();
    await mobile.waitForFunction(()=>[...document.querySelectorAll('.wordmark-letter')].every(letter=>letter.dataset.motion==='idle'));
    for(const width of [390,320]) {
      await mobile.setViewportSize({width,height:844});
      await mobile.waitForFunction(width=>document.querySelector('.home-identity > svg').viewBox.baseVal.width===width,width);
      const fineLetter=mobile.locator('.wordmark-letter').nth(4),fineBox=await fineLetter.boundingBox();
      const point={x:fineBox.x+fineBox.width/2,y:fineBox.y-8};
      await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});
      assert.equal(await fineLetter.getAttribute('data-motion'),'dragging','La marge tactile du I fonctionne à '+width+' px');
      for(let i=1;i<=6;i++) {
        await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:point.x+i*10,y:point.y-i*12}]});
        await mobile.evaluate(()=>new Promise(requestAnimationFrame));
      }
      const held=await fineLetter.getAttribute('transform');
      const heldBox=await fineLetter.boundingBox();
      assert.ok(Math.abs(heldBox.x+heldBox.width/2-fineBox.x-fineBox.width/2-60)<1,'La lettre suit le doigt horizontalement, sans saut à la prise');
      assert.ok(Math.abs(heldBox.y+heldBox.height/2-fineBox.y-fineBox.height/2+72)<1,'La marge tactile conserve le décalage vertical du doigt');
      assert.equal(await fineLetter.getAttribute('data-motion'),'dragging');
      await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      assert.equal(await fineLetter.getAttribute('data-motion'),'floating','Le lâcher conserve la physique');
      await mobile.waitForFunction(value=>document.querySelectorAll('.wordmark-letter')[4].getAttribute('transform')!==value,held);
      await mobile.getByRole('button',{name:/Ramenez-moi/}).click();
      await mobile.waitForFunction(()=>[...document.querySelectorAll('.wordmark-letter')].every(letter=>letter.dataset.motion==='idle'));
      await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});
      await touch.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
      assert.equal(await mobile.locator('.is-dragging').count(),0,'Une interruption tactile libère la lettre');
      await mobile.waitForFunction(()=>[...document.querySelectorAll('.wordmark-letter')].every(letter=>letter.dataset.motion==='idle'));
    }
    await mobile.close();
    assert.deepEqual(errors,[]);
    const local=await browser.newPage({viewport:{width:1440,height:900}});
    const localErrors=[];
    local.on('pageerror',error=>localErrors.push(error.message));
    local.on('console',message=>{if(message.type()==='error')localErrors.push(message.text());});
    await local.goto(pathToFileURL(path.join(root,'index.html')).href);
    await local.waitForSelector('.home-identity.wordmark-ready');
    await local.waitForFunction(()=>!document.documentElement.classList.contains('is-booting'));
    const localLetter=local.locator('.wordmark-letter').first();
    await localLetter.hover();
    await local.waitForFunction(()=>document.querySelector('.wordmark-letter').dataset.motion==='hover');
    assert.deepEqual(localErrors,[]);
    process.stdout.write('Entrée, aperçu, lettres, transitions conservées, retours fluides (desktop/mobile) et ouverture locale : OK\n');
  }finally{await browser.close();server.close();}
})().catch(error=>{process.stderr.write(error.stack+'\n');server.close();process.exitCode=1;});
