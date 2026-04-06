"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { createChart, CandlestickSeries, UTCTimestamp } from "lightweight-charts";

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
  { label: "1D",  resolution: "H",  months: 0  },
  { label: "1M",  resolution: "D",  months: 1  },
  { label: "3M",  resolution: "D",  months: 3  },
  { label: "1Y",  resolution: "W",  months: 12 },
  { label: "5Y",  resolution: "M",  months: 60 },
  { label: "All", resolution: "M",  months: 0  },
];

function fmt(n: number | null | undefined) {
  if (n == null) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtAxisDate(dateStr: string, resolution: string) {
  const d = new Date(dateStr + "T00:00:00Z");
  if (resolution === "D" || resolution === "W")
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

// Parse "2026-04-02T13:30" → Unix seconds (UTC)
function parseIntradayTs(dateStr: string): UTCTimestamp {
  const [datePart, timePart = "00:00"] = dateStr.split("T");
  const [y, mo, d] = datePart.split("-").map(Number);
  const [h, mi]    = timePart.split(":").map(Number);
  return (Date.UTC(y, mo - 1, d, h, mi) / 1000) as UTCTimestamp;
}

const AreaTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as Point;
  return (
    <div style={{ background: "#fff", border: "1px solid #e4e8f2", borderRadius: 10, padding: "10px 14px", boxShadow: "0 4px 16px rgba(0,0,0,0.10)", fontSize: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 4, color: "#0f172a" }}>{label}</div>
      <div style={{ color: "#4f46e5" }}>Close: <strong>${fmt(p.close)}</strong></div>
      {p.high != null && <div style={{ color: "#059669" }}>High: ${fmt(p.high)}</div>}
      {p.low  != null && <div style={{ color: "#dc2626" }}>Low: ${fmt(p.low)}</div>}
    </div>
  );
};

export default function PriceChartModal({ ticker, companyName, currentPrice, onClose }: Props) {
  const [rangeIdx, setRangeIdx] = useState(3);
  const [data, setData]         = useState<ChartData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const candleContainerRef = useRef<HTMLDivElement>(null);

  const range    = RANGES[rangeIdx];
  const is1D     = range.label === "1D";

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchChart = useCallback(async (res: string) => {
    setLoading(true); setError(null);
    try {
      const r = await fetch(`${API}/company/${ticker}/price-chart?resolution=${res}`);
      if (!r.ok) throw new Error("No data");
      setData(await r.json());
    } catch { setError("Price history unavailable."); }
    finally { setLoading(false); }
  }, [ticker]);

  useEffect(() => { fetchChart(range.resolution); }, [rangeIdx]); // eslint-disable-line

  // ── Filter visible points for area chart ──────────────────────────────────
  const visiblePoints = (() => {
    if (!data || is1D) return data?.points ?? [];
    if (range.months === 0) return data.points;
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - range.months);
    return data.points.filter(p => new Date(p.date + "T00:00:00Z") >= cutoff);
  })();

  const firstClose = visiblePoints[0]?.close ?? 0;
  const lastClose  = visiblePoints[visiblePoints.length - 1]?.close ?? 0;
  const rangePct   = firstClose ? ((lastClose - firstClose) / firstClose * 100) : 0;
  const isUp       = rangePct >= 0;

  // ── Build TradingView candle chart (1D only) ───────────────────────────────
  useEffect(() => {
    if (!is1D || !candleContainerRef.current || loading || !data) return;

    const container = candleContainerRef.current;
    container.innerHTML = "";

    const candles = data.points
      .filter(p => p.open != null && p.high != null && p.low != null && p.close != null)
      .map(p => ({
        time:  parseIntradayTs(p.date),
        open:  p.open  as number,
        high:  p.high  as number,
        low:   p.low   as number,
        close: p.close as number,
      }))
      .sort((a, b) => (a.time as number) - (b.time as number));

    if (candles.length === 0) { setError("No candle data."); return; }

    const chart = createChart(container, {
      width:  container.clientWidth,
      height: 340,
      layout: { background: { color: "#ffffff" }, textColor: "#64748b", fontSize: 11, fontFamily: "Inter, sans-serif" },
      grid: { vertLines: { color: "#f0f2f8" }, horzLines: { color: "#f0f2f8" } },
      crosshair: { mode: 1 },
      rightPriceScale: { borderColor: "#e4e8f2", scaleMargins: { top: 0.1, bottom: 0.1 } },
      timeScale: {
        borderColor: "#e4e8f2",
        timeVisible: true,
        secondsVisible: false,
        tickMarkFormatter: (t: UTCTimestamp) => {
          const d = new Date((t as number) * 1000);
          const h = d.getUTCHours(), m = d.getUTCMinutes();
          const period = h >= 12 ? "PM" : "AM";
          return `${h % 12 || 12}${m ? `:${String(m).padStart(2, "0")}` : ""} ${period}`;
        },
      },
      handleScale: true, handleScroll: true,
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#059669", downColor: "#dc2626",
      borderUpColor: "#059669", borderDownColor: "#dc2626",
      wickUpColor: "#059669", wickDownColor: "#dc2626",
    });

    series.setData(candles);
    chart.timeScale().fitContent();

    const ro = new ResizeObserver(() => chart.applyOptions({ width: container.clientWidth }));
    ro.observe(container);

    return () => { ro.disconnect(); chart.remove(); };
  }, [is1D, data, loading]); // eslint-disable-line

  // Escape key
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(15,23,42,0.45)", backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: "24px",
    }}>
      <div style={{
        background: "#ffffff", borderRadius: 20, width: "100%", maxWidth: 960,
        maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column",
        boxShadow: "0 24px 64px rgba(0,0,0,0.18)", border: "1px solid #e4e8f2",
      }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "24px 28px 16px", borderBottom: "1px solid #e4e8f2" }}>
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: "#4f46e5" }}>{ticker}</span>
              <span style={{ fontSize: 16, fontWeight: 500, color: "#64748b" }}>{companyName}</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginTop: 6 }}>
              <span style={{ fontSize: 32, fontWeight: 800, color: "#0f172a" }}>${fmt(currentPrice)}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: isUp ? "#059669" : "#dc2626" }}>
                {isUp ? "▲" : "▼"} {Math.abs(rangePct).toFixed(2)}% ({range.label})
              </span>
            </div>
            {data && (
              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
                {data.first_date} – {data.last_date} · {visiblePoints.length} {is1D ? "5-min candles" : "data points"}
              </div>
            )}
          </div>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: "50%", border: "1px solid #e4e8f2", background: "#f7f8fc", cursor: "pointer", fontSize: 18, color: "#64748b", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>×</button>
        </div>

        {/* Range tabs */}
        <div style={{ display: "flex", gap: 6, padding: "12px 28px", borderBottom: "1px solid #f0f2f8" }}>
          {RANGES.map((r, i) => (
            <button key={r.label} onClick={() => setRangeIdx(i)} style={{
              padding: "5px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
              cursor: "pointer", border: "1px solid",
              borderColor: i === rangeIdx ? "#4f46e5" : "#e4e8f2",
              background:  i === rangeIdx ? "#4f46e5" : "transparent",
              color:       i === rangeIdx ? "#ffffff" : "#6b7280",
              transition: "all 0.15s", fontFamily: "Inter, sans-serif",
            }}>{r.label}</button>
          ))}
          <div style={{ marginLeft: "auto", fontSize: 11, color: "#9ca3af", alignSelf: "center" }}>
            {is1D ? "Candlestick · 5-min" : `Area · ${range.resolution === "D" ? "Daily" : range.resolution === "W" ? "Weekly" : "Monthly"}`}
          </div>
        </div>

        {/* Chart area */}
        <div style={{ flex: 1, minHeight: 340 }}>
          {loading && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 340, color: "#9ca3af", fontSize: 13 }}>Loading…</div>
          )}
          {error && !loading && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 340, color: "#dc2626", fontSize: 13 }}>{error}</div>
          )}

          {/* 1D — TradingView candlestick */}
          {is1D && !loading && !error && (
            <div ref={candleContainerRef} style={{ width: "100%", height: 340 }} />
          )}

          {/* All other ranges — Recharts area chart */}
          {!is1D && !loading && !error && visiblePoints.length > 0 && (
            <div style={{ padding: "16px 12px 8px" }}>
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={visiblePoints} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={isUp ? "#4f46e5" : "#dc2626"} stopOpacity={0.15} />
                      <stop offset="95%" stopColor={isUp ? "#4f46e5" : "#dc2626"} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f8" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={d => fmtAxisDate(d, range.resolution)} tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tickFormatter={v => `$${v >= 1000 ? (v / 1000).toFixed(1) + "k" : v}`} tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={52} domain={["auto", "auto"]} />
                  <Tooltip content={<AreaTooltip />} />
                  <Area type="monotone" dataKey="close" stroke={isUp ? "#4f46e5" : "#dc2626"} strokeWidth={2} fill="url(#priceGrad)" dot={false} activeDot={{ r: 4, fill: isUp ? "#4f46e5" : "#dc2626", stroke: "#fff", strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div style={{ padding: "8px 28px 14px", fontSize: 11, color: "#9ca3af", borderTop: "1px solid #f0f2f8" }}>
          ⚠ Market data · Not financial advice · Esc to close
        </div>
      </div>
    </div>
  );
}
