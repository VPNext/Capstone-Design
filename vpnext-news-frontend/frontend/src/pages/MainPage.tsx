import { useNewsList } from "../hooks/useNewsList";
import NewsPageTemplate from "../components/news/NewsPageTemplate";
import NewsPageHeader from "../components/news/NewsPageHeader";

export default function MainPage() {
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
  } = useNewsList({ isAnalyzed: false });

  const banner = (
    <NewsPageHeader
      variant="main"
      totalItems={totalItems}
      loadedCount={newsList.length}
      title={keyword ? `"${keyword}" 검색 결과` : "헤드라인 뉴스"}
      subtitle={
        keyword
          ? "검색 결과를 슬라이드로 넘기며 확인하세요"
          : "다양한 언론사 뉴스를 분석을 통해 확인하세요"
      }
      searchPlaceholder="뉴스 검색"
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
      variant="main"
      banner={banner}
      btnBg="#C13026"
      error={error}
      handleRetry={handleRetry}
    />
  );
}
