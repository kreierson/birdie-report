// GA4 affiliate_click placement. Keep this stable so the block can be measured
// apart from in-article links and the older top shortlist.
export const QUICK_PICKS_PLACEMENT = 'quick_picks';

export const QUICK_PICKS_DISCLOSURE = 'Affiliate links may earn us a commission. A direct link opens one verified Amazon product page. A search link opens results. Confirm the model, seller, and current price.';

function requiredText(pick, field, index) {
  const value = pick?.[field];
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`quick_picks[${index}].${field} is required`);
  }
  return value.trim();
}

export function quickPickCta(pick) {
  return pick.direct ? `See this product on ${pick.retailer}` : `See options on ${pick.retailer}`;
}

export function resolveQuickPicks(picks, context = {}, deps) {
  if (picks == null) return [];
  if (!Array.isArray(picks) || picks.length < 3 || picks.length > 5) {
    throw new Error('quick_picks must include 3 to 5 items');
  }
  if (typeof deps?.normalizeAffiliateUrl !== 'function' || typeof deps?.isDirectAmazonProductUrl !== 'function') {
    throw new Error('resolveQuickPicks requires affiliate link helpers');
  }

  return picks.map((pick, index) => {
    const award = requiredText(pick, 'award', index);
    const product = requiredText(pick, 'product', index);
    const why = requiredText(pick, 'why', index);
    const retailer = requiredText(pick, 'retailer', index);
    const sourceUrl = requiredText(pick, 'url', index);
    const url = deps.normalizeAffiliateUrl({ url: sourceUrl, tracking_id: pick.tracking_id }, context);
    const direct = deps.isDirectAmazonProductUrl(url);
    const cta = quickPickCta({ direct, retailer });
    return {
      award,
      product,
      why,
      retailer,
      url,
      direct,
      cta,
      // Visible label must stay inside the accessible name (WCAG 2.5.3).
      accessibleName: `${cta} for ${product} (opens in a new tab)`,
    };
  });
}
