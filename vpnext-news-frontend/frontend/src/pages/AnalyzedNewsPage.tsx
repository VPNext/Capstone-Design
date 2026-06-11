import { useNewsList } from "../hooks/useNewsList";
import NewsPageTemplate from "../components/news/NewsPageTemplate";
import NewsPageHeader from "../components/news/NewsPageHeader";

export default function AnalyzedNewsPage() {
  const {
    newsList,
    totalItems,
    loading,
    loadingMore,
    hasMore,
    keyword,
    loadMore,
    error,
    handleRetry,
  } = useNewsList({ isAnalyzed: true });

  const banner = (
    <NewsPageHeader
      variant="analyzed"
      totalItems={totalItems}
      loadedCount={newsList.length}
      title={keyword ? `"${keyword}" AI 분석 검색` : "AI 분석 뉴스"}
      subtitle={
        keyword
          ? "분석 완료 기사 검색 결과 — 슬라이드로 탐색하세요"
          : "분석이 완료된 뉴스를 확인하세요"
      }
      searchPlaceholder="분석 뉴스 검색"
    />
  );

  return (
    <NewsPageTemplate
      newsList={newsList}
      loading={loading}
      loadingMore={loadingMore}
      hasMore={hasMore}
      keyword={keyword}
      onLoadMore={loadMore}
      variant="analyzed"
      banner={banner}
      btnBg="#1A55A8"
      error={error}
      handleRetry={handleRetry}
    />
  );
}
