export const standardSource = 'https://ping.com/en-us/golf-clubs/putters/scottsdale-tec-ally-blue-onset-putter';
export const cbSource = 'https://ping.com/en-us/golf-clubs/putters/scottsdale-tec/scottsdale-tec-ally-blue-onset-cb-putter';
export const retailer = 'https://www.amazon.com/s?k=PING+Scottsdale+TEC+Ally+Blue+Onset+Putter&tag=birdiereport-20';

// A shopping next step from self-reported preferences, never a fitting diagnosis.
export function allyBluePlan({ stroke, version, address, sizing } = {}) {
  if (!['straight', 'other', 'unknown'].includes(stroke) ||
      !['standard', 'cb', 'unknown'].includes(version) ||
      !['comfortable', 'untried', 'dislike'].includes(address) || typeof sizing !== 'boolean') {
    return { id: 'incomplete', title: 'Answer each question first', text: 'Choose an answer for each question, including “not sure” where appropriate.', href: standardSource, label: 'Read PING’s standard-model specifications', affiliate: false };
  }
  if (stroke !== 'straight') return { id: 'fit-first', title: 'Confirm stroke fit before shopping this model', text: 'PING lists this model for a straight stroke. Bring your current putter to a fitter and compare setup, start line and distance control. A preference quiz cannot establish your stroke type.', href: '/blog/ping-scottsdale-tec-putters-review/', label: 'Explore the Scottsdale TEC family', affiliate: false };
  if (version !== 'standard') return { id: 'compare-builds', title: 'Separate standard and counterbalanced builds', text: 'PING lists the standard model at 35 inches and the CB at 37.75 inches with a 17-inch grip. Those are different setups. Compare them in person before choosing; a longer shaft alone does not establish fit.', href: cbSource, label: 'Check PING’s counterbalanced model', affiliate: false };
  if (address !== 'comfortable') return { id: 'try-address', title: address === 'dislike' ? 'Compare another setup picture' : 'Try the onset look before ordering', text: 'Check how the shaft and alignment marks look behind the ball. If that picture distracts you, compare alternatives in person. The linked comparison is research-based, not proof that either putter will improve your putting.', href: '/blog/ping-scottsdale-tec-ally-blue-onset-vs-odyssey-ai-one-milled-jailbird-mini-t/', label: 'Compare PING with the Odyssey Jailbird Mini T', affiliate: false };
  if (!sizing) return { id: 'confirm-build', title: 'Write down your required build', text: 'Confirm your playing hand, fitted length and grip before opening listings. PING’s standard length is a specification, not a recommendation for everyone. Ask the seller to confirm any detail missing from a listing.', href: standardSource, label: 'Check the standard PING specifications', affiliate: false };
  return { id: 'check-listing', title: 'Compare exact-model listings', text: 'You have identified the standard Onset build as your shopping target. Check the full model name, playing hand, length, grip, condition, seller, return terms and total price. Search results can include CB, H or other models; skip a listing if details do not match.', href: retailer, label: 'Search standard Ally Blue Onset options on Amazon', affiliate: true };
}
