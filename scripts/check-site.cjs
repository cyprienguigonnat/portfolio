const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const siteRoot=path.join(root,'dist');
const projects=require('../content/projects.json');
const pages=['index.html','informations.html','donnees-du-site.html',...projects.map(p=>'projets/'+p.slug+'.html'),'404.html'];
const documents=new Map(pages.map(file=>[file,fs.readFileSync(path.join(siteRoot,file),'utf8')]));
for(const [file,html] of documents) {
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(ids.length,new Set(ids).size,'ID répété : '+file);
  assert.equal((html.match(/<main\b/g)||[]).length,1,'main : '+file);
  assert.equal((html.match(/<h1\b/g)||[]).length,1,'h1 : '+file);
  assert.match(html,/<html lang="fr">/);
  for(const [,tag] of html.matchAll(/(<a\b[^>]*>)/g))if(/target="_blank"/.test(tag))assert.match(tag,/rel="[^"]*noopener[^" ]*(?: [^"]*)?"/,'Lien externe : '+file);
  for(const [,attribute,value] of html.matchAll(/\b(href|src|data-thumbnail)="([^"]+)"/g)) {
    const url=new URL(value,'https://portfolio.test/'+file);
    if(url.origin!=='https://portfolio.test')continue;
    const target=decodeURIComponent(url.pathname.slice(1)||'index.html');
    assert.ok(fs.existsSync(path.join(siteRoot,target)),file+' : '+attribute+' '+target);
    if(url.hash && documents.has(target))assert.ok(documents.get(target).includes('id="'+decodeURIComponent(url.hash.slice(1))+'"'),file+' : ancre '+value);
  }
  for(const [,srcset] of html.matchAll(/(?:srcset|data-srcset)="([^"]+)"/g))for(const candidate of srcset.split(',')) {
    const url=new URL(candidate.trim().split(/\s+/)[0],'https://portfolio.test/'+file);
    assert.ok(fs.existsSync(path.join(siteRoot,url.pathname.slice(1))),file+' : '+candidate);
  }
  for(const [,image] of html.matchAll(/(<img\b[^>]*>)/g)) {
    for(const attribute of ['alt','width','height','loading','decoding'])assert.match(image,new RegExp(' '+attribute+'="'),'Image sans '+attribute);
  }
  const boot=html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const hash=crypto.createHash('sha256').update(boot).digest('base64');
  for(const config of ['.htaccess','_headers'])assert.ok(fs.readFileSync(path.join(siteRoot,config),'utf8').includes("'sha256-"+hash+"'"),'Empreinte CSP '+config+' : '+file);
  for(const property of ['og:image','twitter:image'])assert.match(html,new RegExp('="'+property+'" content="https://cyprienguigonnat\\.fr/img/site-preview\\.png"'),property+' absolu : '+file);
}
for(const project of projects)for(const image of project.images.filter(image=>!image.video)) {
  const entry=require('../content/images.json')[image.file];
  const source=fs.readFileSync(path.join(root,'img/projets',image.file));
  assert.equal(entry.digest,crypto.createHash('sha256').update(source).digest('hex'),'Relancer npm run images : '+image.file);
  assert.equal(entry.quality,image.webpQuality || 92,'Qualité WebP périmée : '+image.file);
  for(const variant of entry.variants) {
    assert.ok(variant.width<=image.width,'Variante agrandie artificiellement : '+variant.file);
    assert.equal(fs.statSync(path.join(root,'img/projets',variant.file)).size,variant.bytes,'Poids WebP incorrect : '+variant.file);
  }
}
const siteUrl='https://cyprienguigonnat.fr/';
const indexable=pages.filter(file=>file!=='404.html').map(file=>file==='index.html'?'':file);
for(const url of indexable)assert.ok(documents.get(url||'index.html').includes('<link rel="canonical" href="'+siteUrl+url+'">'),'Canonical : '+url);
const notFound=documents.get('404.html');
assert.match(notFound,/<head>\n<base href="\/">/,'<base> en tête du <head> de la 404');
assert.match(notFound,/<meta name="robots" content="noindex">/);
assert.doesNotMatch(notFound,/rel="canonical"/);
const person=JSON.parse(documents.get('index.html').match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
assert.equal(person['@type'],'Person');
const homeText=documents.get('index.html').match(/<main[\s\S]*<\/main>/)[0].replace(/<(script|style|svg)[\s\S]*?<\/\1>/g,'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
assert.ok(homeText.length>=500,'Texte de l’accueil sans JavaScript : '+homeText.length+' caractères');
assert.equal(person.url,siteUrl);
const sitemap=fs.readFileSync(path.join(siteRoot,'sitemap.xml'),'utf8');
assert.match(sitemap,/^<\?xml version="1.0" encoding="UTF-8"\?>\n<urlset xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9">/);
assert.deepEqual([...sitemap.matchAll(/<url><loc>([^<]+)<\/loc><lastmod>\d{4}-\d{2}-\d{2}<\/lastmod><\/url>/g)].map(m=>m[1]),indexable.map(url=>siteUrl+url),'Sitemap');
assert.match(fs.readFileSync(path.join(siteRoot,'robots.txt'),'utf8'),/^Sitemap: https:\/\/cyprienguigonnat\.fr\/sitemap\.xml$/m);
const llms=fs.readFileSync(path.join(siteRoot,'llms.txt'),'utf8');
assert.match(llms,/^# .+\n\n> .+/);
assert.match(llms,/^## When to use$/m);
assert.doesNotMatch(llms,/\{\{/);
for(const url of indexable.filter(Boolean))assert.ok(llms.includes(siteUrl+url),'llms.txt : '+url);
// Routage du Worker contre dist/, avec une liaison ASSETS simulée.
import(require('node:url').pathToFileURL(path.join(root,'worker.mjs'))).then(async ({default:worker})=>{
  const ASSETS={fetch:async target=>new Response('',{status:fs.existsSync(path.join(siteRoot,new URL(target).pathname))?200:404})};
  const route=async pathname=>{const response=await worker.fetch(new Request(new URL(pathname,siteUrl)),{ASSETS});return response.status+' '+(response.headers.get('location')||'');};
  assert.equal(await route('/'),'200 ');
  assert.equal(await route('/informations?a=1'),'301 '+siteUrl+'informations.html?a=1');
  assert.equal(await route('/projets/'+projects[0].slug),'301 '+siteUrl+'projets/'+projects[0].slug+'.html');
  for(const pathname of ['/nexiste','/projets','/nexiste.html'])assert.equal(await route(pathname),'404 ',pathname);
  process.stdout.write(pages.length+' pages : ressources, ancres, titres, images, liens externes et empreinte CSP valides ; sitemap, robots, llms.txt, JSON-LD et routage du Worker valides.\n');
});
