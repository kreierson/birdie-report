import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { QUICK_PICKS_DISCLOSURE, QUICK_PICKS_PLACEMENT, resolveQuickPicks } from '../src/utils/quick-picks.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const blogDirectory = join(root, 'src/content/blog');
const PRODUCT_PATH = /\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})(?![A-Z0-9])/i;

const GUIDES = [
  'best-putters-high-handicappers-2026',
  'best-golf-sunglasses-2026',
  'best-drivers-seniors-2026',
  'best-golf-shoes-2026',
  'best-putters-2026',
  'best-irons-high-handicappers-2026',
  'best-golf-cart-bags-2026',
  'best-putters-mid-handicappers-2026',
  'best-golf-rain-jackets-2026',
  'best-golf-accessories-2026',
  'best-golf-balls-seniors-2026',
];

function read(path) {
  return readFileSync(join(root, path), 'utf8');
}

function article(slug) {
  const source = readFileSync(join(blogDirectory, `${slug}.mdx`), 'utf8');
  const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1];
  const stripped = source.replace(/\nquick_picks:[\s\S]*?\n---/, '\n---');
  return { source, data: parse(frontmatter), stripped };
}

function samplePicks(url = 'https://www.amazon.com/s?k=putter&tag=birdiereport-20') {
  return [
    { award: 'Best overall', product: 'One', why: 'Because one.', url, retailer: 'Amazon' },
    { award: 'Best value', product: 'Two', why: 'Because two.', url, retailer: 'Amazon' },
    { award: 'Best for rain', product: 'Three', why: 'Because three.', url, retailer: 'Amazon' },
  ];
}

const helpers = {
  normalizeAffiliateUrl: (link) => link.url,
  isDirectAmazonProductUrl: (url) => PRODUCT_PATH.test(url),
};

test('quick picks placement is distinct and the disclosure matches the existing shortlist', () => {
  assert.equal(QUICK_PICKS_PLACEMENT, 'quick_picks');
  const layout = read('src/layouts/BlogLayout.astro');
  const component = read('src/components/QuickPicks.astro');
  assert.ok(layout.includes(QUICK_PICKS_DISCLOSURE));
  assert.match(component, /rel="nofollow sponsored noopener"/);
  assert.match(component, /data-affiliate-link="true"/);
  assert.match(component, /data-placement=\{QUICK_PICKS_PLACEMENT\}/);
  assert.match(component, /Our top picks at a glance/);
  assert.match(component, /<ol/);
  assert.doesNotMatch(component, /<script/);
  assert.match(layout, /quickPicks\.length === 0/);
  assert.match(layout, /normalizeAffiliateUrl/);
  assert.match(layout, /<QuickPicks picks=\{quickPicks\}/);
  assert.match(read('src/content/config.ts'), /quick_picks:/);
});

test('resolver keeps 3 to 5 picks, retailer CTAs, and direct-link failures', () => {
  const resolved = resolveQuickPicks(samplePicks(), { category: 'best' }, helpers);
  assert.equal(resolved.length, 3);
  assert.equal(resolved[0].cta, 'See options on Amazon');
  assert.equal(resolved[0].direct, false);
  assert.equal(resolved[0].accessibleName, 'See options on Amazon for One (opens in a new tab)');

  const direct = resolveQuickPicks(samplePicks('https://www.amazon.com/dp/B0FKCT6B4K?tag=birdiereport-20'), {}, helpers);
  assert.equal(direct[0].cta, 'See this product on Amazon');
  assert.equal(direct[0].direct, true);
  assert.match(direct[0].accessibleName, /^See this product on Amazon for One /);

  assert.deepEqual(resolveQuickPicks(undefined, {}, helpers), []);
  assert.throws(() => resolveQuickPicks(samplePicks().slice(0, 2), {}, helpers), /3 to 5/);
  assert.throws(() => resolveQuickPicks([...samplePicks(), ...samplePicks()].slice(0, 6), {}, helpers), /3 to 5/);
  assert.throws(() => resolveQuickPicks(samplePicks('https://www.amazon.com/dp/B00NOTREAL'), {}, {
    normalizeAffiliateUrl: () => { throw new Error('ASIN B00NOTREAL is not in data/verified-asins.json'); },
    isDirectAmazonProductUrl: () => false,
  }), /B00NOTREAL/);
});

test('only the measured buying guides carry grounded quick picks', () => {
  const registry = JSON.parse(read('data/verified-asins.json'));
  const verified = new Set(registry.asins.map((entry) => entry.asin.toUpperCase()));
  const expected = new Set(GUIDES);
  const files = readdirSync(blogDirectory).filter((name) => name.endsWith('.mdx'));

  for (const file of files) {
    const slug = file.replace(/\.mdx$/, '');
    const source = readFileSync(join(blogDirectory, file), 'utf8');
    assert.equal(source.includes('\nquick_picks:'), expected.has(slug), slug);
  }

  for (const slug of GUIDES) {
    const { data, stripped } = article(slug);
    assert.equal(stripped.includes('\nquick_picks:'), false, slug);
    assert.ok(Array.isArray(data.quick_picks), slug);
    assert.ok(data.quick_picks.length >= 3 && data.quick_picks.length <= 5, slug);
    const resolved = resolveQuickPicks(data.quick_picks, { category: 'best', subcategory: data.subcategory }, helpers);
    for (const pick of resolved) {
      assert.equal(pick.retailer, 'Amazon', `${slug} ${pick.product}`);
      assert.ok(stripped.includes(pick.product), `${slug} missing product ${pick.product}`);
      // Summaries may paraphrase the research; copying body text can reintroduce stale prices.
      assert.doesNotMatch(pick.why, /\$\s*\d/, `${slug} quick-pick reason must not assert a price`);
      assert.ok(stripped.includes(pick.url), `${slug} url is not an existing article link: ${pick.url}`);
      const asin = pick.url.match(PRODUCT_PATH)?.[1];
      if (asin) assert.ok(verified.has(asin.toUpperCase()), `${slug} ${asin}`);
      else assert.equal(pick.direct, false, slug);
    }
  }
});
