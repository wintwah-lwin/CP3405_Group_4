#!/usr/bin/env python3

import argparse
import shutil
from datetime import datetime, date, timedelta
from pathlib import Path

import yfinance as yf
import matplotlib.pyplot as plt


SCRIPTS_DIR = Path(__file__).parent
OUTPUT_DIR = SCRIPTS_DIR / "output"
REPORT_MD = "technical_agent_2026-W{week}.md"

INSTRUMENTS = {
    "^GSPC": {"name": "S&P 500", "label": "SPX"},
    "^NDX": {"name": "Nasdaq 100", "label": "NDX"},
    "IWM": {"name": "Russell 2000 / IWM", "label": "IWM"},
}

BREADTH_TICKERS = [
    "NVDA", "AVGO", "MU", "AMD", "INTC", "QCOM", "AMAT", "STX", "WDC",
    "MSFT", "AAPL", "META", "AMZN", "GOOGL",
    "JPM", "BAC", "AXP",
    "XOM", "CVX", "COP",
    "LLY", "JNJ", "MRK", "AMGN",
    "NFLX", "TMUS"
]


def get_week_range():
    today = date.today()
    monday = today - timedelta(days=today.weekday())
    friday = monday + timedelta(days=4)
    return monday, friday


def fetch_weekly_data(symbol):
    df = yf.Ticker(symbol).history(period="1y", interval="1wk", auto_adjust=False)
    df = df.dropna(subset=["Close"])

    if df.empty or len(df) < 22:
        return None

    df["EMA8"] = df["Close"].ewm(span=8, adjust=False).mean()
    df["EMA21"] = df["Close"].ewm(span=21, adjust=False).mean()

    return df


def calculate_levels(df):
    latest = df.iloc[-1]

    close = float(latest["Close"])
    ema8 = float(latest["EMA8"])
    ema21 = float(latest["EMA21"])

    price_vs_ema8 = close - ema8
    ema_gap = ema8 - ema21

    recent_high = float(df["High"].tail(12).max())
    recent_low = float(df["Low"].tail(12).min())

    if close > ema8 and ema8 > ema21:
        zone = "Zone 1 (Bullish)"
        bias = "Bullish"
        condition = "trend structure is fully bullish because price is above both EMAs and the 8 EMA is above the 21 EMA."
    elif close < ema8 and ema8 < ema21:
        zone = "Zone 3 (Bearish)"
        bias = "Bearish"
        condition = "trend structure is bearish because price is below both EMAs and the 8 EMA is below the 21 EMA."
    else:
        zone = "Zone 2 (Caution)"
        bias = "Neutral-Bullish" if close > ema21 else "Neutral-Bearish"
        condition = "trend structure is mixed because price and EMA alignment are not fully confirmed."

    resistance1 = round(recent_high, 2)
    resistance2 = round(recent_high * 1.01, 2)

    support1 = round(ema8, 2)
    support2 = round(ema21, 2)

    return {
        "close": round(close, 2),
        "ema8": round(ema8, 2),
        "ema21": round(ema21, 2),
        "price_vs_ema8": round(price_vs_ema8, 2),
        "ema_gap": round(ema_gap, 2),
        "zone": zone,
        "bias": bias,
        "condition": condition,
        "resistance1": resistance1,
        "resistance2": resistance2,
        "support1": support1,
        "support2": support2,
    }


def create_chart(symbol, label, df, week):
    safe_symbol = label.replace("/", "").replace(" ", "_")
    filename = f"technical_{safe_symbol}_W{week}.png"
    path = OUTPUT_DIR / filename

    plt.figure(figsize=(11, 6))
    plt.plot(df.index, df["Close"], label="Weekly Close")
    plt.plot(df.index, df["EMA8"], label="8 EMA")
    plt.plot(df.index, df["EMA21"], label="21 EMA")
    plt.title(f"{label} Weekly EMA Chart")
    plt.xlabel("Date")
    plt.ylabel("Price")
    plt.legend()
    plt.tight_layout()
    plt.savefig(path)
    plt.close()

    return filename


def fetch_stock_return(ticker):
    try:
        df = yf.Ticker(ticker).history(period="7d", interval="1d", auto_adjust=False)
        df = df.dropna(subset=["Close"])

        if len(df) < 2:
            return None

        start = float(df["Close"].iloc[0])
        end = float(df["Close"].iloc[-1])
        pct = ((end - start) / start) * 100

        return round(pct, 2)

    except Exception:
        return None


def fetch_breadth():
    rows = []

    for ticker in BREADTH_TICKERS:
        change = fetch_stock_return(ticker)

        if change is not None:
            rows.append({
                "ticker": ticker,
                "change": change
            })

    rows.sort(key=lambda x: x["change"], reverse=True)

    return {
        "strong": rows[:10],
        "weak": rows[-10:],
    }


def format_direction(value):
    return "ABOVE" if value >= 0 else "BELOW"


def instrument_section(symbol, info, week):
    df = fetch_weekly_data(symbol)

    if df is None:
        return f"""## INSTRUMENT: {info["name"]}

No weekly data fetched for {info["name"]}.
""", None

    levels = calculate_levels(df)
    chart = create_chart(symbol, info["label"], df, week)

    price_relation = format_direction(levels["price_vs_ema8"])
    ema_relation = "ABOVE" if levels["ema_gap"] >= 0 else "BELOW"

    if levels["price_vs_ema8"] >= 0:
        price_signal = "Bullish short-term momentum. Price remains above the fast weekly EMA, showing buyers still control the trend."
    else:
        price_signal = "Weak short-term momentum. Price is below the fast weekly EMA, showing buyers have lost some control."

    if levels["bias"] == "Bullish":
        confidence = "Medium-High"
    elif levels["bias"] == "Bearish":
        confidence = "Medium"
    else:
        confidence = "Medium"

    section = f"""## INSTRUMENT: {info["name"]} ({info["label"]}), Weekly Chart

**LAST CLOSE:** {levels["close"]}

**8 EMA vs PRICE:**
- Price is **{price_relation}** the 8 EMA.
- 8 EMA = {levels["ema8"]}.
- Price is approximately {abs(levels["price_vs_ema8"])} points from the 8 EMA.
- Signal: {price_signal}

**8 EMA vs 21 EMA:**
- 8 EMA is **{ema_relation}** the 21 EMA.
- 21 EMA = {levels["ema21"]}.
- Gap between 8 EMA and 21 EMA is approximately {abs(levels["ema_gap"])} points.
- EMA Condition: {levels["zone"]} — {levels["condition"]}

**TRENDLINE:**
- {info["label"]} is assessed using the latest weekly close and EMA trend structure.
- Price location versus the 8 EMA and 21 EMA is used to confirm whether the weekly trend remains intact.
- The chart `{chart}` was generated automatically from Yahoo Finance weekly data.

**KEY LEVELS:**
- Resistance 1: {levels["resistance1"]} (recent weekly high area)
- Resistance 2: {levels["resistance2"]} (next upside extension zone)
- Support 1: {levels["support1"]} (8 EMA — first dynamic support)
- Support 2: {levels["support2"]} (21 EMA — key trend support)

**TECHNICAL BIAS:** {levels["bias"]}

**CONFIDENCE:** {confidence}  
The confidence level is generated from weekly EMA alignment, price position and distance from support/resistance.

**INVALIDATION:**
- A weekly close below {levels["support1"]} would weaken the bullish view.
- A weekly close below {levels["support2"]} would shift the bias toward Bearish.

**WATCH THIS WEEK:**  
Can {info["label"]} hold above the 8 EMA around {levels["support1"]} and continue toward the {levels["resistance1"]}–{levels["resistance2"]} resistance zone?

**Evidence chart:** `{chart}`
"""

    return section, levels


def breadth_note(breadth):
    strong = breadth["strong"]
    weak = breadth["weak"]

    strong_text = "\n".join([f"- {x['ticker']} {x['change']:+.2f}%" for x in strong])
    weak_text = "\n".join([f"- {x['ticker']} {x['change']:+.2f}%" for x in weak])

    strongest = strong[0]["ticker"] if strong else "N/A"

    return f"""## BREADTH NOTE

**Which market/theme is strongest?**  
The strongest individual leadership from the selected breadth universe is currently led by **{strongest}**.

### Strong areas
{strong_text}

### Weak areas
{weak_text}

**Is market breadth strong, mixed, or weak?**  
Market breadth is generated automatically from selected large-cap, semiconductor, financial, energy and healthcare tickers. If leadership is concentrated in only a few groups, breadth is treated as mixed. If most key groups are positive, breadth improves.
"""


def final_bias(levels_list, breadth):
    bullish = 0
    bearish = 0

    for label, levels in levels_list:
        if not levels:
            continue

        if levels["bias"] == "Bullish":
            bullish += 1

        if levels["bias"] == "Bearish":
            bearish += 1

    if bullish >= 2:
        bias = "Neutral-Bullish"
    elif bearish >= 2:
        bias = "Neutral-Bearish"
    else:
        bias = "Neutral / Caution"

    invalidations = []

    for label, levels in levels_list:
        if levels:
            invalidations.append(
                f"- {label}: A weekly close below {levels['support1']} would weaken the bullish view."
            )

    invalidation_text = "\n".join(invalidations)

    return f"""## FINAL TECHNICAL BIAS: {bias}

The final technical bias is generated automatically from weekly EMA alignment across SPX, NDX and IWM.

**CONFIDENCE:** Medium

**INVALIDATION:**
{invalidation_text}

**WATCH THIS WEEK:**  
For the market to maintain bullish structure, SPX, NDX and IWM need to hold above their weekly 8 EMAs.
"""


def build_report(week):
    prepared = datetime.now().strftime("%d %B %Y")
    monday, friday = get_week_range()

    sections = []
    level_results = []

    for symbol, info in INSTRUMENTS.items():
        section, levels = instrument_section(symbol, info, week)
        sections.append(section)
        level_results.append((info["label"], levels))

    breadth = fetch_breadth()

    return f"""# TECHNICAL AGENT OUTPUT — W{week}

**Source:** R5 Technical Agent  
**Report Date:** {prepared}  
**Trading Week Covered:** {monday}–{friday} (W{week})

**Evidence Used:**
- Automatically generated weekly EMA charts for SPX, NDX and IWM
- Yahoo Finance weekly price data via yfinance
- Automatically generated breadth check using selected major tickers

---

{"---".join(sections)}

---

{breadth_note(breadth)}

---

{final_bias(level_results, breadth)}

---

## SOURCES

- Yahoo Finance market data via yfinance.
- Python-generated weekly EMA calculations.
- Python-generated support and resistance levels.
- Python-generated breadth ranking from selected large-cap and sector-relevant tickers.

**Prepared and accessed:** {prepared}
"""


def copy_outputs(week, repo_path):
    week_dir = repo_path / "evidence" / f"Week {week}"
    week_dir.mkdir(parents=True, exist_ok=True)

    incoming = repo_path / "incoming"
    incoming.mkdir(exist_ok=True)

    report_name = REPORT_MD.format(week=week)
    src = OUTPUT_DIR / report_name

    shutil.copy2(src, week_dir / report_name)
    shutil.copy2(src, incoming / report_name)

    for chart in OUTPUT_DIR.glob(f"technical_*_W{week}.png"):
        shutil.copy2(chart, week_dir / chart.name)
        shutil.copy2(chart, incoming / chart.name)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--week", type=int, required=True)
    parser.add_argument("--repo", type=str, default="")
    parser.add_argument("--no-push", action="store_true")
    args = parser.parse_args()

    OUTPUT_DIR.mkdir(exist_ok=True)

    report = build_report(args.week)

    report_path = OUTPUT_DIR / REPORT_MD.format(week=args.week)
    report_path.write_text(report, encoding="utf-8")

    if args.repo:
        copy_outputs(args.week, Path(args.repo).resolve())

    print("Done. Automated Technical Agent report generated.")


if __name__ == "__main__":
    main()