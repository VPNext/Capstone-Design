import { useEffect, useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import api from "../api";

// [사전 정의] 언론사 ID -> 한글명 매핑 맵
const SOURCE_NAME_MAP: Record<string, string> = {
  hani: "한겨레",
  khan: "경향신문",
  chosun: "조선일보",
  joongang: "중앙일보",
  donga: "동아일보",
  mbc: "MBC",
  kbs: "KBS",
  sbs: "SBS",
  ytn: "YTN",
  hankyung: "한국경제",
  mk: "매일경제",
  yonhap: "연합뉴스",
};

// [유틸] RSS 본문 HTML에서 이미지 태그 추출
const extractImageFromSummary = (rawString: string): string | null => {
  if (!rawString) return null;
  const txt = document.createElement("textarea");
  txt.innerHTML = rawString;
  const decoded = txt.value;
  const imgMatch = decoded.match(/<img[^>]+src=["']([^"']+)["']/i);
  return imgMatch ? imgMatch[1] : null;
};

// [유틸] RSS 본문 HTML에서 순수 텍스트만 추출
const extractTextFromSummary = (rawString: string): string => {
  if (!rawString) return "";
  const txt = document.createElement("textarea");
  txt.innerHTML = rawString;
  const decoded = txt.value;
  const doc = new DOMParser().parseFromString(decoded, "text/html");
  return (doc.body.textContent || "").replace(/\s+/g, " ").trim();
};

interface NewsItem {
  id: number;
  title: string;
  summary: string;
  ai_summary: string | null;
  source: string;
  published_at: string;
  image_url: string | null;
  credibility_score: number | null;
  credibility_label: string | null;
  is_analyzed: boolean;
}

// [UI] 신뢰도 점수 기반 뱃지 컴포넌트
const CredibilityBadge = ({
  label,
  score,
}: {
  label: string | null;
  score: number | null;
}) => {
  if (!label) return null;
  const color =
    score != null && score >= 0.7
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : score != null && score >= 0.4
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-red-50 text-red-700 border-red-200";
  return (
    <span
      className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${color}`}
    >
      {label}
    </span>
  );
};

// [상수] 노출할 언론사 목록 (분야별 카테고리 제거됨)
const SOURCES = ["전체", ...Object.values(SOURCE_NAME_MAP)];

export default function MainPage() {
  // [로직] 초기 상태 캐시 로드 헬퍼 (React의 Lazy Initialization 활용)
  const loadCache = <T,>(key: string, fallback: T): T => {
    const cached = sessionStorage.getItem("main_news_cache");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed[key] !== undefined) return parsed[key];
      } catch (e) {
        console.error("Cache parsing error:", e);
      }
    }
    return fallback;
  };

  // 상태 관리: 데이터 및 UI (카테고리 상태 제거)
  const [newsList, setNewsList] = useState<NewsItem[]>(() =>
    loadCache("newsList", []),
  );
  const [page, setPage] = useState<number>(() => loadCache("page", 1));
  const [hasMore, setHasMore] = useState<boolean>(() =>
    loadCache("hasMore", true),
  );
  const [selectedSource, setSelectedSource] = useState<string>(() =>
    loadCache("selectedSource", "전체"),
  );

  const [loading, setLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const observer = useRef<IntersectionObserver | null>(null);

  // [로직] 마지막 리스트 아이템 감지용 Callback Ref
  const lastElementRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (loading || isLoadingMore) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setPage((prev) => prev + 1);
        }
      });
      if (node) observer.current.observe(node);
    },
    [loading, isLoadingMore, hasMore],
  );

  // [API] 뉴스 목록 Fetch
  const fetchNews = async (pageNumber: number, sourceName: string) => {
    try {
      if (pageNumber === 1) setLoading(true);
      else setIsLoadingMore(true);

      // 언론사 한글명을 다시 API용 ID(key)로 변환
      const sourceId = Object.keys(SOURCE_NAME_MAP).find(
        (key) => SOURCE_NAME_MAP[key] === sourceName,
      );
      const sourceParam = sourceId ? `&source=${sourceId}` : "";

      const response = await api.get(
        `/api/news?page=${pageNumber}${sourceParam}`,
      );
      const newItems = response.data.items || [];

      if (newItems.length === 0) {
        setHasMore(false);
      } else {
        setNewsList((prev) =>
          pageNumber === 1 ? newItems : [...prev, ...newItems],
        );
      }
    } catch (err) {
      console.error("데이터 로드 실패:", err);
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  };

  // 1. [Effect] 마운트 및 스크롤 이벤트 (캐시 유무에 따른 최초 로드)
  useEffect(() => {
    const cachedData = sessionStorage.getItem("main_news_cache");
    if (!cachedData) {
      // 최초 진입 시 로드
      fetchNews(1, selectedSource);
    } else {
      // 캐시가 존재한다면 DOM이 렌더링된 직후 스크롤 위치만 복원
      setTimeout(() => {
        const scrollY = sessionStorage.getItem("main_news_scroll");
        if (scrollY) window.scrollTo(0, parseInt(scrollY, 10));
      }, 100);
    }

    // 스크롤 위치 실시간 저장
    const handleScroll = () => {
      sessionStorage.setItem("main_news_scroll", window.scrollY.toString());
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // 2. [Effect] 필터가 변경되었을 때 (1페이지부터 재요청)
  const isFilterFirstRun = useRef(true);
  useEffect(() => {
    // 최초 마운트 시에는 실행하지 않음 (초기값으로 인한 트리거 방지)
    if (isFilterFirstRun.current) {
      isFilterFirstRun.current = false;
      return;
    }
    setNewsList([]);
    setPage(1);
    setHasMore(true);
    window.scrollTo(0, 0); // 새 필터 적용 시 스크롤 맨 위로
    fetchNews(1, selectedSource);
  }, [selectedSource]);

  // 3. [Effect] 페이지 번호 변경 시 추가 데이터 로드 (무한 스크롤)
  const isPageFirstRun = useRef(true);
  useEffect(() => {
    if (isPageFirstRun.current) {
      isPageFirstRun.current = false;
      return;
    }
    // 1페이지는 이미 처리했으므로 2페이지 이상일 때만 호출
    if (page > 1) {
      fetchNews(page, selectedSource);
    }
  }, [page]);

  // 4. [Effect] 상태가 변경될 때마다 sessionStorage 업데이트 (뒤로가기 대비용)
  useEffect(() => {
    sessionStorage.setItem(
      "main_news_cache",
      JSON.stringify({
        newsList,
        page,
        hasMore,
        selectedSource,
      }),
    );
  }, [newsList, page, hasMore, selectedSource]);

  return (
    <div className="flex flex-col gap-8 mt-8">
      {/* 상단 헤더, 검색창 및 드롭다운 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end pb-4 border-b-2 border-slate-900 gap-4 relative">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            오늘의 뉴스
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            AI가 분석한 실시간 뉴스 목록입니다.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          {/* [UI] 언론사 드롭다운 메뉴 */}
          <div className="group relative w-full sm:w-auto z-30">
            <button className="w-full flex justify-between sm:justify-center items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-semibold transition-colors">
              <span>
                {selectedSource === "전체" ? "언론사 전체" : selectedSource}
              </span>
              <svg
                className="w-4 h-4 group-hover:rotate-180 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            <div className="absolute right-0 top-full pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
              <div className="bg-white border border-slate-200 rounded-xl shadow-xl w-32 py-2 flex flex-col max-h-60 overflow-y-auto">
                {SOURCES.map((src) => (
                  <button
                    key={src}
                    onClick={() => setSelectedSource(src)}
                    className={`px-4 py-2 text-sm text-left hover:bg-sky-50 ${
                      selectedSource === src
                        ? "text-sky-600 font-bold bg-sky-50/50"
                        : "text-slate-600"
                    }`}
                  >
                    {src}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 리스트 렌더링 */}
      <div className="grid gap-6 z-10 relative">
        {newsList.map((news, index) => {
          const displayImage =
            news.image_url || extractImageFromSummary(news.summary);
          const displaySummary =
            news.ai_summary || extractTextFromSummary(news.summary);

          const isLast = newsList.length === index + 1;

          return (
            <div
              key={news.id}
              ref={isLast ? lastElementRef : null}
              className="group bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-sky-200 transition-all duration-300"
            >
              <Link
                to={`/news/${news.id}`}
                className="flex flex-col-reverse md:flex-row gap-6 md:gap-8"
              >
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-3 flex-wrap">
                      <span className="bg-sky-50 text-sky-700 border border-sky-100 text-[11px] font-bold px-2.5 py-1 rounded-md">
                        {SOURCE_NAME_MAP[news.source?.toLowerCase()] ||
                          news.source?.toUpperCase() ||
                          "알 수 없음"}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">
                        {news.published_at?.split("T")[0]}
                      </span>
                      {news.is_analyzed && (
                        <CredibilityBadge
                          label={news.credibility_label}
                          score={news.credibility_score}
                        />
                      )}
                    </div>

                    <h2 className="text-xl md:text-2xl font-bold text-slate-900 group-hover:text-sky-600 mb-3 leading-snug transition-colors">
                      {news.title}
                    </h2>

                    <p
                      className={`text-[15px] mb-2 line-clamp-3 leading-relaxed ${news.ai_summary ? "text-slate-700" : "text-slate-500"}`}
                    >
                      {news.ai_summary && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-600 bg-sky-50 border border-sky-100 px-1.5 py-0.5 rounded mr-2 align-middle">
                          ✨ AI 요약
                        </span>
                      )}
                      {displaySummary || "뉴스 요약 정보가 없습니다."}
                    </p>
                  </div>
                </div>

                {displayImage && (
                  <div className="w-full md:w-56 h-40 shrink-0 overflow-hidden rounded-xl border border-slate-100 relative">
                    <img
                      src={displayImage}
                      alt="뉴스 썸네일"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        (
                          e.target as HTMLImageElement
                        ).parentElement!.style.display = "none";
                      }}
                    />
                  </div>
                )}
              </Link>
            </div>
          );
        })}
      </div>

      {/* 로딩 인디케이터 */}
      {(loading || isLoadingMore) && (
        <div className="py-10 text-center text-slate-400 font-medium animate-pulse">
          데이터를 불러오는 중...
        </div>
      )}
      {!hasMore && newsList.length > 0 && (
        <div className="py-10 text-center text-slate-400 text-sm">
          모든 뉴스를 불러왔습니다.
        </div>
      )}
    </div>
  );
}
