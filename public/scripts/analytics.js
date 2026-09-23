(() => {
  if (window.__birdieAnalyticsInitialized) return;
  window.__birdieAnalyticsInitialized = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };

  // Local previews and deployment previews must never send production analytics.
  if (['www.birdiereport.com', 'birdiereport.com'].includes(window.location.hostname)) {
    window.gtag('js', new Date());
    window.gtag('config', 'G-CQ60ZX50XS');
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=G-CQ60ZX50XS';
    document.head.appendChild(script);
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
