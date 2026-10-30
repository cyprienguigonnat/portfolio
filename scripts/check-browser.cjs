const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { default: AxeBuilder } = require('@axe-core/playwright');
const root = path.resolve(process.env.SITE_ROOT || path.join(__dirname, '..', 'dist'));
const output = process.env.AUDIT_OUTPUT ? path.resolve(process.env.AUDIT_OUTPUT) : null;
const baseline = process.env.AUDIT_BASELINE === '1';
const widths = process.env.AUDIT_WIDTHS
  ? process.env.AUDIT_WIDTHS.split(',').map(Number).filter(Number.isFinite)
  : (process.env.AUDIT_QUICK ? [1440] : [1440,390,320]);
const types = { '.html':'text/html; charset=utf-8', '.css':'text/css', '.js':'text/javascript', '.woff2':'font/woff2', '.png':'image/png', '.webp':'image/webp', '.ico':'image/x-icon' };
const server = http.createServer((req,res) => {
  const file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/\/$/, '/index.html'));
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end(); return; }
  res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
  const headers = path.join(root,'_headers');
  const policy = fs.existsSync(headers) && fs.readFileSync(headers,'utf8').match(/Content-Security-Policy: (.+)/);
  if(policy)res.setHeader('Content-Security-Policy',policy[1]);
  fs.createReadStream(file).pipe(res);
});
async function settled(page) {
  await page.waitForFunction(() => !document.documentElement.classList.contains('is-booting') && !document.body.classList.contains('is-navigating'));
}
(async () => {
  if(output)fs.mkdirSync(output, {recursive:true});
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({headless:true, ...(process.env.BROWSER_CHANNEL ? {channel:process.env.BROWSER_CHANNEL} : {}), ...(process.env.BROWSER_EXECUTABLE ? {executablePath:process.env.BROWSER_EXECUTABLE} : {})});
  const errors = [], results = [];
  let bottomSheets;
  try {
    for (const width of widths) {
      const context = await browser.newContext({viewport:{width,height:900}, deviceScaleFactor:1});
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if(message.type()==='error')errors.push(message.text()); });
      page.on('response', response => { if(response.status()>=400)errors.push(response.status()+' '+response.url()); });
      for (const route of (process.env.AUDIT_QUICK ? ['index.html'] : ['index.html','informations.html','donnees-du-site.html',...['infomaniak','france-titres','fontlibrary','fabmanager'].map(p=>'projets/'+p+'.html')])) {
        await page.goto(base+'/'+route);
        await settled(page);
        await page.waitForTimeout(1100);
        const metrics = await page.evaluate(() => ({
          bytes: performance.getEntriesByType('resource').reduce((s,r)=>s+r.decodedBodySize,0) + performance.getEntriesByType('navigation')[0].decodedBodySize,
          requests:performance.getEntriesByType('resource').length+1,
          resources:performance.getEntriesByType('resource').map(r=>({url:new URL(r.name).pathname,bytes:r.decodedBodySize})),
          overflow:document.documentElement.scrollWidth>innerWidth,
          fonts:[...new Set([...document.querySelectorAll('a,p,li,h1,h2,h3,span,b,strong,i')].map(el=>{const s=getComputedStyle(el);return s.fontSize+'/'+s.fontWeight}))],
          images:[...document.images].map(i=>({src:i.currentSrc,complete:i.complete,width:i.naturalWidth})),
          mainCount:document.querySelectorAll('main').length
        }));
        const axe = await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','best-practice']).analyze();
        const violations = axe.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({html:n.html,summary:n.failureSummary}))}));
        if(output)await page.screenshot({path:path.join(output,width+'-'+route.replaceAll('/','-')+'.png'),animations:'disabled'});
        results.push({width,route,...metrics,violations});
        if(output)fs.writeFileSync(path.join(output,'browser.json'),JSON.stringify({results,errors},null,2));
        if(!baseline) { assert.equal(metrics.overflow,false, width+' '+route+' overflow'); assert.equal(violations.length,0,JSON.stringify({width,route,violations})); }
      }
      await context.close();
    }
    const page = await browser.newPage({viewport:{width:1440,height:900}});
    // Le bouton doit rester centré pendant et après le retour à l'accueil.
    for (const width of [1440,390,320]) {
      await page.setViewportSize({width,height:900});
      await page.goto(base+'/informations.html'); await settled(page);
      if(width<=700)await page.locator('.menu-toggle').click();
      await page.locator('#nav-home').click();
      await page.waitForSelector('#site-shell[data-page="home"] .wordmark-hint');
      const positions = await page.evaluate(() => new Promise(resolve => {
        const samples=[];
        const start=performance.now();
        function sample(now) {
          const hint=document.querySelector('#site-shell .wordmark-hint');
          const rect=hint.getBoundingClientRect();
          const identity=hint.parentElement.getBoundingClientRect();
          samples.push({center:rect.x+rect.width/2,expected:identity.x+identity.width/2,top:rect.top});
          if(now-start<700)requestAnimationFrame(sample);else resolve(samples);
        }
        requestAnimationFrame(sample);
      }));
      assert.ok(positions.every(sample=>Math.abs(sample.center-sample.expected)<1),width+' wordmark button stays centered during navigation');
      assert.ok(Math.max(...positions.map(sample=>sample.top))-Math.min(...positions.map(sample=>sample.top))<1,width+' wordmark button stays vertically stable');
      await settled(page);
    }
    // Les commandes de l’accueil restent distinctes et cliquables sur écran bas.
    for (const viewport of [{width:568,height:320},{width:320,height:256},{width:700,height:440},{width:1440,height:320}]) {
      await page.setViewportSize(viewport);
      await page.goto(base+'/index.html'); await settled(page);
      const button=page.locator('.wordmark-toggle');
      await button.scrollIntoViewIfNeeded();
      assert.equal(await button.evaluate(element=>{
        const box=element.getBoundingClientRect();
        const projects=document.querySelector('.project-index').getBoundingClientRect();
        return projects.top>box.bottom && element.contains(document.elementFromPoint(box.x+box.width/2,box.y+box.height/2));
      }),true,JSON.stringify(viewport)+' bouton accessible sans recouvrement');
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    }
    await page.setViewportSize({width:1440,height:900});
    page.on('pageerror', error => errors.push(error.message));
    const prefetched = [];
    page.on('request', request => { if(request.resourceType()==='fetch')prefetched.push(new URL(request.url()).pathname); });
    await page.goto(base+'/index.html'); await settled(page); await page.waitForTimeout(1200);
    assert.ok(prefetched.includes('/informations.html') && prefetched.some(path=>path.startsWith('/projets/')),'Les pages liées sont préchargées au repos : '+prefetched);
    assert.ok(!prefetched.some(path=>path==='/'||path==='/index.html'),'L’accueil ne se précharge pas lui-même : '+prefetched);
    const idleMutations = await page.evaluate(() => new Promise(resolve => {
      let count=0;const observer=new MutationObserver(records=>count+=records.length);
      observer.observe(document.querySelector('.home-identity'),{subtree:true,attributes:true});
      setTimeout(()=>{observer.disconnect();resolve(count);},500);
    }));
    if(output)fs.writeFileSync(path.join(output,'browser.json'),JSON.stringify({results,idleMutations,errors},null,2));
    if (baseline) {
      process.stdout.write(JSON.stringify({pages:results.length,idleMutations,errors,violations:results.filter(r=>r.violations.length).map(r=>({route:r.route,width:r.width,ids:r.violations.map(v=>v.id)}))})+'\n');
      return;
    }
    const scatterButton=page.getByRole('button',{name:/Bousculez-moi/});
    await scatterButton.focus();await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(()=>document.activeElement.matches('.wordmark-toggle')),true,'Le focus reste sur le bouton après dispersion');
    await page.waitForFunction(()=>[...document.querySelectorAll('.wordmark-letter')].every(letter=>letter.dataset.motion==='floating' && !letter.getAttribute('transform').startsWith('translate(0.000 0.000)')));
    assert.equal(await page.getByRole('button',{name:/Ramenez-moi/}).isVisible(),true);
    assert.equal(await page.locator('.wordmark-letter').evaluateAll(letters=>letters.every(letter=>{
      const transform=letter.getAttribute('transform');
      return transform && !transform.startsWith('translate(0.000 0.000)');
    })),true,'Le bouton Bousculez-moi disperse toutes les lettres');
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(()=>document.activeElement.matches('.wordmark-toggle')),true,'Le même bouton conserve le focus après retour');
    assert.equal(await page.getByRole('button',{name:/Bousculez-moi/}).isVisible(),true);
    await page.waitForFunction(()=>[...document.querySelectorAll('.wordmark-letter')].every(letter=>letter.dataset.motion==='idle'));
    assert.equal(await page.getByRole('button',{name:/Bousculez-moi/}).isVisible(),true);
    await page.goto(base+'/index.html');await settled(page);
    await page.keyboard.press('Tab');
    assert.equal(await page.locator(':focus').textContent(),'Contenu');
    assert.equal(await page.locator('.project-index').evaluate(element => {
      const rect=element.getBoundingClientRect();
      return rect.top>=0 && rect.bottom<=innerHeight;
    }),true,'Project index must remain visible while skip links are open');
    await page.keyboard.press('Tab');
    assert.equal(await page.locator(':focus').textContent(),'Navigation');
    await page.keyboard.press('Enter');
    assert.equal(await page.locator(':focus').getAttribute('id'),'hdr');
    assert.equal(await page.locator(':focus').evaluate(element => getComputedStyle(element).outlineStyle),'solid');
    await page.keyboard.press('Tab');
    assert.equal(await page.locator(':focus').getAttribute('id'),'nav-home');
    assert.equal(await page.locator(':focus').textContent(),'Accueil');
    await page.goto(base+'/index.html'); await settled(page);
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    assert.equal(await page.locator(':focus').getAttribute('id'),'mn');
    await page.locator('.project-link').first().focus();
    await page.keyboard.press('Enter'); await page.waitForURL('**/projets/infomaniak.html'); await settled(page);
    assert.equal(await page.locator(':focus').getAttribute('id'),'mn');
    await page.locator('[rel=next]').focus();
    await page.keyboard.press('Enter'); await page.waitForURL('**/projets/france-titres.html'); await settled(page);
    await page.locator('.skiplinks a').nth(1).focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator(':focus').getAttribute('id'),'hdr');
    assert.equal(await page.locator(':focus').evaluate(element => getComputedStyle(element).outlineStyle),'solid');
    await page.keyboard.press('Tab');
    assert.equal(await page.locator(':focus').getAttribute('id'),'nav-home');
    assert.equal((await page.locator(':focus').textContent()).trim(),'Fermer');
    await page.keyboard.press('Enter'); await page.waitForURL(/\/index\.html(?:#.*)?$/); await settled(page);
    await page.getByRole('link',{name:'Informations',exact:true}).click(); await page.waitForURL('**/informations.html'); await settled(page);
    await page.goBack(); await page.waitForURL(/\/index\.html(?:#.*)?$/); await settled(page);
    await page.goForward(); await page.waitForURL('**/informations.html'); await settled(page);
    await page.goto(base+'/index.html');await settled(page);await page.waitForTimeout(1100);
    const letter=page.locator('.wordmark-letter').first();
    const box=await letter.boundingBox();
    await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
    await page.mouse.down();
    await page.mouse.move(box.x+box.width/2+80,box.y+box.height/2-80,{steps:8});
    await page.mouse.up();
    assert.equal(await letter.getAttribute('data-motion'),'floating');
    await letter.focus();await page.keyboard.press('Enter');
    await page.waitForFunction(()=>document.querySelector('.wordmark-letter').dataset.motion==='idle');
    await page.keyboard.press('Shift+ArrowUp');
    assert.equal(await letter.getAttribute('data-motion'),'floating');
    await page.keyboard.press('Enter');
    await page.waitForFunction(()=>document.querySelector('.wordmark-letter').dataset.motion==='idle');
    assert.equal(await page.locator('.wordmark-letter[tabindex="0"]').count(),1,'Un seul arrêt de tabulation pour les lettres');
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.evaluate(()=>[...document.querySelectorAll('.wordmark-letter')].indexOf(document.activeElement)),1,'La flèche passe à la lettre suivante');
    assert.equal(await page.locator('.wordmark-letter').nth(1).getAttribute('tabindex'),'0');
    await page.keyboard.press('End');
    assert.equal(await page.evaluate(()=>[...document.querySelectorAll('.wordmark-letter')].indexOf(document.activeElement)),15);
    const mobileContext = await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    const mobile = await mobileContext.newPage();
    mobile.on('pageerror', error => errors.push(error.message));
    await mobile.goto(base+'/index.html'); await settled(mobile);
    const menu = mobile.locator('.header-menu');
    const contact = mobile.locator('.header-contact');
    const menuButton = mobile.getByRole('button',{name:'Menu',exact:true});
    const contactButton = mobile.getByRole('button',{name:'Contact',exact:true});
    assert.equal(await menuButton.isVisible(),true);
    assert.equal(await contactButton.isVisible(),true);
    assert.equal(await menu.isVisible(),false);
    assert.equal(await contact.isVisible(),false);
    assert.ok((await menuButton.boundingBox()).x < (await contactButton.boundingBox()).x);
    if(output)await mobile.screenshot({path:path.join(output,'menu-mobile-closed.png')});
    const sheet = mobile.locator('.mobile-sheet');
    const closed = () => mobile.waitForFunction(()=>!document.querySelector('.mobile-sheet').open);
    const opened = () => mobile.waitForFunction(()=>{
      const sheet=document.querySelector('.mobile-sheet');
      return sheet.open && getComputedStyle(sheet).transform==='matrix(1, 0, 0, 1, 0, 0)';
    });
    await menuButton.tap(); await opened();
    assert.equal(await menu.getByRole('link').count(),3);
    assert.equal(await sheet.evaluate(element=>element.matches(':modal')),true);
    const menuBox=await sheet.boundingBox();
    assert.ok(Math.abs(menuBox.y+menuBox.height-844)<1,'Sheet anchored to bottom');
    assert.ok(menuBox.width>=389,'Sheet fills mobile width');
    await mobile.keyboard.press('Tab');
    assert.equal(await mobile.locator(':focus').textContent(),'Accueil');
    // Le navigateur maintient le focus dans le dialogue, même après un tour complet.
    for(let i=0;i<5;i++)await mobile.keyboard.press('Tab');
    assert.equal(await sheet.evaluate(element=>element.contains(document.activeElement)),true);
    assert.equal((await new AxeBuilder({page:mobile}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','best-practice']).analyze()).violations.length,0);
    if(output)await mobile.screenshot({path:path.join(output,'menu-mobile-open.png')});
    await mobile.keyboard.press('Escape');
    assert.equal(await menuButton.getAttribute('aria-expanded'),'false');
    await closed();
    assert.equal(await mobile.locator(':focus').textContent(),'Menu');
    await contactButton.click(); await opened();
    assert.equal(await contact.getByRole('link').count(),4);
    assert.equal((await new AxeBuilder({page:mobile}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','best-practice']).analyze()).violations.length,0);
    if(output)await mobile.screenshot({path:path.join(output,'contact-mobile-open.png')});
    await mobile.getByRole('button',{name:'Fermer'}).click(); await closed();
    assert.equal(await contactButton.getAttribute('aria-expanded'),'false');
    await contactButton.focus();
    await mobile.keyboard.press('ArrowDown');
    assert.match(await mobile.locator(':focus').textContent(),/contact\(at\)/);
    await opened();
    await mobile.mouse.click(10,100); await closed();
    assert.equal(await contactButton.getAttribute('aria-expanded'),'false');
    // Échantillonner les vraies transitions CSS sans dépendre de la charge machine.
    const frames=await mobile.evaluate(()=>{
      const sheet=document.querySelector('.mobile-sheet');
      const button=document.querySelector('.menu-toggle');
      button.click();
      getComputedStyle(sheet).transform;
      const entrance=sheet.getAnimations().find(animation=>animation.transitionProperty==='transform');
      if(!entrance)throw new Error('Missing entry transform transition');
      entrance.currentTime=100;
      const entering=getComputedStyle(sheet).transform;
      sheet.querySelector('button').click();
      getComputedStyle(sheet).transform;
      const exit=sheet.getAnimations().find(animation=>animation.transitionProperty==='transform');
      if(!exit)throw new Error('Missing exit transform transition');
      exit.currentTime=exit.effect.getTiming().duration/2;
      const exiting=getComputedStyle(sheet).transform;
      button.click();
      return {entering,exiting,open:sheet.open};
    });
    assert.notEqual(frames.entering,'matrix(1, 0, 0, 1, 0, 0)','Entry has intermediate frames');
    assert.notEqual(frames.entering,frames.exiting,'Transition moves between frames');
    assert.equal(frames.open,true);
    await opened();
    await mobile.keyboard.press('Escape'); await closed();
    for(let i=0;i<8;i++){
      await menuButton.click();
      await mobile.keyboard.press('Escape'); await closed();
      assert.equal(await mobile.locator('html').evaluate(element=>element.classList.contains('sheet-open')),false);
    }
    await menuButton.click(); await opened();
    await menu.getByRole('link',{name:'Informations',exact:true}).click();
    await mobile.waitForURL('**/informations.html'); await settled(mobile);
    assert.equal(await mobile.locator('.mobile-sheet').count(),1,'No orphan dialog after navigation');
    assert.equal(await mobile.locator('.header-menu').isVisible(),false);
    // Le scroll est verrouillé dans le sheet puis reprend après sa fermeture.
    await mobile.evaluate(()=>scrollTo(0,150));
    await mobile.getByRole('button',{name:'Menu',exact:true}).click(); await opened();
    const lockedY=await mobile.evaluate(()=>scrollY);
    await mobile.mouse.move(20,100); await mobile.mouse.wheel(0,500);
    await mobile.evaluate(()=>new Promise(resolve=>setTimeout(resolve,350)));
    assert.equal(await mobile.evaluate(()=>scrollY),lockedY);
    await mobile.setViewportSize({width:1440,height:900}); await closed();
    assert.equal(await mobile.getByRole('button',{name:'Menu',exact:true}).isVisible(),false);
    assert.equal(await mobile.getByRole('button',{name:'Contact',exact:true}).isVisible(),false);
    assert.equal(await mobile.getByRole('link',{name:'Accueil',exact:true}).isVisible(),true);
    assert.equal(await mobile.locator('.header-menu').evaluate(element=>element.inert),false);
    assert.equal(await mobile.locator('html').evaluate(element=>element.classList.contains('sheet-open')),false);
    if(output)await mobile.screenshot({path:path.join(output,'menu-desktop.png')});
    for(const viewport of [{width:320,height:568},{width:390,height:844},{width:700,height:320}]){
      await mobile.setViewportSize(viewport);
      await mobile.getByRole('button',{name:'Contact',exact:true}).click(); await opened();
      assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      const box=await sheet.boundingBox();
      assert.ok(box.x>=0 && box.x+box.width<=viewport.width);
      assert.ok(box.y>=0 && Math.abs(box.y+box.height-viewport.height)<1);
      // Le dernier lien reste accessible, même en paysage court.
      await contact.getByRole('link').last().scrollIntoViewIfNeeded();
      assert.equal(await contact.getByRole('link').last().isVisible(),true);
      await mobile.keyboard.press('Escape'); await closed();
    }
    await mobile.setViewportSize({width:320,height:568});
    await mobile.emulateMedia({reducedMotion:'reduce'});
    await mobile.getByRole('button',{name:'Contact',exact:true}).click();
    assert.equal(await sheet.evaluate(element=>getComputedStyle(element).transitionDuration),'0s');
    await mobile.keyboard.press('Escape'); await closed();
    await mobile.mouse.move(150,400); await mobile.mouse.wheel(0,500);
    await mobile.waitForFunction(y=>scrollY!==y,lockedY);
    bottomSheets={widths:[320,390,700],touch:true,focus:true,escape:true,backdrop:true,scrollLock:true,rapidCycles:8,animationFrames:frames,reducedMotion:true};
    await mobileContext.close();
    const noJS = await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
    const staticPage=await noJS.newPage();await staticPage.goto(base+'/index.html');
    assert.equal(await staticPage.getByRole('link',{name:'Informations',exact:true}).isVisible(),true);
    await staticPage.locator('.project-link').first().click();
    assert.equal(await staticPage.locator('.hero-image').isVisible(),true);
    await staticPage.locator('.project-close').click(); await staticPage.waitForURL('**/index.html');await noJS.close();
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.goto(base+'/index.html');await settled(page);
    await page.locator('.wordmark-letter').first().focus();
    await page.keyboard.press('ArrowUp');await page.keyboard.press('Enter');
    assert.equal(await page.locator('.wordmark-letter').first().getAttribute('data-motion'),'idle');
    await page.locator('.project-link').first().click();await page.waitForURL('**/projets/infomaniak.html');await settled(page);
    await page.keyboard.press('Escape');await page.waitForURL('**/index.html');await settled(page);
    // La molette progresse réellement sur plusieurs images, y compris avec un amorti atténué.
    for (const reducedMotion of ['no-preference','reduce']) {
      await page.emulateMedia({reducedMotion});
      await page.goto(base+'/projets/infomaniak.html');await settled(page);
      await page.evaluate(()=>{
        window.scrollProof=[];
        window.addEventListener('wheel',()=>{
          for(const ms of [0,32,80,160,400,1600])setTimeout(()=>window.scrollProof.push(scrollY),ms);
        },{once:true});
      });
      await page.mouse.move(600,500);await page.mouse.wheel(0,900);
      await page.waitForFunction(()=>window.scrollProof.length===6);
      const positions=await page.evaluate(()=>window.scrollProof);
      assert.ok(new Set(positions).size>=3,'La molette doit être amortie : '+reducedMotion);
      assert.ok(Math.abs(positions.at(-1)-900)<=2,'La distance de molette doit être conservée');
      await page.waitForFunction(()=>!document.documentElement.classList.contains('lenis-scrolling'));
      const idleFrames=await page.evaluate(()=>new Promise(resolve=>{
        const raf=window.requestAnimationFrame;let calls=0;
        window.requestAnimationFrame=function(callback){calls++;return raf.call(this,callback);};
        setTimeout(()=>{window.requestAnimationFrame=raf;resolve(calls);},250);
      }));
      assert.equal(idleFrames,0,'Aucune boucle de défilement au repos');
      await page.keyboard.press('Home');await page.waitForFunction(()=>scrollY===0);
      await page.getByRole('link',{name:'Projet suivant : 2. France Titres - ANTS'}).click();await settled(page);
      assert.equal(await page.evaluate(()=>document.documentElement.classList.contains('lenis')),true,'Le contrôleur reprend après navigation');
    }
    // Un vrai geste tactile suit le doigt en défilement natif, sans boucle permanente.
    const touchContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    const touchPage=await touchContext.newPage();
    touchPage.on('pageerror',error=>errors.push(error.message));
    await touchPage.goto(base+'/projets/infomaniak.html');await settled(touchPage);
    const touchSession=await touchContext.newCDPSession(touchPage);
    await touchSession.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:180,y:650}]});
    for(const y of [600,550,500,450,400]){
      await touchSession.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:180,y}]});
      await touchPage.evaluate(()=>new Promise(requestAnimationFrame));
    }
    const heldScroll=await touchPage.evaluate(()=>scrollY);
    assert.ok(heldScroll>150,'Le document suit le doigt');
    await touchSession.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await touchPage.waitForFunction(()=>!document.documentElement.classList.contains('lenis-scrolling'));
    assert.equal(await touchPage.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await touchContext.close();
    const report={results,idleMutations,errors,bottomSheets};
    if(output)fs.writeFileSync(path.join(output,'browser.json'),JSON.stringify(report,null,2));
    if(!baseline){assert.equal(idleMutations,0,'Animation must sleep at rest');assert.deepEqual(errors,[]);}
    process.stdout.write(JSON.stringify({pages:results.length,idleMutations,errors,violations:results.filter(r=>r.violations.length).map(r=>({route:r.route,width:r.width,ids:r.violations.map(v=>v.id)}))})+'\n');
  } finally { await browser.close(); server.close(); }
})().catch(error=>{process.stderr.write(error.stack+'\n');server.close();process.exitCode=1;});
