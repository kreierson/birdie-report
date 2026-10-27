import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, copyFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const registered = {
  asin: 'B0DWNKD682',
  product: 'Bushnell Golf Tour Hybrid Laser Rangefinder',
  variant: 'Blue',
  verified_at: '2026-10-27',
  verification_method: 'Fixture',
  evidence: 'Fixture evidence for the registered ASIN.',
};

function run(files, registry = { asins: [registered] }) {
  const root = mkdtempSync(join(tmpdir(), 'birdie-asin-test-'));
  try {
    mkdirSync(join(root, 'scripts'), { recursive: true });
    mkdirSync(join(root, 'data'), { recursive: true });
    copyFileSync(new URL('./validate-verified-asins.mjs', import.meta.url), join(root, 'scripts/validate-verified-asins.mjs'));
    writeFileSync(join(root, 'data/verified-asins.json'), JSON.stringify(registry));
    for (const [path, source] of Object.entries(files)) {
      const absolute = join(root, path);
      mkdirSync(join(absolute, '..'), { recursive: true });
      writeFileSync(absolute, source);
    }
    return spawnSync(process.execPath, [join(root, 'scripts/validate-verified-asins.mjs')], { encoding: 'utf8' });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('search links are allowed and registered direct links pass', () => {
  const result = run({
    'src/content/blog/sample.mdx': 'Search https://www.amazon.com/s?k=Ping+G440+Irons&tag=birdiereport-20 and direct https://www.amazon.com/dp/B0DWNKD682?tag=birdiereport-20',
    'src/components/Card.astro': '<a href="https://www.amazon.com/Bushnell-Tour-Hybrid/dp/B0DWNKD682">Buy</a>',
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /2 direct Amazon product links/);
});

test('an unregistered /dp/ or /gp/product link fails the check', () => {
  const dp = run({
    'src/content/blog/sample.mdx': 'https://www.amazon.com/dp/B00NOTREAL?tag=birdiereport-20',
  });
  assert.equal(dp.status, 1);
  assert.match(dp.stderr, /B00NOTREAL/);
  assert.match(dp.stderr, /sample\.mdx:1/);

  const gp = run({
    'src/layouts/BlogLayout.astro': 'https://www.amazon.com/gp/product/B0FAKEASIN',
  });
  assert.equal(gp.status, 1);
  assert.match(gp.stderr, /B0FAKEASIN/);

  const mobile = run({
    'src/pages/index.astro': 'https://amazon.com/gp/aw/d/B0FAKEASIN',
  });
  assert.equal(mobile.status, 1);
  assert.match(mobile.stderr, /B0FAKEASIN/);
});

test('a registry entry missing evidence cannot satisfy the check', () => {
  const broken = { ...registered, evidence: '' };
  const result = run(
    { 'src/content/blog/sample.mdx': 'https://www.amazon.com/dp/B0DWNKD682' },
    { asins: [broken] },
  );
  assert.equal(result.status, 1);
  assert.match(result.stderr, /missing evidence/);
});
