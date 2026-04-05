"""
News service — latest headlines via NewsAPI (free tier).
Falls back to scraping Yahoo Finance news if NEWS_API_KEY is absent.
"""
import os
import httpx
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta

NEWS_API_KEY = os.getenv("NEWS_API_KEY", "")
TIMEOUT = 10


def _sentiment_label(title: str) -> str:
    """Very simple keyword-based sentiment on a headline."""
    title_lower = title.lower()
    positive_kw = ["beat", "surge", "jump", "record", "growth", "profit", "gain",
                   "rise", "rally", "upgrade", "strong", "positive", "bull"]
    negative_kw = ["miss", "fall", "drop", "loss", "decline", "cut", "lawsuit",
                   "recall", "crash", "down", "bear", "layoff", "deficit", "sell"]
    pos = sum(w in title_lower for w in positive_kw)
    neg = sum(w in title_lower for w in negative_kw)
    if pos > neg:
        return "positive"
    if neg > pos:
        return "negative"
    return "neutral"


def _fetch_newsapi(query: str, page_size: int = 10) -> List[Dict[str, Any]]:
    try:
        from_date = (datetime.utcnow() - timedelta(days=7)).strftime("%Y-%m-%d")
        r = httpx.get(
            "https://newsapi.org/v2/everything",
            params={
                "q":        query,
                "from":     from_date,
                "sortBy":   "publishedAt",
                "pageSize": page_size,
                "language": "en",
                "apiKey":   NEWS_API_KEY,
            },
            timeout=TIMEOUT,
        )
        r.raise_for_status()
        articles = r.json().get("articles", [])
        results = []
        for a in articles:
            pub = a.get("publishedAt")
            try:
                pub_dt = datetime.fromisoformat(pub.replace("Z", "+00:00")) if pub else None
            except Exception:
                pub_dt = None
            title = a.get("title", "")
            results.append({
                "title":        title,
                "source":       a.get("source", {}).get("name"),
                "url":          a.get("url"),
                "published_at": pub_dt.isoformat() if pub_dt else None,
                "sentiment":    _sentiment_label(title),
            })
        return results
    except Exception as e:
        print(f"[News] NewsAPI error: {e}")
        return []


def _fetch_yahoo_news(ticker: str) -> List[Dict[str, Any]]:
    """Fetch news via Finnhub."""
    try:
        from services.yahoo import get_news_yf
        news_raw = get_news_yf(ticker)
        results = []
        for item in news_raw:
            title  = item.get("headline", "") or item.get("title", "")
            pub_ts = item.get("datetime")
            pub_dt = datetime.utcfromtimestamp(pub_ts).isoformat() if pub_ts else None
            if title:
                results.append({
                    "title":        title,
                    "source":       item.get("source"),
                    "url":          item.get("url"),
                    "published_at": pub_dt,
                    "sentiment":    _sentiment_label(title),
                })
        return results
    except Exception as e:
        print(f"[News] Finnhub fallback error: {e}")
        return []


def get_news(ticker: str, company_name: str) -> List[Dict[str, Any]]:
    if NEWS_API_KEY:
        articles = _fetch_newsapi(f"{company_name} {ticker} stock")
        if articles:
            return articles
    return _fetch_yahoo_news(ticker)


def aggregate_sentiment(articles: List[Dict[str, Any]]) -> Dict[str, Any]:
    if not articles:
        return {"positive": 0, "neutral": 0, "negative": 0, "overall": "neutral"}
    counts = {"positive": 0, "neutral": 0, "negative": 0}
    for a in articles:
        s = a.get("sentiment", "neutral")
        counts[s] = counts.get(s, 0) + 1
    total = len(articles)
    overall = max(counts, key=counts.get)
    return {
        "positive": round(counts["positive"] / total * 100),
        "neutral":  round(counts["neutral"]  / total * 100),
        "negative": round(counts["negative"] / total * 100),
        "overall":  overall,
    }
