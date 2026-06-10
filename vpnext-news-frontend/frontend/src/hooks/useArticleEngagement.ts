import { useCallback, useEffect, useSyncExternalStore } from "react";
import {
  cancelViewIncrement,
  getEngagementSnapshot,
  getLikeCount,
  getViewCount,
  isArticleLiked,
  scheduleViewIncrement,
  subscribeEngagement,
  toggleLike,
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

/** 상세 페이지에서 기사 로드 후 조회수 증가 (세션당 1회, 짧은 지연) */
export function useTrackArticleView(articleId: number | undefined, ready: boolean): void {
  useEffect(() => {
    if (!articleId || !ready) return;
    scheduleViewIncrement(articleId);
    return () => cancelViewIncrement(articleId);
  }, [articleId, ready]);
}
