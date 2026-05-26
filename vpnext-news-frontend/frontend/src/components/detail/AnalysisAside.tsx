import type { FormEvent, ReactNode } from "react";
import type { AnalysisData, DifficultTerm, KeyPerson } from "../../types/news";
import DictionarySearchForm from "./DictionarySearchForm";
import { parseAndRenderSummary } from "./ArticleContent";

type AnalysisStatus = "pending" | "analyzing" | "complete";

interface AnalysisAsideProps {
  status: AnalysisStatus;
  analysisData: AnalysisData | null;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  searchEngine: string;
  setSearchEngine: (value: string) => void;
  handleTermSearch: (e: FormEvent) => void;
}

const getScoreColor = (score: number) => {
  if (score >= 0.7)
    return {
      text: "text-emerald-700",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      hex: "#059669",
      bgHex: "#ECFDF5",
    };
  if (score >= 0.4)
    return {
      text: "text-amber-700",
      bg: "bg-amber-50",
      border: "border-amber-200",
      hex: "#D97706",
      bgHex: "#FFFBEB",
    };
  return {
    text: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
    hex: "#DC2626",
    bgHex: "#FEF2F2",
  };
};

interface AnalysisCardProps {
  icon: string | ReactNode;
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
    className={`${bg} ${border} border overflow-hidden`}
    style={{ borderRadius: "18px", boxShadow: "0 1px 8px rgba(22,19,17,0.06)" }}
  >
    <div
      className={`flex items-center gap-2.5 px-5 pt-5 pb-3 border-b ${border}`}
    >
      <span className="text-xl">{icon}</span>
      <h3 className={`font-bold ${textColor} text-[14px] tracking-tight`}>
        {title}
      </h3>
    </div>
    <div className="px-5 pb-5 pt-4">
      {status === "complete" ? (
        children
      ) : (
        <p className={`text-sm ${textColor} opacity-40`}>
          아래 버튼을 눌러 AI 분석을 실행해주세요.
        </p>
      )}
    </div>
  </div>
);

export default function AnalysisAside({
  status,
  analysisData,
  searchTerm,
  setSearchTerm,
  searchEngine,
  setSearchEngine,
  handleTermSearch,
}: AnalysisAsideProps) {
  const credibility = analysisData?.credibility;
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
          <h2 className="text-[15px] font-bold text-white flex items-center gap-2.5">
            🤖 AI 나침반 리포트
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
            className={`flex items-center gap-2.5 px-5 pt-5 pb-3 border-b ${scoreColor.border}`}
          >
            <span className="text-xl">🔍</span>
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
                  className={`text-[14px] leading-relaxed font-medium p-3 mb-3 ${scoreColor.text}`}
                  style={{
                    background: "rgba(255,255,255,0.6)",
                    borderRadius: "10px",
                  }}
                >
                  {parseAndRenderSummary(credibility.reason)}
                </div>

                {credibility.red_flags && credibility.red_flags.length > 0 && (
                  <div>
                    <p
                      className="text-xs font-bold mb-1.5"
                      style={{ color: "#5C5853" }}
                    >
                      ⚠️ 주의 표현
                    </p>
                    <ul className="flex flex-wrap gap-1.5">
                      {credibility.red_flags.map((flag: string, i: number) => (
                        <li
                          key={i}
                          className="text-xs px-2 py-0.5 border"
                          style={{
                            background: "#FEF2F2",
                            color: "#991B1B",
                            borderColor: "#FECACA",
                            borderRadius: "999px",
                          }}
                        >
                          {flag}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {credibility.summary && (
                  <div className="mt-3">
                    <p
                      className="text-xs font-bold mb-1.5"
                      style={{ color: "#5C5853" }}
                    >
                      📝 3줄 요약
                    </p>
                    <div
                      className="text-[13px] leading-relaxed p-3"
                      style={{
                        color: "#2C2926",
                        background: "rgba(255,255,255,0.6)",
                        borderRadius: "10px",
                      }}
                    >
                      {parseAndRenderSummary(credibility.summary)}
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
          icon="📖"
          title="용어 풀이"
          bg="bg-sky-50/80"
          border="border-sky-100"
          textColor="text-sky-900"
          status={status}
        >
          {analysisData?.difficult_terms &&
          analysisData.difficult_terms.length > 0 ? (
            <ul className="text-[14px] space-y-4">
              {analysisData.difficult_terms.map(
                (term: DifficultTerm, i: number) => {
                  const definitionText = term.definition || term.explanation || "";
                  return (
                    <li key={i} className="leading-relaxed">
                      <a
                        href={`https://stdict.korean.go.kr/search/searchResult.do?pageSize=10&searchKeyword=${encodeURIComponent(term.term)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sky-700 bg-sky-100 hover:bg-sky-200 transition-colors px-1.5 py-0.5 inline-flex items-center gap-1 mb-1 font-bold cursor-pointer"
                        style={{ borderRadius: "6px" }}
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
                          className="text-[11px] text-sky-500 bg-sky-50 border border-sky-100 px-1.5 py-0.5 ml-1 align-text-bottom"
                          style={{ borderRadius: "999px" }}
                        >
                          {term.category}
                        </span>
                      )}
                      <br />
                      <span className="text-slate-700">{definitionText}</span>
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
          icon="👤"
          title="핵심 인물 프로필"
          bg="bg-emerald-50/80"
          border="border-emerald-100"
          textColor="text-emerald-900"
          status={status}
        >
          {analysisData?.key_persons && analysisData.key_persons.length > 0 ? (
            <ul className="text-[14px] space-y-4">
              {analysisData.key_persons.map((person: KeyPerson, i: number) => (
                <li
                  key={i}
                  className="leading-relaxed border-l-2 border-emerald-300 pl-3"
                >
                  <a
                    href={`https://www.google.com/search?q=${encodeURIComponent(person.name)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-emerald-800 text-[15px] mb-0.5 font-bold hover:text-emerald-600 hover:underline cursor-pointer"
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
                    <span className="text-xs text-emerald-600 font-semibold block mb-0.5">
                      {person.role}
                    </span>
                  )}
                  <span className="text-slate-700 block">
                    {person.description}
                  </span>
                  {person.relation && (
                    <span className="block text-xs text-slate-500 mt-1 italic">
                      이 기사에서: {person.relation}
                    </span>
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
