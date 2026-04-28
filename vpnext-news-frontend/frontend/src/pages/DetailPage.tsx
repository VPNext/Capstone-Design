import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api";

type AnalysisStatus = "pending" | "analyzing" | "complete";

const extractImageFromSummary = (rawString: string): string | null => {
  if (!rawString) return null;
  const txt = document.createElement("textarea");
  txt.innerHTML = rawString;
  const decoded = txt.value;
  const imgMatch = decoded.match(/<img[^>]+src=["']([^"']+)["']/i);
  return imgMatch ? imgMatch[1] : null;
};

const renderContent = (content: string) => {
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line, i) => (
      <p key={i} className="mb-4 leading-loose text-slate-800 text-[16px]">
        {line}
      </p>
    ));
};

const getScoreColor = (score: number) => {
  if (score >= 0.7)
    return {
      text: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
    };
  if (score >= 0.4)
    return {
      text: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-amber-200",
    };
  return { text: "text-red-600", bg: "bg-red-50", border: "border-red-200" };
};

export default function DetailPage() {
  const { id } = useParams();
  const [news, setNews] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<AnalysisStatus>("pending");
  const [analysisData, setAnalysisData] = useState<any>(null);

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
    try {
      const response = await api.post(
        `/api/analyze?article_url=${encodeURIComponent(news.url)}`,
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

  const AnalysisCard = ({
    icon,
    title,
    bg,
    border,
    textColor,
    children,
  }: {
    icon: string;
    title: string;
    bg: string;
    border: string;
    textColor: string;
    children: React.ReactNode;
  }) => (
    <div
      className={`${bg} ${border} p-5 rounded-2xl border flex flex-col gap-3 shadow-sm transition-all hover:shadow-md`}
    >
      <h3
        className={`font-bold ${textColor} text-[15px] flex items-center gap-2 border-b ${border} pb-2`}
      >
        <span>{icon}</span> {title}
      </h3>
      <div className="pt-1">
        {status === "complete" ? (
          children
        ) : (
          <p className={`text-sm ${textColor} opacity-60`}>
            아래 버튼을 눌러 AI 분석을 실행해주세요.
          </p>
        )}
      </div>
    </div>
  );

  if (loading)
    return (
      <div className="mt-32 text-center text-slate-500 animate-pulse text-lg font-medium">
        기사를 불러오는 중입니다...
      </div>
    );
  if (!news)
    return (
      <div className="mt-32 text-center text-slate-600">
        기사를 찾을 수 없습니다.
      </div>
    );

  const summaryImage = extractImageFromSummary(news.summary);
  const finalImage = news.image_url || summaryImage;
  const aiSummary =
    analysisData?.credibility?.summary || news.ai_summary || null;

  const scoreColor =
    analysisData?.credibility?.score != null
      ? getScoreColor(analysisData.credibility.score)
      : {
          text: "text-slate-400",
          bg: "bg-slate-50",
          border: "border-slate-200",
        };

  return (
    <div className="mt-10 pb-20">
      {/* ── 상단: 기사 헤더 ──────────────────────────────────────── */}
      <header className="mb-10 pb-8 border-b border-slate-200">
        <div className="flex items-center gap-3 mb-5">
          <span className="bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-md tracking-wider">
            {news.source}
          </span>
          <span className="text-slate-500 text-sm font-medium">
            {news.published_at?.split("T")[0]}
          </span>
        </div>
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-[1.3] mb-6">
          {news.title}
        </h1>
        <a
          href={news.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-sky-600 font-semibold hover:text-sky-800 hover:underline transition-colors"
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
      </header>

      {/* ── 하단: 2단 레이아웃 ───────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-12 relative">
        {/* 왼쪽: 본문 영역 */}
        <article className="flex-1 min-w-0">
          {/* 대표 이미지 */}
          {finalImage && (
            <figure className="mb-10 rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 flex justify-center shadow-sm">
              <img
                src={finalImage}
                alt="뉴스 메인 사진"
                className="w-full max-h-[500px] object-cover"
              />
            </figure>
          )}

          {/* ── AI 3줄 요약 박스 (본문 상단에 표시) ─────────────── */}
          {aiSummary && (
            <div className="mb-8 p-5 bg-sky-50 border border-sky-200 rounded-2xl">
              <p className="text-xs font-bold text-sky-600 mb-2 flex items-center gap-1.5">
                <span>✨</span> AI 3줄 요약
              </p>
              <p className="text-[15px] text-slate-700 leading-relaxed">
                {aiSummary}
              </p>
            </div>
          )}

          {/* ── 본문 렌더링 ──────────────────────────────────────── */}
          <div className="max-w-none">
            {news.content ? (
              <div>{renderContent(news.content)}</div>
            ) : (
              <div className="bg-sky-50/50 border border-sky-100 rounded-2xl p-12 text-center flex flex-col items-center gap-4">
                <div className="text-4xl">✨</div>
                <h3 className="text-xl font-bold text-slate-800">
                  본문이 아직 수집되지 않았습니다
                </h3>
                <p className="text-slate-600">
                  아래 버튼을 눌러 본문을 가져오고 AI 분석을 시작하세요.
                </p>
              </div>
            )}
          </div>

          {/* ── 분석 버튼 ────────────────────────────────────────── */}
          <div className="mt-12 pt-10 border-t border-slate-100">
            <button
              onClick={startAnalysis}
              disabled={status !== "pending"}
              className={`w-full py-5 rounded-2xl text-lg font-black shadow-lg transition-all flex items-center justify-center gap-3 ${
                status === "analyzing"
                  ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                  : status === "complete"
                    ? "bg-emerald-50 text-emerald-600 border border-emerald-200 cursor-default"
                    : "bg-slate-900 hover:bg-sky-600 text-white hover:-translate-y-1 hover:shadow-xl"
              }`}
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
        </article>

        {/* 오른쪽: AI 분석 사이드바 */}
        <aside className="w-full lg:w-[380px] shrink-0">
          <div className="sticky top-24 flex flex-col gap-5">
            {/* 사이드바 헤더 */}
            <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-md">
              <h2 className="text-lg font-bold flex items-center gap-2">
                🤖 AI 나침반 리포트
              </h2>
              <p className="text-sm text-slate-300 mt-1">
                AI가 분석한 기사 신뢰도 및 핵심 정보입니다.
              </p>
            </div>

            {/* ── 신뢰도 분석 카드 ──────────────────────────────── */}
            <div
              className={`${scoreColor.bg} ${scoreColor.border} p-5 rounded-2xl border flex flex-col gap-3 shadow-sm transition-all hover:shadow-md`}
            >
              <h3
                className={`font-bold ${scoreColor.text} text-[15px] flex items-center gap-2 border-b ${scoreColor.border} pb-2`}
              >
                <span>🔍</span> 기사 신뢰도 분석
              </h3>
              <div className="pt-1">
                {status === "complete" && analysisData?.credibility ? (
                  <>
                    <div className="flex items-end gap-3 mb-3">
                      <span
                        className={`text-5xl font-black ${scoreColor.text} tracking-tighter`}
                      >
                        {analysisData.credibility.score != null
                          ? `${(analysisData.credibility.score * 100).toFixed(0)}`
                          : "-"}
                      </span>
                      <div className="flex flex-col mb-1">
                        <span
                          className={`text-xl font-bold ${scoreColor.text}`}
                        >
                          %
                        </span>
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full ${scoreColor.bg} ${scoreColor.text} border ${scoreColor.border}`}
                        >
                          {analysisData.credibility.label || "분석 중"}
                        </span>
                      </div>
                    </div>
                    <p
                      className={`text-[14px] leading-relaxed font-medium bg-white/60 p-3 rounded-lg ${scoreColor.text} mb-3`}
                    >
                      {analysisData.credibility.reason}
                    </p>
                    {analysisData.credibility.red_flags?.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-slate-500 mb-1.5">
                          ⚠️ 주의 표현
                        </p>
                        <ul className="flex flex-wrap gap-1.5">
                          {analysisData.credibility.red_flags.map(
                            (flag: string, i: number) => (
                              <li
                                key={i}
                                className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full border border-red-200"
                              >
                                {flag}
                              </li>
                            ),
                          )}
                        </ul>
                      </div>
                    )}
                    {/* 사이드바의 3줄 요약은 본문에 이미 보이므로 접을 수 있게 처리 */}
                    {analysisData.credibility.summary && (
                      <div className="mt-3">
                        <p className="text-xs font-bold text-slate-500 mb-1.5">
                          📝 3줄 요약
                        </p>
                        <p className="text-[13px] text-slate-700 leading-relaxed bg-white/60 p-3 rounded-lg">
                          {analysisData.credibility.summary}
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-slate-400 opacity-60">
                    AI 분석을 실행해주세요.
                  </p>
                )}
              </div>
            </div>

            {/* ── 어려운 용어 카드 ──────────────────────────────── */}
            <AnalysisCard
              icon="📖"
              title="어려운 용어 풀이"
              bg="bg-sky-50/80"
              border="border-sky-100"
              textColor="text-sky-900"
            >
              {analysisData?.difficult_terms?.length > 0 ? (
                <ul className="text-[14px] space-y-4">
                  {analysisData.difficult_terms.map((term: any, i: number) => (
                    <li key={i} className="leading-relaxed">
                      <strong className="text-sky-700 bg-sky-100 px-1.5 py-0.5 rounded mr-1 inline-block mb-1">
                        {term.term}
                      </strong>
                      {term.category && (
                        <span className="text-[11px] text-sky-500 bg-sky-50 border border-sky-100 px-1.5 py-0.5 rounded-full ml-1">
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
            </AnalysisCard>

            {/* ── 핵심 인물 카드 ──────────────────────────────────── */}
            <AnalysisCard
              icon="👤"
              title="핵심 인물 프로필"
              bg="bg-emerald-50/80"
              border="border-emerald-100"
              textColor="text-emerald-900"
            >
              {analysisData?.key_persons?.length > 0 ? (
                <ul className="text-[14px] space-y-4">
                  {analysisData.key_persons.map((person: any, i: number) => (
                    <li
                      key={i}
                      className="leading-relaxed border-l-2 border-emerald-300 pl-3"
                    >
                      <strong className="block text-emerald-800 text-[15px] mb-0.5">
                        {person.name}
                      </strong>
                      {person.role && (
                        <span className="text-xs text-emerald-600 font-semibold block mb-0.5">
                          {person.role}
                        </span>
                      )}
                      <span className="text-slate-700">
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
