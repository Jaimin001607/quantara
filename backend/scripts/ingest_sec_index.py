"""
SEC Index Ingestion Script
Downloads SEC company_tickers.json and populates sec_index table.

Run once:
    python scripts/ingest_sec_index.py

Re-run anytime to refresh.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

import httpx
from database.connection import engine
from sqlalchemy import text

SEC_URL = "https://www.sec.gov/files/company_tickers.json"
HEADERS = {"User-Agent": os.getenv("SEC_USER_AGENT", "bloomberg-mvp contact@example.com")}


def ingest():
    print("[SEC Index] Downloading company tickers from EDGAR...")
    r = httpx.get(SEC_URL, headers=HEADERS, timeout=30)
    r.raise_for_status()
    data = r.json()
    print(f"[SEC Index] Downloaded {len(data)} companies.")

    rows = []
    for entry in data.values():
        ticker = str(entry.get("ticker", "")).upper().strip()
        name   = str(entry.get("title", "")).strip()
        cik    = str(entry.get("cik_str", "")).zfill(10)
        if ticker and name:
            rows.append({"ticker": ticker, "name": name, "cik": cik})

    print(f"[SEC Index] Inserting {len(rows)} rows into sec_index...")
    with engine.connect() as conn:
        # Apply schema v2 first
        schema_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "database", "schema_v2.sql")
        conn.execute(text(open(schema_path).read()))
        conn.commit()

        # Batch upsert
        batch_size = 500
        for i in range(0, len(rows), batch_size):
            batch = rows[i:i + batch_size]
            conn.execute(
                text("""
                INSERT INTO sec_index (ticker, name, cik)
                VALUES (:ticker, :name, :cik)
                ON CONFLICT (ticker) DO UPDATE SET name = EXCLUDED.name, cik = EXCLUDED.cik
                """),
                batch,
            )
            conn.commit()
            print(f"[SEC Index]   {min(i + batch_size, len(rows))}/{len(rows)}", end="\r")

    print(f"\n[SEC Index] Done. {len(rows)} companies indexed.")


if __name__ == "__main__":
    ingest()
