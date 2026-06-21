# TradeKyaMal — API Data Fetch Guide

## Overview

TradeKyaMal pulls **weekly scorecard data** from the three sources in your bookmarks, stores it in MongoDB, and displays it on the dashboard.

| Bookmark | What it provides | API key needed? |
|----------|------------------|-----------------|
| [Finviz Futures Performance](https://finviz.com/futures_performance) | Futures % change (ES, NQ, CL, GC, etc.) | **No** |
| [Yahoo Finance Sectors](https://finance.yahoo.com/sectors/) | US sector day returns (via sector ETFs) | **No** |
| [TradingEconomics Calendar](https://tradingeconomics.com/calendar) | Today's economic events | **Yes — paid plan** |

```
┌─────────────┐     POST /api/fetch      ┌─────────────┐     Finviz / Yahoo / TE     ┌──────────┐
│  Dashboard  │ ──────────────────────► │   Backend   │ ─────────────────────────► │  Source  │
│  (Vercel)   │                         │  (Render)   │ ◄───────────────────────── │  sites   │
└─────────────┘     saved entries       └──────┬──────┘     parsed scorecard data  └──────────┘
                                                 │
                                                 ▼
                                          ┌─────────────┐
                                          │  MongoDB    │
                                          │   Atlas     │
                                          └─────────────┘
```

---

## How to get API access from each site

### 1. Finviz Futures — no API key

Finviz does **not** offer a free developer API. The dashboard reads the same data shown on [finviz.com/futures_performance](https://finviz.com/futures_performance) (embedded JSON on their page).

- **Free:** Works out of the box — no signup, no key
- **Finviz Elite (paid):** Adds CSV export and official API access — see [finviz.com/elite](https://finviz.com/elite)
- **Note:** Futures quotes on Finviz are delayed ~20 minutes

### 2. Yahoo Finance Sectors — no API key

Yahoo shut down their official Finance API years ago. There is **no API key** to sign up for.

The dashboard uses the same sector ETF prices Yahoo's [Sectors page](https://finance.yahoo.com/sectors/) is built on (XLK, XLF, XLE, etc.) via Yahoo's public chart endpoint.

- **Free:** Works out of the box — no signup, no key
- **Limitation:** Unofficial endpoint — may change without notice

### 3. TradingEconomics Calendar — API key required

This is the **only source that needs a real API key**.

1. Go to [developer.tradingeconomics.com](https://developer.tradingeconomics.com) or [tradingeconomics.com/api/pricing.aspx](https://tradingeconomics.com/api/pricing.aspx)
2. Subscribe to a plan (starts around $199/month for Standard)
3. Copy your API key from your account dashboard
4. Add to `backend/.env`:
   ```env
   TRADING_ECONOMICS_API_KEY=your_key_here
   ```

**Important:** The **Economic Calendar API** may require an **Enterprise** plan on top of the base subscription. Check your plan includes calendar access before relying on it for assignments.

Docs: [TradingEconomics Calendar API](https://docs.tradingeconomics.com/economic_calendar/country/)

---

## Setup

### Local backend `.env`

```env
MONGODB_URI=mongodb://localhost:27017/tradekyamal
TRADING_ECONOMICS_API_KEY=your_key_here   # optional — only needed for calendar
```

Finviz and Yahoo Sectors work without any keys.

### Production (Render)

Add `TRADING_ECONOMICS_API_KEY` in Render Dashboard → Environment (if using calendar fetch).

---

## Using the dashboard

1. Open `/data-collection`
2. Select a provider:
   - **Finviz Futures** → pick timeframe (Daily, Weekly, etc.) → **Fetch & Save**
   - **Yahoo Sectors** → pick sector or "All Sectors" → **Fetch & Save**
   - **TradingEconomics** → pick country → **Fetch & Save** (requires API key)
3. View chart, table, and export JSON/CSV

---

## API Reference

### List providers

```
GET /api/fetch/providers
```

### Fetch and store

```
POST /api/fetch
Content-Type: application/json
```

**Finviz futures:**
```json
{ "provider": "finviz", "timeframe": "W" }
```

Timeframes: `D`, `W`, `M`, `Q`, `HY`, `Y`

**Yahoo sectors (all):**
```json
{ "provider": "yahoo_sectors", "sector": "all" }
```

**Yahoo sectors (single):**
```json
{ "provider": "yahoo_sectors", "sector": "technology" }
```

**TradingEconomics calendar (today):**
```json
{ "provider": "tradingeconomics", "country": "united states" }
```

### View collected data

```
GET /api/data-collection
```

---

## File Locations

| What | Where |
|------|-------|
| Fetch route | `backend/src/routes/fetch.ts` |
| Provider config | `backend/src/services/providers.ts` |
| Fetch logic | `backend/src/services/fetchData.ts` |
| Dashboard UI | `frontend/src/components/ApiFetchPanel.tsx` |
