import { useEffect, useRef, useState, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../api";

// ─── 타입 ──────────────────────────────────────────────────────────────────
interface ComicScene {
  url: string;
  caption?: string; // 백엔드에서 "[나레이션] ... [대사] ..." 형태로 넘어오는 텍스트
  narration?: string; // (과거 데이터 호환용)
  dialogue?: string; // (과거 데이터 호환용)
}

interface CartoonItem {
  news_id: number;
  title: string;
  source?: string;
  summary?: string;
  comic_urls: (ComicScene | string)[];
  published_at: string;
}

// ─── 이미지 로딩 상태 타입 ─────────────────────────────────────────────────
type ImgStatus = "idle" | "loading" | "loaded" | "error";

// ─── 커스텀 훅: 단일 이미지 프리로더 ──────────────────────────────────────
// Pollinations 이미지는 첫 요청 시 생성되므로 최대 20번 재시도합니다.
// &t= 파라미터를 붙여 브라우저 캐시를 우회하되, Pollinations는 seed 기반으로
// 캐시하기 때문에 동일 이미지를 반환합니다.
function usePollinationsImage(src: string) {
  const [status, setStatus] = useState<ImgStatus>("idle");
  const [loadedSrc, setLoadedSrc] = useState<string>("");
  const retriesRef = useRef(0);
  const MAX_RETRIES = 20; // 최대 재시도 횟수 (약 80초)
  const RETRY_DELAY_MS = 4000; // 재시도 간격 (4초)

  const attemptLoad = useCallback(() => {
    if (!src) return;
    setStatus("loading");

    const img = new Image();

    img.onload = () => {
      setLoadedSrc(img.src);
      setStatus("loaded");
    };

    img.onerror = () => {
      retriesRef.current += 1;
      if (retriesRef.current <= MAX_RETRIES) {
        setTimeout(() => {
          // 브라우저 캐시 우회를 위해 타임스탬프 추가
          // (Pollinations는 seed 기반이라 다른 이미지가 나오지 않습니다)
          img.src = `${src}&t=${Date.now()}`;
          attemptLoad();
        }, RETRY_DELAY_MS);
      } else {
        setStatus("error");
      }
    };

    // 첫 시도에는 원본 URL 사용
    img.src = retriesRef.current === 0 ? src : `${src}&t=${Date.now()}`;
  }, [src]);

  useEffect(() => {
    retriesRef.current = 0;
    setStatus("idle");
    setLoadedSrc("");
    if (src) attemptLoad();
  }, [src, attemptLoad]);

  return {
    status,
    loadedSrc,
    retryCount: retriesRef.current,
    retry: () => {
      retriesRef.current = 0;
      attemptLoad();
    },
  };
}

// ─── 컴포넌트: 단일 만화 패널 ──────────────────────────────────────────────
function ComicPanel({
  scene,
  panelNumber,
}: {
  scene: ComicScene | string;
  panelNumber: number;
}) {
  const imageUrl = typeof scene === "string" ? scene : scene.url;

  // ✨ [나레이션]과 [대사]를 분리하는 핵심 파싱 로직 ✨
  let parsedNarration = "";
  let parsedDialogue = "";

  const captionStr =
    typeof scene === "string" ? `${panelNumber}컷` : scene.caption || "";

  if (captionStr.includes("[나레이션]") || captionStr.includes("[대사]")) {
    // 정규식을 사용해 [나레이션] 뒤의 텍스트와 [대사] 뒤의 텍스트를 각각 추출합니다.
    const narMatch = captionStr.match(/\[나레이션\](.*?)(?=\[대사\]|$)/s);
    const diaMatch = captionStr.match(/\[대사\](.*)/s);

    parsedNarration = narMatch ? narMatch[1].trim() : "";
    parsedDialogue = diaMatch ? diaMatch[1].trim() : "";
  } else {
    // 태그가 없는 예전 데이터이거나 파싱 실패 시 전체를 나레이션으로 처리
    parsedNarration =
      typeof scene !== "string" && scene.narration
        ? scene.narration
        : captionStr;
    parsedDialogue =
      typeof scene !== "string" && scene.dialogue ? scene.dialogue : "";
  }

  const { status, loadedSrc, retryCount, retry } =
    usePollinationsImage(imageUrl);

  const panelColors = [
    {
      bg: "bg-yellow-400",
      text: "text-yellow-900",
      border: "border-yellow-500",
    },
    { bg: "bg-rose-400", text: "text-rose-900", border: "border-rose-500" },
    { bg: "bg-sky-400", text: "text-sky-900", border: "border-sky-500" },
    {
      bg: "bg-emerald-400",
      text: "text-emerald-900",
      border: "border-emerald-500",
    },
  ];
  const color = panelColors[(panelNumber - 1) % 4];

  // ✨ 컷 번호에 따라 말풍선의 위치와 꼬리 방향을 다이내믹하게 변경합니다.
  const getBubbleStyle = (num: number) => {
    switch (num % 4) {
      case 1: // 1컷: 좌측 상단 (꼬리는 우측 하단)
        return {
          pos: "top-[8%] left-[5%]",
          tail: "-bottom-2 right-6 border-b-2 border-r-2",
          align: "text-left",
        };
      case 2: // 2컷: 우측 하단 (꼬리는 좌측 상단)
        return {
          pos: "bottom-[12%] right-[5%]",
          tail: "-top-2 left-6 border-t-2 border-l-2",
          align: "text-right",
        };
      case 3: // 3컷: 우측 상단 (꼬리는 좌측 하단)
        return {
          pos: "top-[10%] right-[5%]",
          tail: "-bottom-2 left-6 border-b-2 border-l-2",
          align: "text-center",
        };
      case 0: // 4컷: 좌측 하단 (꼬리는 우측 상단)
        return {
          pos: "bottom-[15%] left-[5%]",
          tail: "-top-2 right-6 border-t-2 border-r-2",
          align: "text-left",
        };
      default:
        return {
          pos: "top-[10%] right-[5%]",
          tail: "-bottom-2 left-6 border-b-2 border-l-2",
          align: "text-center",
        };
    }
  };
  const bubble = getBubbleStyle(panelNumber);

  return (
    <div className="relative w-full overflow-hidden border-b-4 border-slate-900 last:border-b-0">
      {/* ─ 이미지 영역 ─────────────────────────────────────────── */}
      <div className="relative w-full min-h-[280px] sm:min-h-[380px] bg-slate-100 flex items-center justify-center">
        {/* 로딩 스켈레톤 */}
        {(status === "idle" || status === "loading") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 gap-4 z-0">
            <div className="w-48 h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-yellow-400 rounded-full animate-pulse"
                style={{ width: `${Math.min(100, retryCount * 5 + 15)}%` }}
              />
            </div>
            <p className="text-slate-400 text-xs font-mono tracking-widest animate-pulse">
              AI 그림 생성 중... ({Math.min(MAX_RETRIES_DISPLAY, retryCount)}/
              {MAX_RETRIES_DISPLAY})
            </p>
          </div>
        )}

        {/* 실제 이미지 */}
        {status === "loaded" && (
          <img
            src={loadedSrc}
            alt={`${panelNumber}컷`}
            className="w-full h-auto object-cover relative z-0"
          />
        )}

        {/* ✨ 다이내믹 말풍선 UI ✨ */}
        {status === "loaded" && parsedDialogue && (
          <div
            className={`absolute ${bubble.pos} max-w-[65%] sm:max-w-[50%] bg-white border-2 border-slate-900 rounded-2xl px-4 py-3 shadow-[4px_4px_0px_rgba(15,23,42,1)] z-20 animate-fade-in`}
          >
            <p
              className={`text-slate-900 font-black text-sm sm:text-base leading-snug break-keep ${bubble.align}`}
            >
              {parsedDialogue}
            </p>
            {/* 동적 꼬리 방향 */}
            <div
              className={`absolute w-4 h-4 bg-white border-slate-900 transform rotate-45 ${bubble.tail}`}
            ></div>
          </div>
        )}

        {/* 에러 상태 */}
        {status === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-slate-400 gap-3 min-h-[280px] z-10">
            <span className="text-5xl">🎨</span>
            <p className="text-sm font-bold">이미지 로딩 실패</p>
            <button
              onClick={retry}
              className="text-xs bg-yellow-400 text-slate-900 font-bold px-4 py-2 rounded-full hover:bg-yellow-300 transition-colors"
            >
              다시 시도
            </button>
          </div>
        )}

        {/* 컷 번호 배지 */}
        <div
          className={`absolute top-3 left-3 z-30 ${color.bg} ${color.text} ${color.border}
            border-2 w-9 h-9 flex items-center justify-center rounded-full font-black text-sm
            shadow-[2px_2px_0px_rgba(0,0,0,0.8)]`}
        >
          {panelNumber}
        </div>
      </div>

      {/* ─ 나레이션 캡션 영역 (하단) ─────────────────────────────────────────── */}
      {parsedNarration && (
        <div className="bg-white border-t-2 border-slate-900 px-5 py-3 relative">
          <p className="text-slate-900 font-bold text-sm sm:text-base leading-relaxed text-center break-keep">
            {parsedNarration}
          </p>
        </div>
      )}
    </div>
  );
}

// 재시도 횟수 표시용 상수 (UI 표시 목적)
const MAX_RETRIES_DISPLAY = 20;

// ─── 컴포넌트: 만화 카드 (기사 1개 = 4컷 만화) ────────────────────────────
function CartoonCard({
  item,
  highlight,
}: {
  item: CartoonItem;
  highlight: boolean;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  // 강조된(공유 링크 등으로 접근한) 카드는 처음부터 보이도록 설정
  const [isVisible, setIsVisible] = useState(highlight);

  useEffect(() => {
    if (highlight && cardRef.current) {
      setTimeout(() => {
        cardRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 300);
    }
  }, [highlight]);

  // ✨ Intersection Observer를 활용한 스크롤 애니메이션
  useEffect(() => {
    const currentRef = cardRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
          // 한 번 화면에 나타나면 계속 보이도록 관찰 해제
          if (currentRef) observer.unobserve(currentRef);
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" },
    );

    if (currentRef) observer.observe(currentRef);

    return () => {
      if (currentRef) observer.unobserve(currentRef);
    };
  }, []);

  const dateStr = item.published_at
    ? new Date(item.published_at).toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  return (
    <article
      ref={cardRef}
      id={`comic-${item.news_id}`}
      className={`
        rounded-3xl overflow-hidden shadow-[6px_6px_0px_0px_rgba(15,23,42,1)]
        border-4 border-slate-900
        transition-all duration-700 ease-out transform
        ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-16"}
        ${highlight ? "ring-4 ring-yellow-400 ring-offset-4" : ""}
      `}
    >
      {/* ─ 카드 헤더 ─────────────────────────────────────────────── */}
      <div className="bg-slate-900 text-white px-6 pt-6 pb-5">
        {/* 소스 & 날짜 */}
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          {item.source && (
            <span className="bg-yellow-400 text-slate-900 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wide">
              {item.source}
            </span>
          )}
          {dateStr && (
            <span className="text-slate-400 text-xs font-mono">{dateStr}</span>
          )}
        </div>

        {/* 기사 제목 */}
        <h2 className="text-xl sm:text-2xl font-black text-white leading-tight mb-3 break-keep">
          {item.title}
        </h2>

        {/* AI 요약 (있을 경우) */}
        {item.summary && (
          <p className="text-slate-300 text-sm leading-relaxed line-clamp-2 border-t border-slate-700 pt-3">
            {item.summary}
          </p>
        )}

        {/* 원본 기사 링크 */}
        <Link
          to={`/news/${item.news_id}`}
          className="inline-flex items-center gap-2 mt-4 text-sm font-bold text-slate-900 bg-yellow-400
            border-2 border-yellow-300 px-4 py-2 rounded-full
            hover:bg-yellow-300 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_rgba(255,255,255,0.3)]
            transition-all"
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
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
          원본 기사 보기
        </Link>
      </div>

      {/* ─ 웹툰 패널 영역 ─────────────────────────────────────────── */}
      {/* 세로 스크롤 웹툰 형식: 컷이 위에서 아래로 이어집니다 */}
      <div className="bg-amber-50 border-t-4 border-slate-900">
        {/* 웹툰 타이틀 바 */}
        <div className="flex items-center gap-3 px-5 py-3 border-b-2 border-slate-900 bg-yellow-400">
          <span className="text-slate-900 font-black text-sm tracking-widest uppercase">
            🎨 4컷 만화
          </span>
          <div className="flex gap-1 ml-auto">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="w-2 h-2 rounded-full bg-slate-900 opacity-50"
              />
            ))}
          </div>
        </div>

        {/* 패널들 */}
        <div className="border-l-4 border-r-4 border-slate-900">
          {item.comic_urls.slice(0, 4).map((scene, idx) => (
            <ComicPanel key={idx} scene={scene} panelNumber={idx + 1} />
          ))}
        </div>

        {/* 하단 서명 */}
        <div className="flex items-center justify-center gap-2 py-3 border-t-2 border-slate-900 bg-slate-900">
          <span className="text-yellow-400 font-black text-xs tracking-widest">
            🤖 AI가 그린 뉴스 만화 · 뉴스 정보 나침반
          </span>
        </div>
      </div>
    </article>
  );
}

// ─── 메인 페이지 컴포넌트 ──────────────────────────────────────────────────
export default function CartoonsPage() {
  const [cartoons, setCartoons] = useState<CartoonItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const targetNewsId = searchParams.get("newsId");

  useEffect(() => {
    const fetchCartoons = async () => {
      try {
        const res = await api.get("/api/cartoons");
        setCartoons(res.data.reverse());
      } catch (error) {
        console.error("만화 로딩 실패:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCartoons();
  }, []);

  if (loading) {
    return (
      <div className="mt-32 flex flex-col items-center gap-4 text-slate-500">
        {/* 스켈레톤 로딩 */}
        <div className="w-16 h-16 border-4 border-slate-900 border-t-yellow-400 rounded-full animate-spin" />
        <p className="font-bold text-lg animate-pulse">
          만화 갤러리 불러오는 중...
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 pb-24">
      {/* ─ 페이지 헤더 ──────────────────────────────────────────── */}
      <header className="mb-12 text-center">
        <div
          className="inline-flex items-center gap-2 bg-yellow-400 border-4 border-slate-900 px-5 py-2 rounded-full mb-4
          shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]"
        >
          <span className="font-black text-slate-900 text-sm uppercase tracking-widest">
            AI Comics Gallery
          </span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight mb-3">
          🎨 AI 만화 모음집
        </h1>
        <p className="text-slate-500 font-medium max-w-md mx-auto leading-relaxed">
          AI가 뉴스를 읽고 직접 그린 4컷 웹툰 갤러리입니다.
          <br />
          이미지 생성에는 최대 1분이 걸릴 수 있습니다.
        </p>
      </header>

      {/* ─ 만화 목록 ────────────────────────────────────────────── */}
      {cartoons.length === 0 ? (
        <div className="text-center border-4 border-dashed border-slate-300 rounded-3xl p-20 text-slate-400">
          <div className="text-6xl mb-4">🖌️</div>
          <p className="font-bold text-lg mb-2">아직 생성된 만화가 없습니다</p>
          <p className="text-sm">
            기사 상세 페이지에서 만화 생성 버튼을 눌러보세요!
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-14">
          {cartoons.map((item) => (
            <CartoonCard
              key={item.news_id}
              item={item}
              highlight={targetNewsId === String(item.news_id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
