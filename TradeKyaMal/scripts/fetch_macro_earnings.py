import yfinance as yf
from datetime import datetime, timedelta

def fetch_upcoming_earnings():
    try:
        print("Fetching upcoming market earnings...")
        start_date = datetime.now()
        end_date = start_date + timedelta(days=14)
        
        # In newer versions of yfinance, you must use the Calendars class
        calendar = yf.Calendars(start=start_date, end=end_date)
        df = calendar.get_earnings_calendar(limit=20)
        
        if df is not None and not df.empty:
            # Grab up to 10 unique ticker symbols
            tickers = df.index.unique().tolist()[:10]
            return ", ".join(tickers) if tickers else "No major earnings scheduled."
            
        return "No major earnings scheduled."
    except Exception as e:
        return f"Fetch failed: {e}"