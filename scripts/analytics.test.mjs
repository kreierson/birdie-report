import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const source=readFileSync(new URL('../public/scripts/analytics.js',import.meta.url),'utf8');
function setup(host='127.0.0.1') {
  const handlers={},scripts=[];
  class Element { constructor(link){this.link=link} closest(){return this.link} }
  const window={location:{hostname:host,href:`https://${host}/blog/test/`,pathname:'/blog/test/'}};
  const document={head:{appendChild:s=>scripts.push(s)},createElement:()=>({}),addEventListener:(name,fn)=>{(handlers[name]??=[]).push(fn)}};
  const context=vm.createContext({window,document,Element,URL});
  vm.runInContext(source,context);
  const click=(href,{type='click',button=0,data={}}={})=>{
    const link={href,dataset:data,textContent:'Test product'};
    for(const fn of handlers[type]??[])fn({type,button,target:new Element(link)});
  };
  return {window,scripts,click,context};
}
test('local preview is offline; repeated initialization and nested element click emit once',()=>{
 const s=setup();vm.runInContext(source,s.context);s.click('https://www.amazon.com/s?k=shaft&tag=birdiereport-20');
 assert.equal(s.scripts.length,0);assert.equal(s.window.dataLayer.length,1);
 assert.equal(s.window.dataLayer[0][1],'affiliate_click');assert.equal(s.window.dataLayer[0][2].page_path,'/blog/test/');
});
test('manufacturer, internal, untagged and lookalike domains are not affiliate events',()=>{
 const s=setup();for(const url of ['https://kbsgolfshafts.com/products/tour','https://127.0.0.1/blog/other/','https://amazon.com/s?k=shaft','https://notamazon.com/?tag=birdiereport-20'])s.click(url);
 assert.equal(s.window.dataLayer.length,0);
});
test('middle click and explicitly marked non-Amazon retailer work without right-click events',()=>{
 const s=setup();s.click('https://amazon.com/?tag=test-20',{type:'auxclick',button:2});
 s.click('https://amazon.com/?tag=test-20',{type:'auxclick',button:1});
 s.click('https://retailer.example/product',{data:{affiliateLink:'true',retailer:'Retailer',placement:'product-card'}});
 assert.equal(s.window.dataLayer.length,2);assert.equal(s.window.dataLayer[1][2].placement,'product-card');
});
test('only production domains load a single GA transport',()=>{
 for(const host of ['www.birdiereport.com','birdiereport.com']) {const s=setup(host);vm.runInContext(source,s.context);assert.equal(s.scripts.length,1);assert.equal(s.window.dataLayer.length,2)}
 assert.equal(setup('birdie-report-preview.vercel.app').scripts.length,0);
});
