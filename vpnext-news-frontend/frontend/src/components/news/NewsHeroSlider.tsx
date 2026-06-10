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
      className="bg-white border border-[#E5E5E5] rounded-lg overflow-hidden shadow-sm"
      onMouseEnter={onPause}
      onMouseLeave={onResume}
      onFocus={onPause}
      onBlur={onResume}
      aria-label="헤드라인 슬라이드"
    >
      <div className="flex flex-col md:flex-row md:h-[400px]">
        <Link
          to={`/news/${active.id}`}
          className="relative flex-1 min-h-[260px] md:min-h-0 group overflow-hidden bg-[#1a1a1a]"
          onMouseEnter={() => handlePrefetch(active.id)}
        >
          {heroImage ? (
            <img
              src={heroImage}
              alt=""
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
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
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

          <div className="absolute top-3 left-3 flex items-center gap-2">
            <span className={`${displayBadgeClass} text-[10px] font-bold px-2 py-0.5 rounded`}>
              {displaySourceName}
            </span>
            {variant === "analyzed" && (
              <CredibilityBadge
                label={active.credibility_label}
                score={active.credibility_score}
              />
            )}
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <p className="text-[11px] font-medium text-white/80">
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
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white leading-snug line-clamp-2 group-hover:underline decoration-2 underline-offset-4">
              <HighlightText text={title} keyword={keyword} />
            </h2>
          </div>

          {items.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  onPrev();
                }}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/45 text-white hover:bg-black/65 transition-colors hidden sm:flex items-center justify-center"
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
                className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/45 text-white hover:bg-black/65 transition-colors hidden sm:flex items-center justify-center"
                aria-label="다음 헤드라인"
              >
                ›
              </button>
            </>
          )}
        </Link>

        {sideThumbs.length > 0 && (
          <ul className="md:w-[350px] lg:w-[380px] shrink-0 border-t md:border-t-0 md:border-l border-[#E5E5E5] divide-y divide-[#EFEFEF]">
            {sideThumbs.map(({ item, index }) => {
              const thumb = getNewsDisplayImage(item);
              const { displaySourceName: thumbSource } = getNewsSourceMeta(item);

              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(index)}
                    onMouseEnter={() => handlePrefetch(item.id)}
                    className="w-full flex items-center gap-3.5 px-4 py-3 text-left transition-colors hover:bg-[#FAFAFA]"
                  >
                    <div className="relative w-[92px] h-[64px] shrink-0 rounded overflow-hidden flex items-center justify-center bg-[#EEE]">
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
                        <span className="text-[14px] font-black text-[#5C4D66] font-serif leading-none">
                          {thumbSource ? thumbSource.charAt(0) : "N"}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-black leading-snug line-clamp-2 text-[#222]">
                        <HighlightText text={getNewsTitle(item)} keyword={keyword} />
                      </p>
                      <p className="text-[11px] font-bold text-[#888] mt-1 truncate">{thumbSource}</p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

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
