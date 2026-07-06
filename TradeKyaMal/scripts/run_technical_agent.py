#!/usr/bin/env python3

import argparse
import shutil
from datetime import datetime
from pathlib import Path

import yfinance as yf
import matplotlib.pyplot as plt


SCRIPTS_DIR = Path(__file__).parent
OUTPUT_DIR = SCRIPTS_DIR / "output"

REPORT_MD = "technical_agent_2026-W{week}.md"

MARKETS = {
    "^GSPC": "S&P 500",
    "^IXIC": "Nasdaq Composite",
    "^RUT": "Russell 2000",
}


def fetch_price_data(symbol):
    data = yf.Ticker(symbol).history(period="3mo", interval="1d", auto_adjust=False)

    if data.empty:
        return None

    data = data.dropna(subset=["Close"])
    data["EMA8"] = data["Close"].ewm(span=8, adjust=False).mean()
    data["EMA21"] = data["Close"].ewm(span=21, adjust=False).mean()

    return data


def calculate_signal(data):
    latest = data.iloc[-1]

    close = float(latest["Close"])
    ema8 = float(latest["EMA8"])
    ema21 = float(latest["EMA21"])

    if close > ema8 and ema8 > ema21:
        zone = "Bullish"
        bias = "Bullish"
        reason = "Price is above 8 EMA and 8 EMA is above 21 EMA."
    elif close < ema8 and ema8 < ema21:
        zone = "Bearish"
        bias = "Bearish"
        reason = "Price is below 8 EMA and 8 EMA is below 21 EMA."
    else:
        zone = "Caution"
        bias = "Neutral / Caution"
        reason = "EMA structure is mixed, so trend confirmation is weaker."

    recent_high = float(data["Close"].tail(20).max())
    recent_low = float(data["Close"].tail(20).min())

    return {
        "close": round(close, 2),
        "ema8": round(ema8, 2),
        "ema21": round(ema21, 2),
        "zone": zone,
        "bias": bias,
        "reason": reason,
        "resistance": round(recent_high, 2),
        "support": round(recent_low, 2),
    }


def create_chart(symbol, name, data, week):
    filename = f"technical_{symbol.replace('^', '').replace('=', '')}_W{week}.png"
    path = OUTPUT_DIR / filename

    plt.figure(figsize=(10, 5))
    plt.plot(data.index, data["Close"], label="Close")
    plt.plot(data.index, data["EMA8"], label="8 EMA")
    plt.plot(data.index, data["EMA21"], label="21 EMA")
    plt.title(f"{name} Technical Chart")
    plt.xlabel("Date")
    plt.ylabel("Price")
    plt.legend()
    plt.tight_layout()
    plt.savefig(path)
    plt.close()

    return filename


def build_market_section(symbol, name, week):
    data = fetch_price_data(symbol)

    if data is None or data.empty:
        return f"""## {name}

No live price data fetched for {name}.
"""

    signal = calculate_signal(data)
    chart_file = create_chart(symbol, name, data, week)

    return f"""## {name}

| Item | Value |
|---|---:|
| Last Close | {signal["close"]} |
| 8 EMA | {signal["ema8"]} |
| 21 EMA | {signal["ema21"]} |
| Support | {signal["support"]} |
| Resistance | {signal["resistance"]} |

**Trend Zone:** {signal["zone"]}  
**Technical Bias:** {signal["bias"]}  
**Reason:** {signal["reason"]}

**Chart:** `{chart_file}`
"""


def build_overall_bias(sections_text):
    bullish = sections_text.count("Technical Bias: Bullish")
    bearish = sections_text.count("Technical Bias: Bearish")

    if bullish >= 2:
        return "Bullish"
    if bearish >= 2:
        return "Bearish"

    return "Neutral / Caution"


def build_technical_report(week):
    stamp = datetime.now().strftime("%d %b %Y")

    sections = []

    for symbol, name in MARKETS.items():
        sections.append(build_market_section(symbol, name, week))

    sections_text = "\n---\n\n".join(sections)
    overall_bias = build_overall_bias(sections_text)

    return f"""# R5 Technical Agent Output
## Forecast for Week {week}

**Prepared on:** {stamp}  
**Data source:** Yahoo Finance via yfinance  
**Indicators used:** 8 EMA, 21 EMA, support, resistance  

---

{sections_text}

---

## Final Technical Conclusion

**TECHNICAL BIAS:** {overall_bias}

**PRIMARY DRIVER:** EMA structure across S&P 500, Nasdaq Composite, and Russell 2000.

**CONFIDENCE:** Medium

**Invalidation:**
The technical view may change if price breaks below support, rejects resistance, or EMA structure reverses.

---

## Sources

- Yahoo Finance market data via yfinance.
- Technical calculations generated automatically using Python.
"""


def copy_technical_evidence(week, repo_path):
    week_dir = repo_path / "evidence" / f"Week {week}"
    week_dir.mkdir(parents=True, exist_ok=True)

    incoming = repo_path / "incoming"
    incoming.mkdir(exist_ok=True)

    report_name = REPORT_MD.format(week=week)
    report_src = OUTPUT_DIR / report_name

    shutil.copy2(report_src, week_dir / report_name)
    shutil.copy2(report_src, incoming / report_name)

    for chart in OUTPUT_DIR.glob(f"technical_*_W{week}.png"):
        shutil.copy2(chart, week_dir / chart.name)
        shutil.copy2(chart, incoming / chart.name)


def main():
    parser = argparse.ArgumentParser(description="Technical Agent live automation")
    parser.add_argument("--week", type=int, required=True)
    parser.add_argument("--repo", type=str, default="")
    parser.add_argument("--no-push", action="store_true")
    args = parser.parse_args()

    OUTPUT_DIR.mkdir(exist_ok=True)

    print("=== Step 1: Fetch technical market data ===")
    report = build_technical_report(args.week)

    report_path = OUTPUT_DIR / REPORT_MD.format(week=args.week)
    report_path.write_text(report, encoding="utf-8")

    print("=== Step 2: Technical report created ===")
    print(f"  {report_path.name}")

    if args.repo:
        repo_path = Path(args.repo).resolve()
        print("=== Step 3: Copy report and charts ===")
        copy_technical_evidence(args.week, repo_path)

    print("\nDone. Technical Agent report generated.")


if __name__ == "__main__":
    main()