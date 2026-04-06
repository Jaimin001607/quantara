-- Quantara Schema v2 — Additive only, does NOT modify existing tables

-- Enable trigram extension for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- SEC company index (separate from companies cache table)
CREATE TABLE IF NOT EXISTS sec_index (
    id      SERIAL PRIMARY KEY,
    ticker  VARCHAR(20) UNIQUE NOT NULL,
    name    VARCHAR(512),
    cik     VARCHAR(20)
);

-- Trigram indexes for fast fuzzy search
CREATE INDEX IF NOT EXISTS idx_sec_index_ticker_trgm ON sec_index USING gin(ticker gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_sec_index_name_trgm   ON sec_index USING gin(name   gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_sec_index_ticker_exact ON sec_index(ticker);

-- Supply chain relationships (additive, optional)
CREATE TABLE IF NOT EXISTS supply_chain (
    id           SERIAL PRIMARY KEY,
    ticker       VARCHAR(10) NOT NULL,
    related_ticker VARCHAR(10),
    relationship VARCHAR(50),  -- 'supplier', 'customer', 'competitor'
    source       VARCHAR(100),
    fetched_at   TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_supply_chain_ticker ON supply_chain(ticker);
