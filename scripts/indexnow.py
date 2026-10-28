#!/usr/bin/env python3
"""Notify IndexNow of changed, deployed canonical URLs; dry-run by default."""
import argparse, json, sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
HOST = 'www.birdiereport.com'
KEY_CHARS = set('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-')

def indexnow_key():
    """The public key hosted at /<key>.txt. Batch submission lives in scripts/indexnow.mjs."""
    public = ROOT/'public'
    spec = []
    for path in sorted(public.glob('*.txt')):
        body = path.read_text().strip()
        if path.stem == body and 8 <= len(body) <= 128 and set(body) <= KEY_CHARS:
            spec.append(body)
    if len(spec) == 1:
        return spec[0]
    if len(spec) > 1:
        raise RuntimeError('Multiple IndexNow key files found')
    fallback = public/'indexnow-key.txt'
    if fallback.is_file():
        return fallback.read_text().strip()
    raise RuntimeError('IndexNow key file not found')

def payload(urls):
    key = indexnow_key()
    clean = list(dict.fromkeys(urls))
    if not clean or len(clean)>10000: raise ValueError('Supply 1–10000 changed URLs')
    for url in clean:
        p = urlsplit(url)
        if p.scheme!='https' or p.netloc!=HOST or p.query or p.fragment or not p.path.endswith('/'):
            raise ValueError('Only canonical HTTPS URLs on our host are allowed: '+url)
    return {'host':HOST,'key':key,'keyLocation':f'https://{HOST}/{key}.txt','urlList':clean}

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('urls',nargs='+');p.add_argument('--submit',action='store_true');args=p.parse_args()
    body=payload(args.urls)
    if not args.submit:
        print(json.dumps(body,indent=2));return
    with urlopen(body['keyLocation'],timeout=30) as r:
        if r.read().decode().strip()!=body['key']:raise RuntimeError('Live verification key does not match; deploy first')
    for url in body['urlList']:
        with urlopen(url,timeout=30) as r:
            if r.status!=200 or r.url!=url:raise RuntimeError('Changed page is not live at its canonical URL: '+url)
    request=Request('https://api.indexnow.org/indexnow',data=json.dumps(body).encode(),headers={'Content-Type':'application/json; charset=utf-8'},method='POST')
    with urlopen(request,timeout=30) as r:
        status=r.status
    if status not in [200,202]:raise RuntimeError(f'Unexpected IndexNow response: {status}')
    record={'submitted_at':datetime.now(timezone.utc).isoformat(),'status':status,'urls':body['urlList'],'meaning':'Received, not a guarantee of crawling or indexing'}
    folder=ROOT/'reports/seo';folder.mkdir(parents=True,exist_ok=True)
    with (folder/'indexnow.jsonl').open('a') as f:f.write(json.dumps(record)+'\n')
    print(json.dumps(record,indent=2))
if __name__=='__main__':
    try:main()
    except Exception as exc:print(str(exc),file=sys.stderr);sys.exit(1)
