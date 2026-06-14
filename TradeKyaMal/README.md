# TradeKyaMal — Trading Intelligence Dashboard

Design Thinking 3 assignment platform for trading data collection and multi-agent analysis.

## Tech Stack

| Layer | Language / Tool | Why |
|-------|----------------|-----|
| **Frontend** | TypeScript + Next.js 15 + Tailwind CSS | Professional dashboard UI |
| **Backend** | TypeScript + Express.js | REST API + MongoDB |
| **Database** | MongoDB + Mongoose | Flexible trading data storage |
| **Hosting** | Vercel (frontend) + Render (backend) | Free tiers available |

## Folder Structure

```
TradeKyaMal/
├── frontend/          # Next.js dashboard (UI)
├── backend/           # Express REST API
├── shared/types/      # Shared TypeScript types
└── render.yaml        # Render backend deployment config
```

## Quick Start (Local)

### Prerequisites

- Node.js 18+
- MongoDB (`brew services start mongodb-community`) or [MongoDB Atlas](https://www.mongodb.com/atlas)

### Backend

```bash
cd backend
cp .env.example .env
# Add your API keys to .env
npm install
npm run dev
```

Runs on **http://localhost:4000**

### Frontend

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

Runs on **http://localhost:3000**

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/fetch/providers` | List API providers and key status |
| POST | `/api/fetch` | Fetch from external API and save to DB |
| GET | `/api/data-collection` | List collected data |
| POST | `/api/data-collection` | Add a data point manually |
| DELETE | `/api/data-collection/:id` | Remove a data point |
| GET | `/api/data-collection/stats` | Dashboard statistics |
| GET | `/api/agents` | List all agents |
| GET | `/api/agents/:id` | Agent details |
| GET | `/api/market/quote/:symbol` | Live quote (Yahoo Finance) |

## Data Fetch Sources

Your three weekly scorecard bookmarks:

| Source | Env key | Sign up |
|--------|---------|---------|
| [Finviz Futures](https://finviz.com/futures_performance) | None — works automatically | No signup needed |
| [Yahoo Sectors](https://finance.yahoo.com/sectors/) | None — works automatically | No signup needed |
| [TradingEconomics Calendar](https://tradingeconomics.com/calendar) | `TRADING_ECONOMICS_API_KEY` | [developer.tradingeconomics.com](https://developer.tradingeconomics.com) |

See **[API_GUIDE.md](./API_GUIDE.md)** for full details on how each source works.

## Deployment

| Service | Platform | Guide |
|---------|----------|-------|
| Frontend | Vercel | Root directory: `frontend` |
| Backend | Render | Uses `render.yaml` at repo root |
| Database | MongoDB Atlas | Free M0 cluster |

Full instructions: **[DEPLOYMENT.md](./DEPLOYMENT.md)**

## Agents (Placeholders)

- **Almanac Agent** — seasonal/calendar pattern analysis
- **Macro Agent** — macroeconomic indicator monitoring
- **Technical Agent** — price action & indicator signals
