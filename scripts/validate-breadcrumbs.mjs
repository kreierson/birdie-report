import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = 'https://www.birdiereport.com';

// Section indexes and everything published under them. Home and the legal
// pages are not content trails, so they stay out of this list.
export const BREADCRUMB_ROOTS = [
  '/best/',
  '/reviews/',
  '/news/',
  '/tips/',
  '/deals/',
  '/courses/',
  '/versus/',
  '/opinion/',
  '/tools/',
  '/blog/',
  '/tags/',
];

export function requiresBreadcrumbs(pagePath) {
  return BREADCRUMB_ROOTS.some((root) => pagePath === root || pagePath.startsWith(root));
}

export function redirectPaths(redirects) {
  const paths = new Set();
  for (const rule of redirects || []) {
    if (!rule?.source || /[:*()]/.test(rule.source)) continue;
    const source = rule.source.startsWith('/') ? rule.source : `/${rule.source}`;
    paths.add(source.endsWith('/') ? source : `${source}/`);
  }
  return paths;
}

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

function stripTags(value) {
  return decodeHtml(value.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
}

function nodesFrom(value, out = []) {
  if (Array.isArray(value)) {
    value.forEach((entry) => nodesFrom(entry, out));
    return out;
  }
  if (!value || typeof value !== 'object') return out;
  if (value['@graph']) nodesFrom(value['@graph'], out);
  if (value['@type']) out.push(value);
  return out;
}

function isType(node, type) {
  const value = node?.['@type'];
  return value === type || (Array.isArray(value) && value.includes(type));
}

export function breadcrumbLists(html) {
  const scripts = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const lists = [];
  for (const script of scripts) {
    let parsed;
    try {
      parsed = JSON.parse(script[1]);
    } catch (error) {
      return { error: `JSON-LD is not parseable (${error.message})` };
    }
    for (const node of nodesFrom(parsed)) {
      if (isType(node, 'BreadcrumbList')) lists.push(node);
    }
  }
  return { lists };
}

export function canonicalHref(html) {
  for (const tag of html.matchAll(/<link\b[^>]*>/gi)) {
    if (!/\brel=["']canonical["']/.test(tag[0])) continue;
    const href = tag[0].match(/\bhref=["']([^"']+)["']/);
    return href ? decodeHtml(href[1]) : null;
  }
  return null;
}

function breadcrumbNav(html) {
  const navs = [...html.matchAll(/<nav\b[^>]*aria-label=["']Breadcrumb["'][^>]*>[\s\S]*?<\/nav>/gi)];
  return navs.map((match) => match[0]);
}

function pathnameOf(href) {
  const url = new URL(href, SITE);
  return url.pathname.endsWith('/') ? url.pathname : `${url.pathname}/`;
}

export function validateBreadcrumbPage(html, pagePath, { files, redirects }) {
  const problems = [];
  const parsed = breadcrumbLists(html);
  if (parsed.error) problems.push(parsed.error);
  const lists = parsed.lists || [];
  const navs = breadcrumbNav(html);
  const needed = requiresBreadcrumbs(pagePath);

  if (!needed && lists.length === 0 && navs.length === 0) return problems;
  if (lists.length !== 1) {
    problems.push(`expected one BreadcrumbList, found ${lists.length}`);
  }
  if (navs.length !== 1) {
    problems.push(`expected one breadcrumb nav, found ${navs.length}`);
  }
  if (lists.length !== 1 || navs.length !== 1) return problems;

  const list = lists[0];
  const items = list.itemListElement;
  if (!Array.isArray(items) || items.length < 2) {
    problems.push('BreadcrumbList needs at least Home and the current page');
    return problems;
  }

  items.forEach((item, index) => {
    const position = index + 1;
    if (!isType(item, 'ListItem')) problems.push(`item ${position} is not a ListItem`);
    if (item?.position !== position) problems.push(`item ${position} has position ${item?.position}`);
    if (typeof item?.name !== 'string' || item.name.trim() === '') {
      problems.push(`item ${position} is missing a name`);
    }
    if (typeof item?.item !== 'string' || !item.item.startsWith(`${SITE}/`)) {
      problems.push(`item ${position} is not an absolute ${SITE} URL`);
      return;
    }
    let url;
    try {
      url = new URL(item.item);
    } catch {
      problems.push(`item ${position} URL does not parse`);
      return;
    }
    if (url.origin !== SITE) problems.push(`item ${position} leaves ${SITE}`);
    if (!url.pathname.endsWith('/')) problems.push(`item ${position} is missing a trailing slash`);
    if (url.search || url.hash) problems.push(`item ${position} includes a query or hash`);
    if (files && !files.has(url.pathname)) problems.push(`item ${position} links to ${url.pathname}, which is not a built page`);
    if (redirects && redirects.has(url.pathname)) problems.push(`item ${position} links to redirect ${url.pathname}`);
  });

  const canonical = canonicalHref(html);
  const last = items.at(-1);
  if (!canonical) problems.push('page is missing a canonical URL');
  else if (last?.item !== canonical) {
    problems.push(`last breadcrumb ${last?.item} does not match canonical ${canonical}`);
  }

  const nav = navs[0];
  const anchors = [...nav.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)].map((match) => ({
    href: match[1].match(/\bhref=["']([^"']+)["']/)?.[1],
    name: stripTags(match[2]),
  }));
  if (anchors.length !== items.length - 1) {
    problems.push(`visible trail has ${anchors.length} links; JSON-LD has ${items.length} items`);
  }
  anchors.forEach((anchor, index) => {
    const item = items[index];
    if (!anchor.href) {
      problems.push(`visible crumb ${index + 1} is missing an href`);
      return;
    }
    if (item?.item && pathnameOf(anchor.href) !== pathnameOf(item.item)) {
      problems.push(`visible crumb ${index + 1} points at ${anchor.href}, not ${item.item}`);
    }
    if (item?.name && anchor.name !== item.name) {
      problems.push(`visible crumb ${index + 1} says "${anchor.name}", JSON-LD says "${item.name}"`);
    }
  });

  const current = [...nav.matchAll(/<li\b[^>]*aria-current=["']page["'][^>]*>([\s\S]*?)<\/li>/gi)];
  if (current.length !== 1) problems.push(`expected aria-current="page" on the last item, found ${current.length}`);
  else if (/<a\b/i.test(current[0][1])) problems.push('the current breadcrumb is a link');
  else {
    const label = [...current[0][1].matchAll(/<span\b(?![^>]*aria-hidden)[^>]*>([\s\S]*?)<\/span>/gi)]
      .map((match) => stripTags(match[1]))
      .filter(Boolean)
      .at(-1);
    if (label !== last?.name) problems.push(`current crumb says "${label}", JSON-LD says "${last?.name}"`);
  }
  if (!/<ol\b/i.test(nav)) problems.push('breadcrumb nav is missing an ordered list');

  return problems;
}

function pagePathFromFile(dist, file) {
  let rel = relative(dist, file).split(sep).join('/');
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html')) rel = rel.slice(0, -'index.html'.length);
  else if (rel.endsWith('.html')) rel = `/${rel.slice(0, -'.html'.length)}`;
  if (!rel.startsWith('/')) rel = `/${rel}`;
  if (!rel.endsWith('/')) rel += '/';
  return rel;
}

function htmlFiles(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) htmlFiles(path, out);
    else if (entry.endsWith('.html')) out.push(path);
  }
  return out;
}

export function validateBuiltBreadcrumbs(dist, { redirects } = {}) {
  const files = htmlFiles(dist);
  const pages = new Map(files.map((file) => [pagePathFromFile(dist, file), file]));
  const problems = [];
  for (const [pagePath, file] of pages) {
    const html = readFileSync(file, 'utf8');
    for (const problem of validateBreadcrumbPage(html, pagePath, { files: pages, redirects })) {
      problems.push(`${pagePath}: ${problem}`);
    }
  }
  for (const root of BREADCRUMB_ROOTS) {
    if (!pages.has(root)) problems.push(`${root}: section page was not built`);
  }
  return problems;
}

function main() {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const dist = join(root, 'dist');
  if (!existsSync(dist)) {
    console.error('dist/ is missing. Run the site build before checking breadcrumbs.');
    process.exit(1);
  }
  const config = JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8'));
  const problems = validateBuiltBreadcrumbs(dist, { redirects: redirectPaths(config.redirects) });
  if (problems.length) {
    console.error(`Breadcrumb check failed (${problems.length}):`);
    for (const problem of problems.slice(0, 40)) console.error(`- ${problem}`);
    if (problems.length > 40) console.error(`- …and ${problems.length - 40} more`);
    process.exit(1);
  }
  console.log('BreadcrumbList JSON-LD matches the visible trails.');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) main();
