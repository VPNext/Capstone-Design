

interface CredibilityBadgeProps {
  label: string | null;
  score: number | null;
}

export default function CredibilityBadge({ label, score }: CredibilityBadgeProps) {
  if (!label) return null;
  const isHigh = score != null && score >= 0.7;
  const isMed = score != null && score >= 0.4;
  const dot = isHigh ? "#10B981" : isMed ? "#F59E0B" : "#EF4444";
  const fg = isHigh ? "#065F46" : isMed ? "#78350F" : "#7F1D1D";
  const bg = isHigh ? "#ECFDF5" : isMed ? "#FFFBEB" : "#FEF2F2";
  const bdr = isHigh ? "#A7F3D0" : isMed ? "#FDE68A" : "#FECACA";
  
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-full"
      style={{ background: bg, color: fg, border: `1px solid ${bdr}` }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ background: dot }}
      />
      {label}
    </span>
  );
}
