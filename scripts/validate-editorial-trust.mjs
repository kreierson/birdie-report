import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const blogDirectory = fileURLToPath(new URL('../src/content/blog/', import.meta.url));
const sourceDirectory = fileURLToPath(new URL('../src/', import.meta.url));

const commercialCategories = new Set(['reviews', 'best', 'versus']);
const allowedReviewBases = new Set(['research-based', 'hands-on', 'hybrid']);
const pendingOwnerConfirmation = new Set();

const forbiddenIdentityPatterns = [
  /Brad Thompson/i,
  /brad@birdiereport\.com/i,
  /Email Brad/i,
  /Brad's Story/i,
];

const forbiddenUniversalTestingClaims = [
  /every piece of equipment goes through rigorous real-world testing/i,
  /we buy with our own money/i,
  /tested over months of actual play/i,
  /tested with our own money/i,
  /tested by real golfers/i,
];

function filesUnder(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

const errors = [];
let labeledCommercialArticles = 0;

for (const filename of readdirSync(blogDirectory).filter((name) => ['.md', '.mdx'].includes(extname(name)))) {
  const source = readFileSync(join(blogDirectory, filename), 'utf8');
  const category = source.match(/^category:\s*["']?([^"'\n]+)["']?/m)?.[1]?.trim();
  const reviewBasis = source.match(/^review_basis:\s*["']?([^"'\n]+)["']?/m)?.[1]?.trim();

  if (reviewBasis && !allowedReviewBases.has(reviewBasis)) {
    errors.push(`${filename}: unsupported review_basis "${reviewBasis}"`);
  }

  if (!commercialCategories.has(category)) continue;

  if (reviewBasis) {
    labeledCommercialArticles += 1;
  } else if (!pendingOwnerConfirmation.has(filename)) {
    errors.push(`${filename}: ${category} articles must declare review_basis`);
  }
}

for (const filename of pendingOwnerConfirmation) {
  const path = join(blogDirectory, filename);
  if (!statSync(path, { throwIfNoEntry: false })) {
    errors.push(`${filename}: remove missing article from the owner-confirmation allowlist`);
    continue;
  }

  const source = readFileSync(path, 'utf8');
  if (/^review_basis:/m.test(source)) {
    errors.push(`${filename}: remove classified article from the owner-confirmation allowlist`);
  }
}

for (const path of filesUnder(sourceDirectory).filter((filename) => ['.astro', '.js', '.md', '.mdx', '.ts'].includes(extname(filename)))) {
  const source = readFileSync(path, 'utf8');
  for (const pattern of [...forbiddenIdentityPatterns, ...forbiddenUniversalTestingClaims]) {
    if (pattern.test(source)) {
      errors.push(`${relative(root, path)}: contains forbidden legacy trust claim (${pattern.source})`);
    }
  }
}

if (errors.length > 0) {
  console.error('Editorial trust validation failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Editorial trust validation passed: ${labeledCommercialArticles} commercial articles labeled; ${pendingOwnerConfirmation.size} awaiting owner confirmation.`);
