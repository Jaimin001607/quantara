import type { Metadata } from "next";
import "./globals.css";
import TopNav from "@/components/TopNav";

export const metadata: Metadata = {
  title: "Quantara — See What Others Miss",
  description: "Real-time company intelligence: SEC filings, market data, AI signals, supply chain maps.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ minHeight: "100vh", background: "var(--bg)" }}>
        <TopNav />
        <main style={{ minHeight: "calc(100vh - 48px)" }}>
          {children}
        </main>
      </body>
    </html>
  );
}
