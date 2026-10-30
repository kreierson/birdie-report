export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function ctaLink(link) {
  const placement = 'data-placement="gapping_tool"';
  if (link.kind === 'amazon') {
    return `<a class="inline-flex min-h-11 items-center justify-center rounded-md bg-gold-500 px-4 py-2 text-center text-sm font-bold text-forest-900 hover:bg-gold-400" href="${escapeHtml(link.href)}" target="_blank" rel="nofollow sponsored noopener" data-affiliate-link="true" data-product="${escapeHtml(link.product)}" data-retailer="Amazon" ${placement}>${escapeHtml(link.label)}</a>`;
  }
  return `<a class="inline-flex min-h-11 items-center justify-center rounded-md border border-forest-700 bg-white px-4 py-2 text-center text-sm font-semibold text-forest-800 hover:bg-forest-50" href="${escapeHtml(link.href)}" data-product="${escapeHtml(link.product)}" ${placement}>${escapeHtml(link.label)}</a>`;
}

function rowClass(status) {
  if (status === 'large') return 'border-l-4 border-red-700 bg-red-50';
  if (status === 'wide' || status === 'tight') return 'border-l-4 border-amber-600 bg-amber-50';
  return 'border-l-4 border-transparent bg-white';
}

export function chartBodyHtml(model) {
  if (!model.ok || !model.rows.length) return '';

  const items = model.rows.map((row) => {
    const anchor = row.isAnchor ? ' <span class="ml-1 rounded bg-forest-800 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Anchor</span>' : '';
    const gap = row.nextName
      ? `<p class="text-sm text-gray-800">Gap to ${escapeHtml(row.nextName.toLowerCase())}: <strong>${escapeHtml(row.gapLabel)}</strong>. <strong>${escapeHtml(row.statusLabel)}.</strong></p>`
      : '<p class="text-sm text-gray-600">Shortest club in this chart.</p>';
    const suggestion = row.suggestion
      ? `<p class="mt-1 text-sm leading-relaxed text-gray-900">${escapeHtml(row.suggestion)}</p>`
      : '';
    return `<li class="rounded-md px-3 py-3 ${rowClass(row.status)}">
      <p class="text-base font-semibold text-forest-900">${escapeHtml(row.name)}${anchor} <span class="font-medium text-gray-600">· ${escapeHtml(row.loftLabel)}</span></p>
      <p class="text-sm text-gray-800">Estimated carry <strong class="text-base text-gray-950">${escapeHtml(row.carryLabel)}</strong></p>
      ${gap}
      ${suggestion}
    </li>`;
  }).join('');

  const ctas = model.ctas.length
    ? `<div class="mt-4 space-y-4">${model.ctas.map((cta) => `<section class="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <h3 class="font-display text-lg font-bold text-forest-900">${escapeHtml(cta.heading)}</h3>
        <p class="mt-1 text-sm leading-relaxed text-gray-700">${escapeHtml(cta.body)}</p>
        <div class="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">${cta.links.map(ctaLink).join('')}</div>
      </section>`).join('')}
      <p class="text-xs leading-relaxed text-gray-500">Shopping links are affiliate links. As an Amazon Associate, The Birdie Report earns from qualifying purchases. Estimates above are not affected. <a class="underline" href="/affiliate-disclosure/">Affiliate disclosure</a>.</p>
    </div>`
    : '<p class="mt-4 text-sm text-gray-600">No shopping links on a clean chart. Affiliate links show up only next to a gap that needs a look.</p>';

  return `<ol class="space-y-2">${items}</ol>${ctas}`;
}
