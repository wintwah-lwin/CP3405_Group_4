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
from datetime import datetime, date, timedelta
import csv, io, re, requests
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup

HEADERS = {"User-Agent": "Mozilla/5.0"}

MACRO_COMMODITIES = {
    "CL": "WTI Crude Oil",
    "GC": "Gold",
    "DX": "DXY Dollar Index",
}


def get_url(url, timeout=40):
    return requests.get(url, headers=HEADERS, timeout=timeout)


def fetch_fred_latest(series_id):
    url = f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={series_id}"

    try:
        response = get_url(url, timeout=40)
        response.raise_for_status()
        rows = list(csv.DictReader(io.StringIO(response.text)))

        for row in reversed(rows):
            value = row.get(series_id)
            date_value = row.get("DATE") or row.get("observation_date")
            if value and value != ".":
                return {"value": value, "date": date_value}

    except Exception as e:
        print(f"FRED fetch failed for {series_id}: {e}")

    return {"value": "N/A", "date": "N/A"}


def fetch_current_fed_rate():
    upper = fetch_fred_latest("DFEDTARU")
    lower = fetch_fred_latest("DFEDTARL")
    effective = fetch_fred_latest("FEDFUNDS")

    if upper["value"] != "N/A" and lower["value"] != "N/A":
        return {
            "value": f"{lower['value']}%–{upper['value']}%",
            "date": upper["date"],
        }

    return {
        "value": f"{effective['value']}%",
        "date": effective["date"],
    }


def fetch_treasury_yields():
    year = date.today().year

    urls = [
        (
            "https://home.treasury.gov/resource-center/data-chart-center/"
            f"interest-rates/pages/xml?data=daily_treasury_yield_curve&field_tdr_date_value={year}"
        ),
        (
            "https://home.treasury.gov/resource-center/data-chart-center/"
            f"interest-rates/pages/xml?data=daily_treasury_yield_curve&field_tdr_date_value={year - 1}"
        ),
    ]

    for url in urls:
        try:
            response = requests.get(url, headers=HEADERS, timeout=60)
            response.raise_for_status()

            text = response.text

            entries = re.findall(r"<entry>(.*?)</entry>", text, re.DOTALL)

            if not entries:
                entries = re.findall(r"<atom:entry>(.*?)</atom:entry>", text, re.DOTALL)

            for entry in reversed(entries):
                date_match = re.search(r"<d:NEW_DATE.*?>(.*?)</d:NEW_DATE>", entry)
                y2_match = re.search(r"<d:BC_2YEAR.*?>(.*?)</d:BC_2YEAR>", entry)
                y10_match = re.search(r"<d:BC_10YEAR.*?>(.*?)</d:BC_10YEAR>", entry)
                y30_match = re.search(r"<d:BC_30YEAR.*?>(.*?)</d:BC_30YEAR>", entry)

                if date_match and y2_match and y10_match and y30_match:
                    return {
                        "date": date_match.group(1)[:10],
                        "2y": y2_match.group(1),
                        "10y": y10_match.group(1),
                        "30y": y30_match.group(1),
                    }

        except Exception as e:
            print("Treasury yield fetch failed:", e)

    return {
        "date": "N/A",
        "2y": "N/A",
        "10y": "N/A",
        "30y": "N/A",
    }


def get_next_fomc_date():
    url = "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm"

    month_map = {
        "January": 1, "February": 2, "March": 3, "April": 4,
        "May": 5, "June": 6, "July": 7, "August": 8,
        "September": 9, "October": 10, "November": 11, "December": 12,
    }

    try:
        response = requests.get(url, headers=HEADERS, timeout=60)
        response.raise_for_status()

        soup = BeautifulSoup(response.text, "html.parser")

        current_year = date.today().year
        today = date.today()

        text_blocks = soup.find_all(["h3", "h4", "p", "td", "th", "li", "div"])

        dates = []

        for block in text_blocks:
            text = block.get_text(" ", strip=True)

            if "FOMC" not in text and "Meeting" not in text and "Statement" not in text:
                continue

            for month_name, month_num in month_map.items():
                pattern = rf"{month_name}\s+(\d{{1,2}})(?:[-–](\d{{1,2}}))?"
                for start_day, end_day in re.findall(pattern, text):
                    final_day = int(end_day) if end_day else int(start_day)

                    try:
                        meeting_date = date(current_year, month_num, final_day)
                        if meeting_date >= today:
                            dates.append(meeting_date)
                    except ValueError:
                        continue

        if dates:
            return sorted(dates)[0].strftime("%Y-%m-%d")

        return "N/A"

    except Exception as e:
        print("FOMC fetch failed:", e)
        return "N/A"


def build_rates_markdown():
    yields = fetch_treasury_yields()

    return f"""## Fed & Rates

| Rate / Yield | Value | Date |
|-------------|-------|------|
| 2-Year Treasury Yield | {yields['2y']}% | {yields['date']} |
| 10-Year Treasury Yield | {yields['10y']}% | {yields['date']} |
| 30-Year Treasury Yield | {yields['30y']}% | {yields['date']} |

*Source: U.S. Treasury Daily Treasury Yield Curve Rates*"""


def fetch_nasdaq_json(url):
    headers = {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json, text/plain, */*",
        "Origin": "https://www.nasdaq.com",
        "Referer": "https://www.nasdaq.com/",
    }

    try:
        response = requests.get(url, headers=headers, timeout=40)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print("Nasdaq fetch failed:", e)
        return None


def get_next_7_days():
    return [(date.today() + timedelta(days=i)).strftime("%Y-%m-%d") for i in range(7)]


def fetch_key_earnings():
    earnings = []

    for day in get_next_7_days():
        data = fetch_nasdaq_json(f"https://api.nasdaq.com/api/calendar/earnings?date={day}")

        try:
            for row in data["data"]["rows"][:8]:
                earnings.append({
                    "date": day,
                    "company": row.get("companyName", "N/A"),
                    "symbol": row.get("symbol", "N/A"),
                    "eps_forecast": row.get("epsForecast", "N/A"),
                    "time": row.get("time", "N/A"),
                })
        except Exception:
            continue

    return earnings[:10]


def fetch_week_ahead_calendar():
    events = []

    for day in get_next_7_days():
        data = fetch_nasdaq_json(f"https://api.nasdaq.com/api/calendar/economicevents?date={day}")

        try:
            for row in data["data"]["rows"]:
                events.append({
                    "date": day,
                    "event": row.get("eventName", "N/A"),
                    "actual": row.get("actual", "N/A"),
                    "forecast": row.get("forecast", "N/A"),
                    "previous": row.get("previous", "N/A"),
                })
        except Exception:
            continue

    return events[:12]


def fetch_confirmed_news():
    rss_urls = [
        "https://www.cnbc.com/id/100003114/device/rss/rss.html",
        "https://feeds.marketwatch.com/marketwatch/topstories/",
        "https://finance.yahoo.com/news/rssindex",
    ]

    for url in rss_urls:
        try:
            response = get_url(url, timeout=40)
            response.raise_for_status()
            root = ET.fromstring(response.content)

            news = []
            for item in root.findall(".//item")[:8]:
                news.append({
                    "title": item.findtext("title", default="N/A"),
                    "date": item.findtext("pubDate", default="N/A"),
                    "source": item.findtext("link", default=url),
                })

            if news:
                return news

        except Exception:
            continue

    return [{
        "title": "News fetch failed from CNBC, MarketWatch, and Yahoo Finance RSS.",
        "date": "N/A",
        "source": "RSS fallback failed",
    }]


def calculate_macro_bias(finviz_rows, sectors):
    by_ticker = {r["ticker"]: r for r in finviz_rows}
    by_sector = {s["symbol"]: s for s in sectors}

    score = 0
    reasons = []

    for ticker, label in [("ES", "S&P 500 futures"), ("NQ", "Nasdaq futures"), ("ER2", "Small caps")]:
        value = by_ticker.get(ticker, {}).get("perf_pct", 0)
        if value > 0:
            score += 1
            reasons.append(f"{label} positive at {value:+.2f}%")
        else:
            score -= 1
            reasons.append(f"{label} weak at {value:+.2f}%")

    oil = by_ticker.get("CL", {}).get("perf_pct", 0)
    dollar = by_ticker.get("DX", {}).get("perf_pct", 0)
    gold = by_ticker.get("GC", {}).get("perf_pct", 0)
    tech = by_sector.get("XLK", {}).get("day_return_pct", 0)

    if oil < 0:
        score += 1
        reasons.append(f"Oil falling at {oil:+.2f}%, reducing inflation pressure")
    else:
        score -= 1
        reasons.append(f"Oil rising at {oil:+.2f}%, increasing inflation pressure")

    if dollar < 0:
        score += 1
        reasons.append(f"Dollar falling at {dollar:+.2f}%, supportive for risk assets")
    else:
        score -= 1
        reasons.append(f"Dollar rising at {dollar:+.2f}%, pressure on risk assets")

    if gold > 0:
        score -= 1
        reasons.append(f"Gold rising at {gold:+.2f}%, showing defensive demand")

    if tech > 0:
        score += 1
        reasons.append(f"Technology sector positive at {tech:+.2f}%")
    else:
        score -= 1
        reasons.append(f"Technology sector weak at {tech:+.2f}%")

    if score >= 3:
        bias = "Neutral-Bullish"
    elif score <= -2:
        bias = "Cautious"
    else:
        bias = "Neutral"

    return {
        "bias": bias,
        "confidence": "Medium",
        "primary_driver": reasons[0] if reasons else "Mixed macro signals",
        "reasons": reasons,
        "score": score,
    }


def build_key_earnings_markdown():
    earnings = fetch_key_earnings()
    lines = [
        "## Key Earnings",
        "",
        "| Date | Company | Symbol | EPS Forecast | Time |",
        "|------|---------|--------|--------------|------|",
    ]

    if not earnings:
        lines.append("| N/A | No earnings data fetched | N/A | N/A | N/A |")
    else:
        for e in earnings:
            lines.append(f"| {e['date']} | {e['company']} | {e['symbol']} | {e['eps_forecast']} | {e['time']} |")

    lines.append("")
    lines.append("*Source: Nasdaq Earnings Calendar*")
    return "\n".join(lines)


def build_week_ahead_calendar_markdown():
    events = fetch_week_ahead_calendar()
    lines = [
        "## Week Ahead Economic Calendar",
        "",
        "| Date | Event | Actual | Forecast | Previous |",
        "|------|-------|--------|----------|----------|",
    ]

    if not events:
        lines.append("| N/A | No economic calendar data fetched | N/A | N/A | N/A |")
    else:
        for e in events:
            lines.append(f"| {e['date']} | {e['event']} | {e['actual']} | {e['forecast']} | {e['previous']} |")

    lines.append("")
    lines.append("*Source: Nasdaq Economic Calendar*")
    return "\n".join(lines)


def build_confirmed_news_markdown():
    news = fetch_confirmed_news()
    lines = ["## Confirmed Macro News", ""]

    for n in news:
        lines.append(f"- **{n['title']}**")
        lines.append(f"  - Date: {n['date']}")
        lines.append(f"  - Source: {n['source']}")

    lines.append("")
    lines.append("*Sources: CNBC RSS, MarketWatch RSS, Yahoo Finance RSS*")
    return "\n".join(lines)


def build_finviz_markdown(rows):
    lines = [
        "## Finviz Futures Performance 1W",
        "",
        "| Ticker | Name | Group | Weekly % |",
        "|--------|------|-------|----------|",
    ]

    for row in sorted(rows, key=lambda r: r["perf_pct"], reverse=True):
        lines.append(f"| {row['ticker']} | {row['label']} | {row['group']} | {row['perf_pct']:+.2f}% |")

    lines.append("")
    lines.append(f"*Fetched: {rows[0]['fetched_at'] if rows else 'N/A'} from Finviz*")
    return "\n".join(lines)


def build_commodities_section(rows):
    lines = ["## Commodities & Dollar", ""]
    by_ticker = {r["ticker"]: r for r in rows}

    for ticker, name in MACRO_COMMODITIES.items():
        row = by_ticker.get(ticker)

        if row:
            direction = "Rising" if row["perf_pct"] > 0 else "Falling" if row["perf_pct"] < 0 else "Flat"
            lines.append(f"- **{name}**: weekly change {row['perf_pct']:+.2f}%, direction: {direction}")
        else:
            lines.append(f"- **{name}**: not found in this week's fetch")

    return "\n".join(lines)


def build_sectors_markdown(sectors):
    lines = [
        "## Yahoo Finance Sectors",
        "",
        "| ETF | Sector | Price | Day Return % |",
        "|-----|--------|-------|--------------|",
    ]

    for row in sorted(sectors, key=lambda s: s["day_return_pct"], reverse=True):
        sign = "+" if row["day_return_pct"] >= 0 else ""
        lines.append(f"| {row['symbol']} | {row['name']} | {row['price']} | {sign}{row['day_return_pct']}% |")

    lines.append("")
    lines.append(f"*Fetched: {sectors[0]['fetched_at'] if sectors else 'N/A'} via yfinance*")
    return "\n".join(lines)


def build_macro_report(week, finviz_rows, sectors, source="macro_agent_script"):
    stamp = datetime.now().strftime("%d %b %Y")
    macro = calculate_macro_bias(finviz_rows, sectors)
    reasons_text = "\n".join([f"- {reason}" for reason in macro["reasons"]])

    return f"""# MACRO AGENT OUTPUT — WEEK {week} — SOURCE: R4

*Auto-generated by TradeKyaMal Macro Agent on {stamp}.*

{build_commodities_section(finviz_rows)}

---

{build_rates_markdown()}

---

{build_key_earnings_markdown()}

---

{build_week_ahead_calendar_markdown()}

---

{build_confirmed_news_markdown()}

---

## Macro Signal Reasons

{reasons_text}

## MACRO BIAS: {macro["bias"]}
## PRIMARY DRIVER: {macro["primary_driver"]}
## CONFIDENCE: {macro["confidence"]}
## INVALIDATION: Bias may change if inflation, Fed expectations, oil prices, dollar, or equity futures move strongly in the opposite direction.

---

{build_finviz_markdown(finviz_rows)}

---

{build_sectors_markdown(sectors)}

Sources used: Finviz, Yahoo Finance, Nasdaq, FRED, U.S. Treasury, Federal Reserve, CNBC RSS, MarketWatch RSS.
"""