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
  category?: string;
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

// [상수] 노출할 카테고리 목록
const CATEGORIES = ["전체", "정치", "경제", "사회", "IT/과학", "세계", "문화"];

export default function MainPage() {
  // 상태 관리: 데이터 및 UI
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("전체");

  // 상태 관리: 무한 스크롤
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // 무한 스크롤용 DOM 옵저버 Ref
  const observer = useRef<IntersectionObserver | null>(null);

  // [로직] 마지막 리스트 아이템 감지용 Callback Ref
  const lastElementRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (loading || isLoadingMore) return; // 로딩 중 중복 트리거 방지
      if (observer.current) observer.current.disconnect(); // 기존 옵저버 해제

      // 뷰포트 교차 시 페이지 카운트 증가
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
  const fetchNews = async (pageNumber: number, category: string) => {
    try {
      if (pageNumber === 1) setLoading(true);
      else setIsLoadingMore(true);

      const categoryParam = category !== "전체" ? `&category=${category}` : "";
      // 백엔드 API 명세에 맞춰 쿼리스트링 조합
      const response = await api.get(
        `/api/news?page=${pageNumber}${categoryParam}`,
      );
      const newItems = response.data.items || [];

      if (newItems.length === 0) {
        setHasMore(false); // 더 이상 불러올 데이터 없음
      } else {
        // 첫 페이지면 덮어쓰기, 이후 페이지면 기존 배열에 병합
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

  // [Effect] 페이지 번호 변경 시 추가 데이터 로드
  useEffect(() => {
    if (page > 1) fetchNews(page, selectedCategory);
  }, [page]);

  // [Effect] 카테고리 변경 시 초기화 및 1페이지 재요청
  useEffect(() => {
    setNewsList([]);
    setPage(1);
    setHasMore(true);
    fetchNews(1, selectedCategory);
  }, [selectedCategory]);

  return (
    <div className="flex flex-col gap-8 mt-8">
      {/* 상단 헤더 및 카테고리 드롭다운 */}
      <div className="flex justify-between items-end pb-4 border-b-2 border-slate-900 relative">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            오늘의 뉴스
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            AI가 분석한 실시간 뉴스 목록입니다.
          </p>
        </div>

        {/* [UI] 호버 트리거 드롭다운 메뉴 (CSS 기반 제어) */}
        <div className="group relative">
          <button className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-semibold transition-colors">
            <span>{selectedCategory}</span>
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
          <div className="absolute right-0 top-full pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20">
            <div className="bg-white border border-slate-200 rounded-xl shadow-xl w-32 py-2 flex flex-col">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 text-sm text-left hover:bg-sky-50 ${
                    selectedCategory === cat
                      ? "text-sky-600 font-bold bg-sky-50/50"
                      : "text-slate-600"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 리스트 렌더링 */}
      <div className="grid gap-6">
        {newsList.map((news, index) => {
          // 썸네일 및 요약본 폴백 처리
          const displayImage =
            news.image_url || extractImageFromSummary(news.summary);
          const displaySummary =
            news.ai_summary || extractTextFromSummary(news.summary);

          // 현재 렌더링 중인 요소가 마지막 요소인지 판별
          const isLast = newsList.length === index + 1;

          return (
            <div
              key={news.id}
              ref={isLast ? lastElementRef : null} // 마지막 요소에 옵저버 타겟 지정
              className="group bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-sky-200 transition-all duration-300"
            >
              <Link
                to={`/news/${news.id}`}
                className="flex flex-col-reverse md:flex-row gap-6 md:gap-8"
              >
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-3 flex-wrap">
                      {news.category && (
                        <span className="bg-slate-100 text-slate-600 text-[11px] font-bold px-2 py-1 rounded">
                          {news.category}
                        </span>
                      )}
                      {/* [로직] 언론사 영문 ID 매핑 처리 */}
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
                      }} // 엑스박스 방지
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
