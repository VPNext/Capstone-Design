import { Link } from "react-router-dom";
import { SOURCE_NAME_MAP, SOURCE_BADGE_CLASS } from "../../constants/source";
import { extractImageFromSummary, extractTextFromSummary, decodeHtmlEntities, optimizeImageUrl } from "../../utils/summary";
import { prefetchQuery } from "../../hooks/useCustomQuery";
import { fetchNewsDetail } from "../../services/newsService";
import HighlightText from "../HighlightText";
import CredibilityBadge from "../CredibilityBadge";
import ArticleEngagementBar from "./ArticleEngagementBar";
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
  const displayImage = optimizeImageUrl(news.image_url) || extractImageFromSummary(news.summary);
  const rawSummary = extractTextFromSummary(news.ai_summary || news.summary) || `${decodeHtmlEntities(news.title)} 기사의 보도 본문입니다. 본 서비스는 AI가 분석하기 전 뉴스 목록을 제공하며, 기사를 클릭하여 AI 분석을 실행하면 가독성이 뛰어난 핵심 요약 리포트와 4컷 만화 요약본을 감상하실 수 있습니다.`;
  const displaySummary = rawSummary.length > 300 ? rawSummary.slice(0, 300) + "..." : rawSummary;
  const sourceKey = news.source?.toLowerCase();
  const sourceName =
    SOURCE_NAME_MAP[sourceKey] || news.source?.toUpperCase() || "알 수 없음";
  // 네이버 뉴스 플랫폼 제휴 유통 여부 판정
  const isNaverPlatform = news.url?.includes("naver.com");
  const displaySourceName = isNaverPlatform ? "네이버 뉴스" : sourceName;
  
  // 네이버 뉴스 플랫폼일 경우 뱃지 색상을 네이버 시그니처 초록색으로 강제 통일
  const displayBadgeClass = isNaverPlatform 
    ? (SOURCE_BADGE_CLASS["naver"] || "bg-[#03c75a] text-white") 
    : (SOURCE_BADGE_CLASS[sourceKey] || "badge-default");

  // 호버 색상
  const hoverBorderColor = isAnalyzedPage
    ? "hover:border-[rgba(26,85,168,0.25)]"
    : "hover:border-[rgba(193,48,38,0.2)]";

  // 상세 데이터 프리패칭 함수
  const handlePrefetch = () => {
    prefetchQuery(
      ["newsDetail", String(news.id)],
      () => fetchNewsDetail(news.id),
      1000 * 60 * 10 // 10분 유효기간 (staleTime)
    );
  };

  return (
    <div
      className="mb-2 group"
      onMouseEnter={handlePrefetch}
      onTouchStart={handlePrefetch}
    >
      <Link to={`/news/${news.id}`} className="block">
        <article
          className={`overflow-hidden bg-white transition-all duration-[350ms] border border-[#E4DDD3] rounded-[24px] shadow-[0_2px_24px_rgba(22,19,17,0.08)] hover:shadow-[0_16px_56px_rgba(22,19,17,0.16)] hover:-translate-y-[3px] ${hoverBorderColor}`}
        >
          {/* Hero image with premium fallback placeholder */}
          <div
            className="relative overflow-hidden bg-[#f5f2ec] flex items-center justify-center h-[clamp(220px,40vw,420px)] w-full"
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
                className={`${displayBadgeClass} text-[10px] font-black px-3 py-1.5 rounded-full`}
              >
                {displaySourceName}
              </span>
              <span
                className="text-[10px] font-medium text-[#9C9891]"
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
              {isAnalyzedPage && news.tags && news.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 items-center">
                  {news.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 text-[9.5px] font-black rounded-md bg-[#F3F0EB] text-[#5C5853] border border-[#E4DDD3] transition-all duration-200 hover:bg-white hover:scale-105 cursor-default select-none"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
              {isAnalyzedPage && (
                <ArticleEngagementBar
                  articleId={news.id}
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
              className="font-black text-xl sm:text-2xl text-[#161311] leading-tight break-keep group-hover:text-[#C13026] transition-colors duration-300"
              style={{
                fontFamily: "'Noto Serif KR', serif",
                letterSpacing: "-0.01em",
              }}
            >
              <HighlightText text={decodeHtmlEntities(news.title)} keyword={keyword} />
            </h2>

            <p
              className="text-sm sm:text-base leading-relaxed text-[#5C5853] line-clamp-3"
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
