import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import LoadingModal from "../components/LoadingModal";
import ArticleEngagementBar from "../components/news/ArticleEngagementBar";
import { useTrackArticleView } from "../hooks/useArticleEngagement";
import { SOURCE_NAME_MAP, SOURCE_BADGE_CLASS } from "../constants/source";
import { useNewsDetail } from "../hooks/useNewsDetail";
import ArticleContent from "../components/detail/ArticleContent";
import AnalysisAside from "../components/detail/AnalysisAside";
import type { TabType } from "../components/detail/AnalysisAside";
import ComicViewer from "../components/detail/ComicViewer";
import { decodeHtmlEntities } from "../utils/summary";

// 뉴스 상세 정보(기사 본문, AI 신뢰도 분석 리포트, AI 만화)를 보여주는 페이지
export default function DetailPage() {
  // ── 양방향 스크롤 및 탭 동기화를 위한 핵심 상태 정의 ──
  const [activeTab, setActiveTab] = useState<TabType>("credibility");
  const [activeKeyword, setActiveKeyword] = useState<string | null>(null);

  // 본문 내 단어 클릭 -> 사이드바 탭 전환, 하이라이트 및 사이드바 내부 스크롤 이동
  const handleSelectKeyword = useCallback((name: string, type: "term" | "person") => {
    const targetTab = type === "term" ? "terms" : "persons";
    setActiveTab(targetTab);
    setActiveKeyword(name);

    // React 상태가 렌더링된 후 DOM에 접근하기 위해 지연 실행
    setTimeout(() => {
      const elementId = type === "term" ? `sidebar-term-${name}` : `sidebar-person-${name}`;
      const element = document.getElementById(elementId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }, 50);
  }, []);

  // 사이드바 아이템 클릭 -> 본문 내 첫 번째 출현 지점으로 본문 화면 스크롤 이동 및 펄스 효과 부여
  const handleSidebarItemClick = useCallback((name: string, type: "term" | "person") => {
    setActiveKeyword(name);
    const targetAttr = type === "term" ? "data-term-name" : "data-person-name";
    const element = document.querySelector(`[${targetAttr}="${name}"]`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });

      // CSS 펄스 애니메이션 초기화 후 재발동 (Reflow 트릭)
      element.classList.remove("animate-highlight-pulse");
      void (element as HTMLElement).offsetWidth;
      element.classList.add("animate-highlight-pulse");
    }
  }, []);

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

  useTrackArticleView(id ? Number(id) : undefined, !loading && !!news);

  // 최초 로딩 시 상세 화면 구조 스켈레톤을 노출하여 체감 속도 극대화 및 레이아웃 이동(CLS) 방지
  if (loading) {
    return (
      <div className="mt-8 pb-20 font-sans animate-pulse">
        {/* 목록으로 가기 버튼 스켈레톤 */}
        <div className="w-20 h-5 bg-[#F3F0EB] rounded-lg mb-7" />

        {/* 기사 헤더 스켈레톤 */}
        <header className="mb-10">
          <div className="flex gap-3 mb-5">
            <div className="w-16 h-6 bg-[#F3F0EB] rounded-full" />
            <div className="w-24 h-6 bg-[#F3F0EB] rounded-full" />
          </div>
          <div className="w-3/4 h-10 bg-[#F3F0EB] rounded-xl mb-4" />
          <div className="w-1/2 h-6 bg-[#F3F0EB] rounded-lg mb-6" />
          <div className="w-full h-[1px] bg-[#E4DDD3]" />
        </header>

        {/* 2단 레이아웃 구조 스켈레톤 */}
        <div className="flex flex-col lg:flex-row gap-10">
          {/* 좌측 기사 본문 영역 스켈레톤 */}
          <div className="flex-1 min-w-0 flex flex-col gap-4">
            <div className="w-full h-4.5 bg-[#F3F0EB] rounded" />
            <div className="w-full h-4.5 bg-[#F3F0EB] rounded" />
            <div className="w-[95%] h-4.5 bg-[#F3F0EB] rounded" />
            <div className="w-[92%] h-4.5 bg-[#F3F0EB] rounded" />
            <div className="w-full h-4.5 bg-[#F3F0EB] rounded mt-4" />
            <div className="w-[97%] h-4.5 bg-[#F3F0EB] rounded" />
            <div className="w-[85%] h-4.5 bg-[#F3F0EB] rounded" />
            
            <div className="w-full h-14 bg-[#F3F0EB] rounded-2xl mt-8" />
          </div>

          {/* 우측 사이드바 리포트 영역 스켈레톤 */}
          <div className="w-full lg:w-[360px] shrink-0 flex flex-col gap-6">
            <div className="p-6 border border-[#E4DDD3] rounded-[24px] bg-[#FDFBF7]">
              <div className="w-28 h-5 bg-[#F3F0EB] rounded-lg mb-4" />
              <div className="w-full h-24 bg-[#F3F0EB] rounded-xl" />
            </div>
            <div className="p-6 border border-[#E4DDD3] rounded-[24px] bg-[#FDFBF7]">
              <div className="w-24 h-5 bg-[#F3F0EB] rounded-lg mb-4" />
              <div className="w-full h-32 bg-[#F3F0EB] rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 기사가 DB나 서버에 없을 경우의 대체 화면
  if (!news) {
    return (
      <div className="mt-32 text-center text-[#5C5853] font-sans">
        <p className="text-5xl mb-4">📰</p>
        <p className="text-lg font-bold">기사를 찾을 수 없습니다.</p>
        <Link
          to="/"
          className="mt-4 inline-block text-sm font-bold text-[#C13026]"
        >
          ← 목록으로 돌아가기
        </Link>
      </div>
    );
  }

  const aiSummary = analysisData?.credibility?.summary || news.ai_summary || null;
  const sourceKey = news.source?.toLowerCase();
  const sourceName = SOURCE_NAME_MAP[sourceKey] || news.source?.toUpperCase() || "알 수 없음";
  
  // 네이버 뉴스 플랫폼 제휴 유통 여부 판정
  const isNaverPlatform = news.url?.includes("naver.com");
  const displaySourceName = isNaverPlatform ? "네이버 뉴스" : sourceName;
  
  // 네이버 뉴스 플랫폼일 경우 뱃지 색상을 네이버 시그니처 초록색으로 강제 통일
  const displayBadgeClass = isNaverPlatform 
    ? (SOURCE_BADGE_CLASS["naver"] || "bg-[#03c75a] text-white") 
    : (SOURCE_BADGE_CLASS[sourceKey] || "badge-default");

  return (
    <div className="mt-8 pb-20 font-sans">
      {/* 만화 생성 중일 때 뜨는 전면 프로그레스 모달 */}
      <LoadingModal
        isOpen={isComicGenerating}
        progress={progress}
        status={loadingStatus}
      />

      {/* 목록으로 가기 버튼 */}
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm font-bold mb-7 transition-colors duration-200 text-[#9C9891] hover:text-[#161311]"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
        </svg>
        목록으로
      </Link>

      {/* 기사 헤더 영역: 언론사, 날짜, 원문 링크 등 */}
      <header className="mb-10">
        <div className="flex items-center flex-wrap gap-3 mb-4">
          <span className={`${displayBadgeClass} text-xs font-black px-3.5 py-1.5 rounded-full`}>
            {displaySourceName}
          </span>
          <span className="text-sm font-medium text-[#9C9891]">
            {news.published_at?.split("T")[0]}
          </span>
          {news.is_analyzed && (
            <span
              className="inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1.5 rounded-full bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              AI 분석완료
            </span>
          )}
        </div>

        <div className="mb-5">
          <ArticleEngagementBar
            articleId={news.id}
            analyzedTheme={news.is_analyzed}
          />
        </div>

        <h1 className="font-black leading-snug mb-6 font-serif text-[clamp(22px,4vw,40px)] text-[#161311] tracking-[-0.02em]">
          {decodeHtmlEntities(news.title)}
        </h1>

        <div className="flex items-center flex-wrap gap-4 pb-6 border-b border-[#E4DDD3]">
          <a
            href={news.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-bold transition-colors duration-200 text-[#1A55A8] hover:text-[#C13026]"
          >
            기사 원문 사이트에서 보기
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              stroke="currentColor"
              className="w-4 h-4"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 19.5 15-15m0 0H8.25m11.25 0v11.25" />
            </svg>
          </a>
          <span className="text-sm text-[#9C9891]">
            출처: {sourceName}
          </span>
        </div>
      </header>

      {/* 좌측(본문/만화) & 우측(AI 분석 리포트) 2단 레이아웃 */}
      <div className="flex flex-col lg:flex-row gap-10 relative">
        {/* 본문 및 만화 생성 컨트롤러 */}
        <div className="flex-1 min-w-0">
          {/* 기사 텍스트 본문 컴포넌트 */}
          <ArticleContent
            news={news}
            aiSummary={aiSummary}
            onSelectKeyword={handleSelectKeyword}
          />

          {/* AI 기사 분석 트리거 버튼 */}
          <div className="mt-12 pt-8 border-t border-[#E4DDD3]">
            <button
              onClick={startAnalysis}
              disabled={status !== "pending"}
              className={`w-full py-5 text-[17px] font-black flex items-center justify-center gap-3.5 transition-all duration-300 rounded-[18px] ${
                status === "analyzing"
                  ? "bg-[#F3F0EB] text-[#9C9891] cursor-not-allowed"
                  : status === "complete"
                    ? "bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0] cursor-default"
                    : "bg-[#161311] text-white shadow-[0_4px_20px_rgba(22,19,17,0.2)] hover:bg-[#C13026] hover:shadow-[0_8px_32px_rgba(193,48,38,0.3)] hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
              }`}
            >
              {status === "analyzing" && (
                <svg className="animate-spin h-5 w-5 text-[#9C9891]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {status === "complete" && (
                <svg className="h-5 w-5 text-[#065F46]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {status === "pending" && (
                <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              )}
              {status === "analyzing"
                ? "AI가 기사를 꼼꼼히 읽고 분석 중입니다..."
                : status === "complete"
                  ? "AI 분석이 완료되었습니다"
                  : "AI 분석 실행 및 본문 가져오기"}
            </button>
          </div>

          {/* AI 뉴스 요약 만화 뷰어 */}
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

        {/* 우측 사이드바: 신뢰도 수치, 어려운 단어 사전, 핵심 인물 프로필 */}
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
