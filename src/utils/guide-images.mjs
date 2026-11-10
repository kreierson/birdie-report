import manifest from '../data/guide-image-manifest.json' with { type: 'json' };
import listingManifest from '../data/listing-image-manifest.json' with { type: 'json' };

export const GUIDE_IMAGE_BUDGET = manifest.budget;
export const GUIDE_IMAGE_SIZES = manifest.sizes;

function entryFor(url) {
  if (typeof url !== 'string') return null;
  return manifest.bySource[url.trim()] || null;
}

function widest(entry, format) {
  return entry.variants
    .filter((item) => item.format === format)
    .sort((left, right) => right.width - left.width)[0] || null;
}

function srcset(entry, format) {
  return entry.variants
    .filter((item) => item.format === format)
    .sort((left, right) => left.width - right.width)
    .map((item) => `${item.src} ${item.width}w`)
    .join(', ');
}

// Responsive AVIF and WebP for one source photo. Every file is already under the budget.
export function guideDelivery(url) {
  const entry = entryFor(url);
  if (!entry) return null;
  const fallback = widest(entry, 'webp') || widest(entry, 'avif');
  if (!fallback) return null;
  return {
    sizes: GUIDE_IMAGE_SIZES,
    avifSrcset: srcset(entry, 'avif'),
    webpSrcset: srcset(entry, 'webp'),
    fallback: fallback.src,
    width: fallback.width,
    height: fallback.height,
    social: entry.social.src,
    credit: entry.credit || null,
    variants: entry.variants,
    socialFile: entry.social,
  };
}

// The on-page URL schema and markdown should use. It is the widest WebP, not the remote original.
export function deliveredSrc(url) {
  return guideDelivery(url)?.fallback || null;
}

export function deliveredSocial(url) {
  return guideDelivery(url)?.social || null;
}

// Card and listing photos. Uses generated variants when this source has them.
export function listingImage(url, sizes = '(min-width: 1024px) 33vw, 100vw') {
  const listed = typeof url === 'string' ? listingManifest[url.trim()] : null;
  if (listed) {
    return {
      src: listed.src,
      width: listed.width,
      height: listed.height,
      srcset: listed.srcset,
      sizes,
    };
  }
  const delivery = guideDelivery(url);
  if (delivery) {
    return {
      src: delivery.fallback,
      width: delivery.width,
      height: delivery.height,
      srcset: delivery.webpSrcset,
      sizes,
    };
  }
  const thumb = thumbFor(url);
  if (thumb) {
    return {
      src: thumb.src,
      width: thumb.width,
      height: thumb.height,
      srcset: `${thumb.src} ${thumb.width}w`,
      sizes,
    };
  }
  const src = typeof url === 'string' ? url : '';
  return { src, width: 1200, height: 675, srcset: src ? `${src} 1200w` : '', sizes };
}

export function thumbFor(url) {
  if (typeof url !== 'string') return null;
  const key = url.trim();
  const delivery = guideDelivery(key);
  if (delivery) {
    const smallest = [...delivery.variants].filter((item) => item.format === 'webp').sort((left, right) => left.width - right.width)[0];
    if (smallest) return { src: smallest.src, width: smallest.width, height: smallest.height };
  }
  const thumb = manifest.thumbs[key];
  if (!thumb) return null;
  return { src: thumb.src, width: thumb.width, height: thumb.height };
}

export function rewriteMarkdownImages(markdown) {
  if (typeof markdown !== 'string' || !markdown) return markdown || '';
  return markdown.replace(/!\[([^\]]*)\]\(\s*<?([^)\s>]+)>?(\s+["'][^"']*["'])?\s*\)/g, (full, alt, dest) => {
    const next = deliveredSrc(dest);
    if (!next) return full;
    return `![${alt}](${next})`;
  });
}
