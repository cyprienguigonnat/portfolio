// Intègre le fond photographique et les angles arrondis au fichier vidéo.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const sharp = require('sharp');
const root = path.resolve(__dirname, '..');
const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';
const output = path.join(root, 'img/projets/fabmanager-video.mp4');
(async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'fabmanager-video-'));
  try {
    const mask = path.join(temp, 'mask.png');
    await sharp(Buffer.from('<svg width="1440" height="810" xmlns="http://www.w3.org/2000/svg"><rect width="1440" height="810" fill="black"/><rect width="1440" height="810" rx="8" fill="white"/></svg>')).png().toFile(mask);
    execFileSync(ffmpeg, ['-y', '-loglevel', 'error',
      '-loop', '1', '-i', path.join(root, 'img/sources/fab-manager/video/background.png'),
      '-i', path.join(root, 'img/sources/fab-manager/video/video.mp4'),
      '-loop', '1', '-i', mask,
      '-filter_complex', '[0:v]scale=1856:1044,setsar=1[bg];[1:v]scale=1440:810,drawbox=x=0:y=0:w=2:h=ih:color=white:t=fill,setsar=1[ui];[2:v]format=gray[mask];[ui][mask]alphamerge=shortest=1[rounded];[bg][rounded]overlay=208:117:shortest=1,format=yuv420p[out]',
      '-map', '[out]', '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-r', '30', '-movflags', '+faststart', output
    ], { stdio: 'inherit' });
    execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-i', output, '-frames:v', '1', path.join(temp, 'poster.png')], { stdio: 'inherit' });
    await sharp(path.join(temp, 'poster.png')).webp({ quality: 85 }).toFile(path.join(root, 'img/projets/fabmanager-video-poster.webp'));
  } finally {
    // Le chemin est créé exclusivement par mkdtemp ci-dessus.
    fs.rmSync(temp, { recursive: true, force: true });
  }
})();
