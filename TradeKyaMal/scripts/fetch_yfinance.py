#!/usr/bin/env python3
"""
Fetch sector ETF data and charts via yfinance (free).
Recommended by Dr Tan for timestamped chart evidence.
"""

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import matplotlib.pyplot as plt
import yfinance as yf

# Sector ETFs matching Yahoo Finance Sectors page
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


def fetch_sector_returns() -> list[dict]:
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
        })

    return results


def save_sector_chart(out_dir: Path, symbol: str, name: str) -> Path | None:
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
    path = out_dir / f"yfinance_{symbol}_{stamp}.png"
    fig.savefig(path, dpi=120)
    plt.close(fig)
    return path


def main() -> None:
    out_dir = Path(__file__).parent / "output"
    charts_dir = out_dir / "charts"
    out_dir.mkdir(exist_ok=True)
    charts_dir.mkdir(exist_ok=True)

    sectors = fetch_sector_returns()
    stamp = datetime.now().strftime("%Y-%m-%d")

    json_path = out_dir / f"yahoo_sectors_5D_{stamp}.json"
    json_path.write_text(json.dumps(sectors, indent=2), encoding="utf-8")
    print(f"Saved {len(sectors)} sector rows → {json_path}")

    for row in sorted(sectors, key=lambda x: x["day_return_pct"], reverse=True)[:5]:
        print(f"  {row['symbol']} {row['name']}: {row['day_return_pct']:+.2f}%")

    print("Generating charts...")
    for symbol, name in {**SECTOR_ETFS, **CHART_TICKERS}.items():
        path = save_sector_chart(charts_dir, symbol, name)
        if path:
            print(f"  Chart → {path.name}")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)
