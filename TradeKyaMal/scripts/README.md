# Python Scripts — Macro Agent Live Fetch

All scripts fetch **live data from websites** — no pre-filled files.

## Scripts

| Script | Source website | Output file |
|--------|----------------|-------------|
| `fetch_macro_finviz.py` | [finviz.com/futures_performance](https://finviz.com/futures_performance) | `macro_finviz_1w_{date}.json` |
| `fetch_macro_yahoo_sectors.py` | [finance.yahoo.com/sectors](https://finance.yahoo.com/sectors/) | `macro_yahoo_sectors_{date}.json` |
| `run_macro_agent.py` | Both + report | `macro_report_w{week}.md` |
| `macro_report.py` | Template builder | (used internally) |

Legacy wrappers: `fetch_finviz.py`, `fetch_yfinance.py` → call the macro scripts above.

## Quick start

```bash
cd scripts
pip install -r requirements.txt
python run_macro_agent.py --week 24 --repo ~/Desktop/CP3405_Group_4
```

## Website (same sources)

On **Agents → Macro** click **Fetch Live Data** — hits Finviz + Yahoo APIs directly (same as Data Collection).

## Output folder

```
scripts/output/
├── macro_finviz_1w_2026-06-22.json
├── macro_yahoo_sectors_2026-06-22.json
├── macro_report_w24.md
└── macro_charts/
```

Copied to `CP3405_Group_4/evidence/Week 24/` when using `--repo`.
