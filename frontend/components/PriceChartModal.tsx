"use client";

import { useEffect, useState, useCallback } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001/api/v1";

interface Point {
  date: string;
  close: number | null;
  open?: number | null;
  high?: number | null;
  low?: number | null;
}

interface ChartData {
  ticker: string;
  resolution: string;
  points: Point[];
  first_date: string;
  last_date: string;
  first_price: number;
  last_price: number;
  pct_change: number;
}

interface Props {
  ticker: string;
  companyName: string;
  currentPrice: number | null;
  onClose: () => void;
}

const RANGES = [
  { label: "1M",  months: 1,   resolution: "D" },
  { label: "3M",  months: 3,   resolution: "D" },
  { label: "1Y",  months: 12,  resolution: "W" },
  { label: "5Y",  months: 60,  resolution: "M" },
  { label: "All", months: 999, resolution: "M" },
];

function fmt(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(dateStr: string, resolution: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  if (resolution === "D" || resolution === "W") {
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  }
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as Point;
  return (
    <div style={{
      background: "#fff", border: "1px solid #e4e8f2", borderRadius: 10,
      padding: "10px 14px", boxShadow: "0 4px 16px rgba(0,0,0,0.10)", fontSize: 12,
    }}>
      <div style={{ fontWeight: 700, marginBottom: 4, color: "#0f172a" }}>{label}</div>
      <div style={{ color: "#4f46e5" }}>Close: <strong>${fmt(p.close)}</strong></div>
      {p.high != null && <div style={{ color: "#059669" }}>High: ${fmt(p.high)}</div>}
      {p.low  != null && <div style={{ color: "#dc2626" }}>Low: ${fmt(p.low)}</div>}
    </div>
  );
};

export default function PriceChartModal({ ticker, companyName, currentPrice, onClose }: Props) {
  const [rangeIdx, setRangeIdx]   = useState(2); // default 1Y
  const [data, setData]           = useState<ChartData | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  const range = RANGES[rangeIdx];

  const fetchChart = useCallback(async (resolution: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/company/${ticker}/price-chart?resolution=${resolution}`);
      if (!res.ok) throw new Error("No data");
      const json: ChartData = await res.json();
      setData(json);
    } catch {
      setError("Price history unavailable for this ticker.");
    } finally {
      setLoading(false);
    }
  }, [ticker]);

  useEffect(() => {
    fetchChart(range.resolution);
  }, [rangeIdx]); // eslint-disable-line

  // Filter points to selected range
  const visiblePoints = (() => {
    if (!data) return [];
    if (range.months >= 999) return data.points;
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - range.months);
    return data.points.filter(p => new Date(p.date) >= cutoff);
  })();

  const rangeFirst = visiblePoints[0]?.close ?? data?.first_price ?? 0;
  const rangeLast  = visiblePoints[visiblePoints.length - 1]?.close ?? data?.last_price ?? 0;
  const rangePct   = rangeFirst ? ((rangeLast - rangeFirst) / rangeFirst * 100) : 0;
  const isUp       = rangePct >= 0;

  // Escape key closes modal
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(15,23,42,0.45)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "24px",
      }}
    >
      <div style={{
        background: "#ffffff", borderRadius: 20, width: "100%", maxWidth: 900,
        maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column",
        boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
        border: "1px solid #e4e8f2",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "flex-start", justifyContent: "space-between",
          padding: "24px 28px 16px",
          borderBottom: "1px solid #e4e8f2",
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: "#4f46e5" }}>{ticker}</span>
              <span style={{ fontSize: 16, fontWeight: 500, color: "#64748b" }}>{companyName}</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginTop: 6 }}>
              <span style={{ fontSize: 32, fontWeight: 800, color: "#0f172a" }}>
                ${fmt(currentPrice)}
              </span>
              <span style={{
                fontSize: 14, fontWeight: 700,
                color: isUp ? "#059669" : "#dc2626",
              }}>
                {isUp ? "▲" : "▼"} {Math.abs(rangePct).toFixed(2)}% ({range.label})
              </span>
            </div>
            {data && (
              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
                {data.first_date} – {data.last_date} · {data.count} data points
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            style={{
              width: 36, height: 36, borderRadius: "50%", border: "1px solid #e4e8f2",
              background: "#f7f8fc", cursor: "pointer", fontSize: 18, color: "#64748b",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>

        {/* Range selector */}
        <div style={{ display: "flex", gap: 6, padding: "12px 28px", borderBottom: "1px solid #f0f2f8" }}>
          {RANGES.map((r, i) => (
            <button
              key={r.label}
              onClick={() => setRangeIdx(i)}
              style={{
                padding: "5px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                cursor: "pointer", border: "1px solid",
                borderColor: i === rangeIdx ? "#4f46e5" : "#e4e8f2",
                background: i === rangeIdx ? "#4f46e5" : "transparent",
                color: i === rangeIdx ? "#ffffff" : "#6b7280",
                transition: "all 0.15s",
                fontFamily: "Inter, sans-serif",
              }}
            >
              {r.label}
            </button>
          ))}
          <div style={{ marginLeft: "auto", fontSize: 11, color: "#9ca3af", alignSelf: "center" }}>
            Source: Finnhub · {range.resolution === "D" ? "Daily" : range.resolution === "W" ? "Weekly" : "Monthly"} candles
          </div>
        </div>

        {/* Chart */}
        <div style={{ flex: 1, padding: "16px 12px 8px", minHeight: 320 }}>
          {loading && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 320, color: "#9ca3af", fontSize: 13 }}>
              Loading price history…
            </div>
          )}
          {error && !loading && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 320, color: "#dc2626", fontSize: 13 }}>
              {error}
            </div>
          )}
          {!loading && !error && visiblePoints.length > 0 && (
            <ResponsiveContainer width="100%" height={340}>
              <AreaChart data={visiblePoints} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={isUp ? "#4f46e5" : "#dc2626"} stopOpacity={0.15}/>
                    <stop offset="95%" stopColor={isUp ? "#4f46e5" : "#dc2626"} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f8" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={d => fmtDate(d, range.resolution)}
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickFormatter={v => `$${v >= 1000 ? (v/1000).toFixed(1)+"k" : v}`}
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                  width={52}
                  domain={["auto", "auto"]}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="close"
                  stroke={isUp ? "#4f46e5" : "#dc2626"}
                  strokeWidth={2}
                  fill="url(#priceGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: isUp ? "#4f46e5" : "#dc2626", stroke: "#fff", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div style={{ padding: "8px 28px 16px", fontSize: 11, color: "#9ca3af", borderTop: "1px solid #f0f2f8" }}>
          ⚠ Market data provided by Finnhub · Not financial advice · For informational use only · Press Esc to close
        </div>
      </div>
    </div>
  );
}
