import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import guideMarkdown from './guide-markdown.mjs';
import { resolveQuickPicks } from '../src/utils/quick-picks.mjs';
import {
  buildGuideModel,
  compareJumpLabel,
  containsPriceText,
  formatGuideDate,
  guideRetailerCta,
  inspectRetailerUrl,
  isBuyerGuide,
  markdownHeadings,
  mobileReason,
  researchDisclosure,
  stickyNavRequested,
  topPicksHeading,
} from '../src/utils/guide-template.mjs';
import { foldTypography, hrefSurvives } from './validate-guide-template.mjs';
import { GUIDE_IMAGE_BUDGET, guideDelivery, thumbFor } from '../src/utils/guide-images.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const PRODUCT_PATH = /\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})(?![A-Z0-9])/i;
const helpers = {
  normalizeAffiliateUrl: (link) => link.url,
  isDirectAmazonProductUrl: (url) => PRODUCT_PATH.test(url),
};

function read(path) {
  return readFileSync(join(root, path), 'utf8');
}

function article(slug) {
  const source = read(`src/content/blog/${slug}.mdx`);
  const front = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return { source, data: parse(front[1]), body: source.slice(front[0].length) };
}

function modelFor(slug) {
  const page = article(slug);
  const picks = resolveQuickPicks(page.data.quick_picks, { category: 'best', subcategory: page.data.subcategory }, helpers);
  return { page, model: buildGuideModel({ picks, body: page.body, subcategory: page.data.subcategory }) };
}

function field(row, label) {
  return row.fields.find((item) => item.label === label)?.value;
}

test('buyer-guide gate stays on category best and off the homepage', () => {
  assert.equal(isBuyerGuide({ category: 'best' }), true);
  assert.equal(isBuyerGuide({ category: 'reviews' }), false);
  assert.equal(isBuyerGuide({ category: 'news' }), false);
  const index = read('src/pages/index.astro');
  const layout = read('src/layouts/BlogLayout.astro');
  assert.doesNotMatch(index, /GuideTopPicks|data-picks-view|guide_compare/);
  assert.match(layout, /buyerGuide/);
  assert.match(layout, /<QuickPicks/);
  assert.match(layout, /article-top-shortlist/);
  assert.match(layout, /article-bottom-buy-box/);
  assert.match(layout, /sidebar-sticky-cta/);
});

test('sticky nav is opt-in and does not launch itself', () => {
  assert.equal(stickyNavRequested(''), false);
  assert.equal(stickyNavRequested('?guide_sticky=1'), true);
  assert.equal(stickyNavRequested('guide_sticky=1'), true);
  assert.equal(stickyNavRequested('?guide_sticky=true'), false);
  assert.equal(stickyNavRequested('?guide_sticky=0'), false);
  assert.equal(stickyNavRequested(new URLSearchParams('guide_sticky=1')), true);
  const script = read('public/scripts/guide-template.js');
  const analytics = read('public/scripts/analytics.js');
  assert.match(script, /guide_sticky'\) === '1'/);
  assert.match(script, /picks_view/);
  assert.match(script, /sticky_nav_click/);
  assert.doesNotMatch(script, /track\('guide_click'/);
  assert.match(analytics, /gtag\('event', 'guide_click'/);
  assert.doesNotMatch(analytics, /picks_view|sticky_nav_click/);
});

test('retailer labels follow direct versus search and prices stay out of the new fields', () => {
  assert.equal(guideRetailerCta({ direct: true, retailer: 'Amazon' }), 'Check Amazon');
  assert.equal(guideRetailerCta({ direct: false, retailer: 'Amazon' }), 'Search Amazon');
  assert.equal(guideRetailerCta({ direct: false, retailer: 'PGA Tour Superstore' }), 'See options at PGA Tour Superstore');
  assert.equal(topPicksHeading(3), 'Our top 3 picks');
  assert.equal(topPicksHeading(2), 'Our top 2 picks');
  assert.equal(topPicksHeading(1), 'Our top pick');
  assert.equal(compareJumpLabel(5), 'Compare all 5 picks');
  assert.equal(formatGuideDate('2026-09-28T00:00:00.000Z'), 'Sep 28, 2026');
  assert.equal(formatGuideDate('2026-11-04T00:00:00.000Z'), 'Nov 4, 2026');
  const research = researchDisclosure('research-based');
  assert.equal(research.visible, 'Research-based picks, not hands-on tests.');
  assert.match(research.description, /not presented as a hands-on product test/);
  assert.equal(researchDisclosure('hands-on').visible.includes('not hands-on'), false);
});

test('static retailer checks do not fetch and do not treat an unverified ASIN as a search link', () => {
  let fetched = false;
  const original = globalThis.fetch;
  globalThis.fetch = () => {
    fetched = true;
    throw new Error('network should stay blocked');
  };
  try {
    const verified = new Set(['B0FKCT6B4K']);
    const direct = inspectRetailerUrl('https://www.amazon.com/dp/B0FKCT6B4K?tag=birdiereport-20', verified);
    assert.equal(direct.liveCheck, 'not-run');
    assert.deepEqual(direct.issues, []);
    const unknown = inspectRetailerUrl('https://www.amazon.com/dp/B00NOTREAL?tag=birdiereport-20', verified);
    assert.match(unknown.issues.join(' '), /B00NOTREAL/);
    assert.equal(unknown.liveCheck, 'not-run');
    const search = inspectRetailerUrl('https://www.amazon.com/s?k=Oakley+Flak&tag=birdiereport-20', verified);
    assert.deepEqual(search.issues, []);
    const untagged = inspectRetailerUrl('https://www.amazon.com/s?k=Oakley+Flak', verified);
    assert.match(untagged.issues.join(' '), /birdiereport-20/);
    assert.equal(fetched, false);
  } finally {
    globalThis.fetch = original;
  }
});

test('cart bags use the published weight and divider cells, not the price column', () => {
  const { model, page } = modelFor('best-golf-cart-bags-2026');
  assert.equal(model.top.length, 3);
  assert.equal(model.rows.length, 5);
  assert.equal(model.jumpLabel, 'Compare all 5 picks');
  const pioneer = model.rows.find((row) => row.product === 'PING Pioneer');
  assert.equal(field(pioneer, 'Published empty weight'), '8 lb');
  assert.equal(field(pioneer, 'Dividers'), '15-way top; enlarged putter well');
  assert.equal(pioneer.cta, 'Search Amazon');
  assert.match(pioneer.accessibleName, /Search Amazon for PING Pioneer \(opens in a new tab\)/);
  assert.match(pioneer.href, /tag=birdiereport-20/);
  assert.match(pioneer.reviewHref, /^#ping-pioneer/);
  const titleist = model.rows.find((row) => row.product === 'Titleist Cart 14');
  assert.equal(titleist.cta, 'Check Amazon');
  assert.match(titleist.accessibleName, /Check Amazon for Titleist Cart 14 \(opens in a new tab\)/);
  const callaway = model.rows.find((row) => row.product === 'Callaway Quantum ORG 14');
  assert.equal(field(callaway, 'Published empty weight'), 'Not listed');
  assert.match(page.body, /Not stated on cited page/);
  const taylor = model.rows.find((row) => row.product === 'TaylorMade Cart Lite');
  assert.equal(field(taylor, 'Published empty weight'), 'Conflicting figures*');
  assert.match(page.body, /Conflicting figures\*/);
  assert.match(page.body, /5 pounds in its description and 5\.5 pounds/);
  for (const row of model.rows) {
    assert.equal(containsPriceText(JSON.stringify(row.fields)), false);
    assert.equal(containsPriceText(row.bestFor), false);
  }
  assert.doesNotMatch(JSON.stringify(model.top), /Approx|\$/);
});

test('drivers, irons, putters, shoes, and sunglasses keep their own real fields', () => {
  const drivers = modelFor('best-drivers-seniors-2026').model;
  assert.equal(field(drivers.rows[0], 'Swing speed'), 'Swing speeds 70-85 mph');
  assert.equal(field(drivers.rows[2], 'Swing speed'), 'Swing speeds 75-90 mph with a fade/slice tendency');
  assert.equal(drivers.rows.some((row) => row.fields.some((item) => item.label === 'Our take')), false);

  const currentDrivers = modelFor('best-drivers-2026').model;
  assert.equal(currentDrivers.hasPicks, false);
  assert.equal(currentDrivers.rows.length, 0);

  const irons = modelFor('best-irons-high-handicappers-2026').model;
  assert.match(field(irons.rows[0], "Who it's for"), /^High handicappers who want maximum distance/);
  assert.equal(modelFor('best-irons-2026').model.hasPicks, false);

  const sun = modelFor('best-golf-sunglasses-2026');
  assert.equal(sun.model.rows[0].fields.length, 1);
  assert.equal(sun.model.rows[0].fields[0].label, 'Our take');
  assert.equal(sun.model.rows[0].fields[0].value, sun.page.data.quick_picks[0].why);
  assert.ok(sun.model.rows.every((row) => row.fields.every((item) => item.label === 'Our take')));
  assert.equal(sun.model.rows.some((row) => /^(Lens|Fit)$/.test(row.fields.map((item) => item.label).join(''))), false);

  const putters = modelFor('best-putters-2026').model;
  assert.equal(putters.rows[0].fields[0].label, 'Our take');
  assert.notEqual(putters.rows[0].fields[0].value, 'Not listed');

  const shoes = modelFor('best-golf-shoes-2026');
  assert.equal(shoes.model.fieldMode, 'editorial');
  assert.match(shoes.page.source, /^title: "Best Golf Shoes 2026: 6 Research-Based Picks for Walking, Grip, and Value"$/m);
  assert.doesNotMatch(shoes.page.source, /Tested/);
  assert.match(shoes.page.source, /^updated: 2026-11-04$/m);
  assert.match(shoes.page.source, /^date: 2026-03-16$/m);
  assert.match(shoes.page.source, /^seo_title: "Best Golf Shoes 2026: 6 Picks for Walking"$/m);
  assert.match(shoes.page.source, /^seo_description: "The best golf shoes for 2026, compared for walking comfort/m);
});

test('missing, empty, short, and price-bearing sources do not get invented values', () => {
  const { page } = modelFor('best-golf-cart-bags-2026');
  const missing = buildGuideModel({
    picks: [{ award: 'Best', product: 'Unknown Bag Model', why: 'Because.', url: 'https://www.amazon.com/s?k=bag&tag=birdiereport-20', retailer: 'Amazon', direct: false }],
    body: page.body,
    subcategory: 'bags',
  });
  assert.equal(missing.heading, 'Our top pick');
  assert.equal(missing.rows[0].fields[0].value, 'Not listed');
  assert.equal(missing.rows[0].fields[1].value, 'Not listed');
  assert.equal(missing.rows[0].reviewHref, '');

  const empty = buildGuideModel({ picks: null, body: '', subcategory: 'putters' });
  assert.equal(empty.hasPicks, false);

  const priced = buildGuideModel({
    picks: [{
      award: 'Best overall',
      product: 'Foo Bar Club',
      why: 'Approx. $211',
      url: 'https://www.amazon.com/s?k=foo&tag=birdiereport-20',
      retailer: 'Amazon',
      direct: false,
    }],
    body: "## Foo Bar Club\n\n**Who it's for:** Golfers who will pay $999.\n",
    subcategory: 'irons',
  });
  assert.equal(priced.rows[0].fields[0].value, 'Not listed');

  const editorialPrice = buildGuideModel({
    picks: [{
      award: 'Best overall',
      product: 'Long Name Sunglasses With A Very Wide Frame Description',
      why: 'Approx. $20',
      url: 'https://www.amazon.com/s?k=shades&tag=birdiereport-20',
      retailer: 'Amazon',
      direct: false,
    }],
    body: '',
    subcategory: 'accessories',
  });
  assert.equal(editorialPrice.rows[0].fields[0].label, 'Our take');
  assert.equal(editorialPrice.rows[0].fields[0].value, 'Not listed');
  assert.match(editorialPrice.rows[0].accessibleName, /Long Name Sunglasses With A Very Wide Frame Description/);
  assert.equal(editorialPrice.top[0].why, '');
  assert.equal(editorialPrice.top[0].cta, 'Search Amazon');
  assert.equal(editorialPrice.top[0].href, 'https://www.amazon.com/s?k=shades&tag=birdiereport-20');
});

test('mobile reasons stay complete and sourced, or they are omitted', () => {
  assert.equal(mobileReason(''), '');
  assert.equal(mobileReason('Still'), '');
  assert.equal(mobileReason('Criminally underpriced'), '');
  assert.equal(mobileReason('Approx. $211'), '');
  assert.equal(mobileReason('Still the gold standard'), 'Still the gold standard');
  assert.equal(
    mobileReason('The best balance of support, traction, and walking comfort'),
    'The best balance of support, traction, and walking comfort',
  );
  assert.equal(
    mobileReason('Swing speeds 70-85 mph. Golfers who want maximum distance without changing their swing.'),
    'Swing speeds 70-85 mph.',
  );
  const flak = "The Flak 2.0 XL with Prizm Golf lenses is the standard for golf sunglasses, and it's not particularly close.";
  assert.equal(mobileReason(flak), '');
  assert.equal(mobileReason('Put it on your shortlist if you prefer a semi-rimless shape and want polarized lenses.'), '');

  const sun = modelFor('best-golf-sunglasses-2026').model;
  assert.deepEqual(sun.top.map((pick) => pick.reason), ['', '', '']);
  assert.deepEqual(sun.top.map((pick) => pick.product), [
    'Oakley Flak 2.0 XL Prizm Golf',
    "Maui Jim Ho'okipa",
    'Costa Del Mar Whitetip',
  ]);
  assert.deepEqual(sun.top.map((pick) => pick.award), [
    'Best Overall',
    'Polarized, semi-rimless',
    'Best for water-heavy courses',
  ]);
  assert.equal(sun.top[0].cta, 'Search Amazon');
  assert.match(sun.top[0].accessibleName, /Search Amazon for Oakley Flak 2\.0 XL Prizm Golf \(opens in a new tab\)/);

  const shoes = modelFor('best-golf-shoes-2026').model;
  assert.equal(shoes.top[0].reason, 'The best balance of support, traction, and walking comfort');
  assert.equal(shoes.top[1].reason, 'Premium comfort for serious walkers');
  assert.equal(shoes.top[2].reason, 'Maximum grip when you need it');

  const layout = read('src/layouts/BlogLayout.astro');
  assert.match(layout, /text-\[28px\]/);
  assert.doesNotMatch(layout, /line-clamp-2 sm:line-clamp-none/);
  const picks = read('src/components/GuideTopPicks.astro');
  assert.doesNotMatch(picks, /truncate|line-clamp/);
  assert.match(picks, /min-h-11 min-w-\[120px\]/);
});

test('every best guide keeps sourced comparison fields and does not invent a second spec', () => {
  const files = readdirSync(join(root, 'src/content/blog')).filter((name) => name.endsWith('.mdx'));
  const problems = [];
  let checked = 0;
  for (const file of files) {
    const slug = file.replace(/\.mdx$/, '');
    const page = article(slug);
    if (page.data.category !== 'best') continue;
    checked += 1;
    const picks = page.data.quick_picks
      ? resolveQuickPicks(page.data.quick_picks, { category: 'best', subcategory: page.data.subcategory }, helpers)
      : [];
    const model = buildGuideModel({ picks, body: page.body, subcategory: page.data.subcategory });
    const allowed = {
      bags: ['Published empty weight', 'Dividers'],
      drivers: ['Swing speed'],
      irons: ["Who it's for"],
      editorial: ['Our take'],
    }[model.fieldMode];
    const sources = [page.body, ...picks.flatMap((pick) => [pick.award, pick.why, pick.product])].join('\n').replace(/\s+/g, ' ');
    const headingIds = new Set(markdownHeadings(page.body).map((heading) => heading.id));
    if (Boolean(page.data.quick_picks) !== model.hasPicks) problems.push(`${slug}: picks gate mismatch`);
    for (const row of model.rows) {
      const labels = row.fields.map((item) => item.label);
      if (labels.join('|') !== allowed.join('|')) problems.push(`${slug}: ${row.product} fields ${labels.join('|')}`);
      for (const item of row.fields) {
        if (item.value === 'Not listed') continue;
        if (!sources.includes(item.value)) problems.push(`${slug}: unsourced ${item.label} for ${row.product}: ${item.value}`);
        if (/Not stated on cited page|Approx\.|\$\s*\d/.test(item.value)) {
          problems.push(`${slug}: ${row.product} shows ${item.value} in ${item.label}`);
        }
      }
      if (row.reviewHref && !headingIds.has(row.reviewHref.slice(1))) {
        problems.push(`${slug}: missing heading ${row.reviewHref}`);
      }
    }
    for (const pick of model.top) {
      if (/Approx\.|\$\s*\d/.test(`${pick.award} ${pick.why} ${pick.reason}`)) {
        problems.push(`${slug}: top pick shows a price for ${pick.product}`);
      }
      const stored = picks.find((item) => item.product === pick.product);
      const storedWhy = String(stored?.why || '').replace(/\s+/g, ' ').trim();
      if (pick.reason) {
        if (!storedWhy.startsWith(pick.reason)) problems.push(`${slug}: reason is not the stored line for ${pick.product}`);
        if (pick.reason.split(' ').length < 3) problems.push(`${slug}: reason is too short for ${pick.product}`);
        if (pick.reason.length > 80) problems.push(`${slug}: reason is too long to show in full for ${pick.product}`);
        if (pick.reason !== storedWhy && !/[.!?]$/.test(pick.reason)) {
          problems.push(`${slug}: reason cuts ${pick.product} mid-sentence`);
        }
      }
      if (pick.retailer === 'Amazon' && !['Check Amazon', 'Search Amazon'].includes(pick.cta)) {
        problems.push(`${slug}: unexpected button label ${pick.cta}`);
      }
      if (!pick.accessibleName.startsWith(`${pick.cta} for ${pick.product}`)) {
        problems.push(`${slug}: accessible name dropped the button or product for ${pick.product}`);
      }
      if (/amazon\.com/i.test(pick.href) && !pick.href.includes('tag=birdiereport-20')) {
        problems.push(`${slug}: Amazon tag changed for ${pick.product}`);
      }
    }
  }
  assert.ok(checked >= 40, `expected every category:best guide, checked ${checked}`);
  assert.deepEqual(problems, []);
});

test('picks_view fires once at half visibility and sticky_nav_click stays on the test arm', () => {
  const source = read('public/scripts/guide-template.js');
  const requests = [];
  function boot(search, { reduce = false } = {}) {
    const listeners = {};
    const observers = [];
    class IntersectionObserver {
      constructor(callback, options) {
        this.callback = callback;
        this.options = options;
        observers.push(this);
      }
      observe(target) { this.target = target; }
      disconnect() { this.disconnected = true; }
    }
    function node(attrs, rect) {
      const element = {
        attrs,
        rect,
        children: [],
        parent: null,
        removed: false,
        hidden: true,
        classList: { toggle() {} },
        getAttribute: (name) => element.attrs[name] ?? null,
        setAttribute: (name, value) => { element.attrs[name] = String(value); },
        hasAttribute: (name) => element.attrs[name] != null,
        closest(selector) {
          if (selector === '[data-guide-jump]' && element.attrs['data-guide-jump'] != null) return element;
          if (selector === '[data-guide-sticky-nav]' && element.attrs['data-guide-sticky-nav'] != null) return element;
          return element.parent ? element.parent.closest(selector) : null;
        },
        contains: (other) => other === element || element.children.includes(other),
        getBoundingClientRect: () => element.rect,
        focus(options) { element.focused = options; },
        scrollIntoView(options) { element.scrolled = options; },
        remove() { element.removed = true; },
      };
      return element;
    }
    const picks = node({ 'data-picks-view': '', 'data-guide-slug': 'best-golf-sunglasses-2026' }, { top: 180, height: 420, bottom: 600 });
    picks.id = 'guide-top-picks';
    const compare = node({}, { top: 0, height: 10, bottom: 10 });
    compare.id = 'compare-at-a-glance';
    const bar = node({ 'data-guide-sticky-nav': '', 'data-variant': 'test', 'data-guide-slug': 'best-golf-sunglasses-2026' }, { top: 0, height: 52, bottom: 52 });
    const stickyButton = node({ 'data-sticky-nav-click': '', 'data-guide-jump': 'guide-top-picks' }, { top: 0, height: 44, bottom: 44 });
    stickyButton.parent = bar;
    bar.children.push(stickyButton);
    const compareButton = node({ 'data-guide-jump': 'compare-at-a-glance' }, { top: 0, height: 44, bottom: 44 });
    const document = {
      querySelector(selector) {
        if (selector === '[data-picks-view]') return picks.removed ? null : picks;
        if (selector === '[data-guide-sticky-nav]') return bar.removed ? null : bar;
        return null;
      },
      getElementById(id) {
        if (id === 'guide-top-picks') return picks;
        if (id === 'compare-at-a-glance') return compare;
        return null;
      },
      addEventListener(name, fn) { (listeners[name] ||= []).push(fn); },
      documentElement: { style: {} },
      body: {},
      activeElement: null,
    };
    const window = {
      location: { search, hostname: '127.0.0.1', pathname: '/blog/best-golf-sunglasses-2026/' },
      innerWidth: 375,
      innerHeight: 812,
      scrollY: 40,
      dataLayer: [],
      matchMedia: () => ({ matches: reduce }),
      scrollBy() {},
      fetch: () => { requests.push('fetch'); throw new Error('blocked'); },
      IntersectionObserver,
    };
    window.gtag = function gtag() { window.dataLayer.push(arguments); };
    const context = vm.createContext({
      window,
      document,
      URLSearchParams,
      IntersectionObserver,
    });
    vm.runInContext(source, context);
    const click = (target) => {
      const event = { target, defaultPrevented: false, preventDefault() { event.defaultPrevented = true; } };
      for (const fn of listeners.click || []) fn(event);
      return event;
    };
    return { window, picks, bar, stickyButton, compareButton, compare, observers, click };
  }

  const plain = boot('');
  const picksObserver = plain.observers[0];
  picksObserver.callback([{
    intersectionRatio: 0.4,
    boundingClientRect: { height: 420, top: 180, bottom: 600 },
    intersectionRect: { height: 168 },
    rootBounds: { height: 812 },
  }]);
  picksObserver.callback([{
    intersectionRatio: 0.25,
    boundingClientRect: { height: 2000, top: 0, bottom: 2000 },
    intersectionRect: { height: 500 },
    rootBounds: { height: 812 },
  }]);
  assert.equal(plain.window.dataLayer.length, 0);
  assert.doesNotMatch(source, /rootBounds/);
  picksObserver.callback([{
    intersectionRatio: 0.5,
    boundingClientRect: { height: 420, top: 180, bottom: 600 },
    intersectionRect: { height: 210 },
    rootBounds: { height: 812 },
  }]);
  picksObserver.callback([{
    intersectionRatio: 1,
    boundingClientRect: { height: 420, top: 180, bottom: 600 },
    intersectionRect: { height: 420 },
    rootBounds: { height: 812 },
  }]);
  assert.equal(plain.window.dataLayer.length, 1);
  assert.equal(plain.window.dataLayer[0][1], 'picks_view');
  assert.deepEqual(JSON.parse(JSON.stringify(plain.window.dataLayer[0][2])), {
    guide_slug: 'best-golf-sunglasses-2026',
    position_px: 220,
    device_category: 'mobile',
  });
  assert.equal(picksObserver.disconnected, true);
  assert.equal(plain.bar.removed, true);
  const compareClick = plain.click(plain.compareButton);
  assert.equal(compareClick.defaultPrevented, true);
  assert.equal(plain.compare.focused.preventScroll, true);
  assert.equal(plain.window.dataLayer.length, 1);
  assert.equal(requests.length, 0);

  const armed = boot('?guide_sticky=1', { reduce: true });
  assert.equal(armed.bar.removed, false);
  const stickyClick = armed.click(armed.stickyButton);
  assert.equal(stickyClick.defaultPrevented, true);
  assert.equal(armed.picks.scrolled.behavior, 'auto');
  const events = [...armed.window.dataLayer].map((entry) => entry[1]);
  assert.deepEqual(events.filter((name) => name === 'sticky_nav_click'), ['sticky_nav_click']);
  assert.deepEqual(JSON.parse(JSON.stringify(armed.window.dataLayer.at(-1)[2])), {
    guide_slug: 'best-golf-sunglasses-2026',
    variant: 'test',
  });
  assert.equal(events.includes('affiliate_click'), false);
  assert.equal(events.includes('guide_click'), false);
});

test('the guide photo waits until it is near the screen', () => {
  const layout = read('src/layouts/BlogLayout.astro');
  const hero = layout.slice(layout.indexOf('data-guide-hero-pending'), layout.indexOf('</noscript>') + '</noscript>'.length);
  assert.match(hero, /data-src=\{guidePhoto\.fallback\}/);
  assert.match(hero, /type="image\/avif"/);
  assert.match(hero, /data-srcset=\{guidePhoto\.avifSrcset\}/);
  assert.match(hero, /data-guide-hero/);
  const eager = hero.slice(0, hero.indexOf('<noscript>'));
  assert.doesNotMatch(eager, /(?<![\w-])src=\{featured_image\}/);
  assert.doesNotMatch(eager, /\ssrcset=/);
  assert.match(hero, /<noscript>[\s\S]*src=\{guidePhoto\.fallback\}/);
  assert.match(hero, /<noscript>[\s\S]*type="image\/avif"/);
  const base = read('src/layouts/BaseLayout.astro');
  assert.match(base, /guideTemplate && 'no-js'/);
  assert.match(base, /document\.documentElement\.classList\.remove\('no-js'\)/);
  assert.match(base, /\.no-js \[data-guide-hero-pending\], \.no-js \[data-guide-defer\]\{display:none\}/);
  assert.match(layout, /data-guide-defer/);
  assert.match(layout, /deferImages=\{buyerGuide\}/);
  assert.match(read('src/components/ProductBuyRow.astro'), /deferImage \?/);
  assert.match(read('src/components/ProductBuyBox.astro'), /deferImage=\{deferImages\}/);
  const source = read('public/scripts/guide-template.js');
  assert.match(source, /img\[data-guide-defer\]\[data-src\]/);
  assert.match(source, /rootMargin: '160px 0px'/);
  const photo = 'https://images.unsplash.com/photo-1724889753195-908ce4b5ab2f?w=1200&q=80';
  function run(withObserver, intersecting) {
    const img = {
      attrs: { 'data-src': photo, 'data-guide-hero': '' },
      src: 'data:image/gif;base64,placeholder',
      getAttribute: (name) => img.attrs[name] ?? null,
      removeAttribute: (name) => { delete img.attrs[name]; },
    };
    const observers = [];
    class IntersectionObserver {
      constructor(callback, options) {
        this.callback = callback;
        this.options = options;
        observers.push(this);
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    const context = {
      window: {
        location: { search: '', hostname: '127.0.0.1' },
        innerWidth: 375,
        dataLayer: [],
        matchMedia: () => ({ matches: false }),
      },
      document: {
        querySelector: () => null,
        querySelectorAll: (selector) => (selector === 'img[data-guide-hero][data-src]' ? [img] : []),
        getElementById: () => null,
        addEventListener() {},
      },
      URLSearchParams,
    };
    if (withObserver) context.IntersectionObserver = IntersectionObserver;
    vm.runInContext(source, vm.createContext(context));
    if (withObserver) {
      assert.equal(observers.length, 1);
      assert.equal(observers[0].options.rootMargin, '160px 0px');
      observers[0].callback([{ isIntersecting: intersecting, target: img }]);
      assert.equal(context.window.dataLayer.length, 0);
    }
    return img;
  }
  const waiting = run(true, false);
  assert.equal(waiting.src, 'data:image/gif;base64,placeholder');
  assert.equal(waiting.attrs['data-src'], photo);
  const shown = run(true, true);
  assert.equal(shown.src, photo);
  assert.equal(shown.attrs['data-src'], undefined);
  const immediate = run(false, false);
  assert.equal(immediate.src, photo);
});

test('buyer-guide body photos keep the real file off src', () => {
  const plugin = guideMarkdown();
  const url = 'https://images.unsplash.com/photo-1724889753195-908ce4b5ab2f?w=1200&q=80';
  const tree = { type: 'root', children: [{ type: 'image', url, alt: 'Senior golfer' }] };
  plugin(tree, { data: { astro: { frontmatter: { category: 'best' } } } });
  const image = tree.children[0];
  assert.equal(image.url, '/images/guide-photo-placeholder.gif');
  assert.equal(image.alt, 'Senior golfer');
  assert.match(image.data.hProperties['data-src'], /^\/images\/guides\/.+\.webp$/);
  assert.match(image.data.hProperties['data-srcset'], /\/images\/guides\/[^,\s]+\.webp/);
  assert.equal(image.data.hProperties['data-guide-defer'], '');
  assert.equal(image.data.hProperties.srcset, undefined);
  const other = { type: 'root', children: [{ type: 'image', url, alt: 'Senior golfer' }] };
  plugin(other, { data: { astro: { frontmatter: { category: 'reviews' } } } });
  assert.match(other.children[0].url, /^\/images\/guides\/.+\.webp$/);
  assert.equal(other.children[0].data.hProperties['data-src'], undefined);
});

test('smart quotes and a percent-encoded search URL still count as the same heading and link', () => {
  const heading = `3. Nike Air Zoom Infinity Tour NEXT% — The Athlete's Choice`;
  const rendered = `3. Nike Air Zoom Infinity Tour NEXT% — The Athlete\u2019s Choice`;
  assert.equal(foldTypography(rendered).includes(foldTypography(heading)), true);
  assert.equal(
    foldTypography('What Makes an Iron \u201CHigh Handicap Friendly\u201D?').includes(
      foldTypography('What Makes an Iron "High Handicap Friendly"?'),
    ),
    true,
  );
  const href = 'https://www.amazon.com/s?k=Nike+Air+Zoom+Infinity+Tour+NEXT%&tag=birdiereport-20';
  assert.equal(hrefSurvives(`<a href="${href.replace('%', '%25')}">`, href), true);
  assert.equal(hrefSurvives('<a href="https://www.amazon.com/s?k=other">', href), false);
});

test('every delivered guide photo is webp or avif and stays within 40KB', () => {
  const samples = {
    'best-drivers-seniors-2026': 'https://images.unsplash.com/photo-1724889753195-908ce4b5ab2f?w=1200&q=80',
    'best-golf-sunglasses-2026': 'https://images.unsplash.com/photo-1761978503733-54eba581cad4?w=1200&q=80',
    'best-golf-shoes-2026': 'https://images.pexels.com/photos/114972/pexels-photo-114972.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'best-irons-high-handicappers-2026': 'https://images.unsplash.com/photo-1691608788396-43e0e6ed9535?w=1200&q=80',
    'best-golf-cart-bags-2026': '/images/articles/sun-mountain-c130-cart-black.webp',
    'best-putters-mid-handicappers-2026': '/images/articles/golf-putter-closeup.jpg',
  };
  for (const [slug, source] of Object.entries(samples)) {
    const photo = guideDelivery(source);
    assert.ok(photo, `${slug} has no optimized photo`);
    assert.notEqual(photo.fallback, source);
    assert.notEqual(photo.social, source);
    assert.match(photo.avifSrcset, /\.avif \d+w/);
    assert.match(photo.webpSrcset, /\.webp \d+w/);
    for (const file of [...photo.variants, photo.socialFile]) {
      assert.ok(file.bytes <= GUIDE_IMAGE_BUDGET, `${file.src} manifest bytes ${file.bytes}`);
      assert.equal(statSync(join(root, 'public', file.src)).size, file.bytes);
      assert.ok(['avif', 'webp', 'jpeg'].includes(file.format));
    }
    assert.ok(photo.socialFile.format === 'jpeg');
    assert.ok(photo.variants.some((file) => file.format === 'avif'));
    assert.ok(photo.variants.some((file) => file.format === 'webp'));
  }
  const author = thumbFor('/images/kyle-reierson.jpg');
  assert.ok(author);
  assert.ok(statSync(join(root, 'public', author.src)).size <= GUIDE_IMAGE_BUDGET);
  const shoes = guideDelivery(samples['best-golf-shoes-2026']);
  assert.equal(shoes.credit, 'Markus Spiske / CC 0');
});
