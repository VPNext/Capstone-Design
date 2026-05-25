import { useEffect, useState, useRef, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../api";

// ─── 언론사 매핑 ─────────────────────────────────────────────────────────────
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

// ─── 하이라이트 ──────────────────────────────────────────────────────────────
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
          <mark key={index}>{part}</mark>
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

// ─── 신뢰도 점수 미터 ─────────────────────────────────────────────────────────
const ScoreMeter = ({ score }: { score: number | null }) => {
  if (score == null) return null;
  const pct = Math.round(score * 100);
  const isHigh = score >= 0.7;
  const isMed = score >= 0.4;
  const barColor = isHigh ? "#10B981" : isMed ? "#F59E0B" : "#EF4444";
  const textColor = isHigh ? "#065F46" : isMed ? "#78350F" : "#7F1D1D";
  return (
    <div className="flex items-center gap-2 shrink-0">
      <div
        className="relative w-16 h-1.5 rounded-full overflow-hidden"
        style={{ background: "#E4DDD3" }}
      >
        <div
          className="absolute left-0 top-0 h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: barColor,
            transition: "width 0.7s cubic-bezier(0.22,1,0.36,1)",
          }}
        />
      </div>
      <span
        className="text-[11px] font-black tabular-nums"
        style={{ color: textColor }}
      >
        {pct}%
      </span>
    </div>
  );
};

// ─── 상수 ────────────────────────────────────────────────────────────────────
const SOURCES = ["전체", ...Object.values(SOURCE_NAME_MAP)];

// ─── 스켈레톤 ────────────────────────────────────────────────────────────────
const SkeletonCard = ({ featured = false }: { featured?: boolean }) => (
  <div
    className="bg-white overflow-hidden"
    style={{
      border: "1px solid #E4DDD3",
      borderRadius: "20px",
      boxShadow: "0 1px 8px rgba(22,19,17,0.05)",
    }}
  >
    {featured ? (
      <>
        <div className="shimmer h-72 w-full" />
        <div className="p-6 flex flex-col gap-3">
          <div className="flex gap-2">
            <div className="shimmer h-5 w-14 rounded-full" />
            <div className="shimmer h-5 w-20 rounded-full" />
            <div className="shimmer h-5 w-16 rounded-full" />
          </div>
          <div className="shimmer h-7 w-full rounded-lg" />
          <div className="shimmer h-7 w-4/5 rounded-lg" />
          <div className="shimmer h-4 w-full rounded" />
          <div className="shimmer h-4 w-3/4 rounded" />
        </div>
      </>
    ) : (
      <div className="flex">
        <div className="w-1 shrink-0 shimmer" />
        <div className="flex-1 p-5 flex flex-col gap-2.5">
          <div className="flex gap-2">
            <div className="shimmer h-5 w-12 rounded-full" />
            <div className="shimmer h-5 w-16 rounded-full" />
            <div className="shimmer h-5 w-14 rounded-full" />
          </div>
          <div className="shimmer h-5 w-full rounded-lg" />
          <div className="shimmer h-5 w-4/5 rounded-lg" />
          <div className="shimmer h-3.5 w-full rounded mt-1" />
          <div className="shimmer h-3.5 w-2/3 rounded" />
        </div>
        <div className="shimmer w-40 shrink-0" style={{ minHeight: "120px" }} />
      </div>
    )}
  </div>
);

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────
export default function AnalyzedNewsPage() {
  const loadCache = <T,>(key: string, fallback: T): T => {
    const cached = sessionStorage.getItem("analyzed_news_cache");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed[key] !== undefined) return parsed[key];
      } catch (e) {}
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

  const [autoLoadCount, setAutoLoadCount] = useState(0);
  const [showLoadMoreBtn, setShowLoadMoreBtn] = useState(false);
  const MAX_AUTO_LOAD = 2;

  const observer = useRef<IntersectionObserver | null>(null);

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
            setPage((prev) => prev + 1);
          }
        }
      });
      if (node) observer.current.observe(node);
    },
    [loading, isLoadingMore, hasMore, showLoadMoreBtn, autoLoadCount],
  );

  const handleLoadMoreClick = () => {
    setShowLoadMoreBtn(false);
    setAutoLoadCount(0);
    setPage((prev) => prev + 1);
  };

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
      const analyzedItems = newItems.filter(
        (item: NewsItem) => item.is_analyzed === true,
      );
      if (newItems.length === 0) {
        setHasMore(false);
      } else {
        setNewsList((prev) =>
          pageNumber === 1 ? analyzedItems : [...prev, ...analyzedItems],
        );
      }
    } catch (err) {
      console.error("분석 뉴스 데이터 로드 실패:", err);
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    const cachedData = sessionStorage.getItem("analyzed_news_cache");
    if (!cachedData) fetchNews(1, selectedSource);
    else {
      setTimeout(() => {
        const scrollY = sessionStorage.getItem("analyzed_news_scroll");
        if (scrollY) window.scrollTo(0, parseInt(scrollY, 10));
      }, 100);
    }
    const handleScroll = () =>
      sessionStorage.setItem("analyzed_news_scroll", window.scrollY.toString());
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
    setAutoLoadCount(0);
    setShowLoadMoreBtn(false);
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
      "analyzed_news_cache",
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

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col mt-8"
      style={{ fontFamily: "'Noto Sans KR', sans-serif" }}
    >
      {/* ─── 배너 헤더 ─────────────────────────────────────────────── */}
      <div className="mb-8">
        <div
          className="relative overflow-hidden mb-6 px-7 py-9"
          style={{
            borderRadius: "24px",
            background:
              "linear-gradient(135deg, #0C1F3F 0%, #143268 55%, #0C1F3F 100%)",
            boxShadow: "0 8px 40px rgba(12,31,63,0.28)",
          }}
        >
          {/* Decorative orbs */}
          <div
            className="absolute top-0 right-0 w-80 h-80 rounded-full pointer-events-none"
            style={{
              background:
                "radial-gradient(circle, rgba(56,189,248,0.09) 0%, transparent 70%)",
              transform: "translate(25%, -25%)",
            }}
          />
          <div
            className="absolute bottom-0 left-0 w-52 h-52 rounded-full pointer-events-none"
            style={{
              background:
                "radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)",
              transform: "translate(-25%, 25%)",
            }}
          />

          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div
                className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 mb-4"
                style={{
                  background: "rgba(56,189,248,0.12)",
                  border: "1px solid rgba(56,189,248,0.25)",
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{ background: "#38BDF8" }}
                />
                <span
                  className="font-black text-[10px] uppercase tracking-widest"
                  style={{ color: "#38BDF8" }}
                >
                  AI ANALYZED
                </span>
              </div>
              <h1
                className="font-black text-white mb-2"
                style={{
                  fontFamily: "'Noto Serif KR', serif",
                  fontSize: "clamp(22px, 4vw, 34px)",
                  lineHeight: 1.2,
                  letterSpacing: "-0.02em",
                }}
              >
                {keyword ? `"${keyword}" 분석 결과` : "AI 분석 뉴스"}
              </h1>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "rgba(255,255,255,0.42)" }}
              >
                AI 분석이 완료된 뉴스 — 신뢰도, 요약, 핵심 인물 정보를
                확인하세요
              </p>
            </div>
            {filteredNews.length > 0 && (
              <div
                className="flex items-center gap-3 px-5 py-3 shrink-0"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "16px",
                }}
              >
                <span className="text-3xl font-black text-white">
                  {filteredNews.length}
                </span>
                <span
                  className="text-sm leading-tight"
                  style={{ color: "rgba(255,255,255,0.4)" }}
                >
                  개<br />
                  분석 완료
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Sub-header + filters */}
        <div
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4"
          style={{ borderBottom: "2px solid #161311" }}
        >
          <div>
            <p
              className="text-[10px] font-black uppercase tracking-[0.2em] mb-0.5"
              style={{ color: "#1A55A8" }}
            >
              {keyword ? "검색 결과" : "ANALYZED NEWS"}
            </p>
            <p className="text-sm font-medium" style={{ color: "#9C9891" }}>
              {keyword
                ? "현재 로드된 분석 뉴스 내 검색 결과입니다"
                : "AI가 심층 분석한 뉴스 목록입니다"}
            </p>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {SOURCES.map((src) => {
            const isActive = selectedSource === src;
            return (
              <button
                key={src}
                onClick={() => setSelectedSource(src)}
                className="px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap shrink-0 transition-all duration-200"
                style={
                  isActive
                    ? {
                        background: "#0C1F3F",
                        color: "#fff",
                        border: "1.5px solid #0C1F3F",
                        boxShadow: "0 2px 10px rgba(12,31,63,0.25)",
                      }
                    : {
                        background: "#fff",
                        color: "#5C5853",
                        border: "1.5px solid #E4DDD3",
                      }
                }
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.borderColor =
                      "#0C1F3F";
                    (e.currentTarget as HTMLElement).style.color = "#0C1F3F";
                    (e.currentTarget as HTMLElement).style.background =
                      "#f7f4ef";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.borderColor =
                      "#E4DDD3";
                    (e.currentTarget as HTMLElement).style.color = "#5C5853";
                    (e.currentTarget as HTMLElement).style.background = "#fff";
                  }
                }}
              >
                {src === "전체" ? "📋 전체" : src}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── 초기 로딩 ─────────────────────────────────────────────── */}
      {loading && (
        <div className="flex flex-col gap-4">
          <SkeletonCard featured /> <SkeletonCard /> <SkeletonCard />{" "}
          <SkeletonCard />
        </div>
      )}

      {/* ─── 빈 상태 ──────────────────────────────────────────────── */}
      {!loading && filteredNews.length === 0 && (
        <div
          className="text-center py-24 flex flex-col items-center gap-5"
          style={{
            border: "2px dashed #D1CAC0",
            borderRadius: "24px",
            background: "rgba(255,255,255,0.6)",
          }}
        >
          <span style={{ fontSize: "56px" }}>🔍</span>
          <div>
            <p className="text-lg font-black mb-2" style={{ color: "#2C2926" }}>
              분석 완료된 뉴스가 없습니다
            </p>
            <p className="text-sm" style={{ color: "#9C9891" }}>
              메인 홈에서 일반 뉴스를 선택해 AI 분석을 시작해보세요!
            </p>
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-black transition-all duration-200"
            style={{
              background: "#161311",
              color: "#fff",
              padding: "12px 24px",
              borderRadius: "999px",
              boxShadow: "0 4px 16px rgba(22,19,17,0.2)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "#C13026";
              (e.currentTarget as HTMLElement).style.transform =
                "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "#161311";
              (e.currentTarget as HTMLElement).style.transform =
                "translateY(0)";
            }}
          >
            📰 뉴스 목록으로
          </Link>
        </div>
      )}

      {/* ─── 뉴스 리스트 ─────────────────────────────────────────── */}
      {!loading && filteredNews.length > 0 && (
        <div className="flex flex-col gap-4">
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

            /* ── 피쳐드 카드 ── */
            if (index === 0) {
              return (
                <div
                  key={news.id}
                  ref={isLast ? lastElementRef : null}
                  className="mb-2 group"
                >
                  <Link to={`/news/${news.id}`} className="block">
                    <article
                      className="overflow-hidden bg-white transition-all duration-300"
                      style={{
                        borderRadius: "24px",
                        border: "1px solid #E4DDD3",
                        boxShadow: "0 2px 24px rgba(22,19,17,0.08)",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.boxShadow =
                          "0 16px 56px rgba(22,19,17,0.16)";
                        (e.currentTarget as HTMLElement).style.transform =
                          "translateY(-3px)";
                        (e.currentTarget as HTMLElement).style.borderColor =
                          "rgba(26,85,168,0.25)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.boxShadow =
                          "0 2px 24px rgba(22,19,17,0.08)";
                        (e.currentTarget as HTMLElement).style.transform =
                          "translateY(0)";
                        (e.currentTarget as HTMLElement).style.borderColor =
                          "#E4DDD3";
                      }}
                    >
                      {displayImage ? (
                        <div
                          className="relative overflow-hidden"
                          style={{ height: "clamp(200px, 38vw, 400px)" }}
                        >
                          <img
                            src={displayImage}
                            alt="뉴스 메인 이미지"
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
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
                                "linear-gradient(to top, rgba(12,31,63,0.9) 0%, rgba(12,31,63,0.15) 55%, transparent 100%)",
                            }}
                          />
                          <div className="absolute top-5 left-5 flex items-center gap-2 flex-wrap">
                            <span
                              className={`${badgeClass} text-[11px] font-black px-3 py-1.5 rounded-full`}
                            >
                              {sourceName}
                            </span>
                            <span
                              className="inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1.5 rounded-full"
                              style={{
                                background: "rgba(16,185,129,0.9)",
                                color: "#fff",
                              }}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-white" />
                              AI 분석완료
                            </span>
                          </div>
                          <div className="absolute bottom-5 left-6 right-6">
                            <h2
                              className="font-black text-white line-clamp-2 leading-snug mb-3"
                              style={{
                                fontFamily: "'Noto Serif KR', serif",
                                fontSize: "clamp(18px, 3.5vw, 26px)",
                                textShadow: "0 2px 12px rgba(0,0,0,0.4)",
                              }}
                            >
                              <HighlightText
                                text={news.title}
                                keyword={keyword}
                              />
                            </h2>
                            <div className="flex items-center gap-3 flex-wrap">
                              <CredibilityBadge
                                label={news.credibility_label}
                                score={news.credibility_score}
                              />
                              <ScoreMeter score={news.credibility_score} />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div
                          className="px-8 py-10"
                          style={{ background: "#0C1F3F" }}
                        >
                          <div className="flex items-center gap-2 mb-4 flex-wrap">
                            <span
                              className={`${badgeClass} text-[11px] font-black px-3 py-1.5 rounded-full`}
                            >
                              {sourceName}
                            </span>
                            <span
                              className="inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1.5 rounded-full"
                              style={{
                                background: "rgba(16,185,129,0.9)",
                                color: "#fff",
                              }}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-white" />
                              AI 분석완료
                            </span>
                          </div>
                          <h2
                            className="text-2xl sm:text-3xl font-black text-white line-clamp-3 leading-snug mb-4"
                            style={{ fontFamily: "'Noto Serif KR', serif" }}
                          >
                            <HighlightText
                              text={news.title}
                              keyword={keyword}
                            />
                          </h2>
                          <div className="flex items-center gap-3 flex-wrap">
                            <CredibilityBadge
                              label={news.credibility_label}
                              score={news.credibility_score}
                            />
                            <ScoreMeter score={news.credibility_score} />
                          </div>
                        </div>
                      )}

                      <div className="p-6 md:p-7">
                        <span
                          className="text-xs font-medium"
                          style={{ color: "#9C9891" }}
                        >
                          {news.published_at?.split("T")[0]}
                        </span>
                        {displaySummary && (
                          <p
                            className="text-[15px] leading-relaxed line-clamp-2 mt-2"
                            style={{ color: "#3C3A36" }}
                          >
                            <span
                              className="inline-flex items-center gap-1 text-[10px] font-black text-white rounded-md mr-2 align-middle"
                              style={{
                                background: "#1A55A8",
                                padding: "2px 7px",
                              }}
                            >
                              ✨ AI
                            </span>
                            <HighlightText
                              text={displaySummary}
                              keyword={keyword}
                            />
                          </p>
                        )}
                        <div
                          className="mt-5 inline-flex items-center gap-2 text-sm font-bold transition-all duration-200 group-hover:gap-3"
                          style={{ color: "#1A55A8" }}
                        >
                          분석 결과 보기
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
            const scoreColor =
              news.credibility_score != null && news.credibility_score >= 0.7
                ? "#10B981"
                : news.credibility_score != null &&
                    news.credibility_score >= 0.4
                  ? "#F59E0B"
                  : "#EF4444";

            return (
              <div
                key={news.id}
                ref={isLast ? lastElementRef : null}
                className="group"
              >
                <Link to={`/news/${news.id}`} className="block">
                  <article
                    className="flex bg-white overflow-hidden transition-all duration-250"
                    style={{
                      borderRadius: "18px",
                      border: "1px solid #E4DDD3",
                      boxShadow: "0 1px 6px rgba(22,19,17,0.05)",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.boxShadow =
                        "0 8px 28px rgba(22,19,17,0.12)";
                      (e.currentTarget as HTMLElement).style.borderColor =
                        "rgba(26,85,168,0.25)";
                      (e.currentTarget as HTMLElement).style.transform =
                        "translateY(-2px)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.boxShadow =
                        "0 1px 6px rgba(22,19,17,0.05)";
                      (e.currentTarget as HTMLElement).style.borderColor =
                        "#E4DDD3";
                      (e.currentTarget as HTMLElement).style.transform =
                        "translateY(0)";
                    }}
                  >
                    {/* 신뢰도 컬러 바 */}
                    <div
                      className="w-1 shrink-0 self-stretch"
                      style={{
                        background: scoreColor,
                        opacity: 0.85,
                        borderRadius: "18px 0 0 18px",
                      }}
                    />

                    <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between min-w-0">
                      <div>
                        <div className="flex items-center flex-wrap gap-2 mb-2.5">
                          <span
                            className={`${badgeClass} text-[10px] font-black px-2.5 py-1 rounded-full`}
                          >
                            {sourceName}
                          </span>
                          <span
                            className="text-[11px] font-medium"
                            style={{ color: "#9C9891" }}
                          >
                            {news.published_at?.split("T")[0]}
                          </span>
                          <CredibilityBadge
                            label={news.credibility_label}
                            score={news.credibility_score}
                          />
                          <ScoreMeter score={news.credibility_score} />
                        </div>
                        <h2
                          className="font-bold leading-snug mb-2 line-clamp-2"
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
                            <span
                              className="inline-flex items-center gap-1 text-[9px] font-black text-white rounded mr-1.5 align-middle"
                              style={{
                                background: "#1A55A8",
                                padding: "2px 5px",
                              }}
                            >
                              AI
                            </span>
                            <HighlightText
                              text={displaySummary}
                              keyword={keyword}
                            />
                          </p>
                        )}
                      </div>
                      <div
                        className="mt-2.5 flex items-center gap-1 text-[11px] font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        style={{ color: "#1A55A8" }}
                      >
                        분석 보기
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.5}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </div>
                    </div>

                    {displayImage && (
                      <div
                        className="w-28 sm:w-36 shrink-0 overflow-hidden relative"
                        style={{
                          minHeight: "110px",
                          borderRadius: "0 18px 18px 0",
                          background: "#f0ece4",
                        }}
                      >
                        <img
                          src={displayImage}
                          alt="뉴스 썸네일"
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
                          style={{ minHeight: "110px" }}
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

      {/* ─── 추가 로딩 ─────────────────────────────────────────────── */}
      {isLoadingMore && !showLoadMoreBtn && (
        <div className="flex flex-col gap-4 mt-4">
          <SkeletonCard /> <SkeletonCard /> <SkeletonCard />
        </div>
      )}

      {/* ─── 더보기 버튼 ─────────────────────────────────────────── */}
      {showLoadMoreBtn && hasMore && (
        <div className="flex justify-center mt-10 mb-4">
          <button
            onClick={handleLoadMoreClick}
            className="group flex items-center gap-2.5 text-sm font-black rounded-full transition-all duration-300"
            style={{
              padding: "14px 36px",
              background: "#fff",
              color: "#0C1F3F",
              border: "2px solid #0C1F3F",
              boxShadow: "0 2px 8px rgba(12,31,63,0.1)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "#0C1F3F";
              (e.currentTarget as HTMLElement).style.color = "#fff";
              (e.currentTarget as HTMLElement).style.boxShadow =
                "0 8px 28px rgba(12,31,63,0.25)";
              (e.currentTarget as HTMLElement).style.transform =
                "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "#fff";
              (e.currentTarget as HTMLElement).style.color = "#0C1F3F";
              (e.currentTarget as HTMLElement).style.boxShadow =
                "0 2px 8px rgba(12,31,63,0.1)";
              (e.currentTarget as HTMLElement).style.transform =
                "translateY(0)";
            }}
          >
            분석 뉴스 더 불러오기
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

      {/* ─── 마지막 상태 ─────────────────────────────────────────── */}
      {!hasMore && newsList.length > 0 && (
        <div
          className="py-12 flex flex-col items-center gap-3"
          style={{ color: "#9C9891" }}
        >
          <div className="divider-ornate w-full max-w-xs">
            <span className="text-sm font-medium">
              모든 분석 뉴스를 불러왔습니다
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
