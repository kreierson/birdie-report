import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GIFT_GUIDE_PLACEMENT } from '../src/utils/gift-guide.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const articlePath = join(root, 'src/content/blog/best-golf-gifts.mdx');
const blogDirectory = join(root, 'src/content/blog');
const PRODUCT_PATH = /\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})(?![A-Z0-9])/i;

function read(path) {
  return readFileSync(join(root, path), 'utf8');
}

test('gift guide CTAs use the dedicated affiliate placement', () => {
  assert.equal(GIFT_GUIDE_PLACEMENT, 'gift_guide');
  const component = read('src/components/GiftGuideCta.astro');
  assert.match(component, /rel="nofollow sponsored noopener"/);
  assert.match(component, /data-affiliate-link="true"/);
  assert.match(component, /data-placement=\{GIFT_GUIDE_PLACEMENT\}/);
  assert.match(component, /normalizeAffiliateUrl/);
  assert.match(component, /isDirectAmazonProductUrl/);
  assert.doesNotMatch(component, /<script/);
});

test('every gift pick links to a real page and a search or verified product URL', () => {
  const source = readFileSync(articlePath, 'utf8');
  const registry = JSON.parse(read('data/verified-asins.json'));
  const verified = new Set(registry.asins.map((entry) => entry.asin.toUpperCase()));
  const slugs = new Set(
    readdirSync(blogDirectory)
      .filter((name) => name.endsWith('.mdx'))
      .map((name) => name.replace(/\.mdx$/, ''))
  );

  assert.match(source, /^category:\s*best$/m);
  assert.match(source, /^review_basis:\s*"research-based"$/m);
  assert.doesNotMatch(source, /^quick_picks:/m);
  assert.doesNotMatch(source, /^evidence_ids:/m);
  assert.equal(source.includes('data-placement='), false);

  const picks = [...source.matchAll(/<GiftGuideCta\s+product="([^"]+)"\s+url="([^"]+)"\s*\/>/g)];
  assert.ok(picks.length >= 20 && picks.length <= 30, `expected 20-30 picks, got ${picks.length}`);

  const products = new Set();
  for (const [, product, url] of picks) {
    assert.equal(products.has(product), false, product);
    products.add(product);
    assert.match(url, /^https:\/\/www\.amazon\.com\//, product);
    assert.match(url, /[?&]tag=birdiereport-20(?:&|$)/, product);
    const asin = url.match(PRODUCT_PATH)?.[1];
    if (asin) {
      assert.ok(verified.has(asin.toUpperCase()), `${product} ${asin}`);
    } else {
      assert.match(url, /amazon\.com\/s\?/, product);
    }
  }

  const internal = [...source.matchAll(/\]\(\/blog\/([a-z0-9-]+)\/\)/g)].map((match) => match[1]);
  assert.ok(internal.length >= picks.length);
  const sections = source.split(/<GiftGuideCta/);
  for (let index = 1; index < sections.length; index += 1) {
    const block = sections[index - 1].split('### ').pop();
    assert.match(block, /\]\(\/blog\/[a-z0-9-]+\/\)/, `pick ${index} is missing an internal link`);
  }
  for (const slug of internal) {
    assert.equal(slugs.has(slug), true, slug);
    assert.equal(existsSync(join(blogDirectory, `${slug}.mdx`)), true, slug);
  }
});
