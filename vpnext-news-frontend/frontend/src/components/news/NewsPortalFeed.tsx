import { memo, useCallback, useEffect } from "react";
import { useNewsSlider } from "../../hooks/useNewsSlider";
import { SLIDE_LOAD_AHEAD_THRESHOLD } from "../../utils/newsDisplay";
import NewsHeroSlider from "./NewsHeroSlider";
import type { NewsPortalVariant } from "./NewsHeroSlider";
import type { NewsItem } from "../../types/news";

interface NewsPortalFeedProps {
  newsList: NewsItem[];
  keyword: string;
  variant: NewsPortalVariant;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
}

const AUTO_SLIDE_MS = 4500;
const MIN_ITEMS_BEFORE_PREFETCH = 15;

function NewsPortalFeed({
  newsList,
  keyword,
  variant,
  hasMore,
  loadingMore,
  onLoadMore,
}: NewsPortalFeedProps) {
  const handleSlideTick = useCallback(
    (index: number, count: number) => {
      if (!hasMore || loadingMore || count === 0) return;
      if (index >= count - SLIDE_LOAD_AHEAD_THRESHOLD) {
        onLoadMore();
      }
    },
    [hasMore, loadingMore, onLoadMore],
  );

  const { index, goTo, next, prev, pause, resume } = useNewsSlider(
    newsList.length,
    AUTO_SLIDE_MS,
    handleSlideTick,
  );

  useEffect(() => {
    if (!hasMore || loadingMore) return;
    if (newsList.length > 0 && newsList.length < MIN_ITEMS_BEFORE_PREFETCH) {
      onLoadMore();
    }
  }, [hasMore, loadingMore, newsList.length, onLoadMore]);

  if (newsList.length === 0) {
    return (
      <div className="py-20 text-center border border-[#E5E5E5] rounded-lg bg-white text-[#888]">
        <p className="text-4xl mb-3">📰</p>
        <p className="text-base font-bold text-[#333]">표시할 뉴스가 없습니다</p>
        <p className="text-sm mt-1">다른 검색어로 다시 시도해 보세요</p>
      </div>
    );
  }

  return (
    <NewsHeroSlider
      items={newsList}
      activeIndex={index}
      keyword={keyword}
      variant={variant}
      loadingMore={loadingMore}
      onSelect={goTo}
      onPause={pause}
      onResume={resume}
      onPrev={prev}
      onNext={next}
    />
  );
}

export default memo(NewsPortalFeed);
