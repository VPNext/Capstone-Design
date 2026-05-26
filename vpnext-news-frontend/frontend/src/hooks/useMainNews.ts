import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams, useNavigationType } from "react-router-dom";
import { SOURCE_NAME_MAP } from "../constants/source";
import { fetchNewsList } from "../services/newsService";
import { storage, STORAGE_KEYS } from "../utils/storage";
import type { NewsItem } from "../types/news";

interface NewsCache {
  newsList?: NewsItem[];
  page?: number;
  hasMore?: boolean;
  selectedSource?: string;
}

// 오늘의 뉴스(분석 전 일반 기사) 목록 조회 및 무한 스크롤/캐싱 전담 훅
export function useMainNews() {
  const [searchParams] = useSearchParams();
  const keyword = searchParams.get("q") || "";

  // 검색어가 있을 때는 캐시를 쓰지 않고 새로 조회하고, 검색어가 없을 때만 기존 저장된 뉴스 캐시 로드
  const [newsList, setNewsList] = useState<NewsItem[]>(() =>
    keyword ? [] : storage.get<NewsCache>(STORAGE_KEYS.MAIN_NEWS_CACHE, {}).newsList || [],
  );
  const [page, setPage] = useState<number>(() =>
    keyword ? 1 : storage.get<NewsCache>(STORAGE_KEYS.MAIN_NEWS_CACHE, {}).page || 1
  );
  const [hasMore, setHasMore] = useState<boolean>(() =>
    keyword ? true : storage.get<NewsCache>(STORAGE_KEYS.MAIN_NEWS_CACHE, {}).hasMore ?? true
  );
  const [selectedSource, setSelectedSource] = useState<string>(() =>
    storage.get<NewsCache>(STORAGE_KEYS.MAIN_NEWS_CACHE, {}).selectedSource || "전체"
  );
  const [loading, setLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const observer = useRef<IntersectionObserver | null>(null);

  // 뉴스 목록 API 호출 함수 (1페이지는 전체 로딩, 2페이지 이후는 추가 페이징 처리)
  const fetchNews = async (pageNumber: number, sourceName: string, queryKeyword?: string) => {
    try {
      if (pageNumber === 1) setLoading(true);
      else setIsLoadingMore(true);

      const sourceId = Object.keys(SOURCE_NAME_MAP).find(
        (key) => SOURCE_NAME_MAP[key] === sourceName,
      );
      const sourceParam = sourceId ? sourceId : undefined;
      
      // 백엔드 뉴스 API 페칭 (isAnalyzed=false 조건 전달)
      const response = await fetchNewsList(pageNumber, sourceParam, false, queryKeyword);
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

      // 일반 상태(검색 결과 아님)일 때는 다음 페이징 동작이나 목록 복구를 위해 정보 캐싱
      if (!queryKeyword) {
        storage.set(STORAGE_KEYS.MAIN_NEWS_CACHE, {
          newsList: nextNewsList,
          page: pageNumber,
          hasMore: nextHasMore,
          selectedSource: sourceName,
        });
      }
    } catch (err) {
      console.error("뉴스 로드 오류:", err);
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  };

  // 무한 스크롤 감지용 마지막 요소 Ref 콜백 (마지막 카드가 화면에 등장하면 자동 다음 페이지 페칭)
  const lastElementRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (loading || isLoadingMore) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchNews(nextPage, selectedSource, keyword);
        }
      });
      if (node) observer.current.observe(node);
    },
    [loading, isLoadingMore, hasMore, page, selectedSource, keyword],
  );

  const navType = useNavigationType();

  // 검색어, 선택 언론사, 혹은 화면 뒤로가기(POP) 발생 시 뉴스 다시 로드 또는 캐시 복원
  useEffect(() => {
    setNewsList([]);
    setPage(1);
    setHasMore(true);

    // 사용자가 뒤로가기(POP)를 통해 목록으로 돌아온 경우, 세션스토리지에 있는 뉴스 캐시와 스크롤 위치 복원
    if (!keyword && navType === "POP") {
      const cached = sessionStorage.getItem(STORAGE_KEYS.MAIN_NEWS_CACHE);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed.selectedSource === selectedSource) {
            setNewsList(parsed.newsList || []);
            setPage(parsed.page || 1);
            setHasMore(parsed.hasMore !== undefined ? parsed.hasMore : true);
            setTimeout(() => {
              const scrollY = storage.get<string>(STORAGE_KEYS.MAIN_NEWS_SCROLL, "0");
              if (scrollY) window.scrollTo(0, parseInt(scrollY, 10));
            }, 100);
            return;
          }
        } catch (e) {}
      }
    }

    fetchNews(1, selectedSource, keyword);
  }, [keyword, selectedSource, navType]);

  // 스크롤이 발생할 때마다 실시간으로 현재 스크롤바의 Y값을 세션에 기록 (뒤로가기 시 복원 목적)
  useEffect(() => {
    const handleScroll = () => {
      if (!keyword) {
        storage.set(STORAGE_KEYS.MAIN_NEWS_SCROLL, window.scrollY.toString());
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [keyword]);

  const handleSourceChange = (src: string) => {
    setSelectedSource(src);
  };

  return {
    newsList,
    page,
    hasMore,
    selectedSource,
    loading,
    isLoadingMore,
    keyword,
    lastElementRef,
    handleSourceChange,
    setPage,
  };
}
