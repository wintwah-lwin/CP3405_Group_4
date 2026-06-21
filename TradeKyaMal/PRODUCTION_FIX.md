# TradeKyaMal — Production Fix Checklist

If the live site shows **"Agent module coming soon"** or fetch fails:

## 1. Vercel (frontend) — must redeploy latest code

- GitHub repo: `louishan42/TradeKyaMal` branch `main`
- **Root Directory:** `frontend`
- Latest commit should include Macro Agent report (not placeholder)
- **Deployments** → Redeploy if last deploy is before June 2026 Macro update

### Vercel environment variables

| Variable | Value |
|----------|--------|
| `BACKEND_URL` | Your Render backend URL, e.g. `https://tradekyamal.onrender.com` |

Do **not** leave `NEXT_PUBLIC_API_URL` as `localhost` in production.

After setting env vars → **Redeploy** (required for rewrites to pick up BACKEND_URL).

## 2. Render (backend) — must be running (not suspended)

Open your Render dashboard. If you see **"Service Suspended"**:

1. Resume or recreate the web service
2. Root Directory: `backend`
3. Environment: `MONGODB_URI`, `CORS_ORIGIN` (your Vercel URL)

Test: `https://YOUR-SERVICE.onrender.com/api/health` → should return `{"status":"ok",...}`

## 3. MongoDB Atlas

- Connection string in Render `MONGODB_URI`
- Network access: allow `0.0.0.0/0`

## 4. Quick test after fix

1. `https://trade-kya-mal.vercel.app/agents/macro` → full report, NOT "coming soon"
2. Data Collection → Fetch Finviz Weekly → chart + table fill
3. Macro → Pull from Data Collection → commodities update
