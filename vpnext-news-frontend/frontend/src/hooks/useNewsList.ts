import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { appendDiverseNews } from "../utils/diversifyNews";
import {
  fetchDiverseFeedPage,
  fetchDiverseInitialFeed,
} from "../services/newsFeedService";
import { syncMultipleEngagementFromBackend } from "../utils/articleEngagement";
import { useCustomQuery, setCustomQueryData } from "./useCustomQuery";
import type { NewsItem } from "../types/news";

interface UseNewsListOptions {
  isAnalyzed: boolean;
}

interface NewsListCacheData {
  items: NewsItem[];
  total: number;
  nextPage: number;
}

export function useNewsList({ isAnalyzed }: UseNewsListOptions) {
  const [searchParams] = useSearchParams();
  const keyword = searchParams.get("q") || "";

  const cacheKey = useMemo(() => ["newsFeed", isAnalyzed, keyword], [isAnalyzed, keyword]);

  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const nextFeedPageRef = useRef(2);
  const loadingMoreRef = useRef(false);

  // 1. 선언형 캐시로부터 초기 피드 조회 (staleTime 5분)
  const { data: cachedData, loading: queryLoading, error: queryError, refetch } = useCustomQuery<NewsListCacheData>({
    queryKey: cacheKey,
    queryFn: async () => {
      const result = await fetchDiverseInitialFeed(isAnalyzed, keyword);
      syncMultipleEngagementFromBackend(result.items);
      return {
        items: result.items,
        total: result.total,
        nextPage: result.nextFeedPage,
      };
    },
    staleTime: 1000 * 60 * 5,
  });

  // 2. 캐시 변경에 반응하여 로컬 상태 동기화
  useEffect(() => {
    if (cachedData) {
      setNewsList(cachedData.items);
      setTotalItems(cachedData.total);
      nextFeedPageRef.current = cachedData.nextPage;
      setLoading(false);
    }
  }, [cachedData]);

  // 로딩 상태 동기화
  useEffect(() => {
    if (queryLoading && !cachedData) {
      setLoading(true);
    } else {
      setLoading(false);
    }
  }, [queryLoading, cachedData]);

  // 에러 상태 동기화
  useEffect(() => {
    if (queryError) {
      setError(queryError);
    } else {
      setError(null);
    }
  }, [queryError]);

  const hasMore = newsList.length < totalItems;


  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || loading || !hasMore) return;

    loadingMoreRef.current = true;
    setLoadingMore(true);

    try {
      const page = nextFeedPageRef.current;
      const result = await fetchDiverseFeedPage(page, isAnalyzed, keyword);

      syncMultipleEngagementFromBackend(result.items);

      setTotalItems(result.total);
      const updatedList = appendDiverseNews(newsList, result.items);
      setNewsList(updatedList);
      nextFeedPageRef.current = page + 1;

      // 무한 스크롤 적재 데이터를 캐시 보관소에 병합 (Optimistic Cache Update)
      setCustomQueryData<NewsListCacheData>(cacheKey, () => ({
        items: updatedList,
        total: result.total,
        nextPage: page + 1,
      }));
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [hasMore, isAnalyzed, keyword, loading, newsList, cacheKey]);

  const handleRetry = useCallback(() => {
    refetch();
  }, [refetch]);

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
