import { useEffect, useRef, useState, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../api";

// ─── 타입 ────────────────────────────────────────────────────────────────────
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

// ─── 만화 패널 컴포넌트 ───────────────────────────────────────────────────────
function SimpleComicPanel({ scene }: { scene: any }) {
  const imageUrl = typeof scene === "string" ? scene : scene.url;
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ background: "#0A0806" }}
    >
      <div
        className="relative w-full flex items-center justify-center"
        style={{ minHeight: "380px", background: "#0A0806" }}
      >
        {/* 로딩 상태 */}
        {isLoading && !hasError && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-5 z-10"
            style={{ background: "#0A0806" }}
          >
            <div className="relative">
              <div
                className="w-14 h-14 rounded-full border-2 animate-spin"
                style={{
                  borderColor: "rgba(255,255,255,0.07)",
                  borderTopColor: "#FBBF24",
                }}
              />
              <div
                className="absolute inset-0 rounded-full"
                style={{ boxShadow: "0 0 24px rgba(251,191,36,0.2)" }}
              />
            </div>
            <div className="flex flex-col items-center gap-2.5">
              <p
                className="text-[10px] font-black uppercase tracking-[0.25em] animate-pulse"
                style={{ color: "rgba(255,255,255,0.35)" }}
              >
                AI가 만화를 그리는 중...
              </p>
              <div
                className="w-36 h-0.5 overflow-hidden"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  borderRadius: "999px",
                }}
              >
                <div
                  className="h-full animate-pulse"
                  style={{
                    background: "linear-gradient(90deg, #FBBF24, #F59E0B)",
                    width: "100%",
                    borderRadius: "999px",
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* 에러 상태 */}
        {hasError && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10"
            style={{ background: "#0A0806" }}
          >
            <span className="text-5xl opacity-40">🎨</span>
            <p
              className="text-sm font-bold"
              style={{ color: "rgba(255,255,255,0.3)" }}
            >
              이미지를 불러올 수 없습니다
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
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" },
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
      className="overflow-hidden"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(48px)",
        transition:
          "opacity 0.65s cubic-bezier(0.22,1,0.36,1), transform 0.65s cubic-bezier(0.22,1,0.36,1)",
        borderRadius: "28px",
        border: highlight ? "2px solid #FBBF24" : "1px solid #E4DDD3",
        boxShadow: highlight
          ? "0 0 0 6px rgba(251,191,36,0.12), 0 16px 56px rgba(22,19,17,0.18)"
          : "0 6px 32px rgba(22,19,17,0.1)",
        background: "#ffffff",
      }}
    >
      {/* ── 카드 헤더 (dark) ── */}
      <div style={{ background: "#141210" }}>
        {/* 상단 메타 스트립 */}
        <div
          className="flex items-center justify-between px-6 pt-5 pb-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
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
                color: "rgba(255,255,255,0.28)",
                fontFamily: "'Noto Sans KR', sans-serif",
              }}
            >
              {dateStr}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: "#FBBF24" }}
            />
            <span
              className="text-[9px] font-black uppercase"
              style={{
                color: "rgba(255,255,255,0.22)",
                letterSpacing: "0.22em",
              }}
            >
              AI COMIC
            </span>
          </div>
        </div>

        {/* 제목 + 요약 + 링크 */}
        <div className="px-6 pt-5 pb-6">
          <h2
            className="font-black text-white leading-snug break-keep mb-3"
            style={{
              fontFamily: "'Noto Serif KR', serif",
              fontSize: "clamp(17px, 3vw, 23px)",
              lineHeight: 1.4,
              letterSpacing: "-0.01em",
            }}
          >
            {item.title}
          </h2>

          {item.summary && (
            <p
              className="text-sm leading-relaxed line-clamp-2 mb-5"
              style={{
                color: "rgba(255,255,255,0.4)",
                fontFamily: "'Noto Sans KR', sans-serif",
              }}
            >
              {item.summary}
            </p>
          )}

          <Link
            to={`/news/${item.news_id}`}
            className="inline-flex items-center gap-2 text-[12px] font-black transition-all duration-200"
            style={{
              background: "#FBBF24",
              color: "#141210",
              padding: "8px 18px",
              borderRadius: "999px",
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

      {/* ── 만화 영역 ── */}
      <div>
        {/* 섹션 타이틀 바 */}
        <div
          className="flex items-center justify-between px-5 py-2.5"
          style={{ background: "#FBBF24" }}
        >
          <span
            className="font-black text-[10px] uppercase tracking-widest"
            style={{ color: "#141210", letterSpacing: "0.18em" }}
          >
            TODAY'S AI NEWS COMIC
          </span>
          <span
            className="text-[9px] font-bold"
            style={{ color: "rgba(20,18,16,0.45)", letterSpacing: "0.1em" }}
          >
            Generated by AI
          </span>
        </div>

        {/* 패널 */}
        {item.comic_urls.length > 0 && (
          <SimpleComicPanel scene={item.comic_urls[0]} />
        )}

        {/* 하단 크레딧 바 */}
        <div
          className="py-3.5 text-center"
          style={{ background: "#F7F4EF", borderTop: "1px solid #E4DDD3" }}
        >
          <span
            className="text-[9px] font-black uppercase tracking-widest"
            style={{ color: "#C9C3BA", letterSpacing: "0.2em" }}
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
      className="overflow-hidden"
      style={{
        borderRadius: "28px",
        border: "1px solid #E4DDD3",
        boxShadow: "0 6px 32px rgba(22,19,17,0.08)",
      }}
    >
      <div style={{ background: "#141210", padding: "24px" }}>
        <div className="flex items-center gap-2.5 mb-5">
          <div
            className="h-6 w-16 rounded-full"
            style={{
              background: "rgba(255,255,255,0.08)",
              animation: "shimmer 1.6s ease-in-out infinite",
              backgroundImage:
                "linear-gradient(90deg,rgba(255,255,255,0.05) 25%,rgba(255,255,255,0.12) 50%,rgba(255,255,255,0.05) 75%)",
              backgroundSize: "900px 100%",
            }}
          />
          <div
            className="h-4 w-24 rounded"
            style={{
              background: "rgba(255,255,255,0.06)",
              animation: "shimmer 1.6s ease-in-out infinite 0.1s",
              backgroundImage:
                "linear-gradient(90deg,rgba(255,255,255,0.03) 25%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.03) 75%)",
              backgroundSize: "900px 100%",
            }}
          />
        </div>
        <div
          className="h-7 w-full rounded mb-2.5"
          style={{
            background: "rgba(255,255,255,0.07)",
            animation: "shimmer 1.6s ease-in-out infinite 0.2s",
            backgroundImage:
              "linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.10) 50%,rgba(255,255,255,0.04) 75%)",
            backgroundSize: "900px 100%",
          }}
        />
        <div
          className="h-7 w-4/5 rounded mb-4"
          style={{
            background: "rgba(255,255,255,0.05)",
            animation: "shimmer 1.6s ease-in-out infinite 0.3s",
            backgroundImage:
              "linear-gradient(90deg,rgba(255,255,255,0.03) 25%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.03) 75%)",
            backgroundSize: "900px 100%",
          }}
        />
        <div
          className="h-4 w-full rounded mb-1.5"
          style={{ background: "rgba(255,255,255,0.04)" }}
        />
        <div
          className="h-4 w-2/3 rounded mb-5"
          style={{ background: "rgba(255,255,255,0.04)" }}
        />
        <div
          className="h-9 w-32 rounded-full"
          style={{ background: "rgba(255,255,255,0.07)" }}
        />
      </div>
      <div className="shimmer" style={{ height: "400px" }} />
      <div style={{ height: "46px", background: "#F7F4EF" }} />
    </div>
  );
}

// ─── 페이지 헤더 ─────────────────────────────────────────────────────────────
function PageHeader({ count }: { count?: number }) {
  return (
    <header className="mb-12">
      {/* 메인 배너 */}
      <div
        className="relative overflow-hidden mb-7 flex flex-col items-center justify-center text-center py-14 px-6"
        style={{
          borderRadius: "28px",
          background:
            "linear-gradient(145deg, #0E0C0A 0%, #1A1610 55%, #0E0C0A 100%)",
          boxShadow: "0 12px 48px rgba(22,19,17,0.28)",
        }}
      >
        {/* Decorative blobs */}
        <div
          className="absolute top-0 right-0 w-96 h-96 rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(251,191,36,0.07) 0%, transparent 65%)",
            transform: "translate(30%, -30%)",
          }}
        />
        <div
          className="absolute bottom-0 left-0 w-64 h-64 rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(124,58,237,0.09) 0%, transparent 65%)",
            transform: "translate(-30%, 30%)",
          }}
        />
        <div
          className="absolute top-1/2 left-1/2 w-80 h-80 rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(56,189,248,0.04) 0%, transparent 65%)",
            transform: "translate(-50%, -50%)",
          }}
        />

        {/* Badge */}
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 mb-5"
          style={{
            background: "rgba(251,191,36,0.1)",
            border: "1px solid rgba(251,191,36,0.22)",
            borderRadius: "999px",
          }}
        >
          <div
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: "#FBBF24" }}
          />
          <span
            className="font-black text-[10px] uppercase"
            style={{ color: "#FBBF24", letterSpacing: "0.24em" }}
          >
            AI COMICS GALLERY
          </span>
        </div>

        {/* Title */}
        <h1
          className="font-black text-white mb-3"
          style={{
            fontFamily: "'Noto Serif KR', serif",
            fontSize: "clamp(28px, 5vw, 50px)",
            lineHeight: 1.15,
            letterSpacing: "-0.02em",
          }}
        >
          AI 만화 모음집
        </h1>
        <p
          className="max-w-sm leading-relaxed mb-0"
          style={{
            color: "rgba(255,255,255,0.35)",
            fontSize: "14px",
            fontFamily: "'Noto Sans KR', sans-serif",
          }}
        >
          AI가 뉴스를 읽고 직접 그린 웹툰 갤러리
          <br />
          이미지 생성에는 최대 1분이 걸릴 수 있습니다.
        </p>

        {/* Count pill */}
        {count !== undefined && count > 0 && (
          <div
            className="mt-6 flex items-center gap-2 px-5 py-2.5"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "999px",
            }}
          >
            <span className="text-2xl font-black text-white">{count}</span>
            <span
              className="text-sm"
              style={{ color: "rgba(255,255,255,0.35)" }}
            >
              개의 만화 수록
            </span>
          </div>
        )}
      </div>

      {/* Back link */}
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

// ─── 메인 페이지 ─────────────────────────────────────────────────────────────
export default function CartoonsPage() {
  const [cartoons, setCartoons] = useState<CartoonItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const targetNewsId = searchParams.get("newsId");

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

  // ─── 로딩 상태 ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        className="mt-8 pb-24"
        style={{ fontFamily: "'Noto Sans KR', sans-serif" }}
      >
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
      <PageHeader count={cartoons.length} />

      {/* 비어있는 상태 */}
      {cartoons.length === 0 ? (
        <div
          className="text-center py-24 flex flex-col items-center gap-5"
          style={{
            border: "2px dashed #D1CAC0",
            borderRadius: "24px",
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
      ) : (
        <div className="flex flex-col gap-12">
          {cartoons.map((item) => (
            <CartoonCard
              key={item.news_id}
              item={item}
              highlight={targetNewsId === String(item.news_id)}
            />
          ))}

          <div
            className="py-10 flex flex-col items-center"
            style={{ color: "#9C9891" }}
          >
            <div className="divider-ornate w-full max-w-xs">
              <span className="text-sm font-medium">
                모든 만화를 불러왔습니다
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
