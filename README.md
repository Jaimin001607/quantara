# Bloomberg MVP — Company Intelligence Platform

Bloomberg-style company intelligence terminal using only free data sources.

## Architecture

```
Frontend (Next.js 14 + TailwindCSS)
         ↓  REST
Backend  (FastAPI + Python)
         ↓
Data Layer:
  • SEC EDGAR API      → filings + CIK resolution
  • Yahoo Finance      → quotes, financials, company meta
  • Wikipedia REST API → company descriptions
  • NewsAPI / yfinance → news headlines
         ↓
PostgreSQL (caching layer — 1h quotes, 24h everything else)
         ↓
Claude API (Sonnet) → filing summaries + investment signals
```

---

## Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 14+
- Anthropic API key (https://console.anthropic.com)
- NewsAPI key — optional, free tier at https://newsapi.org (falls back to yfinance news)

---

## Setup

### 1. Database

```bash
psql -U postgres -c "CREATE DATABASE bloomberg_mvp;"
```

### 2. Backend

```bash
cd bloomberg-mvp/backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env — fill in ANTHROPIC_API_KEY, DATABASE_URL, SEC_USER_AGENT
```

`.env` file:
```
ANTHROPIC_API_KEY=sk-ant-...
NEWS_API_KEY=your_newsapi_key_here   # optional
DATABASE_URL=postgresql://postgres:password@localhost:5432/bloomberg_mvp
SEC_USER_AGENT=YourName yourname@email.com
```

Start the API:
```bash
uvicorn main:app --reload --port 8000
```

The schema is auto-applied on first startup.

### 3. Frontend

```bash
cd bloomberg-mvp/frontend
npm install
npm run dev        # runs on http://localhost:3000
```

---

## Usage

1. Open http://localhost:3000
2. Type a ticker (`AAPL`, `TSLA`) or company name
3. Press **SEARCH** or click a quick-link
4. Dashboard loads: overview · financials chart · SEC filings with AI summaries · news feed · AI investment signal

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/search?q=AAPL` | Search companies |
| GET | `/api/v1/company/{ticker}` | Full company dashboard data |
| GET | `/api/v1/company/{ticker}?refresh=true` | Force-refresh (bypass cache) |
| GET | `/api/v1/company/{ticker}/financials` | Raw financials only |
| GET | `/health` | Health check |

---

## Data Sources

| Source | What | Cost |
|--------|------|------|
| SEC EDGAR API | CIK resolution, 10-K/10-Q filings | Free |
| Yahoo Finance (yfinance) | Stock quotes, multi-year financials, news | Free |
| Wikipedia REST API | Company descriptions | Free |
| NewsAPI | News headlines | Free (100 req/day) |
| Claude Sonnet (Anthropic) | Filing summarisation, investment signals | Paid per token |
