// Compose le fond photographique fixe et l'interface animée, y compris en plein écran.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const sharp = require('sharp');
const root = path.resolve(__dirname, '..');
const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';
(async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'fontlibrary-video-'));
  const output = path.join(root, 'img/projets/fontlibrary-video.mp4');
  try {
    const mask = path.join(temp, 'mask.png');
    await sharp(Buffer.from('<svg width="1440" height="810" xmlns="http://www.w3.org/2000/svg"><rect width="1440" height="810" fill="black"/><rect width="1440" height="810" rx="20" fill="white"/></svg>')).png().toFile(mask);
    execFileSync(ffmpeg, ['-y', '-loglevel', 'error',
      '-loop', '1', '-i', path.join(root, 'img/sources/font-library/video/background.png'),
      '-i', path.join(root, 'img/sources/font-library/video/video.mp4'),
      '-loop', '1', '-i', mask,
      '-filter_complex', '[0:v]scale=1856:1044,setsar=1[bg];[1:v]scale=1440:810,setsar=1[ui];[2:v]format=gray[mask];[ui][mask]alphamerge=shortest=1[rounded];[bg][rounded]overlay=208:117:shortest=1,format=yuv420p[out]',
      '-map', '[out]', '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-r', '30', '-movflags', '+faststart', output
    ], { stdio: 'inherit' });
    const poster = path.join(temp, 'poster.png');
    execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-i', output, '-frames:v', '1', poster]);
    await sharp(poster).webp({ quality: 85 }).toFile(path.join(root, 'img/projets/fontlibrary-video-poster.webp'));
  } finally {
    if (path.dirname(temp) !== os.tmpdir() || !path.basename(temp).startsWith('fontlibrary-video-')) throw new Error('Dossier temporaire inattendu');
    fs.rmSync(temp, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
