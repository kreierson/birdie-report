import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { canonicalArticleHref } from './canonical-article-links.mjs';
import { resolveQuickPicks } from '../src/utils/quick-picks.mjs';
import { buildGuideModel, NOT_LISTED, researchDisclosure } from '../src/utils/guide-template.mjs';

const PRODUCT_PATH = /\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})(?![A-Z0-9])/i;
const helpers = {
  normalizeAffiliateUrl: (link) => link.url,
  isDirectAmazonProductUrl: (url) => PRODUCT_PATH.test(url),
};

export const REPRESENTATIVE_GUIDES = [
  'best-golf-cart-bags-2026',
  'best-golf-bags-2026',
  'best-putters-2026',
  'best-putters-high-handicappers-2026',
  'best-drivers-2026',
  'best-drivers-seniors-2026',
  'best-irons-2026',
  'best-irons-high-handicappers-2026',
  'best-golf-shoes-2026',
  'best-golf-sunglasses-2026',
];

function decode(html) {
  return html
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

/** Markdown smart quotes stay the same words. Fold them before a text search. */
export function foldTypography(value) {
  return value
    .replace(/[\u2018\u2019\u2032]/g, "'")
    .replace(/[\u201C\u201D]/g, '"');
}

/** A literal % in a markdown URL is serialized as %25. Both are the same link. */
export function hrefSurvives(decodedHtml, href) {
  const variants = new Set([href, href.replace(/%(?![0-9A-Fa-f]{2})/g, '%25')]);
  try {
    variants.add(decodeURI(href));
  } catch {
    // Leave the raw href when it is not a valid escape sequence.
  }
  return [...variants].some((variant) => variant && decodedHtml.includes(variant));
}

function between(html, startMarker, endMarker) {
  const start = html.indexOf(startMarker);
  if (start < 0) return '';
  const end = endMarker ? html.indexOf(endMarker, start + startMarker.length) : -1;
  return html.slice(start, end < 0 ? undefined : end);
}

function visible(html) {
  return decode(html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '));
}

function bodyH2s(body) {
  const headings = [];
  let fence = false;
  for (const line of body.split(/\r?\n/)) {
    if (/^(```|~~~)/.test(line.trim())) {
      fence = !fence;
      continue;
    }
    if (fence) continue;
    const match = /^##\s+(.+?)\s*#*\s*$/.exec(line);
    if (!match) continue;
    headings.push(match[1].replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*_`]/g, '').trim());
  }
  return headings;
}

function markdownHrefs(body) {
  const hrefs = new Set();
  for (const match of body.matchAll(/\]\(([^)\s]+)\)/g)) hrefs.add(match[1]);
  for (const match of body.matchAll(/\bhref=["']([^"']+)["']/g)) hrefs.add(match[1]);
  return [...hrefs];
}

export function guideRenderProblems(slug, html, page) {
  const problems = [];
  const { data, body } = page;
  const title = data.seo_title || data.title;
  const description = data.seo_description || data.description;
  const decoded = decode(html);
  if (!decoded.includes(`<title>${title}</title>`) && !html.includes(`<title>${title}</title>`)) {
    problems.push(`${slug}: title tag does not match seo metadata`);
  }
  if (!decoded.includes(`content="${description}"`) && !html.includes(`content="${description}"`)) {
    problems.push(`${slug}: meta description does not match seo metadata`);
  }
  const canonical = `https://www.birdiereport.com/blog/${slug}/`;
  if (!html.includes(`rel="canonical" href="${canonical}"`) && !html.includes(`href="${canonical}" rel="canonical"`)) {
    problems.push(`${slug}: canonical is not ${canonical}`);
  }
  if (!html.includes(`"headline":${JSON.stringify(data.title)}`)) {
    problems.push(`${slug}: JSON-LD headline does not match the article title`);
  }
  const modified = String(data.updated || data.date || '').slice(0, 10);
  if (modified && !html.includes(modified)) problems.push(`${slug}: updated or published date ${modified} is missing`);
  if (!visible(html).includes(data.title)) problems.push(`${slug}: visible H1 dropped title text`);

  const text = foldTypography(visible(html));
  for (const heading of bodyH2s(body)) {
    if (!text.includes(foldTypography(heading))) problems.push(`${slug}: body H2 missing: ${heading}`);
  }
  for (const href of markdownHrefs(body)) {
    const [path, hash = ''] = href.split('#');
    const canonicalHref = canonicalArticleHref(path);
    const expected = hash ? `${canonicalHref}#${hash}` : canonicalHref;
    if (!hrefSurvives(decoded, href) && !hrefSurvives(decoded, expected) && !hrefSurvives(decoded, canonicalHref)) {
      problems.push(`${slug}: body link missing: ${href}`);
    }
  }

  const picks = resolveQuickPicks(data.quick_picks, { category: 'best', subcategory: data.subcategory }, helpers);
  const model = buildGuideModel({ picks, body, subcategory: data.subcategory });
  if (model.hasPicks) {
    if (!html.includes('data-picks-view')) problems.push(`${slug}: quick picks box missing`);
    if (!html.includes('data-guide-compare')) problems.push(`${slug}: compare section missing`);
    if (!html.includes('data-placement="quick_picks"')) problems.push(`${slug}: quick_picks placement missing`);
    if (!html.includes('data-placement="guide_compare"')) problems.push(`${slug}: guide_compare placement missing`);
    const picksHtml = between(html, 'data-picks-view', 'data-guide-compare');
    if (/Approx\.|\$\s*\d/.test(decode(picksHtml))) problems.push(`${slug}: quick picks include a price`);
    if (!picksHtml.includes('We may earn a commission from these links, at no cost to you.')) {
      problems.push(`${slug}: commission disclosure is not directly above the picks`);
    }
    const disclosure = researchDisclosure(data.review_basis);
    if (disclosure && !html.includes(disclosure.visible)) problems.push(`${slug}: research disclosure is not visible`);
    if (disclosure && !html.includes(disclosure.description)) problems.push(`${slug}: full methodology text was dropped`);
    const fieldsHtml = between(html, 'data-compare-fields', 'data-compare-fields');
    if (/\$\s*\d/.test(decode(fieldsHtml))) problems.push(`${slug}: comparison fields include a price`);
    if (/Best for:<\/span>[A-Za-z0-9]/.test(fieldsHtml)) {
      problems.push(`${slug}: comparison labels run into the value`);
    }
    for (const row of model.rows) {
      if (!fieldsHtml.includes(row.product)) problems.push(`${slug}: comparison dropped ${row.product}`);
      for (const item of row.fields) {
        if (item.value !== NOT_LISTED && !decode(fieldsHtml).includes(item.value)) {
          problems.push(`${slug}: comparison dropped ${item.label} for ${row.product}`);
        }
      }
      if (row.reviewHref && !html.includes(`id="${row.reviewHref.slice(1)}"`)) {
        problems.push(`${slug}: read-review target missing ${row.reviewHref}`);
      }
    }
    if ((data.comparison_products || []).length >= 2 && !html.includes('Scores in this guide')) {
      problems.push(`${slug}: scorecard facts were not kept in the comparison`);
    }
    if (!html.includes('data-guide-sticky-nav') || !html.includes('hidden')) {
      problems.push(`${slug}: sticky test bar is missing its hidden default`);
    }
    if (html.includes('data-placement="article-top-shortlist"')) {
      problems.push(`${slug}: article-top-shortlist was added beside quick picks`);
    }
  } else if (html.includes('data-picks-view') || html.includes('data-guide-compare')) {
    problems.push(`${slug}: empty quick picks rendered a picks or compare box`);
  }

  if (data.affiliate_links || data.comparison_products || data.quick_picks) {
    if (!html.includes('data-placement="article-bottom-buy-box"')) problems.push(`${slug}: bottom buy box missing`);
    if (!html.includes('data-placement="sidebar-sticky-cta"')) problems.push(`${slug}: sidebar affiliate module missing`);
  }
  if (!html.includes('guide-template.js') && data.category === 'best') {
    problems.push(`${slug}: guide measurement script missing`);
  }
  return problems;
}

function pagePathFromFile(dist, file) {
  let rel = relative(dist, file).split(sep).join('/');
  if (rel.endsWith('/index.html')) rel = rel.slice(0, -'index.html'.length);
  if (!rel.startsWith('/')) rel = `/${rel}`;
  return rel;
}

function htmlBySlug(dist) {
  const pages = new Map();
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.name.endsWith('.html')) {
        const pagePath = pagePathFromFile(dist, path);
        const slug = pagePath.match(/^\/blog\/([^/]+)\/$/)?.[1];
        if (slug) pages.set(slug, readFileSync(path, 'utf8'));
        if (pagePath === '/') pages.set('/', readFileSync(path, 'utf8'));
      }
    }
  };
  walk(dist);
  return pages;
}

function loadPage(root, slug) {
  const source = readFileSync(join(root, 'src/content/blog', `${slug}.mdx`), 'utf8');
  const front = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return { source, data: parse(front[1]), body: source.slice(front[0].length) };
}

function main() {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const dist = join(root, 'dist');
  if (!existsSync(dist)) {
    console.error('dist/ is missing. Run the site build before checking the guide template.');
    process.exit(1);
  }
  const pages = htmlBySlug(dist);
  const problems = [];
  const home = pages.get('/') || '';
  if (home.includes('data-picks-view') || home.includes('guide_compare')) {
    problems.push('homepage: buyer-guide template leaked onto the homepage');
  }
  const bestSlugs = readdirSync(join(root, 'src/content/blog'))
    .filter((name) => name.endsWith('.mdx'))
    .map((name) => name.slice(0, -'.mdx'.length))
    .filter((slug) => {
      try {
        return loadPage(root, slug).data.category === 'best';
      } catch {
        return false;
      }
    });
  if (bestSlugs.length < 40) problems.push(`expected every category:best guide, found ${bestSlugs.length}`);
  for (const slug of bestSlugs) {
    const html = pages.get(slug);
    if (!html) {
      problems.push(`${slug}: page was not built`);
      continue;
    }
    problems.push(...guideRenderProblems(slug, html, loadPage(root, slug)));
  }
  const irons = pages.get('best-irons-2026') || '';
  if (!irons.includes('$899') && !irons.includes('$1,199')) problems.push('best-irons-2026: body price text was removed');
  const bags = pages.get('best-golf-cart-bags-2026') || '';
  const bagFields = between(bags, 'data-compare-fields', 'data-compare-fields');
  if (bagFields.includes('$330')) problems.push('best-golf-cart-bags-2026: comparison copied the manufacturer price');
  if (!bags.includes('$330')) problems.push('best-golf-cart-bags-2026: body price table was removed');
  if (!bags.includes('Not stated on cited page')) problems.push('best-golf-cart-bags-2026: source footnote was removed');
  if (!bags.includes('Conflicting figures*')) problems.push('best-golf-cart-bags-2026: documented weight conflict was removed');
  if (bagFields.includes('Not stated on cited page')) problems.push('best-golf-cart-bags-2026: unknown weight was not shown as Not listed');
  if (!problems.length) {
    console.log(`Guide template check passed for ${bestSlugs.length} category:best guides.`);
    return;
  }
  console.error(`Guide template check failed (${problems.length}):`);
  for (const problem of problems.slice(0, 40)) console.error(`- ${problem}`);
  if (problems.length > 40) console.error(`- …and ${problems.length - 40} more`);
  process.exit(1);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) main();
