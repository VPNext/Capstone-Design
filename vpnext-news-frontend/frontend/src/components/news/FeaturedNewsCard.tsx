import { Link } from "react-router-dom";
import { SOURCE_NAME_MAP, SOURCE_BADGE_CLASS } from "../../constants/source";
import { extractImageFromSummary, extractTextFromSummary, decodeHtmlEntities } from "../../utils/summary";
import HighlightText from "../HighlightText";
import CredibilityBadge from "../CredibilityBadge";
import type { NewsItem } from "../../types/news";

interface FeaturedNewsCardProps {
  news: NewsItem;
  keyword: string | null;
  isAnalyzedPage?: boolean;
}

export default function FeaturedNewsCard({
  news,
  keyword,
  isAnalyzedPage = false,
}: FeaturedNewsCardProps) {
  const displayImage = news.image_url || extractImageFromSummary(news.summary);
  const displaySummary = news.ai_summary || extractTextFromSummary(news.summary);
  const sourceKey = news.source?.toLowerCase();
  const sourceName =
    SOURCE_NAME_MAP[sourceKey] || news.source?.toUpperCase() || "알 수 없음";
  const badgeClass = SOURCE_BADGE_CLASS[sourceKey] || "badge-default";

  // 호버 색상
  const hoverBorderColor = isAnalyzedPage
    ? "hover:border-[rgba(26,85,168,0.25)]"
    : "hover:border-[rgba(193,48,38,0.2)]";

  return (
    <div className="mb-2 group">
      <Link to={`/news/${news.id}`} className="block">
        <article
          className={`overflow-hidden bg-white transition-all duration-350 border border-[#E4DDD3] rounded-[24px] shadow-[0_2px_24px_rgba(22,19,17,0.08)] hover:shadow-[0_16px_56px_rgba(22,19,17,0.16)] hover:-translate-y-[3px] ${hoverBorderColor}`}
        >
          {/* Hero image with premium fallback placeholder */}
          <div
            className="relative overflow-hidden bg-[#f5f2ec] flex items-center justify-center"
            style={{ height: "clamp(220px, 40vw, 420px)" }}
          >
            {displayImage ? (
              <img
                src={displayImage}
                alt="뉴스 대표 이미지"
                loading="eager"
                className="w-full h-full object-cover transition-transform duration-[800ms] ease-out group-hover:scale-[1.03]"
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  img.style.display = "none";
                  const overlay = img.nextElementSibling as HTMLDivElement;
                  if (overlay) overlay.style.display = "none";
                  const fallback = img.parentElement!.querySelector(".gradient-fallback") as HTMLDivElement;
                  if (fallback) fallback.style.display = "flex";
                }}
              />
            ) : null}
            {displayImage ? (
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
            ) : null}
            
            {/* 고품질 대형 그라데이션 플레이스홀더 */}
            <div
              className="gradient-fallback absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-tr from-purple-100 to-sky-100 select-none"
              style={{ display: displayImage ? "none" : "flex" }}
            >
              <svg className="w-12 h-12 text-purple-600/40 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 4a2 2 0 00-2-2m2 2a2 2 0 012 2v8a2 2 0 01-2 2h-3" />
              </svg>
              <span className="text-[32px] font-black text-purple-900/80 font-serif leading-none tracking-tight">
                {sourceName}
              </span>
              <span className="text-[10px] font-bold text-purple-800/40 uppercase tracking-[0.2em] mt-1.5">
                TODAY'S SPECIAL REPORT
              </span>
            </div>
          </div>

          {/* Card body */}
          <div className="p-6 sm:p-8 flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
              <span
                className={`${badgeClass} text-[10px] font-black px-3 py-1.5 rounded-full`}
              >
                {sourceName}
              </span>
              <span
                className="text-[10px] font-medium"
                style={{ color: "#9C9891" }}
              >
                {new Date(news.published_at).toLocaleDateString("ko-KR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  weekday: "long",
                })}
              </span>

              {/* 신뢰도 배지 (분석페이지 전용) */}
              {isAnalyzedPage && (
                <CredibilityBadge
                  label={news.credibility_label}
                  score={news.credibility_score}
                />
              )}
            </div>

            <h2
              className="font-black text-xl sm:text-2xl text-[#161311] leading-tight break-keep group-hover:text-[#C13026] transition-colors"
              style={{
                fontFamily: "'Noto Serif KR', serif",
                letterSpacing: "-0.01em",
              }}
            >
              <HighlightText text={decodeHtmlEntities(news.title)} keyword={keyword} />
            </h2>

            <p
              className="text-sm sm:text-base leading-relaxed text-[#5C5853]"
              style={{ fontFamily: "'Noto Sans KR', sans-serif" }}
            >
              <HighlightText text={displaySummary} keyword={keyword} />
            </p>
          </div>
        </article>
      </Link>
    </div>
  );
}
