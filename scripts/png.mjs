// Minimal, dependency-free deterministic PNG encoder for solid-color icons
// with a simple diagonal "clock hand" motif. Produces a valid RGBA PNG.
import zlib from 'node:zlib';

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

export function encodeRgbaPng(width, height, rgba) {
  const rowSize = width * 4 + 1;
  const raw = Buffer.alloc(height * rowSize);
  for (let y = 0; y < height; y++) {
    const rowStart = y * rowSize;
    raw[rowStart] = 0;
    rgba.copy(raw, rowStart + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Draw the store/extension clock. At 128px the artwork is 96px across,
// preserving Chrome Web Store's recommended 16px transparent safe area.
export function makeIcon(size) {
  const bg = [37, 99, 235]; // brand blue
  const fg = [219, 234, 254]; // light blue
  const rgba = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.375;
  const handLen = size * 0.255;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      let color;
      let alpha = 255;
      if (dist > r) {
        alpha = 0;
        color = bg;
      } else {
        // clock hands: vertical up + horizontal right
        const onVertical = Math.abs(dx) < size * 0.05 && dy < 0 && -dy < handLen;
        const onHoriz = Math.abs(dy) < size * 0.05 && dx > 0 && dx < handLen;
        const center = dist < size * 0.08;
        color = onVertical || onHoriz || center ? fg : bg;
      }
      const o = (y * size + x) * 4;
      rgba[o] = color[0];
      rgba[o + 1] = color[1];
      rgba[o + 2] = color[2];
      rgba[o + 3] = alpha;
    }
  }
  return encodeRgbaPng(size, size, rgba);
}

// Text-free promotional art: a quiet grid suggests history over time while
// the clock mark remains legible at both Store-required promo sizes.
export function makePromo(width, height) {
  const rgba = Buffer.alloc(width * height * 4);
  const cx = width / 2;
  const cy = height / 2;
  const min = Math.min(width, height);
  const radius = min * 0.23;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4;
      const dx = (x - cx) / width;
      const dy = (y - cy) / height;
      const glow = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) * 2.6);
      const grid = x % Math.max(28, Math.round(width / 22)) === 0 || y % Math.max(28, Math.round(height / 12)) === 0;
      rgba[o] = Math.round(9 + glow * 13 + (grid ? 4 : 0));
      rgba[o + 1] = Math.round(18 + glow * 31 + (grid ? 5 : 0));
      rgba[o + 2] = Math.round(34 + glow * 60 + (grid ? 7 : 0));
      rgba[o + 3] = 255;
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      const o = (y * width + x) * 4;
      const edge = Math.abs(d - radius) < Math.max(3, min * 0.012);
      const face = d < radius - Math.max(3, min * 0.012);
      const vertical = Math.abs(dx) < min * 0.018 && dy < 0 && -dy < radius * 0.58;
      const horizontal = Math.abs(dy) < min * 0.018 && dx > 0 && dx < radius * 0.54;
      if (face) {
        rgba[o] = 37;
        rgba[o + 1] = 99;
        rgba[o + 2] = 235;
      }
      if (edge || vertical || horizontal || d < min * 0.035) {
        rgba[o] = 239;
        rgba[o + 1] = 246;
        rgba[o + 2] = 255;
      }
    }
  }
  return encodeRgbaPng(width, height, rgba);
}
