#!/usr/bin/env python3
"""Back-compat wrapper — use fetch_macro_finviz.py"""
from fetch_macro_finviz import fetch_finviz_futures, fetch_macro_finviz, save_macro_finviz

if __name__ == "__main__":
    from fetch_macro_finviz import main
    main()
