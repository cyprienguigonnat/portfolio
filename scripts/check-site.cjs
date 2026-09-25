const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const siteRoot=path.join(root,'dist');
const projects=require('../content/projects.json');
const pages=['index.html','informations.html','donnees-du-site.html',...projects.map(p=>'projets/'+p.slug+'.html')];
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
  assert.ok(fs.readFileSync(path.join(siteRoot,'.htaccess'),'utf8').includes("'sha256-"+hash+"'"),'Empreinte CSP : '+file);
}
for(const project of projects)for(const image of project.images.filter(image=>!image.video)) {
  const entry=require('../content/images.json')[image.file];
  const source=fs.readFileSync(path.join(root,'img/projets',image.file));
  assert.equal(entry.digest,crypto.createHash('sha256').update(source).digest('hex'),'Relancer npm run images : '+image.file);
}
assert.ok(fs.existsSync(path.join(siteRoot,'.nojekyll')),'.nojekyll absent');
process.stdout.write('7 pages : ressources, ancres, titres, images, liens externes et empreinte CSP valides.\n');
