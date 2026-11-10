import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findAmazonPriceHits, scanBuiltHtml } from './amazon-price-proximity.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));

test('a dollar amount beside an Amazon affiliate link fails', () => {
  const html = `
    <p>$199.99 sale <a href="https://www.amazon.com/s?k=shoes&tag=birdiereport-20">Check price</a></p>
    <p>Budget talk under $50 with no retailer link.</p>
  `;
  const hits = findAmazonPriceHits(html);
  assert.equal(hits.length, 1);
  assert.match(hits[0].text, /\$199\.99/);
});

test('the neutral Amazon CTA and a separate non-Amazon price pass', () => {
  const html = `
    <article>
      <p>FootJoy lists this at $185 on its own site.</p>
      <div>
        <a data-affiliate-link="true" data-placement="article-bottom-buy-box" href="https://www.amazon.com/dp/B0FFF14RMN?tag=birdiereport-20">Check current price on Amazon</a>
      </div>
      <p><a href="https://www.footjoy.com/pro-sl">$185 at FootJoy</a></p>
    </article>
  `;
  assert.deepEqual(findAmazonPriceHits(html), []);
});

test('a price in another paragraph of the same article does not count as next to the link', () => {
  const filler = 'Yardage notes stay in the article. '.repeat(20);
  const html = `
    <article><div>
      <p>Most drivers cost $599 before you look.</p>
      ${filler}
      <a href="https://www.amazon.com/s?k=driver&tag=birdiereport-20">Check current price on Amazon</a>
      <p>The fitting fee is $150.</p>
    </div></article>
  `;
  assert.deepEqual(findAmazonPriceHits(html), []);
});

test('a typed price in the same numbered product section fails', () => {
  const html = `
    <article>
      <h2>1. Scotty Cameron Super Select Newport 2</h2>
      <p><strong>Rating: 9.5/10 · Price: $429</strong></p>
      <p>The milling is why this blade stays the reference shape.</p>
      <p><a href="https://www.amazon.com/s?k=Scotty+Cameron+Super+Select+Newport+2&tag=birdiereport-20">Check price on Amazon</a></p>
      <h2>How to choose</h2>
      <p>Budget talk can mention a separate $200 lesson.</p>
    </article>
  `;
  const hits = findAmazonPriceHits(html);
  assert.equal(hits.length, 1);
  assert.match(hits[0].text, /\$429/);
});

test('a deal headline that already states its price stays on the block check', () => {
  const html = `
    <article>
      <h2>1. Bushnell Tour V6 Shift at $329.99</h2>
      <p>The listing is the reason this roundup exists.</p>
      <p><a href="https://www.amazon.com/s?k=Bushnell+Tour+V6&tag=birdiereport-20">Check price on Amazon</a></p>
    </article>
  `;
  assert.deepEqual(findAmazonPriceHits(html), []);
});

test('a price in the same table row as an Amazon link fails', () => {
  const html = `
    <table><tr><td>$599</td><td><a href="https://www.amazon.com/s?k=driver&tag=birdiereport-20">Check current price on Amazon</a></td></tr></table>
  `;
  assert.equal(findAmazonPriceHits(html).length, 1);
});

test('JSON-LD Offer prices fail on a page that links to Amazon', () => {
  const html = `
    <a href="https://www.amazon.com/dp/B0DPN71RTJ?tag=birdiereport-20">Check current price on Amazon</a>
    <script type="application/ld+json">{"@type":"Product","offers":{"@type":"Offer","price":"57.99","priceCurrency":"USD"}}</script>
  `;
  assert.ok(findAmazonPriceHits(html).some((hit) => hit.href === 'json-ld'));
});

test('the free tool offer is not judged from a page without an Amazon affiliate link', () => {
  const html = `<script type="application/ld+json">{"@type":"WebApplication","offers":{"@type":"Offer","price":"0","priceCurrency":"USD"}}</script>`;
  assert.deepEqual(findAmazonPriceHits(html), []);
});

test('built HTML keeps dollar amounts away from Amazon affiliate links', () => {
  const dist = join(root, 'dist');
  if (!existsSync(dist)) return;
  const problems = scanBuiltHtml(dist);
  assert.deepEqual(problems, []);
});
