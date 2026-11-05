import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, copyFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

function validate(basis, id) {
  const root=mkdtempSync(join(tmpdir(),'birdie-evidence-test-'));
  try {
    for(const dir of ['scripts','data','src/content/blog'])mkdirSync(join(root,dir),{recursive:true});
    copyFileSync(new URL('./validate-editorial-trust.mjs',import.meta.url),join(root,'scripts/validate-editorial-trust.mjs'));
    writeFileSync(join(root,'data/seo-policy.json'),JSON.stringify({authorized_on:'2026-09-23',paused_categories_for_new_content:['news','deals','opinion']}));
    writeFileSync(join(root,'confirmation.md'),'Fixture confirmation, not a real product test.');
    writeFileSync(join(root,'data/hands-on-evidence.json'),JSON.stringify({records:{confirmed:{confirmed_by:'Fixture',confirmation_record:'confirmation.md',scope:'Fixture only',allowed_articles:['sample']}}}));
    writeFileSync(join(root,'src/content/blog/sample.mdx'),`---\ndate: 2026-09-23\ncategory: reviews\nreview_basis: ${basis}\nevidence_ids: ["${id}"]\n---\nFixture article.\n`);
    return spawnSync(process.execPath,[join(root,'scripts/validate-editorial-trust.mjs')],{encoding:'utf8'});
  } finally {rmSync(root,{recursive:true,force:true})}
}

test('new research-only commercial articles cannot bypass hands-on publishing policy',()=>{
 const result=validate('research-based','confirmed');assert.equal(result.status,1);assert.match(result.stderr,/supported hands-on evidence/);
});
test('hands-on publication needs a recognized evidence record scoped to the article',()=>{
 const missing=validate('hands-on','invented');assert.equal(missing.status,1);assert.match(missing.stderr,/missing or does not support/);
 assert.equal(validate('hands-on','confirmed').status,0);
});
test('the scheduled Quantum Max review is the only named research-review exception',()=>{
 const policy=JSON.parse(readFileSync(new URL('../data/seo-policy.json',import.meta.url),'utf8'));
 assert.deepEqual(policy.scheduled_research_reviews,['callaway-quantum-max-driver-review.mdx']);
 const article=readFileSync(new URL('../src/content/blog/callaway-quantum-max-driver-review.mdx',import.meta.url),'utf8');
 assert.match(article,/^date:\s*2026-11-05$/m);
 assert.match(article,/^category:\s*"reviews"$/m);
 assert.match(article,/^review_basis:\s*"research-based"$/m);
 const validator=readFileSync(new URL('./validate-editorial-trust.mjs',import.meta.url),'utf8');
 assert.match(validator,/scheduled_research_reviews/);
});
test('the gift guide is the only named research compilation',()=>{
 const validator=readFileSync(new URL('./validate-editorial-trust.mjs',import.meta.url),'utf8');
 assert.match(validator,/best-golf-gifts\.mdx/);
 assert.equal((validator.match(/best-golf-gifts\.mdx/g)||[]).length,1);
 const article=readFileSync(new URL('../src/content/blog/best-golf-gifts.mdx',import.meta.url),'utf8');
 assert.match(article,/^category:\s*best$/m);
 assert.match(article,/^review_basis:\s*"research-based"$/m);
});
