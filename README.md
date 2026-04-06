# Quantara — See What Others Miss

Company intelligence platform: SEC filings, real-time market data, AI-powered investment signals, supply chain maps.

**Live:** [quantara.vercel.app](https://frontend-7tzo63f3m-quantara1.vercel.app) · **Repo:** [github.com/Jaimin001607/quantara](https://github.com/Jaimin001607/quantara)

## Architecture

```
Frontend (Next.js 14 + TailwindCSS)  →  Vercel
         ↓  REST
Backend  (FastAPI + Python)           →  Railway
         ↓
Data Layer:
  • SEC EDGAR API      → filings, CIK, employee counts, supply chain
  • Yahoo Finance      → quotes, financials, price history
  • Finnhub            → market news, insider trades
         ↓
PostgreSQL (caching layer — 1h quotes, 24h everything else)
         ↓
Claude API (Sonnet) → filing summaries + investment signals
```

---

## Features

- **Company Dashboard** — quote, financials, AI investment signal (BUY/HOLD/SELL)
- **SEC Filings** — 10-K/10-Q with AI summaries
- **Supply Chain Map** — interactive bubble map for any company (extracted from 10-K text)
- **Price Chart** — full lifetime OHLC chart (click price to open)
- **Market News** — live feed from Finnhub
- **Big Trades** — insider transactions with disclosure timing

---

## Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 14+
- Anthropic API key (https://console.anthropic.com)
- Finnhub API key — free at https://finnhub.io

---

## Local Setup

### 1. Database

```bash
psql -U postgres -c "CREATE DATABASE quantara;"
```

### 2. Backend

```bash
cd bloomberg-mvp/backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env — fill in keys
```

`.env`:
```
ANTHROPIC_API_KEY=sk-ant-...
FINNHUB_API_KEY=your_finnhub_key
DATABASE_URL=postgresql://postgres:password@localhost:5432/quantara
SEC_USER_AGENT=YourName yourname@email.com
```

```bash
uvicorn main:app --reload --port 8001
```

### 3. Frontend

```bash
cd bloomberg-mvp/frontend
npm install
npm run dev   # http://localhost:3000
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/search?q=AAPL` | Search companies |
| GET | `/api/v1/company/{ticker}` | Full dashboard data |
| GET | `/api/v1/company/{ticker}?refresh=true` | Force-refresh cache |
| GET | `/api/v1/company/{ticker}/financials` | Financials only |
| GET | `/api/v1/company/{ticker}/price-chart` | OHLC price history |
| GET | `/api/v1/company/{ticker}/supply-chain` | Supply chain graph |
| GET | `/api/v1/market/news` | Market news feed |
| GET | `/api/v1/market/big-trades` | Insider transactions |
| GET | `/health` | Health check |

---

## Data Sources

| Source | What | Cost |
|--------|------|------|
| SEC EDGAR API | Filings, CIK, employee counts, supply chain | Free |
| Yahoo Finance | Quotes, financials, full price history | Free |
| Finnhub | News, insider trades | Free tier |
| Claude Sonnet | Filing summaries, investment signals | Paid per token |

---

## Deployment

- **Frontend:** Vercel (auto-deploys on push to `main`)
- **Backend:** Railway (set env vars, attach PostgreSQL plugin)
