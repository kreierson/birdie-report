#!/usr/bin/env node
// Tell IndexNow (Bing, Yandex, and other participants) about canonical URLs.
// Dry-run unless --submit. API failures are logged and do not fail the process.

import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ARCHIVE_PAGE_SIZE, archiveHref } from '../src/utils/archive.mjs';
import { comparisonHref } from '../src/utils/comparisons.mjs';
import { normalizePath } from './validate-redirects.mjs';

export const HOST = 'www.birdiereport.com';
export const ORIGIN = `https://${HOST}`;
export const ENDPOINT = 'https://api.indexnow.org/indexnow';
export const BATCH_SIZE = 10000;
const KEY_RE = /^[A-Za-z0-9-]{8,128}$/;
const ROOT = fileURLToPath(new URL('../', import.meta.url));

export function unique(values) {
  return [...new Set(values)];
}

export function canonicalUrl(pathname) {
  const path = normalizePath(pathname.startsWith('/') ? pathname : `/${pathname}`);
  if (!path) throw new Error(`Not a canonical path: ${pathname}`);
  return `${ORIGIN}${path}`;
}

export function assertCanonical(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Only canonical HTTPS URLs on our host are allowed: ${url}`);
  }
  if (parsed.protocol !== 'https:' || parsed.hostname !== HOST || parsed.search || parsed.hash || !parsed.pathname.endsWith('/')) {
    throw new Error(`Only canonical HTTPS URLs on our host are allowed: ${url}`);
  }
  return url;
}

export function loadKey(root = ROOT) {
  const publicDir = join(root, 'public');
  const spec = readdirSync(publicDir)
    .filter((name) => name.endsWith('.txt'))
    .sort()
    .flatMap((name) => {
      const body = readFileSync(join(publicDir, name), 'utf8').trim();
      return KEY_RE.test(body) && name === `${body}.txt` ? [body] : [];
    });
  if (spec.length === 1) return spec[0];
  if (spec.length > 1) throw new Error('Multiple IndexNow key files found in public/');
  const fallback = join(publicDir, 'indexnow-key.txt');
  if (existsSync(fallback)) {
    const body = readFileSync(fallback, 'utf8').trim();
    if (KEY_RE.test(body)) return body;
  }
  throw new Error('IndexNow key file not found');
}

export function keyLocation(key) {
  return `${ORIGIN}/${key}.txt`;
}

export function buildPayload(urls, key) {
  const urlList = unique(urls);
  if (urlList.length < 1 || urlList.length > BATCH_SIZE) throw new Error('Supply 1–10000 changed URLs');
  for (const url of urlList) assertCanonical(url);
  return { host: HOST, key, keyLocation: keyLocation(key), urlList };
}

export function chunk(items, size = BATCH_SIZE) {
  const batches = [];
  for (let index = 0; index < items.length; index += size) batches.push(items.slice(index, index + size));
  return batches;
}

function blogSlugs(root) {
  const directory = join(root, 'src/content/blog');
  if (!existsSync(directory)) return [];
  return readdirSync(directory)
    .filter((name) => name.endsWith('.md') || name.endsWith('.mdx'))
    .map((name) => name.replace(/\.mdx?$/, ''));
}

function versusCount(root) {
  const directory = join(root, 'src/content/blog');
  if (!existsSync(directory)) return 0;
  return readdirSync(directory).filter((name) => {
    if (!name.endsWith('.md') && !name.endsWith('.mdx')) return false;
    const source = readFileSync(join(directory, name), 'utf8');
    const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] || '';
    return /^category:\s*["']?versus["']?\s*$/m.test(frontmatter);
  }).length;
}

function pageUrls(count, hrefForPage) {
  const last = Math.max(1, Math.ceil(count / ARCHIVE_PAGE_SIZE));
  const urls = [];
  for (let page = 2; page <= last; page += 1) urls.push(canonicalUrl(hrefForPage(page)));
  return urls;
}

export function urlsForRepoPath(file, root = ROOT) {
  const path = file.replaceAll('\\', '/');
  const article = path.match(/^src\/content\/blog\/([^/]+)\.mdx?$/);
  if (article) return [canonicalUrl(`/blog/${article[1]}/`)];
  if (!path.startsWith('src/pages/') || !path.endsWith('.astro')) return [];
  if (path.startsWith('src/pages/tags/')) return [];
  if (path === 'src/pages/blog/[...slug].astro') return blogSlugs(root).map((slug) => canonicalUrl(`/blog/${slug}/`));
  if (path === 'src/pages/blog/page/[page].astro') return pageUrls(blogSlugs(root).length, archiveHref);
  if (path === 'src/pages/versus/page/[page].astro') return pageUrls(versusCount(root), comparisonHref);
  const route = path.slice('src/pages/'.length).replace(/\.astro$/, '').replace(/\/index$/, '');
  if (route.includes('[')) return [];
  return [canonicalUrl(route === 'index' ? '/' : `/${route}/`)];
}

function destinationPath(destination) {
  if (typeof destination !== 'string') return null;
  if (destination.startsWith('/')) return normalizePath(destination);
  try {
    const url = new URL(destination);
    if (url.protocol === 'https:' && (url.hostname === HOST || url.hostname === 'birdiereport.com')) return normalizePath(url.pathname);
  } catch {
    return null;
  }
  return null;
}

export function redirectPairs(rules) {
  const pairs = [];
  for (const rule of rules || []) {
    if (!rule?.permanent || !rule.source || !rule.destination || rule.has) continue;
    if (/[:*()]/.test(rule.source)) continue;
    const source = normalizePath(rule.source);
    const destination = destinationPath(rule.destination);
    if (!source || !destination) continue;
    pairs.push({ source: canonicalUrl(source), destination: canonicalUrl(destination) });
  }
  return pairs;
}

export function redirectUrls(rules) {
  return unique(redirectPairs(rules).flatMap((pair) => [pair.source, pair.destination]));
}

export function diffRedirectUrls(beforeRules, afterRules) {
  const before = new Set(redirectPairs(beforeRules).map((pair) => `${pair.source} ${pair.destination}`));
  return unique(redirectPairs(afterRules).flatMap((pair) => (
    before.has(`${pair.source} ${pair.destination}`) ? [] : [pair.source, pair.destination]
  )));
}

export function git(args, root = ROOT) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error((result.stderr || result.stdout || `git ${args.join(' ')} failed`).trim());
  return result.stdout;
}

export function changedRepoPaths(from, to, root = ROOT) {
  return git(['diff', '--name-status', '-M', from, to], root)
    .split('\n')
    .flatMap((line) => (line.trim() ? line.split('\t').slice(1) : []));
}

export function redirectsAt(ref, root = ROOT) {
  const text = ref ? git(['show', `${ref}:vercel.json`], root) : readFileSync(join(root, 'vercel.json'), 'utf8');
  return JSON.parse(text).redirects || [];
}

export function changedUrls(from, to, root = ROOT) {
  const paths = changedRepoPaths(from, to, root);
  const urls = paths.flatMap((file) => urlsForRepoPath(file, root));
  if (paths.includes('vercel.json')) urls.push(...diffRedirectUrls(redirectsAt(from, root), redirectsAt(to, root)));
  return unique(urls);
}

export function sitemapLocs(xml) {
  return [...String(xml).matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((match) => match[1].trim());
}

export function canonicalSitemapUrl(loc) {
  let url;
  try {
    url = new URL(loc);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || url.hostname !== HOST || url.pathname.startsWith('/tags/')) return null;
  return canonicalUrl(url.pathname);
}

function localSitemaps(root) {
  const directory = join(root, 'dist');
  if (!existsSync(directory)) return [];
  return readdirSync(directory)
    .filter((name) => /^sitemap-\d+\.xml$/.test(name))
    .sort()
    .map((name) => readFileSync(join(directory, name), 'utf8'));
}

async function fetchText(url, fetchImpl) {
  const response = await fetchImpl(url, { headers: { 'cache-control': 'no-cache' } });
  if (response.status !== 200) throw new Error(`Sitemap request returned ${response.status} for ${url}`);
  return response.text();
}

export async function sitemapUrls({ root = ROOT, fetchImpl = globalThis.fetch, sitemapXml } = {}) {
  const documents = sitemapXml ? [sitemapXml] : localSitemaps(root);
  if (!documents.length) {
    const index = await fetchText(`${ORIGIN}/sitemap-index.xml`, fetchImpl);
    const nested = sitemapLocs(index).filter((loc) => {
      try {
        return new URL(loc).hostname === HOST && /sitemap[^/]*\.xml$/i.test(new URL(loc).pathname);
      } catch {
        return false;
      }
    });
    if (!nested.length) documents.push(index);
    else for (const loc of nested) documents.push(await fetchText(loc, fetchImpl));
  }
  return unique(documents.flatMap((xml) => sitemapLocs(xml).map(canonicalSitemapUrl).filter(Boolean)));
}

export function formatDryRun({ mode, from, to, urls }) {
  const lines = [`mode: ${mode}`];
  if (from && to) lines.push(`refs: ${from}..${to}`);
  lines.push(`count: ${urls.length}`, ...urls);
  return lines.join('\n');
}

export async function submitBatches(urls, { key, fetchImpl = globalThis.fetch, endpoint = ENDPOINT, log = console.log, warn = console.error } = {}) {
  const results = [];
  for (const batch of chunk(unique(urls))) {
    const body = buildPayload(batch, key);
    try {
      const response = await fetchImpl(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json; charset=utf-8' },
        body: JSON.stringify(body),
      });
      const text = typeof response.text === 'function' ? await response.text() : '';
      log(`IndexNow ${response.status} (${batch.length} URLs)`);
      if (text) log(String(text).slice(0, 500));
      results.push({ status: response.status, count: batch.length });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      warn(`IndexNow request failed: ${message}`);
      results.push({ status: 0, count: batch.length, error: message });
    }
  }
  return results;
}

function responseHeader(response, name) {
  if (!response?.headers) return '';
  if (typeof response.headers.get === 'function') return response.headers.get(name) || '';
  return response.headers[name] || response.headers[name.toLowerCase()] || '';
}

export async function probe(url, fetchImpl, method) {
  const response = await fetchImpl(url, {
    method,
    redirect: 'manual',
    headers: { 'cache-control': 'no-cache', pragma: 'no-cache' },
  });
  const body = method === 'GET' && typeof response.text === 'function' ? await response.text() : '';
  const lastModified = Date.parse(responseHeader(response, 'last-modified'));
  return { status: response.status, body, etag: responseHeader(response, 'etag'), lastModified };
}

export function chooseSample(urls, redirectSources) {
  const source = urls.find((url) => redirectSources.has(url));
  const page = urls.find((url) => !redirectSources.has(url));
  const primary = page
    ? { url: page, expectation: 'page' }
    : source
      ? { url: source, expectation: 'redirect' }
      : null;
  if (!primary) return null;
  if (source && page) primary.alternate = { url: source, expectation: 'redirect' };
  return primary;
}

function statusMatches(status, expectation) {
  if (expectation === 'redirect') return status === 301 || status === 308;
  return status === 200;
}

function signalReady(sample, pageProbe, baseline, commitTime, requireChange) {
  if (!sample) return true;
  const pageOk = statusMatches(pageProbe?.status, sample.expectation);
  const fresh = Number.isFinite(commitTime) && Number.isFinite(pageProbe?.lastModified) && pageProbe.lastModified >= commitTime;
  const previous = baseline.get(sample.url);
  const changed = Boolean(previous && pageProbe && (pageProbe.etag !== previous.etag || pageProbe.status !== previous.status));
  if (pageProbe && !previous) baseline.set(sample.url, { etag: pageProbe.etag, status: pageProbe.status });
  return pageOk && (!requireChange || fresh || changed);
}

export async function waitForDeployment({
  key,
  sample,
  commitTime,
  requireChange = false,
  timeoutMs = 20 * 60 * 1000,
  intervalMs = 20 * 1000,
  fetchImpl = globalThis.fetch,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  now = Date.now,
  log = console.log,
}) {
  const deadline = now() + timeoutMs;
  const baseline = new Map();
  const samples = [sample, sample?.alternate].filter(Boolean);
  while (now() <= deadline) {
    let keyProbe = null;
    const probes = new Map();
    try {
      keyProbe = await probe(keyLocation(key), fetchImpl, 'GET');
      for (const item of samples) probes.set(item.url, await probe(item.url, fetchImpl, 'HEAD'));
    } catch (error) {
      log(`Waiting for production: ${error instanceof Error ? error.message : error}`);
    }
    const keyOk = keyProbe?.status === 200 && keyProbe.body.trim() === key;
    const ready = samples.length === 0 || samples.some((item) => signalReady(item, probes.get(item.url), baseline, commitTime, requireChange));
    if (keyOk && ready) {
      const watched = samples.map((item) => `${item.url} ${probes.get(item.url)?.status ?? 'unreachable'}`).join(', ');
      log(`Production is live (${keyLocation(key)}${watched ? `, ${watched}` : ''})`);
      return true;
    }
    const remaining = deadline - now();
    if (remaining <= 0) break;
    const watched = samples.map((item) => `${item.url} ${probes.get(item.url)?.status ?? 'unreachable'}`).join(', ');
    log(`Waiting for production (${keyOk ? 'key ok' : 'key not live'}${watched ? `, ${watched}` : ''})`);
    await sleep(Math.min(intervalMs, remaining));
  }
  log('Timed out waiting for the production deployment. Skipping IndexNow submission.');
  return false;
}

function blankRef(ref) {
  return !ref || /^0+$/.test(ref);
}

function parseArgs(argv) {
  const options = {
    mode: process.env.INDEXNOW_MODE || 'changed',
    from: process.env.INDEXNOW_FROM || '',
    to: process.env.INDEXNOW_TO || '',
    submit: false,
    wait: false,
    requireChange: false,
    timeoutSeconds: 1200,
    intervalSeconds: 20,
  };
  const args = [...argv];
  while (args.length) {
    const arg = args.shift();
    if (arg === '--dry-run') options.submit = false;
    else if (arg === '--submit') options.submit = true;
    else if (arg === '--wait') options.wait = true;
    else if (arg === '--require-change') options.requireChange = true;
    else if (arg === '--mode') options.mode = args.shift();
    else if (arg === '--from') options.from = args.shift() || '';
    else if (arg === '--to') options.to = args.shift() || '';
    else if (arg === '--timeout-seconds') options.timeoutSeconds = Number(args.shift());
    else if (arg === '--interval-seconds') options.intervalSeconds = Number(args.shift());
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!['changed', 'redirects', 'full'].includes(options.mode)) throw new Error(`Unknown mode: ${options.mode}`);
  return options;
}

export async function collectUrls(options, root = ROOT, fetchImpl = globalThis.fetch) {
  if (options.mode === 'full') return sitemapUrls({ root, fetchImpl });
  if (options.mode === 'redirects' && (blankRef(options.from) || blankRef(options.to))) return redirectUrls(redirectsAt(null, root));
  if (blankRef(options.from) || blankRef(options.to)) {
    if (options.mode === 'changed' && process.env.GITHUB_EVENT_NAME !== 'push') {
      return changedUrls('HEAD~1', 'HEAD', root);
    }
    return [];
  }
  if (options.mode === 'redirects') return diffRedirectUrls(redirectsAt(options.from, root), redirectsAt(options.to, root));
  return changedUrls(options.from, options.to, root);
}

function redirectSourceSet(options, root) {
  try {
    const ref = !blankRef(options.to) ? options.to : null;
    return new Set(redirectPairs(redirectsAt(ref, root)).map((pair) => pair.source));
  } catch {
    return new Set();
  }
}

export async function main(argv = process.argv.slice(2), root = ROOT, io = {}) {
  const log = io.log || console.log;
  const warn = io.warn || console.error;
  const fetchImpl = io.fetchImpl || globalThis.fetch;
  const options = parseArgs(argv);
  if ((options.mode === 'changed' || options.mode === 'redirects') && process.env.GITHUB_EVENT_NAME === 'push' && (blankRef(options.from) || blankRef(options.to))) {
    log('Push has no parent commit to compare. Nothing to submit.');
    return 0;
  }
  const urls = unique(await collectUrls(options, root, fetchImpl));
  log(formatDryRun({ mode: options.mode, from: options.from, to: options.to, urls }));
  if (!options.submit || urls.length === 0) return 0;
  const key = loadKey(root);
  if (options.wait) {
    const commitTime = !blankRef(options.to) ? Date.parse(git(['log', '-1', '--format=%cI', options.to], root).trim()) : NaN;
    const live = await waitForDeployment({
      key,
      sample: chooseSample(urls, redirectSourceSet(options, root)),
      commitTime,
      requireChange: options.requireChange,
      timeoutMs: options.timeoutSeconds * 1000,
      intervalMs: options.intervalSeconds * 1000,
      fetchImpl,
      log,
    });
    if (!live) return 0;
  }
  await submitBatches(urls, { key, fetchImpl, log, warn });
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().then((code) => process.exit(code ?? 0)).catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
