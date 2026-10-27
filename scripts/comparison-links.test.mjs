import test from 'node:test';
import assert from 'node:assert/strict';
import {
  comparisonLinkErrors,
  headingId,
  pageRecord,
  rewriteComparisonLinks,
} from './comparison-links.mjs';

const pages = new Map([
  ['titleist-gt2-vs-ping-g440-driver', pageRecord(
    'Titleist GT2 vs Ping G440 Max Driver: Better Speed or Better Forgiveness?',
    [
      'Titleist GT2 vs Cobra Darkspeed Max Driver',
      'Titleist GT2 vs Cobra DS-ADAPT MAX-K Driver',
      'Callaway Paradym Ai Smoke MAX vs Titleist GT2 Driver',
    ],
  )],
  ['footjoy-pro-slx-vs-footjoy-pro-sl-2026', pageRecord(
    'FootJoy Pro/SLX vs FootJoy Pro/SL 2026',
    ['adidas Codechaos 25 vs FootJoy Pro/SL 2026'],
  )],
  ['bag-boy-nitron-vs-clicgear-model-4-5', pageRecord(
    'Bag Boy Nitron vs Clicgear Model 4.5',
    ['Bag Boy Nitron vs CaddyTek CaddyLite 11.5 V3'],
  )],
]);

test('heading ids match the published slug rules', () => {
  assert.equal(headingId('Titleist GT2 vs Cobra DS-ADAPT MAX-K Driver'), 'titleist-gt2-vs-cobra-ds-adapt-max-k-driver');
  assert.equal(headingId('adidas Codechaos 25 vs FootJoy Pro/SL 2026'), 'adidas-codechaos-25-vs-footjoy-prosl-2026');
  assert.equal(headingId('Bag Boy Nitron vs CaddyTek CaddyLite 11.5 V3'), 'bag-boy-nitron-vs-caddytek-caddylite-115-v3');
  assert.equal(headingId('FootJoy Pro/SLX vs Nike Air Zoom Infinity Tour NEXT%'), 'footjoy-proslx-vs-nike-air-zoom-infinity-tour-next');
});

test('shorthand for the real page passes and a folded name needs its heading', () => {
  const source = [
    'See [GT2 vs Ping G440](/blog/titleist-gt2-vs-ping-g440-driver/).',
    'See [Titleist GT2 vs Cobra Darkspeed Max](/blog/titleist-gt2-vs-ping-g440-driver/).',
  ].join('\n');
  const errors = comparisonLinkErrors(source, pages);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /Cobra Darkspeed Max/);
  const fixed = rewriteComparisonLinks(source, pages);
  assert.match(fixed, /#titleist-gt2-vs-cobra-darkspeed-max-driver/);
  assert.equal(comparisonLinkErrors(fixed, pages).length, 0);
});

test('a comma-separated run keeps one link per destination and drops the new label', () => {
  const source = 'Buy from [Titleist GT2 vs Ping G440 Max](/blog/titleist-gt2-vs-ping-g440-driver/), the new [Titleist GT2 vs Cobra Darkspeed Max](/blog/titleist-gt2-vs-ping-g440-driver/), and the new [Titleist GT2 vs Cobra DS-ADAPT MAX-K Driver](/blog/titleist-gt2-vs-ping-g440-driver/).';
  const fixed = rewriteComparisonLinks(source, pages);
  assert.equal(fixed.match(/\/blog\/titleist-gt2-vs-ping-g440-driver\//g).length, 1);
  assert.doesNotMatch(fixed, /the new/);
  assert.match(fixed, /including Titleist GT2 vs Cobra Darkspeed Max Driver and Titleist GT2 vs Cobra DS-ADAPT MAX-K Driver/);
  assert.equal(comparisonLinkErrors(fixed, pages).length, 0);
});

test('a list does not repeat one destination', () => {
  const source = [
    '- [Titleist GT2 vs Ping G440 Max](/blog/titleist-gt2-vs-ping-g440-driver/) for the main fork',
    '- [Titleist GT2 vs Cobra Darkspeed Max](/blog/titleist-gt2-vs-ping-g440-driver/)',
    '- [Callaway Paradym Ai Smoke MAX vs Titleist GT2](/blog/titleist-gt2-vs-ping-g440-driver/)',
  ].join('\n');
  const fixed = rewriteComparisonLinks(source, pages);
  assert.equal(fixed.split('\n').length, 1);
  assert.match(fixed, /for the main fork\. Also on that page: Titleist GT2 vs Cobra Darkspeed Max Driver and Callaway Paradym Ai Smoke MAX vs Titleist GT2 Driver/);
  assert.equal(comparisonLinkErrors(fixed, pages).length, 0);
});

test('a max sibling is a section, not the standard-head page', () => {
  const drivers = new Map([
    ['taylormade-qi35-vs-callaway-elyte-driver', pageRecord(
      'TaylorMade Qi35 vs Callaway Elyte Driver',
      ['TaylorMade Qi35 Max vs Callaway Elyte Max Driver'],
    )],
  ]);
  const source = 'See [TaylorMade Qi35 Max vs Callaway Elyte Max](/blog/taylormade-qi35-vs-callaway-elyte-driver/).';
  assert.equal(comparisonLinkErrors(source, drivers).length, 1);
  const fixed = rewriteComparisonLinks(source, drivers);
  assert.match(fixed, /#taylormade-qi35-max-vs-callaway-elyte-max-driver/);
  assert.equal(comparisonLinkErrors(fixed, drivers).length, 0);
});

test('a short title with a year still matches the longer product label', () => {
  const vokey = new Map([
    ['titleist-vokey-sm11-vs-titleist-vokey-sm10', pageRecord('Vokey SM11 vs SM10 (2026)', [])],
  ]);
  const source = 'See [Titleist Vokey SM11 vs Titleist Vokey SM10](/blog/titleist-vokey-sm11-vs-titleist-vokey-sm10/).';
  assert.equal(comparisonLinkErrors(source, vokey).length, 0);
});

test('a sentence that mentions a matchup is not treated as an X vs Y label', () => {
  const balls = new Map([
    ['vice-pro-vs-tour-response', pageRecord('Vice Pro vs TaylorMade Tour Response', [])],
  ]);
  const source = 'See [tour ball versus value-urethane thinking in Vice Pro vs Tour Response](/blog/vice-pro-vs-tour-response/).';
  assert.equal(comparisonLinkErrors(source, balls).length, 0);
  assert.equal(rewriteComparisonLinks(source, balls), source);
});

test('collapsed section links name the page and drop the new', () => {
  const source = 'See the new [Titleist GT2 vs Cobra Darkspeed Max](/blog/titleist-gt2-vs-ping-g440-driver/) and the new [Titleist GT2 vs Cobra DS-ADAPT MAX-K Driver](/blog/titleist-gt2-vs-ping-g440-driver/).';
  const fixed = rewriteComparisonLinks(source, pages);
  assert.equal(fixed, 'See [Titleist GT2 vs Ping G440 Max Driver](/blog/titleist-gt2-vs-ping-g440-driver/) (including Titleist GT2 vs Cobra Darkspeed Max Driver and Titleist GT2 vs Cobra DS-ADAPT MAX-K Driver).');
  assert.equal(comparisonLinkErrors(fixed, pages).length, 0);
});

test('collapsing a link run leaves indentation and markdown line breaks alone', () => {
  const source = [
    'affiliate_links:',
    '  - product: "TaylorMade Stealth 2 Plus Driver"',
    '    url: "https://www.amazon.com/s?k=TaylorMade+Stealth+2+Plus+Driver&tag=birdiereport-20"',
    '',
    '**Best Overall:** TaylorMade Stealth 2 Plus  ',
    'See the new [Titleist GT2 vs Cobra Darkspeed Max](/blog/titleist-gt2-vs-ping-g440-driver/) and the new [Titleist GT2 vs Cobra DS-ADAPT MAX-K Driver](/blog/titleist-gt2-vs-ping-g440-driver/).',
  ].join('\n');
  const fixed = rewriteComparisonLinks(source, pages);
  assert.match(fixed, /\n    url: "/);
  assert.match(fixed, /Stealth 2 Plus {2}\n/);
  assert.doesNotMatch(fixed, /the new/);
});

test('dropping the new does not leave a dangling page', () => {
  const source = 'See the new [Titleist GT2 vs Cobra Darkspeed Max](/blog/titleist-gt2-vs-ping-g440-driver/) page before you buy.';
  const fixed = rewriteComparisonLinks(source, pages);
  assert.equal(fixed, 'See [Titleist GT2 vs Cobra Darkspeed Max Driver](/blog/titleist-gt2-vs-ping-g440-driver/#titleist-gt2-vs-cobra-darkspeed-max-driver) before you buy.');
});

test('an article before a section link keeps the following noun', () => {
  const source = 'Read the direct [Titleist GT2 vs Cobra Darkspeed Max](/blog/titleist-gt2-vs-ping-g440-driver/) comparison before you buy.';
  const fixed = rewriteComparisonLinks(source, pages);
  assert.match(fixed, /comparison before you buy/);
});

test('non-comparison duplicates stay as separate links', () => {
  const source = [
    '- [Tiger Got Demolished in the TGL Finals](/blog/masters-2026-without-tiger-woods-opinion/)',
    '- [Tiger Confirmed for Masters](/blog/masters-2026-without-tiger-woods-opinion/)',
  ].join('\n');
  assert.equal(rewriteComparisonLinks(source, pages), source);
});

test('prose between two section links stays in place', () => {
  const source = 'Read [Titleist GT2 vs Cobra Darkspeed Max](/blog/titleist-gt2-vs-ping-g440-driver/). If the other Cobra head is the question, read [Titleist GT2 vs Cobra DS-ADAPT MAX-K Driver](/blog/titleist-gt2-vs-ping-g440-driver/).';
  const fixed = rewriteComparisonLinks(source, pages);
  assert.equal(fixed.match(/\/blog\/titleist-gt2-vs-ping-g440-driver\//g).length, 2);
  assert.match(fixed, /#titleist-gt2-vs-cobra-darkspeed-max-driver/);
  assert.match(fixed, /#titleist-gt2-vs-cobra-ds-adapt-max-k-driver/);
  assert.equal(comparisonLinkErrors(fixed, pages).length, 0);
});
