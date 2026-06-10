import { useCallback, useEffect, useSyncExternalStore } from "react";
import { useLocation } from "react-router-dom";
import {
  cancelViewIncrement,
  getEngagementSnapshot,
  getLikeCount,
  getViewCount,
  isArticleLiked,
  scheduleViewIncrement,
  subscribeEngagement,
  toggleLike,
  getEngagementSummary,
  getTopArticlesByViews,
  getTopArticlesByLikes,
} from "../utils/articleEngagement";

/** 기사별 조회수·좋아요 상태를 구독하는 경량 훅 */
export function useArticleEngagement(articleId: number) {
  useSyncExternalStore(subscribeEngagement, getEngagementSnapshot, getEngagementSnapshot);

  const viewCount = getViewCount(articleId);
  const likeCount = getLikeCount(articleId);
  const liked = isArticleLiked(articleId);

  const handleToggleLike = useCallback(
    (e?: React.MouseEvent) => {
      e?.preventDefault();
      e?.stopPropagation();
      toggleLike(articleId);
    },
    [articleId],
  );

  return { viewCount, likeCount, liked, handleToggleLike };
}

/**
 * 상세 페이지에서 기사 로드 후 조회수 증가
 * - 재진입 시마다 증가 (location.key 변경)
 * - 새로고침(reload)은 제외
 */
export function useTrackArticleView(articleId: number | undefined, ready: boolean): void {
  const location = useLocation();

  useEffect(() => {
    if (!articleId || !ready) return;
    scheduleViewIncrement(articleId, location.key);
    return () => cancelViewIncrement(articleId, location.key);
  }, [articleId, ready, location.key]);
}

/** 실시간 통계 데이터를 구독하는 훅 */
export function useEngagementStats() {
  useSyncExternalStore(subscribeEngagement, getEngagementSnapshot, getEngagementSnapshot);

  const summary = getEngagementSummary();
  const topViews = getTopArticlesByViews(5);
  const topLikes = getTopArticlesByLikes(5);

  return {
    summary,
    topViews,
    topLikes,
  };
}

