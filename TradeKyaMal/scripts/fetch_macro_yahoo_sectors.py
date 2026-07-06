#!/usr/bin/env python3
"""
Macro Agent — fetch US sector ETFs via yfinance (Yahoo Finance).
Source: https://finance.yahoo.com/sectors/
Output: scripts/output/macro_yahoo_sectors_{date}.json
        scripts/output/macro_charts/macro_{symbol}_{date}.png
"""

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import matplotlib.pyplot as plt
import yfinance as yf

SECTOR_ETFS = {
    "XLK": "Technology",
    "XLF": "Financial Services",
    "XLC": "Communication Services",
    "XLY": "Consumer Cyclical",
    "XLI": "Industrials",
    "XLV": "Healthcare",
    "XLE": "Energy",
    "XLP": "Consumer Defensive",
    "XLB": "Basic Materials",
    "XLRE": "Real Estate",
    "XLU": "Utilities",
}

CHART_TICKERS = {
    "^GSPC": "S&P 500",
    "^IXIC": "NASDAQ",
    "^RUT": "Russell 2000",
}

OUTPUT_JSON = "macro_yahoo_sectors_{stamp}.json"


def fetch_macro_yahoo_sectors() -> list[dict]:
    fetched_at = datetime.now(timezone.utc).isoformat()
    results = []

    for symbol, name in SECTOR_ETFS.items():
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period="5d")
        if hist.empty:
            continue

        price = float(hist["Close"].iloc[-1])
        prev = float(hist["Close"].iloc[-2]) if len(hist) > 1 else price
        day_return = ((price - prev) / prev) * 100 if prev else 0

        results.append({
            "symbol": symbol,
            "name": name,
            "price": round(price, 2),
            "day_return_pct": round(day_return, 2),
            "fetched_at": fetched_at,
            "source": "yfinance",
            "source_url": "https://finance.yahoo.com/sectors/",
        })

    return results


def save_macro_sector_chart(charts_dir: Path, symbol: str, name: str) -> Path | None:
    hist = yf.Ticker(symbol).history(period="3mo", interval="1d")
    if hist.empty:
        return None

    fig, ax = plt.subplots(figsize=(10, 4))
    ax.plot(hist.index, hist["Close"], color="#3b82f6", linewidth=1.5)
    ax.set_title(f"{name} ({symbol}) — 3 Month", fontsize=12)
    ax.set_ylabel("Price")
    ax.grid(True, alpha=0.3)
    fig.tight_layout()

    stamp = datetime.now().strftime("%Y-%m-%d")
    path = charts_dir / f"macro_{symbol}_{stamp}.png"
    fig.savefig(path, dpi=120)
    plt.close(fig)
    return path


# Back-compat aliases
fetch_sector_returns = fetch_macro_yahoo_sectors
save_sector_chart = save_macro_sector_chart


def save_macro_yahoo_sectors(out_dir: Path | None = None) -> tuple[Path, list[dict]]:
    out_dir = out_dir or Path(__file__).parent / "output"
    charts_dir = out_dir / "macro_charts"
    out_dir.mkdir(exist_ok=True)
    charts_dir.mkdir(exist_ok=True)

    sectors = fetch_macro_yahoo_sectors()
    stamp = datetime.now().strftime("%Y-%m-%d")
    json_path = out_dir / OUTPUT_JSON.format(stamp=stamp)
    json_path.write_text(json.dumps(sectors, indent=2), encoding="utf-8")

    for symbol, name in list(SECTOR_ETFS.items())[:4]:
        save_macro_sector_chart(charts_dir, symbol, name)

    return json_path, sectors


def main() -> None:
    json_path, sectors = save_macro_yahoo_sectors()
    print(f"Saved {len(sectors)} sectors → {json_path.name}")

    for row in sorted(sectors, key=lambda x: x["day_return_pct"], reverse=True)[:5]:
        print(f"  {row['symbol']} {row['name']}: {row['day_return_pct']:+.2f}%")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)
