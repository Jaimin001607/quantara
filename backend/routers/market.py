"""
Market-wide data router — news feed and big insider trades.
"""
import os
import time
from datetime import datetime, timedelta
from typing import List, Dict, Any

import httpx
from fastapi import APIRouter

router = APIRouter()

BASE    = "https://finnhub.io/api/v1"
TIMEOUT = 10


def _key() -> str:
    return os.getenv("FINNHUB_API_KEY", "")


def _get(path: str, params: dict = {}) -> Any:
    try:
        params["token"] = _key()
        r = httpx.get(f"{BASE}{path}", params=params, timeout=TIMEOUT)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        print(f"[Market] {path} error: {e}")
        return None


# Major S&P 500 stocks to scan for insider trades
_WATCH_TICKERS = [
    "AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "META", "TSLA",
    "JPM",  "BAC",  "V",    "WMT",  "XOM",   "AVGO", "BRK-B",
    "JNJ",  "PG",   "MA",   "HD",   "MRK",   "CVX",
]

_TRADE_CODES = {"P": "BUY", "S": "SELL"}


@router.get("/market/news")
def get_market_news():
    """General market news from Finnhub — last 48 hours."""
    data = _get("/news", {"category": "general", "minId": 0})
    if not data or not isinstance(data, list):
        return []

    cutoff = time.time() - 48 * 3600
    results = []
    for item in data:
        if item.get("datetime", 0) < cutoff:
            continue
        results.append({
            "id":        item.get("id"),
            "headline":  item.get("headline", ""),
            "source":    item.get("source", ""),
            "url":       item.get("url", ""),
            "image":     item.get("image", ""),
            "summary":   item.get("summary", ""),
            "datetime":  item.get("datetime"),
            "related":   item.get("related", ""),
        })
    return results[:30]


@router.get("/market/big-trades")
def get_big_trades():
    """
    Largest insider transactions across major S&P 500 stocks in the last 30 days.
    Filters for transactions > $500k value, sorted by absolute dollar value.
    """
    date_from = (datetime.utcnow() - timedelta(days=30)).strftime("%Y-%m-%d")
    date_to   = datetime.utcnow().strftime("%Y-%m-%d")

    trades: List[Dict[str, Any]] = []

    for ticker in _WATCH_TICKERS:
        data = _get("/stock/insider-transactions", {
            "symbol": ticker,
            "from":   date_from,
            "to":     date_to,
        })
        if not data or not isinstance(data.get("data"), list):
            continue

        for tx in data["data"]:
            shares = tx.get("share") or 0
            price  = tx.get("transactionPrice") or 0
            code   = tx.get("transactionCode", "")
            if code not in _TRADE_CODES or shares <= 0 or price <= 0:
                continue
            value = abs(shares * price)
            if value < 500_000:
                continue

            # Calculate days between transaction and SEC filing
            tx_date   = tx.get("transactionDate", "")
            file_date = tx.get("filingDate", "")
            days_to_file = None
            try:
                from datetime import datetime as dt
                d1 = dt.strptime(tx_date,  "%Y-%m-%d")
                d2 = dt.strptime(file_date, "%Y-%m-%d")
                days_to_file = (d2 - d1).days
            except Exception:
                pass

            name = tx.get("name", "").strip() or "Anonymous"

            trades.append({
                "ticker":       ticker,
                "name":         name,
                "action":       _TRADE_CODES[code],
                "shares":       int(shares),
                "price":        round(price, 2),
                "value":        round(value),
                "date":         tx_date,
                "filing_date":  file_date,
                "days_to_file": days_to_file,
                "source":       "SEC Form 4 (Insider Disclosure)",
            })

    # Deduplicate: keep only the largest trade per (ticker, person) pair
    seen: dict = {}
    for t in sorted(trades, key=lambda x: x["value"], reverse=True):
        key = f"{t['ticker']}:{t['name']}"
        if key not in seen:
            seen[key] = t

    deduped = list(seen.values())
    # Sort by value descending, cap at $5B to filter auto-reported trust holdings
    deduped = [t for t in deduped if t["value"] <= 5_000_000_000]
    deduped.sort(key=lambda x: x["value"], reverse=True)
    return deduped[:20]
