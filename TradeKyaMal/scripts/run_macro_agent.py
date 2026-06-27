#!/usr/bin/env python3
"""
Macro Agent — automated weekly data fetch for CP3405 evidence.

Fetches:
  - Finviz futures 1W (commodities, dollar, indices)
  - Yahoo sector ETFs via yfinance (returns + optional charts)

Outputs:
  - scripts/output/finviz_futures_1W_{date}.json
  - scripts/output/yahoo_sectors_5D_{date}.json
  - scripts/output/macro_agent_data_W{week}.md   ← main Macro Agent deliverable
  - scripts/output/charts/*.png

Then copies to group repo:
  - evidence/Week {week}/
  - incoming/

Usage:
  python run_macro_agent.py --week 24
  python run_macro_agent.py --week 24 --repo /path/to/CP3405_Group_4
  python run_macro_agent.py --week 24 --no-push
  python run_macro_agent.py --week 24 --backend-url http://localhost:4000
  python run_macro_agent.py --week 24 --from-cache   # rebuild .md from existing JSON
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
    candidate = SCRIPTS_DIR.parent.parent
    if (candidate / "evidence").is_dir() and (candidate / "TradeKyaMal").is_dir():
        return candidate
    return None


def load_cached_json(stamp: str) -> tuple[list[dict], list[dict]]:
    finviz_file = OUTPUT_DIR / f"finviz_futures_1W_{stamp}.json"
    sectors_file = OUTPUT_DIR / f"yahoo_sectors_5D_{stamp}.json"

    if not finviz_file.exists() or not sectors_file.exists():
        raise FileNotFoundError(
            f"No cached JSON for {stamp}. Run without --from-cache first."
        )

    finviz_rows = json.loads(finviz_file.read_text(encoding="utf-8"))
    sectors = json.loads(sectors_file.read_text(encoding="utf-8"))
    return finviz_rows, sectors


def copy_macro_evidence(week: int, repo_path: Path) -> Path:
    week_dir = repo_path / "evidence" / f"Week {week}"
    week_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y-%m-%d")

    for pattern in [f"finviz_futures_1W_{stamp}.json", f"yahoo_sectors_5D_{stamp}.json"]:
        src = OUTPUT_DIR / pattern
        if src.exists():
            shutil.copy2(src, week_dir / pattern)

    charts_dest = week_dir / "charts"
    charts_dest.mkdir(exist_ok=True)
    if CHARTS_DIR.exists():
        for chart in CHARTS_DIR.glob("*.png"):
            shutil.copy2(chart, charts_dest / chart.name)

    macro_md = OUTPUT_DIR / f"macro_agent_data_W{week}.md"
    if macro_md.exists():
        shutil.copy2(macro_md, week_dir / f"macro_agent_data_W{week}.md")

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
    msg = f"chore(macro): Macro Agent W{week} — Finviz + yfinance ({stamp})"

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
    print(f"  Website import: {data.get('imported', 0)} rows")
    if data.get("sync"):
        print(f"  Group repo sync: {data['sync'].get('message', 'done')}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Macro Agent — Finviz + yfinance fetch → macro report → group repo"
    )
    parser.add_argument("--week", type=int, required=True, help="Week number e.g. 24")
    parser.add_argument("--repo", type=str, default="", help="Path to CP3405_Group_4 repo")
    parser.add_argument("--no-push", action="store_true", help="Skip git commit/push")
    parser.add_argument(
        "--backend-url",
        type=str,
        default="",
        help="Import to TradeKyaMal website + sync group repo via API",
    )
    parser.add_argument(
        "--from-cache",
        action="store_true",
        help="Rebuild macro markdown from today's JSON in scripts/output/",
    )
    parser.add_argument(
        "--no-charts",
        action="store_true",
        help="Skip yfinance PNG chart generation",
    )
    args = parser.parse_args()

    OUTPUT_DIR.mkdir(exist_ok=True)
    CHARTS_DIR.mkdir(exist_ok=True)
    stamp = datetime.now().strftime("%Y-%m-%d")

    if args.from_cache:
        print("=== Loading cached JSON ===")
        finviz_rows, sectors = load_cached_json(stamp)
        print(f"  {len(finviz_rows)} finviz rows, {len(sectors)} sectors")
    else:
        print("=== Macro Agent Step 1: Finviz futures (1W) ===")
        finviz_rows = fetch_finviz_futures("W")
        finviz_json = OUTPUT_DIR / f"finviz_futures_1W_{stamp}.json"
        finviz_json.write_text(json.dumps(finviz_rows, indent=2), encoding="utf-8")
        print(f"  {len(finviz_rows)} rows → {finviz_json.name}")

        print("=== Macro Agent Step 2: Yahoo sectors (yfinance) ===")
        sectors = fetch_sector_returns()
        sectors_json = OUTPUT_DIR / f"yahoo_sectors_5D_{stamp}.json"
        sectors_json.write_text(json.dumps(sectors, indent=2), encoding="utf-8")
        print(f"  {len(sectors)} sectors → {sectors_json.name}")

        if not args.no_charts:
            print("=== Macro Agent Step 3: Sector charts ===")
            for symbol, name in list(SECTOR_ETFS.items())[:4]:
                path = save_sector_chart(CHARTS_DIR, symbol, name)
                if path:
                    print(f"  {path.name}")

    print("=== Macro Agent Step 4: Build report markdown ===")
    macro_md = build_macro_report(args.week, finviz_rows, sectors)
    macro_path = OUTPUT_DIR / f"macro_agent_data_W{args.week}.md"
    macro_path.write_text(macro_md, encoding="utf-8")
    print(f"  Report → {macro_path}")

    manifest = {
        "agent": "macro",
        "week": args.week,
        "fetched_at": datetime.now().isoformat(),
        "finviz_count": len(finviz_rows),
        "sectors_count": len(sectors),
        "macro_report": macro_path.name,
    }
    (OUTPUT_DIR / f"macro_manifest_W{args.week}.json").write_text(
        json.dumps(manifest, indent=2), encoding="utf-8"
    )

    repo_arg = args.repo or (str(detect_group_repo()) if detect_group_repo() else "")
    used_local_repo = False
    if repo_arg:
        repo_path = Path(repo_arg).resolve()
        if not repo_path.exists():
            print(f"ERROR: Repo path not found: {repo_path}", file=sys.stderr)
            sys.exit(1)

        print(f"=== Macro Agent Step 5: Copy to {repo_path} ===")
        week_dir = copy_macro_evidence(args.week, repo_path)
        print(f"  evidence/Week {args.week}/ ← {week_dir}")
        used_local_repo = True

        if not args.no_push:
            print("=== Macro Agent Step 6: Git commit & push ===")
            git_push(repo_path, args.week)
    else:
        print("\nNo --repo specified. Output in scripts/output/")
        print(f"  python run_macro_agent.py --week {args.week} --repo /path/to/CP3405_Group_4")

    if args.backend_url:
        print("=== Macro Agent Step 7: Import to website ===")
        push_to_backend(
            args.backend_url,
            args.week,
            finviz_rows,
            sectors,
            sync_to_repo=not used_local_repo or args.no_push,
        )

    print("\nMacro Agent done.")
    print(f"  Next: Macro Lead edits {macro_path.name} (Fed, news, bias)")
    print(f"  Then: add screenshots to evidence/Week {args.week}/")


if __name__ == "__main__":
    main()
