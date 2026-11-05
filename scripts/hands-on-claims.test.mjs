import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const blog = join(root, 'src/content/blog');
const evidence = JSON.parse(readFileSync(join(root, 'data/hands-on-evidence.json'), 'utf8')).records;

const phrases = [
  { label: "I've tested", re: /\bI(?:'ve| have) tested\b/i },
  { label: 'I tested', re: /\bI tested\b/i },
  { label: 'we tested', re: /\bwe(?:'ve| have)? tested\b/i },
  { label: 'How I Tested', re: /\bHow I Tested\b/i },
  { label: 'How We Tested', re: /\bHow We Tested\b/i },
  { label: 'after N rounds', re: /\bafter \d+ rounds\b/i },
  { label: 'on the course with', re: /\bon the course with\b/i },
  { label: 'my testing', re: /\bmy testing\b/i },
  { label: 'launch monitor data showed', re: /\blaunch monitor data showed\b/i },
  { label: 'hands-on coverage claim', re: /\bhands-on\b/i },
];

function frontmatter(source) {
  return source.match(/^---\n([\s\S]*?)\n---/)?.[1] || '';
}

function field(fm, name) {
  return fm.match(new RegExp(`^${name}:\\s*["']?([^"'\\n]+)["']?`, 'm'))?.[1]?.trim() || '';
}

function evidenceIds(fm) {
  const raw = fm.match(/^evidence_ids:\s*\[([^\]]*)\]/m)?.[1] || '';
  return raw.split(',').map((id) => id.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
}

function supported(slug, ids) {
  return ids.some((id) => {
    const record = evidence[id];
    return Boolean(
      record?.confirmed_by
      && record.scope
      && record.confirmation_record
      && existsSync(join(root, record.confirmation_record))
      && record.allowed_articles?.includes(slug),
    );
  });
}

function denial(sentence) {
  return /\b(no|not|never|without|don't|do not|isn't|is not|aren't|fake|pretend|invented|nonsense)\b/i.test(sentence);
}

test('a post cannot claim hands-on coverage or first-person testing without a matching evidence record', () => {
  const problems = [];
  for (const file of readdirSync(blog).filter((name) => name.endsWith('.md') || name.endsWith('.mdx'))) {
    const source = readFileSync(join(blog, file), 'utf8');
    const fm = frontmatter(source);
    const slug = file.replace(/\.mdx?$/, '');
    const basis = field(fm, 'review_basis');
    const backed = supported(slug, evidenceIds(fm));
    if ((basis === 'hands-on' || basis === 'hybrid') && !backed) {
      problems.push(`${file}: ${basis} coverage has no matching hands-on evidence record`);
    }
    if (backed) continue;
    const prose = source.replace(/^---\n[\s\S]*?\n---/, '');
    for (const sentence of prose.split(/\n|(?<=[.!?])\s+/)) {
      if (denial(sentence)) continue;
      for (const phrase of phrases) {
        if (phrase.re.test(sentence)) problems.push(`${file}: unsupported first-person testing phrase "${phrase.label}"`);
      }
    }
  }
  assert.deepEqual(problems, []);
});
