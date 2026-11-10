import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GIFT_TILE, HOME_TILES, mostUsedGuides, showsPriceClaim, tilesFor } from '../src/utils/home-router.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const index = readFileSync(join(root, 'src/pages/index.astro'), 'utf8');
const router = readFileSync(join(root, 'src/utils/home-router.mjs'), 'utf8');
const homepage = `${index}\n${router}`;

test('homepage router targets are published guides', () => {
  for (const link of [...HOME_TILES, GIFT_TILE, ...mostUsedGuides()]) {
    assert.equal(existsSync(join(root, 'src/content/blog', `${link.slug}.mdx`)), true, link.slug);
    assert.match(homepage, new RegExp(link.href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('the golf gifts tile is added only in November and December', () => {
  assert.equal(tilesFor(new Date('2026-11-09T12:00:00Z')).some((tile) => tile.slug === 'best-golf-gifts'), true);
  assert.equal(tilesFor(new Date('2026-12-15T12:00:00Z')).some((tile) => tile.slug === 'best-golf-gifts'), true);
  assert.equal(tilesFor(new Date('2026-01-15T12:00:00Z')).some((tile) => tile.slug === 'best-golf-gifts'), false);
  assert.equal(tilesFor(new Date('2026-10-31T12:00:00Z')).length, 6);
  assert.equal(tilesFor(new Date('2026-11-01T12:00:00Z')).length, 7);
  assert.equal(mostUsedGuides().length, 6);
});

test('homepage copy, order, and preserved placements match the router spec', () => {
  for (const copy of [
    'Find the right golf',
    'gear, fast',
    "Honest buyer guides, sorted by what you're shopping for.",
    'What are you shopping for?',
    "Golfers' most-used guides",
    'See all 50+ buyer guides',
    'More ways to shop',
    'Golf Gift Guide',
    'Deals hub',
    'Club Gapping Calculator',
    'Latest reviews',
    'All reviews',
    'We test and write independently. Some links earn us a commission at no cost to you.',
    'Skip to content',
  ]) {
    assert.ok(homepage.includes(copy), copy);
  }
  for (const href of ['/best/', '/blog/best-golf-gifts/', '/deals/', '/tools/', '/affiliate-disclosure/', '/privacy/', '/search/']) {
    assert.ok(homepage.includes(href), href);
  }
  let cursor = router.indexOf('export const MOST_USED');
  for (const guide of mostUsedGuides()) {
    const at = router.indexOf(guide.label, cursor);
    assert.ok(at > cursor, guide.label);
    cursor = at;
  }
  assert.equal(showsPriceClaim('woods at $199.99'), true);
  assert.equal(showsPriceClaim('Black Friday golf deals'), true);
  assert.equal(showsPriceClaim('Best Putters 2026'), false);
});
