// Display helpers for the affiliate product boxes. They format stored fields
// only: no prices, ratings, photos, or hands-on claims are created here.
import { selectProductImage } from './review-schema.mjs';

const SITE_HOSTS = new Set(['www.birdiereport.com', 'birdiereport.com']);

// Extra words that do not distinguish one model from the next. A longer
// catalog name can fill in a price or photo only when the added words are
// generic ("Rain Jacket", "Launch Monitor"), never when they add a model token.
const GENERIC_NAME_TOKEN = new Set([
  'golf', 'golfer', 'rain', 'jacket', 'jackets', 'iron', 'irons', 'driver', 'drivers',
  'putter', 'putters', 'wedge', 'wedges', 'shoe', 'shoes', 'glove', 'gloves',
  'launch', 'monitor', 'monitors', 'rangefinder', 'rangefinders', 'cart', 'carts',
  'bag', 'bags', 'ball', 'balls', 'watch', 'watches', 'the', 'for', 'and', 'with',
  'set', 'sets', 'mens', 'men', 'womens', 'women', 'waterproof', 'stand', 'push',
  'spikeless', 'spiked', 'premium', 'edition', 'new', 'limited',
]);

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function nameTokens(value) {
  return text(value).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

export function productNamesMatch(leftName, rightName) {
  const left = nameTokens(leftName);
  const right = nameTokens(rightName);
  if (!left.length || !right.length) return false;
  const [shorter, longer] = left.length <= right.length ? [left, right] : [right, left];
  let index = 0;
  for (const token of shorter) {
    const found = longer.indexOf(token, index);
    if (found < 0) return false;
    index = found + 1;
  }
  const shorterSet = new Set(shorter);
  return longer.every((token) => shorterSet.has(token) || GENERIC_NAME_TOKEN.has(token));
}

export function priceCheckCta(retailer) {
  const name = text(retailer) || 'Amazon';
  if (/^amazon(?:\.com)?$/i.test(name)) return 'Check price on Amazon';
  return `Check price at ${name}`;
}

export function priceCheckAccessibleName(cta, product) {
  return `${cta} for ${text(product)} (opens in a new tab)`;
}

// Compact stored prices get an "Approx." prefix. Notes without a dollar amount
// stay dollar-free. Empty prices are omitted by the caller.
export function storedPriceLine(price) {
  const value = text(price);
  if (!value) return '';
  if (!/\$\s*\d/.test(value)) return 'Check current price';
  if (value.length <= 32 && !/^approx\.?\b/i.test(value)) return `Approx. ${value}`;
  return value;
}

export function bestForLine({ award, why, pros } = {}) {
  const pro = Array.isArray(pros) ? text(pros.find((item) => text(item))) : '';
  const source = pro || text(why) || text(award);
  return source.replace(/^best for:?\s*/i, '').trim();
}

export function awardKicker(award, bestFor) {
  const value = text(award);
  if (!value || value === bestFor) return '';
  const stripped = value.replace(/^best for:?\s*/i, '').trim();
  if (stripped && stripped === bestFor) return '';
  return value;
}

// A root-relative path, or an https URL. Site-hosted files stay root-relative
// so local preview does not depend on the production host.
export function localImageSrc(value) {
  const raw = text(value);
  if (!raw || raw.startsWith('//')) return '';
  if (raw.startsWith('/')) return raw;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') return '';
    if (SITE_HOSTS.has(url.hostname)) return `${url.pathname}${url.search}`;
    return url.href;
  } catch {
    return '';
  }
}

// Explicit link images win. Otherwise use a photo already on the page that
// names this product. Scenic and stock heroes return an empty string.
export function imageForBuyer(product, input, siblingNames = [], explicit = '') {
  const stored = localImageSrc(explicit);
  if (stored) return stored;
  return localImageSrc(selectProductImage(product, input, siblingNames) || '');
}
