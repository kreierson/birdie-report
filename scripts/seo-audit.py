#!/usr/bin/env python3
"""Local content/intent/link inventory plus optional read-only GSC URL inspections."""
import argparse, importlib.util, json, re
from collections import Counter
from pathlib import Path
from datetime import datetime, timezone
from urllib.parse import urlsplit
ROOT=Path(__file__).resolve().parents[1]

def inventory():
    rows=[]
    for p in sorted((ROOT/'src/content/blog').glob('*.md*')):
        text=p.read_text();front=text.split('---',2)[1]
        def field(key):
            m=re.search(r'^'+key+r':\s*["\']?([^\n"\']+)',front,re.M)
            return m[1].strip() if m else None
        rows.append({'slug':p.stem,'path':'/blog/'+p.stem+'/','title':field('title'),'category':field('category'),'date':field('date'),'updated':field('updated'),'review_basis':field('review_basis'),'internal_links':re.findall(r'\]\((/[^)\s]+)',text)})
    known={r['path'] for r in rows};incoming=Counter(link.rstrip('/')+'/' for r in rows for link in r['internal_links'])
    for r in rows:
        r['incoming_article_links']=incoming[r['path']]
        r['noncanonical_blog_links']=[x for x in r['internal_links'] if x.startswith('/blog/') and (not x.endswith('/') or x.rstrip('/')+'/' not in known)]
    return rows

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--query');p.add_argument('--inspect',action='store_true');args=p.parse_args()
    rows=inventory()
    if args.query:
        terms=args.query.lower().split()
        hits=[r for r in rows if all(t in (r['slug']+' '+r['title']).lower() for t in terms)]
        print(json.dumps(hits,indent=2));return
    output={'generated_at':datetime.now(timezone.utc).isoformat(),'articles':len(rows),'categories':dict(Counter(r['category'] for r in rows)),'inventory':rows}
    if args.inspect:
        spec=importlib.util.spec_from_file_location('analytics',ROOT/'scripts/analytics-report.py');a=importlib.util.module_from_spec(spec);spec.loader.exec_module(a)
        from googleapiclient.discovery import build
        service=build('searchconsole','v1',credentials=a.get_ga4_credentials(),cache_discovery=False)
        policy=json.loads((ROOT/'data/seo-policy.json').read_text());output['inspections']={};output['errors']={}
        for slug in dict.fromkeys(policy['monitor_pages']+policy['priority_pages'][:5]):
            try:output['inspections'][slug]=service.urlInspection().index().inspect(body={'inspectionUrl':'https://www.birdiereport.com/blog/'+slug+'/','siteUrl':a.SITE_URL}).execute()['inspectionResult']['indexStatusResult']
            except Exception as exc:output['errors'][slug]=str(exc)
    dest=ROOT/'reports/seo';dest.mkdir(parents=True,exist_ok=True);(dest/'inventory.json').write_text(json.dumps(output,indent=2))
    dated='inventory-'+output['generated_at'][:10]+('-inspections' if args.inspect else '')+'.json'
    (dest/dated).write_text(json.dumps(output,indent=2))
    if args.inspect:(dest/'latest-inspections.json').write_text(json.dumps(output,indent=2))
    print(json.dumps({k:v for k,v in output.items() if k not in ['inventory','inspections']},indent=2));print('Saved reports/seo/inventory.json')
if __name__=='__main__':main()
