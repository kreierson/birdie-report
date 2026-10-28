import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  BATCH_SIZE,
  buildPayload,
  canonicalSitemapUrl,
  changedUrls,
  sitemapUrls,
  chooseSample,
  chunk,
  diffRedirectUrls,
  formatDryRun,
  loadKey,
  main,
  sitemapLocs,
  submitBatches,
  urlsForRepoPath,
  waitForDeployment,
} from './indexnow.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const retired = 'https://www.birdiereport.com/blog/callaway-elyte-max-vs-ping-g440-max-driver/';
const target = 'https://www.birdiereport.com/blog/callaway-paradym-ai-smoke-max-vs-ping-g440-max-driver/';

test('the public key file is the IndexNow root location', () => {
  const key = loadKey(root);
  assert.match(key, /^[A-Za-z0-9-]{8,128}$/);
  assert.equal(key, '97e7bc7c9508bd61744901de147df0bc');
});

test('content and page files map to canonical trailing-slash URLs', () => {
  assert.deepEqual(urlsForRepoPath('src/content/blog/bushnell-tour-hybrid-review.mdx', root), [
    'https://www.birdiereport.com/blog/bushnell-tour-hybrid-review/',
  ]);
  assert.deepEqual(urlsForRepoPath('src/pages/index.astro', root), ['https://www.birdiereport.com/']);
  assert.deepEqual(urlsForRepoPath('src/pages/about.astro', root), ['https://www.birdiereport.com/about/']);
  assert.deepEqual(urlsForRepoPath('src/pages/best/index.astro', root), ['https://www.birdiereport.com/best/']);
  assert.deepEqual(urlsForRepoPath('src/pages/tags/index.astro', root), []);
  assert.deepEqual(urlsForRepoPath('src/pages/tags/[tag].astro', root), []);
  assert.equal(urlsForRepoPath('public/logo.jpg', root).length, 0);
  const posts = urlsForRepoPath('src/pages/blog/[...slug].astro', root);
  assert.ok(posts.includes('https://www.birdiereport.com/blog/bushnell-tour-hybrid-review/'));
  assert.ok(posts.length > 100);
});

test('redirect diffs keep new sources and targets and drop unchanged rules', () => {
  const before = [
    { source: '/blog/fix-your-slice/', destination: '/blog/how-to-fix-a-slice-for-good/', permanent: true },
    { source: '/:path*', destination: 'https://www.birdiereport.com/:path*', permanent: true, has: [{ type: 'host', value: 'birdiereport.com' }] },
  ];
  const after = [
    ...before,
    { source: '/blog/callaway-elyte-max-vs-ping-g440-max-driver', destination: '/blog/callaway-paradym-ai-smoke-max-vs-ping-g440-max-driver/', permanent: true },
    { source: '/blog/callaway-elyte-max-vs-ping-g440-max-driver/', destination: '/blog/callaway-paradym-ai-smoke-max-vs-ping-g440-max-driver/', permanent: true },
  ];
  assert.deepEqual(diffRedirectUrls(before, after), [retired, target]);
});

test('a git range lists retired URLs, their targets, and edited pages', async () => {
  const repo = mkdtempSync(join(tmpdir(), 'birdie-indexnow-'));
  const retiredPage = 'https://www.birdiereport.com/blog/old-vs-new/';
  const keptPage = 'https://www.birdiereport.com/blog/kept-comparison/';
  try {
    const run = (args) => {
      const result = spawnSync('git', args, {
        cwd: repo,
        encoding: 'utf8',
        env: {
          ...process.env,
          GIT_AUTHOR_NAME: 'IndexNow Test',
          GIT_AUTHOR_EMAIL: 'indexnow@example.com',
          GIT_COMMITTER_NAME: 'IndexNow Test',
          GIT_COMMITTER_EMAIL: 'indexnow@example.com',
        },
      });
      assert.equal(result.status, 0, result.stderr);
    };
    run(['init', '-b', 'main']);
    mkdirSync(join(repo, 'src/content/blog'), { recursive: true });
    mkdirSync(join(repo, 'src/pages'), { recursive: true });
    writeFileSync(join(repo, 'src/content/blog/old-vs-new.mdx'), '---\n---\nOld comparison.\n');
    writeFileSync(join(repo, 'src/content/blog/kept-comparison.mdx'), '---\n---\nKept comparison.\n');
    writeFileSync(join(repo, 'vercel.json'), JSON.stringify({
      redirects: [
        { source: '/blog/fix-your-slice/', destination: '/blog/how-to-fix-a-slice-for-good/', permanent: true },
        { source: '/:path*', destination: 'https://www.birdiereport.com/:path*', permanent: true, has: [{ type: 'host', value: 'birdiereport.com' }] },
      ],
    }));
    run(['add', '.']);
    run(['commit', '-m', 'before']);
    rmSync(join(repo, 'src/content/blog/old-vs-new.mdx'));
    writeFileSync(join(repo, 'src/pages/about.astro'), '---\n---\n');
    writeFileSync(join(repo, 'vercel.json'), JSON.stringify({
      redirects: [
        { source: '/blog/fix-your-slice/', destination: '/blog/how-to-fix-a-slice-for-good/', permanent: true },
        { source: '/blog/old-vs-new', destination: '/blog/kept-comparison/', permanent: true },
        { source: '/blog/old-vs-new/', destination: '/blog/kept-comparison/', permanent: true },
        { source: '/:path*', destination: 'https://www.birdiereport.com/:path*', permanent: true, has: [{ type: 'host', value: 'birdiereport.com' }] },
      ],
    }));
    run(['add', '-A']);
    run(['commit', '-m', 'retire the thin comparison']);

    const changed = changedUrls('HEAD~1', 'HEAD', repo);
    assert.ok(changed.includes(retiredPage));
    assert.ok(changed.includes(keptPage));
    assert.ok(changed.includes('https://www.birdiereport.com/about/'));
    assert.equal(changed.includes('https://www.birdiereport.com/blog/fix-your-slice/'), false);
    assert.equal(changed.includes('https://www.birdiereport.com/tags/'), false);

    const logs = [];
    let posted = false;
    const code = await main(['--dry-run', '--mode', 'redirects', '--from', 'HEAD~1', '--to', 'HEAD'], repo, {
      log: (line) => logs.push(line),
      fetchImpl: async () => {
        posted = true;
        return { status: 500, text: async () => '' };
      },
    });
    assert.equal(code, 0);
    assert.equal(posted, false);
    const output = logs.join('\n');
    assert.match(output, /^mode: redirects\nrefs: HEAD~1\.\.HEAD\ncount: 2\n/);
    assert.match(output, new RegExp(retiredPage));
    assert.match(output, new RegExp(keptPage));
    assert.doesNotMatch(output, /fix-your-slice/);
    assert.doesNotMatch(output, /api\.indexnow\.org/);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test('full sitemap mode follows the sitemap index and skips tag archives', async () => {
  const fetched = [];
  const urls = await sitemapUrls({
    root: '/tmp/birdie-indexnow-no-dist',
    fetchImpl: async (url) => {
      fetched.push(url);
      if (url.endsWith('/sitemap-index.xml')) {
        return { status: 200, text: async () => '<sitemapindex><sitemap><loc>https://www.birdiereport.com/sitemap-0.xml</loc></sitemap></sitemapindex>' };
      }
      return { status: 200, text: async () => '<urlset><url><loc>https://www.birdiereport.com/blog/example/</loc></url><url><loc>https://www.birdiereport.com/tags/golf/</loc></url></urlset>' };
    },
  });
  assert.deepEqual(fetched, [
    'https://www.birdiereport.com/sitemap-index.xml',
    'https://www.birdiereport.com/sitemap-0.xml',
  ]);
  assert.deepEqual(urls, ['https://www.birdiereport.com/blog/example/']);
});

test('sitemap locs become canonical www URLs and skip tag archives', () => {
  const xml = `
    <urlset>
      <url><loc>https://www.birdiereport.com/blog/example</loc></url>
      <url><loc>https://www.birdiereport.com/tags/golf/</loc></url>
      <url><loc>https://example.com/blog/nope/</loc></url>
    </urlset>`;
  assert.deepEqual(sitemapLocs(xml).map(canonicalSitemapUrl).filter(Boolean), [
    'https://www.birdiereport.com/blog/example/',
  ]);
});

test('payloads reject non-canonical URLs and batch at 10000', () => {
  assert.throws(() => buildPayload(['https://evil.example/blog/x/'], 'abc12345'), /canonical/);
  assert.throws(() => buildPayload(['https://www.birdiereport.com/blog/x'], 'abc12345'), /canonical/);
  const urls = Array.from({ length: BATCH_SIZE + 1 }, (_, index) => `https://www.birdiereport.com/blog/p${index}/`);
  assert.equal(chunk(urls).length, 2);
  assert.equal(chunk(urls)[0].length, BATCH_SIZE);
  const body = buildPayload([urls[0], urls[0]], 'abc12345');
  assert.deepEqual(body.urlList, [urls[0]]);
  assert.equal(body.keyLocation, 'https://www.birdiereport.com/abc12345.txt');
  assert.equal(body.host, 'www.birdiereport.com');
});

test('submission logs response codes and does not throw when IndexNow fails', async () => {
  const logs = [];
  const warnings = [];
  const seen = [];
  const urls = Array.from({ length: BATCH_SIZE + 1 }, (_, index) => `https://www.birdiereport.com/blog/p${index}/`);
  const results = await submitBatches(urls, {
    key: 'abc12345',
    log: (line) => logs.push(line),
    warn: (line) => warnings.push(line),
    fetchImpl: async (url, request) => {
      seen.push(url);
      const count = JSON.parse(request.body).urlList.length;
      if (count === 1) throw new Error('network down');
      return { status: 202, text: async () => '' };
    },
  });
  assert.deepEqual(seen, ['https://api.indexnow.org/indexnow', 'https://api.indexnow.org/indexnow']);
  assert.deepEqual(results.map((result) => result.status), [202, 0]);
  assert.match(logs.join('\n'), /IndexNow 202 \(10000 URLs\)/);
  assert.match(warnings.join('\n'), /network down/);
});

test('dry-run output is the URL list and does not post', () => {
  const text = formatDryRun({ mode: 'redirects', from: 'f934680^', to: 'f934680', urls: [retired, target] });
  assert.match(text, /^mode: redirects\nrefs: f934680\^\.\.f934680\ncount: 2\n/);
  assert.match(text, new RegExp(retired));
  assert.match(text, new RegExp(target));
  assert.doesNotMatch(text, /api\.indexnow\.org/);
});

test('deployment wait accepts a changed production page and gives up on timeout', async () => {
  const key = 'abc12345';
  let phase = 'old';
  const fetchImpl = async (url) => {
    if (url.endsWith(`/${key}.txt`)) {
      return { status: phase === 'old' ? 404 : 200, text: async () => (phase === 'old' ? '' : key), headers: { get: () => '' } };
    }
    const headers = new Map(phase === 'old'
      ? [['etag', 'old'], ['last-modified', 'Tue, 27 Oct 2026 00:00:00 GMT']]
      : [['etag', 'new'], ['last-modified', 'Wed, 28 Oct 2026 18:00:00 GMT']]);
    return { status: 200, text: async () => '', headers: { get: (name) => headers.get(name) || '' } };
  };
  let clock = 0;
  const live = await waitForDeployment({
    key,
    sample: { url: 'https://www.birdiereport.com/blog/example/', expectation: 'page' },
    commitTime: Date.parse('Wed, 28 Oct 2026 12:00:00 GMT'),
    requireChange: true,
    timeoutMs: 5000,
    intervalMs: 10,
    fetchImpl,
    now: () => clock,
    sleep: async () => {
      phase = 'new';
      clock += 10;
    },
    log() {},
  });
  assert.equal(live, true);
  const timedOut = await waitForDeployment({
    key,
    sample: chooseSample(['https://www.birdiereport.com/blog/old/'], new Set(['https://www.birdiereport.com/blog/old/'])),
    requireChange: true,
    timeoutMs: 0,
    fetchImpl: async () => ({ status: 404, text: async () => '', headers: { get: () => '' } }),
    now: () => 0,
    log() {},
  });
  assert.equal(timedOut, false);
  const sample = chooseSample([retired, target], new Set([retired]));
  assert.equal(sample.url, target);
  assert.equal(sample.alternate.url, retired);
  assert.equal(sample.alternate.expectation, 'redirect');
});
