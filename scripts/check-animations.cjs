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
async function animatedNavigation(page,action,destination,{imageFlight=false}={}){
  await action();
  await page.waitForFunction(()=>document.body.classList.contains('is-navigating'));
  await page.waitForSelector('.transition-snapshot');
  if(imageFlight){
    await page.waitForSelector('.transition-image');
    const flight=await page.locator('.transition-image').evaluate(image=>{
      const animation=image.getAnimations()[0];
      const frames=animation?.effect?.getKeyframes()??[];
      return {complete:image.complete,naturalWidth:image.naturalWidth,frames:frames.map(frame=>frame.transform)};
    });
    assert.ok(flight.complete&&flight.naturalWidth>0,'Image de transition non décodée');
    assert.equal(flight.frames.length,2,'Trajectoire de transition absente');
    assert.notEqual(flight.frames[0],flight.frames[1],'Image de transition immobile');
  }
  const active=await page.evaluate(()=>({snapshots:document.querySelectorAll('.transition-snapshot').length,images:document.querySelectorAll('.transition-image').length}));
  assert.ok(active.snapshots>0,'Instantané de transition absent');
  if(imageFlight)assert.ok(active.images>0,'Animation d’image absente');
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
    page.on('pageerror',error=>errors.push(error.message));
    page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
    await page.goto(base+'/index.html');
    await page.waitForSelector('.home-identity.wordmark-ready');
    await page.waitForFunction(()=>document.querySelector('.home-identity').classList.contains('is-arriving'));
    await settled(page);
    const first=page.locator('.project-link').first();
    await first.hover();
    await page.waitForSelector('.home-thumbnail.is-visible');
    const letter=page.locator('.wordmark-letter').first();
    const initial=await letter.getAttribute('transform');
    await letter.hover();
    await page.waitForFunction(value=>document.querySelector('.wordmark-letter').getAttribute('transform')!==value,initial);
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
    await animatedNavigation(page,()=>page.locator('.project-close').click(),/\/index\.html$/,{imageFlight:true});
    await animatedNavigation(page,()=>page.getByRole('link',{name:'Informations',exact:true}).click(),/\/informations\.html$/);
    await animatedNavigation(page,()=>page.getByRole('link',{name:'Données du site',exact:true}).click(),/\/donnees-du-site\.html$/);
    await animatedNavigation(page,()=>page.locator('a[href="projets/infomaniak.html"]').click(),/\/projets\/infomaniak\.html$/);
    assert.match(await page.locator('.project-close').getAttribute('href'),/\/donnees-du-site\.html$/);
    await animatedNavigation(page,()=>page.locator('.project-close').click(),/\/donnees-du-site\.html$/);
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
    process.stdout.write('Entrée, aperçu, lettres, transitions avec/sans image et ouverture locale : OK\n');
  }finally{await browser.close();server.close();}
})().catch(error=>{process.stderr.write(error.stack+'\n');server.close();process.exitCode=1;});
