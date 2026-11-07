import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { parse } from 'yaml';
import { selectRelatedPosts } from '../src/utils/discovery.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const BLOG = join(ROOT, 'src/content/blog');
const PUBLIC = join(ROOT, 'public');
const OUT_DIR = join(PUBLIC, 'images/guides');
const MANIFEST = join(ROOT, 'src/data/guide-image-manifest.json');
const BUDGET = 40000;
const WIDTHS = [960, 800, 640, 480];
const QUALITY = {
  avif: [55, 48, 42, 36, 32, 28],
  webp: [70, 60, 52, 46, 40, 34],
  jpeg: [72, 62, 54, 46, 40, 34],
};

function frontmatter(source) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  return parse(match[1]);
}

function posts() {
  return readdirSync(BLOG)
    .filter((name) => name.endsWith('.mdx') || name.endsWith('.md'))
    .map((name) => {
      const source = readFileSync(join(BLOG, name), 'utf8');
      const data = frontmatter(source);
      if (!data) return null;
      const body = source.slice(source.indexOf('---', 3) + 3);
      return {
        slug: name.replace(/\.mdx?$/, ''),
        data,
        body,
      };
    })
    .filter(Boolean);
}

function markdownImages(body) {
  return [...body.matchAll(/!\[[^\]]*]\(\s*<?([^)\s>]+)>?/g)].map((match) => match[1]);
}

function stem(url) {
  const path = url.split('?')[0];
  const unsplash = path.match(/photo-(\d+-[a-z0-9]+)/i);
  if (unsplash) return `photo-${unsplash[1]}`;
  const pexels = path.match(/photos\/(\d+)\//);
  if (pexels) return `pexels-${pexels[1]}`;
  const shop = url.match(/shgcdn\.com\/([a-f0-9]{8})/i);
  if (shop) return `better-${shop[1]}`;
  const base = basename(path, extname(path)).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (base && base.length <= 80) return base;
  return createHash('sha1').update(url).digest('hex').slice(0, 16);
}

function creditFrom(meta) {
  if (!meta.exif) return null;
  const text = meta.exif.toString('latin1').replace(/[^\x20-\x7e]+/g, ' ');
  if (text.includes('Markus Spiske')) return 'Markus Spiske / CC 0';
  return null;
}

async function loadSource(url) {
  if (url.startsWith('/')) {
    const path = join(PUBLIC, url.replace(/^\/+/, ''));
    return { input: path, bytes: statSync(path).size };
  }
  const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, redirect: 'follow' });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  const path = join('/tmp/guide-src', `${stem(url)}${extname(url.split('?')[0]) || '.img'}`);
  mkdirSync('/tmp/guide-src', { recursive: true });
  writeFileSync(path, buffer);
  return { input: path, bytes: buffer.length };
}

async function encode(input, { width, format, keepMeta }) {
  for (const quality of QUALITY[format]) {
    let image = sharp(input).rotate().resize({ width, withoutEnlargement: true });
    if (keepMeta) image = image.withMetadata();
    const options = format === 'jpeg' ? { quality, mozjpeg: true } : { quality };
    const buf = await image.toFormat(format, options).toBuffer();
    if (buf.length <= BUDGET) {
      const meta = await sharp(buf).metadata();
      return { buf, quality, width: meta.width, height: meta.height, bytes: buf.length };
    }
  }
  return null;
}

async function variantsFor(input, keepMeta) {
  const variants = [];
  for (const format of ['avif', 'webp']) {
    for (const width of WIDTHS) {
      const encoded = await encode(input, { width, format, keepMeta });
      if (encoded) variants.push({ format, ...encoded });
    }
  }
  if (!variants.some((item) => item.format === 'webp')) {
    const encoded = await encode(input, { width: 360, format: 'webp', keepMeta });
    if (!encoded) throw new Error('no WebP fit the 40KB budget');
    variants.push({ format: 'webp', ...encoded });
  }
  if (!variants.some((item) => item.format === 'avif')) {
    const encoded = await encode(input, { width: 360, format: 'avif', keepMeta });
    if (encoded) variants.push({ format: 'avif', ...encoded });
  }
  let social = null;
  for (const width of WIDTHS) {
    const encoded = await encode(input, { width, format: 'jpeg', keepMeta });
    if (encoded) {
      social = encoded;
      break;
    }
  }
  if (!social) throw new Error('no JPEG social image fit the 40KB budget');
  return { variants, social };
}

async function thumbFor(input, keepMeta) {
  const encoded = await encode(input, { width: 320, format: 'webp', keepMeta })
    || await encode(input, { width: 240, format: 'webp', keepMeta });
  if (!encoded) throw new Error('no thumb fit the 40KB budget');
  return encoded;
}

function writeVariant(name, encoded) {
  const filename = `${name}-${encoded.width}.${encoded.format === 'jpeg' ? 'jpg' : encoded.format}`;
  const path = join(OUT_DIR, filename);
  writeFileSync(path, encoded.buf);
  return {
    format: encoded.format === 'jpeg' ? 'jpeg' : encoded.format,
    width: encoded.width,
    height: encoded.height,
    bytes: encoded.bytes,
    quality: encoded.quality,
    src: `/images/guides/${filename}`,
  };
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const all = posts();
  const best = all.filter((post) => post.data.category === 'best');
  const delivery = new Set();
  for (const post of best) {
    if (post.data.featured_image) delivery.add(String(post.data.featured_image).trim());
    for (const url of markdownImages(post.body)) delivery.add(url.trim());
  }
  const related = new Set(['/images/kyle-reierson.jpg']);
  for (const post of best) {
    for (const item of selectRelatedPosts(all, post)) {
      if (item.data.featured_image) related.add(String(item.data.featured_image).trim());
    }
  }
  const jobs = [...new Set([...delivery, ...related])].filter(Boolean);
  console.log(`Optimizing ${delivery.size} guide photos and ${related.size} thumbs (${jobs.length} unique URLs).`);
  const bySource = {};
  const thumbs = {};
  for (const url of jobs) {
    const loaded = await loadSource(url);
    const meta = await sharp(loaded.input).metadata();
    const keepMeta = Boolean(meta.exif);
    const credit = creditFrom(meta);
    const name = stem(url);
    if (delivery.has(url)) {
      const made = await variantsFor(loaded.input, keepMeta);
      const variants = made.variants.map((item) => writeVariant(name, item));
      const social = writeVariant(`${name}-social`, { ...made.social, format: 'jpeg' });
      bySource[url] = {
        source: url,
        originalBytes: loaded.bytes,
        credit,
        variants,
        social,
      };
      console.log(`${name}: ${loaded.bytes} -> ${variants.map((item) => `${item.format}${item.width}:${item.bytes}`).join(' ')} social:${social.bytes}`);
    }
    if (related.has(url) && !delivery.has(url)) {
      const made = await thumbFor(loaded.input, keepMeta);
      const thumb = writeVariant(`${name}-thumb`, { ...made, format: 'webp' });
      thumbs[url] = { source: url, originalBytes: loaded.bytes, credit, ...thumb };
      console.log(`thumb ${name}: ${loaded.bytes} -> ${thumb.bytes}`);
    }
  }
  const manifest = {
    budget: BUDGET,
    sizes: '(min-width: 1024px) 896px, calc(100vw - 2rem)',
    bySource,
    thumbs,
  };
  mkdirSync(dirname(MANIFEST), { recursive: true });
  writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
  const files = Object.values(bySource).flatMap((entry) => [...entry.variants, entry.social]).concat(Object.values(thumbs));
  const over = files.filter((item) => item.bytes > BUDGET);
  if (over.length) {
    console.error(over);
    process.exit(1);
  }
  console.log(`Wrote ${files.length} images, largest ${Math.max(...files.map((item) => item.bytes))} bytes.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
