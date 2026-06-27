# Python Scripts — Weekly Data Fetch

Matches **CP3405 Tier L2/L3**: scripts fetch data → save evidence → auto-commit to GitHub.

## What these scripts do

| Script | Source | Output |
|--------|--------|--------|
| `fetch_finviz.py` | [finviz.com/futures_performance](https://finviz.com/futures_performance) | JSON with all futures weekly % |
| `fetch_yfinance.py` | yfinance (free) | Sector ETF returns + PNG charts |
| **`run_macro_agent.py`** | **Macro Agent** — Finviz + yfinance | **`macro_agent_data_WX.md`** + JSON + charts |
| `macro_report.py` | Shared template builder | Used by macro scripts |
| `run_weekly_fetch.py` | Full weekly pipeline (alias) | Same as macro agent |

## Macro Agent (recommended)

```bash
cd scripts
pip install -r requirements.txt
python run_macro_agent.py --week 24 --repo /path/to/CP3405_Group_4
```

With website import:

```bash
python run_macro_agent.py --week 24 --backend-url http://localhost:4000
```

Output: `scripts/output/` then copied to `CP3405_Group_4/evidence/Week 24/`.

## Setup

```bash
cd scripts
pip install -r requirements.txt
```

## Run locally (fetch only)

```bash
python fetch_finviz.py
python fetch_yfinance.py
```

Output goes to `scripts/output/`.

## Weekly workflow

```
Saturday after US close
    ↓
python run_macro_agent.py --week XX --repo path/to/CP3405_Group_4
    ↓
evidence/Week XX/  ← JSON + charts + macro_agent_data_WXX.md
    ↓
Macro Lead edits macro_agent_data_WXX.md (Fed, news, bias)
    ↓
Take screenshots → add to evidence folder
    ↓
Sunday submit prediction + GitHub release
```

## Web app + scripts

| Tool | Purpose |
|------|---------|
| **TradeKyaMal web app** | Macro page UI, Pull from Fetched Data, sync to group repo |
| **Python scripts** | Weekly evidence pipeline → `evidence/Week X/` on GitHub |

The course deliverable is `evidence/Week X/macro_agent_data_WX.md`.
