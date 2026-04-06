"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { searchCompanies, SearchResult } from "@/lib/api";

const QUICK = ["AAPL", "TSLA", "MSFT", "NVDA", "AMZN", "GOOGL", "META", "JPM"];

export default function HomePage() {
  const router = useRouter();
  const [query, setQuery]     = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try { setResults(await searchCompanies(q)); }
    catch { setResults([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => doSearch(query), 350);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [query, doSearch]);

  const go = (ticker: string) => router.push(`/company?t=${ticker.toUpperCase()}`);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim().toUpperCase();
    if (q) go(q);
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden"
      style={{ background: "var(--bg)" }}>

      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(99,102,241,0.07) 0%, transparent 70%)",
      }} />

      {/* Grid pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-60" style={{
        backgroundImage: "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
        backgroundSize: "48px 48px",
      }} />

      <div className="relative z-10 w-full max-w-2xl flex flex-col items-center gap-8">

        {/* Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
          style={{ background: "rgba(79,70,229,0.08)", border: "1px solid rgba(79,70,229,0.18)", color: "#4f46e5" }}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
          LIVE MARKET INTELLIGENCE
        </div>

        {/* Headline */}
        <div className="text-center">
          <h1 className="text-5xl font-bold tracking-tight mb-3" style={{ lineHeight: 1.15 }}>
            <span className="gradient-text">Quantara</span>
            <br />
            <span style={{ color: "var(--text2)" }}>See What Others Miss</span>
          </h1>
          <p className="text-base" style={{ color: "var(--ink2)" }}>
            SEC filings · Finnhub market data · AI-powered signals · Supply chain maps
          </p>
        </div>

        {/* Search */}
        <form onSubmit={handleSubmit} className="w-full relative">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: "var(--muted2)" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
              </div>
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setTimeout(() => setFocused(false), 150)}
                placeholder="Search company or ticker — AAPL, Tesla, Microsoft..."
                autoFocus
                className="w-full pl-11 pr-4 py-4 text-sm rounded-xl outline-none transition-all"
                style={{
                  background: "var(--surface)",
                  border: focused ? "1px solid var(--accent)" : "1px solid var(--border2)",
                  color: "var(--text)",
                  fontFamily: "inherit",
                  boxShadow: focused ? "0 0 0 3px rgba(99,102,241,0.1)" : "none",
                }}
              />
            </div>
            <button type="submit"
              className="px-6 py-4 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: "linear-gradient(135deg, #6366f1, #818cf8)",
                color: "#fff",
                border: "none",
                cursor: "pointer",
                boxShadow: "0 4px 16px rgba(99,102,241,0.3)",
              }}>
              Search
            </button>
          </div>

          {/* Dropdown */}
          {focused && results.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 rounded-xl overflow-hidden z-50"
              style={{ background: "var(--surface)", border: "1px solid var(--border2)", boxShadow: "0 8px 24px rgba(0,0,0,0.10)" }}>
              {results.map((r, i) => (
                <button key={r.ticker} type="button" onClick={() => go(r.ticker)}
                  className="w-full text-left px-4 py-3 flex items-center gap-3 transition-colors hover:bg-black/5"
                  style={{ borderBottom: i < results.length - 1 ? "1px solid var(--border)" : "none" }}>
                  <span className="font-bold text-sm font-mono w-16 shrink-0" style={{ color: "var(--accent2)" }}>{r.ticker}</span>
                  <span className="text-sm" style={{ color: "var(--text)" }}>{r.name}</span>
                  {r.sector && (
                    <span className="ml-auto text-xs px-2 py-0.5 rounded-full"
                      style={{ background: "rgba(99,102,241,0.1)", color: "var(--muted2)" }}>
                      {r.sector}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </form>

        {/* Quick links */}
        <div className="flex flex-wrap gap-2 justify-center">
          {QUICK.map(t => (
            <button key={t} onClick={() => go(t)}
              className="px-4 py-2 rounded-lg text-xs font-semibold font-mono transition-all hover:scale-105"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border2)",
                color: "var(--ink2)",
                cursor: "pointer",
              }}>
              {t}
            </button>
          ))}
        </div>

        {/* Footer */}
        <p className="text-xs" style={{ color: "var(--muted)" }}>
          Powered by SEC EDGAR · Finnhub · Claude AI
        </p>
      </div>
    </main>
  );
}
