import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import LoadingModal from "../components/LoadingModal";
import ArticleEngagementBar from "../components/news/ArticleEngagementBar";
import { SOURCE_NAME_MAP, SOURCE_BADGE_CLASS } from "../constants/source";
import { useNewsDetail } from "../hooks/useNewsDetail";
import ArticleContent from "../components/detail/ArticleContent";
import AnalysisAside from "../components/detail/AnalysisAside";
import type { TabType } from "../components/detail/AnalysisAside";
import ComicViewer from "../components/detail/ComicViewer";
import { decodeHtmlEntities } from "../utils/summary";

// 뉴스 상세 페이지: 기사 본문 + AI 신뢰도 분석 리포트 + AI 만화
export default function DetailPage() {
  const [activeTab, setActiveTab] = useState<TabType>("credibility");
  const [activeKeyword, setActiveKeyword] = useState<string | null>(null);

  // 본문 단어 클릭 → 사이드바 탭 전환 + 스크롤
  const handleSelectKeyword = useCallback(
    (name: string, type: "term" | "person") => {
      const targetTab = type === "term" ? "terms" : "persons";
      setActiveTab(targetTab);
      setActiveKeyword(name);

      setTimeout(() => {
        const elementId =
          type === "term"
            ? `sidebar-term-${name}`
            : `sidebar-person-${name}`;
        const element = document.getElementById(elementId);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      }, 50);
    },
    [],
  );

  // 사이드바 아이템 클릭 → 본문 스크롤 + 펄스 효과
  const handleSidebarItemClick = useCallback(
    (name: string, type: "term" | "person") => {
      setActiveKeyword(name);
      const targetAttr =
        type === "term" ? "data-term-name" : "data-person-name";
      const element = document.querySelector(`[${targetAttr}="${name}"]`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        element.classList.remove("animate-highlight-pulse");
        void (element as HTMLElement).offsetWidth;
        element.classList.add("animate-highlight-pulse");
      }
    },
    [],
  );

  const {
    id,
    news,
    loading,
    status,
    analysisData,
    isComicGenerating,
    comicUrls,
    progress,
    loadingStatus,
    showPromptInput,
    customPrompt,
    searchTerm,
    searchEngine,
    setShowPromptInput,
    setCustomPrompt,
    setSearchTerm,
    setSearchEngine,
    startAnalysis,
    handleGenerateComic,
    handleTermSearch,
  } = useNewsDetail();

  // 로딩 스켈레톤
  if (loading) {
    return (
      <div className="mt-8 pb-20 font-sans animate-pulse">
        <div className="w-20 h-5 bg-[#F3F0EB] rounded-lg mb-7" />

        <header className="mb-10">
          <div className="flex gap-3 mb-5">
            <div className="w-16 h-6 bg-[#F3F0EB] rounded-full" />
            <div className="w-24 h-6 bg-[#F3F0EB] rounded-full" />
          </div>
          <div className="w-3/4 h-10 bg-[#F3F0EB] rounded-xl mb-4" />
          <div className="w-1/2 h-6 bg-[#F3F0EB] rounded-lg mb-6" />
          <div className="w-full h-[1px] bg-[#E4DDD3]" />
        </header>

        <div className="flex flex-col lg:flex-row gap-10">
          <div className="flex-1 min-w-0 flex flex-col gap-4">
            {[100, 100, 95, 92, 100, 97, 85].map((w, i) => (
              <div
                key={i}
                className="h-[18px] bg-[#F3F0EB] rounded"
                style={{ width: `${w}%` }}
              />
            ))}
            <div className="w-full h-14 bg-[#F3F0EB] rounded-2xl mt-8" />
          </div>

          <div className="w-full lg:w-[360px] shrink-0 flex flex-col gap-4">
            <div className="p-6 border border-[#E4DDD3] rounded-[22px] bg-[#FDFBF7]">
              <div className="w-28 h-5 bg-[#F3F0EB] rounded-lg mb-4" />
              <div className="w-full h-24 bg-[#F3F0EB] rounded-xl" />
            </div>
            <div className="p-6 border border-[#E4DDD3] rounded-[22px] bg-[#FDFBF7]">
              <div className="w-24 h-5 bg-[#F3F0EB] rounded-lg mb-4" />
              <div className="w-full h-32 bg-[#F3F0EB] rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 기사 미발견
  if (!news) {
    return (
      <div className="mt-32 text-center text-[#5C5853] font-sans">
        <p className="text-5xl mb-4" aria-hidden="true">📰</p>
        <p className="text-lg font-bold mb-2">기사를 찾을 수 없습니다.</p>
        <p className="text-sm text-[#9C9891] mb-6">
          삭제되었거나 주소가 잘못되었을 수 있습니다.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-[#C13026] hover:underline"
        >
          ← 목록으로 돌아가기
        </Link>
      </div>
    );
  }

  const aiSummary =
    analysisData?.credibility?.summary || news.ai_summary || null;
  const sourceKey = news.source?.toLowerCase();
  const sourceName =
    SOURCE_NAME_MAP[sourceKey] || news.source?.toUpperCase() || "알 수 없음";
  const isNaverPlatform = news.url?.includes("naver.com");
  const displaySourceName = isNaverPlatform ? "네이버 뉴스" : sourceName;
  const displayBadgeClass = isNaverPlatform
    ? SOURCE_BADGE_CLASS["naver"] || "bg-[#03c75a] text-white"
    : SOURCE_BADGE_CLASS[sourceKey] || "badge-default";

  return (
    <div className="mt-8 pb-20 font-sans">
      {/* 만화 생성 모달 */}
      <LoadingModal
        isOpen={isComicGenerating}
        progress={progress}
        status={loadingStatus}
      />

      {/* 뒤로가기 */}
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm font-bold mb-7 transition-colors duration-150 text-[#9C9891] hover:text-[#161311]"
        aria-label="뉴스 목록으로 이동"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        목록으로
      </Link>

      {/* 기사 헤더 */}
      <header className="mb-8">
        <div className="flex items-center flex-wrap gap-2.5 mb-4">
          <span
            className={`${displayBadgeClass} text-xs font-black px-3.5 py-1.5 rounded-full`}
          >
            {displaySourceName}
          </span>
          <time
            className="text-sm font-medium text-[#9C9891]"
            dateTime={news.published_at}
          >
            {news.published_at?.split("T")[0]}
          </time>
          {news.is_analyzed && (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1.5 rounded-full bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              AI 분석완료
            </span>
          )}
        </div>

        <div className="mb-4">
          <ArticleEngagementBar
            articleId={news.id}
            analyzedTheme={news.is_analyzed}
            articleMeta={{
              id: news.id,
              title: news.title,
              source: news.source,
              image_url: news.image_url,
              published_at: news.published_at,
            }}
          />
        </div>

        <h1 className="font-black leading-snug mb-5 font-serif text-[clamp(22px,4vw,38px)] text-[#161311] tracking-[-0.02em] break-keep">
          {decodeHtmlEntities(news.title)}
        </h1>

        <div className="flex items-center flex-wrap gap-3 pb-6 border-b border-[#E4DDD3]">
          <a
            href={news.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-bold transition-colors duration-150 text-[#1A55A8] hover:text-[#C13026]"
          >
            기사 원문 보기
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              stroke="currentColor"
              className="w-3.5 h-3.5"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m4.5 19.5 15-15m0 0H8.25m11.25 0v11.25"
              />
            </svg>
          </a>
          <span className="text-sm text-[#9C9891]">출처: {sourceName}</span>
          {news.tags && news.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 items-center">
              {news.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg bg-[#F3F0EB] text-[#5C5853] border border-[#E4DDD3] hover:bg-white transition-colors duration-150 cursor-default select-none"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* 2단 레이아웃: 좌(본문) + 우(사이드바) */}
      <div className="flex flex-col lg:flex-row gap-10 relative">
        <div className="flex-1 min-w-0">
          <ArticleContent
            news={news}
            aiSummary={aiSummary}
            onSelectKeyword={handleSelectKeyword}
          />

          {/* AI 분석 실행 버튼 */}
          <div className="mt-10 pt-8 border-t border-[#E4DDD3]">
            <button
              onClick={startAnalysis}
              disabled={status !== "pending"}
              className={`w-full py-5 text-[16px] font-black flex items-center justify-center gap-3 transition-all duration-200 rounded-[18px] ${
                status === "analyzing"
                  ? "bg-[#F3F0EB] text-[#9C9891] cursor-not-allowed"
                  : status === "complete"
                    ? "bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0] cursor-default"
                    : "bg-[#161311] text-white shadow-[0_4px_20px_rgba(22,19,17,0.2)] hover:bg-[#C13026] hover:shadow-[0_8px_32px_rgba(193,48,38,0.28)] hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
              }`}
              style={{ willChange: "transform" }}
              aria-label={
                status === "analyzing"
                  ? "AI 분석 중"
                  : status === "complete"
                    ? "AI 분석 완료"
                    : "AI 분석 실행"
              }
            >
              {status === "analyzing" && (
                <svg
                  className="animate-spin h-5 w-5 text-[#9C9891]"
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
              )}
              {status === "complete" && (
                <svg
                  className="h-5 w-5 text-[#065F46]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
              {status === "pending" && (
                <svg
                  className="h-5 w-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              )}
              {status === "analyzing"
                ? "AI가 기사를 분석하고 있습니다..."
                : status === "complete"
                  ? "AI 분석이 완료되었습니다"
                  : "AI 분석 실행 및 본문 가져오기"}
            </button>
          </div>

          {/* AI 만화 뷰어 */}
          <ComicViewer
            id={id}
            status={status}
            comicUrls={comicUrls}
            isComicGenerating={isComicGenerating}
            showPromptInput={showPromptInput}
            setShowPromptInput={setShowPromptInput}
            customPrompt={customPrompt}
            setCustomPrompt={setCustomPrompt}
            handleGenerateComic={handleGenerateComic}
          />
        </div>

        {/* 우측 사이드바 */}
        <AnalysisAside
          status={status}
          analysisData={analysisData}
          aiSummary={aiSummary}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          searchEngine={searchEngine}
          setSearchEngine={setSearchEngine}
          handleTermSearch={handleTermSearch}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          activeKeyword={activeKeyword}
          onSidebarItemClick={handleSidebarItemClick}
        />
      </div>
    </div>
  );
}
