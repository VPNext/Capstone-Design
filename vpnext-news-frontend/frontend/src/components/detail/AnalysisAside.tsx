import { useMemo } from "react";
import type { FormEvent, ReactNode } from "react";
import type { AnalysisData, DifficultTerm, KeyPerson } from "../../types/news";
import DictionarySearchForm from "./DictionarySearchForm";
import { parseAndRenderSummary, replaceEnglishSourceNames } from "../../utils/source";
import { SOURCE_NAME_MAP } from "../../constants/source";
import { getScoreColor } from "../../utils/score";

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

interface AnalysisCardProps {
  icon: ReactNode;
  title: string;
  bg: string;
  border: string;
  textColor: string;
  status: AnalysisStatus;
  children: ReactNode;
}

const AnalysisCard = ({
  icon,
  title,
  bg,
  border,
  textColor,
  status,
  children,
}: AnalysisCardProps) => (
  <div
    className={`${bg} ${border} border overflow-hidden transition-all duration-300`}
    style={{ borderRadius: "18px", boxShadow: "0 4px 12px rgba(22,19,17,0.03)" }}
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
        <p className={`text-sm ${textColor} opacity-50`}>
          아래 버튼을 눌러 AI 분석을 실행해주세요.
        </p>
      )}
    </div>
  </div>
);

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
  const scoreColor =
    credibility?.score != null
      ? getScoreColor(credibility.score)
      : {
          text: "text-slate-400",
          bg: "bg-slate-50",
          border: "border-slate-200",
          hex: "#94A3B8",
          bgHex: "#F8FAFC",
        };

  return (
    <aside className="w-full lg:w-[360px] shrink-0">
      <div className="sticky top-24 flex flex-col gap-4">
        {/* 사이드바 헤더 */}
        <div
          className="p-5"
          style={{
            background: "#161311",
            borderRadius: "18px",
            boxShadow: "0 4px 20px rgba(22,19,17,0.2)",
          }}
        >
          <h2 className="text-[15px] font-bold text-white flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            AI 나침반 리포트
          </h2>
          <p
            className="text-xs mt-1"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            AI가 분석한 기사 신뢰도 및 핵심 정보입니다.
          </p>
        </div>

        {/* ── 신뢰도 점수 패널 ── */}
        <div
          className={`${scoreColor.bg} ${scoreColor.border} border overflow-hidden`}
          style={{
            borderRadius: "18px",
            boxShadow: "0 1px 8px rgba(22,19,17,0.06)",
          }}
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
                    <div className="progress-bar-track mb-1">
                      <div
                        className="progress-bar-fill"
                        style={{
                          width: `${Math.round(credibility.score * 100)}%`,
                          background: scoreColor.hex,
                        }}
                      />
                    </div>
                    <div
                      className="flex justify-between text-[10px] font-medium"
                      style={{ color: "#9C9891" }}
                    >
                      <span>낮음</span>
                      <span>높음</span>
                    </div>
                  </div>
                )}

                <div
                  className={`text-[14px] leading-relaxed font-medium p-4 mb-4 ${scoreColor.text}`}
                  style={{
                    background: "rgba(255,255,255,0.6)",
                    borderRadius: "10px",
                  }}
                >
                  {parsedReason}
                </div>

                {credibility.red_flags && credibility.red_flags.length > 0 && (
                  <div className="mb-4">
                    <p
                      className="text-xs font-semibold mb-1.5 flex items-center gap-1.5"
                      style={{ color: "#5C5853" }}
                    >
                      <svg className="w-3.5 h-3.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      주의 표현
                    </p>
                    <ul className="flex flex-wrap gap-1.5">
                      {credibility.red_flags.map((flag: string, i: number) => {
                        // 1. [mk](URL) 과 같은 마크다운 링크에서 주소를 지우고 언론사명만 추출 (한글 변환 적용)
                        let cleanFlag = flag.replace(/\[([^\]]+)\]\(https?:\/\/[^\s)]+\)/g, (_, linkText) => {
                          return SOURCE_NAME_MAP[linkText.toLowerCase()] || linkText;
                        });
                        // 2. 혹시 영어 텍스트로 들어있을 언론사명을 한글로 일괄 치환
                        cleanFlag = replaceEnglishSourceNames(cleanFlag);

                        return (
                          <li
                            key={i}
                            className="text-xs px-3 py-1 border"
                            style={{
                              background: "#FEF2F2",
                              color: "#991B1B",
                              borderColor: "#FECACA",
                              borderRadius: "999px",
                            }}
                          >
                            {cleanFlag}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
                {aiSummary && (
                  <div className="mt-3 border-t border-dashed border-slate-200/60 pt-3">
                    <p
                      className="text-xs font-semibold mb-1.5 flex items-center gap-1.5"
                      style={{ color: "#5C5853" }}
                    >
                      <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h7" />
                      </svg>
                      3줄 요약
                    </p>
                    <div
                      className="text-[13px] leading-relaxed p-4"
                      style={{
                        color: "#2C2926",
                        background: "rgba(255,255,255,0.6)",
                        borderRadius: "10px",
                      }}
                    >
                      {parsedSummary}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm opacity-40" style={{ color: "#5C5853" }}>
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
          {analysisData?.difficult_terms &&
          analysisData.difficult_terms.length > 0 ? (
            <ul className="text-[14px] space-y-3">
              {analysisData.difficult_terms.map(
                (term: DifficultTerm, i: number) => {
                  const definitionText = term.definition || term.explanation || "";
                  return (
                    <li key={i} className="p-3 bg-white/60 border border-sky-100/50 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-all duration-200 hover:shadow-md hover:bg-white">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <a
                          href={`https://stdict.korean.go.kr/search/searchResult.do?pageSize=10&searchKeyword=${encodeURIComponent(term.term)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sky-700 hover:text-sky-900 transition-colors inline-flex items-center gap-1 font-bold text-[14px] cursor-pointer"
                          title={`${term.term} 국립국어원에서 뜻 찾아보기`}
                        >
                          {term.term}
                          <svg
                            className="w-3 h-3 opacity-60"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                            />
                          </svg>
                        </a>
                        {term.category && (
                          <span
                            className="text-[10px] font-semibold text-sky-600 bg-sky-50 border border-sky-100/60 px-2 py-0.5 rounded-full animate-pulse-subtle"
                          >
                            {term.category}
                          </span>
                        )}
                      </div>
                      <p className="text-[13px] text-slate-600 leading-relaxed">{definitionText}</p>
                    </li>
                  );
                },
              )}
            </ul>
          ) : (
            <p className="text-sm text-sky-700 opacity-60">
              추출된 용어가 없습니다.
            </p>
          )}

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
          {analysisData?.key_persons && analysisData.key_persons.length > 0 ? (
            <ul className="text-[14px] space-y-3">
              {analysisData.key_persons.map((person: KeyPerson, i: number) => (
                <li
                  key={i}
                  className="p-3 bg-white/60 border border-emerald-100/50 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-all duration-200 hover:shadow-md hover:bg-white"
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <a
                      href={`https://www.google.com/search?q=${encodeURIComponent(person.name)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-emerald-800 hover:text-emerald-900 transition-colors text-[14px] font-bold cursor-pointer"
                      title={`${person.name} 구글에서 검색하기`}
                    >
                      {person.name}
                      <svg
                        className="w-3 h-3 opacity-60"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </a>
                    {person.role && (
                      <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100/60 px-2 py-0.5 rounded-full">
                        {person.role}
                      </span>
                    )}
                  </div>
                  <p className="text-[13px] text-slate-700 leading-relaxed">
                    {person.description}
                  </p>
                  {person.relation && (
                    <div className="text-[11px] text-slate-500 mt-2.5 pt-2 border-t border-emerald-100/30 flex items-center gap-1.5">
                      <span className="font-semibold text-emerald-700/80">이 기사에서</span>
                      <span className="text-slate-600 font-medium">{person.relation}</span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-emerald-700 opacity-60">
              추출된 인물이 없습니다.
            </p>
          )}
        </AnalysisCard>
      </div>
    </aside>
  );
}
