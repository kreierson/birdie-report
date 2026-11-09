import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  bestForLine,
  imageForBuyer,
  commercePriceLine,
  isAmazonCommerce,
  isSourcedNonAmazonPrice,
  priceCheckAccessibleName,
  priceCheckCta,
  productNamesMatch,
  storedPriceLine,
} from '../src/utils/product-buy.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));

test('price check CTAs name the retailer without inventing a direct-link claim', () => {
  assert.equal(priceCheckCta('Amazon'), 'Check current price on Amazon');
  assert.equal(priceCheckCta('amazon.com'), 'Check current price on Amazon');
  assert.equal(priceCheckCta(''), 'Check current price on Amazon');
  assert.equal(priceCheckCta('PGA Tour Superstore'), 'Check price at PGA Tour Superstore');
  assert.equal(
    priceCheckAccessibleName('Check current price on Amazon', 'Callaway Quantum Max Driver'),
    'Check current price on Amazon for Callaway Quantum Max Driver (opens in a new tab)',
  );
  assert.equal(isAmazonCommerce('Amazon', ''), true);
  assert.equal(isAmazonCommerce('PGA Tour Superstore', 'https://www.pgatoursuperstore.com/'), false);
  assert.equal(isAmazonCommerce('', 'https://www.amazon.com/dp/B0DPN71RTJ?tag=birdiereport-20'), true);
  assert.equal(commercePriceLine('$199.99 sale', 'Amazon', 'https://www.amazon.com/s?k=shoes&tag=birdiereport-20'), '');
  assert.equal(commercePriceLine('$325', 'FootJoy', 'https://www.footjoy.com/'), 'Approx. $325');
  assert.equal(isSourcedNonAmazonPrice('$89.95-$129.95 sale pricing on FootJoy\'s site when checked June 12, 2026'), true);
  assert.equal(isSourcedNonAmazonPrice('$199.99 sale'), false);
});

test('price lines use stored dollar amounts and never invent one', () => {
  assert.equal(storedPriceLine('$325'), 'Approx. $325');
  assert.equal(storedPriceLine('$1,199'), 'Approx. $1,199');
  assert.equal(storedPriceLine(''), '');
  assert.equal(storedPriceLine('Varies'), 'Check current price');
  assert.equal(storedPriceLine('Check current price'), 'Check current price');
  assert.equal(
    storedPriceLine('$89.95-$129.95 sale pricing on FootJoy\'s site when checked June 12, 2026'),
    '$89.95-$129.95 sale pricing on FootJoy\'s site when checked June 12, 2026',
  );
});

test('best-for copy comes from stored pros, why, or award text', () => {
  assert.equal(bestForLine({ pros: ['4-way stretch', 'Seam sealed'] }), '4-way stretch');
  assert.equal(bestForLine({ award: 'Best Overall', why: 'Still the gold standard' }), 'Still the gold standard');
  assert.equal(bestForLine({ award: 'Best for Stability' }), 'Stability');
  assert.equal(bestForLine({}), '');
});

test('catalog names match generic suffixes and not a different model', () => {
  assert.equal(productNamesMatch('FootJoy HydroTour', 'FootJoy HydroTour Rain Jacket'), true);
  assert.equal(productNamesMatch('Garmin Approach R10', 'Garmin Approach R10 Launch Monitor'), true);
  assert.equal(productNamesMatch('Titleist Pro V1', 'Titleist Pro V1x'), false);
  assert.equal(productNamesMatch('Ping G440', 'Ping G440 Max'), false);
});

test('buyer images reuse a named product photo and skip scenic heroes', () => {
  const product = imageForBuyer('Callaway Quantum Max Driver', {
    featuredImage: '/images/articles/callaway-quantum-max-driver-review.png',
    body: '![Callaway Quantum Max driver sole](/images/articles/callaway-quantum-max-driver-review.png)',
  }, []);
  assert.equal(product, '/images/articles/callaway-quantum-max-driver-review.png');

  const scenic = imageForBuyer('PING G440 Max Driver', {
    featuredImage: '/images/articles/tournament-golfer-swing.jpg',
    body: '![Golfer making a full driver swing](/images/articles/tournament-golfer-swing.jpg)',
    stockImages: ['/images/articles/tournament-golfer-swing.jpg'],
  }, []);
  assert.equal(scenic, '');

  const explicit = imageForBuyer('Any Product', { featuredImage: 'https://images.unsplash.com/photo-1' }, [], '/images/articles/stored-product.jpg');
  assert.equal(explicit, '/images/articles/stored-product.jpg');
  assert.equal(imageForBuyer('Any Product', {}, [], 'https://www.birdiereport.com/images/articles/stored-product.jpg'), '/images/articles/stored-product.jpg');
  assert.equal(imageForBuyer('Any Product', {}, [], 'javascript:alert(1)'), '');
});

test('the shared row keeps the analytics attributes and the gold CTA', () => {
  const row = readFileSync(join(root, 'src/components/ProductBuyRow.astro'), 'utf8');
  const card = readFileSync(join(root, 'src/components/ProductCard.astro'), 'utf8');
  assert.match(row, /data-affiliate-link="true"/);
  assert.match(row, /data-placement=\{placement\}/);
  assert.match(row, /bg-gold-500/);
  assert.match(row, /text-forest-900/);
  assert.match(row, /hover:bg-gold-400/);
  assert.match(row, /min-h-11/);
  assert.match(row, /Best for:/);
  assert.match(card, /data-placement="product-card"/);
  assert.match(card, /bg-gold-500/);
  assert.match(card, /priceCheckCta/);
});
