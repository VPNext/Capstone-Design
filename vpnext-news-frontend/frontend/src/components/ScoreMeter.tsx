interface ScoreMeterProps {
  score: number | null;
}

export default function ScoreMeter({ score }: ScoreMeterProps) {
  if (score == null) return null;
  const pct = Math.round(score * 100);
  const isHigh = score >= 0.7;
  const isMed = score >= 0.4;
  const barColor = isHigh ? "#10B981" : isMed ? "#F59E0B" : "#EF4444";
  const textColor = isHigh ? "#065F46" : isMed ? "#78350F" : "#7F1D1D";
  
  return (
    <div className="flex items-center gap-2 shrink-0">
      <div
        className="relative w-16 h-1.5 rounded-full overflow-hidden"
        style={{ background: "#E4DDD3" }}
      >
        <div
          className="absolute left-0 top-0 h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: barColor,
            transition: "width 0.7s cubic-bezier(0.22,1,0.36,1)",
          }}
        />
      </div>
      <span
        className="text-[11px] font-black tabular-nums"
        style={{ color: textColor }}
      >
        {pct}%
      </span>
    </div>
  );
}
