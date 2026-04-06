# Quantara — See What Others Miss

> Real-time company intelligence platform: SEC filings, live market data, AI-powered investment signals, supply chain maps, and insider trades.

**Repo:** [github.com/Jaimin001607/quantara](https://github.com/Jaimin001607/quantara)

---

## What It Does

| Feature | Description |
|---|---|
| **Company Dashboard** | Full profile, live quote, financials, AI signal (BUY/HOLD/SELL) |
| **Price Chart** | Click any stock price — opens interactive chart with 1D/1M/3M/1Y/5Y/All |
| **1D Candlestick** | 5-minute green/red candlestick chart for today's trading session (ET) |
| **Multi-range Area Chart** | Smooth area chart for 1M, 3M, 1Y, 5Y, All time ranges |
| **Supply Chain Map** | Interactive bubble map — suppliers, customers, competitors |
| **SEC Filings** | Latest 10-K and 10-Q filings with AI summaries |
| **Market News** | Live news feed from Finnhub across all markets |
| **Big Trades** | Insider transactions ≥$500K with disclosure timing |
| **Smart Search** | Fuzzy search by ticker or company name |

---

## Tech Stack

```
Frontend  Next.js 14 (App Router) + TailwindCSS + Recharts + TradingView lightweight-charts
Backend   FastAPI (Python) + SQLAlchemy + PostgreSQL
Data      SEC EDGAR API · Yahoo Finance · Finnhub · Claude AI (Anthropic)
```

---

## Local Setup

### Requirements
- Python 3.11+
- Node.js 18+
- PostgreSQL 14+

### 1. Clone
```bash
git clone https://github.com/Jaimin001607/quantara.git
cd quantara
```

### 2. Database
```bash
psql postgres -c "CREATE DATABASE bloomberg_mvp;"
```

### 3. Backend
```bash
cd bloomberg-mvp/backend
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Fill in your real values in .env
```

`.env` file:
```
ANTHROPIC_API_KEY=sk-ant-...
FINNHUB_API_KEY=your_finnhub_key     # free at finnhub.io
DATABASE_URL=postgresql://YOUR_USER@localhost:5432/bloomberg_mvp
SEC_USER_AGENT=YourName yourname@email.com
```

Start the backend:
```bash
uvicorn main:app --reload --port 8001
```

### 4. Frontend
```bash
cd bloomberg-mvp/frontend
npm install
npm run dev                          # runs on http://localhost:3000
```

Open **http://localhost:3000**

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/search?q=AAPL` | Search companies (fuzzy) |
| GET | `/api/v1/company/{ticker}` | Full dashboard data |
| GET | `/api/v1/company/{ticker}?refresh=true` | Force-refresh cache |
| GET | `/api/v1/company/{ticker}/financials` | Financials only |
| GET | `/api/v1/company/{ticker}/price-chart?resolution=H` | Price candles (H/D/W/M) |
| GET | `/api/v1/company/{ticker}/supply-chain` | Supply chain graph |
| GET | `/api/v1/market/news` | Market news feed |
| GET | `/api/v1/market/big-trades` | Insider transactions |
| GET | `/health` | Health check |

**Price chart resolutions:**
- `H` — 5-minute candles, current trading day
- `D` — daily candles, 2 years
- `W` — weekly candles, 10 years
- `M` — monthly candles, full history

---

## Data Sources

| Source | Data | Cost |
|---|---|---|
| SEC EDGAR | Filings, CIK lookup, employee counts, supply chain extraction | Free |
| Yahoo Finance | Price history (full lifetime OHLC) | Free |
| Finnhub | Live quotes, financials, news, insider trades | Free tier |
| Anthropic Claude | Filing summaries, AI investment signals | Paid per token |

---

## Project Structure

```
bloomberg-mvp/
├── backend/
│   ├── main.py                  # FastAPI app entry
│   ├── routers/
│   │   ├── company.py           # Company endpoints
│   │   └── market.py            # News + trades endpoints
│   ├── services/
│   │   ├── yahoo.py             # Yahoo Finance (price history)
│   │   ├── sec.py               # SEC EDGAR (filings, CIK, employees)
│   │   ├── supply_chain.py      # Supply chain extraction from 10-K
│   │   ├── ai_service.py        # Claude AI + rule-based signals
│   │   ├── news.py              # News aggregation
│   │   └── cache.py             # DB caching layer
│   ├── database/
│   │   ├── connection.py
│   │   └── schema.sql
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── app/
    │   ├── page.tsx             # Home / search
    │   ├── company/page.tsx     # Company dashboard
    │   ├── news/page.tsx        # Market news page
    │   └── trades/page.tsx      # Big trades page
    ├── components/
    │   ├── TopNav.tsx           # Navigation bar
    │   ├── BubbleMap.tsx        # D3 supply chain visualization
    │   ├── PriceChartModal.tsx  # TradingView candlestick + area chart
    │   ├── AISignalPanel.tsx    # BUY/HOLD/SELL signal
    │   ├── CompanyHeader.tsx    # Quote + price button
    │   └── ...
    └── lib/api.ts               # API client
```

---

## Notes

- AI signals fall back to rule-based scoring if no Anthropic API credits
- Supply chain data uses static seeds + live 10-K text extraction
- All data is cached in PostgreSQL (quotes: 1h, everything else: 24h)
- Not financial advice
