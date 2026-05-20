import { useEffect, useRef, useState, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../api";

// ─── 타입 ──────────────────────────────────────────────────────────────────
interface ComicScene {
  url: string;
  caption?: string; // 백엔드에서 "[나레이션] ... [대사] ..." 형태로 넘어오는 텍스트
}

interface CartoonItem {
  news_id: number;
  title: string;
  source?: string;
  summary?: string;
  comic_urls: (ComicScene | string)[];
  published_at: string;
}

// ─── 단순화된 만화 패널 컴포넌트 ───────────────────────────────────────────
function SimpleComicPanel({ scene }: { scene: any }) {
  const imageUrl = typeof scene === "string" ? scene : scene.url;
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  return (
    <div className="relative w-full overflow-hidden bg-white">
      <div className="relative w-full min-h-[400px] sm:min-h-[600px] bg-slate-100 flex items-center justify-center">
        {/* 로딩 표시 */}
        {isLoading && !hasError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 gap-4 z-10">
            <div className="w-48 h-2 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-yellow-400 rounded-full w-full animate-pulse" />
            </div>
            <p className="text-slate-400 text-xs font-mono tracking-widest animate-pulse">
              AI가 만화를 그리는 중...
            </p>
          </div>
        )}

        {/* 에러 상태 */}
        {hasError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-slate-400 gap-3 z-10">
            <span className="text-5xl">🎨</span>
            <p className="text-sm font-bold">이미지를 불러올 수 없습니다.</p>
          </div>
        )}

        {/* 단순 이미지 렌더링 (SVG 제거) */}
        {imageUrl && (
          <img
            src={imageUrl}
            alt="AI News Comic"
            className="w-full h-auto object-contain relative z-0 shadow-inner"
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setHasError(true);
            }}
          />
        )}
      </div>
    </div>
  );
}

// ─── 컴포넌트: 만화 카드 ────────────────────────────
function CartoonCard({
  item,
  highlight,
}: {
  item: CartoonItem;
  highlight: boolean;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    const currentRef = cardRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
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
        rounded-3xl overflow-hidden shadow-[8px_8px_0px_0px_rgba(15,23,42,1)]
        border-4 border-slate-900 transition-all duration-700
        ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-16"}
        ${highlight ? "ring-4 ring-yellow-400 ring-offset-4" : ""}
      `}
    >
      {/* ─ 카드 헤더 ── */}
      <div className="bg-slate-900 text-white px-6 pt-6 pb-5">
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <span className="bg-yellow-400 text-slate-900 text-[10px] font-black px-2 py-0.5 rounded uppercase">
            {item.source || "NEWS"}
          </span>
          <span className="text-slate-400 text-xs font-mono">{dateStr}</span>
        </div>

        <h2 className="text-xl sm:text-2xl font-black text-white leading-tight mb-3 break-keep">
          {item.title}
        </h2>

        {item.summary && (
          <p className="text-slate-300 text-sm leading-relaxed line-clamp-2 border-t border-slate-700 pt-3">
            {item.summary}
          </p>
        )}

        <Link
          to={`/news/${item.news_id}`}
          className="inline-flex items-center gap-2 mt-4 text-sm font-bold text-slate-900 bg-yellow-400
            border-2 border-yellow-300 px-4 py-2 rounded-full
            hover:bg-yellow-300 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_rgba(255,255,255,0.3)] transition-all"
        >
          원본 기사 보기
        </Link>
      </div>

      {/* ─ 웹툰 영역 (단순화됨) ── */}
      <div className="bg-white border-t-4 border-slate-900">
        <div className="flex items-center justify-between px-5 py-2 border-b-2 border-slate-900 bg-yellow-400">
          <span className="text-slate-900 font-black text-xs tracking-tighter uppercase">
            TODAY'S AI NEWS COMIC
          </span>
        </div>

        <div className="border-l-0 border-r-0">
          {item.comic_urls.length > 0 && (
            <SimpleComicPanel scene={item.comic_urls[0]} />
          )}
        </div>

        <div className="py-4 bg-slate-50 border-t-2 border-slate-900 text-center">
          <span className="text-slate-400 font-bold text-[10px] tracking-widest uppercase">
            Generated by AI Comic Engine
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

        // 날짜 기준 최신순(내림차순) 정렬 로직 추가
        const sortedCartoons = res.data.sort(
          (a: CartoonItem, b: CartoonItem) => {
            // published_at이 없을 경우를 대비한 방어 로직 포함
            const dateA = a.published_at
              ? new Date(a.published_at).getTime()
              : 0;
            const dateB = b.published_at
              ? new Date(b.published_at).getTime()
              : 0;

            return dateB - dateA; // 최신 날짜가 먼저 오도록 정렬
          },
        );

        setCartoons(sortedCartoons);
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
