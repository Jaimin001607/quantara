import { AIAnalysis } from "@/lib/api";
import SectionHeader from "./SectionHeader";

interface Props {
  analysis: AIAnalysis | null;
  onRefresh?: () => void;
  refreshing?: boolean;
}

const STYLES: Record<string, { color: string; bg: string; icon: string; label: string }> = {
  BUY:  { color: "#10b981", bg: "rgba(16,185,129,0.08)",  icon: "▲", label: "BUY"  },
  HOLD: { color: "#f59e0b", bg: "rgba(245,158,11,0.08)",  icon: "◆", label: "HOLD" },
  SELL: { color: "#ef4444", bg: "rgba(239,68,68,0.08)",   icon: "▼", label: "SELL" },
  "N/A":{ color: "#6b7280", bg: "rgba(107,114,128,0.06)", icon: "—", label: "N/A"  },
};

export default function AISignalPanel({ analysis, onRefresh, refreshing }: Props) {
  const signal = (analysis?.signal?.toUpperCase() ?? "N/A") as keyof typeof STYLES;
  const s = STYLES[signal] ?? STYLES["N/A"];

  let parsed: { signal?: string; confidence?: number; reasoning?: string } = {};
  try { parsed = JSON.parse(analysis?.analysis ?? "{}"); } catch { parsed = {}; }

  return (
    <div className="card" style={{ borderColor: `${s.color}30` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <SectionHeader title="AI Signal" subtitle="Claude Sonnet" />
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={refreshing}
            style={{
              fontSize: 11, padding: "4px 10px", borderRadius: 6, cursor: refreshing ? "default" : "pointer",
              background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)",
              color: refreshing ? "var(--muted)" : "var(--accent2)", fontFamily: "Inter, sans-serif",
              opacity: refreshing ? 0.5 : 1,
            }}
          >
            {refreshing ? "…" : "↻ Refresh"}
          </button>
        )}
      </div>

      {/* Signal badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div
          style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "12px 20px", borderRadius: 14,
            background: s.bg, border: `1px solid ${s.color}40`,
          }}
        >
          <span style={{ color: s.color, fontSize: 22 }}>{s.icon}</span>
          <div>
            <div style={{ color: s.color, fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{s.label}</div>
            <div style={{ color: "var(--muted2)", fontSize: 10, marginTop: 2 }}>Recommendation</div>
          </div>
        </div>
      </div>

      {/* Reasoning narrative */}
      {parsed.reasoning ? (
        <div
          style={{
            padding: "14px 16px", borderRadius: 12, lineHeight: 1.65,
            background: s.bg, borderLeft: `3px solid ${s.color}60`,
          }}
        >
          <div className="label" style={{ marginBottom: 6 }}>ANALYSIS</div>
          <p style={{ color: "var(--ink2)", fontSize: 13, margin: 0 }}>{parsed.reasoning}</p>
        </div>
      ) : signal === "N/A" ? (
        <div style={{ color: "var(--muted2)", fontSize: 13 }}>
          Add <code style={{ fontSize: 11 }}>ANTHROPIC_API_KEY</code> to enable AI signals.
        </div>
      ) : null}

      <p className="text-xs mt-3" style={{ color: "var(--muted)" }}>
        ⚠ AI-generated · Not financial advice · For informational use only
      </p>
    </div>
  );
}
