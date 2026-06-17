import { useMemo, memo } from "react";
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
export type TabType = "credibility" | "terms" | "persons";

interface AnalysisAsideProps {
  status: AnalysisStatus;
  analysisData: AnalysisData | null;
  aiSummary: string | null;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  searchEngine: string;
  setSearchEngine: (value: string) => void;
  handleTermSearch: (e: FormEvent) => void;
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  activeKeyword: string | null;
  onSidebarItemClick?: (name: string, type: "term" | "person") => void;
}

// 탭 버튼 컴포넌트 — 재사용 및 가독성 향상
function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2 text-[12px] font-bold rounded-lg transition-all duration-150 cursor-pointer flex items-center justify-center gap-1.5 ${
        active
          ? "bg-[#161311] text-white shadow-[0_2px_8px_rgba(22,19,17,0.15)]"
          : "text-[#9C9891] hover:text-[#161311] hover:bg-white/50"
      }`}
      aria-selected={active}
      role="tab"
    >
      {children}
    </button>
  );
}

const AnalysisAside = memo(function AnalysisAside({
  status,
  analysisData,
  aiSummary,
  searchTerm,
  setSearchTerm,
  searchEngine,
  setSearchEngine,
  handleTermSearch,
  activeTab,
  setActiveTab,
  activeKeyword,
  onSidebarItemClick,
}: AnalysisAsideProps) {
  const credibility = analysisData?.credibility;

  const parsedReason = useMemo(() => {
    return credibility?.reason
      ? parseAndRenderSummary(credibility.reason, true)
      : null;
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

  const termCount = useMemo(
    () => analysisData?.difficult_terms?.length || 0,
    [analysisData?.difficult_terms],
  );
  const personCount = useMemo(
    () => analysisData?.key_persons?.length || 0,
    [analysisData?.key_persons],
  );

  return (
    <aside className="w-full lg:w-[360px] shrink-0" aria-label="AI 분석 리포트">
      <div className="sticky top-24 flex flex-col gap-3 max-h-[calc(100vh-112px)]">
        {/* 사이드바 헤더 */}
        <div className="px-5 py-4 bg-[#161311] rounded-2xl shadow-[0_4px_20px_rgba(22,19,17,0.15)] shrink-0">
          <h2 className="text-[15px] font-bold text-white flex items-center gap-2">
            <svg
              className="w-4 h-4 text-emerald-400 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
              />
            </svg>
            AI 나침반 리포트
          </h2>
          <p className="text-xs mt-1 text-white/45 leading-relaxed">
            AI가 분석한 기사 신뢰도 및 핵심 정보입니다.
          </p>
        </div>

        {/* 탭 컨트롤 */}
        <div
          className="flex p-1 bg-[#F3F0EB] rounded-xl gap-1 border border-[#E4DDD3] shrink-0"
          role="tablist"
          aria-label="분석 탭 메뉴"
        >
          <TabButton
            active={activeTab === "credibility"}
            onClick={() => setActiveTab("credibility")}
          >
            📊 신뢰도
          </TabButton>

          <TabButton
            active={activeTab === "terms"}
            onClick={() => setActiveTab("terms")}
          >
            📖 용어
            {status === "complete" && termCount > 0 && (
              <span
                className={`px-1.5 text-[10px] rounded-full font-black leading-5 ${
                  activeTab === "terms"
                    ? "bg-white text-[#161311]"
                    : "bg-sky-100 text-sky-700"
                }`}
              >
                {termCount}
              </span>
            )}
          </TabButton>

          <TabButton
            active={activeTab === "persons"}
            onClick={() => setActiveTab("persons")}
          >
            👥 인물
            {status === "complete" && personCount > 0 && (
              <span
                className={`px-1.5 text-[10px] rounded-full font-black leading-5 ${
                  activeTab === "persons"
                    ? "bg-white text-[#161311]"
                    : "bg-emerald-100 text-emerald-700"
                }`}
              >
                {personCount}
              </span>
            )}
          </TabButton>
        </div>

        {/* 탭 콘텐츠 영역 */}
        <div
          className="flex-1 overflow-y-auto pr-0.5 transition-all duration-200 min-h-0 custom-sidebar-scrollbar"
          role="tabpanel"
        >
          {activeTab === "credibility" && (
            <div
              className={`${scoreColor.bg} ${scoreColor.border} border rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(22,19,17,0.03)]`}
            >
              <div
                className={`flex items-center gap-2 px-5 pt-4 pb-3 border-b ${scoreColor.border}`}
              >
                <svg
                  className={`w-4 h-4 ${scoreColor.text} shrink-0`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
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
                    {/* 원형 게이지 + 신뢰도 수치 */}
                    <div className="flex items-center gap-4 mb-4 p-4 rounded-xl bg-white/50 border border-white/70">
                      <div className="relative flex items-center justify-center shrink-0">
                        <svg
                          className="w-16 h-16 transform -rotate-90"
                          viewBox="0 0 68 68"
                          aria-hidden="true"
                        >
                          <circle
                            cx="34"
                            cy="34"
                            r="28"
                            stroke="rgba(228, 221, 211, 0.45)"
                            strokeWidth="5"
                            fill="transparent"
                          />
                          {credibility.score != null && (
                            <circle
                              cx="34"
                              cy="34"
                              r="28"
                              stroke={scoreColor.hex}
                              strokeWidth="5.5"
                              fill="transparent"
                              strokeDasharray={2 * Math.PI * 28}
                              strokeDashoffset={
                                2 * Math.PI * 28 * (1 - credibility.score)
                              }
                              strokeLinecap="round"
                              style={{
                                transition:
                                  "stroke-dashoffset 0.8s cubic-bezier(0.22, 1, 0.36, 1)",
                                filter: `drop-shadow(0 0 5px ${scoreColor.hex}45)`,
                              }}
                            />
                          )}
                        </svg>
                        <span
                          className={`absolute text-[14px] font-black tracking-tight ${scoreColor.text}`}
                        >
                          {credibility.score != null
                            ? `${(credibility.score * 100).toFixed(0)}`
                            : "-"}
                          %
                        </span>
                      </div>

                      <div className="flex flex-col gap-1 min-w-0 flex-1">
                        <span className="text-[10px] font-black tracking-wider text-[#9C9891] uppercase">
                          AI 신뢰 지수
                        </span>
                        <span
                          className={`text-[17px] font-black ${scoreColor.text} leading-tight`}
                        >
                          {credibility.label || "분석 완료"}
                        </span>
                        {credibility.tags && credibility.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {credibility.tags.map((tag, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-white/90 text-slate-700 border border-slate-200/60 hover:bg-white transition-colors duration-150 cursor-default select-none"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 분석 이유 */}
                    <div
                      className={`text-[14px] leading-[1.8] font-medium p-4 mb-4 bg-white/65 rounded-xl ${scoreColor.text}`}
                    >
                      {parsedReason}
                    </div>

                    <RedFlags flags={credibility.red_flags || []} />

                    {/* AI 3줄 요약 */}
                    {aiSummary && (
                      <div className="mt-3 border-t border-dashed border-slate-200/70 pt-3">
                        <p className="text-xs font-semibold text-[#5C5853] mb-1.5 flex items-center gap-1.5">
                          <svg
                            className="w-3.5 h-3.5 text-slate-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2.5}
                              d="M4 6h16M4 12h16M4 18h7"
                            />
                          </svg>
                          3줄 요약
                        </p>
                        <div className="text-[13px] leading-[1.8] p-4 text-[#2C2926] bg-white/65 rounded-xl">
                          {parsedSummary}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="py-4">
                    {status === "analyzing" ? (
                      <div className="flex items-center gap-2.5 text-sm font-medium text-[#9C9891]">
                        <svg
                          className="animate-spin h-4 w-4"
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
                        AI가 분석하고 있습니다...
                      </div>
                    ) : (
                      <p className="text-sm text-[#5C5853] font-medium opacity-50">
                        AI 분석을 실행해 주세요.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "terms" && (
            <AnalysisCard
              icon={
                <svg
                  className="w-4.5 h-4.5 text-sky-700"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              }
              title="용어 풀이"
              bg="bg-sky-50/80"
              border="border-sky-100"
              textColor="text-sky-900"
              status={status}
            >
              <TermList
                terms={analysisData?.difficult_terms || []}
                activeKeyword={activeKeyword}
                onTermClick={(name) => onSidebarItemClick?.(name, "term")}
              />

              <DictionarySearchForm
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                searchEngine={searchEngine}
                setSearchEngine={setSearchEngine}
                onSubmit={handleTermSearch}
              />
            </AnalysisCard>
          )}

          {activeTab === "persons" && (
            <AnalysisCard
              icon={
                <svg
                  className="w-4.5 h-4.5 text-emerald-700"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              }
              title="핵심 인물 프로필"
              bg="bg-emerald-50/80"
              border="border-emerald-100"
              textColor="text-emerald-900"
              status={status}
            >
              <PersonList
                persons={analysisData?.key_persons || []}
                activeKeyword={activeKeyword}
                onPersonClick={(name) => onSidebarItemClick?.(name, "person")}
              />
            </AnalysisCard>
          )}
        </div>
      </div>
    </aside>
  );
});

export default AnalysisAside;
