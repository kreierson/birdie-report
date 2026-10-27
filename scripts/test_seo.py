import importlib.util
import json
import tempfile
import unittest
from datetime import date
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
def module(name):
    spec=importlib.util.spec_from_file_location(name,ROOT/'scripts'/f'{name}.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m

class SEOGuards(unittest.TestCase):
    def test_static_redirects_match_both_trailing_slash_forms(self):
        config=json.loads((ROOT/'vercel.json').read_text())
        self.assertTrue(config['trailingSlash'])
        redirects={r['source']:r for r in config['redirects']}
        self.assertEqual(len(redirects),len(config['redirects']))
        for source,rule in redirects.items():
            if any(c in source for c in ':*('):continue
            # Slash-only rules already work after Vercel's normalization.
            if not source.endswith('/'):
                counterpart=source+'/'
                self.assertIn(counterpart,redirects,source)
                self.assertEqual(redirects[counterpart]['destination'],rule['destination'])
            self.assertTrue(rule['permanent'])
            target=rule['destination']
            self.assertTrue(target.startswith('/blog/') and target.endswith('/'),target)
            slug=target.removeprefix('/blog/').rstrip('/')
            self.assertTrue(any((ROOT/'src/content/blog'/f'{slug}{ext}').is_file() for ext in ['.md','.mdx']),target)

    def test_complete_periods_do_not_overlap(self):
        p=module('analytics-report').periods(date(2026,9,21))
        self.assertEqual(p['current'],['2026-08-25','2026-09-21'])
        self.assertEqual(p['previous'],['2026-07-28','2026-08-24'])
        self.assertEqual(p['previous7'],['2026-09-08','2026-09-14'])

    def test_weekly_budget_counts_manual_publications_and_refreshes(self):
        m=module('seo-workflow')
        with tempfile.TemporaryDirectory() as d:
            m.ROOT=Path(d);m.STATE=m.ROOT/'state';m.STATE.mkdir()
            blog=m.ROOT/'src/content/blog';blog.mkdir(parents=True)
            (blog/'new.mdx').write_text('---\ndate: "2026-09-23"\n---')
            self.assertEqual(m.plan(date(2026,9,25),m.ROOT)['kind'],'monitor')
            (m.STATE/'runs.jsonl').write_text('{"date":"2026-09-21","outcome":"published","kind":"refresh","pages":["one","two"]}\n')
            self.assertEqual(m.plan(date(2026,9,23),m.ROOT)['kind'],'monitor')
            self.assertEqual(m.plan(date(2026,9,28),m.ROOT)['kind'],'refresh')

    def test_revenue_planning_requires_fresh_matched_portal_period(self):
        m=module('revenue-scorecard')
        data={'periods':{'current':{'start':'2025-01-01','end':'2025-01-28'}},
              'amazon_portal':{'retrieved':'2025-01-31','periods':{'current':{'start':'2025-01-01','end':'2025-01-28','clicks':200,'commissions_usd':60.0}}}}
        result=m.scorecard(data,today=date(2025,1,31))
        self.assertEqual(result['target_monthly_usd'],10000)
        self.assertEqual(result['planning']['required_portal_clicks_at_observed_epc'],33334)
        self.assertAlmostEqual(result['planning']['revenue_30d_equivalent_usd'],60.0/28*30)
        self.assertIsNone(m.scorecard(data,today=date(2025,2,12))['planning'])
        data['amazon_portal']['periods']['current']['end']='2025-01-27'
        self.assertIsNone(m.scorecard(data,today=date(2025,1,31))['planning'])
        del data['amazon_portal']
        self.assertIsNone(m.scorecard(data,today=date(2025,1,31))['planning'])

    def test_missing_click_report_never_creates_absence_recommendations(self):
        m=module('revenue-scorecard')
        data={'periods':{'current':{'start':'2025-01-01','end':'2025-01-28',
              'landing':{'rows':[{'landingPage':'/blog/example/','sessionSourceMedium':'bing / organic','sessions':20,'engagedSessions':15}]}}}}
        result=m.scorecard(data,today=date(2025,1,31))
        self.assertEqual(result['organic_journey_reviews'],[])
        self.assertFalse(result['report_complete']['amazon_pages'])
        data['amazon_portal']={'retrieved':'2025-01-31','periods':{'current':{'start':'2025-01-01','end':'2025-01-28','clicks':10,'commissions_usd':None}}}
        self.assertIn('commissions unavailable',m.render(m.scorecard(data,today=date(2025,1,31))))

    def test_consolidation_blocks_retired_slugs_and_overlapping_versus_pairs(self):
        m=module('seo-workflow')
        redirects=[
            ('/blog/taylormade-qi35-max-vs-callaway-elyte-max-driver/','/blog/taylormade-qi35-vs-callaway-elyte-driver/'),
            ('/blog/best-golf-bags-2026/','/blog/best-golf-bags-2026/'),
        ]
        holds=['titleist-gts2-vs-taylormade-qi35-max-driver']
        self.assertIsNone(m.consolidation_conflict('taylormade-qi35-vs-callaway-elyte-driver','versus',redirects,holds))
        self.assertIn('retired URL', m.consolidation_conflict('taylormade-qi35-max-vs-callaway-elyte-max-driver','versus',redirects,holds))
        self.assertIn('thin comparison', m.consolidation_conflict('callaway-elyte-max-vs-taylormade-qi35-driver','versus',redirects,holds))
        self.assertIn('thin comparison', m.consolidation_conflict('titleist-gts2-vs-taylormade-qi35-driver','versus',redirects,holds))
        self.assertIsNone(m.consolidation_conflict('callaway-elyte-vs-ping-g440-irons','versus',redirects,holds))
        self.assertIsNone(m.consolidation_conflict('a-new-course-guide','courses',redirects,holds))

    def test_indexnow_rejects_external_and_noncanonical_urls(self):
        m=module('indexnow')
        for url in ['https://evil.example/blog/','https://www.birdiereport.com/blog/x','http://www.birdiereport.com/blog/x/','https://www.birdiereport.com/blog/x/?foo=1']:
            with self.assertRaises(ValueError):m.payload([url])
        body=m.payload(['https://www.birdiereport.com/blog/test/']*2)
        self.assertEqual(len(body['urlList']),1)

if __name__=='__main__':unittest.main()
