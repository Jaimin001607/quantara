"""
SEC EDGAR service — resolve CIK and pull recent filings.
Uses the free EDGAR REST API (https://data.sec.gov).
"""
import os
import httpx
from typing import Optional, List, Dict, Any

BASE = "https://data.sec.gov"
HEADERS = {"User-Agent": os.getenv("SEC_USER_AGENT", "quantara contact@example.com")}
TIMEOUT = 15


def _cik_padded(cik: str) -> str:
    return str(cik).zfill(10)


def resolve_cik(ticker: str) -> Optional[str]:
    """Return zero-padded CIK for a ticker, or None."""
    try:
        url = "https://efts.sec.gov/LATEST/search-index?q=%22{}%22&dateRange=custom&startdt=2000-01-01&forms=10-K".format(ticker)
        # Faster: use the company_tickers.json endpoint
        r = httpx.get(
            "https://efts.sec.gov/LATEST/search-index?q=%22{}%22&forms=10-K".format(ticker),
            headers=HEADERS, timeout=TIMEOUT
        )
        # Preferred method: the static tickers map
        tickers_r = httpx.get(
            "https://www.sec.gov/files/company_tickers.json",
            headers=HEADERS, timeout=TIMEOUT
        )
        tickers_r.raise_for_status()
        data = tickers_r.json()
        ticker_upper = ticker.upper()
        for entry in data.values():
            if entry.get("ticker", "").upper() == ticker_upper:
                return _cik_padded(str(entry["cik_str"]))
        return None
    except Exception as e:
        print(f"[SEC] CIK resolve error for {ticker}: {e}")
        return None


def get_filings(cik: str, form_types: List[str] = None, limit: int = 5) -> List[Dict[str, Any]]:
    """Return recent filings for a CIK."""
    if form_types is None:
        form_types = ["10-K", "10-Q"]
    try:
        url = f"{BASE}/submissions/CIK{cik}.json"
        r = httpx.get(url, headers=HEADERS, timeout=TIMEOUT)
        r.raise_for_status()
        data = r.json()

        recent = data.get("filings", {}).get("recent", {})
        forms   = recent.get("form", [])
        dates   = recent.get("filingDate", [])
        accnums = recent.get("accessionNumber", [])
        descs   = recent.get("primaryDocument", [])

        results = []
        for form, date, acc, doc in zip(forms, dates, accnums, descs):
            if form in form_types:
                acc_clean = acc.replace("-", "")
                url_filing = (
                    f"https://www.sec.gov/Archives/edgar/data/"
                    f"{int(cik)}/{acc_clean}/{doc}"
                )
                results.append({
                    "form_type":    form,
                    "filing_date":  date,
                    "description":  f"{form} filed {date}",
                    "url":          url_filing,
                    "accession":    acc,
                })
                if len(results) >= limit:
                    break
        return results
    except Exception as e:
        print(f"[SEC] filings error for CIK {cik}: {e}")
        return []


def get_employee_count(cik: str) -> Optional[int]:
    """
    Fetch employee count from SEC EDGAR.
    Strategy 1: XBRL company facts (dei:EntityNumberOfEmployees).
    Strategy 2: Parse 10-K filing text with regex.
    """
    import re

    # Strategy 1: XBRL structured data
    try:
        url = f"{BASE}/api/xbrl/companyfacts/CIK{cik}.json"
        r = httpx.get(url, headers=HEADERS, timeout=TIMEOUT)
        r.raise_for_status()
        facts = r.json().get("facts", {})
        dei = facts.get("dei", {})
        emp_data = dei.get("EntityNumberOfEmployees", {})
        units = emp_data.get("units", {})
        entries = units.get("pure", []) or units.get("number", [])
        if entries:
            annual = [e for e in entries if e.get("form") == "10-K"] or entries
            annual_sorted = sorted(annual, key=lambda x: x.get("end", ""), reverse=True)
            val = annual_sorted[0].get("val")
            if val is not None:
                return int(val)
    except Exception:
        pass

    # Strategy 2: Search 10-K raw HTML for employee count patterns
    try:
        filings = get_filings(cik, form_types=["10-K"], limit=1)
        if not filings or not filings[0].get("url"):
            return None
        filing_url = filings[0]["url"]
        # Stream response and search in chunks to avoid loading whole doc
        patterns = [
            re.compile(r'approximately\s+([\d,]+)\s+full[- ]time', re.IGNORECASE),
            re.compile(r'approximately\s+([\d,]+)\s+employees', re.IGNORECASE),
            re.compile(r'([\d,]+)\s+full[- ]time(?:\s+equivalent)?\s+employees', re.IGNORECASE),
            re.compile(r'([\d,]+)\s+employees\s+(?:worldwide|globally|as of)', re.IGNORECASE),
            re.compile(r'employed\s+approximately\s+([\d,]+)', re.IGNORECASE),
            re.compile(r'workforce\s+of\s+approximately\s+([\d,]+)', re.IGNORECASE),
            re.compile(r'had\s+approximately\s+([\d,]+)\s+(?:full[- ]time|employees)', re.IGNORECASE),
        ]
        r = httpx.get(filing_url, headers=HEADERS, timeout=30, follow_redirects=True)
        # Search raw text (HTML tags don't matter for regex on numbers)
        raw = r.text
        for pat in patterns:
            m = pat.search(raw)
            if m:
                val_str = m.group(1).replace(",", "")
                val = int(val_str)
                if 50 < val < 10_000_000:  # sanity: not a share count or tiny number
                    return val
    except Exception as e:
        print(f"[SEC] employee count text parse error for CIK {cik}: {e}")

    return None


def fetch_filing_text(url: str, max_chars: int = 8000) -> Optional[str]:
    """Download the first `max_chars` of a filing document for AI summarisation."""
    try:
        r = httpx.get(url, headers=HEADERS, timeout=30, follow_redirects=True)
        r.raise_for_status()
        content_type = r.headers.get("content-type", "")
        if "html" in content_type:
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(r.text, "lxml")
            for tag in soup(["script", "style", "table"]):
                tag.decompose()
            text = soup.get_text(separator=" ", strip=True)
        else:
            text = r.text
        return text[:max_chars]
    except Exception as e:
        print(f"[SEC] fetch filing text error: {e}")
        return None
