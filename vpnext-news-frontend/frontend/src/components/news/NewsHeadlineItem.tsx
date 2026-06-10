import { memo } from "react";
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
} from "../../utils/newsDisplay";
import type { NewsPortalVariant } from "./NewsHeroSlider";
import type { NewsItem } from "../../types/news";

interface NewsHeadlineItemProps {
  news: NewsItem;
  rank: number;
  keyword: string;
  variant: NewsPortalVariant;
}

const ACCENT: Record<NewsPortalVariant, string> = {
  main: "#C13026",
  analyzed: "#1A55A8",
};

function NewsHeadlineItem({ news, rank, keyword, variant }: NewsHeadlineItemProps) {
  const { displaySourceName } = getNewsSourceMeta(news);
  const thumb = getNewsDisplayImage(news);
  const title = getNewsTitle(news);
  const accent = ACCENT[variant];

  const handlePrefetch = () => {
    prefetchQuery(["newsDetail", String(news.id)], () => fetchNewsDetail(news.id), 1000 * 60 * 10);
  };

  return (
    <article className="group border-b border-[#EFEFEF] last:border-b-0">
      <Link
        to={`/news/${news.id}`}
        className="flex items-start gap-3 sm:gap-4 py-3.5 px-1 hover:bg-[#FAFAFA] transition-colors"
        onMouseEnter={handlePrefetch}
        onTouchStart={handlePrefetch}
      >
        <span
          className="w-6 shrink-0 text-center text-sm font-black tabular-nums pt-0.5"
          style={{ color: rank <= 3 ? accent : "#BBB" }}
        >
          {rank}
        </span>

        <div className="flex-1 min-w-0">
          <h3
            className="text-[15px] sm:text-base font-bold text-[#111] leading-snug line-clamp-2 group-hover:underline underline-offset-2"
            style={{ textDecorationColor: accent }}
          >
            <HighlightText text={title} keyword={keyword} />
          </h3>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
            <span className="text-xs font-semibold text-[#888]">{displaySourceName}</span>
            <span className="text-[#DDD]">·</span>
            <span className="text-xs text-[#AAA]">{formatNewsRelativeTime(news.published_at)}</span>
            {variant === "analyzed" && (
              <>
                <CredibilityBadge label={news.credibility_label} score={news.credibility_score} />
                <ArticleEngagementBar
                  articleId={news.id}
                  compact
                  analyzedTheme
                  articleMeta={{
                    id: news.id,
                    title: news.title,
                    source: news.source,
                    image_url: news.image_url,
                    published_at: news.published_at,
                  }}
                />
              </>
            )}
          </div>
        </div>

        <div className="w-[88px] h-[60px] sm:w-[100px] sm:h-[68px] shrink-0 rounded overflow-hidden bg-[#EEE]">
          {thumb ? (
            <img
              src={thumb}
              alt=""
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#E8E8E8] to-[#D0D0D0]" />
          )}
        </div>
      </Link>
    </article>
  );
}

export default memo(NewsHeadlineItem);
