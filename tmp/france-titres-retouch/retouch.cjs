const fs=require('fs'); const sharp=require('sharp');const {chromium}=require('playwright');
(async()=>{
 const dir='tmp/france-titres-retouch'; const source=fs.readFileSync(dir+'/source-path.txt','utf8');
 const browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:140,height:32},deviceScaleFactor:2});
 const font=fs.readFileSync(dir+'/Marianne-Medium.woff2').toString('base64');
 await page.setContent(`<style>@font-face{font-family:m;src:url(data:font/woff2;base64,${font})}*{box-sizing:border-box}html,body{margin:0;background:white}div{font-family:m;font-size:18px;line-height:26px;color:#3a3a3a;white-space:pre}</style><div>12 345 678</div>`);await page.evaluate(()=>document.fonts.ready);const text=await page.screenshot();await browser.close();
 const patch=await sharp(text).resize(140,32).extract({left:0,top:0,width:100,height:32}).png().toBuffer();
 const modified=await sharp(source).composite([{input:patch,left:1418,top:63}]).png().toBuffer();
 // Reuse the original frame and its exact background colors at every row.
 const W=1672,H=2522;const old=await sharp(dir+'/original.png').removeAlpha().raw().toBuffer();
 const aligned=await sharp(source).resize({width:1456}).removeAlpha().raw().toBuffer();
 const clean=Buffer.from(old);
 for(let y=110;y<H;y++)for(let x=109;x<1563;x++){if(y<118&&(x<117||x>1554))continue;for(let c=0;c<3;c++)clean[(y*W+x)*3+c]=old[(y*W+120)*3+c];}
 const outW=2090,outH=3153,scale=1.25;
 const base=await sharp(clean,{raw:{width:W,height:H,channels:3}}).resize(outW,outH).raw().toBuffer();
 const src=await sharp(modified).resize({width:1820}).removeAlpha().raw().toBuffer();
 const fades=[];
 for(let y=0;y<H;y++){
  if(y<2220){fades[y]=1;continue;}let num=0,den=0;
  for(let yy=Math.max(110,y-18);yy<=Math.min(H-1,y+18);yy++)for(let x=310;x<1250;x++){
   const v=255-aligned[((yy-109)*1456+x-108)*3+1];if(v<100)continue;
   const d=old[(yy*W+120)*3+1]-old[(yy*W+x)*3+1];num+=v*d;den+=v*v;
  }fades[y]=den?Math.max(0,Math.min(1,num/den)):fades[y-1];
 }
 for(let y=138;y<outH;y++)for(let x=136;x<1954;x++){
  if(y<148&&(x<146||x>1942))continue;
  const sy=y-136,sx=x-135;const fade=fades[Math.min(H-1,Math.round(y/scale))];
  for(let c=0;c<3;c++){const idx=(y*outW+x)*3+c;base[idx]=Math.max(0,Math.round(base[idx]-(255-src[(sy*1820+sx)*3+c])*fade));}
 }
 await sharp(base,{raw:{width:outW,height:outH,channels:3}}).png().toFile(dir+'/result.png');
 await sharp(dir+'/result.png').extract({left:1390,top:175,width:285,height:62}).resize({width:855}).toFile(dir+'/check-number.png');
 console.log({width:outW,height:outH});
})().catch(e=>{console.error(e);process.exit(1)});

