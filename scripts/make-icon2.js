const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const svgPath = path.join(__dirname, '../public/icon.svg');
const outIco  = path.join(__dirname, '../public/icon.ico');

async function run() {
  const svgBuf = fs.readFileSync(svgPath);
  const sizes = [256, 128, 64, 48, 32, 16];
  const pngs = [];

  for (const size of sizes) {
    const buf = await sharp(svgBuf)
      .resize(size, size, { fit: 'contain', background: { r: 10, g: 10, b: 10, alpha: 1 } })
      .png({ compressionLevel: 9 })
      .toBuffer();
    pngs.push({ size, buf });
    console.log(`Rendered ${size}x${size}: ${buf.length} bytes`);
  }

  fs.writeFileSync(path.join(__dirname, '../public/icon-256.png'), pngs[0].buf);

  const ico = buildIco(pngs);
  fs.writeFileSync(outIco, ico);
  console.log(`icon.ico written (${ico.length} bytes) -> ${outIco}`);
}

function buildIco(images) {
  const HEADER = 6;
  const DIR_ENTRY = 16;
  const dirOffset = HEADER + DIR_ENTRY * images.length;

  let dataOffset = dirOffset;
  const offsets = images.map(img => {
    const off = dataOffset;
    dataOffset += img.buf.length;
    return off;
  });

  const total = dataOffset;
  const out = Buffer.alloc(total);

  out.writeUInt16LE(0, 0);
  out.writeUInt16LE(1, 2);
  out.writeUInt16LE(images.length, 4);

  images.forEach(({ size, buf }, i) => {
    const base = HEADER + i * DIR_ENTRY;
    out.writeUInt8(size >= 256 ? 0 : size, base + 0);
    out.writeUInt8(size >= 256 ? 0 : size, base + 1);
    out.writeUInt8(0, base + 2);
    out.writeUInt8(0, base + 3);
    out.writeUInt16LE(0, base + 4);
    out.writeUInt16LE(32, base + 6);
    out.writeUInt32LE(buf.length, base + 8);
    out.writeUInt32LE(offsets[i], base + 12);
  });

  images.forEach(({ buf }, i) => {
    buf.copy(out, offsets[i]);
  });

  return out;
}

run().catch(e => { console.error(e); process.exit(1); });
