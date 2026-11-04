import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buyerProductsFromContent, productLabelFromAmazonUrl } from '../src/utils/buyer-links.mjs';
import { isGuideHref, selectRelatedGuides, RELATED_GUIDES_PLACEMENT } from '../src/utils/related-guides.mjs';
import {
  isGearProductPost,
  loadAllowlist,
  postFromSource,
  renderedGearProblems,
  renderedGuideProblems,
  sourceProblems,
} from './validate-affiliate-ctas.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const blogDirectory = join(root, 'src/content/blog');

function readBlog(slug) {
  return readFileSync(join(blogDirectory, `${slug}.mdx`), 'utf8');
}

test('buyer modules accept the older product frontmatter shapes', () => {
  const fromReviewProduct = buyerProductsFromContent({
    review_product: {
      name: 'Garmin Approach S70',
      affiliate_url: 'https://www.amazon.com/s?k=Garmin+Approach+S70&tag=birdiereport-20',
      pros: ['AMOLED'],
    },
    comparison_products: [{ name: 'Ignored', affiliate_url: 'https://www.amazon.com/s?k=Ignored' }],
  });
  assert.equal(fromReviewProduct.length, 1);
  assert.equal(fromReviewProduct[0].product, 'Garmin Approach S70');

  const fromPageUrl = buyerProductsFromContent({
    affiliate_url: 'https://www.amazon.com/s?k=Bushnell+Tour+V6+Shift+Rangefinder&tag=birdiereport-20',
    pros: ['Slope switch'],
    rating: 9.1,
  });
  assert.equal(fromPageUrl[0].product, 'Bushnell Tour V6 Shift Rangefinder');
  assert.equal(productLabelFromAmazonUrl(fromPageUrl[0].url), 'Bushnell Tour V6 Shift Rangefinder');
  assert.deepEqual(fromPageUrl[0].pros, ['Slope switch']);

  const fromComparison = buyerProductsFromContent({
    comparison_products: [
      { name: 'Titleist GT2', affiliate_url: 'https://www.amazon.com/s?k=Titleist+GT2+Driver&tag=birdiereport-20' },
      { name: 'PING G440 Max', affiliate_url: 'https://www.amazon.com/s?k=PING+G440+Max+Driver&tag=birdiereport-20' },
    ],
  });
  assert.deepEqual(fromComparison.map((link) => link.product), ['Titleist GT2', 'PING G440 Max']);

  const affiliateWins = buyerProductsFromContent({
    affiliate_links: [{ product: 'Kept', url: 'https://www.amazon.com/s?k=Kept', retailer: 'Amazon' }],
    comparison_products: [{ name: 'Dropped', affiliate_url: 'https://www.amazon.com/s?k=Dropped' }],
  });
  assert.deepEqual(affiliateWins.map((link) => link.product), ['Kept']);
});

test('gear product posts have CTA sources, and the allowlist stays explicit', () => {
  const allowlist = loadAllowlist(JSON.parse(readFileSync(join(root, 'data/affiliate-cta-allowlist.json'), 'utf8')));
  assert.equal(allowlist.errors.length, 0);
  const posts = readdirSync(blogDirectory)
    .filter((name) => name.endsWith('.mdx'))
    .map((name) => postFromSource(name, readFileSync(join(blogDirectory, name), 'utf8')));
  assert.deepEqual(sourceProblems(posts, allowlist.slugs), []);

  for (const slug of [
    'titleist-gt2-vs-ping-g440-driver',
    'ping-g440-vs-mizuno-jpx925-hot-metal-irons',
    'callaway-elyte-vs-ping-g440-irons',
    'taylormade-spider-tour-putter-family-launch-2026',
  ]) {
    const post = postFromSource(`${slug}.mdx`, readBlog(slug));
    assert.equal(isGearProductPost(post), true, slug);
    assert.equal(post.hasAffiliateLinks, true, slug);
    assert.equal(allowlist.slugs.has(slug), false, slug);
  }

  const layout = readFileSync(join(root, 'src/layouts/BlogLayout.astro'), 'utf8');
  assert.match(layout, /buyerProductsFromContent/);
  assert.match(layout, /'news'/);
  assert.match(layout, /data-placement="article-top-shortlist"/);
  assert.match(layout, /data-placement="article-bottom-buy-box"/);
  const component = readFileSync(join(root, 'src/components/RelatedGuides.astro'), 'utf8');
  assert.match(component, /data-placement=\{RELATED_GUIDES_PLACEMENT\}/);
  assert.equal(component.includes('data-affiliate-link'), false);
  assert.equal(RELATED_GUIDES_PLACEMENT, 'related_guides');
});

test('rendered check requires a top module and a bottom buy box', () => {
  const both = '<a data-affiliate-link="true" data-placement="article-top-shortlist" href="https://www.amazon.com/s?k=A"></a><a data-placement="article-bottom-buy-box" data-affiliate-link="true" href="https://www.amazon.com/s?k=B"></a>';
  assert.deepEqual(renderedGearProblems('sample', both), []);
  assert.equal(renderedGearProblems('sample', '<a data-affiliate-link="true" data-placement="sidebar-sticky-cta"></a>').length, 2);
  assert.deepEqual(renderedGearProblems('sample', '<a data-affiliate-link="true" data-placement="gift_guide"></a>'), []);
  assert.equal(renderedGearProblems('sample', '<a data-affiliate-link="true" data-placement="quick_picks"></a>').some((problem) => problem.includes('bottom')), true);

  const guides = '<a data-placement="related_guides" href="/blog/best-golf-shoes-walking-2026/"></a><a href="/blog/best-rangefinders-2026/" data-placement="related_guides"></a>';
  assert.deepEqual(renderedGuideProblems('pinehurst-no-2-review', guides), []);
  assert.equal(renderedGuideProblems('pinehurst-no-2-review', guides + '<a data-affiliate-link="true" data-placement="related_guides" href="/blog/best-golf-balls-2026/"></a>').some((problem) => problem.includes('affiliate')), true);
  assert.equal(isGuideHref('/blog/best-golf-balls-2026/'), true);
  assert.equal(isGuideHref('/blog/pinehurst-no-2-review/'), false);
});

test('course and instruction posts link to a few existing buyer guides', () => {
  const pinehurst = selectRelatedGuides({
    slug: 'pinehurst-no-2-review',
    title: 'Pinehurst No. 2',
    category: 'courses',
    subcategory: 'course-reviews',
    tags: ['pinehurst'],
  });
  assert.ok(pinehurst.some((guide) => guide.href.includes('best-golf-shoes-walking')));
  assert.ok(pinehurst.some((guide) => guide.href.includes('best-rangefinders')));
  assert.equal(pinehurst.some((guide) => guide.href.includes('sunglasses')), false);

  const scottsdale = selectRelatedGuides({
    slug: 'best-golf-courses-scottsdale-arizona',
    title: 'Scottsdale',
    category: 'courses',
    subcategory: 'travel-guides',
    tags: ['scottsdale', 'arizona'],
  });
  assert.ok(scottsdale.some((guide) => guide.href.includes('sunglasses')));
  assert.equal(scottsdale.some((guide) => guide.href.includes('rain-jackets')), false);

  const putting = selectRelatedGuides({ slug: 'how-to-read-greens-like-a-pro', title: 'Read greens', category: 'tips', subcategory: 'putting' });
  assert.ok(putting.some((guide) => guide.href === '/blog/best-putters-2026/'));
  const bunker = selectRelatedGuides({ slug: 'bunker-shot-basics-get-out-every-time', title: 'Bunker shots', category: 'tips', subcategory: 'short-game' });
  assert.ok(bunker.some((guide) => guide.href === '/blog/best-wedges-2026/'));
  const slice = selectRelatedGuides({ slug: 'how-to-fix-a-slice-for-good', title: 'Fix a slice', category: 'tips', subcategory: 'swing-tips' });
  assert.ok(slice.some((guide) => guide.href.includes('best-drivers-high-handicappers')));
  assert.deepEqual(selectRelatedGuides({ slug: 'titleist-gt2-vs-ping-g440-driver', category: 'versus' }), []);

  const posts = readdirSync(blogDirectory).filter((name) => name.endsWith('.mdx'));
  for (const name of posts) {
    const post = postFromSource(name, readFileSync(join(blogDirectory, name), 'utf8'));
    if (post.category !== 'courses' && post.category !== 'tips') continue;
    const source = readFileSync(join(blogDirectory, name), 'utf8');
    const title = source.match(/^title:\s*["']?(.+?)["']?\s*$/m)?.[1] || post.slug;
    const guides = selectRelatedGuides({ ...post, title });
    assert.ok(guides.length >= 2 && guides.length <= 4, post.slug);
    for (const guide of guides) {
      assert.equal(isGuideHref(guide.href), true, `${post.slug} -> ${guide.href}`);
      const target = guide.href.replace(/^\/blog\//, '').replace(/\/$/, '');
      assert.equal(posts.includes(`${target}.mdx`), true, target);
    }
  }
});

test('allowlist rejects a stale or unlabeled exception', () => {
  const missingReason = loadAllowlist({ exceptions: [{ slug: 'example' }] });
  assert.match(missingReason.errors.join('\n'), /missing reason/);
  const posts = [postFromSource('example.mdx', '---\ncategory: courses\nsubcategory: course-reviews\n---\n')];
  assert.match(sourceProblems(posts, new Map([['example', 'because']]) ).join('\n'), /not a gear product post/);
  assert.match(sourceProblems([], new Map([['gone', 'because']])).join('\n'), /missing post/);
});
