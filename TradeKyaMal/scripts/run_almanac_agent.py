#!/usr/bin/env python3

import argparse
import shutil
from datetime import datetime, date, timedelta
from pathlib import Path

import yfinance as yf


SCRIPTS_DIR = Path(__file__).parent
OUTPUT_DIR = SCRIPTS_DIR / "output"

REPORT_MD = "almanac_agent_2026-W{week}.md"


MARKETS = {
    "^GSPC": "S&P 500",
    "^IXIC": "Nasdaq Composite",
    "^RUT": "Russell 2000",
    "^DJI": "Dow Jones",
    "^VIX": "VIX",
    "CL=F": "WTI Crude Oil",
    "GC=F": "Gold",
    "DX-Y.NYB": "U.S. Dollar Index",
}


def get_week_dates():
    today = date.today()
    monday = today - timedelta(days=today.weekday())
    friday = monday + timedelta(days=4)
    return monday, friday


def fetch_weekly_performance():
    rows = []

    for symbol, name in MARKETS.items():
        try:
            ticker = yf.Ticker(symbol)
            data = ticker.history(period="1mo", interval="1d", auto_adjust=False)

            if data.empty or len(data) < 2:
                print(f"No data for {symbol}")
                continue

            data = data.dropna(subset=["Close"])

            if len(data) < 2:
                print(f"Not enough clean data for {symbol}")
                continue

            start_index = -6 if len(data) >= 6 else 0

            start_price = float(data["Close"].iloc[start_index])
            end_price = float(data["Close"].iloc[-1])
            change_pct = ((end_price - start_price) / start_price) * 100

            rows.append({
                "symbol": symbol,
                "name": name,
                "start_price": round(start_price, 2),
                "end_price": round(end_price, 2),
                "change_pct": round(change_pct, 2),
            })

        except Exception as e:
            print(f"Failed to fetch {symbol}: {e}")

    return rows


def detect_almanac_patterns():
    today = date.today()
    month = today.month
    day = today.day

    patterns = []

    if month == 1:
        patterns.append("January often sets early-year market tone.")
    if month == 4:
        patterns.append("April is historically one of the stronger months for U.S. equities.")
    if month == 6 and day >= 15:
        patterns.append("Late June may be affected by Triple Witching and Russell reconstitution effects.")
    if month == 7:
        patterns.append("Early July often has positive seasonal tendencies after quarter-end flows.")
    if month == 9:
        patterns.append("September is historically one of the weaker months for equities.")
    if month == 10:
        patterns.append("October can bring higher volatility, but also important market turning points.")
    if month == 11:
        patterns.append("November often begins a stronger seasonal period for equities.")
    if month == 12:
        patterns.append("December may benefit from year-end flows and Santa Rally seasonality.")

    if not patterns:
        patterns.append("No major special seasonal pattern detected this week.")

    return patterns


def get_change(rows, market_name):
    for row in rows:
        if row["name"] == market_name:
            return row["change_pct"]
    return None


def calculate_almanac_bias(rows, patterns):
    score = 0
    reasons = []

    spx = get_change(rows, "S&P 500")
    nasdaq = get_change(rows, "Nasdaq Composite")
    rut = get_change(rows, "Russell 2000")
    vix = get_change(rows, "VIX")

    if spx is not None:
        if spx >= 0:
            score += 1
            reasons.append(f"S&P 500 gained {spx:+.2f}% over the latest data window.")
        else:
            score -= 1
            reasons.append(f"S&P 500 declined {spx:+.2f}% over the latest data window.")

    if nasdaq is not None:
        if nasdaq >= 0:
            score += 1
            reasons.append(f"Nasdaq gained {nasdaq:+.2f}%, supporting growth-stock momentum.")
        else:
            score -= 1
            reasons.append(f"Nasdaq declined {nasdaq:+.2f}%, showing weaker growth-stock momentum.")

    if rut is not None:
        if rut >= 0:
            score += 1
            reasons.append(f"Russell 2000 gained {rut:+.2f}%, showing small-cap participation.")
        else:
            score -= 1
            reasons.append(f"Russell 2000 declined {rut:+.2f}%, showing weaker small-cap participation.")

    if vix is not None:
        if vix <= 0:
            score += 1
            reasons.append(f"VIX fell {vix:+.2f}%, suggesting calmer short-term volatility.")
        else:
            score -= 1
            reasons.append(f"VIX rose {vix:+.2f}%, suggesting higher short-term volatility.")

    pattern_text = " ".join(patterns).lower()

    if "stronger" in pattern_text or "positive" in pattern_text or "santa" in pattern_text:
        score += 1
        reasons.append("Seasonal pattern is supportive.")

    if "weaker" in pattern_text or "volatility" in pattern_text or "triple witching" in pattern_text:
        score -= 1
        reasons.append("Seasonal pattern warns of weakness or volatility.")

    if not rows:
        score = 0
        reasons.append("Market data was not available, so the almanac signal is based only on seasonal rules.")

    if score >= 3:
        bias = "Bullish"
    elif score <= -2:
        bias = "Bearish / High-Volatility"
    else:
        bias = "Neutral / Mixed"

    return {
        "bias": bias,
        "score": score,
        "confidence": "Medium" if rows else "Low",
        "reasons": reasons,
        "primary_driver": reasons[0] if reasons else "Mixed seasonal and market signals",
    }


def build_market_table(rows):
    lines = [
        "## 1. Latest Market Performance",
        "",
        "| Market / Asset | Start Price | End Price | Change % |",
        "|---|---:|---:|---:|",
    ]

    if not rows:
        lines.append("| N/A | N/A | N/A | No market data fetched |")
    else:
        for row in rows:
            lines.append(
                f"| {row['name']} | {row['start_price']} | {row['end_price']} | {row['change_pct']:+.2f}% |"
            )

    return "\n".join(lines)


def build_patterns_section(patterns):
    lines = [
        "## 2. Almanac / Seasonal Pattern",
        "",
    ]

    for pattern in patterns:
        lines.append(f"- {pattern}")

    return "\n".join(lines)


def build_bias_section(result):
    reasons = "\n".join([f"- {r}" for r in result["reasons"]])

    return f"""## 3. Final Almanac Signal

**ALMANAC BIAS:** {result["bias"]}

**PRIMARY DRIVER:** {result["primary_driver"]}

**CONFIDENCE:** {result["confidence"]}

**Reasons:**

{reasons}

**Invalidation:**
The almanac view may change if index momentum, VIX, or small-cap participation moves strongly against the current signal.
"""


def build_almanac_report(week):
    stamp = datetime.now().strftime("%d %b %Y")
    monday, friday = get_week_dates()

    rows = fetch_weekly_performance()
    patterns = detect_almanac_patterns()
    result = calculate_almanac_bias(rows, patterns)

    return f"""# R3 Almanac Agent Output
## Forecast for Week {week}

**Prepared on:** {stamp}  
**Forecast period:** {monday} to {friday}  
**Data source:** Yahoo Finance via yfinance  

---

{build_market_table(rows)}

---

{build_patterns_section(patterns)}

---

{build_bias_section(result)}

---

## Sources

- Yahoo Finance market data via yfinance.
- Built-in seasonal market rules based on common U.S. equity market almanac patterns.
"""


def copy_almanac_evidence(week, repo_path):
    week_dir = repo_path / "evidence" / f"Week {week}"
    week_dir.mkdir(parents=True, exist_ok=True)

    report_name = REPORT_MD.format(week=week)
    src = OUTPUT_DIR / report_name
    dst = week_dir / report_name

    shutil.copy2(src, dst)

    incoming = repo_path / "incoming"
    incoming.mkdir(exist_ok=True)
    shutil.copy2(src, incoming / report_name)

    return dst


def main():
    parser = argparse.ArgumentParser(description="Almanac Agent live automation")
    parser.add_argument("--week", type=int, required=True)
    parser.add_argument("--repo", type=str, default="")
    parser.add_argument("--no-push", action="store_true")
    args = parser.parse_args()

    OUTPUT_DIR.mkdir(exist_ok=True)

    print("=== Step 1: Fetch market performance from Yahoo Finance ===")
    report = build_almanac_report(args.week)

    report_path = OUTPUT_DIR / REPORT_MD.format(week=args.week)
    report_path.write_text(report, encoding="utf-8")

    print("=== Step 2: Almanac report created ===")
    print(f"  {report_path.name}")

    if args.repo:
        repo_path = Path(args.repo).resolve()
        print(f"=== Step 3: Copy to {repo_path} ===")
        copy_almanac_evidence(args.week, repo_path)

    print("\nDone. Almanac Agent report generated.")


if __name__ == "__main__":
    main()