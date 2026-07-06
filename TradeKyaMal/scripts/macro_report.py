"""
Macro Agent report builder — shared by run_macro_agent.py and run_weekly_fetch.py.

Generates macro_agent_data_W{week}.md for evidence/Week X/ in the group repo.
Macro Lead fills in Fed rates, calendar, earnings, news, and bias after the script runs.
"""

"""
Macro Agent report builder.
Auto-fills:
- Current Fed rate
- Next FOMC date
- Macro bias
"""

from datetime import datetime, date
import csv
import io
import requests

MACRO_COMMODITIES = {"CL": "WTI Crude Oil", "GC": "Gold", "DX": "DXY (Dollar)"}


def fetch_current_fed_rate():
    """
    Fetches Effective Federal Funds Rate from FRED CSV.
    No API key needed.
    """
    url = "https://fred.stlouisfed.org/graph/fredgraph.csv?id=FEDFUNDS"

    try:
        response = requests.get(url, timeout=20)
        response.raise_for_status()

        rows = list(csv.DictReader(io.StringIO(response.text)))
        latest = rows[-1]

        return {
            "rate": latest["FEDFUNDS"],
            "date": latest["observation_date"]
        }

    except Exception:
        return {
            "rate": "N/A",
            "date": "N/A"
        }


def get_next_fomc_date():
    """
    Manual official FOMC 2026 dates.
    Update once per year.
    """
    fomc_dates = [
        "2026-01-28",
        "2026-03-18",
        "2026-04-29",
        "2026-06-17",
        "2026-07-29",
        "2026-09-16",
        "2026-11-04",
        "2026-12-16",
    ]

    today = date.today()

    for d in fomc_dates:
        fomc_day = datetime.strptime(d, "%Y-%m-%d").date()
        if fomc_day >= today:
            return d

    return "No remaining 2026 FOMC date"


def calculate_macro_bias(finviz_rows, sectors):
    """
    Simple rule-based Macro Bias.
    Uses market, oil, dollar, gold, and technology sector.
    """

    by_ticker = {r["ticker"]: r for r in finviz_rows}
    by_sector = {s["symbol"]: s for s in sectors}

    score = 0
    reasons = []

    sp500 = by_ticker.get("ES", {}).get("perf_pct", 0)
    nasdaq = by_ticker.get("NQ", {}).get("perf_pct", 0)
    russell = by_ticker.get("ER2", {}).get("perf_pct", 0)
    oil = by_ticker.get("CL", {}).get("perf_pct", 0)
    dollar = by_ticker.get("DX", {}).get("perf_pct", 0)
    gold = by_ticker.get("GC", {}).get("perf_pct", 0)
    tech = by_sector.get("XLK", {}).get("day_return_pct", 0)

    if sp500 > 0:
        score += 1
        reasons.append("S&P 500 futures positive")
    else:
        score -= 1
        reasons.append("S&P 500 futures weak")

    if nasdaq > 0:
        score += 1
        reasons.append("Nasdaq futures positive")
    else:
        score -= 1
        reasons.append("Nasdaq futures weak")

    if russell > 0:
        score += 1
        reasons.append("Small caps positive")
    else:
        score -= 1
        reasons.append("Small caps weak")

    if oil < 0:
        score += 1
        reasons.append("Oil falling, inflation pressure easing")
    else:
        score -= 1
        reasons.append("Oil rising, inflation pressure higher")

    if dollar < 0:
        score += 1
        reasons.append("Dollar falling, supportive for risk assets")
    else:
        score -= 1
        reasons.append("Dollar rising, pressure on risk assets")

    if gold > 0:
        score -= 1
        reasons.append("Gold rising, defensive demand present")

    if tech > 0:
        score += 1
        reasons.append("Technology sector positive")
    else:
        score -= 1
        reasons.append("Technology sector weak")

    if score >= 3:
        bias = "Neutral-Bullish"
        confidence = "Medium"
    elif score <= -2:
        bias = "Cautious"
        confidence = "Medium"
    else:
        bias = "Neutral"
        confidence = "Medium"

    primary_driver = reasons[0] if reasons else "Mixed macro signals"

    return {
        "bias": bias,
        "confidence": confidence,
        "primary_driver": primary_driver,
        "reasons": reasons,
        "score": score
    }


def build_finviz_markdown(rows):
    lines = [
        "## Finviz Futures Performance (1W)",
        "",
        "| Ticker | Name | Group | Weekly % |",
        "|--------|------|-------|----------|",
    ]

    for row in sorted(rows, key=lambda r: r["perf_pct"], reverse=True):
        lines.append(
            f"| {row['ticker']} | {row['label']} | {row['group']} | {row['perf_pct']:+.2f}% |"
        )

    lines.append("")
    lines.append(
        f"*Fetched: {rows[0]['fetched_at'] if rows else 'N/A'} from finviz.com/futures_performance*"
    )

    return "\n".join(lines)


def build_commodities_section(rows):
    lines = ["## Commodities & Dollar (Finviz Futures 1W)", ""]
    by_ticker = {r["ticker"]: r for r in rows}

    for ticker, name in MACRO_COMMODITIES.items():
        row = by_ticker.get(ticker)

        if row:
            direction = (
                "Rising"
                if row["perf_pct"] > 0
                else "Falling"
                if row["perf_pct"] < 0
                else "Flat"
            )

            lines.append(
                f"- **{name}**: weekly change {row['perf_pct']:+.2f}%, direction: {direction}"
            )
        else:
            lines.append(f"- **{name}**: not found in this week's fetch")

    return "\n".join(lines)


def build_sectors_markdown(sectors):
    lines = [
        "## Yahoo Finance Sectors (5D via yfinance)",
        "",
        "| ETF | Sector | Price | Day Return % |",
        "|-----|--------|-------|--------------|",
    ]

    for row in sorted(sectors, key=lambda s: s["day_return_pct"], reverse=True):
        sign = "+" if row["day_return_pct"] >= 0 else ""
        lines.append(
            f"| {row['symbol']} | {row['name']} | {row['price']} | {sign}{row['day_return_pct']}% |"
        )

    lines.append("")
    lines.append(f"*Fetched: {sectors[0]['fetched_at'] if sectors else 'N/A'} via yfinance*")

    return "\n".join(lines)


def build_macro_report(week, finviz_rows, sectors, source="macro_agent_script"):
    stamp = datetime.now().strftime("%d %b %Y")

    fed = fetch_current_fed_rate()
    next_fomc = get_next_fomc_date()
    macro = calculate_macro_bias(finviz_rows, sectors)

    commodities = build_commodities_section(finviz_rows)

    reasons_text = "\n".join([f"- {reason}" for reason in macro["reasons"]])

    return f"""# MACRO AGENT DATA FETCH — WEEK {week} — SOURCE: R4 ({source})

*Auto-generated by TradeKyaMal Macro Agent script on {stamp}.*

{commodities}

## Fed & Rates

- Current Fed rate: {fed["rate"]}% as of {fed["date"]}
- Next FOMC date: {next_fomc}
- Implication: Macro conditions are assessed using Fed rate direction, futures performance, oil, dollar, gold, and sector strength.

## Macro Signal Reasons

{reasons_text}

## MACRO BIAS: {macro["bias"]}
## PRIMARY DRIVER: {macro["primary_driver"]}
## CONFIDENCE: {macro["confidence"]}
## INVALIDATION: Bias may change if inflation, Fed expectations, oil prices, or equity futures move strongly in the opposite direction.

---

{build_finviz_markdown(finviz_rows)}

---

{build_sectors_markdown(sectors)}

Sources accessed: {stamp}. Finviz, yfinance, FRED, and FOMC calendar logic used by Macro Agent script.
"""