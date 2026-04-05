"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001/api/v1";

// ── Types ─────────────────────────────────────────────────────────────────────

interface NewsItem {
  id: number;
  headline: string;
  source: string;
  url: string;
  datetime: number;
  related: string;
}

interface Trade {
  ticker: string;
  name: string;
  action: "BUY" | "SELL";
  shares: number;
  price: number;
  value: number;
  date: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() / 1000) - ts);
  if (diff < 60)        return `${diff}s ago`;
  if (diff < 3600)      return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)     return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function fmtValue(v: number): string {
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000)     return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)         return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
}

// ── Icon components ───────────────────────────────────────────────────────────

const HomeIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

const MapIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
);

const NewsIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 0-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/>
  </svg>
);

const TradeIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
  </svg>
);

// ── Section header ────────────────────────────────────────────────────────────

function SectionLabel({ icon, title, count }: { icon: React.ReactNode; title: string; count?: number }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6,
      padding: "10px 16px 6px",
      fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
      color: "#9ca3af",
    }}>
      {icon}
      {title}
      {count != null && (
        <span style={{
          marginLeft: "auto", background: "rgba(79,70,229,0.1)", color: "#4f46e5",
          fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 100,
        }}>{count}</span>
      )}
    </div>
  );
}

// ── Main Sidebar ──────────────────────────────────────────────────────────────

export default function Sidebar() {
  const router   = useRouter();
  const pathname = usePathname();

  const [news, setNews]             = useState<NewsItem[]>([]);
  const [trades, setTrades]         = useState<Trade[]>([]);
  const [newsLoading, setNewsLoad]  = useState(true);
  const [tradeLoading, setTradeLoad]= useState(true);
  const [activeSection, setSection] = useState<"news" | "trades">("news");

  // Derive current ticker from pathname like /company/AAPL
  const tickerMatch = pathname?.match(/^\/company\/([A-Z0-9.\-]+)/i);
  const currentTicker = tickerMatch ? tickerMatch[1].toUpperCase() : null;
  const isHome = pathname === "/";

  const fetchNews = useCallback(async () => {
    setNewsLoad(true);
    try {
      const r = await fetch(`${API}/market/news`);
      if (r.ok) setNews(await r.json());
    } catch { /* silent */ }
    finally { setNewsLoad(false); }
  }, []);

  const fetchTrades = useCallback(async () => {
    setTradeLoad(true);
    try {
      const r = await fetch(`${API}/market/big-trades`);
      if (r.ok) setTrades(await r.json());
    } catch { /* silent */ }
    finally { setTradeLoad(false); }
  }, []);

  useEffect(() => {
    fetchNews();
    fetchTrades();
    const iv = setInterval(() => { fetchNews(); fetchTrades(); }, 5 * 60 * 1000);
    return () => clearInterval(iv);
  }, [fetchNews, fetchTrades]);

  const navItem = (label: string, icon: React.ReactNode, onClick: () => void, active: boolean) => (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "9px 16px", border: "none", cursor: "pointer",
        background: active ? "rgba(79,70,229,0.08)" : "transparent",
        color: active ? "#4f46e5" : "#6b7280",
        fontSize: 13, fontWeight: active ? 600 : 500,
        borderRadius: 8, margin: "1px 8px", width: "calc(100% - 16px)",
        fontFamily: "Inter, sans-serif",
        transition: "all 0.15s",
      }}
    >
      <span style={{ color: active ? "#4f46e5" : "#9ca3af" }}>{icon}</span>
      {label}
      {active && <span style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: "#4f46e5" }} />}
    </button>
  );

  return (
    <aside style={{
      width: 240, minWidth: 240, height: "100vh",
      background: "#ffffff",
      borderRight: "1px solid #e4e8f2",
      display: "flex", flexDirection: "column",
      position: "sticky", top: 0, overflowY: "auto",
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{
        padding: "20px 16px 14px",
        borderBottom: "1px solid #f0f2f8",
        display: "flex", alignItems: "center", gap: 10,
        flexShrink: 0,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9,
          background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontWeight: 800, fontSize: 16, letterSpacing: "-0.05em",
          flexShrink: 0,
        }}>
          Q
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14, color: "#0f172a", lineHeight: 1.2 }}>Quantara</div>
          <div style={{ fontSize: 9, color: "#9ca3af", fontWeight: 500, letterSpacing: "0.06em" }}>SEE WHAT OTHERS MISS</div>
        </div>
      </div>

      {/* Navigation */}
      <div style={{ padding: "8px 0", borderBottom: "1px solid #f0f2f8", flexShrink: 0 }}>
        {navItem("Home", <HomeIcon />, () => router.push("/"), isHome)}
        {currentTicker && navItem(
          `${currentTicker} Map`,
          <MapIcon />,
          () => router.push(`/company/${currentTicker}`),
          false,
        )}
        {currentTicker && (
          <div style={{ padding: "4px 24px", fontSize: 11, color: "#9ca3af" }}>
            Viewing <span style={{ color: "#4f46e5", fontWeight: 600 }}>{currentTicker}</span>
          </div>
        )}
      </div>

      {/* Section tabs */}
      <div style={{
        display: "flex", borderBottom: "1px solid #f0f2f8",
        flexShrink: 0,
      }}>
        {(["news", "trades"] as const).map(s => (
          <button
            key={s}
            onClick={() => setSection(s)}
            style={{
              flex: 1, padding: "9px 4px", border: "none", cursor: "pointer",
              background: "transparent", fontFamily: "Inter, sans-serif",
              fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
              color: activeSection === s ? "#4f46e5" : "#9ca3af",
              borderBottom: activeSection === s ? "2px solid #4f46e5" : "2px solid transparent",
              transition: "all 0.15s",
            }}
          >
            {s === "news" ? "Market News" : "Big Trades"}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {activeSection === "news" && (
          <>
            {newsLoading && (
              <div style={{ padding: 16, color: "#9ca3af", fontSize: 12 }}>Loading news…</div>
            )}
            {!newsLoading && news.length === 0 && (
              <div style={{ padding: 16, color: "#9ca3af", fontSize: 12 }}>No news in last 48h.</div>
            )}
            {news.map((item, i) => (
              <a
                key={item.id ?? i}
                href={item.url}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "block", padding: "10px 14px",
                  borderBottom: "1px solid #f7f8fc",
                  textDecoration: "none",
                  transition: "background 0.12s",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "#f7f8fc")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                {item.related && (
                  <span style={{
                    fontSize: 9, fontWeight: 700, color: "#4f46e5",
                    background: "rgba(79,70,229,0.08)", padding: "1px 6px",
                    borderRadius: 100, marginBottom: 4, display: "inline-block",
                    letterSpacing: "0.06em",
                  }}>
                    {item.related}
                  </span>
                )}
                <div style={{
                  fontSize: 12, fontWeight: 500, color: "#0f172a",
                  lineHeight: 1.45, marginBottom: 4,
                  display: "-webkit-box", WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical", overflow: "hidden",
                }}>
                  {item.headline}
                </div>
                <div style={{ fontSize: 10, color: "#9ca3af", display: "flex", gap: 6 }}>
                  <span>{item.source}</span>
                  <span>·</span>
                  <span>{timeAgo(item.datetime)}</span>
                </div>
              </a>
            ))}
          </>
        )}

        {activeSection === "trades" && (
          <>
            <div style={{ padding: "8px 14px 4px", fontSize: 10, color: "#9ca3af", fontStyle: "italic" }}>
              Insider transactions · Last 30 days · ≥$500K
            </div>
            {tradeLoading && (
              <div style={{ padding: 16, color: "#9ca3af", fontSize: 12 }}>Loading trades…</div>
            )}
            {!tradeLoading && trades.length === 0 && (
              <div style={{ padding: 16, color: "#9ca3af", fontSize: 12 }}>No large trades found.</div>
            )}
            {trades.map((t, i) => {
              const isBuy = t.action === "BUY";
              return (
                <div
                  key={i}
                  onClick={() => router.push(`/company/${t.ticker}`)}
                  style={{
                    padding: "10px 14px",
                    borderBottom: "1px solid #f7f8fc",
                    cursor: "pointer",
                    transition: "background 0.12s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#f7f8fc")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 6,
                      background: isBuy ? "rgba(5,150,105,0.1)" : "rgba(220,38,38,0.08)",
                      color: isBuy ? "#059669" : "#dc2626",
                    }}>
                      {t.action}
                    </span>
                    <span style={{ fontWeight: 700, fontSize: 12, color: "#4f46e5" }}>{t.ticker}</span>
                    <span style={{
                      marginLeft: "auto", fontWeight: 700, fontSize: 12,
                      color: isBuy ? "#059669" : "#dc2626",
                    }}>
                      {fmtValue(t.value)}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.3 }}>
                    {t.name}
                  </div>
                  <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>
                    {t.shares.toLocaleString()} shares @ ${t.price} · {t.date}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: "10px 14px",
        borderTop: "1px solid #f0f2f8",
        fontSize: 9, color: "#9ca3af",
        flexShrink: 0,
      }}>
        Quantara · SEC EDGAR · Finnhub
        <br />
        Not financial advice
      </div>
    </aside>
  );
}
