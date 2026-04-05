const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export interface StockQuote {
  ticker: string;
  price: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;
  market_cap: number | null;
  pe_ratio: number | null;
  week_52_high: number | null;
  week_52_low: number | null;
  change_pct: number | null;
}

export interface Filing {
  ticker: string;
  form_type: string | null;
  filing_date: string | null;
  description: string | null;
  url: string | null;
  ai_summary: string | null;
}

export interface NewsArticle {
  ticker: string;
  title: string | null;
  source: string | null;
  url: string | null;
  published_at: string | null;
  sentiment: "positive" | "negative" | "neutral" | null;
}

export interface AIAnalysis {
  ticker: string;
  signal: "BUY" | "HOLD" | "SELL";
  analysis: string;
}

export interface CompanyBase {
  ticker: string;
  name: string | null;
  sector: string | null;
  industry: string | null;
  description: string | null;
  website: string | null;
  employees: number | null;
  cik?: string | null;
}

export interface Financials {
  revenue: Record<string, number | null>;
  net_income: Record<string, number | null>;
  total_assets: Record<string, number | null>;
  total_liab: Record<string, number | null>;
}

export interface CompanyFull {
  company: CompanyBase;
  quote: StockQuote | null;
  filings: Filing[];
  news: NewsArticle[];
  ai_analysis: AIAnalysis | null;
  financials: Financials | null;
}

export interface SearchResult {
  ticker: string;
  name: string | null;
  sector: string | null;
  industry: string | null;
}

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { next: { revalidate: 0 } });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `API error ${res.status}`);
  }
  return res.json();
}

export async function searchCompanies(q: string): Promise<SearchResult[]> {
  return apiFetch(`/search?q=${encodeURIComponent(q)}`);
}

export async function getCompany(ticker: string, refresh = false): Promise<CompanyFull> {
  return apiFetch(`/company/${ticker}${refresh ? "?refresh=true" : ""}`);
}

export function fmt(n: number | null | undefined, digits = 2): string {
  if (n == null) return "—";
  return n.toLocaleString("en-US", { maximumFractionDigits: digits });
}

export function fmtBig(n: number | null | undefined): string {
  if (n == null) return "—";
  if (Math.abs(n) >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (Math.abs(n) >= 1e9)  return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6)  return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toLocaleString()}`;
}
