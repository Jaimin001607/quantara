interface Props {
  title: string;
  subtitle?: string;
}

export default function SectionHeader({ title, subtitle }: Props) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="section-title">{title}</span>
      {subtitle && <span className="text-xs" style={{ color: "var(--muted2)" }}>{subtitle}</span>}
      <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
    </div>
  );
}
