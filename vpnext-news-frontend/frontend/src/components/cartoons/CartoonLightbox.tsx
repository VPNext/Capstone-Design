import React, { memo } from "react";

interface CartoonLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  currentPanelIndex: number;
  totalPanels: number;
  currentImageUrl: string;
  currentCaption: string | null;
  onPrev: (e: React.MouseEvent) => void;
  onNext: (e: React.MouseEvent) => void;
}

function CartoonLightbox({
  isOpen,
  onClose,
  title,
  currentPanelIndex,
  totalPanels,
  currentImageUrl,
  currentCaption,
  onPrev,
  onNext,
}: CartoonLightboxProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 animate-fade-in p-4 sm:p-8"
      onClick={onClose}
    >
      {/* 닫기 버튼 */}
      <button
        className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors duration-200 cursor-pointer"
        onClick={onClose}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* 라이트박스 타이틀 */}
      <div className="absolute top-6 left-6 text-white max-w-[calc(100%-120px)] hidden sm:block">
        <h3 className="text-base font-bold font-serif line-clamp-1">{title}</h3>
        <p className="text-xs text-white/45 mt-0.5">
          AI 만화 컷 ({currentPanelIndex + 1}/{totalPanels})
        </p>
      </div>

      {/* 메인 이미지 오버레이 */}
      <div
        className="relative max-w-4xl max-h-[75vh] w-full flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 이전 버튼 */}
        {totalPanels > 1 && (
          <button
            onClick={onPrev}
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
            onClick={onNext}
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
  );
}

export default memo(CartoonLightbox);
