"""
Macro Agent report builder — shared by run_macro_agent.py and run_weekly_fetch.py.

Generates macro_agent_data_W{week}.md for evidence/Week X/ in the group repo.
Fully automated via yfinance, RSS, XML feeds, and Gemini AI.
"""

import os
from datetime import datetime

try:
    from google import genai
    HAS_GEMINI = True
except Exception:
    genai = None
    HAS_GEMINI = False

# Custom Fetchers
from fetch_macro_rates import fetch_fed_and_yields
from fetch_macro_earnings import fetch_upcoming_earnings
from fetch_macro_news import fetch_latest_news
from fetch_macro_calendar import fetch_economic_calendar

MACRO_COMMODITIES = {"CL": "WTI Crude Oil", "GC": "Gold", "DX": "DXY (Dollar)"}

def build_finviz_markdown(rows: list[dict]) -> str:
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


def build_sectors_markdown(sectors: list[dict]) -> str:
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


def build_commodities_section(rows: list[dict]) -> str:
    lines = ["COMMODITIES & DOLLAR (Finviz Futures 1W)", ""]
    by_ticker = {r["ticker"]: r for r in rows}
    for ticker, name in MACRO_COMMODITIES.items():
        row = by_ticker.get(ticker)
        if row:
            direction = (
                "Rising" if row["perf_pct"] > 0 else "Falling" if row["perf_pct"] < 0 else "Flat"
            )
            lines.append(f"{name}: weekly change {row['perf_pct']:+.2f}%, direction: {direction}")
        else:
            lines.append(f"{name}: data unavailable")
    lines.append("")
    return "\n".join(lines)


def build_calendar_section(events: str) -> str:
    return f"WEEK-AHEAD CALENDAR (TradingEconomics):\n\n{events}\n"


def build_earnings_section(earnings: str) -> str:
    lines = ["KEY EARNINGS THIS WEEK (Earnings Whispers):", ""]
    if earnings and "No major earnings" not in earnings:
        tickers = [item.strip() for item in earnings.split(",") if item.strip()]
        for ticker in tickers:
            lines.append(f"- {ticker} — [Add details: sector, date, what to watch]")
    else:
        lines.append("- No major earnings found in the next 14 days.")
    lines.append("")
    lines.append("Key Insight:")
    lines.append("- [Add one short sentence explaining the most important earnings event this week]")
    lines.append("")
    return "\n".join(lines)


def build_news_section(news: str) -> str:
    lines = ["CONFIRMED NEWS EVENTS (Reuters / AP):", ""]
    if news and "Failed to fetch" not in news:
        lines.append(news)
    else:
        lines.append("- Live news fetch unavailable; add Reuters / AP headlines manually.")
    lines.append("")
    lines.append("Key Insight:")
    lines.append("- [Add one short sentence explaining the dominant market theme from the news]")
    lines.append("")
    return "\n".join(lines)


def parse_yields(yield_text: str) -> tuple[str, str, str]:
    try:
        parts = [part.strip() for part in yield_text.split("/")]
        if len(parts) == 3:
            return parts[0], parts[1], parts[2]
    except Exception:
        pass
    return "N/A", "N/A", "N/A"


def generate_ai_analysis(report_text: str) -> str:
    api_key = os.environ.get("GEMINI_API_KEY")
    
    if not HAS_GEMINI or not api_key:
        return (
            "⚠️ **AI Analysis Skipped:** `GEMINI_API_KEY` not found or Gemini SDK unavailable.\n\n"
            "MACRO BIAS: [fill in]\n"
            "PRIMARY DRIVER THIS WEEK: [fill in]\n"
            "CONFIDENCE: [fill in]\n"
            "INVALIDATION: [fill in]\n"
            "Cross-asset implication: [fill in]\n"
            "Key Insight: [fill in]"
        )

    try:
        print("🤖 Requesting AI Macro Analysis from Gemini...")
        client = genai.Client(api_key=api_key)
        prompt = f"""
You are an expert macroeconomic analyst. Review the weekly market data below and produce only the following headings with concise answers.
Do not write extra prose beyond what is requested.

MACRO BIAS: [Bullish, Neutral-Bullish, Neutral, Neutral-Cautious, or Cautious]
PRIMARY DRIVER THIS WEEK: [1 sentence explaining the main macro driver]
CONFIDENCE: [Low, Medium, or High]
INVALIDATION: [1 sentence on what would prove this bias wrong]
Cross-asset implication: [1 brief sentence]
Key Insight: [1 brief sentence]

Weekly market data:
{report_text}
"""
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )
        return response.text.strip()
    except Exception as e:
        return f"⚠️ **AI Analysis Failed:** {e}\n\nManual analysis required."


def build_macro_report(
    week: int,
    finviz_rows: list[dict],
    sectors: list[dict],
    source: str = "macro_agent_script",
) -> str:
    stamp = datetime.now().strftime("%d %b %Y")

    macro_data = fetch_fed_and_yields()
    earnings_list = fetch_upcoming_earnings()
    news_headlines = fetch_latest_news()
    calendar_events = fetch_economic_calendar()

    yield_2y, yield_10y, yield_30y = parse_yields(macro_data.get("yield_2y_10y_30y", ""))

    header = f"MACRO AGENT OUTPUT TEMPLATE --- WEEK OF [{stamp}] --- SOURCE: R4\n\n"
    fed_section = "FED & RATES (CME FedWatch + Treasury.gov):\n\n"
    fed_section += f"- Current Fed rate: {macro_data.get('current_fed_proxy', 'N/A')}\n\n"
    fed_section += f"- Next FOMC date: {macro_data.get('next_fomc_date', 'N/A')}\n\n"
    fed_section += f"- Hold probability: {macro_data.get('hold_probability', 'N/A')}\n\n"
    fed_section += f"- Hike probability: {macro_data.get('hike_probability', 'N/A')}\n\n"
    fed_section += f"- Cut probability: {macro_data.get('cut_probability', 'N/A')}\n\n"
    fed_section += f"- Direction vs last week: {macro_data.get('direction_vs_last_week', 'N/A')}\n\n"
    fed_section += f"- 2-year yield: {yield_2y}\n\n"
    fed_section += f"- 10-year yield: {yield_10y}\n\n"
    fed_section += f"- 30-year yield: {yield_30y}\n\n"
    fed_section += f"- Yield curve: {macro_data.get('implication', 'N/A')}\n\n"
    fed_section += f"- 10-year direction this week: {macro_data.get('ten_year_direction', 'N/A')}\n\n"
    fed_section += f"- Implication: {macro_data.get('yield_implication', macro_data.get('implication', 'N/A'))}\n\n"
    fed_section += "- Note: Hold/hike/cut probabilities are derived from Fed funds futures and serve as an estimated proxy, not CME's official FedWatch output.\n\n"

    commodities = build_commodities_section(finviz_rows)
    calendar = build_calendar_section(calendar_events)
    earnings = build_earnings_section(earnings_list)
    news = build_news_section(news_headlines)

    base_report = f"""{header}{fed_section}{commodities}{calendar}{earnings}{news}"""

    ai_analysis = generate_ai_analysis(base_report)

    final_report = f"""{base_report}
MACRO BIAS: {ai_analysis.split('\n')[0].replace('MACRO BIAS:', '').strip() if ai_analysis.startswith('MACRO BIAS:') else ai_analysis}

{ai_analysis}
Sources accessed: {stamp}. All data from the approved tools only.
"""

    # Append raw tables for reference and transparency
    final_report += "\n---\n\n" + build_finviz_markdown(finviz_rows)
    final_report += "\n---\n\n" + build_sectors_markdown(sectors)
    return final_report