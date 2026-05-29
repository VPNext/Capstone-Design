import { Link } from "react-router-dom";
import LoadingModal from "../components/LoadingModal";
import { SOURCE_NAME_MAP, SOURCE_BADGE_CLASS } from "../constants/source";
import { useNewsDetail } from "../hooks/useNewsDetail";
import ArticleContent from "../components/detail/ArticleContent";
import AnalysisAside from "../components/detail/AnalysisAside";
import ComicViewer from "../components/detail/ComicViewer";
import { decodeHtmlEntities } from "../utils/summary";



// 뉴스 상세 정보(기사 본문, AI 신뢰도 분석 리포트, AI 만화)를 보여주는 페이지
export default function DetailPage() {
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

  // 최초 로딩 시 화면 중앙에 나타날 심플 로더
  if (loading) {
    return (
      <div className="mt-32 flex flex-col items-center gap-4 text-[#9C9891] font-sans">
        <div className="w-10 h-10 rounded-full border-2 animate-spin border-[#E4DDD3] border-t-[#C13026]" />
        <p className="text-lg font-bold animate-pulse">
          기사를 불러오는 중입니다...
        </p>
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
        <div className="flex items-center flex-wrap gap-3 mb-5">
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
        />
      </div>
    </div>
  );
}
