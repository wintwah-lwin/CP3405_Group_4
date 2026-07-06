#!/usr/bin/env python3
"""
Macro Agent — fetch live from Finviz + Yahoo, build report, push to group repo.

Sources:
  - https://finviz.com/futures_performance  (1W commodities / dollar)
  - https://finance.yahoo.com/sectors/     (sector ETFs via yfinance)

Outputs (scripts/output/):
  - macro_finviz_1w_{date}.json
  - macro_yahoo_sectors_{date}.json
  - macro_report_w{week}.md
  - macro_charts/macro_{symbol}_{date}.png
"""

import argparse
import json
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path

try:
    import requests
except ImportError:
    requests = None

from fetch_macro_finviz import fetch_macro_finviz, save_macro_finviz
from fetch_macro_yahoo_sectors import (
    SECTOR_ETFS,
    fetch_macro_yahoo_sectors,
    save_macro_sector_chart,
    save_macro_yahoo_sectors,
)
from macro_report import build_macro_report

SCRIPTS_DIR = Path(__file__).parent
OUTPUT_DIR = SCRIPTS_DIR / "output"
CHARTS_DIR = OUTPUT_DIR / "macro_charts"

FINVIZ_JSON = "macro_finviz_1w_{stamp}.json"
SECTORS_JSON = "macro_yahoo_sectors_{stamp}.json"
REPORT_MD = "macro_report_w{week}.md"


def detect_group_repo() -> Path | None:
    candidate = SCRIPTS_DIR.parent.parent
    if (candidate / "evidence").is_dir() and (candidate / "TradeKyaMal").is_dir():
        return candidate
    return None


def load_cached_json(stamp: str) -> tuple[list[dict], list[dict]]:
    finviz_file = OUTPUT_DIR / FINVIZ_JSON.format(stamp=stamp)
    sectors_file = OUTPUT_DIR / SECTORS_JSON.format(stamp=stamp)

    if not finviz_file.exists() or not sectors_file.exists():
        raise FileNotFoundError(
            f"No cached JSON for {stamp}. Run without --from-cache first."
        )

    return (
        json.loads(finviz_file.read_text(encoding="utf-8")),
        json.loads(sectors_file.read_text(encoding="utf-8")),
    )


def copy_macro_evidence(week: int, repo_path: Path) -> Path:
    week_dir = repo_path / "evidence" / f"Week {week}"
    week_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y-%m-%d")

    for name in [
        FINVIZ_JSON.format(stamp=stamp),
        SECTORS_JSON.format(stamp=stamp),
        REPORT_MD.format(week=week),
    ]:
        src = OUTPUT_DIR / name
        if src.exists():
            shutil.copy2(src, week_dir / name)

    charts_dest = week_dir / "macro_charts"
    charts_dest.mkdir(exist_ok=True)
    if CHARTS_DIR.exists():
        for chart in CHARTS_DIR.glob("*.png"):
            shutil.copy2(chart, charts_dest / chart.name)

    incoming = repo_path / "incoming"
    incoming.mkdir(exist_ok=True)
    for f in week_dir.iterdir():
        if f.is_file():
            shutil.copy2(f, incoming / f.name)
    if charts_dest.exists():
        for chart in charts_dest.glob("*.png"):
            shutil.copy2(chart, incoming / chart.name)

    return week_dir


def git_push(repo_path: Path, week: int) -> None:
    stamp = datetime.now().strftime("%Y-%m-%d %H:%M SGT")
    msg = f"chore(macro): live fetch W{week} — Finviz + Yahoo ({stamp})"

    subprocess.run(
        ["git", "add", f"evidence/Week {week}/", "incoming/"],
        cwd=repo_path,
        check=True,
    )
    status = subprocess.run(
        ["git", "status", "--porcelain"], cwd=repo_path, capture_output=True, text=True
    )
    if not status.stdout.strip():
        print("No changes to commit.")
        return

    subprocess.run(["git", "commit", "-m", msg], cwd=repo_path, check=True)
    subprocess.run(["git", "push", "origin", "main"], cwd=repo_path, check=True)
    print(f"Pushed to GitHub: {msg}")


def push_to_backend(
    backend_url: str,
    week: int,
    finviz_rows: list[dict],
    sectors: list[dict],
    sync_to_repo: bool,
) -> None:
    if not requests:
        print("  requests not installed — skip backend import")
        return

    url = f"{backend_url.rstrip('/')}/api/evidence/import"
    res = requests.post(
        url,
        json={"week": week, "finviz": finviz_rows, "sectors": sectors, "syncToRepo": sync_to_repo},
        timeout=120,
    )
    res.raise_for_status()
    data = res.json()
    print(f"  Website import: {data.get('imported', 0)} rows")


def main() -> None:
    parser = argparse.ArgumentParser(description="Macro Agent live fetch pipeline")
    parser.add_argument("--week", type=int, required=True)
    parser.add_argument("--repo", type=str, default="")
    parser.add_argument("--no-push", action="store_true")
    parser.add_argument("--backend-url", type=str, default="")
    parser.add_argument("--from-cache", action="store_true")
    parser.add_argument("--no-charts", action="store_true")
    args = parser.parse_args()

    OUTPUT_DIR.mkdir(exist_ok=True)
    CHARTS_DIR.mkdir(exist_ok=True)
    stamp = datetime.now().strftime("%Y-%m-%d")

    if args.from_cache:
        print("=== Load cached macro JSON ===")
        finviz_rows, sectors = load_cached_json(stamp)
    else:
        print("=== Step 1: Finviz 1W (finviz.com) ===")
        finviz_path = save_macro_finviz(OUTPUT_DIR, "W")
        finviz_rows = json.loads(finviz_path.read_text(encoding="utf-8"))
        print(f"  {len(finviz_rows)} rows → {finviz_path.name}")

        print("=== Step 2: Yahoo sectors (yfinance) ===")
        sectors_path, sectors = save_macro_yahoo_sectors(OUTPUT_DIR)
        print(f"  {len(sectors)} sectors → {sectors_path.name}")

        if not args.no_charts:
            print("=== Step 3: Sector charts ===")
            for symbol, name in list(SECTOR_ETFS.items())[:4]:
                path = save_macro_sector_chart(CHARTS_DIR, symbol, name)
                if path:
                    print(f"  {path.name}")

    print("=== Step 4: Macro report markdown ===")
    macro_md = build_macro_report(args.week, finviz_rows, sectors)
    macro_path = OUTPUT_DIR / REPORT_MD.format(week=args.week)
    macro_path.write_text(macro_md, encoding="utf-8")
    print(f"  → {macro_path.name}")

    (OUTPUT_DIR / f"macro_manifest_w{args.week}.json").write_text(
        json.dumps(
            {
                "agent": "macro",
                "week": args.week,
                "fetched_at": datetime.now().isoformat(),
                "files": [
                    FINVIZ_JSON.format(stamp=stamp),
                    SECTORS_JSON.format(stamp=stamp),
                    macro_path.name,
                ],
            },
            indent=2,
        ),
        encoding="utf-8",
    )

    repo_arg = args.repo or (str(detect_group_repo()) if detect_group_repo() else "")
    used_local_repo = False
    if repo_arg:
        repo_path = Path(repo_arg).resolve()
        print(f"=== Step 5: Copy to {repo_path} ===")
        copy_macro_evidence(args.week, repo_path)
        used_local_repo = True
        if not args.no_push:
            git_push(repo_path, args.week)

    if args.backend_url:
        print("=== Step 6: Import to website ===")
        push_to_backend(
            args.backend_url,
            args.week,
            finviz_rows,
            sectors,
            sync_to_repo=not used_local_repo or args.no_push,
        )

    print("\nDone. Macro report generated with automated Fed rate, FOMC date, and macro bias.")


if __name__ == "__main__":
    main()
