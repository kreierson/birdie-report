import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BRANDS = new Set([
  'titleist', 'ping', 'taylormade', 'callaway', 'cobra', 'cleveland', 'footjoy',
  'mizuno', 'srixon', 'odyssey', 'scotty', 'cameron', 'garmin', 'bushnell',
  'nike', 'adidas', 'bridgestone', 'vice', 'kirkland', 'wilson', 'pxg', 'honma',
  'xxio', 'skechers', 'puma', 'ecco', 'nikon', 'rapsodo', 'bettinardi', 'evnroll',
  'lab', 'acushnet', 'fj',
]);

const DROPPED = new Set([
  'a', 'an', 'and', 'the', 'for', 'vs', 'versus', 'golf', 'club', 'clubs',
  'driver', 'drivers', 'iron', 'irons', 'wedge', 'wedges', 'putter', 'putters',
  'ball', 'balls', 'shoe', 'shoes', 'glove', 'gloves', 'bag', 'bags',
  'review', 'comparison', 'argument', 'decision', 'page', 'guide', 'new',
  'our', 'piece', 'breakdown', 'debate', 'head', 'notes', 'why', 'mattered',
  'sunday', 'opinion', 'take', 'exactly', 'kind', 'finish', 'needed', 'this',
  'that', 'just', 'here', 'to', 'of', 'still', 'is', 'was', 'be', 'on', 'in',
  'with', 'from', 'about', 'into', 'your', 'my', 'their', 'what', 'when',
  'where', 'who', 'how', 'before', 'after', 'its', 'it', 'are', 'by', 'as',
  'at', 'or', 'if', 'but', 'not', 'also', 'only', 'even', 'really', 'there',
  'so', 'than', 'too', 'all', 'any', 'both', 'each', 'few', 'some', 'such',
  'now', 'which', 'while', 'because', 'without', 'matchup',
]);

const LINK = /\[([^\]]+)\]\(([^)\s]+)\)/g;
const SEPARATOR = /^(?:,|\band\b|\bor\b|the sharper new|the newer|the new|a new|\s)+$/i;

export function headingId(text) {
  const base = text
    .toLowerCase()
    .replace(/&amp;/g, ' and ')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-');
  return base;
}

export function headingIds(headings) {
  const seen = new Map();
  return headings.map((text) => {
    const base = headingId(text);
    const count = seen.get(base) || 0;
    seen.set(base, count + 1);
    return { text, id: count === 0 ? base : `${base}-${count}` };
  });
}

export function significantTokens(value) {
  return String(value)
    .split(':')[0]
    .toLowerCase()
    .replace(/&amp;/g, ' and ')
    .replace(/\(\d{4}\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((token) => token && !DROPPED.has(token) && !/^(19|20)\d{2}$/.test(token));
}

function covers(linkText, targetText) {
  const linkTokens = significantTokens(linkText);
  const targetTokens = significantTokens(targetText);
  if (linkTokens.length < 2 || targetTokens.length < 2) return false;
  const linkSet = new Set(linkTokens);
  const targetSet = new Set(targetTokens);
  if (linkTokens.every((token) => targetSet.has(token))) return true;
  const extras = linkTokens.filter((token) => !targetSet.has(token));
  return targetTokens.every((token) => linkSet.has(token)) && extras.every((token) => BRANDS.has(token));
}

function splitVs(value) {
  const parts = value.split(/\s+vs\.?\s+/i);
  return parts.length === 2 ? parts : null;
}

export function isComparisonLabel(value) {
  const parts = splitVs(String(value).replace(/[*_`]/g, '').split(':')[0]);
  if (!parts) return false;
  return parts.every((part) => part.trim().split(/\s+/).filter(Boolean).length <= 7);
}

export function parseBlogHref(href) {
  const match = String(href).match(/^(https?:\/\/(?:www\.)?birdiereport\.com)?\/blog\/([a-z0-9-]+)\/?(?:#([a-z0-9-]+))?$/i);
  if (!match) return null;
  return { origin: match[1] || '', slug: match[2], hash: match[3] || '' };
}

function formatHref(origin, slug, hash) {
  return `${origin}/blog/${slug}/${hash ? `#${hash}` : ''}`;
}

function bestHeading(label, headings) {
  let best = null;
  let extra = Infinity;
  const linkCount = significantTokens(label).length;
  for (const heading of headings) {
    if (!covers(label, heading.text)) continue;
    const surplus = significantTokens(heading.text).length - linkCount;
    if (surplus < extra) {
      extra = surplus;
      best = heading;
    }
  }
  return best;
}

export function comparisonLinkErrors(source, pages) {
  const errors = [];
  for (const match of source.matchAll(LINK)) {
    if (source[match.index - 1] === '!') continue;
    const label = match[1].replace(/[*_`]/g, '');
    if (!isComparisonLabel(label)) continue;
    const href = parseBlogHref(match[2]);
    if (!href || !pages.has(href.slug)) continue;
    const page = pages.get(href.slug);
    const titleMatch = covers(label, page.title);
    const heading = page.headings.find((item) => item.id === href.hash);
    const headingMatch = heading ? covers(label, heading.text) : false;
    if (titleMatch && !href.hash) continue;
    if (headingMatch) continue;
    const namedHeading = bestHeading(label, page.headings);
    if (titleMatch && href.hash && !headingMatch) {
      errors.push(`comparison link "${label}" hash does not match a heading on ${href.slug}`);
      continue;
    }
    if (!titleMatch && namedHeading && href.hash !== namedHeading.id) {
      errors.push(`comparison link "${label}" does not match ${href.slug} ("${page.title}")`);
      continue;
    }
    if (!titleMatch && !namedHeading) {
      errors.push(`comparison link "${label}" does not match ${href.slug} ("${page.title}")`);
    }
  }
  return errors;
}

function rewriteOne(source, pages) {
  return source.replace(/(?<!!)((?:the sharper new|the newer|the new|a new) )?\[([^\]]+)\]\(([^)\s]+)\)/gi, (full, stale, label, href) => {
    const parsed = parseBlogHref(href);
    if (!parsed || !pages.has(parsed.slug) || !isComparisonLabel(label)) return full;
    const page = pages.get(parsed.slug);
    const titleMatch = covers(label, page.title);
    const heading = bestHeading(label, page.headings);
    const titleExtra = titleMatch ? significantTokens(page.title).length - significantTokens(label).length : Infinity;
    const headingExtra = heading ? significantTokens(heading.text).length - significantTokens(label).length : Infinity;
    if (heading && headingExtra < titleExtra) {
      return `[${heading.text}](${formatHref(parsed.origin, parsed.slug, heading.id)})`;
    }
    if (titleMatch && parsed.hash) return `${stale || ''}[${label}](${formatHref(parsed.origin, parsed.slug, '')})`;
    return full;
  });
}

function linkSpans(text) {
  const spans = [];
  for (const match of text.matchAll(LINK)) {
    if (text[match.index - 1] === '!') continue;
    spans.push({ start: match.index, end: match.index + match[0].length, label: match[1], href: match[2] });
  }
  return spans;
}

function collapseRuns(text, pages) {
  const spans = linkSpans(text);
  if (spans.length < 2) return text;
  const runs = [];
  let current = [0];
  for (let index = 1; index < spans.length; index += 1) {
    const gap = text.slice(spans[index - 1].end, spans[index].start);
    if (SEPARATOR.test(gap)) current.push(index);
    else {
      runs.push(current);
      current = [index];
    }
  }
  runs.push(current);
  const drop = new Set();
  const replacement = new Map();
  for (const run of runs) {
    const groups = new Map();
    for (const index of run) {
      if (!isComparisonLabel(spans[index].label)) continue;
      const parsed = parseBlogHref(spans[index].href);
      if (!parsed || !pages.has(parsed.slug)) continue;
      if (!groups.has(parsed.slug)) groups.set(parsed.slug, []);
      groups.get(parsed.slug).push(index);
    }
    for (const [slug, indexes] of groups) {
      if (indexes.length < 2) continue;
      const page = pages.get(slug);
      const titleIndex = indexes.find((index) => covers(spans[index].label, page.title));
      const primaryIndex = titleIndex ?? indexes[0];
      const displayLabel = titleIndex == null ? page.title : displayComparisonLabel(spans[titleIndex].label);
      const extras = uniqueLabels(indexes.map((index) => displayComparisonLabel(spans[index].label)))
        .filter((label) => label !== displayLabel && !(titleIndex != null && covers(label, page.title)));
      const note = extras.length ? ` (including ${joinNames(extras)})` : '';
      const parsed = parseBlogHref(spans[primaryIndex].href);
      replacement.set(primaryIndex, `[${displayLabel}](${formatHref(parsed.origin, slug, '')})${note}`);
      for (const index of indexes) if (index !== primaryIndex) drop.add(index);
    }
  }
  if (!drop.size && !replacement.size) return text;
  let cursor = 0;
  let result = '';
  spans.forEach((span, index) => {
    if (drop.has(index)) {
      const gap = text.slice(cursor, span.start);
      const trimmed = gap.replace(/(?:(?:,?\s*(?:and|or)\s+|,\s*)?(?:the sharper new|the newer|the new|a new)\s*|(?:,?\s*(?:and|or)\s+|,\s*))$/i, '');
      result += trimmed;
      cursor = span.end;
      return;
    }
    result += text.slice(cursor, span.start);
    result += replacement.get(index) || text.slice(span.start, span.end);
    cursor = span.end;
  });
  result += text.slice(cursor);
  return result.replace(/([^ \n]) {2,}(?=\S)/g, '$1 ');
}

function cleanLabel(value) {
  return String(value).replace(/[*_`]/g, '');
}

function displayComparisonLabel(value) {
  return cleanLabel(value).replace(/\s+(decision page|matchup|comparison|head-to-head|breakdown|piece|argument)$/i, '').trim();
}

function uniqueLabels(values) {
  const labels = [];
  for (const value of values) {
    const label = cleanLabel(value);
    if (!labels.includes(label)) labels.push(label);
  }
  return labels;
}

function joinNames(names) {
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names.at(-1)}`;
}

function collapseLists(text, pages) {
  const lines = text.split('\n');
  const output = [];
  let index = 0;
  while (index < lines.length) {
    if (!/^\s*[-*+] /.test(lines[index])) {
      output.push(lines[index]);
      index += 1;
      continue;
    }
    const list = [];
    while (index < lines.length && /^\s*[-*+] /.test(lines[index])) {
      list.push(lines[index]);
      index += 1;
    }
    output.push(...mergeList(list, pages));
  }
  return output.join('\n');
}

function mergeList(list, pages) {
  const itemPattern = /\[([^\]]+)\]\(([^)\s]+)\)/;
  const parsed = list.map((line) => {
    const match = line.match(itemPattern);
    const href = match ? parseBlogHref(match[2]) : null;
    return { line, href, label: match?.[1] || '', match };
  });
  const counts = new Map();
  for (const item of parsed) {
    if (!item.href || !pages.has(item.href.slug) || !isComparisonLabel(item.label)) continue;
    counts.set(item.href.slug, (counts.get(item.href.slug) || 0) + 1);
  }
  const emitted = new Set();
  const result = [];
  for (const item of parsed) {
    if (!item.href || (counts.get(item.href.slug) || 0) < 2) {
      result.push(item.line);
      continue;
    }
    if (emitted.has(item.href.slug)) continue;
    emitted.add(item.href.slug);
    const page = pages.get(item.href.slug);
    const siblings = parsed.filter((entry) => entry.href?.slug === item.href.slug);
    const titled = siblings.find((entry) => covers(entry.label, page.title));
    const primary = titled || siblings[0];
    const displayLabel = titled ? displayComparisonLabel(titled.label) : page.title;
    const extras = uniqueLabels(siblings.map((entry) => displayComparisonLabel(entry.label)))
      .filter((label) => label !== displayLabel && !(titled && covers(label, page.title)));
    const indent = primary.line.match(/^\s*[-*+] /)[0];
    const note = extras.length ? ` Also on that page: ${joinNames(extras)}.` : '';
    const href = formatHref(primary.href.origin, primary.href.slug, '');
    const rest = primary.match ? primary.line.slice(primary.line.indexOf(primary.match[0]) + primary.match[0].length) : '';
    const bridge = note && !/[.!?]$/.test(rest.trim()) ? '.' : '';
    result.push(`${indent}[${displayLabel}](${href})${rest}${bridge}${note}`);
  }
  return result;
}

export function rewriteComparisonLinks(source, pages) {
  const rewritten = rewriteOne(source, pages);
  return collapseLists(collapseRuns(rewritten, pages), pages);
}

export function pageRecord(title, headings) {
  const visible = title.split(':')[0].trim();
  return { title: visible, headings: headingIds(headings) };
}

export function loadComparisonPages(files) {
  const pages = new Map();
  for (const file of files) {
    const slug = file.slug;
    const title = file.source.match(/^title:\s*"?(.*?)"?\s*$/m)?.[1] || slug;
    const marker = file.source.split('## Other comparisons that now redirect here')[1] || '';
    const headings = [...marker.matchAll(/^### (.+)$/gm)].map((match) => match[1].trim());
    pages.set(slug, pageRecord(title, headings));
  }
  return pages;
}

export function comparisonObjectErrors(source, pages) {
  const errors = [];
  const pattern = /\{[^{}]*title:\s*['"]([^'"]+)['"][^{}]*href:\s*['"]([^'"]+)['"][^{}]*\}/g;
  for (const match of source.matchAll(pattern)) {
    const label = match[1];
    if (!isComparisonLabel(label)) continue;
    const href = parseBlogHref(match[2]);
    if (!href || !pages.has(href.slug)) continue;
    const page = pages.get(href.slug);
    if (!covers(label, page.title) && !page.headings.some((heading) => heading.id === href.hash && covers(label, heading.text))) {
      errors.push(`comparison card "${label}" does not match ${href.slug} ("${page.title}")`);
    }
  }
  return errors;
}

function walkBlog(directory) {
  return readdirSync(directory)
    .filter((name) => ['.md', '.mdx'].includes(extname(name)))
    .map((name) => ({
      slug: name.replace(/\.mdx?$/, ''),
      path: join(directory, name),
      source: readFileSync(join(directory, name), 'utf8'),
    }));
}

function walkSources(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return walkSources(path);
    return ['.md', '.mdx', '.astro', '.js', '.mjs', '.ts', '.tsx'].includes(extname(path)) ? [path] : [];
  });
}

function rewriteTree(root) {
  const blogDir = join(root, 'src/content/blog');
  const blog = walkBlog(blogDir);
  const pages = loadComparisonPages(blog);
  let changed = 0;
  const targets = [
    ...blog.map((file) => file.path),
    ...walkSources(join(root, 'src')).filter((path) => !path.startsWith(blogDir)),
  ];
  for (const path of targets) {
    const source = readFileSync(path, 'utf8');
    const next = rewriteComparisonLinks(source, pages);
    if (next !== source) {
      writeFileSync(path, next);
      changed += 1;
    }
  }
  return changed;
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isCli && process.argv.includes('--write')) {
  const root = fileURLToPath(new URL('../', import.meta.url));
  console.log(`updated comparison links in ${rewriteTree(root)} files`);
}
