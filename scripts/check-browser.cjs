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
  const htaccess = path.join(root,'.htaccess');
  const policy = fs.existsSync(htaccess) && fs.readFileSync(htaccess,'utf8').match(/Header always set Content-Security-Policy "([^"]+)"/);
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
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base+'/index.html'); await settled(page); await page.waitForTimeout(1200);
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
    await scatterButton.click();
    await page.waitForFunction(()=>[...document.querySelectorAll('.wordmark-letter')].every(letter=>letter.dataset.motion==='floating' && !letter.getAttribute('transform').startsWith('translate(0.000 0.000)')));
    assert.equal(await page.getByRole('button',{name:/Ramenez-moi/}).isVisible(),true);
    assert.equal(await page.locator('.wordmark-letter').evaluateAll(letters=>letters.every(letter=>{
      const transform=letter.getAttribute('transform');
      return transform && !transform.startsWith('translate(0.000 0.000)');
    })),true,'Le bouton Bousculez-moi disperse toutes les lettres');
    await page.getByRole('button',{name:/Ramenez-moi/}).click();
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
    assert.equal(await page.locator(':focus').evaluate(element => getComputedStyle(element).outlineStyle),'none');
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
    assert.equal(await page.locator(':focus').evaluate(element => getComputedStyle(element).outlineStyle),'none');
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
    await page.keyboard.press('ArrowUp');
    assert.equal(await letter.getAttribute('data-motion'),'floating');
    await page.keyboard.press('Enter');
    await page.waitForFunction(()=>document.querySelector('.wordmark-letter').dataset.motion==='idle');
    const noJS = await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
    const staticPage=await noJS.newPage();await staticPage.goto(base+'/index.html');
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
    const report={results,idleMutations,errors};
    if(output)fs.writeFileSync(path.join(output,'browser.json'),JSON.stringify(report,null,2));
    if(!baseline){assert.equal(idleMutations,0,'Animation must sleep at rest');assert.deepEqual(errors,[]);}
    process.stdout.write(JSON.stringify({pages:results.length,idleMutations,errors,violations:results.filter(r=>r.violations.length).map(r=>({route:r.route,width:r.width,ids:r.violations.map(v=>v.id)}))})+'\n');
  } finally { await browser.close(); server.close(); }
})().catch(error=>{process.stderr.write(error.stack+'\n');server.close();process.exitCode=1;});
