"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function TopNav() {
  const router   = useRouter();
  const pathname = usePathname();
  const [time, setTime] = useState("");

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString("en-US", { hour12: false }));
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, []);

  const isActive = (href: string) => pathname === href;

  const navLink = (label: string, href: string) => {
    const active = isActive(href);
    return (
      <button
        onClick={() => router.push(href)}
        style={{
          background: "none", border: "none", cursor: "pointer",
          fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: active ? 600 : 500,
          color: active ? "#4f46e5" : "#6b7280",
          padding: "4px 8px", borderRadius: 6,
          transition: "color 0.15s",
          position: "relative",
        }}
        onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.color = "#0f172a"; }}
        onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.color = "#6b7280"; }}
      >
        {label}
        {active && (
          <span style={{
            position: "absolute", bottom: -1, left: "50%", transform: "translateX(-50%)",
            width: 16, height: 2, borderRadius: 2, background: "#4f46e5",
          }} />
        )}
      </button>
    );
  };

  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 100,
      background: "#ffffff",
      borderBottom: "1px solid #e4e8f2",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 24px", height: 48,
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    }}>
      {/* Left: nav links */}
      <nav style={{ display: "flex", alignItems: "center", gap: 4 }}>
        {navLink("Home", "/")}
        <span style={{ color: "#e4e8f2", fontSize: 16 }}>·</span>
        {navLink("News", "/news")}
        <span style={{ color: "#e4e8f2", fontSize: 16 }}>·</span>
        {navLink("Big Trades", "/trades")}
      </nav>

      {/* Right: clock + brand */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {time && (
          <span style={{
            fontSize: 11, color: "#9ca3af",
            fontFamily: "JetBrains Mono, monospace",
          }}>
            {time}
          </span>
        )}

        {/* Quantara — no outline, just icon + text */}
        <div
          style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer" }}
          onClick={() => router.push("/")}
        >
          <div style={{
            width: 26, height: 26, borderRadius: 7,
            background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontWeight: 800, fontSize: 13, flexShrink: 0,
          }}>
            Q
          </div>
          <span style={{ fontWeight: 700, fontSize: 14, color: "#4f46e5" }}>
            Quantara
          </span>
        </div>
      </div>
    </header>
  );
}
