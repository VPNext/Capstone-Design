import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";

interface TooltipPortalProps {
  targetRect: DOMRect | null;
  title: string;
  category?: string;
  description: string;
  link?: string;
  onClose: () => void;
}

export default function TooltipPortal({
  targetRect,
  title,
  category,
  description,
  link,
  onClose,
}: TooltipPortalProps) {
  const [coords, setCoords] = useState({ top: 0, left: 0, isBottom: true });
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!targetRect || isMobile) return;

    const scrollY = window.scrollY;
    const scrollX = window.scrollX;
    
    const tooltipWidth = 290;
    const tooltipHeight = 135;
    
    let left = targetRect.left + scrollX + targetRect.width / 2 - tooltipWidth / 2;
    let top = targetRect.bottom + scrollY + 8;
    let isBottom = true;

    if (left + tooltipWidth > window.innerWidth - 16) {
      left = window.innerWidth - tooltipWidth - 16;
    }
    if (left < 16) {
      left = 16;
    }
    if (targetRect.bottom + tooltipHeight > window.innerHeight + scrollY - 16) {
      top = targetRect.top + scrollY - tooltipHeight - 8;
      isBottom = false;
    }

    setCoords({ top, left, isBottom });

    const handleOutsideClick = (e: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [targetRect, isMobile, onClose]);

  if (!targetRect) return null;

  if (isMobile) {
    return createPortal(
      <div 
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 animate-fade-in" 
        onClick={onClose}
      >
        <div 
          className="w-full max-w-md bg-white rounded-t-[28px] p-6 shadow-[0_-8px_32px_rgba(22,19,17,0.15)] animate-slide-up border-t border-[#E4DDD3]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-5" />
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="font-bold text-[18px] text-slate-900">{title}</span>
            {category && (
              <span className="text-[10.5px] font-black uppercase text-sky-700 bg-sky-50 border border-sky-100/80 px-2.5 py-0.5 rounded-full">
                {category}
              </span>
            )}
          </div>
          <p className="text-[14px] text-slate-600 leading-relaxed mb-6 font-normal break-all">
            {description}
          </p>
          <div className="flex gap-3">
            {link && (
              <a
                href={link}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-3.5 text-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all border border-slate-200/50"
              >
                사전 상세정보 보기
              </a>
            )}
            <button
              onClick={onClose}
              className="flex-1 py-3.5 text-center rounded-xl bg-[#161311] text-white text-xs font-bold transition-all"
            >
              확인
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div
      ref={tooltipRef}
      style={{
        position: "absolute",
        top: coords.top,
        left: coords.left,
        width: 290,
        zIndex: 100,
      }}
      className="bg-white border border-[#E4DDD3] rounded-2xl p-4.5 shadow-[0_12px_36px_rgba(22,19,17,0.14)] animate-scale-in text-slate-800 font-sans"
    >
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <span className="font-bold text-[14px] text-slate-900">{title}</span>
        {category && (
          <span className="text-[10px] font-bold text-sky-700 bg-sky-50 border border-sky-100 px-2 py-0.5 rounded-full">
            {category}
          </span>
        )}
      </div>
      <p className="text-[13px] text-slate-600 leading-relaxed mb-3.5 font-normal">
        {description}
      </p>
      {link && (
        <a
          href={link}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-sky-700 hover:text-sky-900 font-bold inline-flex items-center gap-1 cursor-pointer"
        >
          자세히 보기 →
        </a>
      )}
    </div>,
    document.body
  );
}
