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

// AI 분석이 완료된 뉴스 목록 페칭 및 페이징(무한 스크롤 + 더보기 버튼 제어) 훅
export function useAnalyzedNews() {
  const [searchParams] = useSearchParams();
  const keyword = searchParams.get("q") || "";

  // 검색어가 없을 때만 기존 저장된 분석 뉴스 캐시 로드
  const [newsList, setNewsList] = useState<NewsItem[]>(() =>
    keyword ? [] : storage.get<NewsCache>(STORAGE_KEYS.ANALYZED_NEWS_CACHE, {}).newsList || [],
  );
  const [page, setPage] = useState<number>(() =>
    keyword ? 1 : storage.get<NewsCache>(STORAGE_KEYS.ANALYZED_NEWS_CACHE, {}).page || 1
  );
  const [hasMore, setHasMore] = useState<boolean>(() =>
    keyword ? true : storage.get<NewsCache>(STORAGE_KEYS.ANALYZED_NEWS_CACHE, {}).hasMore ?? true
  );
  const [selectedSource, setSelectedSource] = useState<string>(() =>
    storage.get<NewsCache>(STORAGE_KEYS.ANALYZED_NEWS_CACHE, {}).selectedSource || "전체"
  );
  const [loading, setLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // 무한 스크롤 과부하 방지용 설정 (최대 2번만 자동 로딩하고, 그 이후는 '더보기' 버튼 수동 클릭 유도)
  const [autoLoadCount, setAutoLoadCount] = useState(0);
  const [showLoadMoreBtn, setShowLoadMoreBtn] = useState(false);
  const MAX_AUTO_LOAD = 2;

  const observer = useRef<IntersectionObserver | null>(null);

  // 분석 뉴스 API 호출 함수 (isAnalyzed=true 조건 전달)
  const fetchNews = async (pageNumber: number, sourceName: string, queryKeyword?: string) => {
    try {
      if (pageNumber === 1) setLoading(true);
      else setIsLoadingMore(true);
      
      const sourceId = Object.keys(SOURCE_NAME_MAP).find(
        (key) => SOURCE_NAME_MAP[key] === sourceName,
      );
      const sourceParam = sourceId ? sourceId : undefined;
      
      const response = await fetchNewsList(pageNumber, sourceParam, true, queryKeyword);
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
        storage.set(STORAGE_KEYS.ANALYZED_NEWS_CACHE, {
          newsList: nextNewsList,
          page: pageNumber,
          hasMore: nextHasMore,
          selectedSource: sourceName,
        });
      }
    } catch (err) {
      console.error("분석 뉴스 로드 오류:", err);
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  };

  // 목록 끝에 도달했을 때 무한 스크롤 또는 더보기 버튼 활성화를 제어하는 Ref
  const lastElementRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (loading || isLoadingMore || showLoadMoreBtn) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          // 최대 자동 로딩 횟수를 넘었으면 더보기 버튼 출력
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
    [loading, isLoadingMore, hasMore, showLoadMoreBtn, autoLoadCount, page, selectedSource, keyword],
  );

  // '뉴스 더 불러오기' 수동 클릭 시 호출
  const handleLoadMoreClick = () => {
    setShowLoadMoreBtn(false);
    setAutoLoadCount(0);
    const nextPage = page + 1;
    setPage(nextPage);
    fetchNews(nextPage, selectedSource, keyword);
  };

  const navType = useNavigationType();

  // 검색어, 언론사, 혹은 뒤로가기(POP) 발생 시 목록 다시 동기화
  useEffect(() => {
    setNewsList([]);
    setPage(1);
    setHasMore(true);
    setAutoLoadCount(0);
    setShowLoadMoreBtn(false);

    if (!keyword && navType === "POP") {
      const cached = sessionStorage.getItem(STORAGE_KEYS.ANALYZED_NEWS_CACHE);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed.selectedSource === selectedSource) {
            setNewsList(parsed.newsList || []);
            setPage(parsed.page || 1);
            setHasMore(parsed.hasMore !== undefined ? parsed.hasMore : true);
            setTimeout(() => {
              const scrollY = storage.get<string>(STORAGE_KEYS.ANALYZED_NEWS_SCROLL, "0");
              if (scrollY) window.scrollTo(0, parseInt(scrollY, 10));
            }, 100);
            return;
          }
        } catch (e) {}
      }
    }

    fetchNews(1, selectedSource, keyword);
  }, [keyword, selectedSource, navType]);

  // 스크롤 발생 시 실시간 Y축 기록
  useEffect(() => {
    const handleScroll = () => {
      if (!keyword) {
        storage.set(STORAGE_KEYS.ANALYZED_NEWS_SCROLL, window.scrollY.toString());
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
    showLoadMoreBtn,
    keyword,
    lastElementRef,
    handleLoadMoreClick,
    handleSourceChange,
    setPage,
  };
}
