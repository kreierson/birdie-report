import test from 'node:test';
import assert from 'node:assert/strict';
import { linkedPaths, retiredRedirects, validateRedirectState } from './validate-redirects.mjs';

test('retired redirects ignore same-slug canonicalization and catch chains, holds, content, and links', () => {
  const redirects = [
    { source: '/best-golf-bags-2026/', destination: '/blog/best-golf-bags-2026/', permanent: true },
    { source: '/blog/old-vs-new/', destination: '/blog/kept-comparison/', permanent: true },
    { source: '/blog/old-vs-new', destination: '/blog/kept-comparison/', permanent: true },
    { source: '/blog/also-old/', destination: '/blog/old-vs-new/', permanent: true },
    { source: '/blog/held-target-source/', destination: '/blog/phase-two-hold/', permanent: true },
  ];
  const retired = retiredRedirects(redirects);
  assert.equal(retired.paths.has('/best-golf-bags-2026/'), false);
  assert.equal(retired.paths.has('/blog/old-vs-new/'), true);
  assert.equal(retired.slugs.get('old-vs-new'), '/blog/kept-comparison/');

  const docs = [
    '| /blog/old-vs-new/ | /blog/kept-comparison/ | Thin overlapping comparison folded into the kept page. |',
    '| /blog/also-old/ | /blog/old-vs-new/ | This destination is another redirect, which creates a chain. |',
    '| /blog/held-target-source/ | /blog/phase-two-hold/ | This destination is a phase-2 hold page and must stay unpublished as a target. |',
  ].join('\n');
  const errors = validateRedirectState({
    redirects,
    docs,
    holds: ['phase-two-hold'],
    blogSlugs: new Set(['kept-comparison', 'phase-two-hold', 'old-vs-new']),
    files: [{ path: 'src/content/blog/kept-comparison.mdx', source: 'See [old](/blog/old-vs-new/).' }],
  });
  assert.ok(errors.some((error) => error.includes('itself redirected')));
  assert.ok(errors.some((error) => error.includes('hold page')));
  assert.ok(errors.some((error) => error.includes('still has content')));
  assert.ok(errors.some((error) => error.includes('links to redirected URL')));
  assert.deepEqual([...linkedPaths('Read [bags](/best-golf-bags-2026/) and [old](https://www.birdiereport.com/blog/old-vs-new/).')], ['/best-golf-bags-2026/', '/blog/old-vs-new/']);
});
