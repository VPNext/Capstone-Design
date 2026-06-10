import { memo, useEffect } from "react";
import { formatEngagementCount, saveArticleMeta } from "../../utils/articleEngagement";
import type { ArticleMeta } from "../../utils/articleEngagement";
import { useArticleEngagement } from "../../hooks/useArticleEngagement";

type EngagementTone = "main" | "analyzed";

interface ArticleEngagementBarProps {
  articleId: number;
  /** 카드·메타 영역용 소형 칩 */
  compact?: boolean;
  /** 슬라이드 이미지 위 반투명 칩 */
  overlay?: boolean;
  analyzedTheme?: boolean;
  /** 기사 통계용 메타데이터 (이 컴포넌트가 마운트될 때 자동으로 저장됨) */
  articleMeta?: ArticleMeta;
}

const ACCENT: Record<EngagementTone, string> = {
  main: "#C13026",
  analyzed: "#1A55A8",
};

const LIKED_BG: Record<EngagementTone, string> = {
  main: "bg-[#FEF2F2] border-[#FECACA]",
  analyzed: "bg-[#EFF6FF] border-[#BFDBFE]",
};

function EyeIcon({ className }: { className: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  );
}

function HeartIcon({ className, filled }: { className: string; filled: boolean }) {
  return (
    <svg
      className={className}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={filled ? 0 : 2}
        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
      />
    </svg>
  );
}

function ArticleEngagementBar({
  articleId,
  compact = false,
  overlay = false,
  analyzedTheme = false,
  articleMeta,
}: ArticleEngagementBarProps) {
  const { viewCount, likeCount, liked, handleToggleLike } = useArticleEngagement(articleId);

  useEffect(() => {
    if (articleMeta) {
      saveArticleMeta(articleMeta);
    }
  }, [articleMeta]);

  const tone: EngagementTone = analyzedTheme ? "analyzed" : "main";
  const accent = ACCENT[tone];

  const chipBase = overlay
    ? "inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/55 backdrop-blur-sm text-white font-bold tabular-nums shadow-sm"
    : "inline-flex items-center gap-1.5 rounded-full border font-bold tabular-nums";

  const chipSize = compact || overlay ? "text-xs px-2.5 py-1" : "text-sm px-3 py-1.5";
  const iconSize = compact || overlay ? "w-3.5 h-3.5" : "w-4 h-4";

  const viewChipClass = overlay
    ? `${chipBase} ${chipSize}`
    : `${chipBase} ${chipSize} bg-[#F7F5F0] border-[#E4DDD3] text-[#4A4540]`;

  const likeChipClass = overlay
    ? `${chipBase} ${chipSize} transition-colors ${liked ? "border-white/40" : "hover:bg-black/70"}`
    : `${chipBase} ${chipSize} transition-colors ${
        liked ? `${LIKED_BG[tone]} border` : "bg-[#F7F5F0] border-[#E4DDD3] text-[#4A4540] hover:border-[#D4CEC4]"
      }`;

  return (
    <div
      className={`inline-flex items-center ${compact || overlay ? "gap-2" : "gap-2.5"}`}
      onClick={(e) => e.stopPropagation()}
    >
      <span className={viewChipClass} aria-label={`조회수 ${viewCount}`}>
        <EyeIcon className={iconSize} />
        {formatEngagementCount(viewCount)}
      </span>

      <button
        type="button"
        onClick={handleToggleLike}
        className={likeChipClass}
        style={{ color: liked ? accent : overlay ? "white" : "#4A4540" }}
        aria-label={liked ? "좋아요 취소" : "좋아요"}
        aria-pressed={liked}
      >
        <HeartIcon className={iconSize} filled={liked} />
        {formatEngagementCount(likeCount)}
      </button>
    </div>
  );
}

export default memo(ArticleEngagementBar);
