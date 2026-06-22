# Python Scripts — Weekly Data Fetch

Matches **CP3405 Tier L2/L3**: scripts fetch data → save evidence → auto-commit to GitHub.

## What these scripts do

| Script | Source | Output |
|--------|--------|--------|
| `fetch_finviz.py` | [finviz.com/futures_performance](https://finviz.com/futures_performance) | JSON with all futures weekly % |
| `fetch_yfinance.py` | yfinance (free) | Sector ETF returns + PNG charts |
| `run_weekly_fetch.py` | Runs both + builds markdown + pushes to GitHub | `evidence/Week X/` folder |

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

## Run full weekly pipeline + GitHub push

From the **group repo** (recommended):

```bash
cd CP3405_Group_4/TradeKyaMal/scripts
pip install -r requirements.txt
python run_weekly_fetch.py --week 24
```

The script auto-detects `CP3405_Group_4` as the repo root and pushes to `evidence/Week 24/`.

Or specify the repo path manually:

```bash
python run_weekly_fetch.py --week 24 --repo /path/to/CP3405_Group_4
```

This will:
1. Fetch Finviz futures 1W
2. Fetch Yahoo sectors via yfinance + save charts
3. Generate `macro_agent_data_W24.md` (Macro Lead fills in Fed, news, bias)
4. Copy files to `evidence/Week 24/` and `incoming/`
5. Git commit + push to GitHub

## Fetch only (no git)

```bash
python run_weekly_fetch.py --week 24 --no-push
```

## Weekly workflow (correct process)

```
Saturday after US close
    ↓
python run_weekly_fetch.py --week XX --repo path/to/CP3405_Group_4
    ↓
evidence/Week XX/  ← JSON + charts + macro data markdown
    ↓
Macro Lead edits macro_agent_data_WXX.md (Fed, news, bias)
    ↓
Take screenshots → add to incoming/ or evidence folder
    ↓
Sunday submit prediction + GitHub release
```

## Screenshots (still required)

Dr Tan confirmed: live screenshots at prediction time are valid evidence.
Scripts handle **data + charts**; you still add:
- Finviz screenshot
- Yahoo sectors screenshot  
- TradingEconomics calendar screenshot

## Web app vs scripts

| Tool | Purpose |
|------|---------|
| **TradeKyaMal web app** | Dashboard demo, live fetch UI |
| **Python scripts** | Weekly evidence pipeline → GitHub (what professor wants) |

The web Macro Agent page is optional. The **real Macro output** is the markdown file in `evidence/Week X/`.
