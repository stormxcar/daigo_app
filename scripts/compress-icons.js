const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, '..', 'assets');
const src = path.join(assetsDir, 'icon.png'); // current icon = the new logo

async function compress(outputFile, width, height) {
  const tmp = outputFile + '.tmp.png';
  await sharp(src)
    .resize(width, height, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(tmp);
  fs.renameSync(tmp, outputFile);
  const kb = Math.round(fs.statSync(outputFile).size / 1024);
  console.log(`✅ ${path.basename(outputFile)}: ${width}x${height}px → ${kb} KB`);
}

async function main() {
  console.log('Compressing icon assets...\n');
  await compress(path.join(assetsDir, 'icon.png'), 1024, 1024);
  await compress(path.join(assetsDir, 'adaptive-icon.png'), 1024, 1024);
  await compress(path.join(assetsDir, 'favicon.png'), 64, 64);
  console.log('\nDone! Rebuild your app to apply new icons.');
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
