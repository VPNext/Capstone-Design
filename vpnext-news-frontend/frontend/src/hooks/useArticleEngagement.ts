import { useCallback, useSyncExternalStore } from "react";
import {
  getEngagementSnapshot,
  getLikeCount,
  getViewCount,
  isArticleLiked,
  subscribeEngagement,
  toggleLikeLocal,
  getEngagementSummary,
  getTopArticlesByViews,
  getTopArticlesByLikes,
  syncEngagementFromBackend,
} from "../utils/articleEngagement";
import { toggleLikeNews } from "../services/newsService";

/** 기사별 조회수·좋아요 상태를 구독하는 경량 훅 */
export function useArticleEngagement(articleId: number) {
  useSyncExternalStore(subscribeEngagement, getEngagementSnapshot, getEngagementSnapshot);

  const viewCount = getViewCount(articleId);
  const likeCount = getLikeCount(articleId);
  const liked = isArticleLiked(articleId);

  const handleToggleLike = useCallback(
    async (e?: React.MouseEvent) => {
      e?.preventDefault();
      e?.stopPropagation();
      
      const nextLiked = toggleLikeLocal(articleId);
      try {
        const res = await toggleLikeNews(articleId, nextLiked);
        syncEngagementFromBackend(articleId, getViewCount(articleId), res.likes);
      } catch (err) {
        console.error("좋아요 상태 동기화 실패:", err);
        toggleLikeLocal(articleId);
      }
    },
    [articleId],
  );

  return { viewCount, likeCount, liked, handleToggleLike };
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

