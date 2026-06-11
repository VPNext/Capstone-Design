import { memo, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { prefetchQuery } from "../../hooks/useCustomQuery";
import { fetchNewsDetail } from "../../services/newsService";
import HighlightText from "../HighlightText";
import CredibilityBadge from "../CredibilityBadge";
import ArticleEngagementBar from "./ArticleEngagementBar";
import {
  formatNewsRelativeTime,
  getNewsDisplayImage,
  getNewsSourceMeta,
  getNewsTitle,
  SIDE_THUMB_COUNT,
} from "../../utils/newsDisplay";
import type { NewsItem } from "../../types/news";

export type NewsPortalVariant = "main" | "analyzed";

interface NewsHeroSliderProps {
  items: NewsItem[];
  activeIndex: number;
  keyword: string;
  variant: NewsPortalVariant;
  loadingMore?: boolean;
  onSelect: (index: number) => void;
  onPause: () => void;
  onResume: () => void;
  onPrev: () => void;
  onNext: () => void;
}

const ACCENT: Record<NewsPortalVariant, string> = {
  main: "#C13026",
  analyzed: "#1A55A8",
};

function prefetchDetail(id: number) {
  prefetchQuery(["newsDetail", String(id)], () => fetchNewsDetail(id), 1000 * 60 * 10);
}

interface NewsHeroThumbItemProps {
  item: NewsItem;
  index: number;
  keyword: string;
  onSelect: (index: number) => void;
  onPrefetch: (id: number) => void;
}

const NewsHeroThumbItem = memo(function NewsHeroThumbItem({
  item,
  index,
  keyword,
  onSelect,
  onPrefetch,
}: NewsHeroThumbItemProps) {
  const thumb = getNewsDisplayImage(item);
  const { displaySourceName: thumbSource } = getNewsSourceMeta(item);

  return (
    <li className="flex-1 min-w-[140px]">
      <button
        type="button"
        onClick={() => onSelect(index)}
        onMouseEnter={() => onPrefetch(item.id)}
        className="w-full h-[100px] flex flex-col justify-between p-2.5 text-left transition-colors hover:bg-[#FAFAFA] focus-visible:outline-none focus-visible:bg-[#FAFAFA]"
      >
        <div className="flex gap-2.5 items-start">
          <div className="relative w-[56px] h-[40px] shrink-0 rounded overflow-hidden flex items-center justify-center bg-[#EEE]">
            {thumb ? (
              <img
                src={thumb}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  img.style.display = "none";
                  const fallback = img.nextElementSibling as HTMLDivElement;
                  if (fallback) fallback.style.display = "flex";
                }}
              />
            ) : null}
            <div
              className="absolute inset-0 flex items-center justify-center bg-gradient-to-tr from-[#F3EFF5] to-[#E5E9F0] select-none"
              style={{ display: thumb ? "none" : "flex" }}
            >
              <span className="text-[11px] font-black text-[#5C4D66] font-serif leading-none">
                {thumbSource ? thumbSource.charAt(0) : "N"}
              </span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-extrabold leading-[1.35] line-clamp-2 text-[#1c1815] tracking-tight">
              <HighlightText text={getNewsTitle(item)} keyword={keyword} />
            </p>
          </div>
        </div>
        <p className="text-[10px] font-extrabold text-[#605a54] truncate w-full tracking-tight">{thumbSource}</p>
      </button>
    </li>
  );
});

function NewsHeroSlider({
  items,
  activeIndex,
  keyword,
  variant,
  loadingMore = false,
  onSelect,
  onPause,
  onResume,
  onPrev,
  onNext,
}: NewsHeroSliderProps) {
  const active = items[activeIndex];
  const accent = ACCENT[variant];

  const sideThumbs = useMemo(() => {
    if (items.length <= 1) return [];

    const thumbs: { item: NewsItem; index: number }[] = [];
    const count = Math.min(SIDE_THUMB_COUNT, items.length - 1);

    for (let offset = 1; offset <= count; offset++) {
      const index = (activeIndex + offset) % items.length;
      thumbs.push({ item: items[index], index });
    }

    return thumbs;
  }, [items, activeIndex]);

  const handlePrefetch = useCallback((id: number) => {
    prefetchDetail(id);
  }, []);

  if (!active) return null;

  const { displaySourceName, displayBadgeClass } = getNewsSourceMeta(active);
  const heroImage = getNewsDisplayImage(active);
  const title = getNewsTitle(active);

  return (
    <section
      className="bg-white border border-[#E5E5E5] rounded-lg overflow-hidden shadow-sm flex flex-col"
      onMouseEnter={onPause}
      onMouseLeave={onResume}
      onFocus={onPause}
      onBlur={onResume}
      aria-label="헤드라인 슬라이드"
    >
      {/* 위: 메인 뉴스 영역 */}
      <div className="relative h-[360px] w-full bg-[#1a1a1a] group overflow-hidden">
        <Link
          to={`/news/${active.id}`}
          className="block w-full h-full"
          onMouseEnter={() => handlePrefetch(active.id)}
        >
          {heroImage ? (
            <img
              src={heroImage}
              alt=""
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
              loading="eager"
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                img.style.display = "none";
                const fallback = img.nextElementSibling as HTMLDivElement;
                if (fallback) fallback.style.display = "flex";
              }}
            />
          ) : null}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-tr from-[#251A30] to-[#14223A] select-none"
            style={{ display: heroImage ? "none" : "flex" }}
          >
            <span className="text-[44px] font-black text-white/15 font-serif leading-none tracking-wider mb-2">
              {displaySourceName}
            </span>
            <span className="text-[11px] font-bold text-white/20 uppercase tracking-[0.25em]">
              HEADLINE NEWS FALLBACK
            </span>
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-transparent pointer-events-none" />

          <div className="absolute top-4 left-4 flex items-center gap-2 flex-wrap max-w-[calc(100%-2rem)]">
            <span className={`${displayBadgeClass} text-[10px] font-bold px-2 py-0.5 rounded`}>
              {displaySourceName}
            </span>
            {variant === "analyzed" && (
              <CredibilityBadge
                label={active.credibility_label}
                score={active.credibility_score}
              />
            )}
            {variant === "analyzed" && active.tags && active.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 items-center">
                {active.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 text-[9.5px] font-bold rounded-md bg-black/40 text-white/95 backdrop-blur-[2px] border border-white/10 transition-all duration-200 hover:bg-black/60 hover:scale-105 cursor-default select-none shadow-sm"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-7">
            <div className="flex flex-wrap items-center gap-3 mb-2.5">
              <p className="text-[12px] font-black text-white">
                {formatNewsRelativeTime(active.published_at)}
              </p>
              <ArticleEngagementBar
                articleId={active.id}
                overlay
                compact
                analyzedTheme={variant === "analyzed"}
                articleMeta={{
                  id: active.id,
                  title: active.title,
                  source: active.source,
                  image_url: active.image_url,
                  published_at: active.published_at,
                }}
              />
            </div>
            <h2 className="text-xl sm:text-2xl md:text-[26px] font-black text-white leading-[1.3] tracking-[-0.015em] line-clamp-2 group-hover:underline decoration-[3px] underline-offset-6">
              <HighlightText text={title} keyword={keyword} />
            </h2>
          </div>
        </Link>

        {items.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onPrev();
              }}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/45 text-white hover:bg-black/65 transition-colors hidden sm:flex items-center justify-center z-10"
              aria-label="이전 헤드라인"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onNext();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/45 text-white hover:bg-black/65 transition-colors hidden sm:flex items-center justify-center z-10"
              aria-label="다음 헤드라인"
            >
              ›
            </button>
          </>
        )}
      </div>

      {/* 아래: 가로형 썸네일 리스트 영역 */}
      {sideThumbs.length > 0 && (
        <ul className="flex flex-row divide-x divide-[#E5E5E5] border-t border-[#E5E5E5] bg-[#FAF9F6] w-full overflow-x-auto select-none">
          {sideThumbs.map(({ item, index }) => (
            <NewsHeroThumbItem
              key={item.id}
              item={item}
              index={index}
              keyword={keyword}
              onSelect={onSelect}
              onPrefetch={handlePrefetch}
            />
          ))}
        </ul>
      )}

      {items.length > 1 && (
        <div className="flex items-center justify-center gap-3 py-2.5 border-t border-[#EFEFEF] text-[11px] font-medium text-[#888]">
          <span style={{ color: accent }}>
            {activeIndex + 1} / {items.length}
          </span>
          {loadingMore && (
            <span className="flex items-center gap-1.5 text-[#AAA]">
              <span className="w-3 h-3 border-2 border-[#DDD] border-t-[#888] rounded-full animate-spin" />
              더 불러오는 중
            </span>
          )}
        </div>
      )}
    </section>
  );
}

export default memo(NewsHeroSlider);
