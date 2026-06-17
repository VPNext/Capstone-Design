import { useEffect, useRef, useState, useMemo, useCallback, memo } from "react";
import { Link } from "react-router-dom";
import { SOURCE_BADGE_CLASS_KO } from "../../constants/source";
import { extractTextFromSummary } from "../../utils/summary";
import type { CartoonItem } from "../../types/news";
import SimpleComicPanel from "./SimpleComicPanel";
import CartoonLightbox from "./CartoonLightbox";

interface CartoonCardProps {
  item: CartoonItem;
  highlight: boolean;
  viewMode?: "feed" | "grid" | "webtoon";
  onSelect?: (newsId: string) => void;
}

function CartoonCard({ item, highlight, viewMode = "feed", onSelect }: CartoonCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(highlight);
  const [currentPanelIndex, setCurrentPanelIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const totalPanels = item.comic_urls.length;

  useEffect(() => {
    if (highlight && viewMode === "grid" && cardRef.current) {
      const timer = setTimeout(() => {
        cardRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [highlight, viewMode]);

  useEffect(() => {
    const currentRef = cardRef.current;
    if (!currentRef) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
          observer.unobserve(currentRef);
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" },
    );
    observer.observe(currentRef);
    return () => {
      observer.disconnect();
    };
  }, []);

  // 라이트박스가 열렸을 때 바디 스크롤을 막는 효과 추가 (UX 최적화)
  useEffect(() => {
    if (isLightboxOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isLightboxOpen]);

  const dateStr = useMemo(() => {
    if (!item.published_at) return "";
    return new Date(item.published_at).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, [item.published_at]);

  const badgeClass = useMemo(() => {
    return item.source && SOURCE_BADGE_CLASS_KO[item.source]
      ? SOURCE_BADGE_CLASS_KO[item.source]
      : "badge-default";
  }, [item.source]);

  const handlePrev = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentPanelIndex((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  const handleNext = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentPanelIndex((prev) => (prev < totalPanels - 1 ? prev + 1 : prev));
  }, [totalPanels]);

  const handleOpenLightbox = useCallback(() => {
    setIsLightboxOpen(true);
  }, []);

  const handleCloseLightbox = useCallback(() => {
    setIsLightboxOpen(false);
  }, []);

  const currentScene = useMemo(() => {
    return totalPanels > 0 ? item.comic_urls[currentPanelIndex] : null;
  }, [item.comic_urls, currentPanelIndex, totalPanels]);

  const currentImageUrl = useMemo(() => {
    if (!currentScene) return "";
    return typeof currentScene === "string" ? currentScene : currentScene.url;
  }, [currentScene]);

  const currentCaption = useMemo(() => {
    if (!currentScene || typeof currentScene === "string") return null;
    return currentScene.caption ?? null;
  }, [currentScene]);

  // 💡 방안 C: 갤러리 그리드 모드 전용 콤팩트 카드 렌더링
  if (viewMode === "grid") {
    return (
      <>
        <article
          ref={cardRef}
          id={`comic-${item.news_id}`}
          onClick={() => onSelect && onSelect(String(item.news_id))}
          className={`overflow-hidden bg-[#141210] rounded-[24px] border border-white/5 hover:border-[#FBBF24]/50 cursor-pointer flex flex-col h-full group hover:-translate-y-1 shadow-[0_6px_24px_rgba(0,0,0,0.25)] transition-all duration-300 ${
            highlight
              ? "border-2 border-[#FBBF24]"
              : ""
          }`}
        >
          {/* 대표 1컷 노출 */}
          <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#0A0806] border-b border-white/5">
            {totalPanels > 0 && (
              <SimpleComicPanel scene={item.comic_urls[0]} />
            )}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
              <span className="bg-[#FBBF24] text-[#141210] font-black text-xs px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-1 transition-transform duration-300 scale-95 group-hover:scale-100">
                🔍 크게 감상하기
              </span>
            </div>
          </div>

          {/* 정보 텍스트 */}
          <div className="p-5 flex flex-col flex-1 justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <span className={`${badgeClass} text-[9px] font-black px-2.5 py-1 rounded-full`}>
                  {item.source || "NEWS"}
                </span>
                <span className="text-[10px] font-medium text-white/30 font-sans">
                  {dateStr}
                </span>
              </div>
              <h2 className="font-black text-white text-[15px] leading-snug line-clamp-2 break-keep font-serif tracking-[-0.01em]">
                {item.title}
              </h2>
            </div>

            <Link
              to={`/news/${item.news_id}`}
              onClick={(e) => e.stopPropagation()}
              className="text-[11px] font-black text-[#FBBF24] hover:text-[#F59E0B] transition-colors mt-auto inline-flex items-center gap-1.5 self-start"
            >
              원본 기사 보기
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </article>

        <CartoonLightbox
          isOpen={isLightboxOpen}
          onClose={handleCloseLightbox}
          title={item.title}
          currentPanelIndex={currentPanelIndex}
          totalPanels={totalPanels}
          currentImageUrl={currentImageUrl}
          currentCaption={currentCaption}
          onPrev={handlePrev}
          onNext={handleNext}
        />
      </>
    );
  }

  return (
    <>
      <article
        ref={cardRef}
        id={`comic-${item.news_id}`}
        className={`overflow-hidden bg-white transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] rounded-[28px] ${
          highlight
            ? "border-2 border-[#FBBF24] shadow-[0_0_0_6px_rgba(251,191,36,0.12),_0_16px_56px_rgba(22,19,17,0.18)]"
            : "border border-[#E4DDD3] shadow-[0_6px_32px_rgba(22,19,17,0.1)]"
        } ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"}`}
      >
        {/* 카드 헤더 (dark) */}
        <div className="bg-[#141210]">
          {/* 상단 메타 스트립 */}
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/6">
            <div className="flex items-center gap-2.5">
              <span className={`${badgeClass} text-[10px] font-black px-3 py-1.5 rounded-full`}>
                {item.source || "NEWS"}
              </span>
              <span className="text-[11px] font-medium font-sans text-white/28">
                {dateStr}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full animate-pulse bg-[#FBBF24]" />
              <span className="text-[9px] font-black uppercase text-white/22 tracking-[0.22em]">
                AI COMIC
              </span>
            </div>
          </div>

          {/* 제목 + 요약 + 링크 */}
          <div className="px-6 pt-5 pb-6">
            <h2
              className="font-black text-white leading-snug break-keep mb-3 font-serif text-[clamp(17px,3vw,23px)] tracking-[-0.01em]"
            >
              {item.title}
            </h2>

            {item.summary && (
              <p className="text-sm leading-relaxed line-clamp-2 mb-5 font-sans text-white/40">
                {extractTextFromSummary(item.summary)}
              </p>
            )}

            <Link
              to={`/news/${item.news_id}`}
              className="inline-flex items-center gap-2 text-[12px] font-black px-4.5 py-2 rounded-full bg-[#FBBF24] text-[#141210] transition-all duration-200 hover:bg-[#F59E0B] hover:-translate-y-[1px] hover:shadow-[0_4px_16px_rgba(251,191,36,0.4)]"
            >
              원본 기사 보기
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </div>

        {/* 만화 영역 */}
        <div>
          {/* 섹션 타이틀 바 */}
          <div className="flex items-center justify-between px-5 py-2.5 bg-[#FBBF24]">
            <span className="font-black text-[10px] uppercase tracking-[0.18em] text-[#141210]">
              AI NEWS COMIC (웹툰 연속 보기)
            </span>
            <span className="text-[9px] font-bold text-[#141210]/45 tracking-[0.1em]">
              Generated by AI · 스크롤하여 감상
            </span>
          </div>

          {/* 웹툰 종스크롤 감상 모드 */}
          <div className="bg-[#0A0806] py-8 px-4 flex flex-col gap-8 items-center overflow-hidden">
            {item.comic_urls.map((scene, idx) => {
              const caption = typeof scene === "string" ? null : scene.caption;
              return (
                <div key={idx} className="w-full max-w-[480px] flex flex-col items-center border-b border-white/5 pb-8 last:border-0 last:pb-0">
                  <span className="text-[9px] text-[#FBBF24]/50 font-black uppercase tracking-[0.25em] mb-3 self-start px-1">
                    CUT {idx + 1}
                  </span>
                  <div 
                    className="w-full overflow-hidden bg-[#0A0806] rounded-2xl border border-white/10 shadow-[0_4px_16px_rgba(0,0,0,0.4)] transition-transform duration-300 hover:scale-[1.01] cursor-zoom-in" 
                    onClick={() => {
                      setCurrentPanelIndex(idx);
                      handleOpenLightbox();
                    }}
                  >
                    <SimpleComicPanel scene={scene} />
                  </div>
                  {caption && (
                    <div className="w-full bg-[#141210] rounded-xl border border-white/5 px-4 py-3 text-center mt-3.5">
                      <p className="text-xs font-semibold text-white/80 leading-relaxed font-sans">
                        &ldquo; {caption} &rdquo;
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 하단 크레딧 바 */}
          <div className="py-3.5 text-center bg-[#F7F4EF] border-t border-[#E4DDD3]">
            <span className="text-[9px] font-black uppercase text-[#C9C3BA] tracking-[0.2em]">
              AI Comic Engine · 뉴스 정보 나침반
            </span>
          </div>
        </div>
      </article>

      {/* 고품질 라이트박스 모달 팝업 (Fullscreen UX) */}
      <CartoonLightbox
        isOpen={isLightboxOpen}
        onClose={handleCloseLightbox}
        title={item.title}
        currentPanelIndex={currentPanelIndex}
        totalPanels={totalPanels}
        currentImageUrl={currentImageUrl}
        currentCaption={currentCaption}
        onPrev={handlePrev}
        onNext={handleNext}
      />
    </>
  );
}

export default memo(CartoonCard);
