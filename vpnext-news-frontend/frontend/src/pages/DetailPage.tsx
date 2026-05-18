import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api";

type AnalysisStatus = "pending" | "analyzing" | "complete";

// [사전 정의] 언론사 ID 매핑 테이블 공유
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

// [유틸] 썸네일 부재 시 본문 내장 이미지 파싱용
const extractImageFromSummary = (rawString: string): string | null => {
  if (!rawString) return null;
  const txt = document.createElement("textarea");
  txt.innerHTML = rawString;
  const decoded = txt.value;
  const imgMatch = decoded.match(/<img[^>]+src=["']([^"']+)["']/i);
  return imgMatch ? imgMatch[1] : null;
};

// [유틸] 개행문자 기반 텍스트 문단 분리 및 렌더링
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

// [유틸] 스코어별 동적 CSS 클래스 할당
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

// [컴포넌트] 사이드바 분석 아이템 카드
// 리렌더링 시 스크롤 튐 현상을 방지하기 위해 DetailPage 외부로 분리했습니다.
const AnalysisCard = ({
  icon,
  title,
  bg,
  border,
  textColor,
  status, // 외부에서 status 상태를 props로 받습니다.
  children,
}: any) => (
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

export default function DetailPage() {
  const { id } = useParams();
  const [news, setNews] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<AnalysisStatus>("pending");
  const [analysisData, setAnalysisData] = useState<any>(null);

  // [추가] 만화 생성 관련 상태
  const [isComicGenerating, setIsComicGenerating] = useState(false);
  const [comicUrls, setComicUrls] = useState<string[] | null>(null);

  // [추가] 직접 용어 검색용 상태
  const [searchTerm, setSearchTerm] = useState("");
  const [searchEngine, setSearchEngine] = useState("stdict"); // 기본값: 표준국어대사전

  // [Effect] 최초 마운트 시 기사 상세 데이터 Fetch
  useEffect(() => {
    const fetchNewsDetail = async () => {
      try {
        const response = await api.get(`/api/news/${id}`);
        setNews(response.data);
        // 분석 완료 상태인 경우 데이터 세팅
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
        // [추가] DB에 저장된 만화가 있다면 불러오기
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

  // [API] AI 분석 요청 핸들러
  const startAnalysis = async () => {
    if (!news?.url) return;
    setStatus("analyzing");
    try {
      // 분석 요청 후 데이터 업데이트
      const response = await api.post(
        `/api/analyze?article_url=${encodeURIComponent(news.url)}`,
      );
      setAnalysisData(response.data);
      setStatus("complete");

      // 최신 상태 동기화를 위해 뉴스 원본 재조회
      const updated = await api.get(`/api/news/${id}`);
      setNews(updated.data);
    } catch (error) {
      alert("분석 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
      setStatus("pending");
    }
  };

  // [추가] 만화 생성 버튼 핸들러
  const handleGenerateComic = async () => {
    setIsComicGenerating(true);
    try {
      const res = await api.post(`/api/news/${id}/comic`);
      setComicUrls(res.data.comic_urls);
    } catch (error) {
      alert("만화 생성 중 오류가 발생했습니다.");
    } finally {
      setIsComicGenerating(false);
    }
  };

  // [로직] 추가 용어 검색 핸들러
  const handleTermSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    let url = "";
    if (searchEngine === "stdict") {
      // 국립국어원 표준국어대사전
      url = `https://stdict.korean.go.kr/search/searchResult.do?pageSize=10&searchKeyword=${encodeURIComponent(searchTerm)}`;
    } else if (searchEngine === "opendict") {
      // 우리말샘
      url = `https://opendict.korean.go.kr/search/searchResult?query=${encodeURIComponent(searchTerm)}`;
    } else if (searchEngine === "google") {
      // 구글
      url = `https://www.google.com/search?q=${encodeURIComponent(searchTerm)}`;
    }
    window.open(url, "_blank");
  };

  // [UI] 예외 처리
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
        };

  return (
    <div className="mt-10 pb-20">
      {/* --- 상단: 기사 헤더 영역 --- */}
      <header className="mb-10 pb-8 border-b border-slate-200">
        <div className="flex items-center gap-3 mb-5">
          {/* [로직] 매핑 테이블 통한 언론사 이름 출력 */}
          <span className="bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-md tracking-wider">
            {SOURCE_NAME_MAP[news.source?.toLowerCase()] ||
              news.source?.toUpperCase() ||
              "알 수 없음"}
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
        <span className="text-sm text-slate-500 ml-4">
          출처:{" "}
          {SOURCE_NAME_MAP[news.source?.toLowerCase()] ||
            news.source?.toUpperCase() ||
            "알 수 없음"}
        </span>
      </header>

      {/* --- 하단: 2단 분할 레이아웃 --- */}
      <div className="flex flex-col lg:flex-row gap-12 relative">
        {/* 본문 컨텐츠 (좌측) */}
        <article className="flex-1 min-w-0">
          {finalImage && (
            <figure className="mb-10 rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 flex justify-center shadow-sm">
              <img
                src={finalImage}
                alt="뉴스 메인 사진"
                className="w-full max-h-[500px] object-cover"
              />
            </figure>
          )}

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

          {/* 분석 트리거 버튼 */}
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

          {/* [추가] 분석 완료 시 노출되는 AI 만화 생성/보기 섹션 */}
          {status === "complete" && (
            <div className="mt-8 p-8 bg-purple-50 border border-purple-100 rounded-3xl text-center flex flex-col items-center gap-4 shadow-sm">
              <h3 className="text-xl font-black text-purple-900 flex items-center gap-2">
                🎨 AI 뉴스 4컷 만화
              </h3>
              <p className="text-purple-700 text-sm mb-2">
                이 기사의 핵심 내용을 AI가 만화로 그려줍니다.
              </p>

              {comicUrls ? (
                // 만화가 이미 생성되어 DB에 저장된 경우
                <Link
                  to={`/cartoons?newsId=${id}`}
                  className="px-8 py-3.5 bg-purple-600 hover:bg-purple-700 text-white text-lg font-bold rounded-2xl transition-all shadow-md hover:-translate-y-1"
                >
                  보러가기 (AI 만화 모음집)
                </Link>
              ) : (
                // 만화를 새로 생성해야 하는 경우
                <button
                  onClick={handleGenerateComic}
                  disabled={isComicGenerating}
                  className={`px-8 py-3.5 text-lg font-bold rounded-2xl transition-all shadow-md flex items-center gap-2 ${
                    isComicGenerating
                      ? "bg-purple-200 text-purple-500 cursor-wait"
                      : "bg-slate-900 hover:bg-purple-600 text-white hover:-translate-y-1"
                  }`}
                >
                  {isComicGenerating
                    ? "AI가 열심히 그림을 그리는 중... ⏳"
                    : "만화 생성하기 ✨"}
                </button>
              )}
            </div>
          )}
        </article>

        {/* 사이드바 (우측 고정) */}
        <aside className="w-full lg:w-[380px] shrink-0">
          <div className="sticky top-24 flex flex-col gap-5">
            <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-md">
              <h2 className="text-lg font-bold flex items-center gap-2">
                🤖 AI 나침반 리포트
              </h2>
              <p className="text-sm text-slate-300 mt-1">
                AI가 분석한 기사 신뢰도 및 핵심 정보입니다.
              </p>
            </div>

            {/* 신뢰도 점수 패널 */}
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

            {/* [Feature] 어려운 용어 국립국어원-우리말샘 연동 */}
            <AnalysisCard
              icon="📖"
              title="용어 풀이"
              bg="bg-sky-50/80"
              border="border-sky-100"
              textColor="text-sky-900"
              status={status} // 추가된 status props
            >
              {analysisData?.difficult_terms?.length > 0 ? (
                <ul className="text-[14px] space-y-4">
                  {analysisData.difficult_terms.map((term: any, i: number) => (
                    <li key={i} className="leading-relaxed">
                      <a
                        href={`https://stdict.korean.go.kr/search/searchResult.do?pageSize=10&searchKeyword=${encodeURIComponent(term.term)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sky-700 bg-sky-100 hover:bg-sky-200 transition-colors px-1.5 py-0.5 rounded mr-1 inline-flex items-center gap-1 mb-1 font-bold cursor-pointer"
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
                        <span className="text-[11px] text-sky-500 bg-sky-50 border border-sky-100 px-1.5 py-0.5 rounded-full ml-1 align-text-bottom">
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

              {/* [추가] 수동 용어 검색 UI */}
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
                      className="text-[13px] bg-white border border-sky-200 rounded-lg px-2 py-1.5 text-slate-700 outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 transition-all shrink-0"
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
                        className="flex-1 w-full text-[13px] border border-sky-200 rounded-lg px-3 py-1.5 outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 transition-all"
                      />
                      <button
                        type="submit"
                        className="bg-sky-600 text-white text-[13px] font-bold px-3 py-1.5 rounded-lg hover:bg-sky-700 transition-colors shrink-0"
                      >
                        검색
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </AnalysisCard>

            {/* 핵심 인물 패널 */}
            <AnalysisCard
              icon="👤"
              title="핵심 인물 프로필"
              bg="bg-emerald-50/80"
              border="border-emerald-100"
              textColor="text-emerald-900"
              status={status} // 추가된 status props
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
