import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { guideDelivery } from '../src/utils/guide-images.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const blog = join(root, 'src/content/blog');
const outDir = join(root, 'public/images/listing');
const widths = [480, 800];
mkdirSync(outDir, { recursive: true });

const urls = new Set();
for (const name of readdirSync(blog)) {
  if (!name.endsWith('.mdx')) continue;
  const text = readFileSync(join(blog, name), 'utf8');
  const match = text.match(/^featured_image:\s*"([^"]+)"/m);
  if (match) urls.add(match[1]);
}

const manifest = {};
let wrote = 0;
for (const url of urls) {
  if (guideDelivery(url) || !url.startsWith('/')) continue;
  const source = join(root, 'public', url);
  let image;
  try {
    image = sharp(source);
    await image.metadata();
  } catch {
    continue;
  }
  const meta = await sharp(source).metadata();
  const id = basename(url, extname(url)).replace(/[^a-z0-9-]+/gi, '-').toLowerCase();
  const variants = [];
  for (const width of widths) {
    const target = Math.min(width, meta.width || width);
    if (variants.some((item) => item.width === target)) continue;
    const file = `${id}-${target}.webp`;
    const buf = await sharp(source).resize({ width: target, withoutEnlargement: true }).webp({ quality: 60 }).toBuffer();
    writeFileSync(join(outDir, file), buf);
    const sized = await sharp(buf).metadata();
    variants.push({ src: `/images/listing/${file}`, width: sized.width, height: sized.height, bytes: buf.length });
    wrote += 1;
  }
  const fallback = variants[variants.length - 1];
  manifest[url] = {
    src: fallback.src,
    width: fallback.width,
    height: fallback.height,
    srcset: variants.map((item) => `${item.src} ${item.width}w`).join(', '),
  };
}

writeFileSync(join(root, 'src/data/listing-image-manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`listing images: ${Object.keys(manifest).length} sources, ${wrote} files`);
