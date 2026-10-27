import { isAsOfExpired } from './listing.mjs';

// Build-time filtering uses the deploy date. This runs in the browser so a deal
// whose as-of day has passed is hidden or marked without waiting for another deploy.
export function refreshDeals(root, now = new Date()) {
  const nodes = [...root.querySelectorAll('[data-deal-as-of]')];
  for (const el of nodes) {
    if (!isAsOfExpired(el.getAttribute('data-deal-as-of'), now)) continue;
    if (el.hasAttribute('data-deal-promote')) {
      el.remove();
      continue;
    }
    const badge = el.querySelector('[data-deal-expired-badge]');
    if (badge) badge.hidden = false;
    const note = el.querySelector('[data-deal-expired-note]');
    if (note) note.hidden = false;
    const label = el.querySelector('[data-deal-state-label]');
    if (label) label.textContent = 'Expired';
  }
  for (const group of [...root.querySelectorAll('[data-deal-promote-group]')]) {
    if (!group.querySelector('[data-deal-promote]')) group.remove();
  }
}
