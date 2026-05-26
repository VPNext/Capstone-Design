import { useMainNews } from "../hooks/useMainNews";
import { extractTextFromSummary } from "../utils/summary";
import SourceFilterBar from "../components/news/SourceFilterBar";
import FeaturedNewsCard from "../components/news/FeaturedNewsCard";
import NewsCard from "../components/news/NewsCard";
import SkeletonCard from "../components/SkeletonCard";

// 오늘의 뉴스 목록을 보여주는 메인 화면 페이지
export default function MainPage() {
  const {
    newsList,
    selectedSource,
    loading,
    isLoadingMore,
    keyword,
    lastElementRef,
    handleSourceChange,
  } = useMainNews();

  // 검색 키워드가 있는 경우, 기사 제목 또는 요약문에서 해당 검색어가 포함된 기사만 필터링
  const filteredNews = keyword
    ? newsList.filter((news) => {
        const titleMatch = news.title.includes(keyword);
        const plainSummary = extractTextFromSummary(news.summary);
        const summaryMatch = (news.ai_summary || plainSummary).includes(keyword);
        return titleMatch || summaryMatch;
      })
    : newsList;

  return (
    <div className="flex flex-col mt-8 font-sans">
      {/* 상단 타이틀 영역 */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 pb-5 border-b-2 border-[#161311]">
          <div>
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

          {/* 오른쪽 오늘 날짜 및 기사 수 표시 */}
          <div className="hidden md:flex flex-col items-end gap-1 shrink-0">
            <p className="text-xs font-medium text-[#9C9891]">
              {new Date().toLocaleDateString("ko-KR", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
            {filteredNews.length > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#161311] text-white">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 3a1 1 0 000 2h11a1 1 0 100-2H2zm0 4a1 1 0 000 2h7a1 1 0 100-2H2zm0 4a1 1 0 000 2h4a1 1 0 100-2H2z" />
                </svg>
                {filteredNews.length}개 기사
              </div>
            )}
          </div>
        </div>

        {/* 언론사 선택 필터 칩 영역 */}
        <SourceFilterBar
          selectedSource={selectedSource}
          onChange={handleSourceChange}
          activeBgColor="#161311"
        />
      </div>

      {/* 첫 로딩 시 스켈레톤 UI 표시 */}
      {loading && (
        <div className="flex flex-col gap-4">
          <SkeletonCard featured />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {/* 뉴스 카드 목록 렌더링 */}
      {!loading && (
        <div className="flex flex-col gap-4">
          {filteredNews.map((news, index) => {
            const isLast = filteredNews.length === index + 1;

            // 목록의 첫 번째 뉴스만 Featured 카드(대형 카드)로 크게 렌더링
            if (index === 0) {
              return (
                <FeaturedNewsCard
                  key={news.id}
                  news={news}
                  keyword={keyword}
                  isAnalyzedPage={false}
                />
              );
            }

            // 두 번째부터는 일반 카드 형태로 렌더링하고, 마지막 카드에만 무한 스크롤 관측용 ref(innerRef) 주입
            return (
              <NewsCard
                key={news.id}
                news={news}
                keyword={keyword}
                isAnalyzedPage={false}
                innerRef={isLast ? lastElementRef : undefined}
              />
            );
          })}

          {/* 검색이나 필터 결과가 없을 때의 예외 화면 */}
          {filteredNews.length === 0 && (
            <div className="py-24 text-center border border-dashed rounded-[20px] border-[#E4DDD3] text-[#9C9891]">
              <p className="text-5xl mb-4">🔍</p>
              <p className="text-base font-bold">검색 결과가 없습니다.</p>
              <p className="text-xs mt-1">다른 키워드나 언론사를 선택해 보세요.</p>
            </div>
          )}

          {/* 무한 스크롤 추가 페이징 시 아래쪽에 스켈레톤 추가 표시 */}
          {isLoadingMore && (
            <div className="flex flex-col gap-4 mt-2">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
