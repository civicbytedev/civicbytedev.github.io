#!/usr/bin/env python3
"""Fetch GA4 data and write to data/analytics-data.json."""

import json
import os
from datetime import datetime, timezone

from google.analytics.data_v1beta import BetaAnalyticsDataClient
from google.analytics.data_v1beta.types import (
    DateRange,
    Dimension,
    Metric,
    OrderBy,
    RunRealtimeReportRequest,
    RunReportRequest,
)
from google.oauth2 import service_account

PROPERTY_ID = os.environ["GA4_PROPERTY_ID"]
KEY_JSON    = os.environ["GA4_SERVICE_ACCOUNT_KEY"]


def mv(response, row=0, idx=0):
    try:
        return int(response.rows[row].metric_values[idx].value)
    except (IndexError, AttributeError):
        return 0


def path_to_label(path):
    p = path.rstrip("/").lower()
    if p in ("", "/index.html"):                     return "Home"
    if p in ("/tools", "/tools.html"):               return "Tools"
    if p in ("/about", "/about.html"):               return "About"
    if p in ("/submit", "/submit.html"):             return "Submit a Tool"
    if p in ("/analytics", "/analytics.html"):       return None
    if p in ("/admin", "/admin.html", "/login", "/login.html"): return None
    name = p.split("/")[-1].replace(".html", "").replace("-", " ").replace("_", " ")
    if not name:
        return None
    label = name.title()
    label = label.replace("Nyc", "NYC")
    return label


def main():
    creds = service_account.Credentials.from_service_account_info(
        json.loads(KEY_JSON),
        scopes=["https://www.googleapis.com/auth/analytics.readonly"],
    )
    client = BetaAnalyticsDataClient(credentials=creds)
    prop   = f"properties/{PROPERTY_ID}"

    # ── Realtime ──────────────────────────────────────────────
    rt = client.run_realtime_report(RunRealtimeReportRequest(
        property=prop,
        metrics=[Metric(name="activeUsers")],
    ))
    realtime = mv(rt)

    # ── 7-day ─────────────────────────────────────────────────
    d7 = client.run_report(RunReportRequest(
        property=prop,
        date_ranges=[DateRange(start_date="7daysAgo", end_date="today")],
        metrics=[Metric(name="activeUsers"), Metric(name="screenPageViews"), Metric(name="sessions")],
    ))
    week = {"users": mv(d7,0,0), "views": mv(d7,0,1), "sessions": mv(d7,0,2)}

    # ── 30-day ────────────────────────────────────────────────
    d30 = client.run_report(RunReportRequest(
        property=prop,
        date_ranges=[DateRange(start_date="30daysAgo", end_date="today")],
        metrics=[
            Metric(name="activeUsers"), Metric(name="newUsers"),
            Metric(name="screenPageViews"), Metric(name="sessions"),
        ],
    ))
    month = {"users": mv(d30,0,0), "newUsers": mv(d30,0,1), "views": mv(d30,0,2), "sessions": mv(d30,0,3)}

    # ── Top pages ─────────────────────────────────────────────
    pages_resp = client.run_report(RunReportRequest(
        property=prop,
        date_ranges=[DateRange(start_date="30daysAgo", end_date="today")],
        dimensions=[Dimension(name="pagePath")],
        metrics=[Metric(name="activeUsers")],
        order_bys=[OrderBy(metric=OrderBy.MetricOrderBy(metric_name="activeUsers"), desc=True)],
        limit=20,
    ))
    top_pages, seen = [], set()
    for row in pages_resp.rows:
        label = path_to_label(row.dimension_values[0].value)
        if not label or label in seen:
            continue
        seen.add(label)
        top_pages.append({"label": label, "count": int(row.metric_values[0].value)})
    top_pages = top_pages[:8]

    # ── Sources ───────────────────────────────────────────────
    src_resp = client.run_report(RunReportRequest(
        property=prop,
        date_ranges=[DateRange(start_date="30daysAgo", end_date="today")],
        dimensions=[Dimension(name="sessionDefaultChannelGroup")],
        metrics=[Metric(name="sessions")],
        order_bys=[OrderBy(metric=OrderBy.MetricOrderBy(metric_name="sessions"), desc=True)],
        limit=7,
    ))
    sources = [
        {"name": row.dimension_values[0].value, "count": int(row.metric_values[0].value), "i": i}
        for i, row in enumerate(src_resp.rows)
    ]

    # ── Write JSON ────────────────────────────────────────────
    data = {
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "realtime":  realtime,
        "7day":      week,
        "30day":     month,
        "topPages":  top_pages,
        "sources":   sources,
    }

    out_path = os.path.join(os.path.dirname(__file__), "../../data/analytics-data.json")
    with open(out_path, "w") as f:
        json.dump(data, f, indent=2)

    print(f"✓ Analytics updated — {week['users']} users (7d), {realtime} active now")


if __name__ == "__main__":
    main()
