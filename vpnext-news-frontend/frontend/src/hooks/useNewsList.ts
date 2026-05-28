import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams, useNavigationType } from "react-router-dom";
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
  newsList?: NewsItem[];
  page?: number;
  hasMore?: boolean;
  selectedSource?: string;
}

export function useNewsList({ isAnalyzed, cacheKey, scrollKey }: UseNewsListProps) {
  const [searchParams] = useSearchParams();
  const keyword = searchParams.get("q") || "";
  const navType = useNavigationType();

  // 검색어가 없을 때만 기존 저장된 뉴스 캐시 로드
  const [newsList, setNewsList] = useState<NewsItem[]>(() =>
    keyword ? [] : storage.get<NewsCache>(cacheKey, {}).newsList || []
  );
  const [page, setPage] = useState<number>(() =>
    keyword ? 1 : storage.get<NewsCache>(cacheKey, {}).page || 1
  );
  const [hasMore, setHasMore] = useState<boolean>(() =>
    keyword ? true : storage.get<NewsCache>(cacheKey, {}).hasMore ?? true
  );
  const [selectedSource, setSelectedSource] = useState<string>(() =>
    storage.get<NewsCache>(cacheKey, {}).selectedSource || "전체"
  );
  const [loading, setLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // 무한 스크롤 과부하 방지용 설정 (최대 2번만 자동 로딩하고, 그 이후는 '더보기' 버튼 수동 클릭 유도)
  const [autoLoadCount, setAutoLoadCount] = useState(0);
  const [showLoadMoreBtn, setShowLoadMoreBtn] = useState(false);
  const MAX_AUTO_LOAD = 2;

  const observer = useRef<IntersectionObserver | null>(null);

  // 뉴스 목록 API 호출 함수
  const fetchNews = async (pageNumber: number, sourceName: string, queryKeyword?: string) => {
    try {
      setError(null);
      if (pageNumber === 1) setLoading(true);
      else setIsLoadingMore(true);

      const sourceId = Object.keys(SOURCE_NAME_MAP).find(
        (key) => SOURCE_NAME_MAP[key] === sourceName
      );
      const sourceParam = sourceId ? sourceId : undefined;

      const response = await fetchNewsList(pageNumber, sourceParam, isAnalyzed, queryKeyword);
      const newItems = response.items || [];

      let nextNewsList = newItems;
      let nextHasMore = true;

      if (newItems.length === 0) {
        nextHasMore = false;
        setHasMore(false);
      } else {
        setNewsList((prev) => {
          nextNewsList = pageNumber === 1 ? newItems : [...prev, ...newItems];
          return nextNewsList;
        });
        nextHasMore = newItems.length >= 20;
        setHasMore(nextHasMore);
      }

      if (!queryKeyword) {
        storage.set(cacheKey, {
          newsList: nextNewsList,
          page: pageNumber,
          hasMore: nextHasMore,
          selectedSource: sourceName,
        });
      }
    } catch (err) {
      console.error("뉴스 로드 오류:", err);
      setError(err as Error);
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  };

  // 무한 스크롤 감지용 마지막 요소 Ref 콜백 (마지막 카드가 화면에 등장하면 자동 다음 페이지 페칭)
  const lastElementRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (loading || isLoadingMore || showLoadMoreBtn) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          if (autoLoadCount >= MAX_AUTO_LOAD) {
            setShowLoadMoreBtn(true);
          } else {
            setAutoLoadCount((prev) => prev + 1);
            const nextPage = page + 1;
            setPage(nextPage);
            fetchNews(nextPage, selectedSource, keyword);
          }
        }
      });
      if (node) observer.current.observe(node);
    },
    [loading, isLoadingMore, hasMore, showLoadMoreBtn, autoLoadCount, page, selectedSource, keyword]
  );

  // '뉴스 더 불러오기' 수동 클릭 시 호출
  const handleLoadMoreClick = () => {
    setShowLoadMoreBtn(false);
    setAutoLoadCount(0);
    const nextPage = page + 1;
    setPage(nextPage);
    fetchNews(nextPage, selectedSource, keyword);
  };

  // 검색어, 언론사, 혹은 뒤로가기(POP) 발생 시 목록 다시 동기화
  useEffect(() => {
    setNewsList([]);
    setPage(1);
    setHasMore(true);
    setAutoLoadCount(0);
    setShowLoadMoreBtn(false);

    if (!keyword && navType === "POP") {
      const cached = storage.get<NewsCache | null>(cacheKey, null);
      if (cached && cached.selectedSource === selectedSource) {
        setNewsList(cached.newsList || []);
        setPage(cached.page || 1);
        setHasMore(cached.hasMore ?? true);
        setTimeout(() => {
          const scrollY = storage.get<string>(scrollKey, "0");
          if (scrollY) window.scrollTo(0, parseInt(scrollY, 10));
        }, 100);
        return;
      }
    }

    fetchNews(1, selectedSource, keyword);
  }, [keyword, selectedSource, navType]);

  // 스크롤 발생 시 실시간 Y축 기록 (requestAnimationFrame을 활용하여 브라우저 페인팅 주기당 최대 1회만 쓰기 처리하도록 최적화)
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!keyword && !ticking) {
        window.requestAnimationFrame(() => {
          storage.set(scrollKey, window.scrollY.toString());
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [keyword, scrollKey]);

  const handleSourceChange = (src: string) => {
    setSelectedSource(src);
  };

  const handleRetry = () => {
    fetchNews(page, selectedSource, keyword);
  };

  return {
    newsList,
    page,
    hasMore,
    selectedSource,
    loading,
    isLoadingMore,
    showLoadMoreBtn,
    keyword,
    lastElementRef,
    handleLoadMoreClick,
    handleSourceChange,
    setPage,
    error,
    handleRetry,
  };
}
