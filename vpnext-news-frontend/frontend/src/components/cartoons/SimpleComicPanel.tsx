import { useState } from "react";
import type { ComicScene } from "../../types/news";

interface SimpleComicPanelProps {
  scene: ComicScene | string;
}

export default function SimpleComicPanel({ scene }: SimpleComicPanelProps) {
  const imageUrl = typeof scene === "string" ? scene : scene.url;
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  return (
    <div className="relative w-full overflow-hidden bg-[#0A0806]">
      <div className="relative w-full flex items-center justify-center min-h-[380px] bg-[#0A0806]">
        {/* 로딩 상태 */}
        {isLoading && !hasError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 z-10 bg-[#0A0806]">
            <div className="relative">
              <div className="w-14 h-14 rounded-full border-2 animate-spin border-white/7 border-t-[#FBBF24]" />
              <div className="absolute inset-0 rounded-full shadow-[0_0_24px_rgba(251,191,36,0.2)]" />
            </div>
            <div className="flex flex-col items-center gap-2.5">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] animate-pulse text-white/35">
                AI가 만화를 그리는 중...
              </p>
              <div className="w-36 h-0.5 overflow-hidden bg-white/7 rounded-full">
                <div className="h-full animate-pulse bg-gradient-to-r from-[#FBBF24] to-[#F59E0B] w-full rounded-full" />
              </div>
            </div>
          </div>
        )}

        {/* 에러 상태 */}
        {hasError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10 bg-[#0A0806]">
            <span className="text-5xl opacity-40">🎨</span>
            <p className="text-sm font-bold text-white/30">
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
            loading="lazy"
            decoding="async"
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
