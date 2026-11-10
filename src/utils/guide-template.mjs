// Buyer-guide template helpers. They rearrange stored fields. They do not
// invent prices, specs, scores, stock, or update dates.
export const GUIDE_COMPARE_PLACEMENT = 'guide_compare';
export const GUIDE_PICKS_PLACEMENT = 'quick_picks';
export const NOT_LISTED = 'Not listed';
export const SHORT_DISCLOSURE = 'We may earn a commission from these links, at no cost to you.';

export const REVIEW_BASIS = {
  'research-based': {
    title: 'Research-based coverage',
    description: 'Built from cited manufacturer information, current pricing, published sources, and clearly identified golfer feedback. This article is not presented as a hands-on product test.',
    visible: 'Research-based picks, not hands-on tests.',
    summary: 'How we research',
  },
  'hands-on': {
    title: 'Hands-on coverage',
    description: 'Based on direct use by the named author. The article explains the relevant testing conditions and limits.',
    visible: 'Hands-on coverage by the named author.',
    summary: 'How this was produced',
  },
  hybrid: {
    title: 'Hands-on and research-based coverage',
    description: 'Combines direct use by the named author with cited product information, current pricing, and other published sources.',
    visible: 'Hands-on and research-based coverage.',
    summary: 'How this was produced',
  },
};

const PRODUCT_PATH = /\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})(?![A-Z0-9])/i;
const PRICE_TEXT = /\$\s*\d|\bapprox\.?\b/i;
const UNKNOWN_SOURCE = /^(?:n\/?a|unknown|tbd|not (?:stated|listed|available|published|specified|disclosed|provided)(?:\s+.*)?|[—–-])$/i;

export function isBuyerGuide(content) {
  return content?.category === 'best';
}

export function stickyNavRequested(search) {
  const raw = typeof search === 'string' ? search : '';
  const params = typeof search === 'string'
    ? new URLSearchParams(raw.startsWith('?') ? raw.slice(1) : raw)
    : search;
  if (!params || typeof params.get !== 'function') return false;
  return params.get('guide_sticky') === '1';
}

export function researchDisclosure(basis) {
  return REVIEW_BASIS[basis] || null;
}

export function formatGuideDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function topPicksHeading(shownCount) {
  if (shownCount <= 0) return '';
  if (shownCount === 1) return 'Our top pick';
  return `Our top ${shownCount} picks`;
}

export function compareJumpLabel(total) {
  if (total <= 1) return 'Compare this pick';
  return `Compare all ${total} picks`;
}

export function stickyNavLabel(shownCount) {
  if (shownCount <= 1) return 'Top pick';
  return `Top ${shownCount} picks`;
}

export function guideRetailerCta({ direct = false, retailer = 'Amazon' } = {}) {
  const name = String(retailer || 'Amazon').trim() || 'Amazon';
  const amazon = /^amazon(?:\.com)?$/i.test(name);
  if (amazon) return direct ? 'Check Amazon' : 'Search Amazon';
  return direct ? `Check ${name}` : `See options at ${name}`;
}

// A mobile reason is one complete sourced line. Longer copy is omitted
// instead of cut down to a word or two. 80 characters is about two lines
// beside the 120px button at 320px, so the line can wrap without an ellipsis.
const MOBILE_REASON_MAX = 80;

export function mobileReason(why) {
  const text = cleanText(why);
  if (!text || containsPriceText(text)) return '';
  // A version such as "2.0" is not the end of the sentence.
  const sentence = text.match(/^[\s\S]+?(?:[.!?](?=\s|$)|$)/);
  const candidate = cleanText(sentence ? sentence[0] : text);
  if (!candidate || !text.startsWith(candidate)) return '';
  const words = candidate.split(' ').filter(Boolean);
  if (words.length < 3 || candidate.length > MOBILE_REASON_MAX) return '';
  return candidate;
}

export function containsPriceText(value) {
  return PRICE_TEXT.test(String(value || ''));
}

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

/** A published disagreement, such as "Conflicting figures*", is not an unknown. */
export function isDocumentedConflict(value) {
  return /\bconflicts?\b|\bconflicting\b/i.test(cleanText(value));
}

export function publishedField(value) {
  const text = cleanText(value);
  if (!text || containsPriceText(text)) return NOT_LISTED;
  if (isDocumentedConflict(text)) return text;
  if (UNKNOWN_SOURCE.test(text)) return NOT_LISTED;
  return text;
}

export function headingSlug(text) {
  const base = cleanText(text)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'section';
}

export function uniqueHeadingId(text, used) {
  const base = headingSlug(text);
  const seen = used.get(base) || 0;
  used.set(base, seen + 1);
  return seen === 0 ? base : `${base}-${seen + 1}`;
}

function stripMarkdown(text) {
  return cleanText(String(text || '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_`]/g, ''));
}

export function markdownHeadings(source) {
  const used = new Map();
  const headings = [];
  let fence = false;
  for (const line of String(source || '').split(/\r?\n/)) {
    if (/^(```|~~~)/.test(line.trim())) {
      fence = !fence;
      continue;
    }
    if (fence) continue;
    const match = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!match) continue;
    const text = stripMarkdown(match[2]);
    headings.push({
      depth: match[1].length,
      text,
      id: uniqueHeadingId(text, used),
    });
  }
  return headings;
}

function tokens(value) {
  return cleanText(value).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

export function headingMatchesProduct(product, heading) {
  const wanted = tokens(product);
  const found = tokens(heading);
  if (wanted.length < 2 || found.length === 0) return false;
  return wanted.every((token) => found.includes(token));
}

function bestHeading(product, headings) {
  const wanted = tokens(product);
  let best = null;
  let bestScore = -Infinity;
  for (const heading of headings) {
    if (!headingMatchesProduct(product, heading.text)) continue;
    const extra = tokens(heading.text).length - wanted.length;
    const score = wanted.length * 10 - extra;
    if (score > bestScore) {
      best = heading;
      bestScore = score;
    }
  }
  return best;
}

function markdownSections(source) {
  const sections = [];
  let fence = false;
  let current = null;
  for (const line of String(source || '').split(/\r?\n/)) {
    if (/^(```|~~~)/.test(line.trim())) {
      fence = !fence;
      if (current) current.lines.push(line);
      continue;
    }
    if (!fence) {
      const match = /^##\s+(.+?)\s*#*\s*$/.exec(line);
      if (match) {
        if (current) sections.push(current);
        current = { heading: stripMarkdown(match[1]), lines: [] };
        continue;
      }
    }
    if (current) current.lines.push(line);
  }
  if (current) sections.push(current);
  return sections.map((section) => ({
    heading: section.heading,
    body: section.lines.join('\n'),
  }));
}

function sectionFor(product, source) {
  const sections = markdownSections(source);
  const headings = sections.map((section) => ({ text: section.heading, depth: 2 }));
  const match = bestHeading(product, headings);
  if (!match) return '';
  return sections.find((section) => section.heading === match.text)?.body || '';
}

function splitRow(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim());
}

export function markdownTables(source) {
  const tables = [];
  const lines = String(source || '').split(/\r?\n/);
  let fence = false;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^(```|~~~)/.test(line.trim())) {
      fence = !fence;
      continue;
    }
    if (fence || !line.trim().startsWith('|')) continue;
    const block = [];
    while (index < lines.length && lines[index].trim().startsWith('|')) {
      block.push(lines[index]);
      index += 1;
    }
    index -= 1;
    if (block.length < 2) continue;
    const headers = splitRow(block[0]);
    const divider = /^[\s|:-]+$/.test(block[1]);
    const rows = block.slice(divider ? 2 : 1).filter((row) => !/^[\s|:-]+$/.test(row)).map(splitRow);
    tables.push({ headers, rows });
  }
  return tables;
}

function rowMatches(rowName, product) {
  const row = tokens(rowName);
  const prod = tokens(product);
  if (!row.length || !prod.length) return false;
  if (row.join(' ') === prod.join(' ')) return true;
  if (row.length >= 2 && row.every((token) => prod.includes(token))) return true;
  if (prod.length >= 2 && prod.every((token) => row.includes(token))) return true;
  return false;
}

function isPriceHeader(header) {
  return /price|cost|msrp|\$/i.test(header);
}

function tableCell(source, product, headerPattern) {
  for (const table of markdownTables(source)) {
    const index = table.headers.findIndex((header) => headerPattern.test(header) && !isPriceHeader(header));
    if (index < 0) continue;
    const row = table.rows.find((cells) => rowMatches(cells[0] || '', product));
    if (!row) continue;
    return row[index] || '';
  }
  return '';
}

function swingPhrase(text) {
  const match = String(text || '').match(/swing speeds?\s+\d[\d\s./–\-]*mph(?:\s+with\s+a\s+[^.]{0,80})?/i);
  return match ? cleanText(match[0]) : '';
}

function whoItsFor(section) {
  const match = String(section || '').match(/^\*\*Who it's for:\*\*\s*(.+)$/im);
  if (!match) return '';
  return stripMarkdown(match[1]);
}

function fieldMode(subcategory) {
  if (subcategory === 'bags' || subcategory === 'drivers' || subcategory === 'irons') return subcategory;
  return 'editorial';
}

function structuredFields(pick, body, mode) {
  if (mode === 'bags') {
    return [
      { label: 'Published empty weight', value: publishedField(tableCell(body, pick.product, /empty weight/i)) },
      { label: 'Dividers', value: publishedField(tableCell(body, pick.product, /divider/i)) },
    ];
  }
  if (mode === 'drivers') {
    const phrase = swingPhrase(pick.why) || swingPhrase(sectionFor(pick.product, body)) || swingPhrase(pick.award);
    return [{ label: 'Swing speed', value: publishedField(phrase) }];
  }
  return [{ label: "Who it's for", value: publishedField(whoItsFor(sectionFor(pick.product, body))) }];
}

function presentLink(pick, placement) {
  const cta = guideRetailerCta(pick);
  const product = cleanText(pick.product);
  return {
    product,
    href: pick.url,
    retailer: cleanText(pick.retailer) || 'Amazon',
    cta,
    accessibleName: `${cta} for ${product} (opens in a new tab)`,
    placement,
  };
}

export function buildGuideModel({ picks = [], body = '', subcategory = '' } = {}) {
  const list = Array.isArray(picks) ? picks.filter((pick) => pick && pick.product && pick.url) : [];
  const shown = list.slice(0, 3);
  const mode = fieldMode(subcategory);
  const headings = markdownHeadings(body).filter((heading) => heading.depth === 2);
  const rows = list.map((pick) => {
    const link = presentLink(pick, GUIDE_COMPARE_PLACEMENT);
    const amazon = /^amazon(?:\.com)?$/i.test(link.retailer);
    const cta = amazon ? 'Check Amazon' : link.cta;
    const fields = mode === 'editorial'
      ? [{ label: 'Our take', value: publishedField(pick.why) }]
      : structuredFields(pick, body, mode);
    const heading = bestHeading(pick.product, headings);
    return {
      ...link,
      cta,
      accessibleName: `${cta} for ${link.product} (opens in a new tab)`,
      bestFor: publishedField(pick.award),
      fields,
      reviewHref: heading ? `#${heading.id}` : '',
    };
  });
  return {
    hasPicks: shown.length > 0,
    heading: topPicksHeading(shown.length),
    jumpLabel: compareJumpLabel(list.length),
    navLabel: stickyNavLabel(shown.length),
    fieldMode: mode,
    top: shown.map((pick) => {
      const link = presentLink(pick, GUIDE_PICKS_PLACEMENT);
      const amazon = /^amazon(?:\.com)?$/i.test(link.retailer);
      const cta = amazon ? 'Check Amazon' : link.cta;
      return {
        ...link,
        cta,
        accessibleName: `${cta} for ${link.product} (opens in a new tab)`,
        award: cleanText(pick.award),
        why: containsPriceText(pick.why) ? '' : cleanText(pick.why),
        reason: mobileReason(pick.why),
      };
    }),
    rows,
  };
}

// Static link check only. This never requests the retailer, so a bot wall
// (including HTTP 403) is not evidence that a product page is missing.
export function inspectRetailerUrl(url, verifiedAsins = new Set()) {
  const report = { url: String(url || ''), liveCheck: 'not-run', issues: [] };
  let parsed;
  try {
    parsed = new URL(report.url);
  } catch {
    report.issues.push('unparseable URL');
    return report;
  }
  const host = parsed.hostname.replace(/^www\./, '');
  const amazon = host === 'amazon.com' || host.endsWith('.amazon.com');
  if (!amazon) return report;
  if (parsed.searchParams.get('tag') !== 'birdiereport-20') {
    report.issues.push('Amazon tag is not birdiereport-20');
  }
  const asin = parsed.pathname.match(PRODUCT_PATH)?.[1]?.toUpperCase();
  if (asin && !verifiedAsins.has(asin)) {
    report.issues.push(`direct ASIN ${asin} is not in data/verified-asins.json`);
  }
  return report;
}
