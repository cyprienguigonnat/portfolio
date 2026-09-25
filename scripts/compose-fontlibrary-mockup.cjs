const sharp = require('sharp');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

// Solve the inverse homography: display coordinates to original screenshot.
function solve(a, b) {
  const m = a.map((r, i) => [...r, b[i]]);
  for (let i = 0; i < 8; i++) {
    let pivot = i;
    for (let j = i + 1; j < 8; j++) if (Math.abs(m[j][i]) > Math.abs(m[pivot][i])) pivot = j;
    [m[i], m[pivot]] = [m[pivot], m[i]];
    const d = m[i][i];
    for (let k = i; k <= 8; k++) m[i][k] /= d;
    for (let j = 0; j < 8; j++) if (j !== i) {
      const f = m[j][i];
      for (let k = i; k <= 8; k++) m[j][k] -= f * m[i][k];
    }
  }
  return m.map(r => r[8]);
}

(async () => {
  const basePath = path.join(root, 'img/sources/fontlibrary/mockup-base.png');
  const {data: base, info} = await sharp(basePath).removeAlpha().raw().toBuffer({resolveWithObject:true});
  const {data: src, info: si} = await sharp(path.join(root, 'img/sources/fontlibrary/interface.png')).removeAlpha().raw().toBuffer({resolveWithObject:true});
  const corners = [[614,66],[1307,336],[1114,851],[464,509]];
  const uv = [[0,0],[si.width,0],[si.width,si.height],[0,si.height]];
  const a = [], b = [];
  corners.forEach(([x,y],i) => {
    const [u,v] = uv[i];
    a.push([x,y,1,0,0,0,-u*x,-u*y],[0,0,0,x,y,1,-v*x,-v*y]);
    b.push(u,v);
  });
  const h = solve(a,b);
  // Rounded display outline and foreground camera notch, traced from the photograph.
  const outline = 'M 625 71 L 903 176 L 900 188 Q 899 192 904 194 L 977 221 Q 983 224 986 217 L 989 210 L 1297 333 Q 1306 336 1301 349 L 1121 837 Q 1118 853 1107 849 L 471 518 Q 464 514 468 501 L 607 79 Q 610 66 625 71 Z';
  const mask = await sharp(Buffer.from(`<svg width="${info.width}" height="${info.height}"><path d="${outline}" fill="white"/></svg>`)).ensureAlpha().raw().toBuffer();
  const out = Buffer.from(base);
  for (let y=0;y<info.height;y++) for (let x=0;x<info.width;x++) {
    const alpha = mask[(y*info.width+x)*4+3]/255;
    if (!alpha) continue;
    const sums = [0,0,0];
    // Area sampling prevents aliasing when reducing fine interface typography.
    for(let sy=0;sy<3;sy++) for(let sx=0;sx<3;sx++) {
      const xx=x+(sx+.5)/3-.5, yy=y+(sy+.5)/3-.5;
      const den=h[6]*xx+h[7]*yy+1;
      const u=Math.max(0,Math.min(si.width-1,(h[0]*xx+h[1]*yy+h[2])/den));
      const v=Math.max(0,Math.min(si.height-1,(h[3]*xx+h[4]*yy+h[5])/den));
      const ix=Math.floor(u), iy=Math.floor(v), dx=u-ix, dy=v-iy;
      for(let c=0;c<3;c++) {
        const at=(px,py)=>src[(Math.min(si.height-1,py)*si.width+Math.min(si.width-1,px))*3+c];
        sums[c]+=((at(ix,iy)*(1-dx)+at(ix+1,iy)*dx)*(1-dy)+(at(ix,iy+1)*(1-dx)+at(ix+1,iy+1)*dx)*dy)/9;
      }
    }
    for(let c=0;c<3;c++) {
      const k=(y*info.width+x)*3+c;
      out[k]=Math.round(sums[c]*alpha+base[k]*(1-alpha));
    }
  }
  await sharp(out,{raw:{width:info.width,height:info.height,channels:3}}).png().toFile(path.join(root,'img/projets/fontlibrary-01.png'));
  console.log('Exact screenshot projected onto display; photograph preserved outside display.');
})().catch(e=>{console.error(e);process.exitCode=1;});
