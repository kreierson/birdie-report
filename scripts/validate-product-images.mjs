import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isNonProductImageHost } from '../src/utils/review-schema.mjs';

const SITE = 'https://www.birdiereport.com';

function decodeHtml(value) {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function walk(value, visit) {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    value.forEach((entry) => walk(entry, visit));
    return;
  }
  visit(value);
  Object.values(value).forEach((entry) => walk(entry, visit));
}

function isType(node, type) {
  const value = node?.['@type'];
  return value === type || (Array.isArray(value) && value.includes(type));
}

export function jsonLdBlocks(html) {
  const blocks = [];
  const scripts = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const script of scripts) {
    try {
      blocks.push(JSON.parse(script[1]));
    } catch (error) {
      return { error: `JSON-LD is not parseable (${error.message})` };
    }
  }
  return { blocks };
}

export function productNodesFrom(data) {
  const products = [];
  walk(data, (node) => {
    if (isType(node, 'Product')) products.push(node);
  });
  return products;
}

export function productImageUrls(image) {
  if (!image) return [];
  if (typeof image === 'string') return [image];
  if (Array.isArray(image)) return image.flatMap(productImageUrls);
  if (typeof image === 'object') {
    const url = image.url || image.contentUrl;
    return typeof url === 'string' ? [url] : [];
  }
  return [];
}

function absoluteHttps(value) {
  if (typeof value !== 'string' || !/^https:\/\//i.test(value.trim())) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:') return null;
    return url;
  } catch {
    return null;
  }
}

function visibleHref(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(decodeHtml(value).trim(), SITE);
    if (url.protocol !== 'https:') return null;
    return url.href;
  } catch {
    return null;
  }
}

export function visibleImageUrls(html) {
  const urls = new Set();
  const add = (value) => {
    const href = visibleHref(value);
    if (href) urls.add(href);
  };
  for (const tag of html.matchAll(/<img\b[^>]*>/gi)) {
    const src = tag[0].match(/\bsrc=["']([^"']+)["']/i);
    if (src) add(src[1]);
    const srcset = tag[0].match(/\bsrcset=["']([^"']+)["']/i);
    if (srcset) {
      for (const part of srcset[1].split(',')) add(part.trim().split(/\s+/)[0]);
    }
  }
  for (const tag of html.matchAll(/<meta\b[^>]*>/gi)) {
    if (!/\b(?:property|name)=["'](?:og:image|twitter:image)["']/i.test(tag[0])) continue;
    const content = tag[0].match(/\bcontent=["']([^"']+)["']/i);
    if (content) add(content[1]);
  }
  return urls;
}

function allowedHosts(visible) {
  const hosts = new Set(['www.birdiereport.com', 'birdiereport.com']);
  for (const href of visible) {
    try {
      hosts.add(new URL(href).hostname);
    } catch {
      // Ignore unparseable visible URLs; they cannot authorize a host.
    }
  }
  return hosts;
}

// Problems for one built page. Empty means every Product image is an absolute
// https URL of a photo already referenced on that page.
export function validateProductImageHtml(html) {
  const parsed = jsonLdBlocks(html);
  if (parsed.error) return [parsed.error];
  const products = parsed.blocks.flatMap(productNodesFrom);
  if (!products.length) return [];
  const visible = visibleImageUrls(html);
  const hosts = allowedHosts(visible);
  const problems = [];
  products.forEach((product, index) => {
    const label = product.name || `product ${index + 1}`;
    const urls = productImageUrls(product.image);
    if (!urls.length) {
      problems.push(`${label} Product is missing image`);
      return;
    }
    for (const raw of urls) {
      const url = absoluteHttps(raw);
      if (!url) {
        problems.push(`${label} image is not an absolute https URL`);
        continue;
      }
      if (isNonProductImageHost(url.hostname) || !hosts.has(url.hostname)) {
        problems.push(`${label} image host ${url.hostname} is not used for an on-page image`);
      }
      if (!visible.has(url.href)) {
        problems.push(`${label} image is not a visible image on the page`);
      }
    }
  });
  return problems;
}

function htmlFiles(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) htmlFiles(path, out);
    else if (entry.endsWith('.html')) out.push(path);
  }
  return out;
}

function pagePath(dist, file) {
  let rel = relative(dist, file).split(sep).join('/');
  if (rel.endsWith('/index.html')) rel = rel.slice(0, -'index.html'.length);
  else if (rel.endsWith('.html')) rel = `/${rel.slice(0, -'.html'.length)}`;
  if (!rel.startsWith('/')) rel = `/${rel}`;
  if (!rel.endsWith('/')) rel += '/';
  return rel;
}

export function validateBuiltProductImages(dist) {
  const problems = [];
  for (const file of htmlFiles(dist)) {
    const html = readFileSync(file, 'utf8');
    for (const problem of validateProductImageHtml(html)) {
      problems.push(`${pagePath(dist, file)}: ${problem}`);
    }
  }
  return problems;
}

function main() {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const dist = join(root, 'dist');
  if (!existsSync(dist)) {
    console.error('dist/ is missing. Run the site build before checking Product images.');
    process.exit(1);
  }
  const problems = validateBuiltProductImages(dist);
  if (problems.length) {
    console.error(`Product image check failed (${problems.length}):`);
    for (const problem of problems.slice(0, 40)) console.error(`- ${problem}`);
    if (problems.length > 40) console.error(`- …and ${problems.length - 40} more`);
    process.exit(1);
  }
  console.log('Product JSON-LD images are absolute and visible on the page.');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) main();
