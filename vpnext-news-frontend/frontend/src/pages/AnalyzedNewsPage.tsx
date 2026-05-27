import { useNewsList } from "../hooks/useNewsList";
import { STORAGE_KEYS } from "../utils/storage";
import NewsPageTemplate from "../components/news/NewsPageTemplate";

// AI 분석이 완료된(신뢰도 리포트가 존재하는) 기사들을 모아보는 분석 뉴스 페이지
export default function AnalyzedNewsPage() {
  const {
    newsList,
    selectedSource,
    loading,
    isLoadingMore,
    showLoadMoreBtn,
    keyword,
    lastElementRef,
    handleLoadMoreClick,
    handleSourceChange,
  } = useNewsList({
    isAnalyzed: true,
    cacheKey: STORAGE_KEYS.ANALYZED_NEWS_CACHE,
    scrollKey: STORAGE_KEYS.ANALYZED_NEWS_SCROLL,
  });

  // 상단 타이틀 배너 및 서브헤더 영역 정의
  const banner = (
    <>
      <div
        className="relative overflow-hidden mb-6 px-7 py-9"
        style={{
          borderRadius: "24px",
          background: "linear-gradient(135deg, #0C1F3F 0%, #143268 55%, #0C1F3F 100%)",
          boxShadow: "0 8px 40px rgba(12,31,63,0.28)",
        }}
      >
        {/* Decorative orbs */}
        <div
          className="absolute top-0 right-0 w-80 h-80 rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(56,189,248,0.09) 0%, transparent 70%)",
            transform: "translate(25%, -25%)",
          }}
        />
        <div
          className="absolute bottom-0 left-0 w-52 h-52 rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)",
            transform: "translate(-25%, 25%)",
          }}
        />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div
              className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 mb-4"
              style={{
                background: "rgba(56,189,248,0.12)",
                border: "1px solid rgba(56,189,248,0.25)",
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: "#38BDF8" }}
              />
              <span
                className="font-black text-[10px] uppercase tracking-widest"
                style={{ color: "#38BDF8" }}
              >
                AI ANALYZED
              </span>
            </div>
            <h1
              className="font-black text-white mb-2"
              style={{
                fontFamily: "'Noto Serif KR', serif",
                fontSize: "clamp(22px, 4vw, 34px)",
                lineHeight: 1.2,
                letterSpacing: "-0.02em",
              }}
            >
              {keyword ? `"${keyword}" 분석 결과` : "AI 분석 뉴스"}
            </h1>
            <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.42)" }}>
              AI 분석이 완료된 뉴스 — 신뢰도, 요약, 핵심 인물 정보를 확인하세요
            </p>
          </div>
          {newsList.length > 0 && (
            <div
              className="flex items-center gap-3 px-5 py-3 shrink-0"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "16px",
              }}
            >
              <span className="text-3xl font-black text-white">{newsList.length}</span>
              <span className="text-sm leading-tight" style={{ color: "rgba(255,255,255,0.4)" }}>
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
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4"
        style={{ borderBottom: "2px solid #161311" }}
      >
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-0.5" style={{ color: "#1A55A8" }}>
            {keyword ? "검색 결과" : "ANALYZED NEWS"}
          </p>
          <p className="text-sm font-medium" style={{ color: "#9C9891" }}>
            {keyword ? "현재 로드된 분석 뉴스 내 검색 결과입니다" : "AI가 심층 분석한 뉴스 목록입니다"}
          </p>
        </div>
      </div>
    </>
  );

  return (
    <NewsPageTemplate
      newsList={newsList}
      selectedSource={selectedSource}
      loading={loading}
      isLoadingMore={isLoadingMore}
      showLoadMoreBtn={showLoadMoreBtn}
      keyword={keyword}
      lastElementRef={lastElementRef}
      handleLoadMoreClick={handleLoadMoreClick}
      handleSourceChange={handleSourceChange}
      isAnalyzedPage={true}
      activeBgColor="#0C1F3F"
      banner={banner}
      loadMoreBtnBg="#0C1F3F"
      loadMoreBtnHoverBg="#143268"
      loadMoreBtnBoxShadow="0 2px 12px rgba(12,31,63,0.3)"
      containerStyle={{ fontFamily: "'Noto Sans KR', sans-serif" }}
    />
  );
}
