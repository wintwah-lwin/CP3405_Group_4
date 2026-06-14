# Deployment Guide — TradeKyaMal

## Architecture

```
Browser → Vercel (frontend) → Render (backend API) → MongoDB Atlas (database)
                                      ↓
                              Scorecard sources (Finviz, Yahoo, TradingEconomics)
```

---

## Step 1 — MongoDB Atlas (Database)

Do this first — both local and production need it.

1. Go to [mongodb.com/atlas](https://www.mongodb.com/atlas) → Create free **M0** cluster
2. **Database Access** → Create user (save username + password)
3. **Network Access** → Add IP → **Allow access from anywhere** (`0.0.0.0/0`)
4. **Connect** → Drivers → Copy connection string:
   ```
   mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/tradekyamal
   ```

---

## Step 2 — Deploy Backend on Render

1. Go to [render.com](https://render.com) → Sign in with GitHub
2. **New +** → **Blueprint** (or **Web Service**)
3. Connect repo: `louishan42/TradeTan` (rename to TradeKyaMal on GitHub if desired)
4. Render will detect `render.yaml` at the repo root
5. Add environment variables in the Render dashboard:

| Variable | Value |
|----------|-------|
| `MONGODB_URI` | Your Atlas connection string |
| `CORS_ORIGIN` | `https://your-vercel-url.vercel.app,http://localhost:3000` |
| `TRADING_ECONOMICS_API_KEY` | *(Optional)* Only if using calendar fetch |

6. Click **Deploy** — Render gives you a URL like:
   ```
   https://tradekyamal-backend.onrender.com
   ```

7. Verify: open `https://tradekyamal-backend.onrender.com/api/health`

> **Note:** Render free tier spins down after 15 min idle. First request may take ~30s to wake up.

### Manual Render setup (without Blueprint)

| Setting | Value |
|---------|-------|
| Root Directory | `backend` |
| Build Command | `npm install && npm run build` |
| Start Command | `npm start` |
| Health Check Path | `/api/health` |

---

## Step 3 — Connect Frontend (Vercel)

1. [Vercel Dashboard](https://vercel.com) → **tradetan** project → **Settings** → **Environment Variables**
2. Add:

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_API_URL` | `https://tradekyamal-backend.onrender.com` |

3. **Deployments** → Redeploy

Also update `CORS_ORIGIN` on Render to match your exact Vercel URL.

---

## Step 4 — GitHub

Repo: https://github.com/louishan42/TradeTan

To rename the repo on GitHub:
```bash
gh repo rename TradeKyaMal
```

---

## Data Fetch Flow (How It Works)

```
1. User opens Data Collection page
2. Selects provider (Finviz Futures, Yahoo Sectors, or TradingEconomics)
3. Frontend sends POST /api/fetch to Render backend
4. Backend fetches from the scorecard source (Finviz/Yahoo need no key; TradingEconomics uses your API key)
5. Backend saves results to MongoDB Atlas
6. Frontend refreshes the chart and data table
```

### Example API call

```bash
curl -X POST https://tradekyamal-backend.onrender.com/api/fetch \
  -H "Content-Type: application/json" \
  -d '{"provider": "finviz", "timeframe": "W"}'
```

Response:
```json
{
  "count": 49,
  "entries": [
    { "symbol": "ES", "source": "market_price", "label": "S&P 500 E-Mini — Weekly %", "value": 1.2 }
  ]
}
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Backend unavailable" on Vercel | Set `NEXT_PUBLIC_API_URL` in Vercel env vars |
| CORS error in browser | Add Vercel URL to `CORS_ORIGIN` on Render |
| Render slow first load | Free tier cold start — wait ~30s |
| "API key not configured" | Add `TRADING_ECONOMICS_API_KEY` on Render (only needed for calendar) |
| MongoDB connection failed | Check Atlas IP whitelist + connection string |
