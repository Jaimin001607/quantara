"""
Finnhub service — replaces Yahoo Finance for quotes, company profile, and financials.
Free tier: 60 requests/min. https://finnhub.io
"""
import os
import httpx
from typing import Optional, Dict, Any
from datetime import datetime, timedelta

BASE = "https://finnhub.io/api/v1"
TIMEOUT = 10


def _key() -> str:
    return os.getenv("FINNHUB_API_KEY", "")


def _get(path: str, params: dict = {}) -> Optional[Dict]:
    try:
        params["token"] = _key()
        r = httpx.get(f"{BASE}{path}", params=params, timeout=TIMEOUT)
        r.raise_for_status()
        data = r.json()
        # Finnhub returns {} or {"error": ...} on bad requests
        if isinstance(data, dict) and data.get("error"):
            print(f"[Finnhub] API error: {data['error']}")
            return None
        return data
    except Exception as e:
        print(f"[Finnhub] request error {path}: {e}")
        return None


def get_quote(ticker: str) -> Optional[Dict[str, Any]]:
    q = _get("/quote", {"symbol": ticker})
    if not q or q.get("c") is None:
        return None

    price     = q.get("c")   # current price
    prev      = q.get("pc")  # previous close
    change_pct = round((price - prev) / prev * 100, 2) if price and prev and prev != 0 else None

    # Basic financials for market cap / PE
    metrics_data = _get("/stock/metric", {"symbol": ticker, "metric": "all"})
    metric = (metrics_data or {}).get("metric", {})

    return {
        "ticker":       ticker.upper(),
        "price":        price,
        "open":         q.get("o"),
        "high":         q.get("h"),
        "low":          q.get("l"),
        "volume":       None,
        "market_cap":   (metric.get("marketCapitalization") or 0) * 1_000_000 or None,
        "pe_ratio":     metric.get("peTTM"),
        "week_52_high": metric.get("52WeekHigh"),
        "week_52_low":  metric.get("52WeekLow"),
        "change_pct":   change_pct,
    }


def get_company_meta(ticker: str) -> Optional[Dict[str, Any]]:
    profile = _get("/stock/profile2", {"symbol": ticker})
    if not profile:
        return {"name": ticker.upper()}

    raw_industry = profile.get("finnhubIndustry") or ""
    # Derive a broad sector from the industry label
    sector_map = {
        "Technology": ["Software","Semiconductor","Hardware","Internet","Tech","IT","Cloud","AI","Data"],
        "Finance": ["Banking","Financial","Insurance","Investment","Capital","Asset","Mortgage"],
        "Healthcare": ["Pharma","Biotech","Medical","Health","Drug","Hospital","Diagnostic"],
        "Consumer": ["Retail","Consumer","Food","Beverage","Apparel","Auto","E-commerce"],
        "Energy": ["Oil","Gas","Energy","Utilities","Power","Mining","Coal","Renewable"],
        "Industrials": ["Industrial","Manufacturing","Aerospace","Defense","Transport","Logistics"],
        "Real Estate": ["REIT","Real Estate","Property"],
        "Telecom": ["Telecom","Wireless","Cable","Media","Communication"],
    }
    sector = raw_industry
    for broad, keywords in sector_map.items():
        if any(kw.lower() in raw_industry.lower() for kw in keywords):
            sector = broad
            break

    return {
        "name":        profile.get("name") or ticker.upper(),
        "sector":      sector or raw_industry or None,
        "industry":    raw_industry or None,
        "description": None,   # Finnhub free tier doesn't include description
        "website":     profile.get("weburl"),
        "employees":   int(profile["employeeTotal"]) if profile.get("employeeTotal") else None,
        "hq_city":     None,
        "hq_state":    None,
        "hq_country":  profile.get("country"),
        "logo":        profile.get("logo"),
        "exchange":    profile.get("exchange"),
        "ipo":         profile.get("ipo"),
    }


def get_financials(ticker: str) -> Optional[Dict[str, Any]]:
    """
    Pull annual financial statements from Finnhub.
    Returns revenue, net_income, total_assets, total_liab keyed by fiscal year.
    """
    data = _get("/stock/financials-reported", {
        "symbol": ticker,
        "freq":   "annual",
    })
    if not data:
        return None

    reports = data.get("data", [])
    if not reports:
        return None

    revenue      = {}
    net_income   = {}
    total_assets = {}
    total_liab   = {}

    for report in reports[:4]:   # last 4 years
        year = str(report.get("year", ""))
        if not year:
            continue

        # Income statement
        ic = report.get("report", {}).get("ic", [])
        for item in ic:
            concept = item.get("concept", "")
            val     = item.get("value")
            if concept in ("us-gaap_Revenues", "us-gaap_RevenueFromContractWithCustomerExcludingAssessedTax",
                           "us-gaap_SalesRevenueNet"):
                revenue[year] = val
            if concept == "us-gaap_NetIncomeLoss":
                net_income[year] = val

        # Balance sheet
        bs = report.get("report", {}).get("bs", [])
        for item in bs:
            concept = item.get("concept", "")
            val     = item.get("value")
            if concept == "us-gaap_Assets":
                total_assets[year] = val
            if concept in ("us-gaap_Liabilities", "us-gaap_LiabilitiesAndStockholdersEquity"):
                if year not in total_liab:
                    total_liab[year] = val

    # Fallback: use basic metrics if reported financials empty
    if not revenue:
        metrics_data = _get("/stock/metric", {"symbol": ticker, "metric": "all"})
        m = (metrics_data or {}).get("metric", {})
        current_year = str(datetime.utcnow().year)
        if m.get("revenuePerShareTTM"):
            # rough estimate — not ideal but better than nothing
            pass

    return {
        "revenue":      revenue,
        "net_income":   net_income,
        "total_assets": total_assets,
        "total_liab":   total_liab,
    }


def get_price_history_28d(ticker: str) -> Optional[Dict[str, Any]]:
    """Fetch 28-day daily candles from Finnhub for AI signal context."""
    import time
    now   = int(time.time())
    from_ = now - 28 * 86400
    data  = _get("/stock/candle", {"symbol": ticker, "resolution": "D", "from": from_, "to": now})
    if not data or data.get("s") != "ok":
        return None
    closes = data.get("c", [])
    dates  = data.get("t", [])
    if not closes:
        return None
    start_price = closes[0]
    end_price   = closes[-1]
    pct_change  = round((end_price - start_price) / start_price * 100, 2) if start_price else 0
    high_28  = max(data.get("h", closes))
    low_28   = min(data.get("l", closes))
    return {
        "start_price":  start_price,
        "end_price":    end_price,
        "pct_change_28d": pct_change,
        "high_28d":     high_28,
        "low_28d":      low_28,
        "days":         len(closes),
    }


_YF_CHART = "https://query1.finance.yahoo.com/v8/finance/chart"
_YF_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    "Accept": "application/json",
}

_RESOLUTION_MAP = {
    "H": ("5m",  "1d"),    # 5-min bars, full trading day
    "D": ("1d",  "2y"),    # daily, 2-year default
    "W": ("1wk", "10y"),   # weekly, 10-year
    "M": ("1mo", "max"),   # monthly, all time
}


def get_price_candles(ticker: str, resolution: str = "M") -> Optional[Dict[str, Any]]:
    """
    Fetch full historical OHLC price data from Yahoo Finance chart API.
    Free, no API key required, works for any ticker with full lifetime history.
    resolution: D=daily, W=weekly, M=monthly (default monthly for max history)
    """
    interval, range_ = _RESOLUTION_MAP.get(resolution, ("1mo", "max"))
    try:
        url = f"{_YF_CHART}/{ticker}"
        r = httpx.get(url, params={"interval": interval, "range": range_}, headers=_YF_HEADERS, timeout=TIMEOUT)
        r.raise_for_status()
        data = r.json()

        result = data.get("chart", {}).get("result", [])
        if not result:
            return None
        chart = result[0]

        timestamps = chart.get("timestamp", [])
        quotes     = chart.get("indicators", {}).get("quote", [{}])[0]
        closes     = quotes.get("close", [])
        opens      = quotes.get("open", [])
        highs      = quotes.get("high", [])
        lows       = quotes.get("low", [])
        volumes    = quotes.get("volume", [])

        # Adjclose for split/dividend-adjusted close
        adjclose_list = chart.get("indicators", {}).get("adjclose", [{}])
        adjcloses = adjclose_list[0].get("adjclose", []) if adjclose_list else []

        is_intraday = resolution in ("H",)
        points = []
        for i, ts in enumerate(timestamps):
            c = (adjcloses[i] if i < len(adjcloses) and adjcloses[i] else
                 closes[i]    if i < len(closes)    and closes[i]    else None)
            if c is None:
                continue
            dt = datetime.utcfromtimestamp(ts)
            date_str = dt.strftime("%Y-%m-%dT%H:%M") if is_intraday else dt.strftime("%Y-%m-%d")
            points.append({
                "date":   date_str,
                "close":  round(c, 4),
                "open":   round(opens[i], 4)   if i < len(opens)   and opens[i]   else None,
                "high":   round(highs[i], 4)   if i < len(highs)   and highs[i]   else None,
                "low":    round(lows[i], 4)    if i < len(lows)    and lows[i]    else None,
                "volume": int(volumes[i])      if i < len(volumes) and volumes[i] else None,
            })

        if not points:
            return None

        first_price = points[0]["close"]
        last_price  = points[-1]["close"]
        pct_change  = round((last_price - first_price) / first_price * 100, 2) if first_price else 0

        return {
            "ticker":      ticker,
            "resolution":  resolution,
            "points":      points,
            "count":       len(points),
            "first_date":  points[0]["date"],
            "last_date":   points[-1]["date"],
            "first_price": first_price,
            "last_price":  last_price,
            "pct_change":  pct_change,
        }
    except Exception as e:
        print(f"[Yahoo] price candles error {ticker}: {e}")
        return None


def get_news_yf(ticker: str) -> list:
    """Fetch company news from Finnhub."""
    to_date   = datetime.utcnow().strftime("%Y-%m-%d")
    from_date = (datetime.utcnow() - timedelta(days=7)).strftime("%Y-%m-%d")
    data = _get("/company-news", {
        "symbol": ticker,
        "from":   from_date,
        "to":     to_date,
    })
    if not data or not isinstance(data, list):
        return []
    return data[:10]
