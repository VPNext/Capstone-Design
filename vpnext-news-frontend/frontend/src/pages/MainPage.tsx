import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";

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

export default function MainPage() {
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

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

  const handleCrawl = async () => {
    try {
      await api.post("/api/crawl");
      alert("최신뉴스 수집이 시작되었습니다. 잠시 후 새로고침 해주세요.");
      setTimeout(fetchNews, 3000);
    } catch (err) {
      alert("크롤링 요청 실패");
    }
  };

  return (
    <div className="flex flex-col gap-8 mt-8">
      <div className="flex justify-between items-end pb-4 border-b-2 border-slate-900">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            오늘의 뉴스
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            AI가 실시간으로 수집하고 분석할 준비가 된 뉴스 목록입니다.
          </p>
        </div>
        <button
          onClick={handleCrawl}
          className="bg-slate-900 text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-800 transition-all flex items-center gap-2 shadow-md hover:shadow-lg active:scale-95"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-4 h-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
            />
          </svg>
          최신 뉴스 수집
        </button>
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
      ) : newsList.length === 0 ? (
        <div className="py-20 text-center text-slate-500">
          <p className="text-4xl mb-4">📰</p>
          <p className="text-lg font-semibold">수집된 뉴스가 없습니다.</p>
          <p className="text-sm mt-2">
            위의 "최신 뉴스 수집" 버튼을 눌러 뉴스를 가져오세요.
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {newsList.map((news) => {
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
                      {/* 출처 / 날짜 / 신뢰도 배지 */}
                      <div className="flex items-center gap-3 mb-3 flex-wrap">
                        <span className="bg-sky-50 text-sky-700 border border-sky-100 text-[11px] font-bold px-2.5 py-1 rounded-md">
                          {news.source}
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
