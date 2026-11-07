// Buyer-guide measurement for the mobile template.
// guide_click stays in the open measurement change (PR 20) and is not handled here.
// A queued gtag event is not proof that GA4 ingested it. Production delivery
// still depends on public/scripts/analytics.js, which does not load off production
// and does not load for bots, previews, or prefetch.
(() => {
  if (window.__birdieGuideTemplateInitialized) return;
  window.__birdieGuideTemplateInitialized = true;

  const reduce = typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function track(name, params) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments); };
    window.gtag('event', name, params);
  }

  function deviceCategory() {
    const width = window.innerWidth || 0;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  // Half of the picks panel itself. A panel taller than the viewport can
  // never reach this ratio, so covering half the screen is not enough.
  function halfVisible(entry) {
    return Number(entry?.intersectionRatio) >= 0.5;
  }

  const picks = document.querySelector('[data-picks-view]');
  if (picks && typeof IntersectionObserver === 'function') {
    let fired = false;
    const observer = new IntersectionObserver((entries) => {
      if (fired) return;
      const entry = entries[0];
      if (!entry || !halfVisible(entry)) return;
      fired = true;
      observer.disconnect();
      const rect = typeof picks.getBoundingClientRect === 'function' ? picks.getBoundingClientRect() : { top: 0 };
      track('picks_view', {
        guide_slug: picks.getAttribute('data-guide-slug') || '',
        position_px: Math.round((window.scrollY || 0) + rect.top),
        device_category: deviceCategory(),
      });
    }, { threshold: [0, 0.5] });
    observer.observe(picks);
  }

  function jump(id) {
    const target = id ? document.getElementById(id) : null;
    if (!target) return;
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    if (typeof target.focus === 'function') target.focus({ preventScroll: true });
    if (typeof target.scrollIntoView === 'function') {
      target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    }
  }

  document.addEventListener('click', (event) => {
    const target = event.target;
    const button = target && typeof target.closest === 'function' ? target.closest('[data-guide-jump]') : null;
    if (!button) return;
    if (button.hasAttribute('data-sticky-nav-click')) {
      const bar = button.closest('[data-guide-sticky-nav]');
      if (!bar || bar.getAttribute('data-variant') !== 'test') return;
      track('sticky_nav_click', {
        guide_slug: bar.getAttribute('data-guide-slug') || '',
        variant: 'test',
      });
    }
    if (typeof event.preventDefault === 'function') event.preventDefault();
    jump(button.getAttribute('data-guide-jump'));
  });

  // Static pages cannot read the query at build time. The bar ships hidden and
  // is removed unless this request explicitly opts into the test arm.
  const bar = document.querySelector('[data-guide-sticky-nav]');
  const stickyRequested = new URLSearchParams(window.location.search || '').get('guide_sticky') === '1';
  if (!bar || !stickyRequested || bar.getAttribute('data-variant') !== 'test') {
    if (bar && typeof bar.remove === 'function') bar.remove();
    return;
  }

  const picksBox = document.getElementById('guide-top-picks');
  const bottomLink = document.querySelector('[data-placement="article-bottom-buy-box"]');
  const bottom = bottomLink && typeof bottomLink.closest === 'function' ? bottomLink.closest('section') : null;
  let picksOut = false;
  let bottomNear = false;

  function renderBar() {
    const show = picksOut && !bottomNear;
    bar.hidden = !show;
    bar.classList.toggle('hidden', !show);
    document.documentElement.style.scrollPaddingBottom = show ? '4.5rem' : '';
  }

  if (typeof IntersectionObserver === 'function' && picksBox) {
    const picksWatcher = new IntersectionObserver((entries) => {
      const entry = entries[0];
      picksOut = Boolean(entry) && !entry.isIntersecting && entry.boundingClientRect.bottom < 0;
      renderBar();
    }, { threshold: 0 });
    picksWatcher.observe(picksBox);
  }

  if (typeof IntersectionObserver === 'function' && bottom) {
    const bottomWatcher = new IntersectionObserver((entries) => {
      bottomNear = Boolean(entries[0]?.isIntersecting);
      renderBar();
    }, { rootMargin: '0px 0px 80px 0px', threshold: 0 });
    bottomWatcher.observe(bottom);
  }

  document.addEventListener('focusin', () => {
    if (bar.hidden) return;
    const active = document.activeElement;
    if (!active || active === document.body || bar.contains(active)) return;
    if (typeof active.getBoundingClientRect !== 'function') return;
    const rect = active.getBoundingClientRect();
    const limit = (window.innerHeight || 0) - 60;
    if (rect.bottom > limit && rect.top < (window.innerHeight || 0)) {
      window.scrollBy({ top: rect.bottom - limit + 8, behavior: reduce ? 'auto' : 'smooth' });
    }
  });
})();
