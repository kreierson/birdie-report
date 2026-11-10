import { uniqueHeadingId } from '../src/utils/guide-template.mjs';
import { guideDelivery } from '../src/utils/guide-images.mjs';
import { localImageSize } from '../src/utils/image-size.mjs';

function nodeText(node) {
  if (!node) return '';
  if (node.type === 'text' || node.type === 'inlineCode') return node.value || '';
  if (node.type === 'image' || node.type === 'imageReference') return node.alt || '';
  return (node.children || []).map(nodeText).join('');
}

const PLACEHOLDER = '/images/guide-photo-placeholder.gif';

// Stable heading ids so in-page "Read review" links work without JavaScript.
// Buyer-guide photos keep their real URL off src. Chrome still downloads every
// loading=lazy image when JavaScript is disabled, including images far below
// the fold, so a lazy attribute cannot hold the no-JavaScript budget.
export default function guideMarkdown() {
  return function transform(tree, file) {
    const buyerGuide = file?.data?.astro?.frontmatter?.category === 'best';
    const used = new Map();
    const visit = (node) => {
      if (!node || typeof node !== 'object') return;
      if (node.type === 'heading') {
        const text = nodeText(node).replace(/\s+/g, ' ').trim();
        const id = uniqueHeadingId(text, used);
        node.data = node.data || {};
        node.data.hProperties = { ...(node.data.hProperties || {}), id };
      }
      if (node.type === 'image') {
        node.data = node.data || {};
        const current = node.data.hProperties || {};
        const delivery = guideDelivery(node.url || '');
        if (buyerGuide && delivery) {
          node.data.hProperties = {
            ...current,
            'data-src': delivery.fallback,
            'data-srcset': delivery.webpSrcset,
            'data-guide-defer': '',
            sizes: delivery.sizes,
            width: delivery.width,
            height: delivery.height,
            decoding: current.decoding || 'async',
          };
          node.url = PLACEHOLDER;
        } else {
          if (delivery) node.url = delivery.fallback;
          const size = delivery || localImageSize(node.url || '');
          node.data.hProperties = {
            ...current,
            ...(delivery ? {
              srcset: delivery.webpSrcset,
              sizes: delivery.sizes,
            } : {}),
            ...(size ? { width: size.width, height: size.height } : {}),
            loading: current.loading || 'lazy',
            decoding: current.decoding || 'async',
          };
        }
      }
      for (const child of node.children || []) visit(child);
    };
    visit(tree);
  };
}
