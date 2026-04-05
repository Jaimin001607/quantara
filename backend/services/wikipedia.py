"""
Wikipedia service — company description and executive info.
Uses the free Wikipedia REST API.
"""
import httpx
from typing import Optional, Dict, Any

BASE = "https://en.wikipedia.org/api/rest_v1"
TIMEOUT = 10


def search_company(query: str) -> Optional[str]:
    """Return the best Wikipedia page title for a company query."""
    try:
        r = httpx.get(
            f"https://en.wikipedia.org/w/api.php",
            params={
                "action": "opensearch",
                "search": query,
                "limit": 5,
                "format": "json",
            },
            timeout=TIMEOUT,
        )
        r.raise_for_status()
        results = r.json()
        titles = results[1]
        if titles:
            return titles[0]
        return None
    except Exception as e:
        print(f"[Wiki] search error: {e}")
        return None


def get_summary(page_title: str) -> Optional[Dict[str, Any]]:
    """Return Wikipedia page summary for a title."""
    try:
        r = httpx.get(
            f"{BASE}/page/summary/{httpx.URL(page_title).path}",
            timeout=TIMEOUT,
        )
        if r.status_code == 404:
            return None
        r.raise_for_status()
        data = r.json()
        return {
            "title":       data.get("title"),
            "description": data.get("extract"),
            "url":         data.get("content_urls", {}).get("desktop", {}).get("page"),
            "thumbnail":   data.get("thumbnail", {}).get("source"),
        }
    except Exception as e:
        print(f"[Wiki] summary error for {page_title}: {e}")
        return None


def get_company_info(company_name: str) -> Optional[Dict[str, Any]]:
    title = search_company(company_name)
    if not title:
        return None
    return get_summary(title)
