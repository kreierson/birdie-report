import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { comparisonLinkErrors, comparisonObjectErrors, loadComparisonPages } from './comparison-links.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));

export function normalizePath(value) {
  if (typeof value !== 'string' || !value.startsWith('/')) return null;
  const path = value.split('?')[0].split('#')[0];
  if (!path || path.includes('://')) return null;
  return path.endsWith('/') ? path : `${path}/`;
}

export function lastSlug(value) {
  const path = normalizePath(value.startsWith('/') ? value : `/${value}`);
  if (!path) return '';
  return path.split('/').filter(Boolean).at(-1) || '';
}

export function retiredRedirects(redirects) {
  const paths = new Set();
  const slugs = new Map();
  for (const rule of redirects || []) {
    if (!rule?.source || !rule?.destination) continue;
    if (/[:*()]/.test(rule.source)) continue;
    const source = normalizePath(rule.source);
    const destination = normalizePath(rule.destination.startsWith('/') ? rule.destination : '');
    if (!source || !destination) continue;
    const sourceSlug = lastSlug(source);
    const destinationSlug = lastSlug(destination);
    if (!sourceSlug || sourceSlug === destinationSlug) continue;
    paths.add(source);
    paths.add(`/blog/${sourceSlug}/`);
    paths.add(`/${sourceSlug}/`);
    slugs.set(sourceSlug, destination);
  }
  return { paths, slugs };
}

function pathFromHref(raw) {
  if (typeof raw !== 'string') return null;
  if (raw.startsWith('/')) return normalizePath(raw);
  try {
    const url = new URL(raw);
    if (url.protocol === 'https:' && (url.hostname === 'www.birdiereport.com' || url.hostname === 'birdiereport.com')) {
      return normalizePath(url.pathname);
    }
  } catch {
    return null;
  }
  return null;
}

export function linkedPaths(source) {
  const found = new Set();
  const pattern = /(?:\]\(\s*|href\s*=\s*["'])([^"')\s]+)|\bhttps?:\/\/(?:www\.)?birdiereport\.com\/[^\s)"'<>]+/gi;
  for (const match of source.matchAll(pattern)) {
    const path = pathFromHref(match[1] || match[0]);
    if (path) found.add(path);
  }
  return found;
}

function walk(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

export function validateRedirectState({ redirects, docs, holds, files, blogSlugs }) {
  const errors = [];
  const { paths, slugs } = retiredRedirects(redirects);
  const holdSet = new Set(holds || []);
  const destinations = new Map();

  for (const rule of redirects || []) {
    if (!rule?.source || /[:*()]/.test(rule.source)) continue;
    const source = normalizePath(rule.source);
    const destination = normalizePath(rule.destination?.startsWith('/') ? rule.destination : '');
    if (!source || !destination?.startsWith('/blog/')) continue;
    destinations.set(source, destination);
    const destinationSlug = lastSlug(destination);
    if (slugs.has(destinationSlug)) {
      errors.push(`${source} redirects to ${destination}, which is itself redirected`);
    }
    if (holdSet.has(destinationSlug) && lastSlug(source) !== destinationSlug) {
      errors.push(`${source} redirects to hold page ${destinationSlug}`);
    }
    if (blogSlugs && !blogSlugs.has(destinationSlug)) {
      errors.push(`${source} redirects to missing article ${destinationSlug}`);
    }
  }

  for (const [slug] of slugs) {
    if (blogSlugs?.has(slug)) errors.push(`redirected slug still has content: ${slug}`);
  }

  for (const file of files || []) {
    for (const path of linkedPaths(file.source)) {
      if (paths.has(path)) errors.push(`${file.path} links to redirected URL ${path}`);
    }
  }

  const documented = new Set();
  for (const match of (docs || '').matchAll(/^\|\s*(\/[^|\s]+)\s*\|\s*(\/[^|\s]+)\s*\|\s*([^|]+)\|/gm)) {
    const source = normalizePath(match[1]);
    const destination = normalizePath(match[2]);
    const reason = match[3].trim();
    if (!source || !destination) continue;
    documented.add(source);
    if (reason.length < 40) errors.push(`redirect reason too short for ${source}`);
    if (destinations.get(source) && destinations.get(source) !== destination) {
      errors.push(`docs/redirects.md destination for ${source} does not match vercel.json`);
    }
    if (!destinations.has(source)) errors.push(`docs/redirects.md lists ${source}, which is not a vercel redirect`);
  }

  for (const source of destinations.keys()) {
    if (lastSlug(source) === lastSlug(destinations.get(source))) continue;
    if (!source.startsWith('/blog/')) continue;
    if (!documented.has(source)) errors.push(`missing page-level redirect reason for ${source}`);
  }

  return errors;
}

function blogSlugs(directory) {
  return new Set(
    readdirSync(directory)
      .filter((name) => ['.md', '.mdx'].includes(extname(name)))
      .map((name) => name.replace(/\.mdx?$/, ''))
  );
}

function main() {
  const vercel = JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8'));
  const holdsFile = join(root, 'data/consolidation-holds.json');
  const holds = existsSync(holdsFile) ? JSON.parse(readFileSync(holdsFile, 'utf8')).hold_slugs || [] : [];
  const docs = existsSync(join(root, 'docs/redirects.md')) ? readFileSync(join(root, 'docs/redirects.md'), 'utf8') : '';
  const files = walk(join(root, 'src'))
    .filter((path) => ['.astro', '.js', '.mjs', '.md', '.mdx', '.ts', '.tsx'].includes(extname(path)))
    .filter((path) => statSync(path).isFile())
    .map((path) => ({ path: relative(root, path), source: readFileSync(path, 'utf8') }));
  const blogDirectory = join(root, 'src/content/blog');
  const blogFiles = readdirSync(blogDirectory)
    .filter((name) => ['.md', '.mdx'].includes(extname(name)))
    .map((name) => ({
      slug: name.replace(/\.mdx?$/, ''),
      source: readFileSync(join(blogDirectory, name), 'utf8'),
    }));
  const pages = loadComparisonPages(blogFiles);
  const errors = validateRedirectState({
    redirects: vercel.redirects,
    docs,
    holds,
    files,
    blogSlugs: blogSlugs(blogDirectory),
  });
  for (const file of files) {
    for (const error of comparisonLinkErrors(file.source, pages)) errors.push(`${file.path}: ${error}`);
    for (const error of comparisonObjectErrors(file.source, pages)) errors.push(`${file.path}: ${error}`);
  }
  if (errors.length) {
    console.error('Redirect validation failed:');
    for (const error of [...new Set(errors)]) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log(`Redirect validation passed: ${retiredRedirects(vercel.redirects).slugs.size} retired slugs have no content and no internal links.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
