#!/usr/bin/env python3
"""Public-only checks; no analytics, credentials, database or browser writes."""
from html.parser import HTMLParser
from urllib.request import Request, urlopen
from urllib.parse import urlsplit, parse_qs
import xml.etree.ElementTree as ET

ORIGIN='https://www.birdiereport.com'
PATHS=['/', '/best/', '/deals/', '/blog/ping-g440-vs-ping-g740-irons/', '/blog/best-golf-cart-bags-2026/']
class Page(HTMLParser):
    def __init__(self): super().__init__(); self.canonical=[]; self.robots=[]; self.links=[]; self.fake_form=False
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if tag=='link' and a.get('rel')=='canonical': self.canonical.append(a.get('href'))
        if tag=='meta' and a.get('name','').lower()=='robots': self.robots.append(a.get('content',''))
        if tag=='a': self.links.append(a)
        if tag=='form' and a.get('action')=='#': self.fake_form=True

def fetch(path):
    with urlopen(Request(ORIGIN+path,headers={'User-Agent':'BirdieReport-PublicHealth/1.0'}),timeout=30) as response:
        if response.status != 200: raise RuntimeError(f'{path}: status {response.status}')
        if response.geturl() != ORIGIN+path: raise RuntimeError(f'{path}: unexpected redirect')
        if 'noindex' in response.headers.get('X-Robots-Tag','').lower(): raise RuntimeError(f'{path}: noindex header')
        return response.read().decode()

def main():
    errors=[]
    for path in PATHS:
        try:
            page=Page();page.feed(fetch(path))
            if page.canonical != [ORIGIN+path]: errors.append(f'{path}: incorrect canonical {page.canonical}')
            if any('noindex' in value.lower() for value in page.robots): errors.append(f'{path}: noindex')
            if page.fake_form: errors.append(f'{path}: placeholder form returned')
            if path.startswith('/blog/'):
                amazon=[a for a in page.links if urlsplit(a.get('href','')).hostname in ['amazon.com','www.amazon.com']]
                if not amazon: errors.append(f'{path}: no Amazon shopping links')
                for a in amazon:
                    if parse_qs(urlsplit(a['href']).query).get('tag') != ['birdiereport-20']: errors.append(f'{path}: missing or unapproved Amazon tracking ID')
                    if a.get('data-affiliate-link') == 'true' and 'sponsored' not in a.get('rel',''): errors.append(f'{path}: missing affiliate relationship')
            print(f'Checked {path}')
        except Exception as exc: errors.append(f'{path}: {exc}')
    try:
        robots=fetch('/robots.txt')
        if 'Sitemap: '+ORIGIN+'/sitemap-index.xml' not in robots: errors.append('robots.txt: missing sitemap')
        sitemap=ET.fromstring(fetch('/sitemap-index.xml'))
        locations=[node.text for node in sitemap.iter() if node.tag.endswith('}loc')]
        if not locations or any(not loc.startswith(ORIGIN+'/') for loc in locations): errors.append('Invalid sitemap index')
    except Exception as exc: errors.append(f'Indexing files: {exc}')
    if errors:
        raise SystemExit('Public health check failed:\n'+'\n'.join(dict.fromkeys(errors)))
    print('Public health passed. This does not establish indexing, rankings, browser QA, or revenue.')
if __name__=='__main__': main()
