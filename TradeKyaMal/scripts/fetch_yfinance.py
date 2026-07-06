#!/usr/bin/env python3
"""Back-compat wrapper — use fetch_macro_yahoo_sectors.py"""
from fetch_macro_yahoo_sectors import (
    SECTOR_ETFS,
    CHART_TICKERS,
    fetch_sector_returns,
    fetch_macro_yahoo_sectors,
    save_sector_chart,
    save_macro_sector_chart,
)

if __name__ == "__main__":
    from fetch_macro_yahoo_sectors import main
    main()
