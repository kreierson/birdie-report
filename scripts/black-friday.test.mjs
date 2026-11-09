import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BF_HUB_PATH, BF_HUB_PLACEMENT, BF_LISTING_VERIFIED, bfCategories, bfPicks, blackFridayStructuredData } from '../src/utils/black-friday.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const blogDirectory = join(root, 'src/content/blog');
const PRODUCT_PATH = /\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})(?![A-Z0-9])/i;
const STOCK_TEXT = /only \d+ left|in stock|out of stock/i;

function read(path) {
  return readFileSync(join(root, path), 'utf8');
}

function blogSlug(href) {
  return href.match(/^\/blog\/([a-z0-9-]+)\/$/)?.[1] ?? null;
}

test('black friday hub CTAs use the dedicated affiliate placement', () => {
  assert.equal(BF_HUB_PLACEMENT, 'bf_hub');
  assert.equal(BF_HUB_PATH, '/deals/black-friday-golf-deals/');
  assert.equal(BF_HUB_PATH.includes('2026'), false);
  const component = read('src/components/BlackFridayCta.astro');
  assert.match(component, /rel="nofollow sponsored noopener"/);
  assert.match(component, /data-affiliate-link="true"/);
  assert.match(component, /data-placement=\{BF_HUB_PLACEMENT\}/);
  assert.match(component, /normalizeAffiliateUrl/);
  assert.match(component, /isDirectAmazonProductUrl/);
  assert.match(component, /Check current Black Friday price on Amazon/);
  assert.match(component, /category:\s*'deals'/);
  assert.doesNotMatch(component, /<script/);
});

test('the hub page is evergreen, has 2026 in the title, and renders every pick through the CTA', () => {
  const page = read('src/pages/deals/black-friday-golf-deals.astro');
  assert.match(page, /<h1[^>]*>Black Friday Golf Deals 2026<\/h1>/);
  assert.match(page, /title = 'Black Friday Golf Deals 2026 \| The Birdie Report'/);
  assert.match(page, /<BlackFridayCta product=\{pick\.product\} url=\{pick\.url\} \/>/);
  assert.equal(page.includes('amazon.com'), false);
  assert.doesNotMatch(page, /@type":\s*"Offer"|priceCurrency/);
  assert.match(page, /blackFridayStructuredData/);
});

test('every pick links to a real guide and a direct verified product URL', () => {
  const registry = JSON.parse(read('data/verified-asins.json'));
  const verified = new Set(registry.asins.map((entry) => entry.asin.toUpperCase()));
  const slugs = new Set(
    readdirSync(blogDirectory)
      .filter((name) => name.endsWith('.mdx') || name.endsWith('.md'))
      .map((name) => name.replace(/\.mdx?$/, ''))
  );
  const picks = bfPicks();
  assert.ok(picks.length >= 20 && picks.length <= 30, `expected 20-30 picks, got ${picks.length}`);

  const products = new Set();
  const direct = [];
  const requiredCategories = [
    'drivers',
    'irons',
    'putters',
    'balls',
    'rangefinders',
    'carts-bags',
    'shoes',
    'apparel',
    'training-aids',
    'gifts-stocking',
    'gifts-beyond-stocking',
  ];
  assert.deepEqual(bfCategories.map((category) => category.id), requiredCategories);

  for (const pick of picks) {
    assert.equal(products.has(pick.product), false, pick.product);
    products.add(pick.product);
    if (pick.availability === 'unavailable') {
      assert.equal(pick.url, undefined, pick.product);
      assert.equal(pick.listingVerified, BF_LISTING_VERIFIED, pick.product);
    } else {
      assert.equal(pick.availability, 'listed', pick.product);
      assert.match(pick.url, /^https:\/\/www\.amazon\.com\/dp\/[A-Z0-9]{10}\?tag=birdiereport-20$/, pick.product);
      const asin = pick.url.match(PRODUCT_PATH)?.[1];
      assert.ok(asin, pick.product);
      assert.equal(asin.toUpperCase(), pick.sourceAsin, pick.product);
      assert.ok(verified.has(asin.toUpperCase()), `${pick.product} ${asin}`);
      direct.push(`${pick.product} ${asin.toUpperCase()}`);
    }
    const slug = blogSlug(pick.guideHref);
    assert.ok(slug, pick.product);
    assert.equal(slugs.has(slug), true, pick.guideHref);
    const source = readFileSync(join(blogDirectory, `${slug}.mdx`), 'utf8');
    assert.doesNotMatch(source, /^category:\s*deals$/m, pick.guideHref);
    for (const extra of pick.also || []) {
      const extraSlug = blogSlug(extra.href);
      assert.ok(extraSlug, extra.href);
      assert.equal(slugs.has(extraSlug), true, extra.href);
      const extraSource = readFileSync(join(blogDirectory, `${extraSlug}.mdx`), 'utf8');
      assert.doesNotMatch(extraSource, /^category:\s*deals$/m, extra.href);
    }
  }

  const expected = new Map([
    ['Blue Tees Series 3 Max+', 'B09DLJ37TW'],
    ['Bushnell Tour Hybrid', 'B0DWNKD682'],
    ['Callaway Coronado V3', 'B0BLTYZM75'],
    ['Callaway Elyte Iron Set', 'B0DHWGV745'],
    ['Callaway Elyte Max Fast Driver', 'B0DHWGSGWF'],
    ['EyeLine Golf Putting Mirror', 'B0030F4JHM'],
    ['FootJoy Pro/SL', 'B0FFF14RMN'],
    ['FootJoy StaSof', 'B0B9Q9BR6S'],
    ['Gogogo Sport Vpro GS24', 'B07PX9YR31'],
    ['Nike Dri-FIT Tour Polo', 'B0F7PSL7GW'],
    ['Orange Whip Trainer', 'B07HXTFD8D'],
    ['TaylorMade Cart Lite', 'B0DJ3HNGMK'],
    ['TaylorMade Stealth 2 Plus+ 8.0', 'B0F1BHSGN4'],
    ['Tifosi Seek FC 2.0', 'B0BQCMHCY4'],
    ['Titleist Cart 14', 'B0FKCT6B4K'],
    ['Titleist Pro V1 Golf Balls, 1 Count', 'B0DPN71RTJ'],
    ['Tour Striker Smart Ball', 'B00II5RSR2'],
    ['Wilson Dynapower Irons', 'B0BT26B16M'],
    ['Wilson Infinite Buckingham', 'B0CPT8TN5C'],
    ['adidas Tour360 24', 'B0C67FF37F'],
  ]);
  assert.equal(picks.length, expected.size);
  for (const [product, asin] of expected) {
    const pick = picks.find((item) => item.product === product);
    assert.ok(pick, product);
    if (pick.availability === 'unavailable') {
      assert.equal(pick.url, undefined, product);
      continue;
    }
    assert.equal(direct.includes(`${product} ${asin}`), true, product);
  }
  assert.equal(direct.length, picks.filter((pick) => pick.availability !== 'unavailable').length);
  assert.equal(picks.some((pick) => /amazon\.com\/s\?/.test(pick.url || '')), false);
});

test('an unavailable pick needs no price, stock line, or buy link', () => {
  const fixture = {
    product: 'Fixture gone club',
    availability: 'unavailable',
    listingVerified: BF_LISTING_VERIFIED,
    variant: 'Right hand.',
    note: 'Gone from our list.',
  };
  assert.equal(fixture.availability, 'unavailable');
  assert.equal(fixture.url, undefined);
  assert.equal(fixture.price, undefined);
  assert.equal(fixture.stock, undefined);
  assert.equal(fixture.seller, undefined);
  assert.equal(fixture.listingVerified, 'Listing verified November 9, 2026');
  assert.doesNotMatch(`${fixture.note} ${fixture.variant}`, STOCK_TEXT);
});

test('structured data lists the guides and does not mark up a price', () => {
  const data = blackFridayStructuredData({
    title: 'Black Friday Golf Deals 2026 | The Birdie Report',
    description: 'Gear Birdie Report already reviews.',
  });
  const visit = (value) => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!value || typeof value !== 'object') return;
    assert.notEqual(value['@type'], 'Offer');
    assert.equal('price' in value, false);
    assert.equal('priceCurrency' in value, false);
    assert.equal('offers' in value, false);
    Object.values(value).forEach(visit);
  };
  visit(data);
  assert.equal(JSON.stringify(data).includes('amazon.com'), false);
  const graph = data['@graph'];
  const list = graph.find((node) => node['@type'] === 'ItemList');
  assert.equal(graph.some((node) => node['@type'] === 'BreadcrumbList'), false);
  assert.match(read('src/pages/deals/black-friday-golf-deals.astro'), /<Breadcrumbs /);
  assert.equal(list.numberOfItems, bfPicks().length);
  assert.equal(list.itemListElement.length, bfPicks().length);
  assert.equal(list.itemListElement[0].name, bfPicks()[0].product);
  assert.match(list.itemListElement[0].url, /^https:\/\/www\.birdiereport\.com\/blog\//);
});

test('hub copy verifies the listing and does not state a price or a stock count', () => {
  const catalog = read('src/components/black-friday-hub.mjs');
  const page = read('src/pages/deals/black-friday-golf-deals.astro');
  const cta = read('src/components/BlackFridayCta.astro');
  const copy = `${catalog}\n${page}\n${cta}`;
  const visible = copy.replace(/\$\{[^}]*\}/g, '');
  assert.equal(visible.includes('$'), false);
  assert.doesNotMatch(copy, STOCK_TEXT);
  assert.doesNotMatch(copy, /\d+\s*%/);
  assert.doesNotMatch(copy, /lowest price|limited time|doorbuster|price drop|historical low|was \$|sold by|see options/i);
  assert.match(page, /\{pick\.listingVerified\}/);
  assert.match(page, /data-listing-verified/);
  assert.doesNotMatch(page, /setInterval|Date\.now\(/);
  const unavailable = page.slice(page.indexOf("pick.availability === 'unavailable'"), page.indexOf('<BlackFridayCta'));
  assert.match(unavailable, />Unavailable</);
  assert.match(unavailable, /Gone\. This listing was not available to buy when we checked it\./);
  assert.match(unavailable, /data-listing-unavailable/);
  assert.match(unavailable, /\{pick\.listingVerified\}/);
  assert.doesNotMatch(unavailable, /BlackFridayCta|Only \d+ left/);
  const prov1 = bfPicks().find((pick) => pick.sourceAsin === 'B0DPN71RTJ');
  assert.equal(prov1.product, 'Titleist Pro V1 Golf Balls, 1 Count');
  assert.match(prov1.note, /not a dozen/);
  assert.match(prov1.note, /Unit Count 1 Count/);
  for (const category of bfCategories) {
    assert.equal(category.title.includes('$'), false, category.id);
  }
  for (const pick of bfPicks()) {
    assert.equal(pick.listingVerified, BF_LISTING_VERIFIED, pick.product);
    assert.equal('price' in pick, false, pick.product);
    assert.equal('priceChecked' in pick, false, pick.product);
    assert.equal('seller' in pick, false, pick.product);
    assert.equal('stock' in pick, false, pick.product);
    assert.ok(pick.variant, pick.product);
    if (pick.availability === 'unavailable') continue;
    assert.equal(pick.availability, 'listed', pick.product);
    assert.match(pick.sourceAsin, /^[A-Z0-9]{10}$/, pick.product);
  }
});

test('the deals index, homepage, gift guide, and six best-of guides link the hub', () => {
  const sources = [
    'src/pages/deals/index.astro',
    'src/pages/index.astro',
    'src/content/blog/best-golf-gifts.mdx',
    'src/content/blog/best-putters-high-handicappers-2026.mdx',
    'src/content/blog/best-golf-sunglasses-2026.mdx',
    'src/content/blog/best-drivers-seniors-2026.mdx',
    'src/content/blog/best-golf-shoes-2026.mdx',
    'src/content/blog/best-irons-high-handicappers-2026.mdx',
    'src/content/blog/best-putters-2026.mdx',
  ];
  for (const path of sources) {
    assert.match(read(path), /\/deals\/black-friday-golf-deals\//, path);
  }
});

test('the hub does not link dated deal posts, and the sitemap does not exclude it', () => {
  const hub = `${read('src/components/black-friday-hub.mjs')}\n${read('src/pages/deals/black-friday-golf-deals.astro')}`;
  const hrefs = [...hub.matchAll(/\/blog\/([a-z0-9-]+)\//g)].map((match) => match[1]);
  assert.ok(hrefs.length > 0);
  for (const slug of new Set(hrefs)) {
    const source = readFileSync(join(blogDirectory, `${slug}.mdx`), 'utf8');
    assert.doesNotMatch(source, /^category:\s*deals$/m, slug);
    assert.doesNotMatch(slug, /deal/);
  }
  const config = read('astro.config.mjs');
  assert.match(config, /sitemap\(/);
  assert.match(config, /!new URL\(page\)\.pathname\.startsWith\('\/tags\/'\)/);
  assert.equal(existsSync(join(root, 'src/pages/deals/black-friday-golf-deals.astro')), true);
});
