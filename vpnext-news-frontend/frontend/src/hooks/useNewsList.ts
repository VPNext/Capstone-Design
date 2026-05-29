import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { SOURCE_NAME_MAP } from "../constants/source";
import { fetchNewsList } from "../services/newsService";
import { storage } from "../utils/storage";
import type { NewsItem } from "../types/news";

interface UseNewsListProps {
  isAnalyzed: boolean;
  cacheKey: string;
  scrollKey: string;
}

interface NewsCache {
  page?: number;
  selectedSource?: string;
}

export function useNewsList({ isAnalyzed, cacheKey }: UseNewsListProps) {
  const [searchParams] = useSearchParams();
  const keyword = searchParams.get("q") || "";


  // sessionStorage 캐시에서 이전 페이지 정보 복원 (검색어 없을 때만)
  const [page, setPage] = useState<number>(() => {
    if (keyword) return 1;
    const cached = storage.get<NewsCache>(cacheKey, {});
    return cached.page || 1;
  });

  const [selectedSource, setSelectedSource] = useState<string>(() => {
    const cached = storage.get<NewsCache>(cacheKey, {});
    return cached.selectedSource || "전체";
  });

  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const ITEMS_PER_PAGE = 20;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  // 뉴스 목록 API 호출 함수
  const fetchNews = useCallback(async (pageNumber: number, sourceName: string, queryKeyword?: string) => {
    try {
      setError(null);
      setLoading(true);

      const sourceId = Object.keys(SOURCE_NAME_MAP).find(
        (key) => SOURCE_NAME_MAP[key] === sourceName
      );
      const sourceParam = sourceId ? sourceId : undefined;

      const response = await fetchNewsList(pageNumber, sourceParam, isAnalyzed, queryKeyword);
      const rawItems = response.items || [];
      const total = response.total || 0;

      // 타 뉴스사 선택 시 네이버 연동 기사는 프론트엔드에서 제외 처리
      const newItems = (sourceName !== "네이버 뉴스" && sourceName !== "전체")
        ? rawItems.filter((item: NewsItem) => !item.url?.includes("naver.com"))
        : rawItems;

      setNewsList(newItems);
      setTotalItems(total);

      // 검색어가 없을 때만 필터와 페이지 정보를 캐시에 저장
      if (!queryKeyword) {
        storage.set(cacheKey, {
          page: pageNumber,
          selectedSource: sourceName,
        });
      }
    } catch (err) {
      console.error("뉴스 로드 오류:", err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [isAnalyzed, cacheKey]);

  // 검색어, 언론사 변경, 페이지 번호 이동 및 첫 로딩 시의 선언적 API 동기화
  useEffect(() => {
    fetchNews(page, selectedSource, keyword);
  }, [keyword, selectedSource, page, fetchNews]);

  const handlePageChange = useCallback((newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [totalPages]);

  const handleSourceChange = useCallback((src: string) => {
    setSelectedSource(src);
    setPage(1); // 언론사 변경 시 1페이지로 초기화
  }, []);

  const handleRetry = useCallback(() => {
    fetchNews(page, selectedSource, keyword);
  }, [fetchNews, page, selectedSource, keyword]);

  return {
    newsList,
    page,
    totalPages,
    totalItems,
    selectedSource,
    loading,
    keyword,
    handlePageChange,
    handleSourceChange,
    error,
    handleRetry,
  };
}

