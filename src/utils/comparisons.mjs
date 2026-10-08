import { archivePages } from './archive.mjs';
export const comparisonHref = page => page === 1 ? '/versus/' : `/versus/page/${page}/`;
export const comparisonPages = posts => archivePages(posts.filter(post => post.data.category === 'versus'));
export function comparisonData(post) {
  return { href: `/blog/${post.slug}/`, title: post.data.title, description: post.data.description,
    image: post.data.featured_image, subcategory: post.data.subcategory || '',
    date: new Date(post.data.date).toISOString().slice(0, 10) };
}
