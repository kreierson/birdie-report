// Fails when built HTML shows a price or stock claim beside an Amazon link.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parse } from 'parse5';

const PRICE = /\$\s*\d/;
const STOCK = /\bin stock\b|\bout of stock\b|\bsold by\b|\bonly \d+ left\b|\bships from amazon\b/i;
const BLOCK = new Set(['li', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'figcaption', 'dt', 'dd', 'blockquote']);

function attr(node, name) {
  return node.attrs?.find((item) => item.name === name)?.value || '';
}

function textOf(node) {
  if (!node) return '';
  if (node.nodeName === '#text') return node.value || '';
  if (node.nodeName === 'script' || node.nodeName === 'style') return '';
  return (node.childNodes || []).map(textOf).join(' ');
}

function amazonAffiliate(node) {
  if (node.nodeName !== 'a') return false;
  const href = attr(node, 'href');
  if (!/amazon\.com/i.test(href)) return false;
  return /[?&]tag=birdiereport-20(?:&|$)/.test(href) || attr(node, 'data-affiliate-link') === 'true';
}

const INLINE = new Set(['a', 'span', 'strong', 'em', 'b', 'i', 'code', 'small', 'br', 'sup', 'sub']);

function inlineSiblings(anchor, parent) {
  const children = parent.childNodes || [];
  const index = children.indexOf(anchor);
  if (index < 0) return anchor;
  const inline = (node) => node.nodeName === '#text' || INLINE.has(node.nodeName);
  let start = index;
  let end = index;
  while (start > 0 && inline(children[start - 1])) start -= 1;
  while (end < children.length - 1 && inline(children[end + 1])) end += 1;
  return {
    nodeName: 'inline',
    childNodes: children.slice(start, end + 1),
  };
}

function proximityNode(anchor, parents) {
  const chain = [...parents, anchor];
  const item = [...chain].reverse().find((node) => node.nodeName === 'li');
  if (item) return item;
  const row = [...chain].reverse().find((node) => node.nodeName === 'tr');
  if (row) return row;
  const block = [...chain].reverse().find((node) => BLOCK.has(node.nodeName));
  if (block) return block;
  const parent = parents[parents.length - 1];
  if (!parent || parent.nodeName === 'body' || parent.nodeName === 'html' || parent.nodeName === '#document') return anchor;
  // A prose wrapper holds the whole article. A buy row does not.
  if (textOf(parent).replace(/\s+/g, ' ').trim().length > 500) return inlineSiblings(anchor, parent);
  return parent;
}

function walk(node, parents, hits) {
  if (amazonAffiliate(node)) {
    const container = proximityNode(node, parents);
    const text = textOf(container).replace(/\s+/g, ' ').trim();
    if (PRICE.test(text) || STOCK.test(text)) {
      hits.push({
        href: attr(node, 'href'),
        text: text.slice(0, 240),
      });
    }
  }
  const next = node.nodeName && node.nodeName !== '#text' && node.nodeName !== '#comment'
    ? [...parents, node]
    : parents;
  for (const child of node.childNodes || []) walk(child, next, hits);
  return hits;
}

function jsonNodes(value, found = []) {
  if (Array.isArray(value)) {
    value.forEach((item) => jsonNodes(item, found));
    return found;
  }
  if (!value || typeof value !== 'object') return found;
  found.push(value);
  for (const item of Object.values(value)) jsonNodes(item, found);
  return found;
}

function offerHits(html) {
  const hits = [];
  const scripts = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi) || [];
  for (const script of scripts) {
    const raw = script.replace(/^<script[^>]*>/i, '').replace(/<\/script>$/i, '').trim();
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      continue;
    }
    for (const node of jsonNodes(parsed)) {
      const type = node['@type'];
      const types = Array.isArray(type) ? type : [type];
      const offer = types.includes('Offer') || node.offers;
      const price = node.price ?? node.lowPrice ?? node.highPrice ?? node.priceSpecification?.price;
      const amount = typeof price === 'number' || typeof price === 'string' ? Number(price) : NaN;
      if (offer && price !== undefined && amount !== 0) {
        hits.push({ href: 'json-ld', text: `Offer price ${JSON.stringify(price).slice(0, 120)}` });
      }
    }
  }
  return hits;
}

export function findAmazonPriceHits(html) {
  const document = parse(String(html || ''));
  const hits = walk(document, [], []);
  const hasAmazonLink = /amazon\.com/i.test(html) && /tag=birdiereport-20|data-affiliate-link=["']true["']/i.test(html);
  if (hasAmazonLink) hits.push(...offerHits(html));
  return hits;
}

function walkHtml(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walkHtml(path, out);
    else if (name.endsWith('.html')) out.push(path);
  }
  return out;
}

export function scanBuiltHtml(distDir) {
  const problems = [];
  for (const file of walkHtml(distDir)) {
    const html = readFileSync(file, 'utf8');
    const hits = findAmazonPriceHits(html);
    for (const hit of hits) {
      problems.push(`${relative(distDir, file)}: ${hit.text}`);
    }
  }
  return problems;
}

const invoked = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invoked) {
  const dist = join(fileURLToPath(new URL('..', import.meta.url)), 'dist');
  if (!existsSync(dist)) {
    console.error('dist/ is missing. Run the site build before the Amazon price check.');
    process.exit(1);
  }
  const problems = scanBuiltHtml(dist);
  if (problems.length) {
    console.error(`Amazon price or stock text sits next to an affiliate link (${problems.length}):`);
    for (const problem of problems.slice(0, 40)) console.error(`- ${problem}`);
    process.exit(1);
  }
  console.log('Amazon affiliate HTML has no price or stock text beside those links.');
}
