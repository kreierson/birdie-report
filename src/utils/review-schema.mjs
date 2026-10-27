const SITE = 'https://www.birdiereport.com';

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
      rating: product.rating,
      price: product.price,
      pros: product.pros,
      cons: product.cons,
    }));
}

function fallbackProductName(input) {
  const links = Array.isArray(input.affiliateLinks) ? input.affiliateLinks : [];
  const named = links.find((link) => hasText(link?.product));
  if (named) return named.product.trim();
  const title = hasText(input.title) ? input.title.trim() : '';
  return title.split(':')[0].replace(/\s+review$/i, '').trim();
}

function singleProductSource(input) {
  const products = namedProducts(input);
  if (products.length !== 1 && !(products.length === 0 && input.category === 'reviews' && isRating(input.rating))) {
    return null;
  }
  if (products.length === 1) {
    const product = products[0];
    const pros = list(input.pros);
    const cons = list(input.cons);
    return {
      name: product.name,
      rating: isRating(input.rating) ? input.rating : product.rating,
      price: hasText(input.price) ? input.price : product.price,
      pros: pros.length ? pros : list(product.pros),
      cons: cons.length ? cons : list(product.cons),
    };
  }
  const name = fallbackProductName(input);
  if (!name) return null;
  return {
    name,
    rating: input.rating,
    price: input.price,
    pros: list(input.pros),
    cons: list(input.cons),
  };
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
  // Google's pros/cons markup needs at least two visible statements. Don't pad a shorter list.
  if (pros.length + cons.length >= 2) {
    if (pros.length) review.positiveNotes = notes(pros);
    if (cons.length) review.negativeNotes = notes(cons);
  }
  return clean(review);
}

function productNode(product, input, extras = {}) {
  const review = reviewNode(product, input, extras);
  if (!review || !hasText(product.name)) return null;
  const price = parseUsdPrice(product.price);
  const node = {
    '@type': 'Product',
    name: product.name.trim(),
    review,
  };
  // Only a single unambiguous dollar amount is an Offer. Ranges, sale notes, and
  // "check current price" stay on the page because there is no live price feed.
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
  const products = namedProducts(input);
  let extra;
  if (products.length >= 2) {
    const items = products
      .map((product) => productNode({
        name: product.name,
        rating: product.rating,
        price: product.price,
        pros: list(product.pros),
        cons: list(product.cons),
      }, { ...input, site }))
      .filter(Boolean);
    if (items.length >= 2) extra = itemListNode(items, input, pageUrl);
    else if (items.length === 1) extra = { ...items[0], '@id': `${pageUrl}#product` };
  } else {
    const single = singleProductSource(input);
    const node = single ? productNode(single, { ...input, site }, { reviewName: input.title, reviewBody: input.description }) : null;
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
