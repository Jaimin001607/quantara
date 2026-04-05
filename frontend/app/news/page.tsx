"use client";

import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001/api/v1";

interface NewsItem {
  id: number;
  headline: string;
  source: string;
  url: string;
  image: string;
  summary: string;
  datetime: number;
  related: string;
}

function timeAgo(ts: number): string {
  const diff = Math.floor(Date.now() / 1000 - ts);
  if (diff < 60)    return `${diff}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function NewsPage() {
  const [items, setItems]   = useState<NewsItem[]>([]);
  const [loading, setLoad]  = useState(true);

  useEffect(() => {
    fetch(`${API}/market/news`)
      .then(r => r.json())
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoad(false));
  }, []);

  return (
    <div style={{ maxWidth: 880, margin: "0 auto", padding: "32px 24px" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", marginBottom: 6 }}>
          Market News
        </h1>
        <p style={{ fontSize: 13, color: "#64748b" }}>
          Top stories from the last 48 hours · Powered by Finnhub
        </p>
      </div>

      {loading && (
        <div style={{ color: "#9ca3af", fontSize: 14, padding: "48px 0", textAlign: "center" }}>
          Loading news…
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {items.map((item, i) => (
          <a
            key={item.id ?? i}
            href={item.url}
            target="_blank"
            rel="noreferrer"
            style={{ textDecoration: "none" }}
          >
            <div
              style={{
                display: "flex", gap: 16, padding: "18px 20px",
                background: "#fff", borderRadius: 14,
                border: "1px solid #e4e8f2", marginBottom: 8,
                transition: "box-shadow 0.15s, border-color 0.15s",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.07)";
                (e.currentTarget as HTMLElement).style.borderColor = "#c9d2e4";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.boxShadow = "none";
                (e.currentTarget as HTMLElement).style.borderColor = "#e4e8f2";
              }}
            >
              {/* Thumbnail */}
              {item.image && (
                <img
                  src={item.image}
                  alt=""
                  style={{
                    width: 80, height: 64, objectFit: "cover",
                    borderRadius: 8, flexShrink: 0,
                    background: "#f7f8fc",
                  }}
                  onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              )}

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  {item.related && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, color: "#4f46e5",
                      background: "rgba(79,70,229,0.08)", padding: "2px 8px",
                      borderRadius: 100, letterSpacing: "0.06em",
                    }}>
                      {item.related}
                    </span>
                  )}
                  <span style={{ fontSize: 11, color: "#9ca3af" }}>{item.source}</span>
                  <span style={{ fontSize: 11, color: "#c9d2e4" }}>·</span>
                  <span style={{ fontSize: 11, color: "#9ca3af" }}>{timeAgo(item.datetime)}</span>
                </div>

                <h2 style={{
                  fontSize: 14, fontWeight: 600, color: "#0f172a",
                  lineHeight: 1.5, marginBottom: 6,
                }}>
                  {item.headline}
                </h2>

                {item.summary && (
                  <p style={{
                    fontSize: 12, color: "#64748b", lineHeight: 1.55,
                    display: "-webkit-box", WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical", overflow: "hidden",
                  }}>
                    {item.summary}
                  </p>
                )}
              </div>

              {/* Arrow */}
              <div style={{ color: "#c9d2e4", fontSize: 16, alignSelf: "center", flexShrink: 0 }}>
                →
              </div>
            </div>
          </a>
        ))}
      </div>

      {!loading && items.length === 0 && (
        <div style={{ textAlign: "center", color: "#9ca3af", padding: "48px 0", fontSize: 14 }}>
          No news found in the last 48 hours.
        </div>
      )}
    </div>
  );
}
