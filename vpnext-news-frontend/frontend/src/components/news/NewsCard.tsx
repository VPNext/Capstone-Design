import { memo, useCallback } from "react";
import { Link } from "react-router-dom";
import { SOURCE_NAME_MAP, SOURCE_BADGE_CLASS } from "../../constants/source";
import {
  extractImageFromSummary,
  extractTextFromSummary,
  decodeHtmlEntities,
  optimizeImageUrl,
} from "../../utils/summary";
import { getScoreColor } from "../../utils/score";
import { prefetchQuery } from "../../hooks/useCustomQuery";
import { fetchNewsDetail } from "../../services/newsService";
import HighlightText from "../HighlightText";
import CredibilityBadge from "../CredibilityBadge";
import ScoreMeter from "../ScoreMeter";
import ArticleEngagementBar from "./ArticleEngagementBar";
import type { NewsItem } from "../../types/news";

interface NewsCardProps {
  news: NewsItem;
  keyword: string | null;
  isAnalyzedPage?: boolean;
  innerRef?: (node: HTMLDivElement | null) => void;
}

const NewsCard = memo(function NewsCard({
  news,
  keyword,
  isAnalyzedPage = false,
  innerRef,
}: NewsCardProps) {
  const displayImage =
    optimizeImageUrl(news.image_url) || extractImageFromSummary(news.summary);
  const rawSummary =
    extractTextFromSummary(news.ai_summary || news.summary) ||
    `${decodeHtmlEntities(news.title)} 기사에 대한 보도 내용입니다. AI 분석 실행 후 핵심 요약, 단어 설명, 인물 관계도와 만화가 생성됩니다.`;
  const displaySummary =
    rawSummary.length > 180 ? rawSummary.slice(0, 180) + "…" : rawSummary;
  const sourceKey = news.source?.toLowerCase();
  const sourceName =
    SOURCE_NAME_MAP[sourceKey] || news.source?.toUpperCase() || "알 수 없음";
  const isNaverPlatform = news.url?.includes("naver.com");
  const displaySourceName = isNaverPlatform ? "네이버 뉴스" : sourceName;
  const displayBadgeClass = isNaverPlatform
    ? SOURCE_BADGE_CLASS["naver"] || "bg-[#03c75a] text-white"
    : SOURCE_BADGE_CLASS[sourceKey] || "badge-default";

  const scoreColor =
    isAnalyzedPage && news.credibility_score != null
      ? getScoreColor(news.credibility_score).hex
      : "transparent";

  const hoverBorderColor = isAnalyzedPage
    ? "hover:border-[rgba(26,85,168,0.3)]"
    : "hover:border-[rgba(193,48,38,0.3)]";

  // 상세 데이터 프리패칭
  const handlePrefetch = useCallback(() => {
    prefetchQuery(
      ["newsDetail", String(news.id)],
      () => fetchNewsDetail(news.id),
      1000 * 60 * 10,
    );
  }, [news.id]);

  const publishedDate = new Date(news.published_at).toLocaleDateString(
    "ko-KR",
    { month: "long", day: "numeric" },
  );

  return (
    <div
      ref={innerRef}
      className="group"
      onMouseEnter={handlePrefetch}
      onTouchStart={handlePrefetch}
    >
      <Link to={`/news/${news.id}`} className="block">
        <article
          className={`flex bg-white overflow-hidden border border-[#E4DDD3] rounded-[18px] shadow-[0_1px_8px_rgba(22,19,17,0.06)] transition-all duration-200 hover:shadow-[0_6px_24px_rgba(22,19,17,0.12)] hover:-translate-y-[2px] ${hoverBorderColor}`}
          style={{ willChange: "transform, box-shadow" }}
        >
          {/* 신뢰도 컬러 바 (분석페이지 전용) */}
          {isAnalyzedPage && news.credibility_score != null && (
            <div
              className="w-1 group-hover:w-[5px] shrink-0 self-stretch transition-all duration-200"
              style={{
                background: scoreColor,
                opacity: 0.85,
                borderRadius: "18px 0 0 18px",
              }}
            />
          )}

          {/* Left content */}
          <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between min-w-0">
            <div className="flex flex-col gap-2">
              <div className="flex items-center flex-wrap gap-2">
                <span
                  className={`${displayBadgeClass} text-[10px] font-black px-2.5 py-1 rounded-full shrink-0`}
                >
                  {displaySourceName}
                </span>
                <time
                  className="text-[10px] font-medium shrink-0 text-[#9C9891]"
                  dateTime={news.published_at}
                >
                  {publishedDate}
                </time>

                {/* 신뢰도 배지 (분석페이지 전용) */}
                {isAnalyzedPage && (
                  <CredibilityBadge
                    label={news.credibility_label}
                    score={news.credibility_score}
                  />
                )}
                {isAnalyzedPage && news.tags && news.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 items-center">
                    {news.tags.slice(0, 3).map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 text-[9.5px] font-black rounded-md bg-[#F3F0EB] text-[#5C5853] border border-[#E4DDD3] hover:bg-white transition-colors duration-150 cursor-default select-none"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
                {isAnalyzedPage && (
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
                )}
              </div>

              <h2
                className="font-bold text-[15px] sm:text-[16px] text-[#161311] leading-snug tracking-tight break-keep group-hover:text-[#C13026] transition-colors duration-200"
                style={{ fontFamily: "'Noto Serif KR', serif" }}
              >
                <HighlightText
                  text={decodeHtmlEntities(news.title)}
                  keyword={keyword}
                />
              </h2>

              <p
                className="text-[13px] sm:text-sm leading-relaxed text-[#5C5853] line-clamp-2"
                style={{ fontFamily: "'Noto Sans KR', sans-serif" }}
              >
                <HighlightText text={displaySummary} keyword={keyword} />
              </p>
            </div>

            {/* Bottom info (ScoreMeter는 분석페이지 전용) */}
            {isAnalyzedPage && news.credibility_score != null && (
              <div className="mt-3 pt-2.5 border-t border-[#f2ede4] flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 tracking-wider uppercase">
                  AI 신뢰도 리포트
                </span>
                <ScoreMeter score={news.credibility_score} />
              </div>
            )}
          </div>

          {/* Right image thumbnail */}
          <div className="w-24 sm:w-32 shrink-0 self-stretch overflow-hidden relative flex items-center justify-center bg-[#F7F4EF]">
            {displayImage ? (
              <img
                src={displayImage}
                alt=""
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover transition-transform duration-400 group-hover:scale-[1.04]"
                style={{ willChange: "transform" }}
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  img.style.display = "none";
                  const fallback =
                    img.nextElementSibling as HTMLDivElement;
                  if (fallback) fallback.style.display = "flex";
                }}
              />
            ) : null}

            {/* 그라데이션 플레이스홀더 */}
            <div
              className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-tr from-purple-100 to-sky-100 select-none"
              style={{ display: displayImage ? "none" : "flex" }}
              aria-hidden="true"
            >
              <span className="text-[26px] font-black text-purple-800/80 font-serif leading-none">
                {sourceName.charAt(0)}
              </span>
              <span className="text-[8px] font-black text-purple-700/50 uppercase tracking-widest mt-1">
                {news.source || "NEWS"}
              </span>
            </div>
          </div>
        </article>
      </Link>
    </div>
  );
});

export default NewsCard;
