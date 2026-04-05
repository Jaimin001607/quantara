"use client";

import { Financials, fmtBig } from "@/lib/api";
import SectionHeader from "./SectionHeader";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";

interface Props { financials: Financials | null; }

const TT_STYLE = {
  background: "#12131a",
  border: "1px solid #1f2030",
  borderRadius: 10,
  color: "#e2e8f0",
  fontFamily: "Inter, sans-serif",
  fontSize: 12,
};

export default function FinancialsPanel({ financials }: Props) {
  if (!financials) return (
    <div className="card">
      <SectionHeader title="Financials" />
      <p className="text-sm" style={{ color: "var(--muted2)" }}>No financial data available.</p>
    </div>
  );

  const { revenue, net_income, total_assets, total_liab } = financials;
  const years = Array.from(new Set([...Object.keys(revenue ?? {}), ...Object.keys(net_income ?? {})])).sort();
  const chartData = years.map(y => ({
    year: y,
    Revenue:     (revenue?.[y] ?? 0) / 1e9,
    "Net Income": (net_income?.[y] ?? 0) / 1e9,
  }));

  const rows = [
    { label: "Revenue",      data: revenue },
    { label: "Net Income",   data: net_income },
    { label: "Total Assets", data: total_assets },
    { label: "Total Liab.",  data: total_liab },
  ];
  const tableYears = Object.keys(revenue ?? {}).sort();

  return (
    <div className="card">
      <SectionHeader title="Financials" subtitle="billions USD" />

      {/* Table */}
      {tableYears.length > 0 && (
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border2)" }}>
                <th className="text-left py-2 pr-4 label">Metric</th>
                {tableYears.map(y => <th key={y} className="text-right py-2 px-3 label">{y}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ label, data }) => (
                <tr key={label} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td className="py-2 pr-4 text-xs" style={{ color: "var(--muted2)" }}>{label}</td>
                  {tableYears.map(y => (
                    <td key={y} className="text-right py-2 px-3 text-sm font-semibold" style={{ color: "var(--text)" }}>
                      {fmtBig(data?.[y])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Chart */}
      {chartData.length > 0 && (
        <div style={{ borderRadius: 12, overflow: "hidden", background: "var(--bg2)", padding: "16px 0" }}>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
              <XAxis dataKey="year" tick={{ fill: "#4b5280", fontSize: 11, fontFamily: "Inter" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#4b5280", fontSize: 11, fontFamily: "Inter" }} axisLine={false} tickLine={false}
                tickFormatter={v => `$${v.toFixed(0)}B`} width={52} />
              <Tooltip contentStyle={TT_STYLE} formatter={(v: number) => [`$${v.toFixed(2)}B`]} />
              <Legend wrapperStyle={{ fontSize: 11, fontFamily: "Inter", color: "#6b7280" }} />
              <Bar dataKey="Revenue"    fill="#6366f1" radius={[4,4,0,0]} />
              <Bar dataKey="Net Income" fill="#10b981" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
