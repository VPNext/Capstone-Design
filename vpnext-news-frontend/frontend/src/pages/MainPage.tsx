import { useEffect, useState, useRef, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../api";

// ─── 언론사 매핑 ────────────────────────────────────────────────────────────
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

// ─── 언론사별 배지 색상 (CSS class 활용) ────────────────────────────────────
const SOURCE_BADGE_CLASS: Record<string, string> = {
  hani: "badge-hani",
  khan: "badge-khan",
  chosun: "badge-chosun",
  joongang: "badge-joongang",
  donga: "badge-donga",
  mbc: "badge-mbc",
  kbs: "badge-kbs",
  sbs: "badge-sbs",
  ytn: "badge-ytn",
  hankyung: "badge-hankyung",
  mk: "badge-mk",
  yonhap: "badge-yonhap",
};

// ─── 유틸 ────────────────────────────────────────────────────────────────────
const extractImageFromSummary = (rawString: string): string | null => {
  if (!rawString) return null;
  const txt = document.createElement("textarea");
  txt.innerHTML = rawString;
  const decoded = txt.value;
  const imgMatch = decoded.match(/<img[^>]+src=["']([^"']+)["']/i);
  return imgMatch ? imgMatch[1] : null;
};

const extractTextFromSummary = (rawString: string): string => {
  if (!rawString) return "";
  const txt = document.createElement("textarea");
  txt.innerHTML = rawString;
  const decoded = txt.value;
  const doc = new DOMParser().parseFromString(decoded, "text/html");
  return (doc.body.textContent || "").replace(/\s+/g, " ").trim();
};

// ─── 타입 ────────────────────────────────────────────────────────────────────
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

// ─── 검색어 하이라이트 ────────────────────────────────────────────────────────
const HighlightText = ({
  text,
  keyword,
}: {
  text: string;
  keyword: string | null;
}) => {
  if (!keyword || !text) return <>{text}</>;
  const parts = text.split(new RegExp(`(${keyword})`, "gi"));
  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === keyword.toLowerCase() ? (
          <mark
            key={index}
            className="bg-amber-300 text-slate-900 rounded-sm px-0.5 font-bold"
          >
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
};

// ─── 신뢰도 배지 ──────────────────────────────────────────────────────────────
const CredibilityBadge = ({
  label,
  score,
}: {
  label: string | null;
  score: number | null;
}) => {
  if (!label) return null;
  const isHigh = score != null && score >= 0.7;
  const isMed = score != null && score >= 0.4;
  const dot = isHigh ? "#10B981" : isMed ? "#F59E0B" : "#EF4444";
  const fg = isHigh ? "#065F46" : isMed ? "#78350F" : "#7F1D1D";
  const bg = isHigh ? "#ECFDF5" : isMed ? "#FFFBEB" : "#FEF2F2";
  const bdr = isHigh ? "#A7F3D0" : isMed ? "#FDE68A" : "#FECACA";
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-full"
      style={{ background: bg, color: fg, border: `1px solid ${bdr}` }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ background: dot }}
      />
      {label}
    </span>
  );
};

// ─── 상수 ────────────────────────────────────────────────────────────────────
const SOURCES = ["전체", ...Object.values(SOURCE_NAME_MAP)];

// ─── 스켈레톤 카드 ────────────────────────────────────────────────────────────
const SkeletonCard = ({ featured = false }: { featured?: boolean }) => (
  <div
    className="bg-white rounded-2xl overflow-hidden border"
    style={{
      borderColor: "#E4DDD3",
      boxShadow: "0 1px 8px rgba(22,19,17,0.06)",
    }}
  >
    {featured ? (
      <>
        <div className="shimmer h-72 w-full" />
        <div className="p-6 flex flex-col gap-3">
          <div className="flex gap-2">
            <div className="shimmer h-5 w-14 rounded-full" />
            <div className="shimmer h-5 w-20 rounded-full" />
          </div>
          <div className="shimmer h-7 w-full rounded" />
          <div className="shimmer h-7 w-5/6 rounded" />
          <div className="shimmer h-4 w-full rounded" />
          <div className="shimmer h-4 w-3/4 rounded" />
        </div>
      </>
    ) : (
      <div className="flex">
        <div className="flex-1 p-5 flex flex-col gap-2.5">
          <div className="flex gap-2">
            <div className="shimmer h-5 w-12 rounded-full" />
            <div className="shimmer h-5 w-16 rounded-full" />
          </div>
          <div className="shimmer h-5 w-full rounded" />
          <div className="shimmer h-5 w-4/5 rounded" />
          <div className="shimmer h-3.5 w-full rounded mt-1" />
          <div className="shimmer h-3.5 w-2/3 rounded" />
        </div>
        <div className="shimmer w-36 shrink-0" style={{ minHeight: "108px" }} />
      </div>
    )}
  </div>
);

// ─── 메인 페이지 ─────────────────────────────────────────────────────────────
export default function MainPage() {
  // ── 캐시 로드 헬퍼 (로직 원본 유지) ──
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

  const [searchParams] = useSearchParams();
  const keyword = searchParams.get("q") || "";

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

  const fetchNews = async (pageNumber: number, sourceName: string) => {
    try {
      if (pageNumber === 1) setLoading(true);
      else setIsLoadingMore(true);
      const sourceId = Object.keys(SOURCE_NAME_MAP).find(
        (key) => SOURCE_NAME_MAP[key] === sourceName,
      );
      const sourceParam = sourceId ? `&source=${sourceId}` : "";
      const response = await api.get(
        `/api/news?page=${pageNumber}${sourceParam}`,
      );
      const newItems = response.data.items || [];

      // 분석되지 않은 뉴스만 표시 (is_analyzed === false)
      const unanalyzedItems = newItems.filter(
        (item: NewsItem) => item.is_analyzed === false,
      );

      if (newItems.length === 0) {
        setHasMore(false);
      } else {
        setNewsList((prev) =>
          pageNumber === 1 ? unanalyzedItems : [...prev, ...unanalyzedItems],
        );
      }
    } catch (err) {
      console.error("데이터 로드 실패:", err);
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    const cachedData = sessionStorage.getItem("main_news_cache");
    if (!cachedData) {
      fetchNews(1, selectedSource);
    } else {
      setTimeout(() => {
        const scrollY = sessionStorage.getItem("main_news_scroll");
        if (scrollY) window.scrollTo(0, parseInt(scrollY, 10));
      }, 100);
    }
    const handleScroll = () => {
      sessionStorage.setItem("main_news_scroll", window.scrollY.toString());
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isFilterFirstRun = useRef(true);
  useEffect(() => {
    if (isFilterFirstRun.current) {
      isFilterFirstRun.current = false;
      return;
    }
    setNewsList([]);
    setPage(1);
    setHasMore(true);
    window.scrollTo(0, 0);
    fetchNews(1, selectedSource);
  }, [selectedSource]);

  const isPageFirstRun = useRef(true);
  useEffect(() => {
    if (isPageFirstRun.current) {
      isPageFirstRun.current = false;
      return;
    }
    if (page > 1) fetchNews(page, selectedSource);
  }, [page]);

  useEffect(() => {
    sessionStorage.setItem(
      "main_news_cache",
      JSON.stringify({ newsList, page, hasMore, selectedSource }),
    );
  }, [newsList, page, hasMore, selectedSource]);

  const filteredNews = keyword
    ? newsList.filter((news) => {
        const titleMatch = news.title.includes(keyword);
        const plainSummary = extractTextFromSummary(news.summary);
        const summaryMatch = (news.ai_summary || plainSummary).includes(
          keyword,
        );
        return titleMatch || summaryMatch;
      })
    : newsList;

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col mt-8"
      style={{ fontFamily: "'Noto Sans KR', sans-serif" }}
    >
      {/* ─── 페이지 헤더 ──────────────────────────────────────────── */}
      <div className="mb-7">
        <div
          className="flex flex-col md:flex-row md:items-end justify-between gap-3 mb-5 pb-4"
          style={{ borderBottom: "2px solid #161311" }}
        >
          <div>
            <p
              className="text-[10px] font-black uppercase tracking-[0.2em] mb-1"
              style={{ color: "#C13026" }}
            >
              {keyword ? "검색 결과" : "UNANALYZED NEWS"}
            </p>
            <h1
              className="text-3xl font-black"
              style={{
                fontFamily: "'Noto Serif KR', serif",
                color: "#161311",
                lineHeight: 1.2,
              }}
            >
              {keyword ? `"${keyword}"` : "오늘의 뉴스"}
            </h1>
            <p className="text-sm mt-1.5" style={{ color: "#5C5853" }}>
              {keyword
                ? "현재 로드된 데이터 내 검색 결과입니다"
                : "AI 분석 전 최신 뉴스 목록입니다 — 클릭해서 AI 분석을 시작해보세요"}
            </p>
          </div>
          <div className="hidden md:flex flex-col items-end gap-0.5">
            <p className="text-xs" style={{ color: "#9C9891" }}>
              {new Date().toLocaleDateString("ko-KR", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
            {filteredNews.length > 0 && (
              <p className="text-xs font-bold" style={{ color: "#5C5853" }}>
                총 {filteredNews.length}개 기사
              </p>
            )}
          </div>
        </div>

        {/* 언론사 필터 — 수평 스크롤 pill 탭 */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {SOURCES.map((src) => {
            const isActive = selectedSource === src;
            return (
              <button
                key={src}
                onClick={() => setSelectedSource(src)}
                className="px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap shrink-0 transition-all duration-200 border"
                style={
                  isActive
                    ? {
                        background: "#161311",
                        color: "#fff",
                        borderColor: "#161311",
                        boxShadow: "0 2px 8px rgba(22,19,17,0.2)",
                      }
                    : {
                        background: "#fff",
                        color: "#5C5853",
                        borderColor: "#E4DDD3",
                      }
                }
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.borderColor =
                      "#161311";
                    (e.currentTarget as HTMLElement).style.color = "#161311";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.borderColor =
                      "#E4DDD3";
                    (e.currentTarget as HTMLElement).style.color = "#5C5853";
                  }
                }}
              >
                {src === "전체" ? "📰 전체" : src}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── 초기 로딩 스켈레톤 ──────────────────────────────────── */}
      {loading && (
        <div className="flex flex-col gap-4">
          <SkeletonCard featured />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {/* ─── 뉴스 리스트 ─────────────────────────────────────────── */}
      {!loading && (
        <div className="flex flex-col gap-3.5">
          {filteredNews.map((news, index) => {
            const displayImage =
              news.image_url || extractImageFromSummary(news.summary);
            const displaySummary =
              news.ai_summary || extractTextFromSummary(news.summary);
            const isLast = filteredNews.length === index + 1;
            const sourceKey = news.source?.toLowerCase();
            const sourceName =
              SOURCE_NAME_MAP[sourceKey] ||
              news.source?.toUpperCase() ||
              "알 수 없음";
            const badgeClass = SOURCE_BADGE_CLASS[sourceKey] || "badge-default";

            /* ── 피쳐드 첫 번째 카드 ── */
            if (index === 0) {
              return (
                <div
                  key={news.id}
                  ref={isLast ? lastElementRef : null}
                  className="mb-4 group"
                >
                  <Link to={`/news/${news.id}`} className="block">
                    <article
                      className="rounded-3xl overflow-hidden bg-white transition-all duration-400"
                      style={{
                        border: "1px solid #E4DDD3",
                        boxShadow: "0 2px 20px rgba(22,19,17,0.08)",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.boxShadow =
                          "0 12px 48px rgba(22,19,17,0.16)";
                        (e.currentTarget as HTMLElement).style.borderColor =
                          "rgba(193,48,38,0.25)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.boxShadow =
                          "0 2px 20px rgba(22,19,17,0.08)";
                        (e.currentTarget as HTMLElement).style.borderColor =
                          "#E4DDD3";
                      }}
                    >
                      {/* 히어로 이미지 */}
                      {displayImage ? (
                        <div className="relative h-64 sm:h-80 md:h-96 overflow-hidden">
                          <img
                            src={displayImage}
                            alt="뉴스 메인 이미지"
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            onError={(e) => {
                              (
                                e.target as HTMLImageElement
                              ).parentElement!.style.display = "none";
                            }}
                          />
                          <div
                            className="absolute inset-0"
                            style={{
                              background:
                                "linear-gradient(to top, rgba(22,19,17,0.75) 0%, rgba(22,19,17,0.1) 60%, transparent 100%)",
                            }}
                          />
                          {/* 배지 (이미지 위) */}
                          <div className="absolute top-4 left-5 flex items-center gap-2">
                            <span
                              className={`${badgeClass} text-[11px] font-black px-3 py-1.5 rounded-full`}
                            >
                              {sourceName}
                            </span>
                            {news.is_analyzed && (
                              <span
                                className="text-[10px] font-black px-2.5 py-1 rounded-full"
                                style={{
                                  background: "rgba(255,255,255,0.9)",
                                  color: "#C13026",
                                }}
                              >
                                AI 분석완료
                              </span>
                            )}
                          </div>
                          {/* 제목 (이미지 위) */}
                          <div className="absolute bottom-5 left-5 right-5">
                            <h2
                              className="text-2xl sm:text-3xl font-black text-white line-clamp-2 leading-snug"
                              style={{
                                fontFamily: "'Noto Serif KR', serif",
                                textShadow: "0 2px 8px rgba(0,0,0,0.4)",
                              }}
                            >
                              <HighlightText
                                text={news.title}
                                keyword={keyword}
                              />
                            </h2>
                          </div>
                        </div>
                      ) : (
                        /* 이미지 없을 때 — 어두운 배경 헤더 */
                        <div
                          className="px-8 py-10"
                          style={{ background: "#161311" }}
                        >
                          <div className="flex items-center gap-2 mb-4">
                            <span
                              className={`${badgeClass} text-[11px] font-black px-3 py-1.5 rounded-full`}
                            >
                              {sourceName}
                            </span>
                            {news.is_analyzed && (
                              <span
                                className="text-[10px] font-black px-2.5 py-1 rounded-full"
                                style={{ background: "#C13026", color: "#fff" }}
                              >
                                AI 분석완료
                              </span>
                            )}
                          </div>
                          <h2
                            className="text-2xl sm:text-3xl font-black text-white line-clamp-3 leading-snug"
                            style={{ fontFamily: "'Noto Serif KR', serif" }}
                          >
                            <HighlightText
                              text={news.title}
                              keyword={keyword}
                            />
                          </h2>
                        </div>
                      )}

                      {/* 본문 영역 */}
                      <div className="p-6 md:p-8">
                        <div className="flex items-center flex-wrap gap-2.5 mb-3">
                          <span
                            className="text-xs"
                            style={{ color: "#9C9891" }}
                          >
                            {news.published_at?.split("T")[0]}
                          </span>
                          {news.is_analyzed && (
                            <CredibilityBadge
                              label={news.credibility_label}
                              score={news.credibility_score}
                            />
                          )}
                        </div>
                        {/* 이미지가 없을 때만 제목을 여기에 표시 */}
                        {!displayImage && <></>}
                        {displaySummary && (
                          <p
                            className="text-[15px] leading-relaxed line-clamp-2"
                            style={{ color: "#3C3A36" }}
                          >
                            {news.ai_summary && (
                              <span
                                className="inline-flex items-center gap-1 text-[10px] font-black text-white rounded mr-2 align-middle"
                                style={{
                                  background: "#1A55A8",
                                  padding: "2px 7px",
                                }}
                              >
                                ✨ AI
                              </span>
                            )}
                            <HighlightText
                              text={displaySummary}
                              keyword={keyword}
                            />
                          </p>
                        )}
                        <div
                          className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold transition-all duration-200 group-hover:gap-2.5"
                          style={{ color: "#C13026" }}
                        >
                          기사 읽기
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2.5}
                              d="M17 8l4 4m0 0l-4 4m4-4H3"
                            />
                          </svg>
                        </div>
                      </div>
                    </article>
                  </Link>
                </div>
              );
            }

            /* ── 일반 카드 ── */
            return (
              <div
                key={news.id}
                ref={isLast ? lastElementRef : null}
                className="group"
              >
                <Link to={`/news/${news.id}`} className="block">
                  <article
                    className="flex bg-white rounded-2xl overflow-hidden transition-all duration-300"
                    style={{
                      border: "1px solid #E4DDD3",
                      boxShadow: "0 1px 6px rgba(22,19,17,0.05)",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.boxShadow =
                        "0 6px 24px rgba(22,19,17,0.12)";
                      (e.currentTarget as HTMLElement).style.borderColor =
                        "rgba(193,48,38,0.3)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.boxShadow =
                        "0 1px 6px rgba(22,19,17,0.05)";
                      (e.currentTarget as HTMLElement).style.borderColor =
                        "#E4DDD3";
                    }}
                  >
                    {/* 왼쪽 컨텐츠 */}
                    <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between min-w-0">
                      <div>
                        <div className="flex items-center flex-wrap gap-2 mb-2.5">
                          <span
                            className={`${badgeClass} text-[10px] font-black px-2.5 py-1 rounded-full`}
                          >
                            {sourceName}
                          </span>
                          <span
                            className="text-[11px]"
                            style={{ color: "#9C9891" }}
                          >
                            {news.published_at?.split("T")[0]}
                          </span>
                          {news.is_analyzed && (
                            <CredibilityBadge
                              label={news.credibility_label}
                              score={news.credibility_score}
                            />
                          )}
                        </div>
                        <h2
                          className="font-bold leading-snug mb-2 line-clamp-2 transition-colors duration-200"
                          style={{
                            fontFamily: "'Noto Serif KR', serif",
                            fontSize: "16px",
                            color: "#161311",
                          }}
                        >
                          <HighlightText text={news.title} keyword={keyword} />
                        </h2>
                        {displaySummary && (
                          <p
                            className="text-[13px] leading-relaxed line-clamp-2"
                            style={{ color: "#6B6562" }}
                          >
                            {news.ai_summary && (
                              <span
                                className="inline-flex items-center gap-1 text-[9px] font-black text-white rounded mr-1.5 align-middle"
                                style={{
                                  background: "#1A55A8",
                                  padding: "2px 5px",
                                }}
                              >
                                AI
                              </span>
                            )}
                            <HighlightText
                              text={displaySummary}
                              keyword={keyword}
                            />
                          </p>
                        )}
                      </div>
                    </div>
                    {/* 오른쪽 이미지 */}
                    {displayImage && (
                      <div
                        className="w-28 sm:w-40 shrink-0 overflow-hidden relative"
                        style={{ minHeight: "100px" }}
                      >
                        <img
                          src={displayImage}
                          alt="뉴스 썸네일"
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          style={{ minHeight: "100px" }}
                          onError={(e) => {
                            (
                              e.target as HTMLImageElement
                            ).parentElement!.style.display = "none";
                          }}
                        />
                      </div>
                    )}
                  </article>
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── 검색 결과 없음 + 더 불러오기 ──────────────────────────── */}
      {keyword &&
        filteredNews.length === 0 &&
        newsList.length > 0 &&
        hasMore && (
          <div
            className="mt-4 py-12 flex flex-col items-center gap-4 rounded-3xl"
            style={{ background: "#fff", border: "1px solid #E4DDD3" }}
          >
            <span style={{ fontSize: "48px" }}>🔍</span>
            <p className="font-medium" style={{ color: "#5C5853" }}>
              현재 로드된 뉴스 중에는 검색 결과가 없습니다
            </p>
            <button
              onClick={() => setPage((p) => p + 1)}
              className="px-6 py-3 rounded-full text-sm font-black transition-all duration-200"
              style={{
                background: "#161311",
                color: "#fff",
                boxShadow: "0 2px 12px rgba(22,19,17,0.2)",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLElement).style.background = "#C13026")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.background = "#161311")
              }
            >
              과거 뉴스 더 불러와서 찾기
            </button>
          </div>
        )}

      {/* ─── 추가 로딩 중 스켈레톤 ──────────────────────────────────── */}
      {isLoadingMore && (
        <div className="flex flex-col gap-3.5 mt-3.5">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {/* ─── 기사 더보기 버튼 ────────────────────────────────────────
           IntersectionObserver 로도 자동 로드되지만,
           수동으로도 누를 수 있도록 명시적 버튼 제공               */}
      {!loading && !isLoadingMore && hasMore && filteredNews.length > 0 && (
        <div className="flex justify-center mt-8 mb-4">
          <button
            onClick={() => setPage((p) => p + 1)}
            className="group flex items-center gap-2.5 text-sm font-black rounded-full transition-all duration-300"
            style={{
              padding: "14px 32px",
              background: "#fff",
              color: "#161311",
              border: "2px solid #161311",
              boxShadow: "0 2px 8px rgba(22,19,17,0.08)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "#161311";
              (e.currentTarget as HTMLElement).style.color = "#fff";
              (e.currentTarget as HTMLElement).style.boxShadow =
                "0 8px 28px rgba(22,19,17,0.2)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "#fff";
              (e.currentTarget as HTMLElement).style.color = "#161311";
              (e.currentTarget as HTMLElement).style.boxShadow =
                "0 2px 8px rgba(22,19,17,0.08)";
            }}
          >
            기사 더보기
            <svg
              className="w-4 h-4 transition-transform duration-300 group-hover:translate-y-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>
      )}

      {/* ─── 마지막 상태 ──────────────────────────────────────────── */}
      {!hasMore && newsList.length > 0 && (
        <div
          className="py-10 flex flex-col items-center gap-3"
          style={{ color: "#9C9891" }}
        >
          <div className="flex items-center gap-3">
            <div className="h-px w-16" style={{ background: "#E4DDD3" }} />
            <span className="text-sm font-medium">
              모든 뉴스를 불러왔습니다
            </span>
            <div className="h-px w-16" style={{ background: "#E4DDD3" }} />
          </div>
        </div>
      )}
    </div>
  );
}
