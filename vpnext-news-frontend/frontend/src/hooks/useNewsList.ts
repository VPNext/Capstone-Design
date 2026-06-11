import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { appendDiverseNews } from "../utils/diversifyNews";
import {
  fetchDiverseFeedPage,
  fetchDiverseInitialFeed,
} from "../services/newsFeedService";
import { syncEngagementFromBackend } from "../utils/articleEngagement";
import type { NewsItem } from "../types/news";

interface UseNewsListOptions {
  isAnalyzed: boolean;
}

export function useNewsList({ isAnalyzed }: UseNewsListOptions) {
  const [searchParams] = useSearchParams();
  const keyword = searchParams.get("q") || "";

  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const nextFeedPageRef = useRef(2);
  const loadingMoreRef = useRef(false);

  const hasMore = newsList.length < totalItems;

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNewsList([]);
    nextFeedPageRef.current = 2;

    try {
      const result = await fetchDiverseInitialFeed(isAnalyzed, keyword);
      // 백엔드 조회수/좋아요 상태를 로컬 저장소에 동기화
      result.items.forEach((item) => {
        syncEngagementFromBackend(item.id, item.views || 0, item.likes || 0);
      });
      setNewsList(result.items);
      setTotalItems(result.total);
      nextFeedPageRef.current = result.nextFeedPage;
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [isAnalyzed, keyword]);

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || loading || !hasMore) return;

    loadingMoreRef.current = true;
    setLoadingMore(true);

    try {
      const page = nextFeedPageRef.current;
      const result = await fetchDiverseFeedPage(page, isAnalyzed, keyword);

      // 백엔드 조회수/좋아요 상태를 로컬 저장소에 동기화
      result.items.forEach((item) => {
        syncEngagementFromBackend(item.id, item.views || 0, item.likes || 0);
      });
      setTotalItems(result.total);
      setNewsList((prev) => appendDiverseNews(prev, result.items));
      nextFeedPageRef.current = page + 1;
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [hasMore, isAnalyzed, keyword, loading]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  const handleRetry = useCallback(() => {
    void loadInitial();
  }, [loadInitial]);

  return {
    newsList,
    totalItems,
    loading,
    loadingMore,
    hasMore,
    keyword,
    loadMore,
    error,
    handleRetry,
  };
}
