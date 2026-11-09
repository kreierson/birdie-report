import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mostUsedGuides, tilesFor } from '../src/utils/home-router.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const home = readFileSync(join(root, 'dist/index.html'), 'utf8');
const problems = [];
const expect = (ok, message) => { if (!ok) problems.push(message); };

const head = [
  '<title>The Birdie Report — Golf Equipment Reviews, Tips &amp; Deals</title>',
  '<meta name="description" content="Honest golf equipment reviews, instruction tips, and the best deals on golf gear. No BS, just better golf.">',
  '<link rel="canonical" href="https://www.birdiereport.com/">',
];
for (const snippet of head) expect(home.includes(snippet), `head changed: ${snippet}`);

const jsonLd = `<script type="application/ld+json">
      [{
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "The Birdie Report",
        "url": "https://www.birdiereport.com",
        "logo": "https://www.birdiereport.com/logo.jpg",
        "description": "Golf equipment reviews, tips, and deals to help you improve your game and save money.",
        "founder": {
          "@type": "Person",
          "name": "Kyle Reierson"
        },
        "sameAs": [
          "https://x.com/kreierson22"
        ]
      },
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "The Birdie Report",
        "url": "https://www.birdiereport.com"
      }]
    </script>`;
expect(home.includes(jsonLd), 'homepage JSON-LD is not byte-identical');

for (const copy of [
  'Find the right golf gear',
  'What are you shopping for?',
  "Golfers' most-used guides",
  'See all 50+ buyer guides',
  'More ways to shop',
  'Latest reviews',
  'We test and write independently. Some links earn us a commission at no cost to you.',
]) expect(home.includes(copy), `missing copy: ${copy}`);

for (const href of ['/best/', '/blog/best-golf-gifts/', '/deals/', '/tools/', '/affiliate-disclosure/']) {
  expect(home.includes(`href="${href}"`), `missing crawlable link ${href}`);
}

expect(!/\$\d/.test(home), 'homepage renders a dollar price');
expect(!/<img\b/.test(home), 'homepage renders an image');
expect(home.includes('data-module="home_tiles"'), 'home_tiles marker missing');
expect(home.includes('data-placement="home-pill"'), 'home-pill marker missing');
expect(home.includes('data-placement="home-buyer-card"'), 'home-buyer-card marker missing');
expect(home.includes('data-placement="home-deals-hub"'), 'home-deals-hub marker missing');
expect(home.includes('data-placement="home-gift-guide"'), 'home-gift-guide marker missing');
expect(home.includes('data-guide-name="All Guides"'), 'All Guides marker missing');
expect(home.includes('data-guide-name="Golf club gapping calculator"'), 'gapping marker missing');
expect(home.includes('data-guide-name="2026 golf gift guide"'), 'gift guide marker missing');

for (const link of [...tilesFor(), ...mostUsedGuides()]) {
  const page = join(root, 'dist', link.href.slice(1), 'index.html');
  expect(existsSync(page), `guide did not build: ${link.href}`);
  expect(home.includes(`href="${link.href}"`), `homepage missing ${link.href}`);
}

const about = readFileSync(join(root, 'dist/about/index.html'), 'utf8');
expect(about.includes('width="1280"') && about.includes('height="436"'), 'site logo lost its dimensions');

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`Homepage router check passed for ${tilesFor().length} tiles and ${mostUsedGuides().length} guides.`);
