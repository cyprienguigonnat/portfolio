// Reconstruit les pages statiques à partir des contenus conservés.
// Exécution : node scripts/build-site.cjs
const fs = require("fs");
const path = require("path");
const crypto = require('node:crypto');
const esbuild = require('esbuild');
const root = path.resolve(__dirname, "..");
const outputRoot = path.join(root, 'dist');
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const write = (file, content) => {
  const destination = path.join(outputRoot, file);
  fs.mkdirSync(path.dirname(destination), {recursive:true});
  fs.writeFileSync(destination, content);
};
fs.rmSync(outputRoot, {recursive:true, force:true});
fs.mkdirSync(outputRoot, {recursive:true});
for(const directory of ['fonts','img'])fs.cpSync(path.join(root,directory),path.join(outputRoot,directory),{recursive:true});
fs.copyFileSync(path.join(root,'google66e96974197762e4.html'),path.join(outputRoot,'google66e96974197762e4.html'));
write('.nojekyll','');
const projects = JSON.parse(read("content/projects.json"));
const images = JSON.parse(read('content/images.json'));
if(new Set(projects.map(project=>project.slug)).size!==projects.length)throw new Error('Identifiant de projet répété');
for(const project of projects) {
  if(!/^[a-z][a-z-]*$/.test(project.slug) || !/^anchor-[a-z-]+$/.test(project.anchor))throw new Error('Identifiant de projet invalide');
  if(!Array.isArray(project.images) || !project.images.length)throw new Error('Projet sans image : '+project.slug);
  for(const image of project.images) {
    if(!/^[a-z0-9_-]+\.png$/.test(image.file) || !image.alt || !Number.isInteger(image.width) || !Number.isInteger(image.height) || image.width<=0 || image.height<=0)throw new Error('Image invalide : '+project.slug);
  }
}
const escape = text => String(text).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const runtime = ['js/letter-physics.js','js/wordmark.js','js/main.js'].map(read).join('\n');
const runtimeOutput = esbuild.transformSync(runtime,{minify:true,target:'es2022',legalComments:'eof'}).code;
const runtimeHash = crypto.createHash('sha256').update(runtimeOutput).digest('hex').slice(0,8).toUpperCase();
const runtimeFile = 'assets/site-'+runtimeHash+'.js';
write(runtimeFile,runtimeOutput);
const result = esbuild.buildSync({
  absWorkingDir:root, entryPoints:['css/style.css'], outdir:path.join(outputRoot,'assets'),
  bundle:true, minify:true, target:['es2022'], entryNames:'[name]-[hash]',
  external:['../fonts/*'], metafile:true, write:true, legalComments:'eof'
});
const outputs=Object.entries(result.metafile.outputs);
const toOutputPath=file=>path.relative(outputRoot,path.resolve(root,file)).split(path.sep).join('/');
const stylesheet=toOutputPath(outputs.find(([,data])=>data.entryPoint==='css/style.css')[0]);
const boot=read('content/boot.html')
  .replace(/<script>([\s\S]*?)<\/script>/,(_,code)=>'<script>'+esbuild.transformSync(code,{minify:true,target:'es2022'}).code.trim()+'</script>')
  .replace(/<style>([\s\S]*?)<\/style>/,(_,code)=>'<style>'+esbuild.transformSync(code,{minify:true,loader:'css'}).code.trim()+'</style>');
const bootHash=crypto.createHash('sha256').update(boot.match(/<script>([\s\S]*?)<\/script>/)[1]).digest('base64');
write('.htaccess',read('content/htaccess.conf').replace('{{BOOT_HASH}}',bootHash));

function secureLinks(html) {
  return html.replace(/<a\b[^>]*>/g,tag=>{
    if(!/target="_blank"/.test(tag))return tag;
    const rel=new Set((tag.match(/\brel="([^"]*)"/)?.[1]||'').split(/\s+/).filter(Boolean));
    rel.add('noopener');rel.add('noreferrer');
    return tag.replace(/\srel="[^"]*"/,'').replace(/>$/,' rel="'+[...rel].join(' ')+'">');
  });
}

function head(title, prefix) {
  return read("content/head.html")
    .replace('<meta charset="utf-8">', '<meta charset="utf-8">\n'+boot)
    .replace(/<title>.*?<\/title>/, "<title>"+escape(title)+"</title>")
    .replace(/(["'])\/img\//g, '$1'+prefix+'img/')
    .replace(/href="css\/style.css[^"]*"/, 'href="'+prefix+stylesheet+'"');
}
function header(active = "") {
  return '<header id="hdr" class="site-header" tabindex="-1">\n'
    + '<nav class="header-tabs" aria-label="Navigation principale">'
    + '<a id="nav-home" href="index.html"'+(active==="home"?' aria-current="page"':'')+'>Accueil</a>'
    + '<a href="informations.html"'+(active==="informations"?' aria-current="page"':'')+'>Informations</a>'
    + '<a href="donnees-du-site.html"'+(active==="donnees"?' aria-current="page"':'')+'>Données du site</a>'
    + '</nav>\n<nav class="header-contacts" aria-label="Contacts et réseaux sociaux">'
    + read("content/contacts.html")+'</nav>\n</header>';
}
function skiplinks() {
  return '<nav class="skiplinks" aria-label="Accès rapide"><a href="#mn">Contenu</a><a href="#hdr">Navigation</a></nav>';
}
function documentPage({title, kind, prefix="", slug="", content}) {
  return '<!doctype html>\n<html lang="fr">\n<head>\n'+head(title,prefix)
    + '\n<script src="'+prefix+runtimeFile+'" defer></script>\n</head>\n'
    + '<body data-page="'+kind+'">\n'
    + '<div id="site-loader" hidden role="status" aria-label="Chargement du site"><span aria-hidden="true">0 %</span></div>\n'
    + skiplinks()+'\n'
    + '<div id="site-shell" data-page="'+kind+'"'+(slug?' data-project="'+slug+'"':'')+'>\n'
    + secureLinks(content)+'\n</div>\n<div id="transition-layer" aria-hidden="true"></div>\n</body>\n</html>\n';
}
function srcset(image,prefix) {
  const variants=[...images[image.file].variants];
  if(!variants.some(v=>v.width===image.width))variants.push({file:image.file,width:image.width});
  return variants.map(v=>prefix+'img/projets/'+v.file+' '+v.width+'w').join(', ');
}
function imageMarkup(image, prefix, className, eager = false, span = 6) {
  const sizes=span===6?'calc(100vw - 32px)':'(max-width: 700px) calc(100vw - 32px), calc((100vw - 32px - clamp(20px, 1.7vw, 40px) * '+(6/span-1)+') / '+(6/span)+')';
  const source=srcset(image,prefix);
  return (source?'<picture><source type="image/webp" srcset="'+source+'" sizes="'+sizes+'">':'')
    +'<img class="'+className+'" src="'+prefix+'img/projets/'+escape(image.file)+'" alt="'+escape(image.alt)
    +'" width="'+image.width+'" height="'+image.height+'" loading="'+(eager?'eager':'lazy')
    +'" decoding="async"'+(eager?' fetchpriority="high"':'')+'>'+(source?'</picture>':'');
}

const links = projects.map(project => {
  const first = project.images[0];
  return '<li>'
    + '<a class="project-link" href="projets/'+project.slug+'.html" data-project="'+project.slug
    + '" data-thumbnail="img/projets/'+escape(first.file)+'" data-srcset="'+srcset(first,'')+'" data-width="'+first.width+'" data-height="'+first.height+'">'
    + '<h2>'+escape(project.title)+'</h2></a>'
    + '</li>';
}).join("\n");
write("index.html",documentPage({
  title:"Cyprien GUIGONNAT",kind:"home",
  content:header("home")+'\n<main id="mn" class="home-page" tabindex="-1">\n'
    +'<div class="home-identity"><h1 class="visually-hidden">Cyprien GUIGONNAT — Portfolio</h1>'+read("content/wordmark.svg")
    +'<p class="wordmark-hint" aria-hidden="true"><span class="wordmark-hint-default">[Bousculez-moi ↑]</span><span class="wordmark-hint-return">[Ramenez-moi ↺]</span></p>'
    +'<span class="visually-hidden wordmark-status" aria-live="polite">Bousculez-moi</span></div>\n'
    +'<div class="preview-stage" aria-hidden="true"></div>\n'
    +'<nav id="projets" class="project-index" aria-label="Projets">\n'
    +'<ul>\n'+links+'\n</ul>\n'
    +'</nav>\n'
    +'</main>'
}));

const infoAnchors = ["anchor-informations","anchor-metier","anchor-formations","anchor-experiences"];
const dataAnchors = ["anchor-plan","anchor-mentions","anchor-engagements"];
function rewriteSiteLink(_, anchor) {
  const project=projects.find(p=>p.anchor===anchor);
  if(project)return 'href="projets/'+project.slug+'.html"';
  if(infoAnchors.includes(anchor))return 'href="informations.html#'+anchor+'"';
  if(dataAnchors.includes(anchor))return 'href="donnees-du-site.html#'+anchor+'"';
  return 'href="index.html#projets"';
}
for(const entry of [
  {file:"informations",kind:"informations",title:"Informations",source:"content/informations.html"},
  {file:"donnees-du-site",kind:"donnees",title:"Données du site",source:"content/donnees-du-site.html"}
]) {
  const content=read(entry.source).replace('<section ', '<section class="information-grid" ')
    .replace('{{PROJECT_LINKS}}', projects.map(p=>'<li><a href="#'+p.anchor+'">'+escape(p.title)+'</a></li>').join('\n'))
    .replace(/href="#([^"]+)"/g,rewriteSiteLink);
  write(entry.file+".html",documentPage({
    title:entry.title+" — Cyprien GUIGONNAT",kind:entry.kind,
    content:header(entry.kind)+'\n<main id="mn" class="information-page" tabindex="-1">'+content+'</main>\n'
      +'<footer class="page-footer legal-footer"><span>© 2026 Tous Droits Réservés</span></footer>'
  }));
}

fs.mkdirSync(path.join(root,"projets"),{recursive:true});
projects.forEach((project,index)=>{
  const previous=projects[(index-1+projects.length)%projects.length];
  const next=projects[(index+1)%projects.length];
  const rest=project.images.slice(1);
  const gallery=rest.map((image,i)=>{
    // Deux visuels équilibrés ; pour les séries longues, alterner 2/3 et 1/3.
    const span=rest.length===2?3:rest.length%2===1&&i===rest.length-1?6:(i%4===0||i%4===3?4:2);
    return '<figure class="gallery-image gallery-span-'+span+'">'+imageMarkup(image,"../","project-image",false,span)+'</figure>';
  }).join("\n");
  write("projets/"+project.slug+".html",documentPage({
    title:project.title.replace(/^\d+\.\s*/,"")+" — Cyprien GUIGONNAT",kind:"project",prefix:"../",slug:project.slug,
    content:'<header id="hdr" class="project-header" tabindex="-1"><a id="nav-home" href="../index.html" class="project-close" aria-label="Fermer le projet et revenir à la page précédente">Fermer ×</a></header>\n'
      +'<main id="mn" class="project-page" tabindex="-1">\n'
      +'<figure class="project-hero">'+imageMarkup(project.images[0],"../","hero-image",true)+'</figure>\n'
      +'<section class="project-description" aria-labelledby="project-title">\n'
      +'<div class="project-heading"><h1 id="project-title">'+escape(project.title)+'</h1><p class="project-subtitle">'+escape(project.subtitle)+'</p><p class="project-date">'+escape(project.date)+'</p></div>\n'
      +'<div class="project-story">'+project.description+'</div>\n'
      +'<div class="project-details">'+project.details+'</div>\n</section>\n'
      +'<div class="project-gallery" role="group" aria-label="Images du projet">'+gallery+'</div>\n</main>\n'
      +'<footer class="page-footer project-pagination"><a href="../index.html">Accueil ↺</a>'
      +'<nav aria-label="Navigation entre les projets"><a href="'+previous.slug+'.html" rel="prev" aria-label="Projet précédent : '+escape(previous.title)+'">← Précédent</a>'
      +'<a href="'+next.slug+'.html" rel="next" aria-label="Projet suivant : '+escape(next.title)+'">Suivant →</a></nav></footer>'
  }));
});
process.stdout.write('Accueil, informations, données et '+projects.length+' projets générés.\n');
