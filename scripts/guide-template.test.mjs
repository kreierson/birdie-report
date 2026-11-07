import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { resolveQuickPicks } from '../src/utils/quick-picks.mjs';
import {
  buildGuideModel,
  compareJumpLabel,
  containsPriceText,
  formatGuideDate,
  guideRetailerCta,
  inspectRetailerUrl,
  isBuyerGuide,
  researchDisclosure,
  stickyNavRequested,
  topPicksHeading,
} from '../src/utils/guide-template.mjs';
import { foldTypography, hrefSurvives } from './validate-guide-template.mjs';

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
  assert.doesNotMatch(analytics, /guide_click|picks_view|sticky_nav_click/);
});

test('retailer labels follow direct versus search and prices stay out of the new fields', () => {
  assert.equal(guideRetailerCta({ direct: true, retailer: 'Amazon' }), 'Check Amazon');
  assert.equal(guideRetailerCta({ direct: false, retailer: 'Amazon' }), 'See options on Amazon');
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
  const { model } = modelFor('best-golf-cart-bags-2026');
  assert.equal(model.top.length, 3);
  assert.equal(model.rows.length, 5);
  assert.equal(model.jumpLabel, 'Compare all 5 picks');
  const pioneer = model.rows.find((row) => row.product === 'PING Pioneer');
  assert.equal(field(pioneer, 'Published empty weight'), '8 lb');
  assert.equal(field(pioneer, 'Dividers'), '15-way top; enlarged putter well');
  assert.equal(pioneer.cta, 'See options on Amazon');
  assert.match(pioneer.reviewHref, /^#ping-pioneer/);
  const titleist = model.rows.find((row) => row.product === 'Titleist Cart 14');
  assert.equal(titleist.cta, 'Check Amazon');
  assert.match(titleist.accessibleName, /Check Amazon for Titleist Cart 14 \(opens in a new tab\)/);
  const callaway = model.rows.find((row) => row.product === 'Callaway Quantum ORG 14');
  assert.equal(field(callaway, 'Published empty weight'), 'Not stated on cited page');
  const taylor = model.rows.find((row) => row.product === 'TaylorMade Cart Lite');
  assert.equal(field(taylor, 'Published empty weight'), 'Conflicting figures*');
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
  assert.equal(editorialPrice.top[0].cta, 'See options on Amazon');
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
  assert.equal(plain.window.dataLayer.length, 0);
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
