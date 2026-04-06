"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001/api/v1";

interface Trade {
  ticker: string;
  name: string;
  action: "BUY" | "SELL";
  shares: number;
  price: number;
  value: number;
  date: string;
  filing_date: string;
  days_to_file: number | null;
  source: string;
}

function fmtValue(v: number): string {
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(2)}B`;
  if (v >= 1_000_000)     return `$${(v / 1_000_000).toFixed(1)}M`;
  return `$${(v / 1000).toFixed(0)}K`;
}

function fmtDate(d: string): string {
  if (!d) return "—";
  return new Date(d + "T00:00:00Z").toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric", timeZone: "UTC",
  });
}

function timeAgoDate(dateStr: string): string {
  if (!dateStr) return "";
  const diff = Math.floor((Date.now() - new Date(dateStr + "T00:00:00Z").getTime()) / 1000);
  if (diff < 86400)      return "Today";
  const days = Math.floor(diff / 86400);
  if (days < 7)          return `${days}d ago`;
  if (days < 30)         return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function TradeCard({ t }: { t: Trade }) {
  const router = useRouter();
  const isBuy  = t.action === "BUY";
  const color  = isBuy ? "#059669" : "#dc2626";
  const bg     = isBuy ? "rgba(5,150,105,0.07)" : "rgba(220,38,38,0.06)";

  const isAnon = !t.name || t.name === "Anonymous" || t.name.trim() === "";
  const displayName = isAnon ? "Anonymous Insider" : t.name;

  return (
    <div style={{
      background: "#ffffff", border: "1px solid #e4e8f2",
      borderRadius: 16, padding: "20px 24px",
      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
      display: "flex", flexDirection: "column", gap: 14,
    }}>
      {/* Top row: action badge + ticker + value */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 8,
          background: bg, color, letterSpacing: "0.06em",
        }}>
          {t.action}
        </span>
        <span style={{ fontWeight: 800, fontSize: 20, color: "#4f46e5" }}>{t.ticker}</span>
        <span style={{
          marginLeft: "auto", fontWeight: 800, fontSize: 22, color,
        }}>
          {fmtValue(t.value)}
        </span>
      </div>

      {/* Details grid */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr",
        gap: "10px 20px",
      }}>
        <Detail label="Insider" value={displayName} mono={false} />
        <Detail label="Identity" value={isAnon ? "Anonymous" : "Named Executive"} mono={false}
          valueColor={isAnon ? "#9ca3af" : "#0f172a"} />
        <Detail label="Shares Traded" value={t.shares.toLocaleString()} />
        <Detail label="Price per Share" value={`$${t.price.toLocaleString()}`} />
        <Detail label="Transaction Date" value={`${fmtDate(t.date)} (${timeAgoDate(t.date)})`} />
        <Detail label="Filed with SEC" value={
          t.filing_date
            ? `${fmtDate(t.filing_date)}${t.days_to_file != null ? ` · ${t.days_to_file}d after trade` : ""}`
            : "—"
        } />
        <Detail label="Source" value={t.source || "SEC Form 4"} valueColor="#4f46e5" />
        <Detail label="Disclosure Type" value="Insider Transaction (Form 4)" />
      </div>

      {/* Disclosure note */}
      {t.days_to_file != null && (
        <div style={{
          padding: "10px 14px", borderRadius: 10,
          background: t.days_to_file <= 2 ? "rgba(5,150,105,0.06)" : "rgba(245,158,11,0.06)",
          border: `1px solid ${t.days_to_file <= 2 ? "rgba(5,150,105,0.15)" : "rgba(245,158,11,0.2)"}`,
          fontSize: 12, color: "#475569",
        }}>
          {t.days_to_file === 0
            ? "Filed same day as transaction — immediate disclosure."
            : t.days_to_file === 1
            ? "Filed 1 day after transaction — within the 2-day SEC requirement."
            : t.days_to_file <= 2
            ? `Filed ${t.days_to_file} days after transaction — within SEC requirements.`
            : `Filed ${t.days_to_file} days after transaction — SEC requires disclosure within 2 business days.`
          }
        </div>
      )}

      {/* CTA */}
      <button
        onClick={() => router.push(`/company?t=${t.ticker}`)}
        style={{
          width: "100%", padding: "12px", borderRadius: 10, cursor: "pointer",
          background: "rgba(79,70,229,0.07)", border: "1px solid rgba(79,70,229,0.2)",
          color: "#4f46e5", fontWeight: 600, fontSize: 13,
          fontFamily: "Inter, sans-serif",
          transition: "background 0.15s",
          marginTop: 2,
        }}
        onMouseEnter={e => (e.currentTarget.style.background = "rgba(79,70,229,0.12)")}
        onMouseLeave={e => (e.currentTarget.style.background = "rgba(79,70,229,0.07)")}
      >
        Open Company Analysis for {t.ticker} →
      </button>
    </div>
  );
}

function Detail({
  label, value, mono = true, valueColor,
}: {
  label: string; value: string; mono?: boolean; valueColor?: string;
}) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 3 }}>
        {label}
      </div>
      <div style={{
        fontSize: 13, fontWeight: 500,
        color: valueColor ?? "#0f172a",
        fontFamily: mono ? "JetBrains Mono, monospace" : "Inter, sans-serif",
      }}>
        {value}
      </div>
    </div>
  );
}

export default function TradesPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoad]  = useState(true);

  useEffect(() => {
    fetch(`${API}/market/big-trades`)
      .then(r => r.json())
      .then(setTrades)
      .catch(() => setTrades([]))
      .finally(() => setLoad(false));
  }, []);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", marginBottom: 6 }}>
          Big Trades
        </h1>
        <p style={{ fontSize: 13, color: "#64748b" }}>
          Largest insider transactions across S&P 500 companies · Last 30 days · Sourced from SEC Form 4 filings
        </p>
      </div>

      {loading && (
        <div style={{ color: "#9ca3af", fontSize: 14, padding: "48px 0", textAlign: "center" }}>
          Loading insider trades…
        </div>
      )}

      {!loading && trades.length === 0 && (
        <div style={{ textAlign: "center", color: "#9ca3af", padding: "48px 0", fontSize: 14 }}>
          No significant insider trades found.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))", gap: 16 }}>
        {trades.map((t, i) => <TradeCard key={i} t={t} />)}
      </div>

      <div style={{ marginTop: 32, fontSize: 11, color: "#9ca3af", textAlign: "center" }}>
        ⚠ Insider transaction data sourced from SEC EDGAR via Finnhub · Not financial advice · For informational use only
      </div>
    </div>
  );
}
