# Google Indexing Content Audit — August 19, 2026

## Executive summary

Search Console exported 53 article rows under **Crawled - currently not indexed**. After normalizing trailing slashes and host variants, those rows represent **50 unique articles**, not 49. The other 93 URLs in the export are tag archives that are now intentionally `noindex` and are not part of this content plan.

Recommended end state for the 50 articles:

- **31 keep and refresh**: useful evergreen, commercial, course, or definitive-event pages.
- **17 consolidate and permanently redirect**: duplicates, cannibalizing articles, or expired event coverage with a stronger destination.
- **2 retire**: thin, expired stories with no search demand, traffic, or useful replacement.

This is not evidence that all 50 articles are inherently poor. Most were last crawled before the August 19 canonical, redirect, and sitemap corrections. The plan therefore preserves useful URLs and concentrates destructive cleanup on clear duplicates and expired event coverage.

## Evidence used

- Search Console coverage export dated August 19, 2026.
- Search Console page performance for May 19-August 16, 2026.
- GA4 Bing organic landing-page sessions for the latest 90 days.
- Current article titles, dates, categories, word counts, headings, and internal links.
- Overlap with the full article inventory in `src/content/blog`.

The affected set produced **zero Google clicks** during the period. The strongest demand signals were:

| Article | Bing sessions | Google impressions | Existing internal links |
|---|---:|---:|---:|
| `titleist-gt2-vs-ping-g440-driver` | 20 | 8 | 27 |
| `how-to-hit-fairway-woods-hybrids-off-the-deck` | 19 | 1 | 28 |
| `how-to-hit-a-draw-step-by-step` | 5 | 0 | 0 |
| `how-to-break-80` | 4 | 0 | 13 |
| `how-to-play-par-3s-strategy-guide` | 4 | 0 | 12 |
| `taylormade-spider-tour-putter-family-launch-2026` | 3 | 0 | 2 |
| `how-to-fix-a-slice-for-good` | 0 | 3 | 3 |
| `how-to-read-greens-like-a-pro` | 0 | 2 | 4 |

## Priority 0: refresh first

These pages have demonstrated demand, strong internal support, or a near-ranking Google signal. Refresh them before requesting indexing.

| Page | Action | Required work |
|---|---|---|
| `titleist-gt2-vs-ping-g440-driver` | Keep, refresh, and differentiate by product generation | Highest-value affected page. Official manufacturer verification confirms GT2 and GTS2 are distinct generations, so both comparisons should remain live. Position this page around prior-generation GT2 value versus G440 Max forgiveness and point current-generation shoppers to `titleist-gts2-vs-ping-g440-max-driver`. |
| `how-to-hit-fairway-woods-hybrids-off-the-deck` | Keep and refresh | Preserve the URL. Split the advice clearly between fairway woods and hybrids, add setup/contact diagnostics, and add a concise topping troubleshooting table. |
| `how-to-hit-a-draw-step-by-step` | Keep and refresh | Add internal links into the page, a start-line/curve diagnostic, and failure modes for grip, face, and path. It currently has demand but no internal links pointing to it. |
| `how-to-break-80` | Keep and refresh | Differentiate it sharply from the break-90 guide with GIR, penalty, three-putt, and up-and-down benchmarks plus a sample scoring plan. |
| `how-to-play-par-3s-strategy-guide` | Keep and refresh | Add yardage-band strategy, miss-zone examples, and a simple tee/club/target checklist. |
| `how-to-fix-a-slice-for-good` | Keep and absorb duplicate | Retain this URL because Google has already shown it near position 6. Merge the best unique material from `fix-your-slice`, then permanently redirect `fix-your-slice` here. |
| `how-to-read-greens-like-a-pro` | Keep and absorb competing guide | Retain the URL with Google impressions. Consolidate overlapping material from `how-to-read-greens-better-without-guessing` and make this the broad green-reading pillar. |
| `taylormade-spider-tour-putter-family-launch-2026` | Keep and refresh | Convert the launch story into a durable family guide: current models, head shapes, toe hang, price, golfer fit, and links to relevant comparisons. |

## Priority 1: remaining keep-and-refresh pages

**Completion update — August 19, 2026:** The first five-page Priority 1 cluster is complete. `course-management-tips` now functions as the decision-system pillar; `chip-shot-technique-around-the-green` includes lie-based club selection, landing examples, and troubleshooting; `bunker-shot-basics-get-out-every-time` now separates greenside and fairway-bunker intent and adjusts for sand conditions; `pitch-shot-distance-control-scoring-zone` now contains a carry-based 30–80 yard matrix; and `short-game-secrets` is rebuilt as the short-game navigation hub. **18 Priority 1 pages remain.**

| Page | Action | Required work |
|---|---|---|
| `bunker-shot-basics-get-out-every-time` | Keep and refresh | Add a greenside setup checklist, sand-condition adjustments, and clearer separation from the fairway-bunker articles. |
| `cameron-young-players-championship-2026` | Keep and refresh | Preserve because it has 13 internal links and now receives legacy URL equity. Add complete final-round context and make it the definitive result page. |
| `chip-shot-technique-around-the-green` | Keep and refresh | Add lie-based club selection, landing-spot examples, and a short troubleshooting section. |
| `cobra-3dp-irons-launch-2026` | Keep and refresh | Replace launch-only framing with a current three-model guide, specifications, availability, golfer fit, and related Cobra iron links. |
| `course-management-tips` | Keep and refresh | Strong internal pillar with 27 links. Add decision trees and examples for different handicap/scoring goals. |
| `driving-range-drills` | Keep and differentiate | Keep as the drill library. Add a clear drill selector by miss pattern and link prominently to the practice-planning guide. |
| `golf-lessons-waste-of-money` | Keep and refresh | Treat as evergreen decision intent: when lessons help, warning signs, expected costs, and how to choose an instructor. |
| `how-to-break-90-for-real` | Keep and refresh | Preserve the redirected legacy equity. Add a break-90 scorecard plan and distinguish it from the more advanced break-80 page. |
| `how-to-hit-a-flop-shot` | Keep and refresh | Add when not to attempt it, lie requirements, setup checkpoints, and safer alternatives. |
| `how-to-hit-fairway-bunker-shots-cleanly` | Keep and differentiate | Focus this page on contact technique; keep `fairway-bunker-shots-go-or-chip-out` focused on shot selection. Cross-link them. |
| `how-to-play-back-pins-better` | Keep and refresh | Strong internal support. Add visual target examples and front/middle/back distance scenarios. |
| `how-to-play-golf-in-the-wind` | Keep and refresh | Add headwind/tailwind/crosswind matrices, trajectory choices, and club-selection examples. |
| `how-to-play-golf-under-pressure` | Keep and differentiate | Keep this as an on-course pressure playbook; keep `mental-game-golf` as the broader mental-game pillar. Add reciprocal links. |
| `how-to-practice-with-purpose` | Keep and refresh | Keep as the practice-planning pillar. Add 30-, 60-, and 90-minute templates and point to the drill library. |
| `lag-putting-tips-eliminate-three-putts` | Keep and refresh | Add distance-control ladders, uphill/downhill adjustments, and measurable practice goals. |
| `mental-game-golf` | Keep and refresh | Make this the broad pillar with links to pressure, recovery, focus, and pre-shot-routine articles. |
| `pitch-shot-distance-control-scoring-zone` | Keep and refresh | Add a 30-80 yard matrix, carry-vs-total distance notes, and a calibration practice plan. |
| `pre-round-warm-up-routine` | Keep and refresh | Add 10-, 20-, and 40-minute timelines and distinguish warming up from swing practice. |
| `sheep-ranch-review-2026` | Keep and refresh | Retain as a course-intent page. Verify current pricing/logistics and strengthen first-hand detail, course fit, and Bandon cross-links. |
| `short-game-secrets` | Keep, but rebuild as a hub | The current broad framing is generic. Turn it into a short-game hub that routes readers to chipping, pitching, bunker, flop-shot, and distance-control guides. |
| `stop-short-siding-yourself-approach-strategy` | Keep and refresh | Strongest internal support in the set at 37 links. Add shot-pattern examples and green diagrams while preserving the focused intent. |
| `taylormade-two-year-driver-cycle-opinion-2026` | Keep and refresh | Reframe as a sourced, durable analysis of TaylorMade's product cycle and what it means for buyers, with links to current driver reviews. |
| `usga-shinnecock-no-target-score-opinion-2026` | Keep and differentiate | Preserve the course-setup intent. It is materially different from the later player-conduct-policy article, so redirecting it there would be misleading. Refresh it as a sourced analysis of the USGA's Shinnecock setup philosophy. |

## Consolidate and permanently redirect

Preserve any useful facts or original commentary in the destination before adding the redirect.

| Source page | Redirect destination | Reason |
|---|---|---|
| `fix-your-slice` | `/blog/how-to-fix-a-slice-for-good/` | Direct duplicate; the destination already has Google impressions. |
| `houston-open-2026-preview-scheffler-masters-bubble` | `/blog/gary-woodland-wins-houston-open-2026-comeback/` | Expired preview; consolidate into the definitive tournament result. |
| `jeeno-thitikul-defends-mizuho-2026` | `/blog/jeeno-thitikul-made-the-lpga-season-better-2026/` | Same event/storyline with a more developed destination. |
| `jordan-spieth-comeback-2026-valspar` | `/blog/fitzpatrick-wins-valspar-championship-2026/` | Expired tournament subplot; consolidate into the final result. |
| `liv-golf-next-investor-must-buy-teams-opinion-2026` | `/blog/liv-golf-lead-investor-does-not-fix-stability-opinion-2026/` | Later article continues the same investor/stability thesis. |
| `masters-2026-no-tiger-no-phil-new-era-opinion` | `/blog/masters-2026-without-tiger-woods-opinion/` | Competing versions of the same Masters-without-Tiger thesis. |
| `pga-tour-2026-season-preview` | `/blog/2026-pga-tour-season-no-one-owns-it-yet-opinion/` | Expired season preview; destination is the later season-level analysis. |
| `rickie-fowler-masters-dream-dead-houston-open-2026` | `/blog/gary-woodland-wins-houston-open-2026-comeback/` | Tournament subplot resolved by the definitive Houston result. |
| `rory-mcilroy-skipping-cadillac-championship-opinion-2026` | `/blog/rory-limited-schedule-good-actually-opinion-2026/` | Same schedule/participation argument with a broader destination. |
| `taylormade-tour-response-golf-balls-launch-2026` | `/blog/taylormade-tour-response-review/` | Commercial evergreen review is the better long-term search destination. |
| `tiger-woods-confirmed-masters-2026-27th-start` | `/blog/masters-2026-without-tiger-woods-opinion/` | Superseded event update; merge relevant chronology into the resolved storyline. |
| `tiger-woods-tgl-finals-loss-masters-doubt-2026` | `/blog/masters-2026-without-tiger-woods-opinion/` | Superseded speculative update about the same Masters storyline. |
| `valspar-championship-2026-preview` | `/blog/fitzpatrick-wins-valspar-championship-2026/` | Expired preview. |
| `valspar-championship-2026-round-1-recap` | `/blog/fitzpatrick-wins-valspar-championship-2026/` | Superseded round recap. |
| `valspar-championship-2026-round-2-recap` | `/blog/fitzpatrick-wins-valspar-championship-2026/` | Superseded round recap. |
| `valspar-championship-2026-round-3-recap` | `/blog/fitzpatrick-wins-valspar-championship-2026/` | Superseded round recap. |
| `victor-perez-leads-liv-golf-mexico-city-round-1-2026` | `/blog/jon-rahm-wins-liv-golf-mexico-city-2026/` | Superseded first-round story; final result is the durable destination. |

## Retire after preserving any worthwhile context

| Page | Action | Reason |
|---|---|---|
| `bryson-dechambeau-wins-liv-golf-south-africa-2026` | Remove and allow 404 | Thin expired event story: 444 words, no internal links, no Bing sessions, no Google impressions, and no clearly equivalent durable destination. |
| `rory-mcilroy-quail-hollow-truist-problem-opinion-2026` | Remove and allow 404 | Expired event-specific opinion with no search demand and no sufficiently equivalent destination for an honest redirect. |

## Execution order

1. Refresh the eight Priority 0 pages and consolidate their known competing pages.
2. Deploy, confirm canonicals and redirects, and ensure only surviving URLs remain in the sitemap.
3. Request indexing for at most the five strongest refreshed URLs: Titleist/Ping, fairway woods/hybrids, slice, green reading, and break 80.
4. Consolidate the 17 expired/duplicate pages and repair internal links so they point directly to destinations rather than through redirects.
5. Refresh the remaining evergreen pages in related clusters, not randomly: scoring, ball striking, short game, putting/mental game, then products/courses.
6. Retire the two unsupported pages, allow them to return normal 404 responses, and remove their internal links.
7. Re-export **Crawled - currently not indexed** after Google has had 3-4 weeks to recrawl the corrected site. Compare the surviving URLs rather than the old raw count, because the noindexed tags and consolidated pages should disappear by design.

## Refresh acceptance criteria

An article is ready for indexing only when it has:

- One unambiguous search intent that does not compete with another Birdie Report page.
- A unique title, description, H1, and canonical URL.
- Useful first-hand perspective consistent with Kyle's current 2-handicap author profile.
- Concrete examples, measurements, decision aids, or original analysis rather than generic advice.
- At least three relevant internal links in and three useful contextual links out where the inventory supports them.
- Current facts, product availability, prices, and event context where applicable.
- A verified relevant image and a passing `npm run build`.
