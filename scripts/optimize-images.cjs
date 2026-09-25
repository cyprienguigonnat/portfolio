// Les PNG restent les originaux et le repli ; les WebP utilisent une qualité élevée avec perte.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');
const root = path.resolve(__dirname, '..');
const projects = require('../content/projects.json');
const manifestPath = path.join(root, 'content/images.json');
const previous = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath,'utf8')) : {};
(async () => {
  const manifest = {};
  for (const image of projects.flatMap(project=>project.images).filter(image=>!image.video)) {
    const source = path.join(root,'img/projets',image.file);
    const original = fs.readFileSync(source);
    const digest = crypto.createHash('sha256').update(original).digest('hex');
    if(previous[image.file]?.recipe===3 && previous[image.file].digest===digest && previous[image.file].variants.every(v=>fs.existsSync(path.join(root,'img/projets',v.file)))) {
      manifest[image.file]=previous[image.file];continue;
    }
    const metadata = await sharp(source).metadata();
    if(metadata.width!==image.width || metadata.height!==image.height)throw new Error('Dimensions incorrectes : '+image.file);
    const variants=[];
    for(const width of [640,960,1280,image.width].filter((v,i,a)=>v<=image.width && a.indexOf(v)===i)) {
      const output = await sharp(original).resize({width,withoutEnlargement:true}).webp({quality:92,effort:6,smartSubsample:true,exact:true}).toBuffer();
      const hash=crypto.createHash('sha256').update(output).digest('hex').slice(0,8).toUpperCase();
      const file=path.parse(image.file).name+'-'+width+'-'+hash+'.webp';
      // Ne jamais remplacer un petit PNG par un fichier plus lourd.
      if(output.length>=original.length)continue;
      fs.writeFileSync(path.join(root,'img/projets',file),output);
      variants.push({file,width,bytes:output.length});
    }
    manifest[image.file]={recipe:3,digest,originalBytes:original.length,variants};
  }
  const activeVariants=new Set(Object.values(manifest).flatMap(entry=>entry.variants.map(variant=>variant.file)));
  for(const entry of Object.values(previous))for(const variant of entry.variants) {
    if(activeVariants.has(variant.file))continue;
    const obsolete=path.join(root,'img/projets',variant.file);
    if(fs.existsSync(obsolete))fs.unlinkSync(obsolete);
  }
  fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');
  process.stdout.write('Images WebP et manifeste actualisés.\n');
})().catch(error=>{process.stderr.write(error.stack+'\n');process.exitCode=1;});
