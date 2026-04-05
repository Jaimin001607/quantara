"use client";

import { useEffect, useState } from "react";
import SectionHeader from "./SectionHeader";

interface Relationship {
  ticker: string;
  name: string;
  relationship: "supplier" | "customer" | "competitor";
  detail?: string;
  color?: string;
}

interface Props { ticker: string; }

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001/api/v1";

const TYPE: Record<string, { label: string; color: string; bg: string }> = {
  supplier:   { label: "Supplier",   color: "#3b82f6", bg: "rgba(59,130,246,0.1)"  },
  customer:   { label: "Customer",   color: "#10b981", bg: "rgba(16,185,129,0.1)"  },
  competitor: { label: "Competitor", color: "#ef4444", bg: "rgba(239,68,68,0.1)"   },
};

export default function SupplyChainPanel({ ticker }: Props) {
  const [data, setData]     = useState<Relationship[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/company/${ticker}/supply-chain`)
      .then(r => r.json())
      .then(d => setData(d.relationships ?? []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [ticker]);

  if (loading) return (
    <div className="card">
      <SectionHeader title="Supply Chain" />
      <div className="flex gap-2">
        {[1,2,3].map(i => (
          <div key={i} className="h-16 flex-1 rounded-xl animate-pulse" style={{ background: "var(--border)" }} />
        ))}
      </div>
    </div>
  );

  if (!data.length) return (
    <div className="card">
      <SectionHeader title="Supply Chain" />
      <p className="text-sm" style={{ color: "var(--muted2)" }}>No relationship data available for {ticker}.</p>
    </div>
  );

  const grouped = data.reduce((acc, r) => {
    (acc[r.relationship] ??= []).push(r); return acc;
  }, {} as Record<string, Relationship[]>);

  return (
    <div className="card">
      <SectionHeader title="Supply Chain & Relationships" />
      <div className="flex flex-col gap-5">
        {(["supplier","customer","competitor"] as const).map(type => {
          const items = grouped[type];
          if (!items?.length) return null;
          const t = TYPE[type];
          return (
            <div key={type}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full" style={{ background: t.color }} />
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: t.color }}>
                  {t.label}s
                </span>
                <span className="text-xs" style={{ color: "var(--muted2)" }}>({items.length})</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {items.map(rel => (
                  <div key={rel.ticker} className="p-3 rounded-xl transition-all hover:scale-[1.02]"
                    style={{ background: t.bg, border: `1px solid ${t.color}25` }}>
                    <div className="font-bold text-sm" style={{ color: t.color }}>{rel.ticker}</div>
                    <div className="text-xs font-medium mb-1" style={{ color: "var(--text)" }}>{rel.name}</div>
                    {rel.detail && (
                      <div className="text-xs" style={{ color: "var(--muted2)" }}>{rel.detail}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
