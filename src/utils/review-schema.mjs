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

function productNode(product, input, extras = {}) {
  const review = reviewNode(product, input, extras);
  if (!review || !hasText(product.name)) return null;
  const node = {
    '@type': 'Product',
    name: product.name.trim(),
    review,
  };
  const price = parseUsdPrice(product.price);
  if (price != null) {
    node.offers = {
      '@type': 'Offer',
      price,
      priceCurrency: 'USD',
    };
  }
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
  let extra;
  if (renderedScores.length >= 2) {
    const items = renderedScores
      .filter((product) => isRating(product.rating))
      .map((product) => productNode({ ...product, price: null }, { ...input, site }))
      .filter(Boolean);
    if (items.length >= 2) extra = itemListNode(items, input, pageUrl);
    else if (items.length === 1) extra = { ...items[0], '@id': `${pageUrl}#product` };
  } else {
    const single = singleVisibleProduct(input);
    const node = single
      ? productNode(single, { ...input, site }, { reviewName: single.reviewName, reviewBody: single.reviewBody })
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
