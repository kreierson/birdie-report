import test from 'node:test';
import assert from 'node:assert/strict';
import { dealSnapshot, selectLatestArticles, selectPromotedDeals } from '../src/utils/listing.mjs';

const now = new Date('2026-10-27T18:00:00Z');

test('latest articles follow the publish date, newest first', () => {
  const posts = [
    { slug: 'march-30', data: { date: '2026-03-30', updated: '2026-10-19', category: 'tips' } },
    { slug: 'june-30', data: { date: '2026-06-30', updated: '2026-10-12', category: 'reviews' } },
    { slug: 'march-16', data: { date: '2026-03-16', updated: '2026-10-12', category: 'tips' } },
    { slug: 'hero', data: { date: '2026-07-16', updated: '2026-10-19', category: 'reviews' } },
    { slug: 'sept-23', data: { date: '2026-09-23', category: 'reviews' } },
  ];
  assert.deepEqual(
    selectLatestArticles(posts, { excludeSlug: 'hero' }).map((post) => post.slug),
    ['sept-23', 'june-30', 'march-30', 'march-16']
  );
});

test('same publish dates break ties by slug without using the refresh date', () => {
  const posts = [
    { slug: 'b', data: { date: '2026-08-19', updated: '2026-10-01' } },
    { slug: 'a', data: { date: '2026-08-19', updated: '2026-01-01' } },
  ];
  assert.deepEqual(selectLatestArticles(posts).map((post) => post.slug), ['a', 'b']);
});

test('expired deal checks are not promoted and posts are kept classifiable', () => {
  const august = { slug: 'aug-19', data: { category: 'deals', date: '2026-08-19' } };
  const yesterday = { slug: 'yesterday', data: { category: 'deals', date: '2026-10-26' } };
  const today = { slug: 'today', data: { category: 'deals', date: '2026-10-27' } };
  const refreshed = { slug: 'refreshed', data: { category: 'deals', date: '2026-08-01', updated: '2026-10-27' } };
  const staleRefresh = { slug: 'stale-refresh', data: { category: 'deals', date: '2026-10-27', updated: '2026-08-01' } };
  const review = { slug: 'review', data: { category: 'reviews', date: '2026-03-16' } };

  assert.equal(dealSnapshot(august, now).expired, true);
  assert.equal(dealSnapshot(yesterday, now).expired, true);
  assert.equal(dealSnapshot(today, now).expired, false);
  assert.equal(dealSnapshot(refreshed, now).expired, false);
  assert.equal(dealSnapshot(staleRefresh, now).expired, false);
  assert.equal(dealSnapshot(review, now), null);
  assert.equal(dealSnapshot({ slug: 'bad', data: { category: 'deals', date: 'not-a-date' } }, now).expired, true);
  assert.deepEqual(
    selectPromotedDeals([august, yesterday, today, refreshed, staleRefresh, review], now).map((post) => post.slug),
    ['stale-refresh', 'today', 'refreshed']
  );
});
