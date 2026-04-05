"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { CompanyFull, fmt, fmtBig } from "@/lib/api";

interface Relationship {
  ticker: string;
  name: string;
  relationship: "supplier" | "customer" | "competitor";
  detail?: string;
}

interface Props {
  data: CompanyFull;
  supplyChain: Relationship[];
  onEnterDashboard: () => void;
}

interface Node {
  id: string;
  x: number;
  y: number;
  r: number;
  label: string;
  value: string;
  sub?: string;
  color: string;
  glow: string;
  kind: "center" | "financial" | "supplier" | "competitor" | "customer";
  fixed?: boolean; // supply chain nodes are fixed on sides
}

const W = 1500;
const H = 820;
const CX = 750;
const CY = 420;
const CR = 108;
const FIN_DIST = 255;
const FIN_R = 66;
const SIDE_R = 46;        // smaller radius for supply chain nodes
const SIDE_MIN_GAP = 24;  // minimum gap between side bubbles

// Angles for 6 financial bubbles spaced 60° apart — no overlap guaranteed
const FIN_ANGLES = [270, 330, 30, 90, 150, 210];

function buildNodes(data: CompanyFull, supply: Relationship[]): Node[] {
  const q   = data.quote;
  const f   = data.financials;
  const news = data.news;
  const ai  = data.ai_analysis;
  const sig  = ai?.signal ?? "N/A";
  const sigColor = sig === "BUY" ? "#10b981" : sig === "SELL" ? "#ef4444" : "#f59e0b";

  const finSlots: { label: string; value: string; sub?: string; color: string; glow: string }[] = [];

  if (q?.price != null) {
    const up = (q.change_pct ?? 0) >= 0;
    finSlots.push({
      label: "Stock Price",
      value: `$${fmt(q.price)}`,
      sub: q.change_pct != null ? `${up ? "▲" : "▼"} ${Math.abs(q.change_pct).toFixed(2)}%` : undefined,
      color: up ? "#10b981" : "#ef4444",
      glow: up ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)",
    });
  }
  if (q?.market_cap != null) {
    finSlots.push({ label: "Mkt Cap", value: fmtBig(q.market_cap), color: "#3b82f6", glow: "rgba(59,130,246,0.3)" });
  }
  if (f?.revenue) {
    const yr = Object.keys(f.revenue).sort().reverse()[0];
    const v  = yr ? f.revenue[yr] : null;
    if (v) finSlots.push({ label: "Revenue", value: fmtBig(v), sub: yr, color: "#f59e0b", glow: "rgba(245,158,11,0.3)" });
  }
  if (f?.net_income) {
    const yr = Object.keys(f.net_income).sort().reverse()[0];
    const v  = yr ? f.net_income[yr] : null;
    if (v != null) finSlots.push({ label: "Net Income", value: fmtBig(v), color: v >= 0 ? "#10b981" : "#ef4444", glow: v >= 0 ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)" });
  }
  if (news.length > 0) {
    const pos = news.filter(n => n.sentiment === "positive").length;
    const neg = news.filter(n => n.sentiment === "negative").length;
    const lbl = pos > neg ? "Positive" : neg > pos ? "Negative" : "Neutral";
    const col = pos > neg ? "#10b981" : neg > pos ? "#ef4444" : "#6b7280";
    finSlots.push({ label: "News", value: lbl, sub: `${news.length} articles`, color: col, glow: `${col}50` });
  }
  finSlots.push({ label: "AI Signal", value: sig, color: sigColor, glow: `${sigColor}50` });

  const nodes: Node[] = [];

  // Center node
  nodes.push({
    id: "center", kind: "center",
    x: CX, y: CY, r: CR,
    label: data.company.ticker,
    value: data.company.name ?? data.company.ticker,
    sub: data.company.sector ?? undefined,
    color: "#818cf8", glow: "rgba(99,102,241,0.4)",
  });

  // Financial satellites — evenly spaced, strict 60° intervals
  finSlots.slice(0, 6).forEach((slot, i) => {
    const angle = (FIN_ANGLES[i] * Math.PI) / 180;
    nodes.push({
      id: `fin-${i}`, kind: "financial",
      x: CX + Math.cos(angle) * FIN_DIST,
      y: CY + Math.sin(angle) * FIN_DIST,
      r: FIN_R,
      ...slot,
    });
  });

  // Supply chain — LEFT side (suppliers), RIGHT side (competitors + customers)
  const suppliers   = supply.filter(s => s.relationship === "supplier");
  const rightSide   = supply.filter(s => s.relationship !== "supplier");

  const placeGroup = (items: Relationship[], side: "left" | "right") => {
    const count = items.length;
    if (!count) return;
    const xBase   = side === "left" ? 170 : W - 170;
    // Enforce minimum spacing so bubbles never overlap
    const minSpacing = SIDE_R * 2 + SIDE_MIN_GAP;
    const availH     = H - 100;
    const spacing    = Math.max(minSpacing, availH / Math.max(count, 1));
    const totalH     = spacing * (count - 1);
    const startY     = CY - totalH / 2;
    items.forEach((rel, i) => {
      const col = rel.relationship === "supplier"   ? "#3b82f6"
                : rel.relationship === "customer"   ? "#10b981"
                : "#ef4444";
      nodes.push({
        id: `sc-${side}-${i}`,
        kind: rel.relationship as "supplier" | "competitor" | "customer",
        x: xBase,
        y: startY + i * spacing,
        r: SIDE_R,
        label: rel.ticker || (rel.name ?? "").slice(0, 6),
        value: rel.name ?? rel.ticker ?? "",
        sub: rel.detail?.slice(0, 30) ?? undefined,
        color: col,
        glow: `${col}40`,
        fixed: false,
      });
    });
  };

  placeGroup(suppliers, "left");
  placeGroup(rightSide, "right");

  return nodes;
}

export default function BubbleMap({ data, supplyChain, onEnterDashboard }: Props) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef<{ id: string; ox: number; oy: number; mx: number; my: number } | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    setNodes(buildNodes(data, supplyChain));
  }, [data, supplyChain]);

  // Drag handlers
  const onMouseDown = useCallback((e: React.MouseEvent, id: string) => {
    if (id === "center") return; // don't drag center
    e.preventDefault();
    const svg = svgRef.current!;
    const pt  = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const svgPt = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    const node = nodes.find(n => n.id === id)!;
    dragging.current = { id, ox: node.x, oy: node.y, mx: svgPt.x, my: svgPt.y };
  }, [nodes]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging.current || !svgRef.current) return;
    const svg = svgRef.current;
    const pt  = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const svgPt = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    const dx = svgPt.x - dragging.current.mx;
    const dy = svgPt.y - dragging.current.my;
    const id = dragging.current.id;
    setNodes(prev => prev.map(n => n.id === id
      ? { ...n, x: dragging.current!.ox + dx, y: dragging.current!.oy + dy }
      : n
    ));
  }, []);

  const onMouseUp = useCallback(() => { dragging.current = null; }, []);

  if (!nodes.length) return null;

  const center     = nodes.find(n => n.id === "center")!;
  const financials = nodes.filter(n => n.kind === "financial");
  const suppliers  = nodes.filter(n => n.kind === "supplier");
  const rightNodes = nodes.filter(n => n.kind === "competitor" || n.kind === "customer");

  // Supply chain hub points (where thick line meets center)
  const leftHubX     = center.x - CR - 10;
  const rightHubX    = center.x + CR + 10;
  const leftAnchorX  = suppliers.length  ? 170 + SIDE_R + 20 : leftHubX - 100;
  const rightAnchorX = rightNodes.length ? W - 170 - SIDE_R - 20 : rightHubX + 100;

  return (
    <div style={{ width: "100%", height: "100%", minHeight: "100vh", background: "var(--bg)", position: "relative", overflow: "hidden" }}>
      {/* Legend */}
      <div style={{ position: "absolute", top: 20, left: 24, zIndex: 10 }}>
        <div style={{ color: "var(--accent2)", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>
          Quantara · Intelligence Map
        </div>
        <div style={{ color: "var(--muted2)", fontSize: 11 }}>
          Drag nodes · Click center to open full analysis
        </div>
      </div>

      {/* Legend chips */}
      {(suppliers.length > 0 || rightNodes.length > 0) && (
        <div style={{ position: "absolute", top: 20, right: 24, zIndex: 10, display: "flex", gap: 8 }}>
          {suppliers.length > 0 && (
            <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 100, background: "rgba(59,130,246,0.12)", color: "#3b82f6", border: "1px solid rgba(59,130,246,0.25)", fontWeight: 600 }}>
              ← SUPPLIERS
            </span>
          )}
          {rightNodes.length > 0 && (
            <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 100, background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.25)", fontWeight: 600 }}>
              COMPETITORS →
            </span>
          )}
        </div>
      )}

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        style={{ userSelect: "none" }}
      >
        <defs>
          {nodes.map(n => (
            <radialGradient key={`rg-${n.id}`} id={`rg-${n.id}`} cx="38%" cy="32%">
              <stop offset="0%" stopColor={n.color} stopOpacity="0.22" />
              <stop offset="100%" stopColor={n.color} stopOpacity="0.04" />
            </radialGradient>
          ))}
          <filter id="blur-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="10" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="center-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="16" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <marker id="arrow-left" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
            <path d="M8,0 L0,4 L8,8" fill="none" stroke="#3b82f6" strokeWidth="1.5" opacity="0.5"/>
          </marker>
          <marker id="arrow-right" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8" fill="none" stroke="#ef4444" strokeWidth="1.5" opacity="0.5"/>
          </marker>
        </defs>

        {/* ── SUPPLY CHAIN: thick horizontal backbone lines ── */}
        {suppliers.length > 0 && (
          <>
            {/* Backbone: center ← left hub */}
            <line
              x1={leftHubX} y1={center.y}
              x2={leftAnchorX} y2={center.y}
              stroke="#3b82f6" strokeWidth={3} strokeOpacity={0.25}
              markerEnd="url(#arrow-left)"
            />
            {/* Label on backbone */}
            <text x={(leftHubX + leftAnchorX) / 2} y={center.y - 10}
              textAnchor="middle" fill="#3b82f6" fontSize={10} opacity={0.6} fontFamily="Inter">
              SUPPLIERS
            </text>
            {/* Branch lines to each supplier */}
            {suppliers.map(n => (
              <line key={`bl-${n.id}`}
                x1={leftAnchorX} y1={center.y}
                x2={n.x + n.r} y2={n.y}
                stroke="#3b82f6" strokeWidth={1.5} strokeOpacity={0.2} strokeDasharray="5 5"
              />
            ))}
          </>
        )}

        {rightNodes.length > 0 && (
          <>
            {/* Backbone: center → right hub */}
            <line
              x1={rightHubX} y1={center.y}
              x2={rightAnchorX} y2={center.y}
              stroke="#ef4444" strokeWidth={3} strokeOpacity={0.25}
              markerEnd="url(#arrow-right)"
            />
            <text x={(rightHubX + rightAnchorX) / 2} y={center.y - 10}
              textAnchor="middle" fill="#ef4444" fontSize={10} opacity={0.6} fontFamily="Inter">
              COMPETITORS
            </text>
            {rightNodes.map(n => (
              <line key={`bl-${n.id}`}
                x1={rightAnchorX} y1={center.y}
                x2={n.x - n.r} y2={n.y}
                stroke="#ef4444" strokeWidth={1.5} strokeOpacity={0.2} strokeDasharray="5 5"
              />
            ))}
          </>
        )}

        {/* ── FINANCIAL: dashed spoke lines ── */}
        {financials.map(n => (
          <line key={`fl-${n.id}`}
            x1={center.x + Math.cos(Math.atan2(n.y - center.y, n.x - center.x)) * (CR + 4)}
            y1={center.y + Math.sin(Math.atan2(n.y - center.y, n.x - center.x)) * (CR + 4)}
            x2={n.x - Math.cos(Math.atan2(n.y - center.y, n.x - center.x)) * (n.r + 2)}
            y2={n.y - Math.sin(Math.atan2(n.y - center.y, n.x - center.x)) * (n.r + 2)}
            stroke={n.color} strokeWidth={1} strokeOpacity={0.2} strokeDasharray="6 6"
          />
        ))}

        {/* ── SATELLITE + SUPPLY CHAIN BUBBLES ── */}
        {[...financials, ...suppliers, ...rightNodes].map(n => {
          const isHov = hovered === n.id;
          const scale = isHov ? 1.06 : 1;
          return (
            <g key={n.id}
              transform={`translate(${n.x},${n.y}) scale(${scale})`}
              style={{ cursor: "grab", transformBox: "fill-box", transformOrigin: "center", transition: "transform 0.15s" }}
              onMouseDown={e => onMouseDown(e, n.id)}
              onMouseEnter={() => setHovered(n.id)}
              onMouseLeave={() => setHovered(null)}
            >
              {/* Outer glow */}
              <circle r={n.r + 12} fill="none" stroke={n.color} strokeWidth={1} strokeOpacity={0.1} />
              {/* Fill */}
              <circle r={n.r} fill={`url(#rg-${n.id})`} stroke={n.color} strokeWidth={1.5} strokeOpacity={isHov ? 0.7 : 0.4} />
              {/* Label */}
              <text y={n.sub ? -14 : -8} textAnchor="middle" fill="#6b7280" fontSize={10} fontFamily="Inter" fontWeight={500}>
                {n.label}
              </text>
              {/* Value */}
              <text y={n.sub ? 4 : 7} textAnchor="middle" fill={n.color} fontSize={n.r > 60 ? 15 : 13} fontFamily="Inter" fontWeight={700}>
                {(n.value ?? "").length > 16 ? (n.value ?? "").slice(0, 16) + "…" : (n.value ?? "")}
              </text>
              {/* Sub */}
              {n.sub && (
                <text y={19} textAnchor="middle" fill="#9ca3af" fontSize={9} fontFamily="Inter">
                  {n.sub}
                </text>
              )}
            </g>
          );
        })}

        {/* ── CENTER NODE ── */}
        <g
          onClick={onEnterDashboard}
          onMouseEnter={() => setHovered("center")}
          onMouseLeave={() => setHovered(null)}
          style={{ cursor: "pointer" }}
          filter="url(#center-glow)"
        >
          {/* Pulse rings */}
          <circle cx={center.x} cy={center.y} r={CR + 24} fill="none" stroke="#6366f1" strokeWidth={1} strokeOpacity={0.12} />
          <circle cx={center.x} cy={center.y} r={CR + 14} fill="none" stroke="#6366f1" strokeWidth={1} strokeOpacity={0.2} />
          {/* Main */}
          <circle cx={center.x} cy={center.y} r={CR}
            fill={`url(#rg-center)`} stroke="#818cf8"
            strokeWidth={hovered === "center" ? 2.5 : 2}
            strokeOpacity={hovered === "center" ? 0.9 : 0.6}
          />
          {/* Ticker */}
          <text x={center.x} y={center.y - 22} textAnchor="middle" fill="#4338ca" fontSize={26} fontFamily="Inter" fontWeight={800}>
            {center.label}
          </text>
          {/* Name */}
          <text x={center.x} y={center.y + 2} textAnchor="middle" fill="#64748b" fontSize={12} fontFamily="Inter">
            {String(center.value ?? "").slice(0, 24)}
          </text>
          {/* Sector */}
          {center.sub && (
            <text x={center.x} y={center.y + 18} textAnchor="middle" fill="#94a3b8" fontSize={10} fontFamily="Inter">
              {center.sub}
            </text>
          )}
          {/* CTA */}
          <rect x={center.x - 60} y={center.y + 33} width={120} height={26} rx={13}
            fill="rgba(79,70,229,0.12)" stroke="rgba(79,70,229,0.35)" strokeWidth={1}
          />
          <text x={center.x} y={center.y + 50} textAnchor="middle" fill="#4f46e5" fontSize={11} fontFamily="Inter" fontWeight={600}>
            Open Analysis →
          </text>
        </g>
      </svg>
    </div>
  );
}
