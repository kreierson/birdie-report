#!/usr/bin/env python3
"""Guardrails and work queue for the scheduled SEO agent. No LLM/API writes here."""
import argparse
from datetime import datetime, timedelta, date
from pathlib import Path
from zoneinfo import ZoneInfo
import json, os, re, secrets, subprocess, sys
ROOT=Path(__file__).resolve().parents[1]
STATE=ROOT/'.seo-workflow'
POLICY=json.loads((ROOT/'data/seo-policy.json').read_text())

def now():return datetime.now(ZoneInfo(POLICY['timezone']))
def week_start(day):return day-timedelta(days=day.weekday())
def records():
    f=STATE/'runs.jsonl'
    return [json.loads(x) for x in f.read_text().splitlines() if x] if f.exists() else []
def plan(day, content_root=ROOT):
    start=week_start(day)
    done=[r for r in records() if start.isoformat()<=r['date']<=(start+timedelta(days=6)).isoformat() and r['outcome']=='published']
    used={kind:sum(len(r.get('pages',[])) for r in done if r['kind']==kind) for kind in ['new','refresh']}
    # Cross-check actual publication dates, including manual/other-job publishes.
    new_slugs=[]
    for p in (content_root/'src/content/blog').glob('*.md*'):
        m=re.search(r'^date:\s*["\']?(\d{4}-\d{2}-\d{2})',p.read_text(),re.M)
        if m and start.isoformat()<=m[1]<=(start+timedelta(days=6)).isoformat():new_slugs.append(p.stem)
    used['new']=max(used['new'],len(new_slugs))
    kind=POLICY['days'][day.strftime('%A')]
    limit={'new':POLICY['max_new_articles_per_week'],'refresh':POLICY['max_substantial_refreshes_per_week']}
    if kind in limit and used[kind]>=limit[kind]:kind='monitor'
    touched={s for r in done for s in r.get('pages',[])}
    return {'date':str(day),'week_start':str(start),'kind':kind,'used':used,'limits':limit,
            'priority_pages':[s for s in POLICY['priority_pages'] if s not in touched],
            'published_this_week':new_slugs,'evidence_registry':'data/hands-on-evidence.json',
            'instruction':'One page per editorial run. New hands-on coverage must use supported evidence and distinct intent; skip if evidence or demand is insufficient.'}

def main():
    p=argparse.ArgumentParser(description=__doc__);sub=p.add_subparsers(dest='command',required=True)
    q=sub.add_parser('plan');q.add_argument('--date',type=date.fromisoformat,default=now().date())
    q=sub.add_parser('check');q.add_argument('--kind',choices=['new','refresh'],required=True);q.add_argument('--pages',nargs='+',required=True);q.add_argument('--content-root',type=Path,default=ROOT)
    sub.add_parser('begin')
    q=sub.add_parser('finish');q.add_argument('--token',required=True);q.add_argument('--outcome',choices=['published','monitored','skipped','blocked'],required=True);q.add_argument('--kind',choices=['new','refresh','monitor','maintenance'],required=True);q.add_argument('--pages',nargs='*',default=[]);q.add_argument('--commit');q.add_argument('--note',default='')
    args=p.parse_args();STATE.mkdir(exist_ok=True)
    if args.command=='plan':print(json.dumps(plan(args.date),indent=2));return
    if args.command=='check':
        current=plan(now().date(),args.content_root)
        if len(set(args.pages))!=1:raise RuntimeError('Only one editorial page per run')
        if not (args.content_root/'src/content/blog'/f'{args.pages[0]}.mdx').exists():raise RuntimeError('Candidate article missing')
        projected=current['used'][args.kind]+(len(args.pages) if args.kind=='refresh' else 0)
        if projected>current['limits'][args.kind]:raise RuntimeError('Weekly editorial budget exceeded')
        if args.kind=='new' and args.pages[0] not in current['published_this_week']:raise RuntimeError('New article must have its real current-week publication date')
        print(json.dumps({'gate':'passed','kind':args.kind,'projected_weekly_count':projected}));return
    lock=STATE/'active.json'
    if args.command=='begin':
        if lock.exists():
            previous=json.loads(lock.read_text())
            if datetime.fromisoformat(previous['expires'])>now():raise RuntimeError('Another SEO run holds the lease; skip this run')
            lock.unlink()
        token=secrets.token_hex(16)
        with lock.open('x') as f:json.dump({'token':token,'started':now().isoformat(),'expires':(now()+timedelta(hours=12)).isoformat()},f)
        print(json.dumps({'token':token,**plan(now().date())},indent=2));return
    held=json.loads(lock.read_text())
    if held['token']!=args.token:raise RuntimeError('Lease token mismatch; refusing to close another run')
    if args.outcome=='published':
        if not args.commit or not args.pages:raise RuntimeError('Published work requires its verified commit and pages')
        subprocess.run(['git','cat-file','-e',args.commit+'^{commit}'],cwd=ROOT,check=True)
        current=plan(now().date())
        if args.kind in current['limits']:
            # Newly created files are already counted by date: only enforce the resulting total.
            projected=current['used'][args.kind]+(len(args.pages) if args.kind=='refresh' else 0)
            if projected>current['limits'][args.kind]:raise RuntimeError('Weekly editorial budget exceeded')
    record={'date':now().date().isoformat(),'finished':now().isoformat(),'kind':args.kind,'outcome':args.outcome,'pages':args.pages,'commit':args.commit,'note':args.note}
    with (STATE/'runs.jsonl').open('a') as f:f.write(json.dumps(record)+'\n')
    lock.unlink();print(json.dumps(record,indent=2))
if __name__=='__main__':
    try:main()
    except Exception as exc:print(str(exc),file=sys.stderr);sys.exit(1)
