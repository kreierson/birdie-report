import { getCollection } from 'astro:content';
import { comparisonPages, comparisonData } from '../../utils/comparisons.mjs';
export async function GET() {
  const posts = comparisonPages(await getCollection('blog')).flatMap(page => page.posts);
  return new Response(JSON.stringify(posts.map(comparisonData)), {
    headers: { 'Content-Type': 'application/json', 'X-Robots-Tag': 'noindex' },
  });
}
