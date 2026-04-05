import { CompanyBase, StockQuote, fmt, fmtBig } from "@/lib/api";
import SectionHeader from "./SectionHeader";

interface Props {
  company: CompanyBase;
  quote: StockQuote | null;
  onRefresh: () => void;
  refreshing: boolean;
  onOpenChart?: () => void;
}

export default function CompanyHeader({ company, quote, onRefresh, refreshing, onOpenChart }: Props) {
  const up = (quote?.change_pct ?? 0) >= 0;

  return (
    <div className="card" style={{
      background: "linear-gradient(135deg, rgba(79,70,229,0.05) 0%, var(--surface) 60%)",
      borderColor: "rgba(79,70,229,0.15)",
    }}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Left */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl font-bold" style={{
              background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>
              {company.ticker}
            </span>
            <span className="text-lg font-semibold" style={{ color: "var(--text)" }}>
              {company.name}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {company.sector && (
              <span className="tag" style={{ background: "rgba(79,70,229,0.08)", color: "var(--accent2)" }}>
                {company.sector}
              </span>
            )}
            {company.industry && company.industry !== company.sector && (
              <span className="tag" style={{ background: "rgba(0,0,0,0.04)", color: "var(--ink2)" }}>
                {company.industry}
              </span>
            )}
            {company.employees && (
              <span className="tag" style={{ background: "rgba(0,0,0,0.04)", color: "var(--ink2)" }}>
                {company.employees.toLocaleString()} employees
              </span>
            )}
            {company.website && (
              <a href={company.website} target="_blank" rel="noreferrer"
                className="tag hover:opacity-80"
                style={{ background: "rgba(37,99,235,0.08)", color: "#2563eb", textDecoration: "none" }}>
                ↗ {company.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
              </a>
            )}
          </div>
        </div>

        {/* Right: price — click to open chart */}
        <div className="flex items-center gap-4">
          {quote ? (
            <div className="text-right">
              <button
                onClick={onOpenChart}
                style={{
                  background: "none", border: "none", cursor: "pointer", textAlign: "right",
                  padding: 0, fontFamily: "inherit",
                }}
              >
                <div className="text-3xl font-bold" style={{ color: "var(--text)" }}>
                  ${fmt(quote.price)}
                </div>
                <div className={`text-sm font-semibold mt-0.5 ${up ? "positive" : "negative"}`}>
                  {up ? "▲" : "▼"} {Math.abs(quote.change_pct ?? 0).toFixed(2)}% today
                </div>
                <div style={{
                  fontSize: 10, color: "#4f46e5", marginTop: 4, fontWeight: 600,
                  letterSpacing: "0.04em",
                }}>
                  Click to view full chart →
                </div>
              </button>
              <div className="text-xs mt-1" style={{ color: "var(--ink2)" }}>
                Mkt Cap: <span style={{ color: "var(--text)" }}>{fmtBig(quote.market_cap)}</span>
                &nbsp;·&nbsp;P/E: <span style={{ color: "var(--text)" }}>{fmt(quote.pe_ratio)}</span>
              </div>
            </div>
          ) : (
            <div className="text-xs" style={{ color: "var(--muted2)" }}>No quote</div>
          )}

          <button onClick={onRefresh} disabled={refreshing}
            className="px-4 py-2 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: refreshing ? "var(--border)" : "rgba(79,70,229,0.08)",
              border: "1px solid rgba(79,70,229,0.2)",
              color: refreshing ? "var(--muted2)" : "var(--accent2)",
              cursor: refreshing ? "not-allowed" : "pointer",
              fontFamily: "inherit",
            }}>
            {refreshing ? "..." : "↻ Refresh"}
          </button>
        </div>
      </div>
    </div>
  );
}
