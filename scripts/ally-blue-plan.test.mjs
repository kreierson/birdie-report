import test from 'node:test';
import assert from 'node:assert/strict';
import { allyBluePlan, retailer, standardSource, cbSource } from '../src/components/buying-aids/ally-blue-plan.mjs';
const ready = { stroke: 'straight', version: 'standard', address: 'comfortable', sizing: true };
test('shopping route requires all four positive fit/build checks', () => {
  let shoppingRoutes = 0;
  for (const stroke of ['straight', 'other', 'unknown'])
    for (const version of ['standard', 'cb', 'unknown'])
      for (const address of ['comfortable', 'untried', 'dislike'])
        for (const sizing of [true, false]) {
          const plan = allyBluePlan({ stroke, version, address, sizing });
          if (plan.affiliate) { shoppingRoutes++; assert.deepEqual({ stroke, version, address, sizing }, ready); assert.equal(plan.href, retailer); }
          else assert.ok(!plan.href.includes('amazon.com'));
        }
  assert.equal(shoppingRoutes, 1);
});
test('uncertain stroke cannot be overridden by purchase-ready answers', () => {
  const plan = allyBluePlan({ ...ready, stroke: 'unknown' });
  assert.equal(plan.id, 'fit-first'); assert.equal(plan.affiliate, false);
});
test('CB choice does not send the reader to the standard Amazon search', () => {
  const plan = allyBluePlan({ ...ready, version: 'cb' });
  assert.equal(plan.href, cbSource); assert.equal(plan.affiliate, false);
});
test('unknown build or an untried/disliked address picture gets a research route', () => {
  assert.equal(allyBluePlan({ ...ready, version: 'unknown' }).id, 'compare-builds');
  for (const address of ['untried', 'dislike']) assert.equal(allyBluePlan({ ...ready, address }).id, 'try-address');
  assert.equal(allyBluePlan({ ...ready, sizing: false }).href, standardSource);
});
test('missing, tampered and incomplete answers never produce a purchase route', () => {
  for (const input of [undefined, {}, { ...ready, stroke: '<script>' }, { ...ready, sizing: 'true' }, { ...ready, address: '' }]) {
    const plan = allyBluePlan(input); assert.equal(plan.id, 'incomplete'); assert.equal(plan.affiliate, false);
  }
});
test('ready route is a tagged search, without implying price or inventory', () => {
  const plan = allyBluePlan(ready); const url = new URL(plan.href);
  assert.equal(url.origin, 'https://www.amazon.com'); assert.equal(url.pathname, '/s');
  assert.equal(url.searchParams.get('tag'), 'birdiereport-20');
  assert.match(plan.text, /condition, seller, return terms and total price/);
});
