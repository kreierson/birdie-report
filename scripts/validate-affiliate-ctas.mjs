import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isGuideHref, RELATED_GUIDES_PLACEMENT } from '../src/utils/related-guides.mjs';

const GEAR_CATEGORIES = new Set(['reviews', 'versus', 'best', 'deals']);
const CONTEXTUAL_CATEGORIES = new Set(['courses', 'tips']);

// Modules that give a reader a prominent, tracked affiliate click. Sidebar is
// desktop-only, so it does not satisfy the check on its own.
export const TOP_PLACEMENTS = new Set(['article-top-shortlist', 'quick_picks', 'gift_guide']);
export const BOTTOM_PLACEMENTS = new Set(['article-bottom-buy-box', 'gift_guide']);

function field(front, name) {
  return front.match(new RegExp(`^${name}:\\s*["']?([^"'\\n]+)["']?`, 'm'))?.[1]?.trim() || '';
}

function hasKey(front, name) {
  return new RegExp(`^${name}:`, 'm').test(front);
}

export function postFromSource(filename, source) {
  const front = source.match(/^---\n([\s\S]*?)\n---/)?.[1] || '';
  return {
    slug: filename.replace(/\.mdx?$/, ''),
    category: field(front, 'category'),
    subcategory: field(front, 'subcategory'),
    hasAffiliateLinks: hasKey(front, 'affiliate_links'),
    hasComparison: hasKey(front, 'comparison_products'),
    hasQuickPicks: hasKey(front, 'quick_picks'),
    hasReviewProduct: hasKey(front, 'review_product'),
    hasAffiliateUrl: hasKey(front, 'affiliate_url'),
    hasGiftGuide: source.includes('GiftGuideCta'),
  };
}

export function isGearProductPost(post) {
  if (GEAR_CATEGORIES.has(post.category)) return true;
  return post.category === 'news' && post.subcategory === 'equipment-news';
}

export function loadAllowlist(parsed) {
  const errors = [];
  if (!parsed || !Array.isArray(parsed.exceptions)) {
    return { slugs: new Map(), errors: ['affiliate CTA allowlist needs an "exceptions" array'] };
  }
  const slugs = new Map();
  parsed.exceptions.forEach((entry, index) => {
    const label = `exceptions[${index}]`;
    const slug = typeof entry?.slug === 'string' ? entry.slug.trim() : '';
    const reason = typeof entry?.reason === 'string' ? entry.reason.trim() : '';
    if (!slug) errors.push(`${label}: missing slug`);
    if (!reason) errors.push(`${label || slug}: missing reason`);
    if (slug && slugs.has(slug)) errors.push(`${slug}: duplicate allowlist entry`);
    if (slug) slugs.set(slug, reason);
  });
  return { slugs, errors };
}

function hasBuyerSource(post) {
  return post.hasAffiliateLinks || post.hasComparison || post.hasReviewProduct || post.hasAffiliateUrl || post.hasGiftGuide;
}

export function sourceProblems(posts, allowlist) {
  const problems = [];
  const seen = new Set();
  for (const post of posts) {
    seen.add(post.slug);
    const gear = isGearProductPost(post);
    const allowed = allowlist.has(post.slug);
    if (allowed && !gear) {
      problems.push(`${post.slug}: remove it from the allowlist; it is not a gear product post`);
      continue;
    }
    if (!gear) continue;
    const ready = hasBuyerSource(post);
    if (allowed && ready) {
      problems.push(`${post.slug}: remove it from the allowlist; it already has affiliate CTA data`);
    } else if (!allowed && !ready) {
      problems.push(`${post.slug}: gear product post has no product links for the CTA modules`);
    }
  }
  for (const slug of allowlist.keys()) {
    if (!seen.has(slug)) problems.push(`${slug}: remove missing post from the affiliate CTA allowlist`);
  }
  return problems;
}

function attributes(tag) {
  return {
    placement: tag.match(/\bdata-placement=["']([^"']+)["']/)?.[1] || '',
    affiliate: /\bdata-affiliate-link=["']true["']/.test(tag),
    href: tag.match(/\bhref=["']([^"']+)["']/)?.[1] || '',
  };
}

export function anchorPlacements(html) {
  const affiliate = new Set();
  const related = [];
  for (const match of html.matchAll(/<a\b[^>]*>/gi)) {
    const anchor = attributes(match[0]);
    if (anchor.affiliate && anchor.placement) affiliate.add(anchor.placement);
    if (anchor.placement === RELATED_GUIDES_PLACEMENT) {
      related.push({ href: anchor.href, affiliate: anchor.affiliate });
    }
  }
  return { affiliate, related };
}

export function renderedGearProblems(slug, html) {
  const { affiliate } = anchorPlacements(html);
  const missing = [];
  if (![...TOP_PLACEMENTS].some((placement) => affiliate.has(placement))) {
    missing.push('a top shortlist, quick picks, or gift-guide module');
  }
  if (![...BOTTOM_PLACEMENTS].some((placement) => affiliate.has(placement))) {
    missing.push('a bottom buy box or gift-guide module');
  }
  return missing.map((item) => `${slug}: rendered gear page is missing ${item}`);
}

export function renderedGuideProblems(slug, html) {
  const { related } = anchorPlacements(html);
  const problems = [];
  if (related.length < 2 || related.length > 4) {
    problems.push(`${slug}: expected 2-4 Gear for this links, found ${related.length}`);
  }
  for (const link of related) {
    if (link.affiliate) problems.push(`${slug}: Gear for this link is marked as an affiliate link`);
    if (!isGuideHref(link.href)) problems.push(`${slug}: Gear for this link ${link.href || '(missing href)'} is not a known buyer's guide`);
  }
  return problems;
}

export function renderedProblems(posts, htmlBySlug, allowlist) {
  const problems = [];
  for (const post of posts) {
    const html = htmlBySlug.get(post.slug);
    const gear = isGearProductPost(post);
    const contextual = CONTEXTUAL_CATEGORIES.has(post.category);
    if (!gear && !contextual) continue;
    if (html == null) {
      problems.push(`${post.slug}: page was not built`);
      continue;
    }
    if (gear) {
      const missing = renderedGearProblems(post.slug, html);
      if (allowlist.has(post.slug)) {
        if (missing.length === 0) {
          problems.push(`${post.slug}: remove it from the allowlist; the page renders affiliate CTA modules`);
        }
      } else {
        problems.push(...missing);
      }
    }
    if (contextual) problems.push(...renderedGuideProblems(post.slug, html));
  }
  return problems;
}

function readPosts(blogDirectory) {
  return readdirSync(blogDirectory)
    .filter((name) => ['.md', '.mdx'].includes(extname(name)))
    .map((name) => postFromSource(name, readFileSync(join(blogDirectory, name), 'utf8')));
}

function pagePathFromFile(dist, file) {
  let rel = relative(dist, file).split(sep).join('/');
  if (rel.endsWith('/index.html')) rel = rel.slice(0, -'index.html'.length);
  if (!rel.startsWith('/')) rel = `/${rel}`;
  return rel;
}

function htmlBySlugFromDist(dist) {
  const pages = new Map();
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.name.endsWith('.html')) {
        const pagePath = pagePathFromFile(dist, path);
        const slug = pagePath.match(/^\/blog\/([^/]+)\/$/)?.[1];
        if (slug) pages.set(slug, readFileSync(path, 'utf8'));
      }
    }
  };
  walk(dist);
  return pages;
}

function report(label, problems) {
  if (!problems.length) return false;
  console.error(`${label} (${problems.length}):`);
  for (const problem of problems.slice(0, 40)) console.error(`- ${problem}`);
  if (problems.length > 40) console.error(`- …and ${problems.length - 40} more`);
  return true;
}

function main() {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const mode = process.argv.includes('--rendered') ? 'rendered' : 'source';
  const allowlistPath = join(root, 'data/affiliate-cta-allowlist.json');
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(allowlistPath, 'utf8'));
  } catch (error) {
    console.error(`data/affiliate-cta-allowlist.json: ${error.message}`);
    process.exit(1);
  }
  const { slugs, errors } = loadAllowlist(parsed);
  const posts = readPosts(join(root, 'src/content/blog'));
  const problems = [...errors];

  if (mode === 'source') {
    problems.push(...sourceProblems(posts, slugs));
    if (report('Affiliate CTA source check failed', problems)) process.exit(1);
    const gear = posts.filter(isGearProductPost).length;
    console.log(`Affiliate CTA source check passed: ${gear} gear product posts, ${slugs.size} allowlisted.`);
    return;
  }

  const dist = join(root, 'dist');
  if (!existsSync(dist)) {
    console.error('dist/ is missing. Run the site build before checking rendered affiliate CTAs.');
    process.exit(1);
  }
  problems.push(...renderedProblems(posts, htmlBySlugFromDist(dist), slugs));
  if (report('Rendered affiliate CTA check failed', problems)) process.exit(1);
  const contextual = posts.filter((post) => CONTEXTUAL_CATEGORIES.has(post.category)).length;
  console.log(`Rendered affiliate CTA check passed, including Gear for this on ${contextual} course and instruction posts.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) main();
