import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dealAsOfKey, dealSnapshot, isAsOfExpired, selectLatestArticles, selectPromotedDeals } from '../src/utils/listing.mjs';
import { refreshDeals } from '../src/utils/deal-freshness.mjs';

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

test('latest articles skip expired deals before the limit is applied', () => {
  const posts = [
    { slug: 'expired-deal', data: { category: 'deals', date: '2026-10-26' } },
    { slug: 'today-deal', data: { category: 'deals', date: '2026-10-27' } },
    { slug: 'older-tip', data: { category: 'tips', date: '2026-10-01' } },
    { slug: 'oldest-tip', data: { category: 'tips', date: '2026-09-01' } },
  ];
  assert.deepEqual(
    selectLatestArticles(posts, { now, limit: 2 }).map((post) => post.slug),
    ['today-deal', 'older-tip']
  );
  assert.equal(isAsOfExpired('2026-10-26', now), true);
  assert.equal(isAsOfExpired('2026-10-27', now), false);
  assert.equal(isAsOfExpired('', now), true);
  assert.equal(dealAsOfKey('2026-08-19'), '2026-08-19');
  assert.equal(dealAsOfKey(now), '2026-10-27');
});

function node({ attrs = {}, hidden = false, text = '', children = [] } = {}) {
  const el = {
    attributes: new Map(Object.entries(attrs)),
    hidden,
    textContent: text,
    children,
    parent: null,
    hasAttribute(name) {
      return this.attributes.has(name);
    },
    getAttribute(name) {
      return this.attributes.has(name) ? this.attributes.get(name) : null;
    },
    querySelectorAll(selector) {
      const attr = selector.slice(1, -1);
      const matches = [];
      const walk = (current) => {
        for (const child of current.children) {
          if (child.attributes.has(attr)) matches.push(child);
          walk(child);
        }
      };
      walk(this);
      return matches;
    },
    querySelector(selector) {
      return this.querySelectorAll(selector)[0] ?? null;
    },
    remove() {
      if (!this.parent) return;
      this.parent.children = this.parent.children.filter((child) => child !== this);
      this.parent = null;
    },
  };
  for (const child of children) child.parent = el;
  return el;
}

test('client refresh removes promoted deals after their as-of day and marks archive cards', () => {
  const yesterday = node({ attrs: { 'data-deal-as-of': '2026-10-26', 'data-deal-promote': '' } });
  const today = node({ attrs: { 'data-deal-as-of': '2026-10-27', 'data-deal-promote': '' } });
  const group = node({ attrs: { 'data-deal-promote-group': '' }, children: [yesterday, today] });
  const badge = node({ attrs: { 'data-deal-expired-badge': '' }, hidden: true });
  const note = node({ attrs: { 'data-deal-expired-note': '' }, hidden: true });
  const label = node({ attrs: { 'data-deal-state-label': '' }, text: 'Featured' });
  const archive = node({
    attrs: { 'data-deal-as-of': '2026-10-26' },
    children: [badge, note, label],
  });
  const root = node({ children: [group, archive] });

  refreshDeals(root, now);

  assert.equal(group.children.includes(yesterday), false);
  assert.equal(group.children.includes(today), true);
  assert.equal(root.children.includes(group), true);
  assert.equal(root.children.includes(archive), true);
  assert.equal(badge.hidden, false);
  assert.equal(note.hidden, false);
  assert.equal(label.textContent, 'Expired');

  today.attributes.set('data-deal-as-of', '2026-10-26');
  refreshDeals(root, now);
  assert.equal(root.children.includes(group), false);
  assert.equal(root.children.includes(archive), true);
});

test('homepage and the deals archive expose as-of dates for the client check', () => {
  const index = readFileSync(new URL('../src/pages/index.astro', import.meta.url), 'utf8');
  const category = readFileSync(new URL('../src/components/CategoryPage.astro', import.meta.url), 'utf8');
  assert.match(index, /data-deal-promote-group/);
  assert.match(index, /data-deal-promote/);
  assert.match(index, /data-deal-as-of=\{dealAsOfKey\(dealAsOf\(post\.data\)\)\}/);
  assert.match(index, /<DealFreshness/);
  assert.match(category, /data-deal-expired-badge/);
  assert.match(category, /data-deal-expired-note/);
  assert.match(category, /data-deal-state-label/);
  assert.match(category, /<DealFreshness/);
});
