#!/usr/bin/env python3

import argparse
import shutil
import requests
from datetime import datetime, date, timedelta
from pathlib import Path

import yfinance as yf


SCRIPTS_DIR = Path(__file__).parent
OUTPUT_DIR = SCRIPTS_DIR / "output"
REPORT_MD = "almanac_agent_2026-W{week}.md"

HEADERS = {
    "User-Agent": "Mozilla/5.0",
    "Accept": "application/json, text/plain, */*",
    "Origin": "https://www.nasdaq.com",
    "Referer": "https://www.nasdaq.com/",
}

MARKETS = {
    "Nasdaq 100": "^NDX",
    "Russell 2000": "^RUT",
    "S&P 500": "^GSPC",
    "Dow Jones": "^DJI",
    "VIX": "^VIX",
    "WTI Crude Oil": "CL=F",
    "Brent Crude Oil": "BZ=F",
    "Gold": "GC=F",
    "U.S. Dollar": "DX-Y.NYB",
}

SECTORS = {
    "Technology": "XLK",
    "Financials": "XLF",
    "Healthcare": "XLV",
    "Energy": "XLE",
    "Industrials": "XLI",
    "Utilities": "XLU",
    "Real Estate": "XLRE",
    "Materials": "XLB",
    "Consumer Discretionary": "XLY",
    "Consumer Staples": "XLP",
    "Communication Services": "XLC",
}

BREADTH_TICKERS = [
    "NVDA", "AMD", "AVGO", "INTC", "MU",
    "MSFT", "AAPL", "META", "AMZN", "GOOGL",
    "JPM", "BAC", "XOM", "CVX", "LLY", "JNJ",
    "CAT", "GE", "ADBE", "NOW"
]


def get_week_dates():
    today = date.today()
    monday = today - timedelta(days=today.weekday())
    friday = monday + timedelta(days=4)
    return monday, friday


def fetch_return(symbol, period="7d"):
    try:
        data = yf.Ticker(symbol).history(period=period, interval="1d", auto_adjust=False)
        data = data.dropna(subset=["Close"])

        if len(data) < 2:
            return None

        start = float(data["Close"].iloc[0])
        end = float(data["Close"].iloc[-1])
        pct = ((end - start) / start) * 100

        return {
            "start": round(start, 2),
            "end": round(end, 2),
            "change": round(pct, 2),
        }

    except Exception as e:
        print(f"Failed to fetch {symbol}: {e}")
        return None


def fetch_market_performance():
    rows = []

    for name, symbol in MARKETS.items():
        result = fetch_return(symbol)

        if result:
            rows.append({
                "name": name,
                "symbol": symbol,
                **result
            })

    return rows


def fetch_sector_snapshot():
    rows = []

    for name, symbol in SECTORS.items():
        result = fetch_return(symbol, period="5d")

        if result:
            rows.append({
                "sector": name,
                "symbol": symbol,
                "day_return": result["change"],
            })

    return sorted(rows, key=lambda x: x["day_return"], reverse=True)


def fetch_weekly_breadth():
    rows = []

    for ticker in BREADTH_TICKERS:
        result = fetch_return(ticker)

        if result:
            rows.append({
                "ticker": ticker,
                "change": result["change"],
            })

    rows = sorted(rows, key=lambda x: x["change"], reverse=True)

    return {
        "strong": rows[:8],
        "weak": rows[-8:],
    }


def fetch_economic_calendar():
    monday, friday = get_week_dates()
    events = []

    current = monday
    while current <= friday:
        url = f"https://api.nasdaq.com/api/calendar/economicevents?date={current}"

        try:
            r = requests.get(url, headers=HEADERS, timeout=30)
            r.raise_for_status()
            data = r.json()

            for row in data.get("data", {}).get("rows", []):
                event = row.get("eventName", "N/A")

                if event != "N/A":
                    events.append({
                        "date": str(current),
                        "event": event,
                        "forecast": row.get("forecast", "N/A"),
                        "previous": row.get("previous", "N/A"),
                    })

        except Exception as e:
            print(f"Economic calendar failed for {current}: {e}")

        current += timedelta(days=1)

    return events[:12]


def detect_almanac_pattern():
    today = date.today()
    month = today.month
    day = today.day

    patterns = []

    if month == 6 and day >= 15:
        patterns.append({
            "pattern": "Week after June Triple Witching / late-June positioning",
            "signal": "Bearish / High-Volatility",
            "strength": "High",
            "score": -2,
        })

    if month == 7 and day <= 10:
        patterns.append({
            "pattern": "Early July after quarter-end flows",
            "signal": "Bullish offset",
            "strength": "Moderate",
            "score": 1,
        })

    if month == 9:
        patterns.append({
            "pattern": "September seasonal weakness",
            "signal": "Bearish",
            "strength": "High",
            "score": -2,
        })

    if month == 11:
        patterns.append({
            "pattern": "Start of stronger year-end seasonal period",
            "signal": "Bullish",
            "strength": "Moderate",
            "score": 1,
        })

    if month == 12:
        patterns.append({
            "pattern": "December / Santa Rally seasonal window",
            "signal": "Bullish",
            "strength": "Moderate",
            "score": 1,
        })

    if not patterns:
        patterns.append({
            "pattern": "No major special almanac pattern detected",
            "signal": "Neutral",
            "strength": "Low",
            "score": 0,
        })

    return patterns


def value(rows, name):
    for r in rows:
        if r["name"] == name:
            return r["change"]
    return 0


def calculate_final_bias(markets, sectors, patterns):
    score = 0
    reasons = []

    spx = value(markets, "S&P 500")
    ndx = value(markets, "Nasdaq 100")
    rut = value(markets, "Russell 2000")
    vix = value(markets, "VIX")

    if spx > 0:
        score += 1
        reasons.append(f"S&P 500 gained {spx:+.2f}%, supporting risk appetite.")
    else:
        score -= 1
        reasons.append(f"S&P 500 fell {spx:+.2f}%, showing weaker broad-market tone.")

    if ndx > 0:
        score += 1
        reasons.append(f"Nasdaq 100 gained {ndx:+.2f}%, showing growth/tech strength.")
    else:
        score -= 1
        reasons.append(f"Nasdaq 100 fell {ndx:+.2f}%, reducing tech confidence.")

    if rut > 0:
        score += 1
        reasons.append(f"Russell 2000 gained {rut:+.2f}%, showing small-cap participation.")
    else:
        score -= 1
        reasons.append(f"Russell 2000 fell {rut:+.2f}%, showing weak small-cap participation.")

    if vix < 0:
        score += 1
        reasons.append(f"VIX fell {vix:+.2f}%, supporting a calmer volatility environment.")
    else:
        score -= 1
        reasons.append(f"VIX rose {vix:+.2f}%, warning of higher volatility.")

    for p in patterns:
        score += p["score"]
        reasons.append(f"Almanac pattern: {p['pattern']} gives a {p['signal']} signal.")

    if score >= 3:
        bias = "Bullish"
    elif score <= -2:
        bias = "Cautiously Bearish / High-Volatility"
    else:
        bias = "Neutral / Mixed"

    return {
        "bias": bias,
        "score": score,
        "confidence": "Medium",
        "reasons": reasons,
        "primary": reasons[0] if reasons else "Mixed signals",
    }


def table_market(markets):
    lines = [
        "## 1. FRESH ONE-WEEK MARKET PERFORMANCE",
        "*(Automated via Yahoo Finance / yfinance)*",
        "",
        "| Market / Asset | 1-Week Change | R3 Reading |",
        "|---|---:|---|",
    ]

    for r in markets:
        reading = "Positive" if r["change"] > 0 else "Negative"
        if r["name"] == "VIX":
            reading = "Lower fear" if r["change"] < 0 else "Higher fear"
        lines.append(f"| {r['name']} | {r['change']:+.2f}% | {reading} |")

    return "\n".join(lines)


def table_sectors(sectors):
    lines = [
        "## 2. LATEST SECTOR SNAPSHOT",
        "*(Automated via Yahoo Finance sector ETFs; values use recent ETF returns.)*",
        "",
        "| Sector | Return | Immediate Signal |",
        "|---|---:|---|",
    ]

    for r in sectors:
        signal = "Positive" if r["day_return"] > 0 else "Negative"
        lines.append(f"| {r['sector']} | {r['day_return']:+.2f}% | {signal} |")

    return "\n".join(lines)


def section_breadth(breadth):
    lines = [
        "## 3. WEEKLY BREADTH CHECK",
        "*(Automated using selected major stock returns from Yahoo Finance)*",
        "",
        "### Strong areas",
    ]

    for r in breadth["strong"]:
        lines.append(f"- {r['ticker']} {r['change']:+.2f}%")

    lines.append("")
    lines.append("### Weak areas")

    for r in breadth["weak"]:
        lines.append(f"- {r['ticker']} {r['change']:+.2f}%")

    return "\n".join(lines)


def section_patterns(patterns):
    lines = [
        "## 4. MAIN ALMANAC PATTERN",
        "",
        "| Pattern | Signal | Strength |",
        "|---|---|---|",
    ]

    for p in patterns:
        lines.append(f"| {p['pattern']} | {p['signal']} | {p['strength']} |")

    return "\n".join(lines)


def section_calendar(events):
    lines = [
        "## 5. UPCOMING CALENDAR AND STRUCTURAL EVENTS",
        "*(Automated via Nasdaq economic calendar API)*",
        "",
        "| Date | Event | Forecast | Previous |",
        "|---|---|---|---|",
    ]

    if not events:
        lines.append("| N/A | No calendar events fetched | N/A | N/A |")
    else:
        for e in events:
            lines.append(f"| {e['date']} | {e['event']} | {e['forecast']} | {e['previous']} |")

    return "\n".join(lines)


def section_implications(markets, sectors):
    spx = value(markets, "S&P 500")
    ndx = value(markets, "Nasdaq 100")
    rut = value(markets, "Russell 2000")

    strongest_sector = sectors[0]["sector"] if sectors else "N/A"
    weakest_sector = sectors[-1]["sector"] if sectors else "N/A"

    return f"""## 6. INDEX AND SECTOR IMPLICATIONS

### S&P 500
- Latest weekly change: {spx:+.2f}%.
- R3 view is generated from broad-market momentum and almanac pattern.

### Nasdaq / NDX
- Latest weekly change: {ndx:+.2f}%.
- Relative strength is assessed from Nasdaq performance versus other indexes.

### Russell 2000 / IWM
- Latest weekly change: {rut:+.2f}%.
- Small-cap participation is used as a risk appetite signal.

### Sector Summary
- Strongest latest sector: {strongest_sector}
- Weakest latest sector: {weakest_sector}
"""


def section_final(result):
    reasons = "\n".join([f"- {r}" for r in result["reasons"]])

    return f"""## 7. FINAL R3 OUTPUT

**ALMANAC BIAS:** {result["bias"]}

**CONFIDENCE:** {result["confidence"]}

**MAIN THESIS:**
> The Almanac Agent combines live index momentum, volatility, sector returns, weekly breadth, current-week calendar events and date-based seasonal patterns. The final bias is generated automatically from the scoring model.

**AUTOMATED REASONS:**

{reasons}

**INVALIDATION:**
> The view would weaken if market momentum, volatility, or sector leadership moves strongly against the current signal.
"""


def build_report(week):
    prepared = datetime.now().strftime("%d %b %Y")
    monday, friday = get_week_dates()

    markets = fetch_market_performance()
    sectors = fetch_sector_snapshot()
    breadth = fetch_weekly_breadth()
    patterns = detect_almanac_pattern()
    calendar = fetch_economic_calendar()
    result = calculate_final_bias(markets, sectors, patterns)

    return f"""# R3 Almanac Agent Output
## Forecast for the Week of {monday.strftime('%d %B %Y')} — W{week}

**Prepared on:** {prepared}  
**Fresh market data collected:** {datetime.now().strftime('%d %B %Y, %I:%M %p')}  
**Completed market period used:** Latest available 1-week market data  
**Forecast period:** {monday} to {friday}  

> This report is fully generated by the automated R3 Almanac Agent.

---

{table_market(markets)}

---

{table_sectors(sectors)}

---

{section_breadth(breadth)}

---

{section_patterns(patterns)}

---

{section_calendar(calendar)}

---

{section_implications(markets, sectors)}

---

{section_final(result)}

---

## SOURCES

- Yahoo Finance via yfinance for index, commodity, currency, sector and stock performance.
- Nasdaq economic calendar API for current-week calendar events.
- Built-in Almanac rule engine for seasonal patterns.
- Python scoring model for final R3 bias.

**Prepared and accessed:** {prepared}
"""


def copy_outputs(week, repo_path):
    week_dir = repo_path / "evidence" / f"Week {week}"
    week_dir.mkdir(parents=True, exist_ok=True)

    name = REPORT_MD.format(week=week)
    src = OUTPUT_DIR / name

    shutil.copy2(src, week_dir / name)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--week", type=int, required=True)
    parser.add_argument("--repo", type=str, default="")
    parser.add_argument("--no-push", action="store_true")
    args = parser.parse_args()

    OUTPUT_DIR.mkdir(exist_ok=True)

    report = build_report(args.week)
    path = OUTPUT_DIR / REPORT_MD.format(week=args.week)
    path.write_text(report, encoding="utf-8")

    if args.repo:
        copy_outputs(args.week, Path(args.repo).resolve())

    print("Done. Fully automated Almanac Agent report generated.")


if __name__ == "__main__":
    main()