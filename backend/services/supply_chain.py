"""
Supply Chain Service — extracts supplier/customer/competitor relationships.
Sources: static seed data → SEC 10-K text parsing → Claude AI (if available).
Works for ANY public company — no AI credits required for core extraction.
"""
import os
import re
import json
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text

# Static seed data for major companies
KNOWN_RELATIONSHIPS: Dict[str, List[Dict[str, str]]] = {
    "AAPL": [
        {"ticker": "TSM",   "name": "TSMC",            "relationship": "supplier",   "detail": "Chip fabrication (A-series, M-series)"},
        {"ticker": "QCOM",  "name": "Qualcomm",        "relationship": "supplier",   "detail": "5G modems"},
        {"ticker": "SONY",  "name": "Sony",            "relationship": "supplier",   "detail": "Camera image sensors"},
        {"ticker": "GOOGL", "name": "Alphabet",        "relationship": "competitor", "detail": "Android / Pixel"},
        {"ticker": "MSFT",  "name": "Microsoft",       "relationship": "competitor", "detail": "Enterprise software"},
        {"ticker": "AMZN",  "name": "Amazon",          "relationship": "competitor", "detail": "Tablets / cloud services"},
    ],
    "TSLA": [
        {"ticker": "PANAF", "name": "Panasonic",       "relationship": "supplier",   "detail": "Battery cells (Gigafactory)"},
        {"ticker": "ALB",   "name": "Albemarle",       "relationship": "supplier",   "detail": "Lithium supply"},
        {"ticker": "GM",    "name": "General Motors",  "relationship": "competitor", "detail": "EVs (Silverado EV, Blazer EV)"},
        {"ticker": "F",     "name": "Ford",            "relationship": "competitor", "detail": "EVs (F-150 Lightning, Mustang Mach-E)"},
        {"ticker": "APTV",  "name": "Aptiv",           "relationship": "supplier",   "detail": "Wiring & connectors"},
        {"ticker": "NIO",   "name": "NIO",             "relationship": "competitor", "detail": "Chinese EV market"},
    ],
    "MSFT": [
        {"ticker": "NVDA",  "name": "NVIDIA",          "relationship": "supplier",   "detail": "AI GPUs (Azure infrastructure)"},
        {"ticker": "AAPL",  "name": "Apple",           "relationship": "competitor", "detail": "macOS vs Windows, productivity"},
        {"ticker": "GOOGL", "name": "Alphabet",        "relationship": "competitor", "detail": "Cloud (Azure vs GCP), Search (Bing vs Google)"},
        {"ticker": "AMZN",  "name": "Amazon",          "relationship": "competitor", "detail": "Cloud (Azure vs AWS)"},
        {"ticker": "CRM",   "name": "Salesforce",      "relationship": "competitor", "detail": "Enterprise CRM / Dynamics 365"},
        {"ticker": "ORCL",  "name": "Oracle",          "relationship": "competitor", "detail": "Database & enterprise cloud"},
    ],
    "NVDA": [
        {"ticker": "TSM",   "name": "TSMC",            "relationship": "supplier",   "detail": "GPU fabrication (4nm, 5nm)"},
        {"ticker": "MSFT",  "name": "Microsoft",       "relationship": "customer",   "detail": "Azure AI compute clusters"},
        {"ticker": "GOOGL", "name": "Alphabet",        "relationship": "customer",   "detail": "Google Cloud AI / TPU competition"},
        {"ticker": "META",  "name": "Meta",            "relationship": "customer",   "detail": "AI training infrastructure"},
        {"ticker": "AMZN",  "name": "Amazon",          "relationship": "customer",   "detail": "AWS GPU instances"},
        {"ticker": "AMD",   "name": "AMD",             "relationship": "competitor", "detail": "GPUs (MI300X vs H100)"},
    ],
    "AMZN": [
        {"ticker": "MSFT",  "name": "Microsoft",       "relationship": "competitor", "detail": "Cloud (AWS vs Azure)"},
        {"ticker": "GOOGL", "name": "Alphabet",        "relationship": "competitor", "detail": "Cloud & advertising"},
        {"ticker": "WMT",   "name": "Walmart",         "relationship": "competitor", "detail": "Retail & grocery"},
        {"ticker": "FDX",   "name": "FedEx",           "relationship": "supplier",   "detail": "Last-mile logistics (partially)"},
        {"ticker": "UPS",   "name": "UPS",             "relationship": "supplier",   "detail": "Package delivery"},
        {"ticker": "SHOP",  "name": "Shopify",         "relationship": "competitor", "detail": "E-commerce platform"},
    ],
    "GOOGL": [
        {"ticker": "TSM",   "name": "TSMC",            "relationship": "supplier",   "detail": "TPU chip fabrication"},
        {"ticker": "MSFT",  "name": "Microsoft",       "relationship": "competitor", "detail": "Cloud, Search (Bing AI vs Gemini)"},
        {"ticker": "META",  "name": "Meta",            "relationship": "competitor", "detail": "Digital advertising"},
        {"ticker": "AAPL",  "name": "Apple",           "relationship": "customer",   "detail": "Default search on iOS ($18B/yr)"},
        {"ticker": "AMZN",  "name": "Amazon",          "relationship": "competitor", "detail": "Cloud & voice AI"},
    ],
    "META": [
        {"ticker": "NVDA",  "name": "NVIDIA",          "relationship": "supplier",   "detail": "AI training GPUs"},
        {"ticker": "GOOGL", "name": "Alphabet",        "relationship": "competitor", "detail": "Digital advertising"},
        {"ticker": "SNAP",  "name": "Snap",            "relationship": "competitor", "detail": "Social media"},
        {"ticker": "TIKTOK","name": "TikTok/ByteDance","relationship": "competitor", "detail": "Short-form video & social"},
        {"ticker": "AAPL",  "name": "Apple",           "relationship": "supplier",   "detail": "iOS platform (App Store distribution)"},
    ],
    "JPM": [
        {"ticker": "BAC",   "name": "Bank of America", "relationship": "competitor", "detail": "Retail & investment banking"},
        {"ticker": "GS",    "name": "Goldman Sachs",   "relationship": "competitor", "detail": "Investment banking"},
        {"ticker": "V",     "name": "Visa",            "relationship": "supplier",   "detail": "Payment network"},
        {"ticker": "MA",    "name": "Mastercard",      "relationship": "supplier",   "detail": "Payment network"},
        {"ticker": "MS",    "name": "Morgan Stanley",  "relationship": "competitor", "detail": "Wealth management"},
    ],
    "AMD": [
        {"ticker": "TSM",   "name": "TSMC",            "relationship": "supplier",   "detail": "Chip fabrication (5nm, 4nm)"},
        {"ticker": "NVDA",  "name": "NVIDIA",          "relationship": "competitor", "detail": "GPU & data center AI chips"},
        {"ticker": "INTC",  "name": "Intel",           "relationship": "competitor", "detail": "CPUs & server chips"},
        {"ticker": "MSFT",  "name": "Microsoft",       "relationship": "customer",   "detail": "Azure MI300X deployment"},
        {"ticker": "META",  "name": "Meta",            "relationship": "customer",   "detail": "AI training infrastructure"},
    ],
    "INTC": [
        {"ticker": "AMD",   "name": "AMD",             "relationship": "competitor", "detail": "CPUs & server chips"},
        {"ticker": "NVDA",  "name": "NVIDIA",          "relationship": "competitor", "detail": "AI chips & accelerators"},
        {"ticker": "AAPL",  "name": "Apple",           "relationship": "competitor", "detail": "Apple Silicon (M-series)"},
        {"ticker": "QCOM",  "name": "Qualcomm",        "relationship": "competitor", "detail": "Mobile/embedded chips"},
    ],
    "MCD": [
        {"ticker": "WEN",   "name": "The Wendy's Company", "relationship": "competitor", "detail": "Quick-service restaurants"},
        {"ticker": "QSR",   "name": "Restaurant Brands International", "relationship": "competitor", "detail": "Burger King, Tim Hortons, Popeyes"},
        {"ticker": "YUM",   "name": "Yum! Brands",     "relationship": "competitor", "detail": "KFC, Taco Bell, Pizza Hut"},
        {"ticker": "SBUX",  "name": "Starbucks",       "relationship": "competitor", "detail": "Coffee & beverages"},
        {"ticker": "CMG",   "name": "Chipotle Mexican Grill", "relationship": "competitor", "detail": "Fast casual dining"},
    ],
    "SBUX": [
        {"ticker": "MCD",   "name": "McDonald's",      "relationship": "competitor", "detail": "Coffee & breakfast segment"},
        {"ticker": "DNKN",  "name": "Dunkin' Brands",  "relationship": "competitor", "detail": "Coffee & quick service"},
        {"ticker": "CMG",   "name": "Chipotle",        "relationship": "competitor", "detail": "Fast casual"},
        {"ticker": "NESN",  "name": "Nestlé",          "relationship": "customer",   "detail": "Licensed Starbucks products globally"},
    ],
    "WMT": [
        {"ticker": "AMZN",  "name": "Amazon",          "relationship": "competitor", "detail": "E-commerce & retail"},
        {"ticker": "COST",  "name": "Costco",          "relationship": "competitor", "detail": "Wholesale retail"},
        {"ticker": "TGT",   "name": "Target",          "relationship": "competitor", "detail": "Mass retail"},
        {"ticker": "SHOP",  "name": "Shopify",         "relationship": "competitor", "detail": "E-commerce platform"},
        {"ticker": "PG",    "name": "Procter & Gamble","relationship": "supplier",   "detail": "Consumer goods (top supplier)"},
        {"ticker": "KO",    "name": "Coca-Cola",       "relationship": "supplier",   "detail": "Beverages"},
    ],
    "NFLX": [
        {"ticker": "DIS",   "name": "Walt Disney",     "relationship": "competitor", "detail": "Disney+ streaming"},
        {"ticker": "AMZN",  "name": "Amazon",          "relationship": "competitor", "detail": "Prime Video"},
        {"ticker": "GOOGL", "name": "Alphabet",        "relationship": "competitor", "detail": "YouTube Premium"},
        {"ticker": "AAPL",  "name": "Apple",           "relationship": "competitor", "detail": "Apple TV+"},
        {"ticker": "PARA",  "name": "Paramount Global","relationship": "competitor", "detail": "Paramount+"},
        {"ticker": "AMZN",  "name": "Amazon Web Services", "relationship": "supplier", "detail": "Cloud infrastructure (AWS)"},
    ],
    "DIS": [
        {"ticker": "NFLX",  "name": "Netflix",         "relationship": "competitor", "detail": "Streaming"},
        {"ticker": "AMZN",  "name": "Amazon",          "relationship": "competitor", "detail": "Prime Video & MGM"},
        {"ticker": "PARA",  "name": "Paramount Global","relationship": "competitor", "detail": "Paramount+, CBS"},
        {"ticker": "CMCSA", "name": "Comcast",         "relationship": "competitor", "detail": "Peacock, NBCUniversal, Universal Parks"},
    ],
    "TSM": [
        {"ticker": "AAPL",  "name": "Apple",           "relationship": "customer",   "detail": "A/M-series chips (~25% revenue)"},
        {"ticker": "NVDA",  "name": "NVIDIA",          "relationship": "customer",   "detail": "H100/B100 GPU fabrication"},
        {"ticker": "AMD",   "name": "AMD",             "relationship": "customer",   "detail": "EPYC/Ryzen fabrication"},
        {"ticker": "QCOM",  "name": "Qualcomm",        "relationship": "customer",   "detail": "Snapdragon fabrication"},
        {"ticker": "INTC",  "name": "Intel",           "relationship": "competitor", "detail": "Intel Foundry Services"},
        {"ticker": "SSNLF", "name": "Samsung Electronics", "relationship": "competitor", "detail": "Foundry services"},
    ],
    "BAC": [
        {"ticker": "JPM",   "name": "JPMorgan Chase",  "relationship": "competitor", "detail": "Retail & investment banking"},
        {"ticker": "WFC",   "name": "Wells Fargo",     "relationship": "competitor", "detail": "Retail banking"},
        {"ticker": "GS",    "name": "Goldman Sachs",   "relationship": "competitor", "detail": "Investment banking"},
        {"ticker": "V",     "name": "Visa",            "relationship": "supplier",   "detail": "Payment network"},
        {"ticker": "MA",    "name": "Mastercard",      "relationship": "supplier",   "detail": "Payment network"},
    ],
}

RELATIONSHIP_COLORS = {
    "supplier":   "#2196f3",
    "customer":   "#00c853",
    "competitor": "#ff3d57",
}


def _ai_extract_supply_chain(ticker: str, filing_text: str) -> List[Dict[str, str]]:
    """Use Claude to extract supplier/customer/competitor relationships from a 10-K filing."""
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))
        prompt = f"""You are a financial analyst. Extract supplier, customer, and competitor relationships for {ticker} from this SEC 10-K excerpt.

Return ONLY a JSON array (no markdown, no explanation) with objects like:
[
  {{"ticker": "TSM", "name": "TSMC", "relationship": "supplier", "detail": "Chip fabrication"}},
  ...
]

Rules:
- relationship must be exactly: "supplier", "customer", or "competitor"
- ticker should be the stock ticker if known, else leave empty string
- Extract max 8 relationships
- Only include named companies, not generic mentions

10-K EXCERPT:
{filing_text[:4000]}

Return JSON array only:"""

        msg = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=512,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = msg.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        relationships = json.loads(raw.strip())
        return [r for r in relationships if isinstance(r, dict) and r.get("name")]
    except Exception as e:
        print(f"[SupplyChain] AI extraction error: {e}")
        return []


_SUPPLIER_RE   = re.compile(r'(?:supplier|manufactur|source[d]? from|procure|contract manufacturer|third.party manufacturer|supplied by)', re.IGNORECASE)
_CUSTOMER_RE   = re.compile(r'(?:customer|client|buyer|distributor|resell|sold to|end.user)', re.IGNORECASE)
_COMPETITOR_RE = re.compile(r'(?:compet[ei]|rival|alternative|similar product|competing)', re.IGNORECASE)

# Company name pattern: matches "Foo Corp", "Bar Technologies Inc.", "TSMC", etc.
_COMPANY_RE = re.compile(
    r'\b([A-Z][A-Za-z0-9&\'\-\. ]{1,40}?'
    r'(?:Inc\.?|Corp\.?|Ltd\.?|LLC|Corporation|Technologies|Technology|Systems|'
    r'Semiconductor|Holdings|Group|Platforms|Networks|Laboratories|Labs|Solutions|Software|Electric|Motors))'
    r'\b',
    re.UNICODE,
)


def _text_extract_supply_chain(ticker: str, cik: str, db: Session) -> List[Dict[str, str]]:
    """
    Parse SEC 10-K filing text to extract supply chain relationships.
    Uses regex to find company names near supplier/customer/competitor keywords,
    then validates against sec_index using pg_trgm similarity.
    Works for any public US company — no AI credits needed.
    """
    import httpx
    try:
        from services.sec import get_filings
        HEADERS = {"User-Agent": os.getenv("SEC_USER_AGENT", "bloomberg-mvp contact@example.com")}

        filings = get_filings(cik, form_types=["10-K"], limit=1)
        if not filings or not filings[0].get("url"):
            return []

        r = httpx.get(filings[0]["url"], headers=HEADERS, timeout=30, follow_redirects=True)
        if r.status_code != 200:
            return []

        # Strip HTML to get readable prose (avoids matching tag attributes/metadata)
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(r.text, "lxml")
        for tag in soup(["script", "style", "ix:header", "head"]):
            tag.decompose()
        raw = soup.get_text(separator=" ", strip=True)

        # Focus on the Business/Competition/Suppliers sections (first ~60k chars typically)
        raw = raw[:80000]

        # Classify company name candidates by surrounding context
        candidates: Dict[str, str] = {}  # name → relationship

        for m in _COMPANY_RE.finditer(raw):
            name = m.group(1).strip().rstrip(".")
            if len(name) < 3 or name.upper() == ticker.upper():
                continue
            # Skip generic false positives
            if name.lower() in {"the company", "common stock", "united states", "new york", "fiscal year"}:
                continue

            ctx_start = max(0, m.start() - 250)
            ctx_end   = min(len(raw), m.end() + 250)
            ctx = raw[ctx_start:ctx_end]

            if name in candidates:
                continue  # already classified

            if _SUPPLIER_RE.search(ctx):
                candidates[name] = "supplier"
            elif _CUSTOMER_RE.search(ctx):
                candidates[name] = "customer"
            elif _COMPETITOR_RE.search(ctx):
                candidates[name] = "competitor"

            if len(candidates) >= 60:
                break

        # Validate against sec_index with pg_trgm similarity
        results: List[Dict[str, str]] = []
        seen_tickers: set = set()

        for name, rel in candidates.items():
            if len(results) >= 8:
                break
            try:
                row = db.execute(
                    text("""
                        SELECT ticker, name
                        FROM sec_index
                        WHERE similarity(name, :n) > 0.30
                           OR name ILIKE :partial
                        ORDER BY similarity(name, :n) DESC
                        LIMIT 1
                    """),
                    {"n": name, "partial": f"{name.split()[0]}%"},
                ).fetchone()
                if row and row.ticker not in seen_tickers and row.ticker.upper() != ticker.upper():
                    seen_tickers.add(row.ticker)
                    results.append({
                        "ticker":       row.ticker,
                        "name":         row.name,
                        "relationship": rel,
                        "detail":       "Referenced in 10-K filing",
                    })
            except Exception:
                pass

        return results

    except Exception as e:
        print(f"[SupplyChain] text extraction error: {e}")
        return []


def get_supply_chain(ticker: str, db: Session) -> List[Dict[str, Any]]:
    """
    Returns supply chain relationships for a ticker.
    Priority: static seed → Claude AI extraction from 10-K.
    (DB cache skipped — it doesn't store name/detail fields reliably)
    """
    # Intentionally skip DB cache — static + AI extraction is authoritative

    # 2. Static seed data
    static = KNOWN_RELATIONSHIPS.get(ticker.upper(), [])
    if static:
        result = [
            {
                "ticker":       r["ticker"],
                "name":         r["name"],
                "relationship": r["relationship"],
                "detail":       r.get("detail", ""),
                "color":        RELATIONSHIP_COLORS.get(r["relationship"], "#555"),
            }
            for r in static
        ]
        _cache_to_db(ticker, result, db)
        return result

    # 3. Text-based extraction from SEC 10-K (works without AI credits)
    try:
        from services.sec import resolve_cik
        cik = resolve_cik(ticker)
        if cik:
            extracted = _text_extract_supply_chain(ticker, cik, db)
            if extracted:
                result = [
                    {
                        "ticker":       r.get("ticker", ""),
                        "name":         r["name"],
                        "relationship": r.get("relationship", "competitor"),
                        "detail":       r.get("detail", ""),
                        "color":        RELATIONSHIP_COLORS.get(r.get("relationship", "competitor"), "#555"),
                    }
                    for r in extracted
                ]
                _cache_to_db(ticker, result, db)
                return result
    except Exception as e:
        print(f"[SupplyChain] text extraction failed: {e}")

    # 4. AI extraction fallback (requires Anthropic API credits)
    try:
        from services.sec import resolve_cik, get_filings, fetch_filing_text
        cik_val = resolve_cik(ticker)
        if cik_val:
            filings = get_filings(cik_val, form_types=["10-K"], limit=1)
            if filings and filings[0].get("url"):
                text_content = fetch_filing_text(filings[0]["url"], max_chars=5000)
                if text_content:
                    extracted = _ai_extract_supply_chain(ticker, text_content)
                    if extracted:
                        result = [
                            {
                                "ticker":       r.get("ticker", ""),
                                "name":         r["name"],
                                "relationship": r.get("relationship", "competitor"),
                                "detail":       r.get("detail", ""),
                                "color":        RELATIONSHIP_COLORS.get(r.get("relationship", "competitor"), "#555"),
                            }
                            for r in extracted
                        ]
                        _cache_to_db(ticker, result, db)
                        return result
    except Exception as e:
        print(f"[SupplyChain] AI extraction failed: {e}")

    return []


def _cache_to_db(ticker: str, relationships: List[Dict], db: Session):
    try:
        for r in relationships:
            db.execute(
                text("""
                INSERT INTO supply_chain (ticker, related_ticker, relationship, source, fetched_at)
                VALUES (:ticker, :related_ticker, :relationship, :source, NOW())
                ON CONFLICT DO NOTHING
                """),
                {
                    "ticker":         ticker.upper(),
                    "related_ticker": r.get("ticker", ""),
                    "relationship":   r.get("relationship", ""),
                    "source":         "static" if ticker.upper() in KNOWN_RELATIONSHIPS else "ai-sec",
                },
            )
        db.commit()
    except Exception as e:
        print(f"[SupplyChain] DB cache error: {e}")
