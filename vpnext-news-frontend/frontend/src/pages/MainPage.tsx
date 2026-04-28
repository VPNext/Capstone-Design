import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";

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
  // 필요한 언론사를 계속 추가하세요.
};

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
  category?: string; // 카테고리 필터링을 위해 추가된 필드
}

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

// 카테고리 목록 정의
const CATEGORIES = ["전체", "정치", "경제", "사회", "IT/과학", "세계", "문화"];

export default function MainPage() {
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("전체"); // 현재 선택된 카테고리 상태

  const fetchNews = async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/news");
      setNewsList(response.data.items || []);
    } catch (err) {
      console.error("데이터 로드 실패:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  // 카테고리에 따른 뉴스 필터링 로직
  const filteredNews =
    selectedCategory === "전체"
      ? newsList
      : newsList.filter((news) => news.category === selectedCategory);

  return (
    <div className="flex flex-col gap-8 mt-8">
      <div className="flex justify-between items-end pb-4 border-b-2 border-slate-900 relative">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            오늘의 뉴스
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            AI가 실시간으로 수집하고 분석할 준비가 된 뉴스 목록입니다.
          </p>
        </div>

        {/* 호버 방식의 카테고리 드롭다운 메뉴 */}
        <div className="group relative">
          <button className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-semibold transition-colors">
            <span>{selectedCategory}</span>
            <svg
              className="w-4 h-4 text-slate-500 group-hover:rotate-180 transition-transform duration-300"
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

          {/* 드롭다운 영역 (마우스를 올렸을 때만 표시됨) */}
          <div className="absolute right-0 top-full pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-20">
            <div className="bg-white border border-slate-200 rounded-xl shadow-xl w-32 py-2 flex flex-col">
              {CATEGORIES.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 text-sm text-left transition-colors hover:bg-sky-50 hover:text-sky-600 ${
                    selectedCategory === category
                      ? "text-sky-600 font-bold bg-sky-50/50"
                      : "text-slate-600 font-medium"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-5 py-10">
          {[1, 2, 3].map((skeleton) => (
            <div
              key={skeleton}
              className="h-40 bg-slate-200 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      ) : filteredNews.length === 0 ? (
        <div className="py-20 text-center text-slate-500">
          <p className="text-4xl mb-4">📰</p>
          <p className="text-lg font-semibold">
            {selectedCategory !== "전체"
              ? `해당 카테고리(${selectedCategory})의 뉴스가 없습니다.`
              : "수집된 뉴스가 없습니다."}
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {filteredNews.map((news) => {
            const summaryImage = extractImageFromSummary(news.summary);
            const displayImage = news.image_url || summaryImage;

            // ── 요약 텍스트 우선순위: ai_summary > RSS summary 텍스트 ──
            const displaySummary =
              news.ai_summary || extractTextFromSummary(news.summary);

            return (
              <div
                key={news.id}
                className="group bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-sky-200 transition-all duration-300"
              >
                <Link
                  to={`/news/${news.id}`}
                  className="flex flex-col-reverse md:flex-row gap-6 md:gap-8"
                >
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      {/* 출처 / 날짜 / 신뢰도 배지 / 카테고리 */}
                      <div className="flex items-center gap-3 mb-3 flex-wrap">
                        {news.category && (
                          <span className="bg-slate-100 text-slate-600 text-[11px] font-bold px-2 py-1 rounded">
                            {news.category}
                          </span>
                        )}
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

                      {/* 제목 */}
                      <h2 className="text-xl md:text-2xl font-bold text-slate-900 group-hover:text-sky-600 mb-3 leading-snug transition-colors">
                        {news.title}
                      </h2>

                      {/* 요약 */}
                      {displaySummary ? (
                        <p
                          className={`text-[15px] mb-2 line-clamp-3 leading-relaxed ${
                            news.ai_summary
                              ? "text-slate-700" // AI 요약이면 진하게
                              : "text-slate-500" // RSS 요약이면 연하게
                          }`}
                        >
                          {/* AI 요약에만 아이콘 표시 */}
                          {news.ai_summary && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-600 bg-sky-50 border border-sky-100 px-1.5 py-0.5 rounded mr-2 align-middle">
                              ✨ AI 요약
                            </span>
                          )}
                          {displaySummary}
                        </p>
                      ) : (
                        <p className="text-slate-400 italic text-[15px] mb-2">
                          뉴스 요약 정보가 없습니다. 클릭하여 AI 분석과 함께
                          본문을 확인해 보세요.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 썸네일 이미지 */}
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
      )}
    </div>
  );
}
