#!/usr/bin/env python3
"""Birdie Report Analytics & Search Console daily report."""

import json
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

# --- Config ---
SERVICE_ACCOUNT_FILE = Path(__file__).parent.parent / ".google-service-account.json"
GA4_PROPERTY_ID = None  # Will be discovered
SITE_URL = "sc-domain:birdiereport.com"  # Search Console property

def get_ga4_credentials():
    from google.oauth2 import service_account
    SCOPES = [
        "https://www.googleapis.com/auth/analytics.readonly",
        "https://www.googleapis.com/auth/webmasters.readonly",
    ]
    return service_account.Credentials.from_service_account_file(
        str(SERVICE_ACCOUNT_FILE), scopes=SCOPES
    )

def discover_ga4_property(credentials):
    """List GA4 properties accessible to the service account."""
    from google.analytics.data_v1beta import BetaAnalyticsDataClient
    from google.analytics.admin_v1alpha import AnalyticsAdminServiceClient
    try:
        from google.analytics.admin_v1alpha import AnalyticsAdminServiceClient
        admin_client = AnalyticsAdminServiceClient(credentials=credentials)
        accounts = list(admin_client.list_accounts())
        for account in accounts:
            properties = list(admin_client.list_properties(
                filter=f"parent:{account.name}"
            ))
            for prop in properties:
                if "birdie" in prop.display_name.lower() or "birdie" in str(prop.name).lower():
                    # Extract numeric ID from "properties/123456"
                    return prop.name.split("/")[-1]
        # Return first property found if no birdie match
        if accounts:
            properties = list(admin_client.list_properties(
                filter=f"parent:{accounts[0].name}"
            ))
            if properties:
                return properties[0].name.split("/")[-1]
    except Exception as e:
        print(f"Could not auto-discover GA4 property: {e}", file=sys.stderr)
    return None

def get_ga4_report(credentials, property_id, days=1):
    """Pull GA4 data for the given number of days."""
    from google.analytics.data_v1beta import BetaAnalyticsDataClient
    from google.analytics.data_v1beta.types import (
        RunReportRequest, DateRange, Dimension, Metric, OrderBy
    )
    
    client = BetaAnalyticsDataClient(credentials=credentials)
    end_date = datetime.now().strftime("%Y-%m-%d")
    start_date = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
    
    # Overview metrics
    overview = client.run_report(RunReportRequest(
        property=f"properties/{property_id}",
        date_ranges=[DateRange(start_date=start_date, end_date=end_date)],
        metrics=[
            Metric(name="sessions"),
            Metric(name="totalUsers"),
            Metric(name="screenPageViews"),
            Metric(name="averageSessionDuration"),
            Metric(name="bounceRate"),
        ],
    ))
    
    # Top pages
    top_pages = client.run_report(RunReportRequest(
        property=f"properties/{property_id}",
        date_ranges=[DateRange(start_date=start_date, end_date=end_date)],
        dimensions=[Dimension(name="pagePath")],
        metrics=[
            Metric(name="screenPageViews"),
            Metric(name="totalUsers"),
        ],
        order_bys=[OrderBy(metric=OrderBy.MetricOrderBy(metric_name="screenPageViews"), desc=True)],
        limit=10,
    ))
    
    # Traffic sources
    sources = client.run_report(RunReportRequest(
        property=f"properties/{property_id}",
        date_ranges=[DateRange(start_date=start_date, end_date=end_date)],
        dimensions=[Dimension(name="sessionDefaultChannelGroup")],
        metrics=[
            Metric(name="sessions"),
            Metric(name="totalUsers"),
        ],
        order_bys=[OrderBy(metric=OrderBy.MetricOrderBy(metric_name="sessions"), desc=True)],
        limit=10,
    ))
    
    return overview, top_pages, sources

def get_search_console_report(credentials, days=3):
    """Pull Search Console data (3-day delay typical)."""
    from googleapiclient.discovery import build
    
    service = build("searchconsole", "v1", credentials=credentials)
    end_date = (datetime.now() - timedelta(days=3)).strftime("%Y-%m-%d")
    start_date = (datetime.now() - timedelta(days=3 + days)).strftime("%Y-%m-%d")
    
    try:
        response = service.searchanalytics().query(
            siteUrl=SITE_URL,
            body={
                "startDate": start_date,
                "endDate": end_date,
                "dimensions": ["query"],
                "rowLimit": 20,
                "orderBy": [{"fieldName": "clicks", "sortOrder": "DESCENDING"}],
            },
        ).execute()
        
        page_response = service.searchanalytics().query(
            siteUrl=SITE_URL,
            body={
                "startDate": start_date,
                "endDate": end_date,
                "dimensions": ["page"],
                "rowLimit": 10,
                "orderBy": [{"fieldName": "clicks", "sortOrder": "DESCENDING"}],
            },
        ).execute()
        
        return response.get("rows", []), page_response.get("rows", [])
    except Exception as e:
        return None, str(e)

def format_report(ga4_data, search_data):
    """Format everything into a readable report."""
    overview, top_pages, sources = ga4_data
    search_queries, search_pages = search_data
    
    lines = ["# 📊 Birdie Report — Daily Analytics", ""]
    
    # GA4 Overview
    if overview.rows:
        row = overview.rows[0]
        sessions = row.metric_values[0].value
        users = row.metric_values[1].value
        pageviews = row.metric_values[2].value
        avg_duration = float(row.metric_values[3].value)
        bounce = float(row.metric_values[4].value) * 100
        
        lines.append("## Traffic Overview (Last 24h)")
        lines.append(f"- **Sessions:** {sessions}")
        lines.append(f"- **Users:** {users}")
        lines.append(f"- **Pageviews:** {pageviews}")
        lines.append(f"- **Avg Session Duration:** {avg_duration:.0f}s")
        lines.append(f"- **Bounce Rate:** {bounce:.1f}%")
        lines.append("")
    else:
        lines.append("## Traffic Overview")
        lines.append("No data yet (GA4 can take 24-48h to start reporting)")
        lines.append("")
    
    # Top Pages
    if top_pages.rows:
        lines.append("## Top Pages")
        for row in top_pages.rows:
            path = row.dimension_values[0].value
            views = row.metric_values[0].value
            users = row.metric_values[1].value
            lines.append(f"- **{path}** — {views} views, {users} users")
        lines.append("")
    
    # Traffic Sources
    if sources.rows:
        lines.append("## Traffic Sources")
        for row in sources.rows:
            source = row.dimension_values[0].value
            sessions = row.metric_values[0].value
            lines.append(f"- **{source}:** {sessions} sessions")
        lines.append("")
    
    # Search Console
    if isinstance(search_queries, list) and search_queries:
        lines.append("## Search Console — Top Queries (3-day delay)")
        for row in search_queries[:15]:
            query = row["keys"][0]
            clicks = int(row["clicks"])
            impressions = int(row["impressions"])
            position = row["position"]
            lines.append(f"- **\"{query}\"** — {clicks} clicks, {impressions} impressions, pos {position:.1f}")
        lines.append("")
    elif isinstance(search_queries, list):
        lines.append("## Search Console")
        lines.append("No search data yet (takes a few days after verification)")
        lines.append("")
    else:
        lines.append("## Search Console")
        lines.append(f"Error: {search_pages}")
        lines.append("")
    
    if isinstance(search_pages, list) and search_pages:
        lines.append("## Top Pages by Search Clicks")
        for row in search_pages:
            page = row["keys"][0].replace("https://birdiereport.com", "")
            clicks = int(row["clicks"])
            impressions = int(row["impressions"])
            lines.append(f"- **{page}** — {clicks} clicks, {impressions} impressions")
        lines.append("")
    
    return "\n".join(lines)

def main():
    credentials = get_ga4_credentials()
    
    # Try to load cached property ID
    cache_file = Path(__file__).parent.parent / ".ga4-property-id"
    property_id = None
    if cache_file.exists():
        property_id = cache_file.read_text().strip()
    
    if not property_id:
        print("Discovering GA4 property...", file=sys.stderr)
        property_id = discover_ga4_property(credentials)
        if property_id:
            cache_file.write_text(property_id)
            print(f"Found GA4 property: {property_id}", file=sys.stderr)
        else:
            print("ERROR: Could not find GA4 property. You may need to grant the service account access.", file=sys.stderr)
            sys.exit(1)
    
    days = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    
    ga4_data = get_ga4_report(credentials, property_id, days)
    search_data = get_search_console_report(credentials, days)
    
    report = format_report(ga4_data, search_data)
    print(report)

if __name__ == "__main__":
    main()
