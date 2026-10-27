// `date` is the canonical publish date: Article datePublished, the blog archive,
// and the date printed on homepage cards. `updated` only records a later refresh.

export function publishTimestamp(data) {
  const time = new Date(data?.date).getTime();
  return Number.isNaN(time) ? 0 : time;
}

export function compareByPublishDateDesc(a, b) {
  return publishTimestamp(b.data) - publishTimestamp(a.data) || String(a.slug).localeCompare(String(b.slug));
}

function utcDay(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

// A deal roundup is a price check for that day. A later `updated` value means the
// check itself was refreshed; otherwise the publish date is the as-of date.
export function dealAsOf(data) {
  const published = new Date(data?.date);
  const updated = data?.updated ? new Date(data.updated) : null;
  if (updated && !Number.isNaN(updated.getTime()) && (Number.isNaN(published.getTime()) || updated.getTime() > published.getTime())) {
    return updated;
  }
  return published;
}

export function dealSnapshot(post, now = new Date()) {
  if (post?.data?.category !== 'deals') return null;
  const asOf = dealAsOf(post.data);
  const today = now instanceof Date ? now : new Date(now);
  const expired = Number.isNaN(asOf.getTime()) || utcDay(asOf) < utcDay(today);
  return { expired, asOf };
}

export function dealAsOfKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${date.getUTCFullYear()}-${month}-${day}`;
}

// `YYYY-MM-DD` keys compare in UTC calendar order. A missing key is expired.
export function isAsOfExpired(asOfKey, now = new Date()) {
  if (!asOfKey) return true;
  return asOfKey < dealAsOfKey(now);
}

export function selectLatestArticles(posts, { excludeSlug, limit = 8, now = new Date() } = {}) {
  return [...posts]
    .filter((post) => post.slug !== excludeSlug)
    .filter((post) => dealSnapshot(post, now)?.expired !== true)
    .sort(compareByPublishDateDesc)
    .slice(0, limit);
}

export function selectPromotedDeals(posts, now = new Date(), limit = 3) {
  return [...posts]
    .filter((post) => dealSnapshot(post, now)?.expired === false)
    .sort(compareByPublishDateDesc)
    .slice(0, limit);
}
