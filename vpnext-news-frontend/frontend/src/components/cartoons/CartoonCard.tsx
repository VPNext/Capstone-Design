import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { SOURCE_BADGE_CLASS_KO } from "../../constants/source";
import { extractTextFromSummary } from "../../utils/summary";
import type { CartoonItem } from "../../types/news";
import SimpleComicPanel from "./SimpleComicPanel";

interface CartoonCardProps {
  item: CartoonItem;
  highlight: boolean;
}

export default function CartoonCard({ item, highlight }: CartoonCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(highlight);
  const [currentPanelIndex, setCurrentPanelIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const totalPanels = item.comic_urls.length;

  useEffect(() => {
    if (highlight && cardRef.current) {
      const timer = setTimeout(() => {
        cardRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [highlight]);

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

  const dateStr = item.published_at
    ? new Date(item.published_at).toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  const badgeClass =
    item.source && SOURCE_BADGE_CLASS_KO[item.source]
      ? SOURCE_BADGE_CLASS_KO[item.source]
      : "badge-default";

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentPanelIndex((prev) => (prev > 0 ? prev - 1 : prev));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentPanelIndex((prev) => (prev < totalPanels - 1 ? prev + 1 : prev));
  };

  const currentScene = totalPanels > 0 ? item.comic_urls[currentPanelIndex] : null;
  const currentImageUrl = currentScene
    ? typeof currentScene === "string"
      ? currentScene
      : currentScene.url
    : "";
  const currentCaption = currentScene
    ? typeof currentScene === "string"
      ? null
      : currentScene.caption
    : null;

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
              AI NEWS COMIC ({currentPanelIndex + 1}/{totalPanels})
            </span>
            <span className="text-[9px] font-bold text-[#141210]/45 tracking-[0.1em]">
              Generated by AI · 탭하여 크게 보기
            </span>
          </div>

          {/* 슬라이더 / 뷰어 영역 */}
          <div className="relative group bg-[#0A0806] overflow-hidden flex flex-col items-center">
            {/* 이미지 클릭 시 라이트박스 실행 */}
            <div 
              className="w-full cursor-zoom-in relative flex items-center justify-center"
              onClick={() => setIsLightboxOpen(true)}
            >
              {totalPanels > 0 && (
                <SimpleComicPanel scene={item.comic_urls[currentPanelIndex]} />
              )}

              {/* 좌/우 네비게이션 버튼 (마우스 오버 시 페이드 인) */}
              {totalPanels > 1 && (
                <>
                  <button
                    onClick={handlePrev}
                    disabled={currentPanelIndex === 0}
                    className="absolute left-4 z-10 p-2.5 rounded-full bg-black/60 border border-white/10 text-white transition-all hover:bg-[#FBBF24] hover:text-[#141210] disabled:opacity-0 disabled:pointer-events-none cursor-pointer md:opacity-0 md:group-hover:opacity-100"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>

                  <button
                    onClick={handleNext}
                    disabled={currentPanelIndex === totalPanels - 1}
                    className="absolute right-4 z-10 p-2.5 rounded-full bg-black/60 border border-white/10 text-white transition-all hover:bg-[#FBBF24] hover:text-[#141210] disabled:opacity-0 disabled:pointer-events-none cursor-pointer md:opacity-0 md:group-hover:opacity-100"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </>
              )}
            </div>

            {/* 캡션 텍스트 박 */}
            {currentCaption && (
              <div className="w-full bg-[#141210] border-t border-white/5 px-6 py-4 text-center">
                <p className="text-sm font-medium text-white/80 leading-relaxed font-sans max-w-2xl mx-auto">
                  &ldquo; {currentCaption} &rdquo;
                </p>
              </div>
            )}
          </div>

          {/* 인디케이터 점(Dots) 영역 */}
          {totalPanels > 1 && (
            <div className="flex justify-center items-center gap-2.5 py-4 bg-[#141210] border-t border-white/5">
              {Array.from({ length: totalPanels }).map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentPanelIndex(idx)}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    idx === currentPanelIndex
                      ? "bg-[#FBBF24] scale-125 shadow-[0_0_8px_rgba(251,191,36,0.5)]"
                      : "bg-white/20 hover:bg-white/45"
                  } cursor-pointer`}
                />
              ))}
            </div>
          )}

          {/* 하단 크레딧 바 */}
          <div className="py-3.5 text-center bg-[#F7F4EF] border-t border-[#E4DDD3]">
            <span className="text-[9px] font-black uppercase text-[#C9C3BA] tracking-[0.2em]">
              AI Comic Engine · 뉴스 정보 나침반
            </span>
          </div>
        </div>
      </article>

      {/* 고품질 라이트박스 모달 팝업 (Fullscreen UX) */}
      {isLightboxOpen && (
        <div 
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 animate-fade-in p-4 sm:p-8"
          onClick={() => setIsLightboxOpen(false)}
        >
          {/* 닫기 버튼 */}
          <button 
            className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors duration-200 cursor-pointer"
            onClick={() => setIsLightboxOpen(false)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* 라이트박스 타이틀 */}
          <div className="absolute top-6 left-6 text-white max-w-[calc(100%-120px)] hidden sm:block">
            <h3 className="text-base font-bold font-serif line-clamp-1">{item.title}</h3>
            <p className="text-xs text-white/45 mt-0.5">AI 만화 컷 ({currentPanelIndex + 1}/{totalPanels})</p>
          </div>

          {/* 메인 이미지 오버레이 */}
          <div 
            className="relative max-w-4xl max-h-[75vh] w-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 이전 버튼 */}
            {totalPanels > 1 && (
              <button
                onClick={handlePrev}
                disabled={currentPanelIndex === 0}
                className="absolute -left-4 sm:-left-16 z-10 p-3 rounded-full bg-white/5 hover:bg-[#FBBF24] hover:text-[#141210] border border-white/10 text-white transition-all disabled:opacity-0 disabled:pointer-events-none cursor-pointer"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}

            {currentImageUrl && (
              <img 
                src={currentImageUrl} 
                alt="AI 만화 컷 원본" 
                className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl scale-in"
              />
            )}

            {/* 다음 버튼 */}
            {totalPanels > 1 && (
              <button
                onClick={handleNext}
                disabled={currentPanelIndex === totalPanels - 1}
                className="absolute -right-4 sm:-right-16 z-10 p-3 rounded-full bg-white/5 hover:bg-[#FBBF24] hover:text-[#141210] border border-white/10 text-white transition-all disabled:opacity-0 disabled:pointer-events-none cursor-pointer"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>

          {/* 하단 캡션 텍스트 박스 */}
          {currentCaption && (
            <div 
              className="mt-8 max-w-xl text-center bg-white/5 border border-white/10 p-4.5 rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-sm font-medium text-white/90 leading-relaxed font-sans">
                &ldquo; {currentCaption} &rdquo;
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
