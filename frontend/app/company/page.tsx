"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getCompany, CompanyFull } from "@/lib/api";

import Spinner from "@/components/Spinner";
import {
  CompanyHeaderSkeleton, OverviewSkeleton, FinancialsSkeleton,
  FilingsSkeleton, AISignalSkeleton, NewsPanelSkeleton, SupplyChainSkeleton,
} from "@/components/Skeleton";
import BubbleMap from "@/components/BubbleMap";
import CompanyHeader from "@/components/CompanyHeader";
import OverviewPanel from "@/components/OverviewPanel";
import FinancialsPanel from "@/components/FinancialsPanel";
import FilingsPanel from "@/components/FilingsPanel";
import NewsPanel from "@/components/NewsPanel";
import AISignalPanel from "@/components/AISignalPanel";
import SupplyChainPanel from "@/components/SupplyChainPanel";
import PriceChartModal from "@/components/PriceChartModal";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001/api/v1";

interface Relationship {
  ticker: string;
  name: string;
  relationship: "supplier" | "customer" | "competitor";
  detail?: string;
}

type View = "bubble" | "exit" | "dashboard";

function CompanyPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const ticker = searchParams.get("t")?.toUpperCase() ?? "";

  const [data, setData]               = useState<CompanyFull | null>(null);
  const [supplyChain, setSupplyChain] = useState<Relationship[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [refreshing, setRefreshing]   = useState(false);
  const [view, setView]               = useState<View>("bubble");
  const [showChart, setShowChart]     = useState(false);

  const fetchData = useCallback(async (refresh = false) => {
    if (!ticker) { router.push("/"); return; }
    refresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const result = await getCompany(ticker, refresh);
      setData(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load company data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [ticker, router]);

  useEffect(() => {
    if (!ticker) return;
    fetch(`${API}/company/${ticker}/supply-chain`)
      .then(r => r.json())
      .then(d => setSupplyChain(d.relationships ?? []))
      .catch(() => setSupplyChain([]));
  }, [ticker]);

  useEffect(() => { fetchData(false); }, [fetchData]);

  const enterDashboard = useCallback(() => {
    setView("exit");
    setTimeout(() => setView("dashboard"), 450);
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
        {/* Same sub-bar as real page */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 24px", background: "#fff", borderBottom: "1px solid var(--border)" }}>
          <div style={{ width: 60, height: 28, borderRadius: 7, background: "#f0f2f8", animation: "shimmer 1.6s ease-in-out infinite", backgroundSize: "200% 100%", backgroundImage: "linear-gradient(90deg,#f0f2f8 25%,#e8ecf5 50%,#f0f2f8 75%)" }} />
          <div style={{ width: 1, height: 20, background: "var(--border)" }} />
          <div style={{ width: 40, height: 18, borderRadius: 6, background: "#f0f2f8", animation: "shimmer 1.6s ease-in-out infinite", backgroundSize: "200% 100%", backgroundImage: "linear-gradient(90deg,#f0f2f8 25%,#e8ecf5 50%,#f0f2f8 75%)" }} />
          <div style={{ width: 160, height: 16, borderRadius: 6, background: "#f0f2f8", animation: "shimmer 1.6s ease-in-out infinite", backgroundSize: "200% 100%", backgroundImage: "linear-gradient(90deg,#f0f2f8 25%,#e8ecf5 50%,#f0f2f8 75%)" }} />
        </div>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px", display: "flex", flexDirection: "column", gap: 20 }}>
          <CompanyHeaderSkeleton />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
            <div style={{ gridColumn: "1 / 3", display: "flex", flexDirection: "column", gap: 20 }}>
              <OverviewSkeleton />
              <FinancialsSkeleton />
              <FilingsSkeleton />
              <SupplyChainSkeleton />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <AISignalSkeleton />
              <NewsPanelSkeleton />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, background: "var(--bg)" }}>
        <div style={{ color: "#ef4444", fontWeight: 700 }}>Company not found</div>
        <div style={{ color: "var(--muted2)", fontSize: 13 }}>{error}</div>
        <button onClick={() => router.push("/")} style={{
          marginTop: 8, padding: "10px 24px", borderRadius: 10, cursor: "pointer",
          background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.3)",
          color: "var(--accent2)", fontFamily: "Inter, sans-serif", fontSize: 13,
        }}>
          ← Back to Search
        </button>
      </div>
    );
  }

  if (!data) return null;

  if (view === "bubble" || view === "exit") {
    return (
      <div style={{
        width: "100%", height: "100vh", overflow: "hidden", position: "relative",
        opacity: view === "exit" ? 0 : 1,
        transform: view === "exit" ? "scale(1.06)" : "scale(1)",
        transition: "opacity 0.4s ease, transform 0.4s ease",
      }}>
        <BubbleMap
          data={data}
          supplyChain={supplyChain}
          onEnterDashboard={enterDashboard}
        />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", animation: "fadeInUp 0.5s ease" }}>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: none; }
        }
      `}</style>

      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "8px 24px", background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
      }}>
        <button onClick={() => setView("bubble")} style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "rgba(79,70,229,0.07)", border: "1px solid rgba(79,70,229,0.18)",
          color: "#4f46e5", padding: "4px 11px", borderRadius: 7, cursor: "pointer",
          fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600,
        }}>
          ◈ Map
        </button>
        <span style={{ color: "var(--border2)" }}>·</span>
        <span style={{ fontWeight: 700, color: "#4f46e5", fontSize: 14 }}>{ticker}</span>
        <span style={{ color: "var(--muted2)", fontSize: 13 }}>{data.company.name}</span>
      </div>

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
        <CompanyHeader
          company={data.company}
          quote={data.quote}
          onRefresh={() => fetchData(true)}
          refreshing={refreshing}
          onOpenChart={() => setShowChart(true)}
        />
        {showChart && (
          <PriceChartModal
            ticker={ticker}
            companyName={data.company.name ?? ticker}
            currentPrice={data.quote?.price ?? null}
            onClose={() => setShowChart(false)}
          />
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
          <div style={{ gridColumn: "1 / 3", display: "flex", flexDirection: "column", gap: 20 }}>
            <OverviewPanel company={data.company} quote={data.quote} />
            <FinancialsPanel financials={data.financials ?? null} />
            <FilingsPanel filings={data.filings} />
            <SupplyChainPanel ticker={ticker} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <AISignalPanel analysis={data.ai_analysis} onRefresh={() => fetchData(true)} refreshing={refreshing} />
            <NewsPanel articles={data.news} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CompanyPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
        <Spinner size={36} />
      </div>
    }>
      <CompanyPageInner />
    </Suspense>
  );
}
