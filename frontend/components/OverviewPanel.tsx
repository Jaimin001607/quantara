import { CompanyBase, StockQuote, fmt, fmtBig } from "@/lib/api";
import SectionHeader from "./SectionHeader";

interface Props { company: CompanyBase; quote: StockQuote | null; }

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="p-3 rounded-xl" style={{ background: "var(--bg2)", border: "1px solid var(--border)" }}>
      <div className="label mb-1">{label}</div>
      <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>{value ?? "—"}</div>
    </div>
  );
}

export default function OverviewPanel({ company, quote }: Props) {
  return (
    <div className="card">
      <SectionHeader title="Overview" />
      {company.description && (
        <p className="text-sm mb-4 leading-relaxed" style={{ color: "var(--ink2)", borderLeft: "3px solid var(--border2)", paddingLeft: 12 }}>
          {company.description.slice(0, 500)}{company.description.length > 500 ? "…" : ""}
        </p>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Stat label="Ticker"    value={<span style={{ color: "var(--accent2)" }}>{company.ticker}</span>} />
        <Stat label="Sector"    value={company.sector} />
        <Stat label="Industry"  value={company.industry} />
        <Stat label="Employees" value={company.employees?.toLocaleString()} />
        {quote && <>
          <Stat label="Price"      value={`$${fmt(quote.price)}`} />
          <Stat label="52W High"   value={`$${fmt(quote.week_52_high)}`} />
          <Stat label="52W Low"    value={`$${fmt(quote.week_52_low)}`} />
          <Stat label="P/E Ratio"  value={fmt(quote.pe_ratio)} />
          <Stat label="Day Open"   value={`$${fmt(quote.open)}`} />
          <Stat label="Day High"   value={`$${fmt(quote.high)}`} />
          <Stat label="Day Low"    value={`$${fmt(quote.low)}`} />
          <Stat label="Mkt Cap"    value={fmtBig(quote.market_cap)} />
        </>}
      </div>
    </div>
  );
}
