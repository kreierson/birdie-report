import { uniqueHeadingId } from '../src/utils/guide-template.mjs';

function nodeText(node) {
  if (!node) return '';
  if (node.type === 'text' || node.type === 'inlineCode') return node.value || '';
  if (node.type === 'image' || node.type === 'imageReference') return node.alt || '';
  return (node.children || []).map(nodeText).join('');
}

// Stable heading ids so in-page "Read review" links work without JavaScript,
// and lazy content images so below-fold guide art is not part of first paint.
export default function guideMarkdown() {
  return function transform(tree) {
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
        node.data.hProperties = {
          ...current,
          loading: current.loading || 'lazy',
          decoding: current.decoding || 'async',
        };
      }
      for (const child of node.children || []) visit(child);
    };
    visit(tree);
  };
}
