#!/usr/bin/env python3
"""
Run full weekly data fetch, build evidence markdown, and push to GitHub.

Workflow (matches CP3405 course):
  1. fetch_finviz.py   → Finviz futures 1W JSON
  2. fetch_yfinance.py → Yahoo sectors JSON + charts
  3. generate report markdown for evidence folder
  4. copy to group repo incoming/ → git commit → push

Usage:
  python run_weekly_fetch.py --week 24
  python run_weekly_fetch.py --week 24 --repo /path/to/CP3405_Group_4
  python run_weekly_fetch.py --week 24 --no-push   # fetch only, no git
  python run_weekly_fetch.py --week 24 --backend-url http://localhost:4000
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

from fetch_finviz import fetch_finviz_futures
from fetch_yfinance import SECTOR_ETFS, fetch_sector_returns, save_sector_chart
from macro_report import build_macro_report

SCRIPTS_DIR = Path(__file__).parent
OUTPUT_DIR = SCRIPTS_DIR / "output"
CHARTS_DIR = OUTPUT_DIR / "charts"


def detect_group_repo() -> Path | None:
    """If scripts live in CP3405_Group_4/TradeKyaMal/scripts/, return repo root."""
    candidate = SCRIPTS_DIR.parent.parent
    if (candidate / "evidence").is_dir() and (candidate / "TradeKyaMal").is_dir():
        return candidate
    return None


def copy_to_repo(week: int, repo_path: Path) -> Path:
    """Copy output files to group repo evidence folder."""
    week_dir = repo_path / "evidence" / f"Week {week}"
    week_dir.mkdir(parents=True, exist_ok=True)

    stamp = datetime.now().strftime("%Y-%m-%d")

    # Copy JSON data
    for pattern in [f"finviz_futures_1W_{stamp}.json", f"yahoo_sectors_5D_{stamp}.json"]:
        src = OUTPUT_DIR / pattern
        if src.exists():
            shutil.copy2(src, week_dir / pattern)

    # Copy charts
    charts_dest = week_dir / "charts"
    charts_dest.mkdir(exist_ok=True)
    if CHARTS_DIR.exists():
        for chart in CHARTS_DIR.glob("*.png"):
            shutil.copy2(chart, charts_dest / chart.name)

    # Copy macro markdown
    macro_md = OUTPUT_DIR / f"macro_agent_data_W{week}.md"
    if macro_md.exists():
        shutil.copy2(macro_md, week_dir / f"macro_agent_data_W{week}.md")

    # Also stage in incoming/ for GitHub Actions workflow
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
    msg = f"chore(data): weekly fetch W{week} — Finviz + yfinance ({stamp})"

    subprocess.run(["git", "add", f"evidence/Week {week}/", "incoming/"], cwd=repo_path, check=True)

    status = subprocess.run(["git", "status", "--porcelain"], cwd=repo_path, capture_output=True, text=True)
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
        print("  requests not installed — skip backend import (pip install requests)")
        return

    url = f"{backend_url.rstrip('/')}/api/evidence/import"
    payload = {
        "week": week,
        "finviz": finviz_rows,
        "sectors": sectors,
        "syncToRepo": sync_to_repo,
    }
    res = requests.post(url, json=payload, timeout=120)
    res.raise_for_status()
    data = res.json()
    print(f"  Backend import: {data.get('imported', 0)} rows")
    if data.get("sync"):
        print(f"  Group repo sync: {data['sync'].get('message', 'done')}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Weekly data fetch + GitHub evidence push")
    parser.add_argument("--week", type=int, required=True, help="Week number e.g. 24")
    parser.add_argument(
        "--repo",
        type=str,
        default="",
        help="Path to CP3405_Group_4 repo (auto-detected when run from group folder)",
    )
    parser.add_argument("--no-push", action="store_true", help="Fetch only, skip git push")
    parser.add_argument(
        "--backend-url",
        type=str,
        default="",
        help="POST fetched data to TradeKyaMal backend (imports to website + group repo)",
    )
    args = parser.parse_args()

    OUTPUT_DIR.mkdir(exist_ok=True)
    CHARTS_DIR.mkdir(exist_ok=True)

    print("=== Step 1: Fetch Finviz futures (1W) ===")
    finviz_rows = fetch_finviz_futures("W")
    stamp = datetime.now().strftime("%Y-%m-%d")
    finviz_json = OUTPUT_DIR / f"finviz_futures_1W_{stamp}.json"
    finviz_json.write_text(json.dumps(finviz_rows, indent=2))
    print(f"  {len(finviz_rows)} rows saved")

    print("=== Step 2: Fetch Yahoo sectors (yfinance) ===")
    sectors = fetch_sector_returns()
    sectors_json = OUTPUT_DIR / f"yahoo_sectors_5D_{stamp}.json"
    sectors_json.write_text(json.dumps(sectors, indent=2))
    print(f"  {len(sectors)} sectors saved")

    print("=== Step 3: Generate charts ===")
    for symbol, name in list(SECTOR_ETFS.items())[:4]:  # top 4 sectors for speed
        save_sector_chart(CHARTS_DIR, symbol, name)

    print("=== Step 4: Build macro data report ===")
    macro_md = build_macro_report(args.week, finviz_rows, sectors, source="weekly_fetch")
    macro_path = OUTPUT_DIR / f"macro_agent_data_W{args.week}.md"
    macro_path.write_text(macro_md, encoding="utf-8")
    print(f"  Report → {macro_path}")

    # Manifest for traceability
    manifest = {
        "week": args.week,
        "fetched_at": datetime.now().isoformat(),
        "finviz_count": len(finviz_rows),
        "sectors_count": len(sectors),
        "files": [
            finviz_json.name,
            sectors_json.name,
            macro_path.name,
        ],
    }
    (OUTPUT_DIR / f"manifest_W{args.week}.json").write_text(
        json.dumps(manifest, indent=2), encoding="utf-8"
    )

    repo_arg = args.repo or (str(detect_group_repo()) if detect_group_repo() else "")
    used_local_repo = False
    if repo_arg:
        repo_path = Path(repo_arg).resolve()
        if not repo_path.exists():
            print(f"ERROR: Repo path not found: {repo_path}", file=sys.stderr)
            sys.exit(1)

        print(f"=== Step 5: Copy to {repo_path} ===")
        week_dir = copy_to_repo(args.week, repo_path)
        print(f"  Files copied to {week_dir}")
        used_local_repo = True

        if not args.no_push:
            print("=== Step 6: Git commit & push ===")
            git_push(repo_path, args.week)
    else:
        print("\nNo --repo specified. Files saved locally in scripts/output/")
        print("To push to GitHub:")
        print(f"  python run_weekly_fetch.py --week {args.week} --repo /path/to/CP3405_Group_4")

    if args.backend_url:
        print("=== Backend import (website + group repo) ===")
        push_to_backend(
            args.backend_url,
            args.week,
            finviz_rows,
            sectors,
            sync_to_repo=not used_local_repo or args.no_push,
        )

    print("\nDone.")


if __name__ == "__main__":
    main()
