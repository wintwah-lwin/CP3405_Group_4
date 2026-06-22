#!/usr/bin/env python3
"""
Fetch Finviz Futures Performance (weekly scorecard).
Source: https://finviz.com/futures_performance
No API key required — reads embedded JSON from the public page.
"""

import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

import requests

FINVIZ_URL = "https://finviz.com/futures_performance.ashx?v=12"  # weekly
USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) TradeKyaMal/1.0"


def fetch_finviz_futures(timeframe: str = "W") -> list[dict]:
    suffix = {"D": "", "W": "?v=12", "M": "?v=13"}.get(timeframe, "?v=12")
    url = f"https://finviz.com/futures_performance.ashx{suffix}"

    res = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=30)
    res.raise_for_status()

    match = re.search(r"FinvizInitFuturesPerformance\((\[[\s\S]*?\])\)", res.text)
    if not match:
        raise RuntimeError("Could not parse Finviz futures data from page")

    rows = json.loads(match.group(1))
    fetched_at = datetime.now(timezone.utc).isoformat()

    return [
        {
            "ticker": row["ticker"],
            "label": row["label"],
            "group": row["group"],
            "perf_pct": row["perf"],
            "fetched_at": fetched_at,
            "source": "finviz.com/futures_performance",
        }
        for row in rows
    ]


def main() -> None:
    out_dir = Path(__file__).parent / "output"
    out_dir.mkdir(exist_ok=True)

    data = fetch_finviz_futures("W")
    stamp = datetime.now().strftime("%Y-%m-%d")
    out_file = out_dir / f"finviz_futures_1W_{stamp}.json"

    out_file.write_text(json.dumps(data, indent=2), encoding="utf-8")
    print(f"Saved {len(data)} futures rows → {out_file}")

  # Print key macro commodities for quick check
    key = {"CL", "GC", "DX", "ES", "NQ"}
    for row in data:
        if row["ticker"] in key:
            print(f"  {row['ticker']} ({row['label']}): {row['perf_pct']:+.2f}%")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)
