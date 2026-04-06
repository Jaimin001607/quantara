"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createChart, CandlestickSeries, IChartApi, ISeriesApi, CandlestickData, Time } from "lightweight-charts";

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
  { label: "1D",  resolution: "H" },
  { label: "1M",  resolution: "D" },
  { label: "3M",  resolution: "D" },
  { label: "1Y",  resolution: "W" },
  { label: "5Y",  resolution: "M" },
  { label: "All", resolution: "M" },
];

// How many months back to show for each range (0 = all data from API)
const RANGE_MONTHS: Record<string, number> = {
  "1D": 0, "1M": 1, "3M": 3, "1Y": 12, "5Y": 60, "All": 0,
};

function fmt(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function PriceChartModal({ ticker, companyName, currentPrice, onClose }: Props) {
  const [rangeIdx, setRangeIdx] = useState(3); // default 1Y
  const [data, setData]         = useState<ChartData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef          = useRef<IChartApi | null>(null);
  const seriesRef         = useRef<ISeriesApi<"Candlestick"> | null>(null);

  const range = RANGES[rangeIdx];

  // ── Fetch data ────────────────────────────────────────────────────────────
  const fetchChart = useCallback(async (resolution: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/company/${ticker}/price-chart?resolution=${resolution}`);
      if (!res.ok) throw new Error("No data");
      setData(await res.json());
    } catch {
      setError("Price history unavailable.");
    } finally {
      setLoading(false);
    }
  }, [ticker]);

  useEffect(() => { fetchChart(range.resolution); }, [rangeIdx]); // eslint-disable-line

  // ── Build chart ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!chartContainerRef.current || loading || error || !data) return;

    // Destroy previous chart
    if (chartRef.current) { chartRef.current.remove(); chartRef.current = null; }

    const months = RANGE_MONTHS[range.label];
    const cutoff = months > 0 ? (() => { const d = new Date(); d.setMonth(d.getMonth() - months); return d; })() : null;

    const isIntraday = range.resolution === "H";

    // Build candle data
    const candles: CandlestickData[] = data.points
      .filter(p => {
        if (!cutoff) return true;
        return new Date(isIntraday ? p.date : p.date + "T00:00:00Z") >= cutoff;
      })
      .filter(p => p.open != null && p.high != null && p.low != null && p.close != null)
      .map(p => ({
        time: (isIntraday
          ? Math.floor(new Date(p.date + ":00Z").getTime() / 1000)
          : p.date) as Time,
        open:  p.open  as number,
        high:  p.high  as number,
        low:   p.low   as number,
        close: p.close as number,
      }));

    if (candles.length === 0) { setError("No candle data available."); return; }

    const isUp = candles[candles.length - 1].close >= candles[0].open;

    const chart = createChart(chartContainerRef.current, {
      width:  chartContainerRef.current.clientWidth,
      height: 340,
      layout: {
        background: { color: "#ffffff" },
        textColor:  "#64748b",
        fontSize:   11,
        fontFamily: "Inter, sans-serif",
      },
      grid: {
        vertLines:   { color: "#f0f2f8" },
        horzLines:   { color: "#f0f2f8" },
      },
      crosshair: { mode: 1 },
      rightPriceScale: {
        borderColor: "#e4e8f2",
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderColor:     "#e4e8f2",
        timeVisible:     isIntraday,
        secondsVisible:  false,
        tickMarkFormatter: isIntraday
          ? (t: number) => {
              const d = new Date(t * 1000);
              const h = d.getUTCHours();
              const m = d.getUTCMinutes();
              const period = h >= 12 ? "PM" : "AM";
              return `${h % 12 || 12}${m ? `:${String(m).padStart(2,"0")}` : ""} ${period}`;
            }
          : undefined,
      },
      handleScale:  true,
      handleScroll: true,
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor:         "#059669",
      downColor:       "#dc2626",
      borderUpColor:   "#059669",
      borderDownColor: "#dc2626",
      wickUpColor:     "#059669",
      wickDownColor:   "#dc2626",
    });

    series.setData(candles);
    chart.timeScale().fitContent();

    chartRef.current  = chart;
    seriesRef.current = series;

    // Resize observer
    const ro = new ResizeObserver(() => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    });
    ro.observe(chartContainerRef.current);

    return () => { ro.disconnect(); };
  }, [data, loading, error, rangeIdx]); // eslint-disable-line

  // Cleanup on unmount
  useEffect(() => () => { chartRef.current?.remove(); }, []);

  // Escape key
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  // ── Compute header stats from visible candles ─────────────────────────────
  const months = RANGE_MONTHS[range.label];
  const cutoff = months > 0 ? (() => { const d = new Date(); d.setMonth(d.getMonth() - months); return d; })() : null;
  const isIntraday = range.resolution === "H";
  const visible = data?.points.filter(p => {
    if (!cutoff) return true;
    return new Date(isIntraday ? p.date : p.date + "T00:00:00Z") >= cutoff;
  }) ?? [];
  const firstClose = visible[0]?.close ?? 0;
  const lastClose  = visible[visible.length - 1]?.close ?? 0;
  const rangePct   = firstClose ? ((lastClose - firstClose) / firstClose * 100) : 0;
  const isUp       = rangePct >= 0;

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
                {data.first_date} – {data.last_date} · {visible.length} candles
              </div>
            )}
          </div>
          <button onClick={onClose} style={{
            width: 36, height: 36, borderRadius: "50%", border: "1px solid #e4e8f2",
            background: "#f7f8fc", cursor: "pointer", fontSize: 18, color: "#64748b",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>×</button>
        </div>

        {/* Range selector */}
        <div style={{ display: "flex", gap: 6, padding: "12px 28px", borderBottom: "1px solid #f0f2f8" }}>
          {RANGES.map((r, i) => (
            <button key={r.label} onClick={() => setRangeIdx(i)} style={{
              padding: "5px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
              cursor: "pointer", border: "1px solid",
              borderColor: i === rangeIdx ? "#4f46e5" : "#e4e8f2",
              background:  i === rangeIdx ? "#4f46e5" : "transparent",
              color:       i === rangeIdx ? "#ffffff" : "#6b7280",
              transition: "all 0.15s", fontFamily: "Inter, sans-serif",
            }}>
              {r.label}
            </button>
          ))}
          <div style={{ marginLeft: "auto", fontSize: 11, color: "#9ca3af", alignSelf: "center" }}>
            Candlestick · {range.label === "1D" ? "5-min" : range.label === "1M" || range.label === "3M" ? "Daily" : range.label === "1Y" ? "Weekly" : "Monthly"}
          </div>
        </div>

        {/* Chart */}
        <div style={{ flex: 1, padding: "8px 0 0", minHeight: 340 }}>
          {loading && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 340, color: "#9ca3af", fontSize: 13 }}>
              Loading…
            </div>
          )}
          {error && !loading && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 340, color: "#dc2626", fontSize: 13 }}>
              {error}
            </div>
          )}
          <div ref={chartContainerRef} style={{ width: "100%", display: loading || error ? "none" : "block" }} />
        </div>

        <div style={{ padding: "8px 28px 14px", fontSize: 11, color: "#9ca3af", borderTop: "1px solid #f0f2f8" }}>
          ⚠ Market data · Not financial advice · Esc to close
        </div>
      </div>
    </div>
  );
}
