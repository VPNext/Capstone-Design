import { useState, useCallback, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { SOURCE_NAME_MAP } from "../constants/source";
import { fetchNewsList } from "../services/newsService";
import { storage } from "../utils/storage";
import { useCustomQuery } from "./useCustomQuery";
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

  // 언론사 매핑
  const sourceId = Object.keys(SOURCE_NAME_MAP).find(
    (key) => SOURCE_NAME_MAP[key] === selectedSource
  );
  const sourceParam = sourceId ? sourceId : undefined;

  // useCustomQuery 선언형 캐싱 훅 적용
  const { data, loading, error, refetch } = useCustomQuery({
    queryKey: ["newsList", isAnalyzed, page, selectedSource, keyword],
    queryFn: () => fetchNewsList(page, sourceParam, isAnalyzed, keyword),
    staleTime: 1000 * 60 * 2, // 2분 동안 메모리 캐시 보존 및 중복 호출 제거
  });

  const rawItems = data?.items || [];
  const totalItems = data?.total || 0;
  
  const ITEMS_PER_PAGE = 20;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  // 타 뉴스사 선택 시 네이버 연동 기사는 프론트엔드에서 제외 처리
  const newsList = useMemo(() => {
    return (selectedSource !== "네이버 뉴스" && selectedSource !== "전체")
      ? rawItems.filter((item: NewsItem) => !item.url?.includes("naver.com"))
      : rawItems;
  }, [rawItems, selectedSource]);

  // 검색어 필터가 없을 때만 필터와 페이지 정보를 세션 스토리지 캐시에 보관
  useEffect(() => {
    if (!keyword) {
      storage.set(cacheKey, {
        page,
        selectedSource,
      });
    }
  }, [page, selectedSource, keyword, cacheKey]);

  const handlePageChange = useCallback((newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [totalPages]);

  const handleSourceChange = useCallback((src: string) => {
    setSelectedSource(src);
    setPage(1); // 언론사 변경 시 1페이지로 초기화
  }, []);

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
    handleRetry: refetch,
  };
}
