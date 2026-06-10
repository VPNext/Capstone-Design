import { useNewsList } from "../hooks/useNewsList";
import { STORAGE_KEYS } from "../utils/storage";
import NewsPageTemplate from "../components/news/NewsPageTemplate";
import NewsSearchBar from "../components/news/NewsSearchBar";

// AI 분석이 완료된(신뢰도 리포트가 존재하는) 기사들을 모아보는 분석 뉴스 페이지
export default function AnalyzedNewsPage() {
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
    isAnalyzed: true,
    cacheKey: STORAGE_KEYS.ANALYZED_NEWS_CACHE,
    scrollKey: "", // 비워둠 (동작 안 함)
  });

  // 상단 타이틀 배너 및 서브헤더 영역 정의
  const banner = (
    <>
      <div className="relative overflow-hidden mb-6 px-7 py-9 rounded-[24px] bg-gradient-to-br from-[#0C1F3F] via-[#143268] to-[#0C1F3F] shadow-[0_8px_40px_rgba(12,31,63,0.28)]">
        {/* Decorative orbs */}
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full pointer-events-none bg-[radial-gradient(circle,rgba(56,189,248,0.09)_0%,transparent_70%)] translate-x-1/4 -translate-y-1/4" />
        <div className="absolute bottom-0 left-0 w-52 h-52 rounded-full pointer-events-none bg-[radial-gradient(circle,rgba(16,185,129,0.08)_0%,transparent_70%)] -translate-x-1/4 translate-y-1/4" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 mb-4 bg-[rgba(56,189,248,0.12)] border border-[rgba(56,189,248,0.25)]">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse bg-[#38BDF8]" />
              <span className="font-black text-[10px] uppercase tracking-widest text-[#38BDF8]">
                AI ANALYZED
              </span>
            </div>
            <h1 className="font-black text-white mb-2 font-serif text-[clamp(22px,4vw,34px)] leading-[1.2] tracking-[-0.02em]">
              {keyword ? `"${keyword}" 분석 결과` : "AI 분석 뉴스"}
            </h1>
            <p className="text-sm leading-relaxed text-white/40">
              AI 분석이 완료된 뉴스 — 신뢰도, 요약, 핵심 인물 정보를 확인하세요
            </p>
          </div>
          {totalItems > 0 && (
            <div className="flex items-center gap-3 px-5 py-3 shrink-0 bg-white/5 border border-white/10 rounded-[16px]">
              <span className="text-3xl font-black text-white">{totalItems}</span>
              <span className="text-sm leading-tight text-white/40">
                개
                <br />
                분석 완료
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Sub-header */}
      <div
        className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4 pb-4"
        style={{ borderBottom: "2px solid #161311" }}
      >
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-0.5" style={{ color: "#1A55A8" }}>
            {keyword ? "검색 결과" : "ANALYZED NEWS"}
          </p>
          <p className="text-sm font-medium" style={{ color: "#9C9891" }}>
            {keyword ? "현재 로드된 분석 뉴스 내 검색 결과입니다" : "AI가 심층 분석한 뉴스 목록입니다"}
          </p>
        </div>
        <NewsSearchBar
          variant="analyzed"
          placeholder="분석 뉴스 검색..."
          className="w-full lg:w-[min(100%,360px)]"
        />
      </div>
    </>
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
      isAnalyzedPage={true}
      activeBgColor="#0C1F3F"
      banner={banner}
      btnBg="#0C1F3F"
      btnHoverBg="#143268"
      btnBoxShadow="0 2px 12px rgba(12,31,63,0.3)"
      containerStyle={{ fontFamily: "'Noto Sans KR', sans-serif" }}
      error={error}
      handleRetry={handleRetry}
    />
  );
}
