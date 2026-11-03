import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BF_HUB_PATH } from '../src/utils/black-friday.mjs';
import {
  SECTIONS,
  absoluteUrl,
  breadcrumbList,
  jsonLdScript,
  postTrail,
  sectionTrail,
} from '../src/utils/breadcrumbs.mjs';
import {
  BREADCRUMB_ROOTS,
  redirectPaths,
  validateBreadcrumbPage,
} from './validate-breadcrumbs.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));

function pageFile(href) {
  const directory = href.replace(/^\//, '').replace(/\/$/, '');
  return join(root, 'src/pages', directory, 'index.astro');
}

test('section crumbs use real pages and the site canonical host', () => {
  const redirects = redirectPaths(JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8')).redirects);
  for (const section of Object.values(SECTIONS)) {
    assert.equal(existsSync(pageFile(section.href)), true, section.href);
    assert.equal(redirects.has(section.href), false, section.href);
    assert.equal(absoluteUrl(section.href), `https://www.birdiereport.com${section.href}`);
  }
  assert.equal(absoluteUrl('/'), 'https://www.birdiereport.com/');
  assert.equal(absoluteUrl('https://www.birdiereport.com/tools/'), 'https://www.birdiereport.com/tools/');
  assert.throws(() => absoluteUrl('https://example.com/tools/'), /birdiereport\.com/);
});

test('buyer guides, deals, and tools build sequential absolute trails', () => {
  const post = breadcrumbList(postTrail('best', 'Best Golf Drivers 2026', '/blog/best-drivers-2026/'));
  assert.deepEqual(post.itemListElement.map((item) => item.position), [1, 2, 3]);
  assert.deepEqual(post.itemListElement.map((item) => [item.name, item.item]), [
    ['Home', 'https://www.birdiereport.com/'],
    ['Best Of', 'https://www.birdiereport.com/best/'],
    ['Best Golf Drivers 2026', 'https://www.birdiereport.com/blog/best-drivers-2026/'],
  ]);

  const deals = breadcrumbList(sectionTrail('deals', {
    name: 'Black Friday Golf Deals 2026',
    href: BF_HUB_PATH,
  }));
  assert.equal(deals['@type'], 'BreadcrumbList');
  assert.equal(deals.itemListElement.at(-1).item, 'https://www.birdiereport.com/deals/black-friday-golf-deals/');

  const tool = breadcrumbList(sectionTrail('tools', {
    name: 'Golf Club Gapping Calculator',
    href: 'https://www.birdiereport.com/tools/golf-club-gapping-calculator/',
  }));
  assert.equal(tool.itemListElement[1].item, 'https://www.birdiereport.com/tools/');
  assert.equal(tool.itemListElement.at(-1).item, 'https://www.birdiereport.com/tools/golf-club-gapping-calculator/');
  assert.equal(jsonLdScript(tool).includes('<'), false);
});

test('archive pages keep a parent that exists', () => {
  const page = breadcrumbList(sectionTrail('blog', { name: 'Page 2', href: '/blog/page/2/' }));
  assert.deepEqual(page.itemListElement.map((item) => item.item), [
    'https://www.birdiereport.com/',
    'https://www.birdiereport.com/blog/',
    'https://www.birdiereport.com/blog/page/2/',
  ]);
  const versus = breadcrumbList(sectionTrail('versus'));
  assert.equal(versus.itemListElement.at(-1).item, 'https://www.birdiereport.com/versus/');
  for (const root of BREADCRUMB_ROOTS) assert.equal(existsSync(pageFile(root)), true, root);
});

function page(list, { canonical = 'https://www.birdiereport.com/deals/', nav = true } = {}) {
  const visible = nav ? `
    <nav aria-label="Breadcrumb">
      <ol>
        <li><a href="/">Home</a></li>
        <li aria-current="page"><span aria-hidden="true">/</span><span>Deals</span></li>
      </ol>
    </nav>` : '';
  return `<!doctype html><html><head>
    <link rel="canonical" href="${canonical}">
    <script type="application/ld+json">${JSON.stringify(list)}</script>
    </head><body>${visible}</body></html>`;
}

const files = new Set(['/', '/deals/']);
const good = breadcrumbList(sectionTrail('deals'));

test('a built page with a breadcrumb trail must be valid BreadcrumbList JSON', () => {
  assert.deepEqual(validateBreadcrumbPage(page(good), '/deals/', { files, redirects: new Set() }), []);
  const skipped = validateBreadcrumbPage('<link rel="canonical" href="https://www.birdiereport.com/about/">', '/about/', {
    files,
    redirects: new Set(),
  });
  assert.deepEqual(skipped, []);
});

test('the breadcrumb check rejects duplicate, relative, and non-canonical trails', () => {
  const duplicate = page([good, good]);
  assert.match(validateBreadcrumbPage(duplicate, '/deals/', { files, redirects: new Set() }).join('\n'), /one BreadcrumbList/);

  const broken = breadcrumbList(sectionTrail('deals'));
  broken.itemListElement[1].item = '/deals/';
  broken.itemListElement[1].position = 4;
  const problems = validateBreadcrumbPage(page(broken), '/deals/', { files, redirects: new Set() });
  assert.match(problems.join('\n'), /absolute/);
  assert.match(problems.join('\n'), /position 4/);

  const redirected = validateBreadcrumbPage(page(good), '/deals/', { files, redirects: new Set(['/deals/']) });
  assert.match(redirected.join('\n'), /redirect/);

  const mismatch = validateBreadcrumbPage(
    page(good, { canonical: 'https://www.birdiereport.com/deals' }),
    '/deals/',
    { files, redirects: new Set() },
  );
  assert.match(mismatch.join('\n'), /does not match canonical/);
});
