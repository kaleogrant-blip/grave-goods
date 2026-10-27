// Minimal PNG re-encoder: 8-bit RGBA (or RGB, gray+alpha, gray) non-interlaced -> 8-bit RGB with no alpha channel.
// App Store Connect rejects a 1024x1024 app icon that has an alpha channel, so the icon is flattened onto a solid colour.
import zlib from 'node:zlib';

const SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const crcTable = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = buf => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); };

export function decode(png) {
  if (!png.subarray(0, 8).equals(SIG)) throw new Error('not a PNG');
  let o = 8, ihdr = null; const idat = [];
  while (o < png.length) {
    const len = png.readUInt32BE(o), type = png.toString('latin1', o + 4, o + 8), data = png.subarray(o + 8, o + 8 + len);
    if (type === 'IHDR') ihdr = { w: data.readUInt32BE(0), h: data.readUInt32BE(4), depth: data[8], ct: data[9], interlace: data[12] };
    else if (type === 'IDAT') idat.push(data);
    o += 12 + len;
  }
  if (!ihdr || ihdr.depth !== 8 || ihdr.interlace !== 0 || ![0, 2, 4, 6].includes(ihdr.ct)) throw new Error('unsupported PNG (need 8-bit, non-interlaced, non-palette)');
  const bpp = { 0: 1, 2: 3, 4: 2, 6: 4 }[ihdr.ct], stride = ihdr.w * bpp;
  const raw = zlib.inflateSync(Buffer.concat(idat)), out = Buffer.alloc(stride * ihdr.h);
  for (let y = 0; y < ihdr.h; y++) {
    const f = raw[y * (stride + 1)], src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)), row = y * stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? out[row + x - bpp] : 0, b = y ? out[row - stride + x] : 0, c = x >= bpp && y ? out[row - stride + x - bpp] : 0;
      let v = src[x];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      out[row + x] = v & 255;
    }
  }
  return { ...ihdr, bpp, pixels: out };
}

export function flattenToRGB(png, bg = [23, 22, 27]) {
  const im = decode(png), rgb = Buffer.alloc(im.w * im.h * 3);
  for (let i = 0, p = 0, q = 0; i < im.w * im.h; i++, p += im.bpp, q += 3) {
    let r, g, b, a = 255;
    if (im.ct === 6) { r = im.pixels[p]; g = im.pixels[p + 1]; b = im.pixels[p + 2]; a = im.pixels[p + 3]; }
    else if (im.ct === 2) { r = im.pixels[p]; g = im.pixels[p + 1]; b = im.pixels[p + 2]; }
    else if (im.ct === 4) { r = g = b = im.pixels[p]; a = im.pixels[p + 1]; }
    else { r = g = b = im.pixels[p]; }
    rgb[q] = Math.round((r * a + bg[0] * (255 - a)) / 255); rgb[q + 1] = Math.round((g * a + bg[1] * (255 - a)) / 255); rgb[q + 2] = Math.round((b * a + bg[2] * (255 - a)) / 255);
  }
  const stride = im.w * 3, raw = Buffer.alloc((stride + 1) * im.h);
  for (let y = 0; y < im.h; y++) { raw[y * (stride + 1)] = 0; rgb.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(im.w, 0); ihdr.writeUInt32BE(im.h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([SIG, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

export function solidPng(w, h, rgb) {
  const stride = w * 3, raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const o = y * (stride + 1) + 1 + x * 3; raw[o] = rgb[0]; raw[o + 1] = rgb[1]; raw[o + 2] = rgb[2]; }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([SIG, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
export const colorType = png => png[25];

// ---- RGBA helpers for the Android launcher icons (any decodable 8-bit PNG in, 8-bit RGBA PNG out)
export function toRGBA(png) {
  const im = decode(png), out = Buffer.alloc(im.w * im.h * 4);
  for (let i = 0, p = 0, q = 0; i < im.w * im.h; i++, p += im.bpp, q += 4) {
    if (im.ct === 6) { out[q] = im.pixels[p]; out[q + 1] = im.pixels[p + 1]; out[q + 2] = im.pixels[p + 2]; out[q + 3] = im.pixels[p + 3]; }
    else if (im.ct === 2) { out[q] = im.pixels[p]; out[q + 1] = im.pixels[p + 1]; out[q + 2] = im.pixels[p + 2]; out[q + 3] = 255; }
    else if (im.ct === 4) { out[q] = out[q + 1] = out[q + 2] = im.pixels[p]; out[q + 3] = im.pixels[p + 1]; }
    else { out[q] = out[q + 1] = out[q + 2] = im.pixels[p]; out[q + 3] = 255; }
  }
  return { w: im.w, h: im.h, data: out };
}
// Area-average (box) downscale, alpha-weighted so transparent edges do not darken.
export function scaleRGBA(src, nw, nh) {
  const out = Buffer.alloc(nw * nh * 4), sx = src.w / nw, sy = src.h / nh;
  for (let y = 0; y < nh; y++) for (let x = 0; x < nw; x++) {
    const x0 = x * sx, x1 = (x + 1) * sx, y0 = y * sy, y1 = (y + 1) * sy;
    let r = 0, g = 0, b = 0, a = 0, wsum = 0;
    for (let yy = Math.floor(y0); yy < Math.min(src.h, Math.ceil(y1)); yy++) for (let xx = Math.floor(x0); xx < Math.min(src.w, Math.ceil(x1)); xx++) {
      const w = (Math.min(x1, xx + 1) - Math.max(x0, xx)) * (Math.min(y1, yy + 1) - Math.max(y0, yy)), i = (yy * src.w + xx) * 4, al = src.data[i + 3] / 255;
      r += src.data[i] * al * w; g += src.data[i + 1] * al * w; b += src.data[i + 2] * al * w; a += al * w; wsum += w;
    }
    const o = (y * nw + x) * 4;
    if (a > 0) { out[o] = Math.round(r / a); out[o + 1] = Math.round(g / a); out[o + 2] = Math.round(b / a); }
    out[o + 3] = Math.round((a / wsum) * 255);
  }
  return { w: nw, h: nh, data: out };
}
export function encodeRGBA(im) {
  const stride = im.w * 4, raw = Buffer.alloc((stride + 1) * im.h);
  for (let y = 0; y < im.h; y++) { raw[y * (stride + 1)] = 0; im.data.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(im.w, 0); ihdr.writeUInt32BE(im.h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([SIG, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
// Place `im` centred on a transparent square canvas of `size`, scaled to `inner` px (adaptive-icon foreground: art lives in the centre 66/108).
export function padCentered(im, size, inner) {
  const s = scaleRGBA(im, inner, inner), out = Buffer.alloc(size * size * 4), off = Math.floor((size - inner) / 2);
  for (let y = 0; y < inner; y++) s.data.copy(out, ((y + off) * size + off) * 4, y * inner * 4, (y + 1) * inner * 4);
  return { w: size, h: size, data: out };
}
export const pngSize = png => ({ w: png.readUInt32BE(16), h: png.readUInt32BE(20) });
