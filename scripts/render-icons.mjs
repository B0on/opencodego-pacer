// Generates simple PNG toolbar icons (16/32/48/128) without native deps.
// Writes to store-assets/icons.
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const outDir = join(dirname(fileURLToPath(import.meta.url)), "../public/icons");

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function writePng(size, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // raw scanlines with filter byte 0
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const px = pixels[y * size + x];
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = px[0];
      raw[o + 1] = px[1];
      raw[o + 2] = px[2];
      raw[o + 3] = px[3];
    }
  }
  const idat = deflateSync(raw);
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  return png;
}

function ringPixels(size, color) {
  const pixels = [];
  const cx = size / 2 - 0.5;
  const cy = size / 2 - 0.5;
  const r = size / 2 - 2;
  const lw = Math.max(2, size / 16);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dist = Math.hypot(x - cx, y - cy);
      if (Math.abs(dist - r) <= lw) {
        let angle = (Math.atan2(y - cy, x - cx) * 180) / Math.PI; // -180..180, 0 at right
        let deg = (angle + 360) % 360; // 0 at right, ccw positive
        // convert to cw from top: fill covers [90deg .. 90+360*frac]
        const cwFromTop = (deg + 90) % 360;
        if (cwFromTop <= 360 * 0.3) {
          pixels.push([color[0], color[1], color[2], 255]);
          continue;
        }
      }
      pixels.push([0, 0, 0, 0]);
    }
  }
  return pixels;
}

const accent = [0x6e, 0xa8, 0xfe];
mkdirSync(outDir, { recursive: true });
for (const size of [16, 32, 48, 128]) {
  const pixels = ringPixels(size, accent);
  writeFileSync(join(outDir, `icon${size}.png`), writePng(size, pixels));
  console.log(`wrote icon${size}.png`);
}
