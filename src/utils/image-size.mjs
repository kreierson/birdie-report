import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

function jpegSize(buf) {
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) {
      i += 1;
      continue;
    }
    const marker = buf[i + 1];
    if (marker === 0xd8 || marker === 0xd9) {
      i += 2;
      continue;
    }
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    const length = buf.readUInt16BE(i + 2);
    if (length < 2) return null;
    i += 2 + length;
  }
  return null;
}

export function localImageSize(src) {
  if (typeof src !== 'string' || !src.startsWith('/images/')) return null;
  const file = join(process.cwd(), 'public', src.slice(1).split('?')[0]);
  if (!existsSync(file)) return null;
  const buf = readFileSync(file);
  if (buf.length >= 24 && buf[0] === 0x89 && buf.toString('ascii', 12, 16) === 'IHDR') {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  return jpegSize(buf);
}
