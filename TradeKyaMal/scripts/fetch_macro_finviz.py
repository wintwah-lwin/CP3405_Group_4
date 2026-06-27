#!/usr/bin/env python3
"""
Macro Agent — fetch Finviz Futures 1W scorecard.
Source: https://finviz.com/futures_performance
Output: scripts/output/macro_finviz_1w_{date}.json
"""

import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

import requests

USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) TradeKyaMal/1.0"
OUTPUT_NAME = "macro_finviz_1w_{stamp}.json"


def fetch_macro_finviz(timeframe: str = "W") -> list[dict]:
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
            "source_url": "https://finviz.com/futures_performance",
        }
        for row in rows
    ]


def save_macro_finviz(out_dir: Path | None = None, timeframe: str = "W") -> Path:
    out_dir = out_dir or Path(__file__).parent / "output"
    out_dir.mkdir(exist_ok=True)

    data = fetch_macro_finviz(timeframe)
    stamp = datetime.now().strftime("%Y-%m-%d")
    out_file = out_dir / OUTPUT_NAME.format(stamp=stamp)
    out_file.write_text(json.dumps(data, indent=2), encoding="utf-8")
    return out_file


# Back-compat alias used by older imports
fetch_finviz_futures = fetch_macro_finviz


def main() -> None:
    out_file = save_macro_finviz()
    data = json.loads(out_file.read_text(encoding="utf-8"))
    print(f"Saved {len(data)} rows → {out_file.name}")

    for row in data:
        if row["ticker"] in {"CL", "GC", "DX", "USD"}:
            print(f"  {row['ticker']} ({row['label']}): {row['perf_pct']:+.2f}%")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)
