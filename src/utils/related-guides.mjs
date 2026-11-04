// Internal paths into existing buyer's guides. Course and instruction pages
// use these instead of affiliate buttons. Keep the placement off affiliate_click.
export const RELATED_GUIDES_PLACEMENT = 'related_guides';

export const GUIDE_CATALOG = {
  walkingShoes: {
    href: '/blog/best-golf-shoes-walking-2026/',
    title: 'Best golf shoes for walking',
    note: 'A shoe built for a full round on foot.',
  },
  rangefinder: {
    href: '/blog/best-rangefinders-2026/',
    title: 'Best golf rangefinders',
    note: 'Yardages on a course you are still learning.',
  },
  balls: {
    href: '/blog/best-golf-balls-2026/',
    title: 'Best golf balls',
    note: 'A ball that fits the flight and the greens.',
  },
  rain: {
    href: '/blog/best-golf-rain-jackets-walking-2026/',
    title: 'Best rain jackets for walking',
    note: 'A jacket you can walk in when the weather turns.',
  },
  gps: {
    href: '/blog/best-golf-gps-watches-2026/',
    title: 'Best golf GPS watches',
    note: 'Hole maps for yardages on the wrist.',
  },
  bag: {
    href: '/blog/best-golf-bags-walking-2026/',
    title: 'Best walking golf bags',
    note: 'A stand bag that is easier to carry between shots.',
  },
  sunglasses: {
    href: '/blog/best-golf-sunglasses-2026/',
    title: 'Best golf sunglasses',
    note: 'Lenses for bright turf and glare around the greens.',
  },
  putters: {
    href: '/blog/best-putters-2026/',
    title: 'Best putters',
    note: 'A putter shape that fits the stroke you are practicing.',
  },
  puttersHigh: {
    href: '/blog/best-putters-high-handicappers-2026/',
    title: 'Best putters for high handicappers',
    note: 'Mallets with more stability while the stroke settles in.',
  },
  training: {
    href: '/blog/best-golf-training-aids-2026/',
    title: 'Best golf training aids',
    note: 'Practice tools that match this kind of work.',
  },
  wedges: {
    href: '/blog/best-wedges-2026/',
    title: 'Best wedges',
    note: 'A wedge setup for the shots around the green.',
  },
  wedgesHigh: {
    href: '/blog/best-wedges-high-handicappers-2026/',
    title: 'Best wedges for high handicappers',
    note: 'Wedges with more forgiveness around the green.',
  },
  driversHigh: {
    href: '/blog/best-drivers-high-handicappers-2026/',
    title: 'Best drivers for high handicappers',
    note: 'A more forgiving driver when tee shots are the leak.',
  },
  irons: {
    href: '/blog/best-irons-2026/',
    title: 'Best irons',
    note: 'An iron set that matches the strike you are working on.',
  },
};

const GUIDE_HREFS = new Set(Object.values(GUIDE_CATALOG).map((guide) => guide.href));

export function isGuideHref(href) {
  return GUIDE_HREFS.has(href);
}

function textOf(post) {
  return [post.slug, post.title, post.description, ...(post.tags || [])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .replace(/-/g, ' ');
}

function pick(...keys) {
  return keys.map((key) => GUIDE_CATALOG[key]);
}

function courseGuides(post) {
  const text = textOf(post);
  const desert = /scottsdale|arizona|\bdesert\b/.test(text);
  const exposed = /bandon|pinehurst|southern pines|bethpage|whistling|straits|pebble|spyglass|dundonald|erin hills|kiawah|streamsong|pacific dunes|sheep ranch|old macdonald|sand valley|mammoth dunes|mid pines|pine needles|tobacco road|\blinks\b/.test(text);
  if (desert) return pick('walkingShoes', 'rangefinder', 'balls', 'sunglasses');
  if (exposed) return pick('walkingShoes', 'rangefinder', 'rain', 'balls');
  if (post.subcategory === 'travel-guides') return pick('walkingShoes', 'bag', 'rangefinder', 'balls');
  return pick('walkingShoes', 'rangefinder', 'balls', 'gps');
}

function tipGuides(post) {
  const text = textOf(post);
  const sub = post.subcategory || '';
  if (sub === 'putting' || (sub !== 'course-management' && /\bputt/.test(text))) {
    return pick('putters', 'puttersHigh', 'training');
  }
  if (sub === 'short-game' || (sub !== 'course-management' && /wedge|chip|pitch|bunker|flop/.test(text))) {
    return pick('wedges', 'wedgesHigh', 'training');
  }
  if (sub === 'course-management') return pick('rangefinder', 'gps', 'balls');
  if (sub === 'mental-game') return pick('training', 'balls');
  if (/slice|driver|\btee\b|fairway wood|hybrid/.test(text)) return pick('driversHigh', 'training', 'balls');
  if (/iron/.test(text)) return pick('irons', 'training', 'balls');
  return pick('training', 'irons', 'balls');
}

export function selectRelatedGuides(post = {}) {
  if (post.category === 'courses') return courseGuides(post);
  if (post.category === 'tips') return tipGuides(post);
  return [];
}

export function relatedGuidesIntro(category) {
  if (category === 'courses') return "Buyer's guides for the gear that comes with a day on the course.";
  return "Buyer's guides for the gear behind this part of the game.";
}
