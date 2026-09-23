#!/usr/bin/env python3
"""Complete-period GA4/GSC reporting; read-only APIs, local evidence artifacts."""
import argparse
import json
import sys
from datetime import date, datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
SERVICE_ACCOUNT_FILE = ROOT / '.google-service-account.json'
SITE_URL = 'sc-domain:birdiereport.com'

def get_ga4_credentials():
    from google.oauth2 import service_account
    return service_account.Credentials.from_service_account_file(str(SERVICE_ACCOUNT_FILE), scopes=[
        'https://www.googleapis.com/auth/analytics.readonly',
        'https://www.googleapis.com/auth/webmasters.readonly'])

def periods(end, days=28):
    def window(n, offset=0):
        last = end - timedelta(days=offset)
        return [(last - timedelta(days=n-1)).isoformat(), last.isoformat()]
    return {'current': window(days), 'previous': window(days, days),
            'current7': window(7), 'previous7': window(7, 7)}

def normalize_path(url):
    from urllib.parse import urlsplit
    path = urlsplit(url).path if '://' in url else url
    return path.rstrip('/')+'/' if path and path != '(not set)' else path

def collect(days=28, end=None):
    from google.analytics.data_v1beta import BetaAnalyticsDataClient
    from google.analytics.data_v1beta.types import RunReportRequest, DateRange, Dimension, Metric, FilterExpression, Filter, FilterExpressionList
    from googleapiclient.discovery import build
    from google.protobuf.json_format import MessageToDict
    credentials = get_ga4_credentials()
    property_file = ROOT / '.ga4-property-id'
    if not property_file.exists():
        raise RuntimeError('Missing .ga4-property-id; refusing to guess a GA property')
    ga = BetaAnalyticsDataClient(credentials=credentials)
    gsc = build('searchconsole', 'v1', credentials=credentials, cache_discovery=False)
    property_id = property_file.read_text().strip()
    today = datetime.now(ZoneInfo('America/Chicago')).date()
    errors = {}
    if end is None:
        try:
            probe = gsc.searchanalytics().query(siteUrl=SITE_URL, body={
                'startDate': (today-timedelta(days=10)).isoformat(),
                'endDate': (today-timedelta(days=2)).isoformat(),
                'dimensions': ['date'], 'type': 'web', 'dataState': 'final', 'rowLimit': 25000}).execute()
            end = max(date.fromisoformat(r['keys'][0]) for r in probe.get('rows', []))
        except Exception as exc:
            errors['final_date_probe'] = str(exc)
            end = today-timedelta(days=3)
    if end >= today:
        raise ValueError('End date must exclude today and future days')
    def exact(field, value):
        return FilterExpression(filter=Filter(field_name=field, string_filter=Filter.StringFilter(value=value, match_type=Filter.StringFilter.MatchType.EXACT)))
    amazon = FilterExpression(and_group=FilterExpressionList(expressions=[exact('eventName','click'), exact('linkDomain','amazon.com')]))
    custom = exact('eventName', 'affiliate_click')
    result = {'generated_at':datetime.now(ZoneInfo('America/Chicago')).isoformat(), 'property_id':property_id,
              'site': SITE_URL, 'end':end.isoformat(), 'periods':{}, 'errors':errors,
              'notes':['GA4 and Amazon counts use different measurement systems.', 'Custom affiliate events and enhanced-measurement Amazon outbound clicks are separate, never added together.', 'GA4 uses property timezone; Search Console uses Pacific time.', 'Missing query rows are not evidence of zero searches; site totals are queried directly.']}
    def report(name, start, finish, dimensions, metrics, filt=None):
        try:
            kw=dict(property='properties/'+property_id,date_ranges=[DateRange(start_date=start,end_date=finish)],
                    dimensions=[Dimension(name=x) for x in dimensions],metrics=[Metric(name=x) for x in metrics],limit=100000)
            if filt:kw['dimension_filter']=filt
            response=ga.run_report(RunReportRequest(**kw))
            rows=[dict(zip(dimensions+metrics,[v.value for v in r.dimension_values]+[float(v.value) for v in r.metric_values])) for r in response.rows]
            if response.row_count>len(rows):errors[name]='Report truncated; do not treat row sums as totals'
            return {'rows':rows,'metadata':MessageToDict(response.metadata._pb),'row_count':response.row_count}
        except Exception as exc:
            errors[name]=str(exc);return {'rows':[], 'unavailable':True}
    def search(name,start,finish,dimensions):
        try:
            response=gsc.searchanalytics().query(siteUrl=SITE_URL,body={'startDate':start,'endDate':finish,'dimensions':dimensions,'type':'web','dataState':'final','rowLimit':25000}).execute()
            if len(response.get('rows',[]))==25000:errors[name]='GSC row limit reached; totals remain authoritative'
            return response
        except Exception as exc:
            errors[name]=str(exc);return {'rows':[], 'unavailable':True}
    for label,(start,finish) in periods(end,days).items():
        prefix=label+'/'
        metrics=['sessions','totalUsers','screenPageViews','engagedSessions','engagementRate']
        p={'start':start,'end':finish}
        p['overview']=report(prefix+'overview',start,finish,[],metrics)
        p['sources']=report(prefix+'sources',start,finish,['sessionSourceMedium'],metrics)
        p['organic']=report(prefix+'organic',start,finish,[],metrics,exact('sessionMedium','organic'))
        p['amazon']=report(prefix+'amazon',start,finish,[],['eventCount','totalUsers','sessions'],amazon)
        p['amazon_sources']=report(prefix+'amazon_sources',start,finish,['sessionSourceMedium'],['eventCount','sessions'],amazon)
        p['custom_affiliate']=report(prefix+'custom',start,finish,[],['eventCount','totalUsers','sessions'],custom)
        p['gsc']=search(prefix+'gsc',start,finish,[])
        p['pages']=search(prefix+'pages',start,finish,['page'])
        if label in ['current','previous']:
            p['landing']=report(prefix+'landing',start,finish,['landingPage','sessionSourceMedium'],['sessions','engagedSessions'])
            p['amazon_pages']=report(prefix+'amazon_pages',start,finish,['pagePath'],['eventCount','sessions'],amazon)
            p['direct_countries']=report(prefix+'direct',start,finish,['country'],['sessions','engagedSessions'],exact('sessionSourceMedium','(direct) / (none)'))
            p['queries']=search(prefix+'queries',start,finish,['query'])
        result['periods'][label]=p
        print(f'Collected {label}: {start}–{finish}',file=sys.stderr)
    amazon_file=ROOT/'data/amazon-metrics.local.json'
    if amazon_file.exists():result['amazon_portal']=json.loads(amazon_file.read_text())
    return result

def first(report):
    return report.get('rows',[{}])[0] if report.get('rows') else {}

def format_report(data):
    cur=data['periods']['current'];prev=data['periods']['previous']
    lines=['# Birdie Report — search and affiliate performance','',f"Complete days: **{cur['start']}–{cur['end']}** versus **{prev['start']}–{prev['end']}**.",'', '| Metric | Previous | Current | Change |','|---|---:|---:|---:|']
    for label,key,metric in [('Sessions','overview','sessions'),('Organic sessions','organic','sessions'),('Engaged sessions','overview','engagedSessions'),('Google Search clicks','gsc','clicks'),('Google Search impressions','gsc','impressions'),('Google Search CTR (ratio)','gsc','ctr'),('Google average position (lower is better)','gsc','position'),('Amazon outbound clicks (GA)','amazon','eventCount'),('Sessions clicking Amazon','amazon','sessions'),('Custom affiliate events (separate)','custom_affiliate','eventCount')]:
        a=first(prev[key]).get(metric);b=first(cur[key]).get(metric)
        # An available event report with zero rows represents no recorded events.
        if key in ['amazon','custom_affiliate']:
            if not prev[key].get('unavailable'):a=0 if a is None else a
            if not cur[key].get('unavailable'):b=0 if b is None else b
        change=f'{(b/a-1)*100:+.1f}%' if a and b is not None else '—'
        lines.append(f"| {label} | {a if a is not None else 'unavailable'} | {b if b is not None else 'unavailable'} | {change} |")
    lines+=['','## Acquisition','', '| Source | Previous sessions | Current sessions | Current engagement | Amazon clicks (GA) |','|---|---:|---:|---:|---:|']
    previous={r['sessionSourceMedium']:r for r in prev['sources']['rows']}
    affiliate={r['sessionSourceMedium']:r['eventCount'] for r in cur['amazon_sources']['rows']}
    for r in sorted(cur['sources']['rows'],key=lambda x:-x['sessions'])[:15]:
        source=r['sessionSourceMedium']
        before='unavailable' if prev['sources'].get('unavailable') else f"{previous.get(source,{}).get('sessions',0):.0f}"
        clicks='unavailable' if cur['amazon_sources'].get('unavailable') else f"{affiliate.get(source,0):.0f}"
        lines.append(f"| {source} | {before} | {r['sessions']:.0f} | {r['engagementRate']:.1%} | {clicks} |")
    lines+=['','## Existing commercial opportunities','']
    for r in sorted(cur.get('amazon_pages',{}).get('rows',[]),key=lambda x:-x['eventCount'])[:15]:lines.append(f"- {normalize_path(r['pagePath'])}: {r['eventCount']:.0f} Amazon outbound clicks; {r['sessions']:.0f} click-bearing sessions.")
    lines+=['','## Fixed Google recovery cohort','', 'Cells show clicks / impressions / CTR / average position. A missing row is not proof of zero activity.', '', f"| Page | Previous {(date.fromisoformat(cur['end'])-date.fromisoformat(cur['start'])).days+1}d | Current {(date.fromisoformat(cur['end'])-date.fromisoformat(cur['start'])).days+1}d | Previous 7d | Current 7d |",'|---|---|---|---|---|']
    policy=json.loads((ROOT/'data/seo-policy.json').read_text())
    for slug in policy['monitor_pages']:
        cells=[]
        for label in ['previous','current','previous7','current7']:
            report=data['periods'][label].get('pages',{})
            row=next((r for r in report.get('rows',[]) if r['keys'][0]=='https://www.birdiereport.com/blog/'+slug+'/'),None)
            cells.append('unavailable' if report.get('unavailable') else (f"{row['clicks']:.0f} / {row['impressions']:.0f} / {row['ctr']:.1%} / {row['position']:.1f}" if row else 'no returned row'))
        lines.append('| '+slug+' | '+' | '.join(cells)+' |')
    lines+=['','## Measurement checks','']
    amazon=first(cur['amazon']).get('eventCount',0);custom=first(cur['custom_affiliate']).get('eventCount',0)
    if not cur['custom_affiliate'].get('unavailable') and amazon and not custom:lines.append('- Amazon outbound events exist but no custom affiliate events were recorded. Investigate tracking; this is not zero affiliate activity.')
    for r in cur.get('direct_countries',{}).get('rows',[]):
        if r['sessions']>=100 and r['engagedSessions']/r['sessions']<0.02:lines.append(f"- Low-engagement direct segment: {r['country']}, {r['sessions']:.0f} sessions, {r['engagedSessions']:.0f} engaged. Investigate before calling this growth or bots.")
    if 'amazon_portal' in data:
        a=data['amazon_portal'];lines+=['',f"Amazon portal snapshot: retrieved {a.get('retrieved','unknown')}. Report these earnings only with their own date windows; never substitute GA revenue."]
        for name,p in a.get('periods',{}).items():lines.append(f"- {name}: {p['start']}–{p['end']}; {p['clicks']} Amazon clicks; ${p['commissions_usd']:.2f} commissions.")
        age=(date.fromisoformat(data['generated_at'][:10])-date.fromisoformat(a['retrieved'][:10])).days
        if age>7:lines.append(f'- Amazon snapshot is stale ({age} days). Refresh through the authenticated browser; continue SEO work if login is unavailable.')
    else:lines.append('- Amazon earnings unavailable. Do not interpret GA revenue as affiliate commissions.')
    lines+=['','Errors: '+json.dumps(data['errors']), '', *('- '+n for n in data['notes'])]
    return '\n'.join(lines)+'\n'

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('days',nargs='?',default=28,type=int)
    parser.add_argument('--end',type=date.fromisoformat)
    parser.add_argument('--output',type=Path,default=ROOT/'reports/seo')
    args=parser.parse_args()
    if args.days<1 or args.days>90:parser.error('days must be 1–90')
    data=collect(args.days,args.end);args.output.mkdir(parents=True,exist_ok=True)
    stem=f"{data['end']}-{args.days}d"
    (args.output/(stem+'.json')).write_text(json.dumps(data,indent=2))
    report=format_report(data);(args.output/(stem+'.md')).write_text(report)
    (args.output/'latest.json').write_text(json.dumps(data,indent=2));(args.output/'latest.md').write_text(report)
    print(report)
    return 1 if data['errors'] else 0
if __name__=='__main__':sys.exit(main())
