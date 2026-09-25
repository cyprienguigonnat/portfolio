const path=require('path');
const sharp=require('sharp');
const root=path.resolve(__dirname,'..');
const src=path.join(root,'img','sources','infomaniak','interface');
const out=path.join(root,'img','projets');
async function wide(source,index){
  await sharp(path.join(src,`Image - ${source}.png`)).resize({width:1672}).png({compressionLevel:9}).toFile(path.join(out,`infomaniak-0${index}.png`));
}
async function portrait(source,index){
  await sharp(path.join(src,`Image - ${source}.png`)).resize({width:1672}).png({compressionLevel:9}).toFile(path.join(out,`infomaniak-0${index}.png`));
}
(async()=>{
  await wide(1,2);
  await wide(2,3);
  await sharp(path.join(src,'Image - 3.png')).resize(1672,941,{fit:'cover'}).png({compressionLevel:9}).toFile(path.join(out,'infomaniak-04.png'));
  await sharp(path.join(src,'calendar-components.png')).resize(1672,2229,{fit:'fill'}).png({compressionLevel:9}).toFile(path.join(out,'infomaniak-05.png'));
  await portrait(5,6);
  await wide(6,7);
  await wide(7,8);
  console.log('Galerie Infomaniak générée depuis les visuels interface.');
})();
