#!/usr/bin/env python3
"""Private revenue planning from existing observations; never infer page earnings."""
import argparse
from datetime import date
import json
from math import ceil, isfinite
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def scorecard(data, target=3000, today=None):
    today = today or date.today()
    if not isinstance(target, (int, float)) or not isfinite(target) or target <= 0: raise ValueError('Target must be finite and positive')
    current = data['periods']['current']
    portal = data.get('amazon_portal', {})
    observed = portal.get('periods', {}).get('current')
    warnings = []
    retrieved = portal.get('retrieved')
    try:
        age = (today - date.fromisoformat(retrieved[:10])).days
        stale = age < 0 or age > 7
    except (TypeError, ValueError): stale = True
    def complete(key):
        report = current.get(key)
        return (isinstance(report, dict) and 'rows' in report and not report.get('unavailable')
                and report.get('row_count', len(report['rows'])) <= len(report['rows'])
                and not data.get('errors', {}).get('current/'+key))
    completeness = {key: complete(key) for key in ['amazon_pages', 'landing', 'sources']}
    for key, available in completeness.items():
        if not available: warnings.append(key + ': unavailable or partial; no absence-based conclusions.')
    matching = bool(observed and observed.get('start') == current['start'] and observed.get('end') == current['end'])
    if stale: warnings.append('Amazon snapshot is unavailable or older than seven days. Refresh when authenticated; continue useful maintenance.')
    if observed and not matching: warnings.append('Amazon and analytics windows differ. Do not combine their measurements.')
    if data.get('errors'): warnings.append('One or more analytics reports are incomplete or unavailable; inspect latest.md.')
    result = {'target_monthly_usd': target, 'analytics_period': [current['start'], current['end']],
              'amazon_observation': observed, 'amazon_retrieved': retrieved, 'amazon_stale': stale,
              'matched_periods': matching, 'warnings': warnings, 'report_complete': completeness, 'planning': None}
    if observed and not stale and matching:
        try:
            start, end = date.fromisoformat(observed['start']), date.fromisoformat(observed['end'])
            days = (end - start).days + 1 if start <= end < today else 0
        except (TypeError, ValueError): days = 0
        earnings, clicks = observed.get('commissions_usd'), observed.get('clicks')
        # A 30-day equivalent is planning arithmetic, not actual calendar-month earnings.
        if days and all(isinstance(value, (int, float)) and isfinite(value) and value > 0 for value in [earnings, clicks]):
            epc = earnings / clicks
            equivalent = earnings / days * 30
            result['planning'] = {'observed_days': days, 'epc_usd': epc, 'revenue_30d_equivalent_usd': equivalent,
                                  'target_multiple': target / equivalent, 'required_portal_clicks_at_observed_epc': ceil(target / epc)}
    candidates = []
    for row in (current.get('amazon_pages', {}).get('rows', []) if completeness['amazon_pages'] else []):
        if not row['pagePath'].startswith('/blog/'): continue
        candidates.append({'path': row['pagePath'].rstrip('/')+'/', 'amazon_clicks_ga': row['eventCount'],
                           'click_bearing_sessions_all_sources': row['sessions'], 'reason': 'Recorded product-shopping activity; inspect fit and purchase journey.'})
    # Keep rows separate: summed GA sessions would not be deduplicated across path variants.
    seen = set()
    candidates = [row for row in sorted(candidates, key=lambda row: -row['click_bearing_sessions_all_sources']) if not (row['path'] in seen or seen.add(row['path']))]
    result['click_opportunities'] = sorted(candidates, key=lambda row: -row['click_bearing_sessions_all_sources'])[:10]
    landing = {}
    for row in current.get('landing', {}).get('rows', []):
        path = row['landingPage'].split('?')[0].rstrip('/')+'/'
        if row['sessionSourceMedium'].endswith(' / organic') and path.startswith('/blog/'):
            page = landing.setdefault(path, {'path': path, 'organic_sessions': 0, 'organic_engaged_sessions': 0})
            page['organic_sessions'] += row['sessions']; page['organic_engaged_sessions'] += row['engagedSessions']
    clicked = {row['path'] for row in candidates}
    # Absence from the event report is no recorded row, never proof of no shopping or lost commission.
    result['organic_journey_reviews'] = [] if not completeness['amazon_pages'] or not completeness['landing'] else sorted(
        [page for path, page in landing.items() if path not in clicked and page['organic_engaged_sessions'] >= 5],
        key=lambda page: -page['organic_engaged_sessions'])[:10]
    ai = []
    for row in (current.get('sources', {}).get('rows', []) if completeness['sources'] else []):
        source = row['sessionSourceMedium'].lower()
        if any(provider in source for provider in ['chatgpt', 'perplexity', 'copilot', 'gemini', 'claude']):
            ai.append({key: row[key] for key in ['sessionSourceMedium', 'sessions', 'engagedSessions']})
    result['observed_ai_referrals'] = ai
    return result

def render(result):
    lines = ['# Affiliate revenue scorecard', '', f"Working target: ${result['target_monthly_usd']:,.0f} per calendar month; this is a goal, not a forecast.", '',
             'Analytics window: ' + ' to '.join(result['analytics_period']), '', '## Actual Amazon observation', '']
    observed = result['amazon_observation']
    if observed:
        earnings=observed.get('commissions_usd')
        amount=f'${earnings:.2f}' if isinstance(earnings,(int,float)) and isfinite(earnings) else 'unavailable'
        lines.append(f"{observed.get('start', 'unknown')}–{observed.get('end', 'unknown')}: commissions {amount}; portal clicks {observed.get('clicks', 'unavailable')}. Retrieved {result['amazon_retrieved']}.")
    else: lines.append('Unavailable. Do not substitute GA revenue or infer zero commissions.')
    if result['planning']:
        p=result['planning']
        lines += ['', '## Scale required (illustrative only)', '',
                  f"Observed earnings per Amazon portal click: ${p['epc_usd']:.3f}.",
                  f"30-day equivalent: ${p['revenue_30d_equivalent_usd']:.2f}; target is {p['target_multiple']:.1f}× that pace.",
                  f"At unchanged earnings per click, ${result['target_monthly_usd']:,.0f} would require about {p['required_portal_clicks_at_observed_epc']:,} Amazon portal clicks in a month.",
                  'Shipping timing, returns, seasonality, and a small sample make that ratio unstable. No guaranteed timeline.']
    lines += ['', *('- '+warning for warning in result['warnings']), '', '## Existing pages with shopping activity', '']
    for row in result['click_opportunities']: lines.append(f"- {row['path']}: {row['amazon_clicks_ga']:.0f} GA Amazon clicks; {row['click_bearing_sessions_all_sources']:.0f} all-source click-bearing sessions.")
    lines += ['', '## Engaged organic landing pages with no returned Amazon event row', '', 'Inspect the journey and measurement before changing it; these are not proven lost sales.']
    for row in result['organic_journey_reviews']: lines.append(f"- {row['path']}: {row['organic_sessions']:.0f} organic sessions; {row['organic_engaged_sessions']:.0f} engaged.")
    lines += ['', '## Observed AI referrals', '']
    for row in result['observed_ai_referrals']: lines.append(f"- {row['sessionSourceMedium']}: {row['sessions']:.0f} sessions; {row['engagedSessions']:.0f} engaged.")
    lines += ['', 'Referrals do not measure all AI visibility. Google generative-AI reporting requires its own Search Console report. Absence of referrals is not absence of citations.',
              '', '## Operating decision', '', 'Fix inaccurate product claims and broken journeys first. Prioritize existing, relevant pages with measured demand; verify primary sources and existing intent. Respect the shared weekly budget and release gates. Evaluate each material refresh after 28 complete days. Do not fabricate experience to fill the publishing quota.',
              '', 'Path variants use the largest returned session row, not a deduplicated total. Page-level commissions are unavailable with the current aggregate Amazon snapshot. Never add GA custom events to enhanced outbound events or divide all-source click sessions by organic landing sessions to claim conversion.']
    return '\n'.join(lines)+'\n'

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input',type=Path,default=ROOT/'reports/seo/latest.json')
    parser.add_argument('--output',type=Path,default=ROOT/'reports/seo')
    parser.add_argument('--target',type=float,default=3000)
    args=parser.parse_args()
    if args.target <= 0: parser.error('Target must be positive')
    result=scorecard(json.loads(args.input.read_text()),args.target)
    args.output.mkdir(parents=True,exist_ok=True)
    (args.output/'revenue-latest.json').write_text(json.dumps(result,indent=2))
    (args.output/'revenue-latest.md').write_text(render(result))
    print(render(result))
if __name__ == '__main__': main()
