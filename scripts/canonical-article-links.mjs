import { readdirSync } from 'node:fs';
import { basename, extname } from 'node:path';
const slugs = new Set(readdirSync(new URL('../src/content/blog/', import.meta.url))
  .filter(file => ['.md', '.mdx'].includes(extname(file))).map(file => basename(file, extname(file))));
export function canonicalArticleHref(href) {
  if (typeof href !== 'string' || !(/^\/(?!\/)/.test(href) || /^https:\/\/(?:www\.)?birdiereport\.com\//.test(href))) return href;
  const url = new URL(href, 'https://www.birdiereport.com');
  // Early articles used /slug links. Resolve only exact inventory matches;
  // leave archives, unknown URLs, and external sites alone.
  const slug = url.pathname.replace(/^\/(?:blog\/)?/, '').replace(/\/$/, '');
  if (!slugs.has(slug)) return href;
  return '/blog/' + slug + '/' + url.search + url.hash;
}
export default function canonicalArticleLinks() {
  return function visit(node) {
    if (node.type === 'link') node.url = canonicalArticleHref(node.url);
    if (node.name === 'a') {
      for (const attribute of node.attributes || []) {
        if (attribute.name === 'href' && typeof attribute.value === 'string') attribute.value = canonicalArticleHref(attribute.value);
      }
    }
    for (const child of node.children || []) visit(child);
  };
}
