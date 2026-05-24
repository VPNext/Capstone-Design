import { useEffect, useRef, useState, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../api";

// ─── 타입 (원본 유지) ────────────────────────────────────────────────────────
interface ComicScene {
  url: string;
  caption?: string;
}

interface CartoonItem {
  news_id: number;
  title: string;
  source?: string;
  summary?: string;
  comic_urls: (ComicScene | string)[];
  published_at: string;
}

// ─── 언론사 배지 색상 ─────────────────────────────────────────────────────────
const SOURCE_BADGE_CLASS: Record<string, string> = {
  한겨레: "badge-hani",
  경향신문: "badge-khan",
  조선일보: "badge-chosun",
  중앙일보: "badge-joongang",
  동아일보: "badge-donga",
  MBC: "badge-mbc",
  KBS: "badge-kbs",
  SBS: "badge-sbs",
  YTN: "badge-ytn",
  한국경제: "badge-hankyung",
  매일경제: "badge-mk",
  연합뉴스: "badge-yonhap",
};

// ─── 만화 패널 컴포넌트 (원본 로직 유지, 스타일 개선) ────────────────────────
function SimpleComicPanel({ scene }: { scene: any }) {
  const imageUrl = typeof scene === "string" ? scene : scene.url;
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ background: "#0D0B09" }}
    >
      <div
        className="relative w-full flex items-center justify-center"
        style={{ minHeight: "360px", background: "#0D0B09" }}
      >
        {/* 로딩 */}
        {isLoading && !hasError && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-5 z-10"
            style={{ background: "#0D0B09" }}
          >
            {/* 스피너 */}
            <div
              className="w-12 h-12 rounded-full border-2 animate-spin"
              style={{
                borderColor: "rgba(255,255,255,0.1)",
                borderTopColor: "#FBBF24",
              }}
            />
            <div className="flex flex-col items-center gap-2">
              <p
                className="text-xs font-black uppercase tracking-widest animate-pulse"
                style={{
                  color: "rgba(255,255,255,0.4)",
                  letterSpacing: "0.25em",
                }}
              >
                AI가 만화를 그리는 중...
              </p>
              {/* 프로그레스 바 */}
              <div
                className="w-40 h-1 rounded-full overflow-hidden"
                style={{ background: "rgba(255,255,255,0.08)" }}
              >
                <div
                  className="h-full rounded-full animate-pulse"
                  style={{
                    background: "linear-gradient(90deg, #FBBF24, #F59E0B)",
                    width: "100%",
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* 에러 */}
        {hasError && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10"
            style={{ background: "#0D0B09" }}
          >
            <span className="text-5xl">🎨</span>
            <p
              className="text-sm font-bold"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              이미지를 불러올 수 없습니다.
            </p>
          </div>
        )}

        {/* 이미지 */}
        {imageUrl && (
          <img
            src={imageUrl}
            alt="AI News Comic"
            className="w-full h-auto object-contain relative z-0"
            style={{ display: hasError ? "none" : "block" }}
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

// ─── 만화 카드 컴포넌트 ───────────────────────────────────────────────────────
function CartoonCard({
  item,
  highlight,
}: {
  item: CartoonItem;
  highlight: boolean;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(highlight);

  // 하이라이트 스크롤 (원본 유지)
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

  // IntersectionObserver fade-in (원본 유지)
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

  const badgeClass =
    item.source && SOURCE_BADGE_CLASS[item.source]
      ? SOURCE_BADGE_CLASS[item.source]
      : "badge-default";

  return (
    <article
      ref={cardRef}
      id={`comic-${item.news_id}`}
      className="overflow-hidden transition-all duration-700"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(40px)",
        borderRadius: "24px",
        border: highlight ? "3px solid #FBBF24" : "1px solid #E4DDD3",
        boxShadow: highlight
          ? "0 0 0 6px rgba(251,191,36,0.15), 0 12px 48px rgba(22,19,17,0.15)"
          : "0 4px 24px rgba(22,19,17,0.1)",
        background: "#ffffff",
      }}
    >
      {/* ─── 카드 상단 헤더 ─── */}
      <div style={{ background: "#141210" }}>
        {/* 언론사 + 날짜 스트립 */}
        <div
          className="flex items-center justify-between px-6 pt-5 pb-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="flex items-center gap-2.5">
            <span
              className={`${badgeClass} text-[10px] font-black px-3 py-1.5 rounded-full`}
            >
              {item.source || "NEWS"}
            </span>
            <span
              className="text-[11px] font-medium"
              style={{
                color: "rgba(255,255,255,0.3)",
                fontFamily: "'Noto Sans KR', sans-serif",
              }}
            >
              {dateStr}
            </span>
          </div>
          {/* AI Comics 라벨 */}
          <div className="flex items-center gap-1.5">
            <div
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: "#FBBF24" }}
            />
            <span
              className="text-[9px] font-black uppercase tracking-widest"
              style={{
                color: "rgba(255,255,255,0.25)",
                letterSpacing: "0.2em",
              }}
            >
              AI COMIC
            </span>
          </div>
        </div>

        {/* 제목 */}
        <div className="px-6 pt-5 pb-2">
          <h2
            className="font-black text-white leading-snug break-keep mb-4"
            style={{
              fontFamily: "'Noto Serif KR', serif",
              fontSize: "clamp(18px, 3vw, 24px)",
              lineHeight: 1.4,
            }}
          >
            {item.title}
          </h2>

          {item.summary && (
            <p
              className="text-sm leading-relaxed line-clamp-2 mb-5"
              style={{
                color: "rgba(255,255,255,0.45)",
                fontFamily: "'Noto Sans KR', sans-serif",
              }}
            >
              {item.summary}
            </p>
          )}

          <Link
            to={`/news/${item.news_id}`}
            className="inline-flex items-center gap-2 text-[13px] font-black rounded-full transition-all duration-200 mb-6"
            style={{
              background: "#FBBF24",
              color: "#141210",
              padding: "8px 18px",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "#F59E0B";
              (e.currentTarget as HTMLElement).style.transform =
                "translateY(-1px)";
              (e.currentTarget as HTMLElement).style.boxShadow =
                "0 4px 16px rgba(251,191,36,0.4)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "#FBBF24";
              (e.currentTarget as HTMLElement).style.transform =
                "translateY(0)";
              (e.currentTarget as HTMLElement).style.boxShadow = "none";
            }}
          >
            원본 기사 보기
            <svg
              className="w-3.5 h-3.5"
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
          </Link>
        </div>
      </div>

      {/* ─── 만화 영역 ─── */}
      <div>
        {/* 섹션 타이틀 바 */}
        <div
          className="flex items-center justify-between px-5 py-2.5"
          style={{
            background: "#FBBF24",
            borderTop: "none",
          }}
        >
          <span
            className="font-black text-[10px] uppercase tracking-widest"
            style={{ color: "#141210", letterSpacing: "0.18em" }}
          >
            TODAY'S AI NEWS COMIC
          </span>
          <span
            className="text-[9px] font-bold"
            style={{ color: "rgba(20,18,16,0.5)", letterSpacing: "0.1em" }}
          >
            Generated by AI
          </span>
        </div>

        {/* 패널 렌더링 */}
        {item.comic_urls.length > 0 && (
          <SimpleComicPanel scene={item.comic_urls[0]} />
        )}

        {/* 하단 크레딧 */}
        <div
          className="py-3.5 text-center"
          style={{ background: "#F7F4EF", borderTop: "1px solid #E4DDD3" }}
        >
          <span
            className="text-[9px] font-black uppercase tracking-widest"
            style={{ color: "#9C9891", letterSpacing: "0.2em" }}
          >
            AI Comic Engine · 뉴스 정보 나침반
          </span>
        </div>
      </div>
    </article>
  );
}

// ─── 스켈레톤 카드 ────────────────────────────────────────────────────────────
function SkeletonComicCard() {
  return (
    <div
      className="overflow-hidden rounded-3xl"
      style={{
        border: "1px solid #E4DDD3",
        boxShadow: "0 4px 24px rgba(22,19,17,0.08)",
      }}
    >
      {/* 헤더 */}
      <div style={{ background: "#141210", padding: "24px" }}>
        <div className="flex items-center gap-2.5 mb-5">
          <div
            className="shimmer h-6 w-16 rounded-full"
            style={{ background: "rgba(255,255,255,0.08)" }}
          />
          <div
            className="shimmer h-4 w-24 rounded"
            style={{ background: "rgba(255,255,255,0.06)" }}
          />
        </div>
        <div
          className="shimmer h-7 w-full rounded mb-2.5"
          style={{ background: "rgba(255,255,255,0.08)" }}
        />
        <div
          className="shimmer h-7 w-4/5 rounded mb-4"
          style={{ background: "rgba(255,255,255,0.06)" }}
        />
        <div
          className="shimmer h-4 w-full rounded mb-1.5"
          style={{ background: "rgba(255,255,255,0.05)" }}
        />
        <div
          className="shimmer h-4 w-2/3 rounded mb-5"
          style={{ background: "rgba(255,255,255,0.05)" }}
        />
        <div
          className="shimmer h-9 w-32 rounded-full"
          style={{ background: "rgba(255,255,255,0.08)" }}
        />
      </div>
      {/* 이미지 영역 */}
      <div
        className="shimmer"
        style={{ height: "380px", background: "#ede9e2" }}
      />
      {/* 하단 */}
      <div style={{ height: "44px", background: "#F7F4EF" }} />
    </div>
  );
}

// ─── 메인 페이지 컴포넌트 ─────────────────────────────────────────────────────
export default function CartoonsPage() {
  const [cartoons, setCartoons] = useState<CartoonItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const targetNewsId = searchParams.get("newsId");

  // ── 데이터 Fetch (원본 로직 100% 유지) ──
  useEffect(() => {
    const fetchCartoons = async () => {
      try {
        const res = await api.get("/api/cartoons");

        const sortedCartoons = res.data.sort(
          (a: CartoonItem, b: CartoonItem) => {
            const dateA = a.published_at
              ? new Date(a.published_at).getTime()
              : 0;
            const dateB = b.published_at
              ? new Date(b.published_at).getTime()
              : 0;
            return dateB - dateA;
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

  // ─── 로딩 스켈레톤 ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        className="mt-8 pb-24"
        style={{ fontFamily: "'Noto Sans KR', sans-serif" }}
      >
        {/* 페이지 헤더 */}
        <PageHeader />
        <div className="flex flex-col gap-10">
          <SkeletonComicCard />
          <SkeletonComicCard />
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      className="mt-8 pb-24"
      style={{ fontFamily: "'Noto Sans KR', sans-serif" }}
    >
      {/* ─── 페이지 헤더 ─────────────────────────────────────────── */}
      <PageHeader count={cartoons.length} />

      {/* ─── 비어있는 상태 ───────────────────────────────────────── */}
      {cartoons.length === 0 ? (
        <div
          className="text-center py-24 rounded-3xl flex flex-col items-center gap-5"
          style={{
            border: "2px dashed #D1CAC0",
            background: "rgba(255,255,255,0.6)",
          }}
        >
          <span style={{ fontSize: "64px" }}>🖌️</span>
          <div>
            <p className="text-lg font-black mb-2" style={{ color: "#2C2926" }}>
              아직 생성된 만화가 없습니다
            </p>
            <p className="text-sm" style={{ color: "#9C9891" }}>
              기사 상세 페이지에서 만화 생성 버튼을 눌러보세요!
            </p>
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-black rounded-full transition-all duration-200"
            style={{
              background: "#161311",
              color: "#fff",
              padding: "12px 24px",
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
      ) : (
        <div className="flex flex-col gap-12">
          {cartoons.map((item) => (
            <CartoonCard
              key={item.news_id}
              item={item}
              highlight={targetNewsId === String(item.news_id)}
            />
          ))}

          {/* 하단 마무리 */}
          <div
            className="py-8 flex flex-col items-center gap-3"
            style={{ color: "#9C9891" }}
          >
            <div className="flex items-center gap-3">
              <div className="h-px w-16" style={{ background: "#E4DDD3" }} />
              <span className="text-sm font-medium">
                모든 만화를 불러왔습니다
              </span>
              <div className="h-px w-16" style={{ background: "#E4DDD3" }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 페이지 헤더 서브컴포넌트 ────────────────────────────────────────────────
function PageHeader({ count }: { count?: number }) {
  return (
    <header className="mb-12">
      {/* 배너 */}
      <div
        className="relative overflow-hidden rounded-3xl mb-8 flex flex-col items-center justify-center text-center py-14 px-6"
        style={{
          background:
            "linear-gradient(135deg, #141210 0%, #1E1A16 50%, #141210 100%)",
          boxShadow: "0 8px 40px rgba(22,19,17,0.2)",
        }}
      >
        {/* 배경 텍스처 — 장식 원 */}
        <div
          className="absolute top-0 right-0 w-72 h-72 rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(251,191,36,0.06) 0%, transparent 70%)",
            transform: "translate(30%, -30%)",
          }}
        />
        <div
          className="absolute bottom-0 left-0 w-48 h-48 rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%)",
            transform: "translate(-30%, 30%)",
          }}
        />

        {/* 배지 */}
        <div
          className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-5"
          style={{
            background: "rgba(251,191,36,0.12)",
            border: "1px solid rgba(251,191,36,0.25)",
          }}
        >
          <div
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: "#FBBF24" }}
          />
          <span
            className="font-black text-[10px] uppercase"
            style={{ color: "#FBBF24", letterSpacing: "0.22em" }}
          >
            AI COMICS GALLERY
          </span>
        </div>

        {/* 타이틀 */}
        <h1
          className="font-black text-white mb-3"
          style={{
            fontFamily: "'Noto Serif KR', serif",
            fontSize: "clamp(28px, 5vw, 48px)",
            lineHeight: 1.2,
          }}
        >
          AI 만화 모음집
        </h1>
        <p
          className="max-w-sm leading-relaxed"
          style={{
            color: "rgba(255,255,255,0.4)",
            fontSize: "14px",
            fontFamily: "'Noto Sans KR', sans-serif",
          }}
        >
          AI가 뉴스를 읽고 직접 그린 웹툰 갤러리입니다.
          <br />
          이미지 생성에는 최대 1분이 걸릴 수 있습니다.
        </p>

        {/* 카운트 */}
        {count !== undefined && count > 0 && (
          <div
            className="mt-5 flex items-center gap-2 px-5 py-2 rounded-full"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <span className="text-2xl font-black text-white">{count}</span>
            <span
              className="text-sm"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              개의 만화 수록
            </span>
          </div>
        )}
      </div>

      {/* 뉴스 목록으로 링크 */}
      <div className="flex items-center justify-center">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-bold transition-all duration-200"
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
          뉴스 목록으로 돌아가기
        </Link>
      </div>
    </header>
  );
}
