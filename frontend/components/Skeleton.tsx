"use client";

// Base skeleton bone — a shimmer rectangle
export function Bone({
  w = "100%",
  h = 16,
  radius = 8,
  style = {},
}: {
  w?: string | number;
  h?: number;
  radius?: number;
  style?: React.CSSProperties;
}) {
  return (
    <div style={{
      width: w,
      height: h,
      borderRadius: radius,
      background: "linear-gradient(90deg, #f0f2f8 25%, #e8ecf5 50%, #f0f2f8 75%)",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.6s ease-in-out infinite",
      flexShrink: 0,
      ...style,
    }} />
  );
}

// Inject keyframe once
if (typeof document !== "undefined") {
  const id = "__quantara_shimmer__";
  if (!document.getElementById(id)) {
    const s = document.createElement("style");
    s.id = id;
    s.textContent = `@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`;
    document.head.appendChild(s);
  }
}

// ── Page-level skeletons ───────────────────────────────────────────────────

export function CompanyHeaderSkeleton() {
  return (
    <div style={{ background: "#fff", border: "1px solid #e4e8f2", borderRadius: 16, padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Bone w={70} h={28} radius={6} />
            <Bone w={180} h={20} radius={6} />
          </div>
          <Bone w={140} h={44} radius={8} />
          <div style={{ display: "flex", gap: 8 }}>
            <Bone w={80} h={18} radius={6} />
            <Bone w={60} h={18} radius={6} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Bone w={80} h={32} radius={8} />
          <Bone w={80} h={32} radius={8} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 24, marginTop: 20 }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Bone w={60} h={11} radius={4} />
            <Bone w={80} h={18} radius={6} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function OverviewSkeleton() {
  return (
    <div style={{ background: "#fff", border: "1px solid #e4e8f2", borderRadius: 16, padding: 24 }}>
      <Bone w={100} h={13} radius={4} style={{ marginBottom: 16 }} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        {[1,2,3,4,5,6].map(i => (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Bone w="60%" h={11} radius={4} />
            <Bone w="80%" h={18} radius={6} />
          </div>
        ))}
      </div>
      <div style={{ marginTop: 20 }}>
        <Bone w="100%" h={60} radius={8} />
      </div>
    </div>
  );
}

export function FinancialsSkeleton() {
  return (
    <div style={{ background: "#fff", border: "1px solid #e4e8f2", borderRadius: 16, padding: 24 }}>
      <Bone w={120} h={13} radius={4} style={{ marginBottom: 16 }} />
      <Bone w="100%" h={200} radius={10} />
    </div>
  );
}

export function FilingsSkeleton() {
  return (
    <div style={{ background: "#fff", border: "1px solid #e4e8f2", borderRadius: 16, padding: 24 }}>
      <Bone w={100} h={13} radius={4} style={{ marginBottom: 16 }} />
      {[1,2,3].map(i => (
        <div key={i} style={{ padding: "12px 0", borderBottom: "1px solid #f0f2f8", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Bone w={60} h={20} radius={6} />
            <Bone w={120} h={12} radius={4} />
          </div>
          <Bone w={80} h={28} radius={8} />
        </div>
      ))}
    </div>
  );
}

export function AISignalSkeleton() {
  return (
    <div style={{ background: "#fff", border: "1px solid #e4e8f2", borderRadius: 16, padding: 24 }}>
      <Bone w={110} h={13} radius={4} style={{ marginBottom: 16 }} />
      <Bone w={100} h={40} radius={10} style={{ marginBottom: 16 }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Bone w="100%" h={14} radius={4} />
        <Bone w="90%" h={14} radius={4} />
        <Bone w="80%" h={14} radius={4} />
        <Bone w="70%" h={14} radius={4} />
      </div>
    </div>
  );
}

export function NewsPanelSkeleton() {
  return (
    <div style={{ background: "#fff", border: "1px solid #e4e8f2", borderRadius: 16, padding: 24 }}>
      <Bone w={80} h={13} radius={4} style={{ marginBottom: 16 }} />
      {[1,2,3,4].map(i => (
        <div key={i} style={{ padding: "12px 0", borderBottom: "1px solid #f0f2f8" }}>
          <Bone w={50} h={16} radius={20} style={{ marginBottom: 6 }} />
          <Bone w="100%" h={13} radius={4} style={{ marginBottom: 4 }} />
          <Bone w="75%" h={13} radius={4} style={{ marginBottom: 6 }} />
          <Bone w={90} h={10} radius={4} />
        </div>
      ))}
    </div>
  );
}

export function SupplyChainSkeleton() {
  return (
    <div style={{ background: "#fff", border: "1px solid #e4e8f2", borderRadius: 16, padding: 24 }}>
      <Bone w={130} h={13} radius={4} style={{ marginBottom: 16 }} />
      <Bone w="100%" h={180} radius={10} />
    </div>
  );
}

export function NewsCardSkeleton() {
  return (
    <div style={{ background: "#fff", border: "1px solid #e4e8f2", borderRadius: 16, padding: 20 }}>
      <div style={{ display: "flex", gap: 14 }}>
        <Bone w={88} h={88} radius={10} style={{ flexShrink: 0 }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          <Bone w={60} h={18} radius={20} />
          <Bone w="90%" h={15} radius={4} />
          <Bone w="70%" h={15} radius={4} />
          <Bone w="50%" h={11} radius={4} />
        </div>
      </div>
    </div>
  );
}

export function TradeCardSkeleton() {
  return (
    <div style={{ background: "#fff", border: "1px solid #e4e8f2", borderRadius: 16, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Top row: action badge + ticker + value */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Bone w={52} h={26} radius={8} />
        <Bone w={56} h={28} radius={6} />
        <div style={{ marginLeft: "auto" }}>
          <Bone w={80} h={28} radius={6} />
        </div>
      </div>
      {/* Details grid (2-col like real card) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 20px" }}>
        {[1,2,3,4,5,6,7,8].map(i => (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <Bone w="50%" h={10} radius={4} />
            <Bone w="80%" h={16} radius={4} />
          </div>
        ))}
      </div>
      {/* Disclosure note */}
      <Bone w="100%" h={44} radius={10} />
      {/* CTA button */}
      <Bone w="100%" h={42} radius={10} />
    </div>
  );
}
