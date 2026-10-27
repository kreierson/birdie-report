(() => {
  if (window.__birdieAnalyticsInitialized) return;
  window.__birdieAnalyticsInitialized = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };

  const PROD_HOSTS = ['www.birdiereport.com', 'birdiereport.com'];
  const MEASUREMENT_ID = 'G-CQ60ZX50XS';
  const VISIBLE_DELAY_MS = 3000;
  const HUMAN_EVENTS = ['pointerdown', 'keydown', 'touchstart', 'scroll', 'wheel', 'mousemove'];

  const nav = typeof navigator !== 'undefined' ? navigator : {};
  const ua = nav.userAgent || '';
  // CUBOT phones contain the letters "bot". Strip that model name before the bot test.
  const automated = nav.webdriver === true
    || /HeadlessChrome|Headless|PhantomJS|Puppeteer|Playwright|Selenium|Lighthouse|Chrome-Lighthouse|PTST|GTmetrix|crawler|spider|crawling|preview/i.test(ua)
    || /bot\b/i.test(ua.replace(/cubot/ig, ''));

  // Owner opt-out: open production once with ?birdie_internal=1 (?birdie_internal=0 clears it).
  // The hit is labeled traffic_type=internal. GA4 drops it only after an Internal traffic
  // data filter is created for that value.
  try {
    const search = (window.location && window.location.search) || '';
    const flag = new URLSearchParams(search).get('birdie_internal');
    if (flag === '1') localStorage.setItem('birdie_internal', '1');
    if (flag === '0') localStorage.removeItem('birdie_internal');
  } catch { /* private mode or blocked storage */ }
  let internal = false;
  try { internal = localStorage.getItem('birdie_internal') === '1'; } catch { /* ignore */ }

  const eligible = PROD_HOSTS.includes(window.location.hostname) && !automated;
  let started = false;
  let visibleTimer = null;

  function onHuman() { start(); }

  function armTimer() {
    if (started || typeof setTimeout !== 'function' || typeof clearTimeout !== 'function') return;
    if (document.visibilityState === 'visible' && visibleTimer === null) {
      visibleTimer = setTimeout(() => {
        visibleTimer = null;
        if (document.visibilityState === 'visible') start();
      }, VISIBLE_DELAY_MS);
    }
    if (document.visibilityState !== 'visible' && visibleTimer !== null) {
      clearTimeout(visibleTimer);
      visibleTimer = null;
    }
  }

  function start(options = {}) {
    if (started || !eligible) return;
    started = true;
    if (visibleTimer !== null) {
      clearTimeout(visibleTimer);
      visibleTimer = null;
    }
    for (const eventName of HUMAN_EVENTS) document.removeEventListener(eventName, onHuman, true);
    document.removeEventListener('visibilitychange', armTimer);

    // Events queued before config (guide-plan views, for example) are dropped
    // when gtag.js drains dataLayer. Replay them after this property is configured.
    const queued = window.dataLayer.splice(0, window.dataLayer.length);
    window.gtag('js', new Date());
    if (internal) window.gtag('config', MEASUREMENT_ID, { traffic_type: 'internal' });
    else window.gtag('config', MEASUREMENT_ID);
    for (const entry of queued) window.dataLayer.push(entry);

    const script = document.createElement('script');
    script.async = true;
    // Affiliate clicks raise priority so the library can flush while this tab stays open.
    if (options.fetchPriority) script.fetchPriority = options.fetchPriority;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + MEASUREMENT_ID;
    document.head.appendChild(script);
  }

  // Production only, after a real interaction or 3s with the tab visible.
  // The 0-engagement direct cluster leaves before either signal. Screen size is
  // not a filter: those bot viewports change and can match real desktops.
  // Tradeoff: a bounce under 3s with no interaction is not measured.
  if (eligible) {
    for (const eventName of HUMAN_EVENTS) {
      document.addEventListener(eventName, onHuman, { capture: true, passive: true, once: true });
    }
    document.addEventListener('visibilitychange', armTimer);
    armTimer();
  }

  function track(event) {
    if (event.type === 'auxclick' && event.button !== 1) return;
    if (event.type === 'click' && event.button !== 0) return;
    const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
    if (!link) return;
    const url = new URL(link.href, window.location.href);
    if (!['https:', 'http:'].includes(url.protocol) || url.hostname === window.location.hostname) return;
    const amazon = url.hostname === 'amazon.com' || url.hostname.endsWith('.amazon.com');
    const taggedAmazon = amazon && Boolean(url.searchParams.get('tag'));
    if (!taggedAmazon && link.dataset.affiliateLink !== 'true') return;
    start({ fetchPriority: 'high' });
    window.gtag('event', 'affiliate_click', {
      product_name: (link.dataset.product || link.textContent || 'Retailer link').trim().slice(0, 100),
      retailer: amazon ? 'Amazon' : (link.dataset.retailer || url.hostname),
      placement: link.dataset.placement || 'article-body-link',
      link_url: url.href,
      page_path: window.location.pathname,
      transport_type: 'beacon',
    });
  }
  // One delegated handler also covers cards outside BlogLayout and SVG clicks.
  document.addEventListener('click', track);
  document.addEventListener('auxclick', track);
})();
