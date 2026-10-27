import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../public/scripts/analytics.js', import.meta.url), 'utf8');
const VISIBLE_DELAY_MS = Number(source.match(/const VISIBLE_DELAY_MS = (\d+);/)[1]);
const MEASUREMENT_ID = 'G-CQ60ZX50XS';
const CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const AMAZON = 'https://www.amazon.com/s?k=shaft&tag=birdiereport-20';

function memoryStorage(initial = {}) {
  const data = { ...initial };
  return {
    data,
    getItem(key) { return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null; },
    setItem(key, value) { data[key] = String(value); },
    removeItem(key) { delete data[key]; },
  };
}

function setup(host = '127.0.0.1', navigator = { userAgent: CHROME }, options = {}) {
  const handlers = {};
  const listenerOptions = {};
  const scripts = [];
  const storage = options.storage ?? memoryStorage();
  let now = 0;
  let nextTimerId = 1;
  const timers = new Map();
  const setTimeout = (fn, ms) => {
    const id = nextTimerId++;
    timers.set(id, { fn, due: now + ms, cleared: false, fired: false });
    return id;
  };
  const clearTimeout = (id) => {
    const timer = timers.get(id);
    if (timer) timer.cleared = true;
  };
  class Element {
    constructor(link) { this.link = link; }
    closest() { return this.link; }
  }
  const window = {
    location: {
      hostname: host,
      href: `https://${host}/blog/test/${options.search || ''}`,
      pathname: '/blog/test/',
      search: options.search || '',
    },
    localStorage: storage,
  };
  const document = {
    visibilityState: options.visibility || 'visible',
    head: { appendChild: (script) => scripts.push(script) },
    createElement: () => ({}),
    addEventListener(name, fn, listenerOpts) {
      (handlers[name] ??= []).push(fn);
      (listenerOptions[name] ??= []).push(listenerOpts);
    },
    removeEventListener(name, fn) {
      handlers[name] = (handlers[name] ?? []).filter((candidate) => candidate !== fn);
    },
  };
  const context = vm.createContext({
    window,
    document,
    Element,
    URL,
    URLSearchParams,
    navigator,
    localStorage: storage,
    setTimeout,
    clearTimeout,
  });
  vm.runInContext(source, context);
  const click = (href, { type = 'click', button = 0, data = {}, text = 'Test product' } = {}) => {
    const link = { href, dataset: data, textContent: text };
    for (const fn of [...(handlers[type] ?? [])]) fn({ type, button, target: new Element(link) });
  };
  const human = (name) => {
    for (const fn of [...(handlers[name] ?? [])]) fn({ type: name });
  };
  const advance = (ms) => {
    now += ms;
    const due = [...timers.values()]
      .filter((timer) => !timer.cleared && !timer.fired && timer.due <= now)
      .sort((a, b) => a.due - b.due);
    for (const timer of due) {
      if (timer.cleared || timer.fired) continue;
      timer.fired = true;
      timer.fn();
    }
  };
  const setVisibility = (state) => {
    document.visibilityState = state;
    for (const fn of [...(handlers.visibilitychange ?? [])]) fn();
  };
  return { window, document, scripts, click, human, advance, setVisibility, storage, context, listenerOptions };
}

function commands(dataLayer) {
  // Copy out of the vm realm so deep equality is not rejected on prototypes.
  return [...dataLayer].map((entry) => (entry[0] === 'event' ? String(entry[1]) : String(entry[0])));
}

test('visible delay stays 3 seconds', () => {
  assert.equal(VISIBLE_DELAY_MS, 3000);
});

test('local preview is offline; repeated initialization and nested element click emit once', () => {
  const s = setup();
  vm.runInContext(source, s.context);
  s.click(AMAZON);
  assert.equal(s.scripts.length, 0);
  assert.equal(s.window.dataLayer.length, 1);
  assert.equal(s.window.dataLayer[0][1], 'affiliate_click');
  assert.equal(s.window.dataLayer[0][2].page_path, '/blog/test/');
});

test('manufacturer, internal, untagged and lookalike domains are not affiliate events', () => {
  const s = setup();
  for (const url of [
    'https://kbsgolfshafts.com/products/tour',
    'https://127.0.0.1/blog/other/',
    'https://amazon.com/s?k=shaft',
    'https://notamazon.com/?tag=birdiereport-20',
  ]) s.click(url);
  assert.equal(s.window.dataLayer.length, 0);
});

test('middle click and explicitly marked non-Amazon retailer work without right-click events', () => {
  const s = setup();
  s.click('https://amazon.com/?tag=test-20', { type: 'auxclick', button: 2 });
  s.click('https://amazon.com/?tag=test-20', { type: 'auxclick', button: 1 });
  s.click('https://retailer.example/product', { data: { affiliateLink: 'true', retailer: 'Retailer', placement: 'product-card' } });
  assert.equal(s.window.dataLayer.length, 2);
  assert.equal(s.window.dataLayer[0][2].retailer, 'Amazon');
  assert.equal(s.window.dataLayer[0][2].placement, 'article-body-link');
  assert.equal(s.window.dataLayer[0][2].product_name, 'Test product');
  assert.equal(s.window.dataLayer[1][2].retailer, 'Retailer');
  assert.equal(s.window.dataLayer[1][2].placement, 'product-card');
  assert.equal(s.window.dataLayer[1][2].transport_type, 'beacon');
});

test('production human listeners are passive and GA stays unloaded until a human signal', () => {
  for (const host of ['www.birdiereport.com', 'birdiereport.com']) {
    const s = setup(host);
    vm.runInContext(source, s.context);
    assert.equal(s.scripts.length, 0);
    assert.equal(s.window.dataLayer.length, 0);
    for (const name of ['pointerdown', 'keydown', 'touchstart', 'scroll', 'wheel', 'mousemove']) {
      const options = s.listenerOptions[name][0];
      assert.equal(options.capture, true);
      assert.equal(options.passive, true);
      assert.equal(options.once, true);
    }
    s.advance(VISIBLE_DELAY_MS - 1);
    assert.equal(s.scripts.length, 0);
    s.human('pointerdown');
    s.human('scroll');
    s.advance(VISIBLE_DELAY_MS);
    assert.equal(s.scripts.length, 1);
    assert.equal(s.scripts[0].async, true);
    assert.equal(s.scripts[0].src, `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`);
    assert.equal(s.scripts[0].fetchPriority, undefined);
    assert.deepEqual(commands(s.window.dataLayer), ['js', 'config']);
    assert.equal(s.window.dataLayer[1][1], MEASUREMENT_ID);
    assert.equal(s.window.dataLayer[1].length, 2);
    assert.equal(Object.prototype.toString.call(s.window.dataLayer[0][1]), '[object Date]');
  }
});

test('three visible seconds load GA once, and hiding the tab cancels the timer', () => {
  const visible = setup('www.birdiereport.com');
  visible.advance(VISIBLE_DELAY_MS);
  assert.equal(visible.scripts.length, 1);

  const hidden = setup('www.birdiereport.com', { userAgent: CHROME }, { visibility: 'hidden' });
  hidden.advance(VISIBLE_DELAY_MS * 2);
  assert.equal(hidden.scripts.length, 0);
  hidden.setVisibility('visible');
  hidden.advance(VISIBLE_DELAY_MS - 1);
  assert.equal(hidden.scripts.length, 0);
  hidden.advance(1);
  assert.equal(hidden.scripts.length, 1);

  const interrupted = setup('www.birdiereport.com');
  interrupted.advance(1000);
  interrupted.setVisibility('hidden');
  interrupted.advance(VISIBLE_DELAY_MS);
  assert.equal(interrupted.scripts.length, 0);
  interrupted.setVisibility('visible');
  interrupted.advance(VISIBLE_DELAY_MS);
  assert.equal(interrupted.scripts.length, 1);

  const stale = setup('www.birdiereport.com');
  stale.document.visibilityState = 'hidden';
  stale.advance(VISIBLE_DELAY_MS);
  assert.equal(stale.scripts.length, 0);
});

test('previews and automation never load GA, including after interaction, waiting, or an affiliate click', () => {
  const preview = setup('birdie-report-preview.vercel.app');
  preview.human('pointerdown');
  preview.advance(VISIBLE_DELAY_MS);
  preview.click(AMAZON, { data: { product: 'KBS Tour', placement: 'buy-box' } });
  assert.equal(preview.scripts.length, 0);
  assert.equal(preview.window.dataLayer.at(-1)[1], 'affiliate_click');

  const bots = [
    { webdriver: true, userAgent: CHROME },
    { userAgent: 'Mozilla/5.0 HeadlessChrome/131.0.0.0' },
    { userAgent: `${CHROME} Playwright` },
    { userAgent: `${CHROME} Chrome-Lighthouse` },
    { userAgent: `${CHROME} GTmetrix` },
    { userAgent: 'Mozilla/5.0 PTST/240515' },
    { userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' },
    { userAgent: 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/534+ (KHTML, like Gecko) BingPreview/1.0b' },
    { userAgent: 'Mozilla/5.0 PhantomJS' },
    { userAgent: 'Mozilla/5.0 Selenium' },
  ];
  for (const navigator of bots) {
    const s = setup('www.birdiereport.com', navigator);
    s.human('pointerdown');
    s.human('mousemove');
    s.advance(VISIBLE_DELAY_MS * 2);
    s.click(AMAZON, { data: { product: 'KBS Tour', retailer: 'Amazon', placement: 'buy-box' } });
    assert.equal(s.scripts.length, 0, navigator.userAgent);
    const hit = s.window.dataLayer.at(-1);
    assert.equal(hit[1], 'affiliate_click');
    assert.equal(hit[2].product_name, 'KBS Tour');
    assert.equal(hit[2].retailer, 'Amazon');
    assert.equal(hit[2].placement, 'buy-box');
    assert.equal(commands(s.window.dataLayer).includes('config'), false);
  }
});

test('CUBOT phones are real visitors and still wait for a human signal', () => {
  const cubot = 'Mozilla/5.0 (Linux; Android 12; CUBOT NOTE 20) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.61 Mobile Safari/537.36';
  const s = setup('www.birdiereport.com', { userAgent: cubot, webdriver: false });
  s.advance(VISIBLE_DELAY_MS - 1);
  assert.equal(s.scripts.length, 0);
  s.human('touchstart');
  assert.equal(s.scripts.length, 1);
  assert.equal(s.window.dataLayer[1].length, 2);
});

test('an affiliate click on production loads GA before the event and keeps product, retailer, and placement', () => {
  const s = setup('www.birdiereport.com');
  assert.equal(s.scripts.length, 0);
  s.window.gtag('event', 'guide_plan_view', { experiment_id: 'guide-shortlist-v1', page_path: '/best/' });
  s.click('https://amazon.com/s?k=shaft');
  assert.equal(s.scripts.length, 0);
  s.click(AMAZON, { data: { product: '  KBS Tour  ', placement: 'buy-box' } });
  s.advance(VISIBLE_DELAY_MS);
  assert.equal(s.scripts.length, 1);
  assert.equal(s.scripts[0].async, true);
  assert.equal(s.scripts[0].fetchPriority, 'high');
  assert.equal(s.scripts[0].src, `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`);
  assert.deepEqual(commands(s.window.dataLayer), ['js', 'config', 'guide_plan_view', 'affiliate_click']);
  const hit = s.window.dataLayer.at(-1)[2];
  assert.equal(hit.product_name, 'KBS Tour');
  assert.equal(hit.retailer, 'Amazon');
  assert.equal(hit.placement, 'buy-box');
  assert.equal(hit.page_path, '/blog/test/');
  assert.equal(hit.transport_type, 'beacon');
  assert.equal(hit.link_url, AMAZON);
  assert.equal(s.window.dataLayer[2][2].experiment_id, 'guide-shortlist-v1');
  const long = setup('www.birdiereport.com');
  long.click(AMAZON, { data: { product: ` ${'A'.repeat(120)} ` } });
  assert.equal(long.window.dataLayer.at(-1)[2].product_name.length, 100);
});

test('?birdie_internal=1 tags this browser and =0 clears it', () => {
  const storage = memoryStorage();
  const flagged = setup('www.birdiereport.com', { userAgent: CHROME }, { search: '?qa=1&birdie_internal=1', storage });
  assert.equal(storage.getItem('birdie_internal'), '1');
  assert.equal(flagged.scripts.length, 0);
  flagged.advance(VISIBLE_DELAY_MS - 1);
  assert.equal(flagged.scripts.length, 0);
  flagged.human('keydown');
  assert.equal(flagged.scripts.length, 1);
  assert.equal(flagged.window.dataLayer[1][0], 'config');
  assert.equal(flagged.window.dataLayer[1][1], MEASUREMENT_ID);
  assert.equal(JSON.stringify(flagged.window.dataLayer[1][2]), JSON.stringify({ traffic_type: 'internal' }));

  const persisted = setup('birdiereport.com', { userAgent: CHROME }, { storage });
  persisted.advance(VISIBLE_DELAY_MS);
  assert.equal(persisted.scripts.length, 1);
  assert.equal(JSON.stringify(persisted.window.dataLayer[1][2]), JSON.stringify({ traffic_type: 'internal' }));

  const ignored = setup('www.birdiereport.com', { userAgent: CHROME }, { search: '?birdie_internal=true' });
  ignored.human('pointerdown');
  assert.equal(ignored.storage.getItem('birdie_internal'), null);
  assert.equal(ignored.window.dataLayer[1].length, 2);

  const cleared = setup('www.birdiereport.com', { userAgent: CHROME }, { search: '?birdie_internal=0', storage });
  assert.equal(storage.getItem('birdie_internal'), null);
  cleared.human('scroll');
  assert.equal(cleared.scripts.length, 1);
  assert.equal(cleared.window.dataLayer[1].length, 2);

  const preview = setup('127.0.0.1', { userAgent: CHROME }, { search: '?birdie_internal=1' });
  preview.human('pointerdown');
  preview.advance(VISIBLE_DELAY_MS);
  preview.click(AMAZON);
  assert.equal(preview.scripts.length, 0);
  assert.equal(preview.storage.getItem('birdie_internal'), '1');
  assert.equal(preview.window.dataLayer.length, 1);
});

test('blocked storage still tracks affiliate clicks and does not throw', () => {
  const storage = {
    getItem() { throw new Error('denied'); },
    setItem() { throw new Error('denied'); },
    removeItem() { throw new Error('denied'); },
  };
  const local = setup('127.0.0.1', { userAgent: CHROME }, { search: '?birdie_internal=1', storage });
  local.click(AMAZON, { data: { product: 'KBS Tour', placement: 'article-body-link' } });
  assert.equal(local.scripts.length, 0);
  assert.equal(local.window.dataLayer[0][1], 'affiliate_click');
  assert.equal(local.window.dataLayer[0][2].placement, 'article-body-link');

  const production = setup('www.birdiereport.com', { userAgent: CHROME }, { search: '?birdie_internal=1', storage });
  production.human('pointerdown');
  assert.equal(production.scripts.length, 1);
  assert.equal(production.window.dataLayer[1].length, 2);
});
