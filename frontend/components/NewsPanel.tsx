import { NewsArticle } from "@/lib/api";
import SectionHeader from "./SectionHeader";

interface Props { articles: NewsArticle[]; }

const S: Record<string, { color: string; label: string; bg: string }> = {
  positive: { color: "#10b981", label: "POS", bg: "rgba(16,185,129,0.1)" },
  negative: { color: "#ef4444", label: "NEG", bg: "rgba(239,68,68,0.1)" },
  neutral:  { color: "#6b7280", label: "NEU", bg: "rgba(107,114,128,0.08)" },
};

export default function NewsPanel({ articles }: Props) {
  if (!articles.length) return (
    <div className="card">
      <SectionHeader title="News" />
      <p className="text-sm" style={{ color: "var(--muted2)" }}>No news found.</p>
    </div>
  );

  const counts = articles.reduce((a, n) => {
    const s = n.sentiment ?? "neutral";
    a[s] = (a[s] ?? 0) + 1; return a;
  }, {} as Record<string, number>);
  const total = articles.length;

  return (
    <div className="card">
      <SectionHeader title="News" subtitle={`${total} articles`} />

      {/* Sentiment bar */}
      <div className="mb-4">
        <div className="flex h-1.5 rounded-full overflow-hidden gap-0.5 mb-2">
          {(["positive","neutral","negative"] as const).map(k => (
            <div key={k} style={{ width: `${((counts[k]??0)/total)*100}%`, background: S[k].color, borderRadius: 4 }} />
          ))}
        </div>
        <div className="flex gap-4 text-xs">
          <span style={{ color: "#10b981" }}>▲ {counts.positive ?? 0} positive</span>
          <span style={{ color: "#6b7280" }}>— {counts.neutral ?? 0} neutral</span>
          <span style={{ color: "#ef4444" }}>▼ {counts.negative ?? 0} negative</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {articles.map((a, i) => {
          const style = S[a.sentiment ?? "neutral"];
          const date  = a.published_at
            ? new Date(a.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
            : null;
          return (
            <div key={i} className="flex gap-3 pb-3"
              style={{ borderBottom: i < articles.length - 1 ? "1px solid var(--border)" : "none" }}>
              <span className="tag shrink-0 mt-0.5 text-xs"
                style={{ background: style.bg, color: style.color }}>
                {style.label}
              </span>
              <div className="min-w-0">
                {a.url ? (
                  <a href={a.url} target="_blank" rel="noreferrer"
                    className="text-sm leading-snug hover:underline block"
                    style={{ color: "var(--text)" }}>
                    {a.title}
                  </a>
                ) : (
                  <span className="text-sm" style={{ color: "var(--text)" }}>{a.title}</span>
                )}
                <div className="text-xs mt-1" style={{ color: "var(--muted2)" }}>
                  {a.source}{date && ` · ${date}`}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
