const sharp = require('sharp');
const pngToIcoModule = require('png-to-ico');
const pngToIco = pngToIcoModule.default || pngToIcoModule;
const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, '..', 'public', 'icon.svg');
const icoPath = path.join(__dirname, '..', 'public', 'icon.ico');

async function main() {
  const svgBuffer = fs.readFileSync(svgPath);
  
  // Generate PNGs at standard ICO sizes
  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const pngBuffers = [];
  
  for (const size of sizes) {
    const png = await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toBuffer();
    pngBuffers.push(png);
  }
  
  // Also save a 256px PNG for electron-builder
  const png256Path = path.join(__dirname, '..', 'public', 'icon-256.png');
  fs.writeFileSync(png256Path, pngBuffers[pngBuffers.length - 1]);
  console.log('Saved icon-256.png');

  // Convert all PNGs to a single multi-size ICO
  const icoBuffer = await pngToIco(pngBuffers);
  fs.writeFileSync(icoPath, icoBuffer);
  
  const stats = fs.statSync(icoPath);
  console.log(`Saved icon.ico (${stats.size} bytes, ${sizes.length} sizes: ${sizes.join(', ')})`);
}

main().catch(err => { console.error(err); process.exit(1); });
