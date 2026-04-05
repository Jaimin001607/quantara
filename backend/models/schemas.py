from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date


class CompanyBase(BaseModel):
    ticker: str
    name: Optional[str] = None
    sector: Optional[str] = None
    industry: Optional[str] = None
    description: Optional[str] = None
    website: Optional[str] = None
    employees: Optional[int] = None


class StockQuote(BaseModel):
    ticker: str
    price: Optional[float] = None
    open: Optional[float] = None
    high: Optional[float] = None
    low: Optional[float] = None
    volume: Optional[int] = None
    market_cap: Optional[float] = None
    pe_ratio: Optional[float] = None
    week_52_high: Optional[float] = None
    week_52_low: Optional[float] = None
    change_pct: Optional[float] = None


class Filing(BaseModel):
    ticker: str
    form_type: Optional[str] = None
    filing_date: Optional[date] = None
    description: Optional[str] = None
    url: Optional[str] = None
    ai_summary: Optional[str] = None


class NewsArticle(BaseModel):
    ticker: str
    title: Optional[str] = None
    source: Optional[str] = None
    url: Optional[str] = None
    published_at: Optional[datetime] = None
    sentiment: Optional[str] = None


class AIAnalysis(BaseModel):
    ticker: str
    analysis: str
    signal: str


class CompanyFull(BaseModel):
    company: CompanyBase
    quote: Optional[StockQuote] = None
    filings: List[Filing] = []
    news: List[NewsArticle] = []
    ai_analysis: Optional[AIAnalysis] = None
    financials: Optional[dict] = None
