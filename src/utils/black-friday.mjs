// Re-export so pages and the CTA share one catalog. The product URLs live in
// src/components/black-friday-hub.mjs, which the ASIN check scans.
export {
  BF_HUB_PATH,
  BF_HUB_PLACEMENT,
  BF_HUB_URL,
  BF_PUBLISHED,
  bfBuyingTips,
  bfCategories,
  bfDates,
  bfPicks,
  blackFridayStructuredData,
} from '../components/black-friday-hub.mjs';
