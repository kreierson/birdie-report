export const ARCHIVE_PAGE_SIZE = 36;
export const archiveHref = page => page === 1 ? '/blog/' : `/blog/page/${page}/`;
export function archivePages(posts) {
  const sorted = [...posts].sort((a, b) =>
    new Date(b.data.date).getTime() - new Date(a.data.date).getTime() || a.slug.localeCompare(b.slug));
  return Array.from({ length: Math.max(1, Math.ceil(sorted.length / ARCHIVE_PAGE_SIZE)) }, (_, i) => ({
    posts: sorted.slice(i * ARCHIVE_PAGE_SIZE, (i + 1) * ARCHIVE_PAGE_SIZE),
    current: i + 1,
    total: sorted.length,
    last: Math.max(1, Math.ceil(sorted.length / ARCHIVE_PAGE_SIZE)),
  }));
}
