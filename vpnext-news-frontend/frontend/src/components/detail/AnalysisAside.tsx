import { useMemo, memo } from "react";
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

// 메모이제이션된 카드 컴포넌트 - 불필요한 리렌더링 방지
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

  // 기사 신뢰도 근거 본문 메모이제이션
  const parsedReason = useMemo(() => {
    return credibility?.reason ? parseAndRenderSummary(credibility.reason, true) : null;
  }, [credibility?.reason]);

  // AI 3줄 요약 본문 메모이제이션
  const parsedSummary = useMemo(() => {
    return aiSummary ? parseAndRenderSummary(aiSummary, false) : null;
  }, [aiSummary]);

  // 점수 기반 스타일 메모이제이션
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

// ── 하위 리스트 컴포넌트 추출 & 메모이제이션 ──

interface TermListProps {
  terms: DifficultTerm[];
}

const TermList = memo(function TermList({ terms }: TermListProps) {
  if (!terms || terms.length === 0) {
    return <p className="text-sm text-sky-700 opacity-60">추출된 용어가 없습니다.</p>;
  }

  return (
    <ul className="text-[14px] space-y-3">
      {terms.map((term: DifficultTerm) => {
        const definitionText = term.definition || term.explanation || "";
        const dictUrl = term.dict_link || `https://stdict.korean.go.kr/search/searchResult.do?pageSize=10&searchKeyword=${encodeURIComponent(term.term)}`;
        const searchTitle = term.dict_link ? `${term.term} 뜻 상세 정보 보기` : `${term.term} 국립국어원에서 뜻 찾아보기`;

        return (
          <li 
            key={`term-${term.term}`} 
            className="p-3.5 bg-white/70 backdrop-blur-md border border-sky-100/50 rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.01)] transition-all duration-200 hover:shadow-md hover:bg-white"
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <a
                href={dictUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sky-700 hover:text-sky-900 transition-colors inline-flex items-center gap-1 font-bold text-[14px] cursor-pointer"
                title={searchTitle}
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
                  className="text-[10px] font-semibold text-sky-600 bg-sky-50 border border-sky-100/60 px-2 py-0.5 rounded-full"
                >
                  {term.category}
                </span>
              )}
            </div>
            <p className="text-[13px] text-slate-600 leading-relaxed font-normal">{definitionText}</p>
          </li>
        );
      })}
    </ul>
  );
});

interface PersonListProps {
  persons: KeyPerson[];
}

const PersonList = memo(function PersonList({ persons }: PersonListProps) {
  if (!persons || persons.length === 0) {
    return <p className="text-sm text-emerald-700 opacity-60">추출된 인물이 없습니다.</p>;
  }

  return (
    <ul className="text-[14px] space-y-3">
      {persons.map((person: KeyPerson) => (
        <li
          key={`person-${person.name}`}
          className="p-3.5 bg-white/70 backdrop-blur-md border border-emerald-100/50 rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.01)] transition-all duration-200 hover:shadow-md hover:bg-white"
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
          <p className="text-[13px] text-slate-700 leading-relaxed font-normal">
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
  );
});

interface RedFlagsProps {
  flags: string[];
}

const RedFlags = memo(function RedFlags({ flags }: RedFlagsProps) {
  if (!flags || flags.length === 0) return null;

  return (
    <div className="mb-4">
      <p className="text-xs font-semibold text-[#5C5853] mb-1.5 flex items-center gap-1.5">
        <svg className="w-3.5 h-3.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        주의 표현
      </p>
      <ul className="flex flex-wrap gap-1.5">
        {flags.map((flag: string, i: number) => {
          let cleanFlag = flag.replace(/\[([^\]]+)\]\(https?:\/\/[^\s)]+\)/g, (_, linkText) => {
            return SOURCE_NAME_MAP[linkText.toLowerCase()] || linkText;
          });
          cleanFlag = replaceEnglishSourceNames(cleanFlag);

          return (
            <li
              key={`flag-${i}`}
              className="text-xs px-3 py-1 border bg-red-50 text-red-800 border-red-200 rounded-full font-medium"
            >
              {cleanFlag}
            </li>
          );
        })}
      </ul>
    </div>
  );
});

