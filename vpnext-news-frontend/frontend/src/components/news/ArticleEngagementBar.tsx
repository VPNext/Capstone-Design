import { formatEngagementCount } from "../../utils/articleEngagement";
import { useArticleEngagement } from "../../hooks/useArticleEngagement";

interface ArticleEngagementBarProps {
  articleId: number;
  /** 분석 페이지 카드용 컴팩트 스타일 */
  compact?: boolean;
  /** AI 분석 페이지 테마 (블루 악센트) */
  analyzedTheme?: boolean;
}

export default function ArticleEngagementBar({
  articleId,
  compact = false,
  analyzedTheme = false,
}: ArticleEngagementBarProps) {
  const { viewCount, likeCount, liked, handleToggleLike } = useArticleEngagement(articleId);

  const accent = analyzedTheme ? "#1A55A8" : "#C13026";
  const muted = "#9C9891";

  return (
    <div
      className={`flex items-center ${compact ? "gap-3" : "gap-4"}`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 조회수 */}
      <span
        className={`inline-flex items-center gap-1 font-semibold tabular-nums ${compact ? "text-[11px]" : "text-xs"}`}
        style={{ color: muted }}
        aria-label={`조회수 ${viewCount}`}
      >
        <svg
          className={compact ? "w-3.5 h-3.5" : "w-4 h-4"}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
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
        {formatEngagementCount(viewCount)}
      </span>

      {/* 좋아요 */}
      <button
        type="button"
        onClick={handleToggleLike}
        className={`inline-flex items-center gap-1 font-semibold tabular-nums transition-all duration-200 rounded-full ${
          compact ? "text-[11px] px-1.5 py-0.5" : "text-xs px-2 py-1"
        } ${liked ? "scale-105" : "hover:scale-105 active:scale-95"}`}
        style={{ color: liked ? accent : muted }}
        aria-label={liked ? "좋아요 취소" : "좋아요"}
        aria-pressed={liked}
      >
        <svg
          className={`${compact ? "w-3.5 h-3.5" : "w-4 h-4"} transition-colors duration-200`}
          fill={liked ? "currentColor" : "none"}
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={liked ? 0 : 2}
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
        {formatEngagementCount(likeCount)}
      </button>
    </div>
  );
}
