import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { buildStructuredData, jsonLd, parseUsdPrice } from '../src/utils/review-schema.mjs';

const site = 'https://www.birdiereport.com';

function graphFor(input) {
  return buildStructuredData({ site, author: 'Kyle Reierson', pathname: '/blog/example/', ...input });
}

function types(node, found = []) {
  if (!node || typeof node !== 'object') return found;
  if (Array.isArray(node)) {
    node.forEach((entry) => types(entry, found));
    return found;
  }
  if (node['@type']) found.push(node['@type']);
  Object.values(node).forEach((entry) => types(entry, found));
  return found;
}

function reviewsIn(node, found = []) {
  if (!node || typeof node !== 'object') return found;
  if (Array.isArray(node)) {
    node.forEach((entry) => reviewsIn(entry, found));
    return found;
  }
  if (node['@type'] === 'Review') found.push(node);
  Object.values(node).forEach((entry) => reviewsIn(entry, found));
  return found;
}

test('dollar amounts parse only when the whole field is one price', () => {
  assert.equal(parseUsdPrice('$1,505'), 1505);
  assert.equal(parseUsdPrice('$129.99'), 129.99);
  assert.equal(parseUsdPrice('$449'), 449);
  for (const value of ['$9.95 sale', '$675+', '$100-$175', '$1,099 (steel) / $1,199 (graphite)', 'Check current price', '$50/dozen', '$14.99+', 'From $52.38', '$0', '', null]) {
    assert.equal(parseUsdPrice(value), null, String(value));
  }
});

test('a rated review becomes one Product review on a 10-point scale', () => {
  const graph = graphFor({
    title: 'adidas Codechaos 25 Review: The Loud Spikeless Shoe',
    description: 'A research-based review of the adidas Codechaos 25.',
    date: '2026-06-13',
    category: 'reviews',
    rating: 8.9,
    price: '$160 MSRP; recent sale checks saw $80-$104',
    pros: ['Lightstrike cushioning', 'Waterproof build'],
    cons: ['Loud styling'],
    affiliateLinks: [{ product: 'adidas Codechaos 25 Spikeless Golf Shoes' }],
    featuredImage: '/images/articles/golfer-walking-course.jpg',
    pathname: '/blog/adidas-codechaos-25-review/',
  });
  const [article, product] = graph['@graph'];
  assert.equal(article['@type'], 'Article');
  assert.equal(article.author['@type'], 'Person');
  assert.equal(article.author.name, 'Kyle Reierson');
  assert.equal(article.datePublished, '2026-06-13T00:00:00.000Z');
  assert.equal(product['@type'], 'Product');
  assert.equal(product.name, 'adidas Codechaos 25 Spikeless Golf Shoes');
  assert.equal(product.offers, undefined);
  assert.equal(product.review['@type'], 'Review');
  assert.equal(product.review.itemReviewed, undefined);
  assert.equal(product.review.author['@type'], 'Person');
  assert.equal(product.review.reviewRating.ratingValue, 8.9);
  assert.equal(product.review.reviewRating.bestRating, 10);
  assert.equal(product.review.reviewRating.worstRating, 1);
  assert.equal(product.review.positiveNotes.itemListElement.length, 2);
  assert.equal(product.review.negativeNotes.itemListElement[0].name, 'Loud styling');
  assert.equal(types(graph).includes('AggregateRating'), false);
  assert.equal(JSON.stringify(graph).includes('aggregateRating'), false);
  assert.equal(JSON.stringify(graph).includes('reviewCount'), false);
});

test('one comparison product keeps the visible verdict fields and a single offer price', () => {
  const graph = graphFor({
    title: 'Cleveland CBX4 ZipCore Wedge Review',
    description: 'Forgiveness and spin.',
    date: '2026-05-29',
    category: 'reviews',
    rating: 9.2,
    price: '$129.99',
    pros: ['Cavity-back help', 'Credible short-game tech'],
    cons: ['Not a players wedge'],
    comparisonProducts: [{
      name: 'Cleveland CBX4 ZipCore',
      rating: 9.2,
      price: '$99.99',
      pros: ['Different list that is not the verdict'],
      cons: ['Different con'],
    }],
  });
  const product = graph['@graph'][1];
  assert.equal(product['@type'], 'Product');
  assert.equal(product.name, 'Cleveland CBX4 ZipCore');
  assert.equal(product.offers.price, 129.99);
  assert.equal(product.offers.priceCurrency, 'USD');
  assert.equal(product.offers.url, undefined);
  assert.equal(product.offers.availability, undefined);
  assert.equal(product.review.positiveNotes.itemListElement[0].name, 'Cavity-back help');
  assert.equal(product.aggregateRating, undefined);
});

test('best-of and versus guides become an ItemList of reviewed products', () => {
  const graph = graphFor({
    title: 'Best Golf Bags 2026',
    description: 'Stand, cart, and carry bags.',
    date: '2026-03-16',
    category: 'best',
    rating: 9.2,
    pros: ['This rating describes the guide, not one bag'],
    comparisonProducts: [
      { name: 'Titleist Players 4 StaDry', rating: 9.4, price: '$295', pros: ['Waterproof', 'Light'], cons: ['Pricey'] },
      { name: 'Ping Hoofer Lite', rating: 9.3, price: '$649.99 (42mm) / $699.99 (47mm)', pros: ['Light'], cons: [] },
    ],
    pathname: '/blog/best-golf-bags-2026/',
  });
  const list = graph['@graph'][1];
  assert.equal(list['@type'], 'ItemList');
  assert.equal(list.numberOfItems, 2);
  assert.deepEqual(list.itemListElement.map((entry) => entry.position), [1, 2]);
  assert.equal(list.itemListElement[0].item.name, 'Titleist Players 4 StaDry');
  assert.equal(list.itemListElement[0].item.review.reviewRating.ratingValue, 9.4);
  assert.equal(list.itemListElement[0].item.offers.price, 295);
  assert.equal(list.itemListElement[1].item.offers, undefined);
  assert.equal(list.itemListElement[1].item.review.positiveNotes, undefined);
  assert.equal(list.itemListElement[0].item.review.reviewBody, undefined);
  assert.equal(JSON.stringify(graph).includes('aggregateRating'), false);
});

test('guide, course, deal, and unrated pages do not invent a product review', () => {
  const guide = graphFor({
    title: 'Best Drivers 2026: Our Top Picks',
    description: 'Drivers for every budget.',
    date: '2026-03-15',
    category: 'best',
    rating: 9.2,
    pros: ['Extensive real-world testing', 'Clear performance data'],
    affiliateLinks: [{ product: 'TaylorMade Stealth 2 Plus Driver' }],
  });
  const course = graphFor({
    title: 'Is Pebble Beach Worth $675? An Honest Take',
    description: 'An honest review of Pebble Beach.',
    date: '2026-03-16',
    category: 'courses',
    rating: 9.5,
    price: '$675+',
    pros: ['Iconic setting', 'Conditioning'],
    cons: ['Green fee'],
  });
  const deal = graphFor({ title: 'August 19 deals', description: 'Checked today.', date: '2026-08-19', category: 'deals' });
  const tip = graphFor({
    title: 'Course management',
    description: 'A tip.',
    date: '2026-03-16',
    updated: '2026-10-12',
    category: 'tips',
    pathname: '/blog/course-management-tips/',
  });
  for (const graph of [guide, course, deal]) assert.equal(graph['@graph'].length, 1);
  assert.equal(tip['@graph'][0].datePublished, '2026-03-16T00:00:00.000Z');
  assert.equal(tip['@graph'][0].dateModified, '2026-10-12T00:00:00.000Z');
  assert.equal(tip['@graph'][0].mainEntityOfPage['@id'], 'https://www.birdiereport.com/blog/course-management-tips/');
});

test('a review without an author or with a single note does not invent either', () => {
  const noAuthor = buildStructuredData({
    site,
    pathname: '/blog/example/',
    title: 'Example Review',
    description: 'Desc',
    date: '2026-06-01',
    category: 'reviews',
    rating: 8,
    pros: ['One note'],
    affiliateLinks: [{ product: 'Example Club' }],
  });
  assert.equal(noAuthor['@graph'].length, 1);
  const oneNote = graphFor({
    title: 'Example Review',
    description: 'Desc',
    date: '2026-06-01',
    category: 'reviews',
    rating: 8,
    pros: ['Only one'],
    affiliateLinks: [{ product: 'Example Club' }],
  });
  assert.equal(oneNote['@graph'][1].review.positiveNotes, undefined);
  assert.equal(jsonLd({ danger: '</script><script>' }).includes('<'), false);
});

test('every published post gets schema.org review data only from fields it has', () => {
  const directory = fileURLToPath(new URL('../src/content/blog/', import.meta.url));
  const failures = [];
  for (const file of readdirSync(directory).filter((name) => name.endsWith('.mdx'))) {
    const source = readFileSync(join(directory, file), 'utf8');
    const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1];
    const data = parse(frontmatter);
    const slug = file.replace(/\.mdx$/, '');
    const graph = buildStructuredData({
      site,
      pathname: `/blog/${slug}/`,
      title: data.title,
      description: data.description,
      date: data.date,
      updated: data.updated,
      author: data.author || 'Kyle Reierson',
      featuredImage: data.featured_image,
      category: data.category,
      rating: data.rating,
      pros: data.pros,
      cons: data.cons,
      price: data.price,
      comparisonProducts: data.comparison_products,
      affiliateLinks: data.affiliate_links,
    });
    const serialized = JSON.stringify(graph);
    const article = graph['@graph'][0];
    const extra = graph['@graph'][1];
    const products = Array.isArray(data.comparison_products) ? data.comparison_products.filter((product) => product?.name) : [];
    if (article['@type'] !== 'Article' || article.headline !== data.title) failures.push(`${slug} article`);
    if (serialized.includes('aggregateRating') || serialized.includes('AggregateRating') || serialized.includes('reviewCount') || serialized.includes('ratingCount')) {
      failures.push(`${slug} fabricated aggregate`);
    }
    for (const review of reviewsIn(graph)) {
      if (review.author?.['@type'] !== 'Person' || !review.author.name) failures.push(`${slug} author`);
      if (review.itemReviewed) failures.push(`${slug} itemReviewed on nested review`);
      const rating = review.reviewRating;
      if (!rating || rating['@type'] !== 'Rating' || rating.bestRating !== 10 || rating.worstRating !== 1) failures.push(`${slug} scale`);
      if (typeof rating?.ratingValue !== 'number' || rating.ratingValue < 1 || rating.ratingValue > 10) failures.push(`${slug} rating`);
    }
    if (products.length >= 2) {
      if (extra?.['@type'] !== 'ItemList' || extra.numberOfItems !== products.length) failures.push(`${slug} itemlist`);
      extra?.itemListElement?.forEach((entry, index) => {
        if (entry.position !== index + 1 || entry.item?.['@type'] !== 'Product') failures.push(`${slug} list item ${index}`);
        const price = parseUsdPrice(products[index].price);
        if (price == null && entry.item?.offers) failures.push(`${slug} invented offer`);
        if (price != null && entry.item?.offers?.price !== price) failures.push(`${slug} offer mismatch`);
      });
    } else if (products.length === 1 || (data.category === 'reviews' && typeof data.rating === 'number')) {
      if (extra?.['@type'] !== 'Product') failures.push(`${slug} missing product`);
    } else if (extra) {
      failures.push(`${slug} unexpected ${extra['@type']}`);
    }
  }
  assert.deepEqual(failures, []);
});
