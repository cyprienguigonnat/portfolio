// Encode la composition complète ; FFMPEG_PATH permet de choisir l'exécutable.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const sharp = require('sharp');
const root = path.resolve(__dirname, '..');
const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';
const output = path.join(root, 'img/projets/infomaniak-calendar-video.mp4');
(async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'infomaniak-video-'));
  try {
    const mask = path.join(temp, 'mask.png');
    await sharp(Buffer.from('<svg width="1298" height="730" xmlns="http://www.w3.org/2000/svg"><rect width="1298" height="730" fill="black"/><rect width="1298" height="730" rx="8" fill="white"/></svg>')).png().toFile(mask);
    execFileSync(ffmpeg, ['-y', '-loglevel', 'warning',
      '-loop', '1', '-i', path.join(root, 'img/projets/infomaniak-video-background.webp'),
      '-i', path.join(root, 'img/sources/infomaniak/video/video.mp4'),
      '-loop', '1', '-i', mask,
      '-filter_complex', '[0:v]scale=1672:942,setsar=1[bg];[1:v]scale=1298:730,setsar=1[ui];[2:v]format=gray[mask];[ui][mask]alphamerge=shortest=1[rounded];[bg][rounded]overlay=187:106:shortest=1,format=yuv420p[out]',
      '-map', '[out]', '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-r', '30', '-movflags', '+faststart', output
    ], { stdio: 'inherit' });
    execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-i', output, '-frames:v', '1', path.join(temp, 'poster.png')], { stdio: 'inherit' });
    await sharp(path.join(temp, 'poster.png')).webp({ quality: 85 }).toFile(path.join(root, 'img/projets/infomaniak-video-poster.webp'));
  } finally {
    if (path.dirname(temp) !== os.tmpdir() || !path.basename(temp).startsWith('infomaniak-video-')) throw new Error('Dossier temporaire inattendu');
    fs.rmSync(temp, { recursive: true, force: true });
  }
})();
