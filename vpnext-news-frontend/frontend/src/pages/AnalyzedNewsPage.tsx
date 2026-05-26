import { useAnalyzedNews } from "../hooks/useAnalyzedNews";
import { extractTextFromSummary } from "../utils/summary";
import SourceFilterBar from "../components/news/SourceFilterBar";
import FeaturedNewsCard from "../components/news/FeaturedNewsCard";
import NewsCard from "../components/news/NewsCard";
import SkeletonCard from "../components/SkeletonCard";

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
  } = useAnalyzedNews();

  // 검색어가 설정된 경우, 현재 불러온 리스트 중에서 검색어가 포함된 기사들만 필터링
  const filteredNews = keyword
    ? newsList.filter((news) => {
        const titleMatch = news.title.includes(keyword);
        const plainSummary = extractTextFromSummary(news.summary);
        const summaryMatch = (news.ai_summary || plainSummary).includes(keyword);
        return titleMatch || summaryMatch;
      })
    : newsList;

  return (
    <div
      className="flex flex-col mt-8"
      style={{ fontFamily: "'Noto Sans KR', sans-serif" }}
    >
      {/* 배너 헤더 */}
      <div className="mb-8">
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
            {filteredNews.length > 0 && (
              <div
                className="flex items-center gap-3 px-5 py-3 shrink-0"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "16px",
                }}
              >
                <span className="text-3xl font-black text-white">{filteredNews.length}</span>
                <span className="text-sm leading-tight" style={{ color: "rgba(255,255,255,0.4)" }}>
                  개
                  <br />
                  분석 완료
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Sub-header + filters */}
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

        <SourceFilterBar
          selectedSource={selectedSource}
          onChange={handleSourceChange}
          activeBgColor="#0C1F3F"
        />
      </div>

      {/* 초기 로딩 스켈레톤 */}
      {loading && (
        <div className="flex flex-col gap-4">
          <SkeletonCard featured />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {/* 뉴스 리스트 */}
      {!loading && (
        <div className="flex flex-col gap-4">
          {filteredNews.map((news, index) => {
            const isLast = filteredNews.length === index + 1;

            if (index === 0) {
              return (
                <FeaturedNewsCard
                  key={news.id}
                  news={news}
                  keyword={keyword}
                  isAnalyzedPage={true}
                />
              );
            }

            return (
              <NewsCard
                key={news.id}
                news={news}
                keyword={keyword}
                isAnalyzedPage={true}
                innerRef={isLast ? lastElementRef : undefined}
              />
            );
          })}

          {/* 빈 결과 상태 */}
          {filteredNews.length === 0 && (
            <div
              className="py-24 text-center border border-dashed rounded-[20px]"
              style={{
                borderColor: "#E4DDD3",
                color: "#9C9891",
              }}
            >
              <p className="text-5xl mb-4">🔍</p>
              <p className="text-base font-bold">검색 결과가 없습니다.</p>
              <p className="text-xs mt-1">다른 키워드나 언론사를 선택해 보세요.</p>
            </div>
          )}

          {/* 추가 로딩 스켈레톤 */}
          {isLoadingMore && (
            <div className="flex flex-col gap-4 mt-2">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          )}

          {/* 더보기 버튼 */}
          {showLoadMoreBtn && (
            <div className="flex justify-center mt-6">
              <button
                onClick={handleLoadMoreClick}
                className="px-8 py-3 rounded-full text-sm font-bold text-white transition-all duration-200"
                style={{
                  background: "#0C1F3F",
                  boxShadow: "0 2px 12px rgba(12,31,63,0.3)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "#143268";
                  (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "#0C1F3F";
                  (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                }}
              >
                뉴스 더 불러오기
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
