import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalArticleHref } from './canonical-article-links.mjs';
import { selectRelatedPosts } from '../src/utils/discovery.mjs';
test('article normalization only rewrites known destinations and preserves query/fragment', () => {
  assert.equal(canonicalArticleHref('/blog/best-golf-bags-2026?ref=guide#fit'), '/blog/best-golf-bags-2026/?ref=guide#fit');
  assert.equal(canonicalArticleHref('https://birdiereport.com/blog/best-golf-bags-2026'), '/blog/best-golf-bags-2026/');
  for (const href of ['/blog/not-a-real-article', 'https://evil.example/blog/best-golf-bags-2026', '/tags/golf/', '#fit']) assert.equal(canonicalArticleHref(href), href);
});
test('related reading prioritizes the same equipment over unrelated recent posts', () => {
  const make = (slug, title, date) => ({ slug, data: { title, date, category: 'reviews', tags: ['golf', '2026'] } });
  const current = make('current', 'Best golf rangefinders', '2026-01-01');
  const posts = [current, make('shoes', 'Golf shoes review', '2026-09-28'), make('rangefinder', 'Bushnell Tour V6 rangefinder review', '2026-01-01')];
  assert.deepEqual(selectRelatedPosts(posts, current).map(post => post.slug), ['rangefinder']);
});
