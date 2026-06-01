import { useMemo } from "react";
import type { FormEvent } from "react";
import type { AnalysisData } from "../../types/news";
import DictionarySearchForm from "./DictionarySearchForm";
import { parseAndRenderSummary } from "../../utils/source";
import { getScoreColor } from "../../utils/score";
import AnalysisCard from "./AnalysisCard";
import TermList from "./TermList";
import PersonList from "./PersonList";
import RedFlags from "./RedFlags";

type AnalysisStatus = "pending" | "analyzing" | "complete";

interface AnalysisAsideProps {
  status: AnalysisStatus;
  analysisData: AnalysisData | null;
  aiSummary: string | null;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  searchEngine: string;
  setSearchEngine: (value: string) => void;
  handleTermSearch: (e: FormEvent) => void;
}

export default function AnalysisAside({
  status,
  analysisData,
  aiSummary,
  searchTerm,
  setSearchTerm,
  searchEngine,
  setSearchEngine,
  handleTermSearch,
}: AnalysisAsideProps) {
  const credibility = analysisData?.credibility;

  const parsedReason = useMemo(() => {
    return credibility?.reason ? parseAndRenderSummary(credibility.reason, true) : null;
  }, [credibility?.reason]);

  const parsedSummary = useMemo(() => {
    return aiSummary ? parseAndRenderSummary(aiSummary, false) : null;
  }, [aiSummary]);

  const scoreColor = useMemo(() => {
    if (credibility?.score != null) {
      return getScoreColor(credibility.score);
    }
    return {
      text: "text-slate-400",
      bg: "bg-slate-50",
      border: "border-slate-200",
      hex: "#94A3B8",
      bgHex: "#F8FAFC",
    };
  }, [credibility?.score]);

  return (
    <aside className="w-full lg:w-[360px] shrink-0">
      <div className="sticky top-24 flex flex-col gap-4">
        {/* 사이드바 헤더 */}
        <div
          className="p-5 bg-[#161311] rounded-2xl shadow-[0_4px_20px_rgba(22,19,17,0.15)]"
        >
          <h2 className="text-[15px] font-bold text-white flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            AI 나침반 리포트
          </h2>
          <p
            className="text-xs mt-1 text-white/40"
          >
            AI가 분석한 기사 신뢰도 및 핵심 정보입니다.
          </p>
        </div>

        {/* ── 신뢰도 점수 패널 ── */}
        <div
          className={`${scoreColor.bg} ${scoreColor.border} border rounded-2xl overflow-hidden shadow-[0_4px_12px_rgba(22,19,17,0.02)]`}
        >
          <div
            className={`flex items-center gap-2 px-5 pt-5 pb-3.5 border-b ${scoreColor.border}`}
          >
            <svg className={`w-4 h-4 ${scoreColor.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <h3
              className={`font-bold ${scoreColor.text} text-[14px] tracking-tight`}
            >
              기사 신뢰도 분석
            </h3>
          </div>
          <div className="px-5 pb-5 pt-4">
            {status === "complete" && credibility ? (
              <>
                {/* Score display */}
                <div className="flex items-end gap-3 mb-4">
                  <span
                    className={`text-5xl font-black ${scoreColor.text} tracking-tighter`}
                  >
                    {credibility.score != null
                      ? `${(credibility.score * 100).toFixed(0)}`
                      : "-"}
                  </span>
                  <div className="flex flex-col mb-1.5">
                    <span className={`text-xl font-bold ${scoreColor.text}`}>
                      %
                    </span>
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-full ${scoreColor.bg} ${scoreColor.text} border ${scoreColor.border}`}
                    >
                      {credibility.label || "분석 중"}
                    </span>
                  </div>
                </div>

                {/* Score bar */}
                {credibility.score != null && (
                  <div className="mb-4">
                    <div className="progress-bar-track mb-1 bg-slate-200/50 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="progress-bar-fill h-full transition-all duration-500 ease-out"
                        style={{
                          width: `${Math.round(credibility.score * 100)}%`,
                          background: scoreColor.hex,
                        }}
                      />
                    </div>
                    <div
                      className="flex justify-between text-[10px] font-medium text-[#9C9891]"
                    >
                      <span>낮음</span>
                      <span>높음</span>
                    </div>
                  </div>
                )}

                <div
                  className={`text-[14px] leading-relaxed font-medium p-4 mb-4 bg-white/60 backdrop-blur-md rounded-xl ${scoreColor.text}`}
                >
                  {parsedReason}
                </div>

                <RedFlags flags={credibility.red_flags || []} />

                {aiSummary && (
                  <div className="mt-3 border-t border-dashed border-slate-200/60 pt-3">
                    <p
                      className="text-xs font-semibold text-[#5C5853] mb-1.5 flex items-center gap-1.5"
                    >
                      <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h7" />
                      </svg>
                      3줄 요약
                    </p>
                    <div
                      className="text-[13px] leading-relaxed p-4 text-[#2C2926] bg-white/60 backdrop-blur-md rounded-xl"
                    >
                      {parsedSummary}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm opacity-40 text-[#5C5853] font-medium">
                AI 분석을 실행해주세요.
              </p>
            )}
          </div>
        </div>

        {/* ── 용어 풀이 ── */}
        <AnalysisCard
          icon={
            <svg className="w-4.5 h-4.5 text-sky-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          }
          title="용어 풀이"
          bg="bg-sky-50/80"
          border="border-sky-100"
          textColor="text-sky-900"
          status={status}
        >
          <TermList terms={analysisData?.difficult_terms || []} />

          <DictionarySearchForm
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            searchEngine={searchEngine}
            setSearchEngine={setSearchEngine}
            onSubmit={handleTermSearch}
          />
        </AnalysisCard>

        {/* ── 핵심 인물 ── */}
        <AnalysisCard
          icon={
            <svg className="w-4.5 h-4.5 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          }
          title="핵심 인물 프로필"
          bg="bg-emerald-50/80"
          border="border-emerald-100"
          textColor="text-emerald-900"
          status={status}
        >
          <PersonList persons={analysisData?.key_persons || []} />
        </AnalysisCard>
      </div>
    </aside>
  );
}

