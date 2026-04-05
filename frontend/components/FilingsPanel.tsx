import { Filing } from "@/lib/api";
import SectionHeader from "./SectionHeader";

interface Props { filings: Filing[]; }

const FORM_STYLE: Record<string, { color: string; bg: string }> = {
  "10-K": { color: "#f59e0b", bg: "rgba(245,158,11,0.15)" },
  "10-Q": { color: "#3b82f6", bg: "rgba(59,130,246,0.15)" },
};

export default function FilingsPanel({ filings }: Props) {
  if (!filings.length) return (
    <div className="card">
      <SectionHeader title="SEC Filings" />
      <p className="text-sm" style={{ color: "var(--muted2)" }}>No filings found.</p>
    </div>
  );

  return (
    <div className="card">
      <SectionHeader title="SEC Filings" subtitle="10-K / 10-Q" />
      <div className="flex flex-col gap-5">
        {filings.map((f, i) => {
          const style = FORM_STYLE[f.form_type ?? ""] ?? { color: "#6b7280", bg: "rgba(107,114,128,0.1)" };
          return (
            <div key={i} className="pb-5" style={{ borderBottom: i < filings.length - 1 ? "1px solid var(--border)" : "none" }}>
              <div className="flex items-center gap-3 mb-3">
                <span className="tag text-xs font-bold" style={{ background: style.bg, color: style.color }}>
                  {f.form_type}
                </span>
                <span className="text-xs" style={{ color: "var(--muted2)" }}>{f.filing_date}</span>
                {f.url && (
                  <a href={f.url} target="_blank" rel="noreferrer"
                    className="ml-auto text-xs font-semibold hover:underline"
                    style={{ color: "var(--accent2)" }}>
                    View Filing ↗
                  </a>
                )}
              </div>
              {f.ai_summary && (
                <div className="p-4 rounded-xl text-sm leading-relaxed"
                  style={{ background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.12)" }}>
                  <div className="label mb-2">AI Summary</div>
                  <p className="whitespace-pre-line" style={{ color: "var(--ink2)" }}>{f.ai_summary}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
