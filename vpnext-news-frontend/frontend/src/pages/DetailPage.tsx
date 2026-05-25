import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api";
import LoadingModal from "../components/LoadingModal";

type AnalysisStatus = "pending" | "analyzing" | "complete";

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

const extractImageFromSummary = (rawString: string): string | null => {
  if (!rawString) return null;
  const txt = document.createElement("textarea");
  txt.innerHTML = rawString;
  const decoded = txt.value;
  const imgMatch = decoded.match(/<img[^>]+src=["']([^"']+)["']/i);
  return imgMatch ? imgMatch[1] : null;
};

const renderContent = (content: string) =>
  content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line, i) => (
      <p
        key={i}
        style={{
          color: "#2C2926",
          fontSize: "16px",
          lineHeight: 1.95,
          marginBottom: "1.35em",
          fontFamily: "'Noto Sans KR', sans-serif",
          fontWeight: 400,
        }}
      >
        {line}
      </p>
    ));

const getScoreColor = (score: number) => {
  if (score >= 0.7)
    return {
      text: "text-emerald-700",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      hex: "#059669",
      bgHex: "#ECFDF5",
    };
  if (score >= 0.4)
    return {
      text: "text-amber-700",
      bg: "bg-amber-50",
      border: "border-amber-200",
      hex: "#D97706",
      bgHex: "#FFFBEB",
    };
  return {
    text: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
    hex: "#DC2626",
    bgHex: "#FEF2F2",
  };
};

// ─── Analysis Card ────────────────────────────────────────────────────────────
const AnalysisCard = ({
  icon,
  title,
  bg,
  border,
  textColor,
  status,
  children,
}: any) => (
  <div
    className={`${bg} ${border} border overflow-hidden`}
    style={{ borderRadius: "18px", boxShadow: "0 1px 8px rgba(22,19,17,0.06)" }}
  >
    <div
      className={`flex items-center gap-2.5 px-5 pt-5 pb-3 border-b ${border}`}
    >
      <span className="text-xl">{icon}</span>
      <h3 className={`font-bold ${textColor} text-[14px] tracking-tight`}>
        {title}
      </h3>
    </div>
    <div className="px-5 pb-5 pt-4">
      {status === "complete" ? (
        children
      ) : (
        <p className={`text-sm ${textColor} opacity-40`}>
          아래 버튼을 눌러 AI 분석을 실행해주세요.
        </p>
      )}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
export default function DetailPage() {
  const { id } = useParams();
  const [news, setNews] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<AnalysisStatus>("pending");
  const [analysisData, setAnalysisData] = useState<any>(null);

  const [isComicGenerating, setIsComicGenerating] = useState(false);
  const [comicUrls, setComicUrls] = useState<string[] | null>(null);

  const [progress, setProgress] = useState(0);
  const [loadingStatus, setLoadingStatus] = useState("");

  const [showPromptInput, setShowPromptInput] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [searchEngine, setSearchEngine] = useState("stdict");

  useEffect(() => {
    const fetchNewsDetail = async () => {
      try {
        const response = await api.get(`/api/news/${id}`);
        setNews(response.data);
        if (response.data.is_analyzed) {
          setAnalysisData({
            credibility: {
              score: response.data.credibility_score,
              label: response.data.credibility_label,
              reason: response.data.credibility_reason,
              red_flags: response.data.red_flags || [],
              summary: response.data.ai_summary || "",
            },
            difficult_terms: response.data.difficult_terms || [],
            key_persons: response.data.key_persons || [],
          });
          setStatus("complete");
        }
        if (response.data.comic_script) {
          try {
            setComicUrls(JSON.parse(response.data.comic_script));
          } catch (e) {
            console.error("만화 URL 파싱 실패");
          }
        }
      } catch (error) {
        console.error("기사 로드 실패:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchNewsDetail();
  }, [id]);

  const startAnalysis = async () => {
    if (!news?.url) return;
    setStatus("analyzing");
    const sourceKey = news?.source?.toLowerCase();
    const currentSourceName =
      SOURCE_NAME_MAP[sourceKey] ||
      news?.source?.toUpperCase() ||
      "미상(외부 뉴스)";
    try {
      const response = await api.post(
        `/api/analyze?article_url=${encodeURIComponent(news.url)}&source=${encodeURIComponent(currentSourceName)}`,
      );
      setAnalysisData(response.data);
      setStatus("complete");
      const updated = await api.get(`/api/news/${id}`);
      setNews(updated.data);
    } catch (error) {
      alert("분석 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
      setStatus("pending");
    }
  };

  const handleGenerateComic = async (promptText?: string) => {
    setIsComicGenerating(true);
    setProgress(0);
    setLoadingStatus("만화 생성을 준비하고 있습니다...");
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev < 30) {
          setLoadingStatus(
            "뉴스를 분석하여 만화 시나리오를 작성하고 있습니다...",
          );
          return prev + 1;
        } else if (prev < 90) {
          setLoadingStatus("AI 이미지를 생성하고 있습니다... (약 1분 소요)");
          return prev + 0.5;
        } else if (prev < 98) {
          setLoadingStatus("이미지 품질을 최적화하고 마무리 작업 중입니다...");
          return prev + 0.1;
        }
        return prev;
      });
    }, 500);
    try {
      const payload = promptText ? { custom_prompt: promptText } : {};
      const res = await api.post(`/api/news/${id}/comic`, payload);
      setProgress(100);
      setLoadingStatus("만화 생성 완료!");
      await new Promise((resolve) => setTimeout(resolve, 800));
      setComicUrls(res.data.comic_urls);
    } catch (error) {
      console.error("만화 생성 오류:", error);
      setLoadingStatus("오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } finally {
      clearInterval(interval);
      setIsComicGenerating(false);
    }
  };

  const handleTermSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    let url = "";
    if (searchEngine === "stdict")
      url = `https://stdict.korean.go.kr/search/searchResult.do?pageSize=10&searchKeyword=${encodeURIComponent(searchTerm)}`;
    else if (searchEngine === "opendict")
      url = `https://opendict.korean.go.kr/search/searchResult?query=${encodeURIComponent(searchTerm)}`;
    else if (searchEngine === "google")
      url = `https://www.google.com/search?q=${encodeURIComponent(searchTerm)}`;
    window.open(url, "_blank");
  };

  // ─── 로딩 상태 ──────────────────────────────────────────────────────────────
  if (loading)
    return (
      <div
        className="mt-32 flex flex-col items-center gap-4"
        style={{ color: "#9C9891", fontFamily: "'Noto Sans KR', sans-serif" }}
      >
        <div
          className="w-10 h-10 rounded-full border-2 animate-spin"
          style={{ borderColor: "#E4DDD3", borderTopColor: "#C13026" }}
        />
        <p className="text-lg font-bold animate-pulse">
          기사를 불러오는 중입니다...
        </p>
      </div>
    );

  if (!news)
    return (
      <div
        className="mt-32 text-center"
        style={{ color: "#5C5853", fontFamily: "'Noto Sans KR', sans-serif" }}
      >
        <p className="text-5xl mb-4">📰</p>
        <p className="text-lg font-bold">기사를 찾을 수 없습니다.</p>
        <Link
          to="/"
          className="mt-4 inline-block text-sm font-bold"
          style={{ color: "#C13026" }}
        >
          ← 목록으로 돌아가기
        </Link>
      </div>
    );

  const finalImage = news.image_url || extractImageFromSummary(news.summary);
  const aiSummary =
    analysisData?.credibility?.summary || news.ai_summary || null;
  const scoreColor =
    analysisData?.credibility?.score != null
      ? getScoreColor(analysisData.credibility.score)
      : {
          text: "text-slate-400",
          bg: "bg-slate-50",
          border: "border-slate-200",
          hex: "#94A3B8",
          bgHex: "#F8FAFC",
        };

  const sourceKey = news.source?.toLowerCase();
  const sourceName =
    SOURCE_NAME_MAP[sourceKey] || news.source?.toUpperCase() || "알 수 없음";
  const badgeClass = SOURCE_BADGE_CLASS[sourceKey] || "badge-default";

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      className="mt-8 pb-20"
      style={{ fontFamily: "'Noto Sans KR', sans-serif" }}
    >
      <LoadingModal
        isOpen={isComicGenerating}
        progress={progress}
        status={loadingStatus}
      />

      {/* ─── 뒤로가기 ────────────────────────────────────────────── */}
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm font-bold mb-7 transition-colors duration-200"
        style={{ color: "#9C9891" }}
        onMouseEnter={(e) =>
          ((e.currentTarget as HTMLElement).style.color = "#161311")
        }
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLElement).style.color = "#9C9891")
        }
      >
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
            d="M15 19l-7-7 7-7"
          />
        </svg>
        목록으로
      </Link>

      {/* ─── 기사 헤더 ───────────────────────────────────────────── */}
      <header className="mb-10">
        <div className="flex items-center flex-wrap gap-3 mb-5">
          <span
            className={`${badgeClass} text-xs font-black px-3.5 py-1.5 rounded-full`}
          >
            {sourceName}
          </span>
          <span className="text-sm font-medium" style={{ color: "#9C9891" }}>
            {news.published_at?.split("T")[0]}
          </span>
          {news.is_analyzed && (
            <span
              className="inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1.5 rounded-full"
              style={{
                background: "#ECFDF5",
                color: "#065F46",
                border: "1px solid #A7F3D0",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              AI 분석완료
            </span>
          )}
        </div>

        <h1
          className="font-black leading-snug mb-6"
          style={{
            fontFamily: "'Noto Serif KR', serif",
            fontSize: "clamp(22px, 4vw, 40px)",
            color: "#161311",
            lineHeight: 1.3,
            letterSpacing: "-0.02em",
          }}
        >
          {news.title}
        </h1>

        <div
          className="flex items-center flex-wrap gap-4 pb-6"
          style={{ borderBottom: "1px solid #E4DDD3" }}
        >
          <a
            href={news.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-bold transition-colors duration-200"
            style={{ color: "#1A55A8" }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.color = "#C13026")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.color = "#1A55A8")
            }
          >
            기사 원문 사이트에서 보기
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              stroke="currentColor"
              className="w-4 h-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m4.5 19.5 15-15m0 0H8.25m11.25 0v11.25"
              />
            </svg>
          </a>
          <span className="text-sm" style={{ color: "#9C9891" }}>
            출처: {sourceName}
          </span>
        </div>
      </header>

      {/* ─── 2단 레이아웃 ─────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-10 relative">
        {/* ── 본문 (좌측) ── */}
        <article className="flex-1 min-w-0">
          {/* 메인 이미지 */}
          {finalImage && (
            <figure
              className="mb-8 overflow-hidden"
              style={{
                borderRadius: "18px",
                border: "1px solid #E4DDD3",
                boxShadow: "0 4px 24px rgba(22,19,17,0.08)",
              }}
            >
              <img
                src={finalImage}
                alt="뉴스 메인 사진"
                className="w-full max-h-[520px] object-cover"
              />
            </figure>
          )}

          {/* AI 3줄 요약 */}
          {aiSummary && (
            <div
              className="mb-8 p-5"
              style={{
                background: "#EFF6FF",
                border: "1px solid #BFDBFE",
                borderRadius: "16px",
              }}
            >
              <p
                className="text-[11px] font-black uppercase tracking-widest mb-2.5 flex items-center gap-1.5"
                style={{ color: "#1A55A8" }}
              >
                <span>✨</span> AI 3줄 요약
              </p>
              <p
                className="text-[15px] leading-relaxed"
                style={{ color: "#1E3A5F" }}
              >
                {aiSummary}
              </p>
            </div>
          )}

          {/* 기사 본문 */}
          <div style={{ borderTop: "1px solid #E4DDD3", paddingTop: "28px" }}>
            {news.content ? (
              <div>{renderContent(news.content)}</div>
            ) : (
              <div
                className="p-12 text-center flex flex-col items-center gap-4"
                style={{
                  background: "#F0F9FF",
                  border: "1px solid #BAE6FD",
                  borderRadius: "16px",
                }}
              >
                <div className="text-4xl">✨</div>
                <h3 className="text-xl font-bold" style={{ color: "#161311" }}>
                  본문이 아직 수집되지 않았습니다
                </h3>
                <p style={{ color: "#5C5853" }}>
                  아래 버튼을 눌러 본문을 가져오고 AI 분석을 시작하세요.
                </p>
              </div>
            )}
          </div>

          {/* ─── AI 분석 버튼 ── */}
          <div
            className="mt-12 pt-8"
            style={{ borderTop: "1px solid #E4DDD3" }}
          >
            <button
              onClick={startAnalysis}
              disabled={status !== "pending"}
              className="w-full py-5 text-[17px] font-black flex items-center justify-center gap-3 transition-all duration-300"
              style={{
                borderRadius: "18px",
                ...(status === "analyzing"
                  ? {
                      background: "#F3F0EB",
                      color: "#9C9891",
                      cursor: "not-allowed",
                    }
                  : status === "complete"
                    ? {
                        background: "#ECFDF5",
                        color: "#065F46",
                        border: "1px solid #A7F3D0",
                        cursor: "default",
                      }
                    : {
                        background: "#161311",
                        color: "#fff",
                        boxShadow: "0 4px 20px rgba(22,19,17,0.2)",
                      }),
              }}
              onMouseEnter={(e) => {
                if (status === "pending") {
                  (e.currentTarget as HTMLElement).style.background = "#C13026";
                  (e.currentTarget as HTMLElement).style.boxShadow =
                    "0 8px 32px rgba(193,48,38,0.3)";
                  (e.currentTarget as HTMLElement).style.transform =
                    "translateY(-2px)";
                }
              }}
              onMouseLeave={(e) => {
                if (status === "pending") {
                  (e.currentTarget as HTMLElement).style.background = "#161311";
                  (e.currentTarget as HTMLElement).style.boxShadow =
                    "0 4px 20px rgba(22,19,17,0.2)";
                  (e.currentTarget as HTMLElement).style.transform =
                    "translateY(0)";
                }
              }}
            >
              {status === "analyzing" && (
                <span className="animate-spin text-2xl">⏳</span>
              )}
              {status === "complete" && <span className="text-2xl">✅</span>}
              {status === "pending" && <span className="text-2xl">✨</span>}
              {status === "analyzing"
                ? "AI가 기사를 꼼꼼히 읽고 분석 중입니다..."
                : status === "complete"
                  ? "AI 분석이 완료되었습니다"
                  : "AI 분석 실행 및 본문 가져오기"}
            </button>
          </div>

          {/* ─── AI 만화 생성 섹션 ── */}
          {status === "complete" && (
            <div
              className="mt-8 p-8 flex flex-col items-center gap-5 text-center"
              style={{
                background: "#FAF5FF",
                border: "1px solid #E9D5FF",
                borderRadius: "24px",
                boxShadow: "0 2px 16px rgba(109,40,217,0.08)",
              }}
            >
              <div>
                <h3
                  className="text-xl font-black mb-1 flex items-center justify-center gap-2"
                  style={{ color: "#4C1D95" }}
                >
                  🎨 AI 뉴스 4컷 만화
                </h3>
                <p className="text-sm" style={{ color: "#6D28D9" }}>
                  이 기사의 핵심 내용을 AI가 만화로 그려줍니다.
                </p>
              </div>

              {comicUrls ? (
                <Link
                  to={`/cartoons?newsId=${id}`}
                  className="px-8 py-3.5 text-lg font-black transition-all duration-200"
                  style={{
                    background: "#7C3AED",
                    color: "#fff",
                    borderRadius: "16px",
                    boxShadow: "0 4px 16px rgba(124,58,237,0.3)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background =
                      "#6D28D9";
                    (e.currentTarget as HTMLElement).style.transform =
                      "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background =
                      "#7C3AED";
                    (e.currentTarget as HTMLElement).style.transform =
                      "translateY(0)";
                  }}
                >
                  보러가기 (AI 만화 모음집)
                </Link>
              ) : (
                <div className="w-full flex flex-col gap-4 mt-2">
                  {!showPromptInput ? (
                    <div className="flex flex-col sm:flex-row justify-center gap-3">
                      <button
                        onClick={() => handleGenerateComic()}
                        disabled={isComicGenerating}
                        className="px-6 py-3.5 text-lg font-black transition-all duration-200 disabled:opacity-50"
                        style={{
                          background: "#161311",
                          color: "#fff",
                          borderRadius: "14px",
                          boxShadow: "0 2px 12px rgba(22,19,17,0.2)",
                        }}
                        onMouseEnter={(e) => {
                          if (!isComicGenerating) {
                            (e.currentTarget as HTMLElement).style.background =
                              "#7C3AED";
                            (e.currentTarget as HTMLElement).style.transform =
                              "translateY(-2px)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.background =
                            "#161311";
                          (e.currentTarget as HTMLElement).style.transform =
                            "translateY(0)";
                        }}
                      >
                        {isComicGenerating ? "생성 중... ⏳" : "AI 자동 생성"}
                      </button>
                      <button
                        onClick={() => setShowPromptInput(true)}
                        disabled={isComicGenerating}
                        className="px-6 py-3.5 text-lg font-black transition-all duration-200 disabled:opacity-50"
                        style={{
                          background: "#fff",
                          color: "#4C1D95",
                          border: "2px solid #C4B5FD",
                          borderRadius: "14px",
                        }}
                        onMouseEnter={(e) => {
                          if (!isComicGenerating) {
                            (e.currentTarget as HTMLElement).style.borderColor =
                              "#7C3AED";
                            (e.currentTarget as HTMLElement).style.transform =
                              "translateY(-2px)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.borderColor =
                            "#C4B5FD";
                          (e.currentTarget as HTMLElement).style.transform =
                            "translateY(0)";
                        }}
                      >
                        직접 디렉팅
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 w-full">
                      <textarea
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        placeholder="예: 주인공을 고양이로 그려줘, 배경을 우주로 해줘..."
                        className="w-full h-24 p-4 resize-none font-medium outline-none transition-all"
                        style={{
                          border: "2px solid #C4B5FD",
                          color: "#161311",
                          background: "#fff",
                          borderRadius: "12px",
                        }}
                        onFocus={(e) =>
                          ((e.currentTarget as HTMLElement).style.borderColor =
                            "#7C3AED")
                        }
                        onBlur={(e) =>
                          ((e.currentTarget as HTMLElement).style.borderColor =
                            "#C4B5FD")
                        }
                        disabled={isComicGenerating}
                      />
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => setShowPromptInput(false)}
                          disabled={isComicGenerating}
                          className="px-4 py-2 font-bold transition-colors duration-200"
                          style={{ color: "#9C9891" }}
                          onMouseEnter={(e) =>
                            ((e.currentTarget as HTMLElement).style.color =
                              "#161311")
                          }
                          onMouseLeave={(e) =>
                            ((e.currentTarget as HTMLElement).style.color =
                              "#9C9891")
                          }
                        >
                          취소
                        </button>
                        <button
                          onClick={() => handleGenerateComic(customPrompt)}
                          disabled={
                            isComicGenerating ||
                            customPrompt.trim().length === 0
                          }
                          className="px-6 py-2 font-black transition-all duration-200 disabled:opacity-50"
                          style={{
                            background: "#7C3AED",
                            color: "#fff",
                            borderRadius: "10px",
                            boxShadow: "0 2px 12px rgba(124,58,237,0.25)",
                          }}
                          onMouseEnter={(e) => {
                            if (
                              !isComicGenerating &&
                              customPrompt.trim().length > 0
                            ) {
                              (
                                e.currentTarget as HTMLElement
                              ).style.background = "#6D28D9";
                              (e.currentTarget as HTMLElement).style.transform =
                                "translateY(-1px)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.background =
                              "#7C3AED";
                            (e.currentTarget as HTMLElement).style.transform =
                              "translateY(0)";
                          }}
                        >
                          {isComicGenerating
                            ? "생성 중... ⏳"
                            : "이 내용으로 생성"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </article>

        {/* ── 사이드바 (우측) ── */}
        <aside className="w-full lg:w-[360px] shrink-0">
          <div className="sticky top-24 flex flex-col gap-4">
            {/* 사이드바 헤더 */}
            <div
              className="p-5"
              style={{
                background: "#161311",
                borderRadius: "18px",
                boxShadow: "0 4px 20px rgba(22,19,17,0.2)",
              }}
            >
              <h2 className="text-[15px] font-bold text-white flex items-center gap-2.5">
                🤖 AI 나침반 리포트
              </h2>
              <p
                className="text-xs mt-1"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                AI가 분석한 기사 신뢰도 및 핵심 정보입니다.
              </p>
            </div>

            {/* ── 신뢰도 점수 패널 ── */}
            <div
              className={`${scoreColor.bg} ${scoreColor.border} border overflow-hidden`}
              style={{
                borderRadius: "18px",
                boxShadow: "0 1px 8px rgba(22,19,17,0.06)",
              }}
            >
              <div
                className={`flex items-center gap-2.5 px-5 pt-5 pb-3 border-b ${scoreColor.border}`}
              >
                <span className="text-xl">🔍</span>
                <h3
                  className={`font-bold ${scoreColor.text} text-[14px] tracking-tight`}
                >
                  기사 신뢰도 분석
                </h3>
              </div>
              <div className="px-5 pb-5 pt-4">
                {status === "complete" && analysisData?.credibility ? (
                  <>
                    {/* Score display */}
                    <div className="flex items-end gap-3 mb-4">
                      <span
                        className={`text-5xl font-black ${scoreColor.text} tracking-tighter`}
                      >
                        {analysisData.credibility.score != null
                          ? `${(analysisData.credibility.score * 100).toFixed(0)}`
                          : "-"}
                      </span>
                      <div className="flex flex-col mb-1.5">
                        <span
                          className={`text-xl font-bold ${scoreColor.text}`}
                        >
                          %
                        </span>
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-full ${scoreColor.bg} ${scoreColor.text} border ${scoreColor.border}`}
                        >
                          {analysisData.credibility.label || "분석 중"}
                        </span>
                      </div>
                    </div>

                    {/* Score bar */}
                    {analysisData.credibility.score != null && (
                      <div className="mb-4">
                        <div className="progress-bar-track mb-1">
                          <div
                            className="progress-bar-fill"
                            style={{
                              width: `${Math.round(analysisData.credibility.score * 100)}%`,
                              background: scoreColor.hex,
                            }}
                          />
                        </div>
                        <div
                          className="flex justify-between text-[10px] font-medium"
                          style={{ color: "#9C9891" }}
                        >
                          <span>낮음</span>
                          <span>높음</span>
                        </div>
                      </div>
                    )}

                    <p
                      className={`text-[14px] leading-relaxed font-medium p-3 mb-3 ${scoreColor.text}`}
                      style={{
                        background: "rgba(255,255,255,0.6)",
                        borderRadius: "10px",
                      }}
                    >
                      {analysisData.credibility.reason}
                    </p>

                    {analysisData.credibility.red_flags?.length > 0 && (
                      <div>
                        <p
                          className="text-xs font-bold mb-1.5"
                          style={{ color: "#5C5853" }}
                        >
                          ⚠️ 주의 표현
                        </p>
                        <ul className="flex flex-wrap gap-1.5">
                          {analysisData.credibility.red_flags.map(
                            (flag: string, i: number) => (
                              <li
                                key={i}
                                className="text-xs px-2 py-0.5 border"
                                style={{
                                  background: "#FEF2F2",
                                  color: "#991B1B",
                                  borderColor: "#FECACA",
                                  borderRadius: "999px",
                                }}
                              >
                                {flag}
                              </li>
                            ),
                          )}
                        </ul>
                      </div>
                    )}
                    {analysisData.credibility.summary && (
                      <div className="mt-3">
                        <p
                          className="text-xs font-bold mb-1.5"
                          style={{ color: "#5C5853" }}
                        >
                          📝 3줄 요약
                        </p>
                        <p
                          className="text-[13px] leading-relaxed p-3"
                          style={{
                            color: "#2C2926",
                            background: "rgba(255,255,255,0.6)",
                            borderRadius: "10px",
                          }}
                        >
                          {analysisData.credibility.summary}
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <p
                    className="text-sm opacity-40"
                    style={{ color: "#5C5853" }}
                  >
                    AI 분석을 실행해주세요.
                  </p>
                )}
              </div>
            </div>

            {/* ── 용어 풀이 ── */}
            <AnalysisCard
              icon="📖"
              title="용어 풀이"
              bg="bg-sky-50/80"
              border="border-sky-100"
              textColor="text-sky-900"
              status={status}
            >
              {analysisData?.difficult_terms?.length > 0 ? (
                <ul className="text-[14px] space-y-4">
                  {analysisData.difficult_terms.map((term: any, i: number) => (
                    <li key={i} className="leading-relaxed">
                      <a
                        href={`https://stdict.korean.go.kr/search/searchResult.do?pageSize=10&searchKeyword=${encodeURIComponent(term.term)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sky-700 bg-sky-100 hover:bg-sky-200 transition-colors px-1.5 py-0.5 inline-flex items-center gap-1 mb-1 font-bold cursor-pointer"
                        style={{ borderRadius: "6px" }}
                        title={`${term.term} 국립국어원에서 뜻 찾아보기`}
                      >
                        {term.term}
                        <svg
                          className="w-3 h-3 opacity-60"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          />
                        </svg>
                      </a>
                      {term.category && (
                        <span
                          className="text-[11px] text-sky-500 bg-sky-50 border border-sky-100 px-1.5 py-0.5 ml-1 align-text-bottom"
                          style={{ borderRadius: "999px" }}
                        >
                          {term.category}
                        </span>
                      )}
                      <br />
                      <span className="text-slate-700">
                        {term.definition || term.explanation}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-sky-700 opacity-60">
                  추출된 용어가 없습니다.
                </p>
              )}

              <div className="mt-5 pt-4 border-t border-sky-200/60">
                <form
                  onSubmit={handleTermSearch}
                  className="flex flex-col gap-2"
                >
                  <label className="text-[13px] font-bold text-sky-800 flex items-center gap-1">
                    <span>🔍</span> 추가 용어 검색
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <select
                      value={searchEngine}
                      onChange={(e) => setSearchEngine(e.target.value)}
                      className="text-[13px] bg-white border border-sky-200 px-2 py-1.5 text-slate-700 outline-none focus:border-sky-400 transition-all shrink-0"
                      style={{ borderRadius: "8px" }}
                    >
                      <option value="stdict">표준국어대사전</option>
                      <option value="opendict">우리말샘</option>
                      <option value="google">구글 검색</option>
                    </select>
                    <div className="flex flex-1 gap-2">
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="궁금한 단어 입력"
                        className="flex-1 w-full text-[13px] border border-sky-200 px-3 py-1.5 outline-none focus:border-sky-400 transition-all"
                        style={{ borderRadius: "8px" }}
                      />
                      <button
                        type="submit"
                        className="bg-sky-600 text-white text-[13px] font-bold px-3 py-1.5 hover:bg-sky-700 transition-colors shrink-0"
                        style={{ borderRadius: "8px" }}
                      >
                        검색
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </AnalysisCard>

            {/* ── 핵심 인물 ── */}
            <AnalysisCard
              icon="👤"
              title="핵심 인물 프로필"
              bg="bg-emerald-50/80"
              border="border-emerald-100"
              textColor="text-emerald-900"
              status={status}
            >
              {analysisData?.key_persons?.length > 0 ? (
                <ul className="text-[14px] space-y-4">
                  {analysisData.key_persons.map((person: any, i: number) => (
                    <li
                      key={i}
                      className="leading-relaxed border-l-2 border-emerald-300 pl-3"
                    >
                      <a
                        href={`https://www.google.com/search?q=${encodeURIComponent(person.name)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-emerald-800 text-[15px] mb-0.5 font-bold hover:text-emerald-600 hover:underline cursor-pointer"
                        title={`${person.name} 구글에서 검색하기`}
                      >
                        {person.name}
                        <svg
                          className="w-3 h-3 opacity-60"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          />
                        </svg>
                      </a>
                      {person.role && (
                        <span className="text-xs text-emerald-600 font-semibold block mb-0.5">
                          {person.role}
                        </span>
                      )}
                      <span className="text-slate-700 block">
                        {person.description}
                      </span>
                      {person.relation && (
                        <span className="block text-xs text-slate-500 mt-1 italic">
                          이 기사에서: {person.relation}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-emerald-700 opacity-60">
                  추출된 인물이 없습니다.
                </p>
              )}
            </AnalysisCard>
          </div>
        </aside>
      </div>
    </div>
  );
}
