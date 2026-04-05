"""
Company router — all endpoints for the Bloomberg MVP platform.
"""
import json
from typing import Optional, List
from concurrent.futures import ThreadPoolExecutor, as_completed

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text

from database.connection import get_db
from models.schemas import CompanyFull, CompanyBase, StockQuote, Filing, NewsArticle, AIAnalysis
from services import yahoo, sec, news as news_svc, ai_service
from services import cache

router = APIRouter()


# ── Search (SEC index + fuzzy matching) ──────────────────────────────────────

@router.get("/search")
def search_companies(q: str = Query(..., min_length=1), db: Session = Depends(get_db)):
    """
    Smart search: queries SEC index with fuzzy trigram matching.
    Exact ticker match is returned first, then name similarity.
    """
    q_clean = q.strip()
    q_upper = q_clean.upper()

    # 1. Exact ticker match in sec_index
    try:
        exact = db.execute(
            text("SELECT ticker, name, cik FROM sec_index WHERE ticker = :t LIMIT 1"),
            {"t": q_upper},
        ).fetchone()
        if exact:
            return [dict(exact._mapping)]
    except Exception:
        pass

    # 2. Fuzzy search via pg_trgm (requires sec_index populated)
    try:
        rows = db.execute(
            text("""
                SELECT ticker, name, cik,
                       GREATEST(
                           similarity(ticker, :q_upper),
                           similarity(name,   :q_clean)
                       ) AS score
                FROM sec_index
                WHERE ticker % :q_upper OR name % :q_clean
                ORDER BY score DESC
                LIMIT 10
            """),
            {"q_upper": q_upper, "q_clean": q_clean},
        ).fetchall()
        if rows:
            return [{"ticker": r.ticker, "name": r.name, "cik": r.cik} for r in rows]
    except Exception:
        pass

    # 3. Fallback: ILIKE on companies cache
    try:
        rows = db.execute(
            text("SELECT ticker, name, sector, industry FROM companies WHERE ticker ILIKE :q OR name ILIKE :q LIMIT 10"),
            {"q": f"%{q_clean}%"},
        ).fetchall()
        if rows:
            return [dict(r._mapping) for r in rows]
    except Exception:
        pass

    # 4. Last resort: ask Finnhub directly
    try:
        meta = yahoo.get_company_meta(q_upper)
        if meta and meta.get("name") and meta["name"] != q_upper:
            return [{"ticker": q_upper, "name": meta.get("name"), "sector": meta.get("sector"), "industry": meta.get("industry")}]
    except Exception:
        pass

    return []


# ── Company Profile ───────────────────────────────────────────────────────────

@router.get("/company/{ticker}", response_model=CompanyFull)
def get_company(ticker: str, refresh: bool = False, db: Session = Depends(get_db)):
    ticker = ticker.upper().strip()

    # ── Fetch all data in parallel ────────────────────────────────────────────
    company_data  = None if refresh else cache.get_cached_company(db, ticker)
    quote_data    = None if refresh else cache.get_cached_quote(db, ticker)
    cached_news   = None if refresh else cache.get_cached_news(db, ticker)
    cached_filings = None if refresh else cache.get_cached_filings(db, ticker)

    needs_meta     = company_data is None
    needs_quote    = quote_data is None
    needs_news     = cached_news is None
    needs_filings  = cached_filings is None

    financials = None

    with ThreadPoolExecutor(max_workers=6) as pool:
        futures = {}
        if needs_meta:
            futures["meta"]       = pool.submit(yahoo.get_company_meta, ticker)
        if needs_quote:
            futures["quote"]      = pool.submit(yahoo.get_quote, ticker)
        if needs_news:
            futures["news"]       = pool.submit(news_svc.get_news, ticker, ticker)
        futures["financials"]     = pool.submit(yahoo.get_financials, ticker)
        futures["cik"]            = pool.submit(sec.resolve_cik, ticker)

        results = {k: f.result() for k, f in futures.items()}

    financials = results.get("financials")
    cik        = results.get("cik")

    # ── Company meta ──────────────────────────────────────────────────────────
    if needs_meta:
        yf_meta = results.get("meta") or {}
        if not yf_meta.get("name"):
            raise HTTPException(status_code=404, detail=f"Company '{ticker}' not found.")
        company_data = {
            "ticker":      ticker,
            "name":        yf_meta.get("name"),
            "sector":      yf_meta.get("sector"),
            "industry":    yf_meta.get("industry"),
            "description": yf_meta.get("description"),
            "website":     yf_meta.get("website"),
            "employees":   yf_meta.get("employees"),
            "cik":         cik,
        }
        cache.upsert_company(db, ticker, company_data)
    elif cik and not company_data.get("cik"):
        company_data["cik"] = cik

    # Backfill employees: try Finnhub refresh then SEC EDGAR 10-K facts
    if company_data.get("employees") is None:
        emp = None
        if not needs_meta:
            fresh_meta = yahoo.get_company_meta(ticker)
            emp = fresh_meta.get("employees") if fresh_meta else None
        # SEC EDGAR fallback — most accurate source (legally required in 10-K)
        if emp is None and (cik or company_data.get("cik")):
            effective_cik = cik or company_data.get("cik")
            emp = sec.get_employee_count(effective_cik)
        if emp is not None:
            company_data["employees"] = emp
            cache.upsert_company(db, ticker, {**company_data, "cik": cik or company_data.get("cik")})

    company = CompanyBase(**{k: v for k, v in company_data.items() if k in CompanyBase.model_fields})

    # ── Quote ─────────────────────────────────────────────────────────────────
    if needs_quote:
        quote_data = results.get("quote")
        if quote_data:
            cache.upsert_quote(db, ticker, quote_data)
    quote = StockQuote(**quote_data) if quote_data else None

    # ── SEC Filings (no AI summary on first load — too slow) ──────────────────
    filing_objs: List[Filing] = []
    if cik or company_data.get("cik"):
        effective_cik = cik or company_data.get("cik")
        if needs_filings:
            raw_filings = sec.get_filings(effective_cik, limit=5)
            # Only summarize first 10-K if AI key is available
            import os
            has_ai = bool(os.getenv("ANTHROPIC_API_KEY", "").startswith("sk-ant-api"))
            for i, f in enumerate(raw_filings):
                ai_summary = None
                if has_ai and i == 0 and f.get("form_type") == "10-K" and f.get("url"):
                    try:
                        filing_text = sec.fetch_filing_text(f["url"], max_chars=5000)
                        if filing_text:
                            ai_summary = ai_service.summarise_filing(filing_text, f.get("form_type", "10-K"))
                    except Exception as e:
                        print(f"[Router] filing summary error: {e}")
                f["ai_summary"] = ai_summary
            cache.upsert_filings(db, ticker, raw_filings)
            cached_filings = raw_filings

        for f in (cached_filings or []):
            filing_objs.append(Filing(
                ticker=ticker,
                form_type=f.get("form_type"),
                filing_date=str(f.get("filing_date")) if f.get("filing_date") else None,
                description=f.get("description"),
                url=f.get("url"),
                ai_summary=f.get("ai_summary"),
            ))

    # ── News ──────────────────────────────────────────────────────────────────
    if needs_news:
        raw_articles = results.get("news") or []
        cache.upsert_news(db, ticker, raw_articles)
    else:
        raw_articles = cached_news or []

    news_objs = [
        NewsArticle(
            ticker=ticker,
            title=a.get("title"),
            source=a.get("source"),
            url=a.get("url"),
            published_at=a.get("published_at"),
            sentiment=a.get("sentiment"),
        )
        for a in raw_articles
    ]

    # ── AI Investment Signal ──────────────────────────────────────────────────
    import os
    has_ai = bool(os.getenv("ANTHROPIC_API_KEY", "").startswith("sk-ant-api"))

    cached_analysis = None if refresh else cache.get_cached_analysis(db, ticker)

    # Invalidate stale "Insufficient data" cache entries
    if cached_analysis:
        try:
            cached_parsed = json.loads(cached_analysis.get("analysis", "{}"))
            if "Insufficient" in cached_parsed.get("reasoning", "") or cached_analysis.get("signal") == "N/A":
                cached_analysis = None  # force regeneration
        except Exception:
            cached_analysis = None

    if cached_analysis:
        ai_analysis = AIAnalysis(
            ticker=ticker,
            signal=cached_analysis.get("signal", "HOLD"),
            analysis=cached_analysis.get("analysis", ""),
        )
    elif has_ai:
        sentiment_summary = news_svc.aggregate_sentiment(raw_articles)
        filing_summary    = filing_objs[0].ai_summary if filing_objs else None
        # Fetch 28-day price history for better signal
        price_history = yahoo.get_price_history_28d(ticker)
        signal_result = ai_service.generate_investment_signal(
            company_name=company_data.get("name", ticker),
            ticker=ticker,
            financials=financials,
            news_sentiment=sentiment_summary,
            filing_summary=filing_summary,
            price_history=price_history,
        )
        analysis_json = json.dumps(signal_result)
        cache.upsert_analysis(db, ticker, signal_result.get("signal", "HOLD"), analysis_json)
        ai_analysis = AIAnalysis(
            ticker=ticker,
            signal=signal_result.get("signal", "HOLD"),
            analysis=analysis_json,
        )
    else:
        no_ai = json.dumps({"signal": "N/A", "confidence": 0, "reasoning": "Add ANTHROPIC_API_KEY to .env to enable AI signals."})
        ai_analysis = AIAnalysis(ticker=ticker, signal="N/A", analysis=no_ai)

    return CompanyFull(
        company=company,
        quote=quote,
        filings=filing_objs,
        news=news_objs,
        ai_analysis=ai_analysis,
        financials=financials,
    )


# ── Financials standalone ─────────────────────────────────────────────────────

@router.get("/company/{ticker}/financials")
def get_financials(ticker: str):
    data = yahoo.get_financials(ticker.upper())
    if not data:
        raise HTTPException(status_code=404, detail="No financial data found.")
    return data


# ── Price chart (full history) ───────────────────────────────────────────────

@router.get("/company/{ticker}/price-chart")
def get_price_chart(
    ticker: str,
    resolution: str = Query("M", pattern="^(D|W|M)$"),
):
    """
    Full historical OHLC data for charting.
    resolution: D=daily, W=weekly, M=monthly (default monthly for max history)
    """
    data = yahoo.get_price_candles(ticker.upper(), resolution=resolution)
    if not data:
        raise HTTPException(status_code=404, detail="No price history available for this ticker.")
    return data


# ── Supply Chain (additive, never breaks main flow) ───────────────────────────

@router.get("/company/{ticker}/supply-chain")
def get_supply_chain(ticker: str, db: Session = Depends(get_db)):
    from services.supply_chain import get_supply_chain
    try:
        data = get_supply_chain(ticker.upper(), db)
        return {"ticker": ticker.upper(), "relationships": data}
    except Exception as e:
        print(f"[Router] supply chain error: {e}")
        return {"ticker": ticker.upper(), "relationships": []}
