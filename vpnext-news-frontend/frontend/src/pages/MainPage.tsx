import { useNewsList } from "../hooks/useNewsList";
import { STORAGE_KEYS } from "../utils/storage";
import NewsPageTemplate from "../components/news/NewsPageTemplate";
import NewsPageHeader from "../components/news/NewsPageHeader";

export default function MainPage() {
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
    isAnalyzed: false,
    cacheKey: STORAGE_KEYS.MAIN_NEWS_CACHE,
    scrollKey: "",
  });

  const banner = (
    <NewsPageHeader
      variant="main"
      totalItems={totalItems}
      title={keyword ? `"${keyword}" 검색 결과` : "헤드라인 뉴스"}
      subtitle={
        keyword
          ? "현재 페이지에 로드된 기사 중 검색 결과입니다"
          : "주요 언론사 헤드라인을 한눈에 — 기사를 선택하면 AI 분석을 시작할 수 있습니다"
      }
      searchPlaceholder="뉴스 제목·키워드 검색"
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
      variant="main"
      banner={banner}
      btnBg="#C13026"
      error={error}
      handleRetry={handleRetry}
    />
  );
}
