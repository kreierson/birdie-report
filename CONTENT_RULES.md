# Content Rules — The Birdie Report

## Affiliate Links
- Search links are the default: `https://www.amazon.com/s?k=Product+Name&tag=birdiereport-20`
- A direct product link (`amazon.com/dp/ASIN`, `amazon.com/gp/product/ASIN`, or `amazon.com/gp/aw/d/ASIN`, including a slug before `/dp/`) is allowed only when that exact ASIN is an entry in `data/verified-asins.json`
- Each registry entry needs the ASIN, the exact product and variant, `verified_at` (`YYYY-MM-DD`), the verification method, and the evidence. Evidence has to come from opening the live Amazon listing and confirming it is a new listing of the product and variant the article recommends. Used-only, refurbished-only, pre-owned-only, and third-party-or-used-only listings do not qualify. A search-index hit is not verification.
- NEVER fabricate an ASIN. If the live page does not confirm the variant, leave the search link.
- When code builds a direct href, use `amazonProductUrl()` in `src/utils/affiliate.ts`. That helper is the only URL builder, and it rejects ASINs that are not in the registry. A literal URL in content uses `https://www.amazon.com/dp/ASIN?tag=birdiereport-20`
- Tag: `birdiereport-20`
- Run `npm run validate:verified-asins` through the normal build before committing. The check fails if any direct Amazon product link in content, components, layouts, or pages is missing from the registry. Search links stay allowed.

## Images
- NEVER publish with a broken image — verify every URL loads before committing
- Run `npm run check:images` or `npm run build` before committing; the build includes the image validator and must pass
- Avoid hotlink-prone manufacturer/CDN URLs when they 403/404 in validation; use a relevant local image in `/public/images/articles/` or a verified URL instead
- Product reviews/roundups: use actual product images from manufacturer websites (callaway.com, titleist.com, taylormade.com, etc.)
- Always credit the source: "Image: Callaway Golf" or "Image courtesy of Titleist"
- Images must be tightly related to the article content — no generic stock that doesn't match
- Minimize image reuse across articles — unique images preferred
- For non-product articles (tips, opinion, courses): Unsplash is fine, but must be relevant

## Content
- Author: Kyle Reierson
- Kyle is a 2-handicap (NEVER 15)
- Tone: conversational, opinionated, funny — NOT corporate
- Light swearing OK
- Be honest about product flaws

## Editorial Trust
- Every article in `reviews`, `best`, or `versus` must declare exactly one valid `review_basis`: `research-based`, `hands-on`, or `hybrid`.
- Use `hands-on` or `hybrid` only when Kyle can substantiate the specific first-person use described in the article. Never infer hands-on experience from product familiarity or existing site copy.
- Research-based coverage must be labeled `review_basis: "research-based"` and must not imply ownership, rounds played, launch-monitor sessions, fittings, measurements, or direct product testing.
- Prefer current primary sources: official product pages, specifications, support documentation, governing bodies, tours, and direct company announcements. Attribute material claims and distinguish verified facts from editorial judgment.
- Run `npm run validate:editorial-trust` through the normal build before committing. Do not bypass the validator.

## Controlled SEO Publishing — authorized September 23, 2026
- The owner has authorized automated publishing. Follow `docs/AUTONOMOUS_SEO.md` and `data/seo-policy.json`: at most one new article and two substantial existing-page refreshes per calendar week (America/Chicago). Monitoring may run daily.
- New product coverage must be hands-on and cite `evidence_ids` from `data/hands-on-evidence.json`. The registry must point to actual owner confirmation or supplied testing records; a previous unverified article is not evidence. Never invent ownership, measurements, photos, or testing. Existing research-based articles retain honest labels.
- If supported experience or distinct search intent is missing, skip new publication and continue maintenance without requesting routine approval. Never relabel research as hands-on to meet a quota.
- No new news, opinion, or deal articles in this program. No mass deletion, noindexing, or redirects without a documented page-level rationale and verified replacement.
- Approved consolidations are recorded with a page-level reason in `docs/redirects.md`. Do not recreate those source slugs. Do not publish a new thin versus page that repeats one of those product pairs, including a Max or standard sibling of the same club type. Extend the destination page instead. Phase-2 hold slugs in `data/consolidation-holds.json` stay published until a separate review.
- Before proposing any future article, search the full article inventory for overlapping intent. Extend or improve an existing page when it can satisfy the query.
- Do not create tag archives, add tag URLs to the sitemap, or add crawlable links to `/tags/` pages.
- Keep canonicals, structured data, internal links, redirects, and sitemap URLs on `https://www.birdiereport.com`.
- Prefer direct internal links to final canonical destinations; never deliberately link through a redirect.
- Refresh dates only for material reader-facing changes. Keep original publication dates. Source specifications from current primary sources and distinguish them from personal experience.
- A passing build and actual browser visual/interaction QA are required before deployment. Local testing must not send production analytics.
- No paid link schemes, fabricated data, automated outreach, or purchases. Notify participating search engines of deployed changes through the IndexNow script; receipt is not proof of indexing.
