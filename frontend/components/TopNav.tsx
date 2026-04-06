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

      {/* Right: clock + GitHub + brand */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {time && (
          <span style={{
            fontSize: 11, color: "#9ca3af",
            fontFamily: "JetBrains Mono, monospace",
          }}>
            {time}
          </span>
        )}

        {/* GitHub link */}
        <a
          href="https://github.com/Jaimin001607/quantara"
          target="_blank"
          rel="noreferrer"
          style={{
            display: "flex", alignItems: "center", gap: 5,
            fontSize: 12, fontWeight: 500, color: "#6b7280",
            textDecoration: "none", padding: "3px 8px",
            border: "1px solid #e4e8f2", borderRadius: 6,
            transition: "all 0.15s",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.color = "#0f172a";
            (e.currentTarget as HTMLElement).style.borderColor = "#c7d0e8";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.color = "#6b7280";
            (e.currentTarget as HTMLElement).style.borderColor = "#e4e8f2";
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/>
          </svg>
          GitHub
        </a>

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
