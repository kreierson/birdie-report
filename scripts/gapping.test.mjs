import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AMAZON_TAG,
  CLUBS,
  YARDS_PER_DEGREE,
  buildChart,
  classifyGap,
  clubById,
  defaultState,
  estimateCarryYards,
  parseState,
  roundYards,
  serializeState,
} from '../src/utils/gapping.mjs';
import { chartBodyHtml } from '../src/utils/gapping-render.mjs';

function params(query) {
  return new URLSearchParams(query);
}

function chartFor(clubs, extra = {}) {
  return buildChart({
    unit: 'yd',
    anchor: '7i',
    carry: 150,
    clubs: clubs.map((id) => ({ id, loft: clubById(id).loft })),
    ...extra,
  });
}

test('carry moves 3 yards per degree from the anchor and round-trips', () => {
  assert.equal(estimateCarryYards(30, 30, 150), 150);
  assert.equal(estimateCarryYards(27, 30, 150), 150 + 3 * YARDS_PER_DEGREE);
  assert.equal(estimateCarryYards(34, 30, 150), 150 - 4 * YARDS_PER_DEGREE);
  assert.equal(roundYards(estimateCarryYards(10.5, 30, 150)), 209);
  assert.equal(estimateCarryYards(10.5, 10.5, 230), 230);
  const fromDriver = estimateCarryYards(30, 10.5, 230);
  assert.equal(roundYards(fromDriver), 172);
});

test('gap bands flag under 8 yards and over 15 or 18 yards', () => {
  assert.equal(classifyGap(7.9), 'tight');
  assert.equal(classifyGap(8), 'good');
  assert.equal(classifyGap(15), 'good');
  assert.equal(classifyGap(15.1), 'wide');
  assert.equal(classifyGap(18), 'wide');
  assert.equal(classifyGap(18.1), 'large');
});

test('a 150-yard 7-iron leaves a hole from pitching wedge to sand wedge', () => {
  const model = buildChart(defaultState());
  const seven = model.rows.find((row) => row.id === '7i');
  assert.equal(seven.carryYards, 150);
  assert.equal(seven.isAnchor, true);
  const pitching = model.rows.find((row) => row.id === 'pw');
  assert.equal(pitching.carryYards, 111);
  assert.equal(pitching.gapYards, 33);
  assert.equal(pitching.status, 'large');
  assert.match(pitching.suggestion, /gap wedge/i);
  assert.equal(pitching.cta, 'wedge');
  assert.equal(model.ctas.some((cta) => cta.kind === 'wedge'), true);
});

test('overlapping 4-iron and 4-hybrid tells you to keep one', () => {
  const model = chartFor(['4h', '4i', '7i']);
  const iron = model.rows.find((row) => row.id === '4i');
  assert.equal(iron.nextName, '4-hybrid');
  assert.equal(iron.status, 'tight');
  assert.equal(iron.gapYards, 3);
  assert.match(iron.suggestion, /same job/i);
  assert.match(iron.suggestion, /swap/i);
  assert.equal(iron.cta, 'hybrid');
});

test('driver down to a lone 4-iron suggests a club in the window', () => {
  const model = chartFor(['driver', '4i', '7i']);
  const driver = model.rows.find((row) => row.id === 'driver');
  assert.equal(driver.status, 'large');
  assert.match(driver.suggestion, /3-wood|hybrid/i);
});

test('even loft steps do not raise affiliate prompts', () => {
  const model = buildChart({
    unit: 'yd',
    anchor: '7i',
    carry: 160,
    clubs: [
      { id: 'driver', loft: 12 },
      { id: '3w', loft: 16 },
      { id: '5w', loft: 20 },
      { id: '4i', loft: 24 },
      { id: '5i', loft: 28 },
      { id: '6i', loft: 32 },
      { id: '7i', loft: 36 },
      { id: '8i', loft: 40 },
      { id: '9i', loft: 44 },
      { id: 'pw', loft: 48 },
    ],
  });
  assert.equal(model.rows.every((row) => row.status == null || row.status === 'good'), true);
  assert.deepEqual(model.ctas, []);
  assert.equal(chartBodyHtml(model).includes('amazon.com'), false);
});

test('meter mode uses the same yard gaps and converts the anchor', () => {
  const model = buildChart(parseState(params('unit=m&anchor=7i&carry=137.2&clubs=7i,8i')));
  const seven = model.rows.find((row) => row.id === '7i');
  const eight = model.rows.find((row) => row.id === '8i');
  assert.equal(seven.carryYards, 150);
  assert.equal(eight.carryYards, 138);
  assert.equal(eight.gapYards == null, true);
  assert.equal(seven.gapYards, 12);
  assert.equal(seven.status, 'good');
  assert.match(seven.carryLabel, /m$/);
});

test('query params round-trip the bag and ignore unknown clubs', () => {
  const state = parseState(params('unit=yd&anchor=driver&carry=230&clubs=driver,nope,pw&lofts=driver:9.5,pw:46'));
  assert.deepEqual(state.clubs.map((club) => club.id), ['driver', 'pw']);
  assert.equal(state.clubs[0].loft, 9.5);
  assert.equal(state.clubs[1].loft, 46);
  assert.equal(state.anchor, 'driver');
  const again = parseState(params(serializeState(state)));
  assert.deepEqual(again, state);
});

test('flagged charts link to guides and tagged Amazon searches, not raw product pages', () => {
  const html = chartBodyHtml(buildChart(defaultState()));
  assert.match(html, /data-placement="gapping_tool"/);
  assert.match(html, /data-affiliate-link="true"/);
  assert.match(html, new RegExp(`tag=${AMAZON_TAG}`));
  assert.match(html, /\/blog\/best-wedges-2026\//);
  assert.equal(html.includes('/dp/'), false);
  assert.equal(html.includes('/gp/product/'), false);
  for (const club of CLUBS) assert.equal(typeof club.loft, 'number');
});
