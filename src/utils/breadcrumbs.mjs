// Visible trails and BreadcrumbList JSON-LD share this map so a crumb never
// points at a section the site does not actually publish.
export const SITE = 'https://www.birdiereport.com';

export const SECTIONS = {
  best: { name: 'Best Of', href: '/best/' },
  reviews: { name: 'Reviews', href: '/reviews/' },
  tips: { name: 'Tips', href: '/tips/' },
  news: { name: 'News', href: '/news/' },
  deals: { name: 'Deals', href: '/deals/' },
  courses: { name: 'Courses', href: '/courses/' },
  versus: { name: 'Versus', href: '/versus/' },
  opinion: { name: 'Opinion', href: '/opinion/' },
  tools: { name: 'Tools', href: '/tools/' },
  blog: { name: 'All Articles', href: '/blog/' },
  tags: { name: 'Tags', href: '/tags/' },
};

export function absoluteUrl(href) {
  const url = new URL(href, SITE);
  if (url.origin !== SITE) {
    throw new Error(`Breadcrumb URL must stay on ${SITE}: ${href}`);
  }
  if (!url.pathname.endsWith('/')) url.pathname += '/';
  url.search = '';
  url.hash = '';
  return url.toString();
}

export function breadcrumbList(items) {
  if (!Array.isArray(items) || items.length < 2) {
    throw new Error('A breadcrumb trail needs a parent and the current page');
  }
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => {
      const name = typeof item?.name === 'string' ? item.name.trim() : '';
      if (!name || !item?.href) throw new Error('Breadcrumb item needs a name and href');
      return {
        '@type': 'ListItem',
        position: index + 1,
        name,
        item: absoluteUrl(item.href),
      };
    }),
  };
}

export function jsonLdScript(data) {
  return JSON.stringify(data).replaceAll('<', '\\u003c');
}

export function sectionTrail(key, current = null) {
  const section = SECTIONS[key];
  if (!section) throw new Error(`No breadcrumb section for "${key}"`);
  const items = [{ name: 'Home', href: '/' }, { name: section.name, href: section.href }];
  if (!current) return items;
  const name = typeof current.name === 'string' ? current.name.trim() : '';
  if (!name || !current.href) throw new Error('Current breadcrumb needs a name and href');
  items.push({ name, href: current.href });
  return items;
}

export function postTrail(category, title, pathname) {
  return sectionTrail(category, { name: title, href: pathname });
}
