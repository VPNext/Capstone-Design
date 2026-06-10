import { SOURCE_NAME_MAP, SOURCE_BADGE_CLASS } from "../constants/source";
import { decodeHtmlEntities, extractImageFromSummary, optimizeImageUrl } from "./summary";
import type { NewsItem } from "../types/news";

export function getNewsSourceMeta(news: NewsItem) {
  const sourceKey = news.source?.toLowerCase() ?? "";
  const sourceName =
    SOURCE_NAME_MAP[sourceKey] || news.source?.toUpperCase() || "알 수 없음";
  const isNaverPlatform = news.url?.includes("naver.com");
  const displaySourceName = isNaverPlatform ? "네이버 뉴스" : sourceName;
  const displayBadgeClass = isNaverPlatform
    ? (SOURCE_BADGE_CLASS.naver || "bg-[#03c75a] text-white")
    : (SOURCE_BADGE_CLASS[sourceKey] || "bg-[#525252] text-white");

  return { sourceKey, sourceName, displaySourceName, displayBadgeClass, isNaverPlatform };
}

export function getNewsDisplayImage(news: NewsItem): string | null {
  return optimizeImageUrl(news.image_url) || extractImageFromSummary(news.summary);
}

export function getNewsTitle(news: NewsItem): string {
  return decodeHtmlEntities(news.title);
}

export function formatNewsRelativeTime(publishedAt: string): string {
  const date = new Date(publishedAt);
  if (Number.isNaN(date.getTime())) return "";

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);
  if (diffMinutes < 1) return "방금 전";
  if (diffMinutes < 60) return `${diffMinutes}분 전`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}시간 전`;

  return date.toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" });
}

/** 우측 썸네일 패널에 표시할 다음 기사 수 (고정 개수로 DOM 부담 최소화) */
export const SIDE_THUMB_COUNT = 5;

/** 슬라이드가 끝에 가까워질 때 추가 로드하는 임계값 */
export const SLIDE_LOAD_AHEAD_THRESHOLD = 3;
