import { memo } from "react";
import type { ReactNode } from "react";

type AnalysisStatus = "pending" | "analyzing" | "complete";

interface AnalysisCardProps {
  icon: ReactNode;
  title: string;
  bg: string;
  border: string;
  textColor: string;
  status: AnalysisStatus;
  children: ReactNode;
}

const AnalysisCard = memo(function AnalysisCard({
  icon,
  title,
  bg,
  border,
  textColor,
  status,
  children,
}: AnalysisCardProps) {
  return (
    <div
      className={`${bg} ${border} border rounded-2xl overflow-hidden shadow-[0_4px_12px_rgba(22,19,17,0.02)] transition-all duration-300 hover:shadow-[0_6px_16px_rgba(22,19,17,0.06)] hover:-translate-y-0.5`}
    >
      <div
        className={`flex items-center gap-2 px-5 pt-5 pb-3.5 border-b ${border}`}
      >
        <div className="flex items-center justify-center shrink-0">
          {icon}
        </div>
        <h3 className={`font-bold ${textColor} text-[14px] tracking-tight`}>
          {title}
        </h3>
      </div>
      <div className="px-5 pb-5 pt-4">
        {status === "complete" ? (
          children
        ) : (
          <p className={`text-sm ${textColor} opacity-50 font-medium`}>
            아래 버튼을 눌러 AI 분석을 실행해주세요.
          </p>
        )}
      </div>
    </div>
  );
});

export default AnalysisCard;
