const SITE = 'https://www.birdiereport.com';
const BUYER_CATEGORIES = new Set(['best', 'reviews', 'deals', 'versus']);

export function parseUsdPrice(value) {
  if (typeof value !== 'string') return null;
  const match = value.trim().match(/^\$?(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{2}))?$/);
  if (!match) return null;
  const amount = Number(`${match[1].replaceAll(',', '')}${match[2] ? `.${match[2]}` : ''}`);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return amount;
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function list(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => typeof item === 'string' && item.trim()).map((item) => item.trim());
}

function isRating(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 1 && value <= 10;
}

function toIso(value) {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function absolute(site, value) {
  if (!hasText(value)) return undefined;
  try {
    return new URL(value, site).toString();
  } catch {
    return undefined;
  }
}

// Reused scenic files (golfer walking, flag, bag) are not product photos.
// Real product shots on this site are reused at most a handful of times.
export const STOCK_IMAGE_MIN_POSTS = 8;

const NON_PRODUCT_HOST = /(^|\.)((unsplash|pexels)\.com|youtube\.com|ytimg\.com)$/i;

const GENERIC_IMAGE_WORD = new Set([
  'golf', 'golfer', 'golfers', 'review', 'reviews', 'best', 'versus', 'comparison',
  'the', 'and', 'for', 'with', 'from', 'that', 'this', 'your', 'our',
  'driver', 'drivers', 'iron', 'irons', 'wedge', 'wedges', 'putter', 'putters',
  'ball', 'balls', 'bag', 'bags', 'shoe', 'shoes', 'glove', 'gloves', 'watch', 'watches',
  'rangefinder', 'rangefinders', 'hybrid', 'hybrids', 'fairway', 'wood', 'woods',
  'set', 'sets', 'mens', 'men', 'womens', 'women', 'new', 'left', 'right', 'hand',
  'steel', 'graphite', 'image', 'images', 'photo', 'photos', 'picture', 'official',
  'product', 'products', 'club', 'clubs', 'premium', 'edition', 'standard',
  'black', 'white', 'navy', 'red', 'blue', 'green', 'senior', 'seniors', 'ladies',
  'sale', 'current', 'price', 'head', 'heads', 'model', 'models', 'shaft', 'grip',
  'www', 'com', 'jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'html',
  'spikeless', 'spiked', 'limited', 'waterproof', 'stand', 'cart', 'carry',
]);

// Model words that distinguish one head, ball, or shoe from the next.
const MODEL_QUALIFIER = new Set([
  'max', 'mini', 'lite', 'lst', 'ls', 'ltd', 'pro', 'tour', 'fast', 'raw',
  'td', 'sl', 'slx', 'sft', 'plus', 'soft', 'x', 'k', 'd', 'rx', 'one', 'ai',
  'db', 'hl',
]);

export function stockImageUrls(urls) {
  const counts = new Map();
  for (const url of urls) {
    if (typeof url !== 'string' || !url.trim()) continue;
    const key = url.trim();
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts].filter(([, count]) => count >= STOCK_IMAGE_MIN_POSTS).map(([url]) => url);
}

export function absoluteImageUrl(site, value) {
  if (!hasText(value)) return undefined;
  try {
    const url = new URL(value.trim(), site || SITE);
    if (url.protocol !== 'https:') return undefined;
    return url.href;
  } catch {
    return undefined;
  }
}

export function isNonProductImageHost(hostname) {
  return NON_PRODUCT_HOST.test(hostname || '');
}

function rawImageTokens(value) {
  return value.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token && !GENERIC_IMAGE_WORD.has(token));
}

function requiredImageTokens(name) {
  const parts = rawImageTokens(name);
  const picked = [];
  parts.forEach((token, index) => {
    const digit = /\d/.test(token);
    const qualifier = MODEL_QUALIFIER.has(token);
    const headWord = index < 4 && token.length >= 4 && !digit && !qualifier;
    if (digit || qualifier || headWord) picked.push(token);
  });
  return [...new Set(picked)];
}

function imageTokenIdentity(tokens) {
  if (tokens.some((token) => /\d/.test(token) || token.length >= 5)) return true;
  return tokens.filter((token) => MODEL_QUALIFIER.has(token) || token.length >= 4).length >= 2;
}

function imageTokenSets(name) {
  const tokens = requiredImageTokens(name);
  if (!imageTokenIdentity(tokens)) return [];
  const sets = [tokens];
  const [brand, ...rest] = tokens;
  if (
    rest.length >= 2
    && brand
    && !/\d/.test(brand)
    && !MODEL_QUALIFIER.has(brand)
    && brand.length >= 4
    && imageTokenIdentity(rest)
  ) {
    sets.push(rest);
  }
  return sets;
}

function imageBlob(image) {
  const path = image.url.split('?')[0];
  let decoded = path;
  try {
    decoded = decodeURIComponent(path);
  } catch {
    decoded = path;
  }
  const text = `${decoded} ${image.alts.join(' ')}`.toLowerCase();
  return ` ${text.replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim()} `;
}

function imageBlocked(image, stock) {
  if (image.alts.some((alt) => /\bcontext\b/i.test(alt))) return true;
  if (stock.has(image.url.trim())) return true;
  try {
    if (isNonProductImageHost(new URL(image.url, SITE).hostname)) return true;
  } catch {
    return true;
  }
  return false;
}

function tokenCounts(blob) {
  const counts = new Map();
  for (const token of blob.trim().split(/\s+/).filter(Boolean)) {
    counts.set(token, (counts.get(token) || 0) + 1);
  }
  return counts;
}

function coversTokens(counts, tokens) {
  return tokens.every((token) => (counts.get(token) || 0) > 0);
}

function modelTokens(name, tokens) {
  const brand = rawImageTokens(name)[0];
  return tokens.filter((token) => token !== brand && (/\d/.test(token) || MODEL_QUALIFIER.has(token) || token.length >= 5));
}

function depictsProduct(image, name, siblingNames) {
  const counts = tokenCounts(imageBlob(image));
  const matched = imageTokenSets(name).find((tokens) => coversTokens(counts, tokens));
  if (!matched) return false;
  const mine = modelTokens(name, matched);
  if (!mine.length) return true;
  for (const sibling of siblingNames) {
    const sets = imageTokenSets(sibling);
    const specific = [...sets].sort((a, b) => b.length - a.length)[0];
    if (!specific) continue;
    const theirs = modelTokens(sibling, specific);
    const extra = theirs.filter((token) => !mine.includes(token));
    if (!extra.length || !mine.every((token) => theirs.includes(token))) continue;
    const formed = Math.min(...theirs.map((token) => counts.get(token) || 0));
    if (formed <= 0) continue;
    const leftover = mine.every((token) => (counts.get(token) || 0) - formed > 0);
    if (!leftover) return false;
  }
  return true;
}

function pageImages(input) {
  const byUrl = new Map();
  const add = (url, alt, featured) => {
    if (!hasText(url)) return;
    const key = url.trim();
    const caption = typeof alt === 'string' ? alt.trim() : '';
    const existing = byUrl.get(key);
    if (existing) {
      if (caption && !existing.alts.includes(caption)) existing.alts.push(caption);
      existing.featured = existing.featured || featured;
      return;
    }
    byUrl.set(key, { url: key, alts: caption ? [caption] : [], featured });
  };
  add(input.featuredImage, '', true);
  const body = typeof input.body === 'string' ? input.body : '';
  for (const match of body.matchAll(/!\[([^\]]*)]\(\s*<?([^)\s>]+)>?/g)) {
    add(match[2], match[1], false);
  }
  for (const tag of body.matchAll(/<img\b[^>]*>/gi)) {
    const src = tag[0].match(/\bsrc=["']([^"']+)["']/i);
    const alt = tag[0].match(/\balt=["']([^"']*)["']/i);
    if (src) add(src[1], alt?.[1] || '', false);
  }
  return [...byUrl.values()];
}

export function visibleImageUrls(input) {
  const site = input.site || SITE;
  return pageImages(input)
    .map((image) => absoluteImageUrl(site, image.url))
    .filter(Boolean);
}

function usableImages(input) {
  const stock = new Set(Array.isArray(input.stockImages) ? input.stockImages.filter(hasText).map((url) => url.trim()) : []);
  return pageImages(input).filter((image) => !imageBlocked(image, stock));
}

function comparisonShot(image) {
  const blob = `${image.url} ${image.alts.join(' ')}`.toLowerCase();
  return /(?:^|[^a-z0-9])vs(?:[^a-z0-9]|$)|versus/.test(blob);
}

function chooseProductImage(name, images, siblingNames) {
  const matches = images.filter((image) => depictsProduct(image, name, siblingNames));
  if (!matches.length) return null;
  const exclusive = matches.filter((image) => siblingNames.every((sibling) => !depictsProduct(image, sibling, [])));
  const pool = exclusive.length ? exclusive : matches;
  // A filename or alt that only compares two products is a weaker depiction.
  // Use it when it is the only photo that names the product.
  return [...pool].sort((left, right) => {
    const comparison = Number(comparisonShot(left)) - Number(comparisonShot(right));
    if (comparison) return comparison;
    return Number(right.featured) - Number(left.featured);
  })[0];
}

// Absolute URL of a photo that is already on the page and names this product.
// Stock, context, and lifestyle-host images do not qualify.
export function selectProductImage(name, input, siblingNames = []) {
  if (!hasText(name)) return undefined;
  const productName = name.trim();
  const others = (Array.isArray(siblingNames) ? siblingNames : [])
    .filter((entry) => typeof entry === 'string' && entry.trim() && entry.trim() !== productName)
    .map((entry) => entry.trim());
  const chosen = chooseProductImage(productName, usableImages(input), others);
  if (!chosen) return undefined;
  return absoluteImageUrl(input.site || SITE, chosen.url);
}

function clean(value) {
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entry]) => entry !== undefined)
        .map(([key, entry]) => [key, clean(entry)])
    );
  }
  return value;
}

function authorNode(input) {
  const name = typeof input.author === 'string' ? input.author.trim() : '';
  if (!name || name.length >= 100) return null;
  return {
    '@type': 'Person',
    name,
    url: new URL('/about/', input.site || SITE).toString(),
  };
}

function notes(items) {
  return {
    '@type': 'ItemList',
    itemListElement: items.map((name, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name,
    })),
  };
}

function namedProducts(input) {
  if (!Array.isArray(input.comparisonProducts)) return [];
  return input.comparisonProducts
    .filter((product) => hasText(product?.name))
    .map((product) => ({
      name: product.name.trim(),
      rating: isRating(product.rating) ? product.rating : null,
      pros: list(product.pros),
      cons: list(product.cons),
    }));
}

function affiliateNames(input) {
  if (!Array.isArray(input.affiliateLinks)) return [];
  return input.affiliateLinks.map((link) => link?.product).filter(hasText).map((name) => name.trim());
}

// Mirrors BlogLayout's Quick Verdict: page-level pros, cons, rating, and price.
// Comparison-product pros are not part of that block.
export function visibleVerdict(input) {
  const pros = list(input.pros);
  const cons = list(input.cons);
  const rating = isRating(input.rating) ? input.rating : null;
  const isReview = input.category === 'reviews' || Boolean(rating && pros.length);
  if (!isReview || (!rating && pros.length === 0 && cons.length === 0)) return null;
  return {
    rating,
    pros,
    cons,
    price: rating && hasText(input.price) ? input.price.trim() : null,
  };
}

// Fields GuideScorecard prints. Comparison prices are intentionally absent:
// the layout does not show them, and there is no live price feed.
export function visibleScorecard(input) {
  const products = namedProducts(input);
  const pagePros = list(input.pros);
  const pageCons = list(input.cons);
  if (products.length >= 2) return products;
  if (products.length === 1 && pagePros.length === 0 && pageCons.length === 0) return products;
  return [];
}

function visibleReviewedName(input) {
  const scores = visibleScorecard(input);
  if (scores.length === 1) return scores[0].name;
  const names = affiliateNames(input);
  if (BUYER_CATEGORIES.has(input.category) && names.length > 0) return names[0];
  const products = namedProducts(input);
  if (BUYER_CATEGORIES.has(input.category) && products.length === 1) return products[0].name;
  if (names.length > 0) return names[0];
  const title = hasText(input.title) ? input.title.trim() : '';
  const head = title.split(':')[0].replace(/\s+review$/i, '').trim();
  if (head && title.includes(head)) return head;
  return null;
}

function reviewNode(product, input, extras = {}) {
  const author = authorNode(input);
  if (!author || !isRating(product.rating)) return null;
  const pros = list(product.pros);
  const cons = list(product.cons);
  const review = {
    '@type': 'Review',
    author,
    datePublished: toIso(input.date),
    name: hasText(extras.reviewName) ? extras.reviewName.trim() : undefined,
    reviewBody: hasText(extras.reviewBody) ? extras.reviewBody.trim() : undefined,
    reviewRating: {
      '@type': 'Rating',
      ratingValue: product.rating,
      bestRating: 10,
      worstRating: 1,
    },
  };
  // Pros/cons rich results need at least two visible statements. Don't pad.
  if (pros.length + cons.length >= 2) {
    if (pros.length) review.positiveNotes = notes(pros);
    if (cons.length) review.negativeNotes = notes(cons);
  }
  return clean(review);
}

// Longest token first so "Scotty Cameron" wins over a shorter prefix.
const PRODUCT_BRANDS = [
  ['scotty cameron', 'Scotty Cameron'],
  ['galvin green', 'Galvin Green'],
  ['under armour', 'Under Armour'],
  ['new balance', 'New Balance'],
  ['true linkswear', 'True Linkswear'],
  ['sun mountain', 'Sun Mountain'],
  ['precision pro', 'Precision Pro'],
  ['voice caddie', 'Voice Caddie'],
  ['swing caddie', 'Swing Caddie'],
  ['blue tees', 'Blue Tees'],
  ['shot scope', 'Shot Scope'],
  ['tour edge', 'Tour Edge'],
  ['full swing', 'Full Swing'],
  ['golf pride', 'Golf Pride'],
  ['superstroke', 'SuperStroke'],
  ['taylormade', 'TaylorMade'],
  ['taylor made', 'TaylorMade'],
  ['titleist', 'Titleist'],
  ['callaway', 'Callaway'],
  ['bridgestone', 'Bridgestone'],
  ['flightscope', 'FlightScope'],
  ['cleveland', 'Cleveland'],
  ['footjoy', 'FootJoy'],
  ['foot joy', 'FootJoy'],
  ['bushnell', 'Bushnell'],
  ['samsung', 'Samsung'],
  ['clicgear', 'Clicgear'],
  ['skytrak', 'SkyTrak'],
  ['rapsodo', 'Rapsodo'],
  ['odyssey', 'Odyssey'],
  ['srixon', 'Srixon'],
  ['mizuno', 'Mizuno'],
  ['garmin', 'Garmin'],
  ['stewart', 'Stewart'],
  ['vessel', 'Vessel'],
  ['wilson', 'Wilson'],
  ['skechers', 'Skechers'],
  ['cobra', 'Cobra'],
  ['vice', 'Vice'],
  ['honma', 'Honma'],
  ['apple', 'Apple'],
  ['nike', 'Nike'],
  ['ping', 'PING'],
  ['pxg', 'PXG'],
  ['ecco', 'ECCO'],
  ['adidas', 'adidas'],
  ['puma', 'Puma'],
  ['xxio', 'XXIO'],
].sort((left, right) => right[0].length - left[0].length);

export function brandFromProductName(name) {
  if (!hasText(name)) return undefined;
  const normalized = name.trim().toLowerCase().replace(/[^a-z0-9+]+/g, ' ').replace(/\s+/g, ' ').trim();
  const match = PRODUCT_BRANDS.find(([token]) => normalized === token || normalized.startsWith(`${token} `));
  return match?.[1];
}

function productDescription(input, extras) {
  if (hasText(extras.reviewBody)) return extras.reviewBody.trim();
  if (hasText(input.description)) return input.description.trim();
  return '';
}

function productNode(product, input, extras = {}) {
  const review = reviewNode(product, input, extras);
  if (!review || !hasText(product.name)) return null;
  // Editorial Product snippet, not a merchant listing. The photo has to be one
  // already visible on the page. Price stays in the article. An Offer makes
  // Google ask for availability, returns, and shipping that this site does not have.
  const image = absoluteImageUrl(input.site || SITE, product.image);
  const description = productDescription(input, extras);
  if (!image || !description) return null;
  const name = product.name.trim();
  const node = {
    '@type': 'Product',
    name,
    description,
    image,
    review,
  };
  const brand = brandFromProductName(name);
  if (brand) node.brand = { '@type': 'Brand', name: brand };
  return node;
}

function itemListNode(items, input, pageUrl) {
  return {
    '@type': 'ItemList',
    '@id': `${pageUrl}#products`,
    name: input.title,
    url: pageUrl,
    numberOfItems: items.length,
    itemListOrder: 'https://schema.org/ItemListOrderAscending',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item,
    })),
  };
}

function singleVisibleProduct(input) {
  const verdict = visibleVerdict(input);
  const score = visibleScorecard(input)[0];
  if (input.category === 'reviews' && verdict?.rating) {
    const pros = verdict.pros.length ? verdict.pros : (score?.pros ?? []);
    const cons = verdict.cons.length ? verdict.cons : (score?.cons ?? []);
    return {
      name: score?.name || visibleReviewedName(input),
      rating: verdict.rating,
      pros,
      cons,
      price: verdict.price,
      reviewName: input.title,
      reviewBody: input.description,
    };
  }
  if (score?.rating) {
    return {
      name: score.name,
      rating: score.rating,
      pros: score.pros,
      cons: score.cons,
      price: null,
      reviewName: input.title,
      reviewBody: input.description,
    };
  }
  return null;
}

export function buildStructuredData(input) {
  const site = input.site || SITE;
  const pageUrl = new URL(input.pathname || '/', site).toString();
  const article = clean({
    '@type': 'Article',
    '@id': `${pageUrl}#article`,
    headline: input.title,
    description: input.description,
    image: absolute(site, input.featuredImage),
    author: authorNode({ ...input, site }),
    publisher: {
      '@type': 'Organization',
      name: 'The Birdie Report',
      logo: {
        '@type': 'ImageObject',
        url: new URL('/logo.jpg', site).toString(),
      },
    },
    datePublished: toIso(input.date),
    dateModified: toIso(input.updated || input.date),
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': pageUrl,
    },
  });
  const renderedScores = visibleScorecard(input);
  const schemaInput = { ...input, site };
  let extra;
  if (renderedScores.length >= 2) {
    const siblingNames = renderedScores.map((product) => product.name);
    const items = renderedScores
      .filter((product) => isRating(product.rating))
      .map((product) => {
        const image = selectProductImage(product.name, schemaInput, siblingNames);
        if (!image) return null;
        return productNode({ ...product, price: null, image }, schemaInput);
      })
      .filter(Boolean);
    if (items.length >= 2) extra = itemListNode(items, input, pageUrl);
    else if (items.length === 1) extra = { ...items[0], '@id': `${pageUrl}#product` };
  } else {
    const single = singleVisibleProduct(input);
    const image = single ? selectProductImage(single.name, schemaInput) : undefined;
    const node = single && image
      ? productNode({ ...single, image }, schemaInput, { reviewName: single.reviewName, reviewBody: single.reviewBody })
      : null;
    if (node) extra = { ...node, '@id': `${pageUrl}#product` };
  }
  return {
    '@context': 'https://schema.org',
    '@graph': extra ? [article, extra] : [article],
  };
}

export function jsonLd(data) {
  return JSON.stringify(data).replaceAll('<', '\\u003c');
}
