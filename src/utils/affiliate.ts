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

export function withAmazonTag(url: string, context: AffiliateContext = {}) {
  if (!url) return url;

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');

    if (!host.endsWith('amazon.com')) return url;

    parsed.searchParams.set('tag', getAmazonTag(context));
    return parsed.toString();
  } catch {
    return url;
  }
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
