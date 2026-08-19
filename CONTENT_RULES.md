# Content Rules — The Birdie Report

## Affiliate Links
- ALWAYS use Amazon search URLs: `https://www.amazon.com/s?k=Product+Name&tag=birdiereport-20`
- NEVER fabricate ASINs — sub-agents make them up and they 404
- Test every affiliate link before publishing
- Tag: `birdiereport-20`

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

## SEO Recovery Mode
- Scheduled jobs must not create new articles while recovery mode is active. Improve, consolidate, redirect, noindex, or retire existing pages instead.
- Before proposing any future article, search the full article inventory for overlapping intent. Extend or improve an existing page when it can satisfy the query.
- Do not create tag archives, add tag URLs to the sitemap, or add crawlable links to `/tags/` pages.
- Keep canonicals, structured data, internal links, redirects, and sitemap URLs on `https://www.birdiereport.com`.
- Prefer direct internal links to final canonical destinations; never deliberately link through a redirect.
- Publishing may resume only after an explicit owner decision based on Search Console results. Initial cadence should be 1-2 substantiated, non-overlapping articles per week, not daily bulk publishing.
