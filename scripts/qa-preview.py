#!/usr/bin/env python3
"""Local-only built-site preview with visible analytics/overflow QA instrumentation."""
import argparse
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from functools import partial

ROOT=Path(__file__).resolve().parents[1]
PANEL='''<aside id="qa-panel" style="position:fixed;bottom:0;left:0;right:0;z-index:99999;background:#fff;color:#111;border:2px solid #333;padding:6px;font:12px/1.3 sans-serif;max-height:125px;overflow:auto">
<strong>LOCAL QA — external navigation suppressed, GA transport disabled</strong>
<button id="qa-text" style="border:1px solid;padding:3px">Toggle 200% text</button>
<button id="qa-clear" style="border:1px solid;padding:3px">Clear event log</button>
<span id="qa-size"></span><ol id="qa-events"></ol></aside>
<script>addEventListener('DOMContentLoaded',()=>{
 const original=window.gtag;window.gtag=function(...args){original?.(...args);if(args[0]==='event'){const li=document.createElement('li');li.textContent=args[1]+' | '+JSON.stringify(args[2]);document.querySelector('#qa-events').append(li)}};
 document.addEventListener('click',e=>{const a=e.target.closest('a');if(a&&new URL(a.href).origin!==location.origin)e.preventDefault()},true);
 document.querySelector('#qa-text').onclick=()=>{document.documentElement.style.fontSize=document.documentElement.style.fontSize?'':'200%'};
 document.querySelector('#qa-clear').onclick=()=>document.querySelector('#qa-events').replaceChildren();
 setInterval(()=>{document.querySelector('#qa-size').textContent='Viewport '+innerWidth+' × '+innerHeight+'; page width '+document.documentElement.scrollWidth+'; GA scripts '+document.querySelectorAll('script[src*="googletagmanager.com"]').length},300);
});</script>'''

class Preview(SimpleHTTPRequestHandler):
    def do_GET(self):
        path=Path(self.translate_path(self.path))
        if path.is_dir():path=path/'index.html'
        if path.is_file() and path.suffix=='.html':
            body=path.read_text().replace('</body>',PANEL+'</body>').encode()
            self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body)
        else:super().do_GET()

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--port',type=int,default=4321);args=p.parse_args()
    if not (ROOT/'dist/index.html').exists():p.error('Run npm run build first')
    print(f'QA preview: http://127.0.0.1:{args.port}',flush=True)
    ThreadingHTTPServer(('127.0.0.1',args.port),partial(Preview,directory=str(ROOT/'dist'))).serve_forever()
