import { memo, useMemo } from "react";
import { useNewsSlider } from "../../hooks/useNewsSlider";
import { HERO_SLIDE_COUNT } from "../../utils/newsDisplay";
import NewsHeroSlider from "./NewsHeroSlider";
import NewsHeadlineItem from "./NewsHeadlineItem";
import type { NewsPortalVariant } from "./NewsHeroSlider";
import type { NewsItem } from "../../types/news";

interface NewsPortalFeedProps {
  newsList: NewsItem[];
  keyword: string;
  variant: NewsPortalVariant;
}

function NewsPortalFeed({ newsList, keyword, variant }: NewsPortalFeedProps) {
  const heroItems = useMemo(
    () => newsList.slice(0, Math.min(HERO_SLIDE_COUNT, newsList.length)),
    [newsList],
  );

  const listItems = useMemo(
    () => newsList.slice(heroItems.length),
    [newsList, heroItems.length],
  );

  const { index, goTo, next, prev, pause, resume } = useNewsSlider(heroItems.length);

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
    <div className="flex flex-col gap-5">
      {heroItems.length > 0 && (
        <NewsHeroSlider
          items={heroItems}
          activeIndex={index}
          keyword={keyword}
          variant={variant}
          onSelect={goTo}
          onPause={pause}
          onResume={resume}
          onPrev={prev}
          onNext={next}
        />
      )}

      {listItems.length > 0 && (
        <section className="bg-white border border-[#E5E5E5] rounded-lg overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#EFEFEF] bg-[#FAFAFA]">
            <h2 className="text-sm font-black text-[#111] tracking-tight">이어지는 뉴스</h2>
            <span className="text-[11px] font-medium text-[#999]">{listItems.length}건</span>
          </div>
          <div className="px-3 sm:px-4">
            {listItems.map((news, idx) => (
              <NewsHeadlineItem
                key={news.id}
                news={news}
                rank={heroItems.length + idx + 1}
                keyword={keyword}
                variant={variant}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default memo(NewsPortalFeed);
