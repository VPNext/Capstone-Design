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
      className={`${bg} ${border} border rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(22,19,17,0.03)] transition-all duration-200`}
    >
      <div className={`flex items-center gap-2 px-5 pt-4 pb-3 border-b ${border}`}>
        <div className="flex items-center justify-center shrink-0">{icon}</div>
        <h3 className={`font-bold ${textColor} text-[14px] tracking-tight`}>
          {title}
        </h3>
      </div>
      <div className="px-5 pb-5 pt-4">
        {status === "complete" ? (
          children
        ) : status === "analyzing" ? (
          <div className="flex items-center gap-2 text-sm font-medium text-[#9C9891]">
            <svg
              className="animate-spin h-4 w-4 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            AI가 분석 중입니다...
          </div>
        ) : (
          <p className={`text-sm ${textColor} opacity-50 font-medium`}>
            AI 분석을 실행하면 여기에 결과가 표시됩니다.
          </p>
        )}
      </div>
    </div>
  );
});

export default AnalysisCard;
