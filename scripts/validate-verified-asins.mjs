import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const registryPath = join(root, 'data/verified-asins.json');
const scannedExtensions = new Set(['.md', '.mdx', '.astro', '.js', '.mjs', '.ts', '.tsx', '.jsx', '.html', '.vue']);
const scannedRoots = ['src/content', 'src/components', 'src/layouts', 'src/pages'];

// Search URLs stay allowed. These are product-page paths, including the slug form
// amazon.com/Product-Name/dp/ASIN and the mobile /gp/aw/d/ form.
const directProductLink = /https?:\/\/(?:[a-z0-9-]+\.)?amazon\.com\/(?:[^"'`\s<>]*\/)?(?:dp|gp\/product|gp\/aw\/d)\/([A-Za-z0-9]{10})(?![A-Za-z0-9])/gi;

const requiredFields = ['asin', 'product', 'variant', 'verified_at', 'verification_method', 'evidence'];

function filesUnder(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

function loadRegistry() {
  const errors = [];
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(registryPath, 'utf8'));
  } catch (error) {
    return { asins: new Set(), errors: [`data/verified-asins.json: ${error.message}`] };
  }

  if (!parsed || !Array.isArray(parsed.asins)) {
    return { asins: new Set(), errors: ['data/verified-asins.json: expected an "asins" array'] };
  }

  const asins = new Set();
  parsed.asins.forEach((entry, index) => {
    const label = `data/verified-asins.json asins[${index}]`;
    if (!entry || typeof entry !== 'object') {
      errors.push(`${label}: expected an object`);
      return;
    }
    for (const field of requiredFields) {
      if (typeof entry[field] !== 'string' || !entry[field].trim()) {
        errors.push(`${label}: missing ${field}`);
      }
    }
    const asin = typeof entry.asin === 'string' ? entry.asin.trim().toUpperCase() : '';
    if (asin && !/^[A-Z0-9]{10}$/.test(asin)) {
      errors.push(`${label}: ${entry.asin} is not a 10-character ASIN`);
    }
    if (asin && asins.has(asin)) errors.push(`${label}: duplicate ASIN ${asin}`);
    if (asin) asins.add(asin);
    if (typeof entry.verified_at === 'string' && !/^\d{4}-\d{2}-\d{2}$/.test(entry.verified_at)) {
      errors.push(`${label}: verified_at must be YYYY-MM-DD`);
    }
  });

  return { asins, errors };
}

const { asins, errors } = loadRegistry();
let directLinks = 0;

for (const directory of scannedRoots) {
  const absolute = join(root, directory);
  if (!statSync(absolute, { throwIfNoEntry: false })?.isDirectory()) continue;

  for (const path of filesUnder(absolute).filter((filename) => scannedExtensions.has(extname(filename)))) {
    const source = readFileSync(path, 'utf8');
    for (const match of source.matchAll(directProductLink)) {
      directLinks += 1;
      const asin = match[1].toUpperCase();
      if (!asins.has(asin)) {
        const line = source.slice(0, match.index).split('\n').length;
        errors.push(`${relative(root, path)}:${line}: amazon product link ${asin} is not in data/verified-asins.json`);
      }
    }
  }
}

if (errors.length > 0) {
  console.error('Verified ASIN check failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Verified ASIN check passed: ${directLinks} direct Amazon product link${directLinks === 1 ? '' : 's'} across content and components, ${asins.size} registered.`);
