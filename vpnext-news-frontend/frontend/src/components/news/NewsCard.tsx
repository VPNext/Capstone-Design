import { Link } from "react-router-dom";
import { SOURCE_NAME_MAP, SOURCE_BADGE_CLASS } from "../../constants/source";
import { extractImageFromSummary, extractTextFromSummary, decodeHtmlEntities } from "../../utils/summary";
import { getScoreColor } from "../../utils/score";
import HighlightText from "../HighlightText";
import CredibilityBadge from "../CredibilityBadge";
import ScoreMeter from "../ScoreMeter";
import type { NewsItem } from "../../types/news";

interface NewsCardProps {
  news: NewsItem;
  keyword: string | null;
  isAnalyzedPage?: boolean;
  innerRef?: (node: HTMLDivElement | null) => void;
}

export default function NewsCard({
  news,
  keyword,
  isAnalyzedPage = false,
  innerRef,
}: NewsCardProps) {
  const displayImage = news.image_url || extractImageFromSummary(news.summary);
  const rawSummary = extractTextFromSummary(news.ai_summary || news.summary);
  const displaySummary = rawSummary.length > 200 ? rawSummary.slice(0, 200) + "..." : rawSummary;
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

  // 신뢰도 컬러바 색상 계산 (분석페이지 전용)
  const scoreColor =
    isAnalyzedPage && news.credibility_score != null
      ? getScoreColor(news.credibility_score).hex
      : "transparent";

  // 호버 테두리 색상 분기
  const hoverBorderColor = isAnalyzedPage
    ? "hover:border-[rgba(26,85,168,0.25)]"
    : "hover:border-[rgba(193,48,38,0.25)]";

  return (
    <div ref={innerRef} className="group">
      <Link to={`/news/${news.id}`} className="block">
        <article
          className={`flex bg-white overflow-hidden border border-[#E4DDD3] rounded-[18px] shadow-[0_1px_6px_rgba(22,19,17,0.05)] transition-all duration-250 hover:shadow-[0_8px_28px_rgba(22,19,17,0.12)] hover:-translate-y-[2px] ${hoverBorderColor}`}
        >
          {/* 신뢰도 컬러 바 (분석페이지 전용) */}
          {isAnalyzedPage && news.credibility_score != null && (
            <div
              className="w-1 shrink-0 self-stretch"
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
                <span
                  className="text-[10px] font-medium shrink-0"
                  style={{ color: "#9C9891" }}
                >
                  {new Date(news.published_at).toLocaleDateString("ko-KR", {
                    month: "long",
                    day: "numeric",
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
                className="font-bold text-[15px] sm:text-[17px] text-[#161311] leading-snug tracking-tight break-keep group-hover:text-[#C13026] transition-colors"
                style={{ fontFamily: "'Noto Serif KR', serif" }}
              >
                <HighlightText text={decodeHtmlEntities(news.title)} keyword={keyword} />
              </h2>

              <p
                className="text-xs sm:text-sm leading-relaxed text-[#5C5853] line-clamp-2 mt-0.5"
                style={{ fontFamily: "'Noto Sans KR', sans-serif" }}
              >
                <HighlightText text={displaySummary} keyword={keyword} />
              </p>
            </div>

            {/* Bottom info (ScoreMeter는 분석페이지 전용) */}
            {isAnalyzedPage && news.credibility_score != null && (
              <div className="mt-3 sm:mt-4 pt-2.5 border-t border-[#f2ede4] flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 tracking-wider uppercase">
                  AI 신뢰도 분석 리포트
                </span>
                <ScoreMeter score={news.credibility_score} />
              </div>
            )}
          </div>

          {/* Right image thumbnail - aspect-[4/3] with premium fallback placeholder */}
          <div
            className="w-28 sm:w-36 shrink-0 aspect-[4/3] overflow-hidden relative flex items-center justify-center"
          >
            {displayImage ? (
              <img
                src={displayImage}
                alt="뉴스 썸네일"
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  img.style.display = "none";
                  const fallback = img.nextElementSibling as HTMLDivElement;
                  if (fallback) fallback.style.display = "flex";
                }}
              />
            ) : null}
            
            {/* 고품질 추상 그라데이션 플레이스홀더 */}
            <div
              className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-tr from-purple-100 to-sky-100 select-none"
              style={{ display: displayImage ? "none" : "flex" }}
            >
              <span className="text-[28px] font-black text-purple-800/80 font-serif leading-none">
                {sourceName.charAt(0)}
              </span>
              <span className="text-[9px] font-black text-purple-700/50 uppercase tracking-widest mt-1">
                {news.source || "NEWS"}
              </span>
            </div>
          </div>
        </article>
      </Link>
    </div>
  );
}
