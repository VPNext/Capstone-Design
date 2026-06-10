import { useNewsList } from "../hooks/useNewsList";
import { STORAGE_KEYS } from "../utils/storage";
import NewsPageTemplate from "../components/news/NewsPageTemplate";
import NewsPageHeader from "../components/news/NewsPageHeader";

export default function AnalyzedNewsPage() {
  const {
    newsList,
    page,
    totalPages,
    totalItems,
    loading,
    keyword,
    handlePageChange,
    error,
    handleRetry,
  } = useNewsList({
    isAnalyzed: true,
    cacheKey: STORAGE_KEYS.ANALYZED_NEWS_CACHE,
    scrollKey: "",
  });

  const banner = (
    <NewsPageHeader
      variant="analyzed"
      totalItems={totalItems}
      title={keyword ? `"${keyword}" AI 분석 검색` : "AI 분석 헤드라인"}
      subtitle={
        keyword
          ? "분석 완료 기사 중 검색 결과입니다"
          : "신뢰도·요약·핵심 인물이 분석된 뉴스를 슬라이드와 리스트로 확인하세요"
      }
      searchPlaceholder="분석 뉴스 검색"
    />
  );

  return (
    <NewsPageTemplate
      newsList={newsList}
      loading={loading}
      page={page}
      totalPages={totalPages}
      keyword={keyword}
      onChangePage={handlePageChange}
      variant="analyzed"
      banner={banner}
      btnBg="#1A55A8"
      error={error}
      handleRetry={handleRetry}
    />
  );
}
