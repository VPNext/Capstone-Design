import { useNewsList } from "../hooks/useNewsList";
import { STORAGE_KEYS } from "../utils/storage";
import NewsPageTemplate from "../components/news/NewsPageTemplate";
import NewsSearchBar from "../components/news/NewsSearchBar";

// 오늘의 뉴스 목록을 보여주는 메인 화면 페이지
export default function MainPage() {
  const {
    newsList,
    page,
    totalPages,
    totalItems,
    selectedSource,
    loading,
    keyword,
    handlePageChange,
    handleSourceChange,
    error,
    handleRetry,
  } = useNewsList({
    isAnalyzed: false,
    cacheKey: STORAGE_KEYS.MAIN_NEWS_CACHE,
    scrollKey: "", // 비워둠 (동작 안 함)
  });

  // 상단 타이틀 배너 영역 정의
  const banner = (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 mb-6 pb-5 border-b-2 border-[#161311]">
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] mb-1.5 flex items-center gap-2 text-[#C13026]">
          <span className="inline-block w-4 h-px bg-[#C13026]" />
          {keyword ? "검색 결과" : "TODAY'S NEWS"}
        </p>
        <h1 className="font-black font-serif text-[clamp(26px,4vw,36px)] text-[#161311] leading-[1.15] tracking-[-0.02em]">
          {keyword ? `"${keyword}"` : "오늘의 뉴스"}
        </h1>
        <p className="text-sm mt-2 leading-relaxed text-[#5C5853] max-w-[480px]">
          {keyword
            ? "현재 로드된 데이터 내 검색 결과입니다"
            : "AI 분석 전 최신 뉴스 목록 — 클릭하면 AI 분석을 시작할 수 있습니다"}
        </p>
      </div>

      <div className="flex flex-col gap-2.5 w-full lg:w-[min(100%,400px)] shrink-0">
        <NewsSearchBar variant="main" />
        <div className="flex items-center justify-between sm:justify-end gap-3 text-xs font-medium text-[#9C9891]">
          <span>
            {new Date().toLocaleDateString("ko-KR", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
          {totalItems > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold bg-[#161311] text-white">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                <path d="M2 3a1 1 0 000 2h11a1 1 0 100-2H2zm0 4a1 1 0 000 2h7a1 1 0 100-2H2zm0 4a1 1 0 000 2h4a1 1 0 100-2H2z" />
              </svg>
              총 {totalItems}개 기사
            </span>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <NewsPageTemplate
      newsList={newsList}
      selectedSource={selectedSource}
      loading={loading}
      page={page}
      totalPages={totalPages}
      keyword={keyword}
      onChangePage={handlePageChange}
      handleSourceChange={handleSourceChange}
      isAnalyzedPage={false}
      activeBgColor="#161311"
      banner={banner}
      btnBg="#161311"
      btnHoverBg="#C13026"
      btnBoxShadow="0 2px 12px rgba(22,19,17,0.3)"
      error={error}
      handleRetry={handleRetry}
    />
  );
}
