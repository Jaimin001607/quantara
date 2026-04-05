"""
Cache helpers — read/write company data to PostgreSQL.
TTL: 1 hour for quotes, 24 hours for everything else.
"""
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List

from sqlalchemy.orm import Session
from sqlalchemy import text


QUOTE_TTL_MINUTES   = 60
COMPANY_TTL_MINUTES = 60 * 24
NEWS_TTL_MINUTES    = 60
FILING_TTL_MINUTES  = 60 * 24


def _is_fresh(fetched_at: Optional[datetime], ttl_minutes: int) -> bool:
    if fetched_at is None:
        return False
    return datetime.utcnow() - fetched_at < timedelta(minutes=ttl_minutes)


# ── Company ──────────────────────────────────────────────────────────────────

def get_cached_company(db: Session, ticker: str) -> Optional[Dict[str, Any]]:
    row = db.execute(
        text("SELECT * FROM companies WHERE ticker = :t"), {"t": ticker.upper()}
    ).fetchone()
    if row is None:
        return None
    d = dict(row._mapping)
    if not _is_fresh(d.get("fetched_at"), COMPANY_TTL_MINUTES):
        return None
    return d


def upsert_company(db: Session, ticker: str, data: Dict[str, Any]):
    ticker = ticker.upper()
    db.execute(
        text("""
        INSERT INTO companies (ticker, name, sector, industry, description, cik, website, employees, fetched_at)
        VALUES (:ticker, :name, :sector, :industry, :description, :cik, :website, :employees, NOW())
        ON CONFLICT (ticker) DO UPDATE SET
            name = EXCLUDED.name, sector = EXCLUDED.sector, industry = EXCLUDED.industry,
            description = EXCLUDED.description, cik = EXCLUDED.cik, website = EXCLUDED.website,
            employees = EXCLUDED.employees, fetched_at = EXCLUDED.fetched_at
        """),
        {
            "ticker":      ticker,
            "name":        data.get("name"),
            "sector":      data.get("sector"),
            "industry":    data.get("industry"),
            "description": data.get("description"),
            "cik":         data.get("cik"),
            "website":     data.get("website"),
            "employees":   data.get("employees"),
        },
    )
    db.commit()


# ── Quotes ───────────────────────────────────────────────────────────────────

def get_cached_quote(db: Session, ticker: str) -> Optional[Dict[str, Any]]:
    row = db.execute(
        text("SELECT * FROM stock_quotes WHERE ticker = :t ORDER BY fetched_at DESC LIMIT 1"),
        {"t": ticker.upper()},
    ).fetchone()
    if row is None:
        return None
    d = dict(row._mapping)
    if not _is_fresh(d.get("fetched_at"), QUOTE_TTL_MINUTES):
        return None
    return d


def upsert_quote(db: Session, ticker: str, data: Dict[str, Any]):
    db.execute(
        text("""
        INSERT INTO stock_quotes
            (ticker, price, open, high, low, volume, market_cap, pe_ratio, week_52_high, week_52_low, fetched_at)
        VALUES
            (:ticker, :price, :open, :high, :low, :volume, :market_cap, :pe_ratio, :week_52_high, :week_52_low, NOW())
        """),
        {
            "ticker":      ticker.upper(),
            "price":       data.get("price"),
            "open":        data.get("open"),
            "high":        data.get("high"),
            "low":         data.get("low"),
            "volume":      data.get("volume"),
            "market_cap":  data.get("market_cap"),
            "pe_ratio":    data.get("pe_ratio"),
            "week_52_high": data.get("week_52_high"),
            "week_52_low":  data.get("week_52_low"),
        },
    )
    db.commit()


# ── Filings ───────────────────────────────────────────────────────────────────

def get_cached_filings(db: Session, ticker: str) -> Optional[List[Dict[str, Any]]]:
    rows = db.execute(
        text("""
        SELECT * FROM sec_filings WHERE ticker = :t
        ORDER BY filing_date DESC LIMIT 10
        """),
        {"t": ticker.upper()},
    ).fetchall()
    if not rows:
        return None
    first_fetched = dict(rows[0]._mapping).get("fetched_at")
    if not _is_fresh(first_fetched, FILING_TTL_MINUTES):
        return None
    return [dict(r._mapping) for r in rows]


def upsert_filings(db: Session, ticker: str, filings: List[Dict[str, Any]]):
    ticker = ticker.upper()
    for f in filings:
        db.execute(
            text("""
            INSERT INTO sec_filings (ticker, form_type, filing_date, description, url, ai_summary, fetched_at)
            VALUES (:ticker, :form_type, :filing_date, :description, :url, :ai_summary, NOW())
            ON CONFLICT DO NOTHING
            """),
            {
                "ticker":       ticker,
                "form_type":    f.get("form_type"),
                "filing_date":  f.get("filing_date"),
                "description":  f.get("description"),
                "url":          f.get("url"),
                "ai_summary":   f.get("ai_summary"),
            },
        )
    db.commit()


# ── News ──────────────────────────────────────────────────────────────────────

def get_cached_news(db: Session, ticker: str) -> Optional[List[Dict[str, Any]]]:
    rows = db.execute(
        text("""
        SELECT * FROM news_articles WHERE ticker = :t
        ORDER BY published_at DESC LIMIT 15
        """),
        {"t": ticker.upper()},
    ).fetchall()
    if not rows:
        return None
    first_fetched = dict(rows[0]._mapping).get("fetched_at")
    if not _is_fresh(first_fetched, NEWS_TTL_MINUTES):
        return None
    return [dict(r._mapping) for r in rows]


def upsert_news(db: Session, ticker: str, articles: List[Dict[str, Any]]):
    ticker = ticker.upper()
    for a in articles:
        db.execute(
            text("""
            INSERT INTO news_articles (ticker, title, source, url, published_at, sentiment, fetched_at)
            VALUES (:ticker, :title, :source, :url, :published_at, :sentiment, NOW())
            ON CONFLICT DO NOTHING
            """),
            {
                "ticker":       ticker,
                "title":        a.get("title"),
                "source":       a.get("source"),
                "url":          a.get("url"),
                "published_at": a.get("published_at"),
                "sentiment":    a.get("sentiment"),
            },
        )
    db.commit()


# ── AI Analysis ───────────────────────────────────────────────────────────────

def get_cached_analysis(db: Session, ticker: str) -> Optional[Dict[str, Any]]:
    row = db.execute(
        text("""
        SELECT * FROM ai_analyses WHERE ticker = :t
        ORDER BY created_at DESC LIMIT 1
        """),
        {"t": ticker.upper()},
    ).fetchone()
    if row is None:
        return None
    d = dict(row._mapping)
    if not _is_fresh(d.get("created_at"), COMPANY_TTL_MINUTES):
        return None
    return d


def upsert_analysis(db: Session, ticker: str, signal: str, analysis: str):
    db.execute(
        text("""
        INSERT INTO ai_analyses (ticker, signal, analysis, created_at)
        VALUES (:ticker, :signal, :analysis, NOW())
        """),
        {"ticker": ticker.upper(), "signal": signal, "analysis": analysis},
    )
    db.commit()
