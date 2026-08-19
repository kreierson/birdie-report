// @ts-check
import { readFileSync, readdirSync } from 'node:fs';
import { basename, extname } from 'node:path';
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

const site = 'https://www.birdiereport.com';
const blogDirectory = new URL('./src/content/blog/', import.meta.url);
const blogLastModified = new Map(
  readdirSync(blogDirectory)
    .filter((file) => ['.md', '.mdx'].includes(extname(file)))
    .map((file) => {
      const source = readFileSync(new URL(file, blogDirectory), 'utf8');
      const publishedDate = source.match(/^date:\s*["']?(\d{4}-\d{2}-\d{2})/m)?.[1];
      const pathname = `/blog/${basename(file, extname(file))}/`;

      return [pathname, publishedDate ? new Date(`${publishedDate}T00:00:00Z`) : undefined];
    })
);

// https://astro.build/config
export default defineConfig({
  site,
  build: {
    assets: 'br-assets',
  },
  integrations: [
    tailwind(),
    mdx(),
    sitemap({
      // Tag archives are navigation aids, not standalone search landing pages.
      filter: (page) => !new URL(page).pathname.startsWith('/tags/'),
      serialize: (item) => {
        const lastmod = blogLastModified.get(new URL(item.url).pathname);
        return lastmod ? { ...item, lastmod } : item;
      },
    }),
  ],
});
