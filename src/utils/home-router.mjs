// Homepage router links. Order and copy follow the short-homepage spec.
// Most-used order is the Nov 7 28-day mobile ranking, then all-device history.

export const HOME_TILES = [
  { label: 'Putters', href: '/blog/best-putters-2026/', slug: 'best-putters-2026' },
  { label: 'Drivers', href: '/blog/best-drivers-seniors-2026/', slug: 'best-drivers-seniors-2026' },
  { label: 'Irons', href: '/blog/best-irons-high-handicappers-2026/', slug: 'best-irons-high-handicappers-2026' },
  { label: 'Golf shoes', href: '/blog/best-golf-shoes-2026/', slug: 'best-golf-shoes-2026' },
  { label: 'Bags & carts', href: '/blog/best-golf-cart-bags-2026/', slug: 'best-golf-cart-bags-2026' },
  { label: 'Rangefinders', href: '/blog/best-rangefinders-2026/', slug: 'best-rangefinders-2026' },
];

export const GIFT_TILE = {
  label: 'Golf gifts',
  href: '/blog/best-golf-gifts/',
  slug: 'best-golf-gifts',
};

export const MOST_USED = [
  { label: 'Best Golf Sunglasses', href: '/blog/best-golf-sunglasses-2026/', slug: 'best-golf-sunglasses-2026' },
  { label: 'Best Putters', href: '/blog/best-putters-2026/', slug: 'best-putters-2026' },
  { label: 'Best Golf Cart Bags', href: '/blog/best-golf-cart-bags-2026/', slug: 'best-golf-cart-bags-2026' },
  { label: 'Best Putters for High Handicappers', href: '/blog/best-putters-high-handicappers-2026/', slug: 'best-putters-high-handicappers-2026' },
  { label: 'Best Drivers for Seniors', href: '/blog/best-drivers-seniors-2026/', slug: 'best-drivers-seniors-2026' },
  { label: 'Best Golf Shoes', href: '/blog/best-golf-shoes-2026/', slug: 'best-golf-shoes-2026' },
];

const PRICE_CLAIM = /\$|\bdeals?\b|\bdiscount\b|\bsale\b|%\s*off|\bunder\s+\$?\d+/i;

export function showsPriceClaim(text = '') {
  return PRICE_CLAIM.test(String(text));
}

export function tilesFor(date = new Date()) {
  const month = date.getUTCMonth() + 1;
  const tiles = [...HOME_TILES];
  if (month === 11 || month === 12) tiles.push(GIFT_TILE);
  return tiles.length ? tiles : [...HOME_TILES];
}

export function mostUsedGuides() {
  return MOST_USED.length ? MOST_USED : [...HOME_TILES];
}
