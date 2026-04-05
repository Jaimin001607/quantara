-- Bloomberg MVP Database Schema

CREATE TABLE IF NOT EXISTS companies (
    id          SERIAL PRIMARY KEY,
    ticker      VARCHAR(10)  UNIQUE NOT NULL,
    name        VARCHAR(255),
    sector      VARCHAR(100),
    industry    VARCHAR(100),
    description TEXT,
    cik         VARCHAR(20),
    website     VARCHAR(255),
    employees   INTEGER,
    fetched_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_quotes (
    id          SERIAL PRIMARY KEY,
    ticker      VARCHAR(10) NOT NULL,
    price       NUMERIC(12,4),
    open        NUMERIC(12,4),
    high        NUMERIC(12,4),
    low         NUMERIC(12,4),
    volume      BIGINT,
    market_cap  BIGINT,
    pe_ratio    NUMERIC(10,2),
    week_52_high NUMERIC(12,4),
    week_52_low  NUMERIC(12,4),
    fetched_at  TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_ticker FOREIGN KEY (ticker) REFERENCES companies(ticker) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_quotes_ticker_time ON stock_quotes(ticker, fetched_at DESC);

CREATE TABLE IF NOT EXISTS sec_filings (
    id           SERIAL PRIMARY KEY,
    ticker       VARCHAR(10) NOT NULL,
    form_type    VARCHAR(20),
    filing_date  DATE,
    description  TEXT,
    url          VARCHAR(512),
    ai_summary   TEXT,
    fetched_at   TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_filings_ticker ON sec_filings(ticker, filing_date DESC);

CREATE TABLE IF NOT EXISTS news_articles (
    id           SERIAL PRIMARY KEY,
    ticker       VARCHAR(10) NOT NULL,
    title        TEXT,
    source       VARCHAR(100),
    url          VARCHAR(512),
    published_at TIMESTAMP,
    sentiment    VARCHAR(20),
    fetched_at   TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_news_ticker_time ON news_articles(ticker, published_at DESC);

CREATE TABLE IF NOT EXISTS ai_analyses (
    id           SERIAL PRIMARY KEY,
    ticker       VARCHAR(10) NOT NULL,
    analysis     TEXT,
    signal       VARCHAR(20),
    created_at   TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_analysis_ticker ON ai_analyses(ticker, created_at DESC);
