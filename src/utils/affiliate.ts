import registry from '../../data/verified-asins.json' with { type: 'json' };

type AffiliateContext = {
  category?: string;
  subcategory?: string;
  trackingId?: string;
};

type AffiliateLink = {
  product?: string;
  name?: string;
  url?: string;
  affiliate_url?: string;
  retailer?: string;
  price?: string;
  tracking_id?: string;
};

const DEFAULT_AMAZON_TAG = 'birdiereport-20';
const PRODUCT_PATH = /\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})(?![A-Z0-9])/i;
const verifiedAsins = new Set(registry.asins.map((entry) => entry.asin.toUpperCase()));

const AMAZON_TAGS: Record<string, string | undefined> = {
  default: import.meta.env.PUBLIC_AMAZON_TAG_DEFAULT,
  best: import.meta.env.PUBLIC_AMAZON_TAG_BEST,
  reviews: import.meta.env.PUBLIC_AMAZON_TAG_REVIEWS,
  deals: import.meta.env.PUBLIC_AMAZON_TAG_DEALS,
  versus: import.meta.env.PUBLIC_AMAZON_TAG_VERSUS,
  rangefinders: import.meta.env.PUBLIC_AMAZON_TAG_RANGEFINDERS,
  gps: import.meta.env.PUBLIC_AMAZON_TAG_GPS,
  'training-aids': import.meta.env.PUBLIC_AMAZON_TAG_TRAINING_AIDS,
  balls: import.meta.env.PUBLIC_AMAZON_TAG_BALLS,
  bags: import.meta.env.PUBLIC_AMAZON_TAG_BAGS,
  shoes: import.meta.env.PUBLIC_AMAZON_TAG_SHOES,
  apparel: import.meta.env.PUBLIC_AMAZON_TAG_APPAREL,
};

function firstValidTag(...tags: Array<string | undefined>) {
  return tags.find((tag) => tag && /^[a-z0-9_-]+-20$/i.test(tag)) || DEFAULT_AMAZON_TAG;
}

export function getAmazonTag(context: AffiliateContext = {}) {
  return firstValidTag(
    context.trackingId,
    context.subcategory ? AMAZON_TAGS[context.subcategory] : undefined,
    context.category ? AMAZON_TAGS[context.category] : undefined,
    AMAZON_TAGS.default
  );
}

export function asinFromAmazonProductUrl(url: string) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');
    if (host !== 'amazon.com' && !host.endsWith('.amazon.com')) return null;
    return parsed.pathname.match(PRODUCT_PATH)?.[1].toUpperCase() ?? null;
  } catch {
    return null;
  }
}

export function isDirectAmazonProductUrl(url: string) {
  return Boolean(asinFromAmazonProductUrl(url));
}

export function amazonProductUrl(asin: string, context: AffiliateContext = {}) {
  const normalized = asin.trim().toUpperCase();
  if (!/^[A-Z0-9]{10}$/.test(normalized)) {
    throw new Error(`Invalid ASIN: ${asin}`);
  }
  if (!verifiedAsins.has(normalized)) {
    throw new Error(`ASIN ${normalized} is not in data/verified-asins.json`);
  }

  const url = new URL(`https://www.amazon.com/dp/${normalized}`);
  url.searchParams.set('tag', getAmazonTag(context));
  return url.toString();
}

export function withAmazonTag(url: string, context: AffiliateContext = {}) {
  if (!url) return url;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }

  const host = parsed.hostname.replace(/^www\./, '');
  if (host !== 'amazon.com' && !host.endsWith('.amazon.com')) return url;

  const asin = parsed.pathname.match(PRODUCT_PATH)?.[1];
  if (asin) return amazonProductUrl(asin, context);

  parsed.searchParams.set('tag', getAmazonTag(context));
  return parsed.toString();
}

export function normalizeAffiliateUrl(link: AffiliateLink, context: AffiliateContext = {}) {
  const trackingId = link.tracking_id || context.trackingId;
  const url = link.url || link.affiliate_url || '';

  return withAmazonTag(url, { ...context, trackingId });
}

export function normalizeAffiliateLinks<T extends AffiliateLink>(links: T[] = [], context: AffiliateContext = {}) {
  return links.map((link) => ({
    ...link,
    url: normalizeAffiliateUrl(link, context),
    affiliate_url: normalizeAffiliateUrl(link, context),
  }));
}
