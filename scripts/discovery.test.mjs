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

import { archivePages, archiveHref, ARCHIVE_PAGE_SIZE } from '../src/utils/archive.mjs';
test('archive pagination preserves every article exactly once with stable ordering and canonical links', () => {
  const posts = Array.from({length: 1063}, (_, i) => ({slug: `article-${String(i).padStart(4, '0')}`, data: {date: new Date('2026-01-01')}}));
  const pages = archivePages([...posts].reverse());
  assert.equal(pages.length, 30);
  assert.equal(pages[0].posts.length, ARCHIVE_PAGE_SIZE);
  assert.equal(pages.at(-1).posts.length, 19);
  assert.deepEqual(pages.flatMap(page => page.posts.map(post => post.slug)), posts.map(post => post.slug));
  assert.equal(archiveHref(1), '/blog/');
  assert.equal(archiveHref(30), '/blog/page/30/');
  assert.equal(archivePages(posts.slice(0,36)).length, 1);
});

import { comparisonPages, comparisonHref, comparisonData } from '../src/utils/comparisons.mjs';
test('comparison archive preserves the full filter inventory across page boundaries', () => {
  const posts = Array.from({length: 333}, (_, i) => ({slug: `compare-${String(i).padStart(3, '0')}`, data: {category: 'versus', subcategory: i % 2 ? 'balls' : 'irons', date: new Date('2026-01-01'), title: `Comparison ${i}`}}));
  const pages = comparisonPages([...posts].reverse().concat({slug: 'other', data: {category: 'tips'}}));
  assert.equal(pages.length, 10);
  assert.equal(pages.at(-1).posts.length, 9);
  const data = pages.flatMap(page => page.posts).map(comparisonData);
  assert.equal(new Set(data.map(post => post.href)).size, 333);
  assert.equal(data.filter(post => post.subcategory === 'balls').length, 166);
  assert.equal(data[0].date, '2026-01-01');
  assert.equal(comparisonHref(1), '/versus/');
  assert.equal(comparisonHref(10), '/versus/page/10/');
});
