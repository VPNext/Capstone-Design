import { SOURCES } from "../../constants/source";

interface SourceFilterBarProps {
  selectedSource: string;
  onChange: (src: string) => void;
  activeBgColor?: string; // AnalyzedNewsPage is #0C1F3F, MainPage is #161311
}

export default function SourceFilterBar({
  selectedSource,
  onChange,
  activeBgColor = "#161311",
}: SourceFilterBarProps) {
  // 테마 분기 설정
  const isMainTheme = activeBgColor === "#161311";

  return (
    <div className="flex items-center gap-2 overflow-x-auto pt-1 pb-3 scrollbar-thin">
      {SOURCES.map((src) => {
        const isActive = selectedSource === src;
        
        // 동적 클래스 매핑
        const activeClass = isActive
          ? isMainTheme
            ? "bg-[#161311] border-[#161311] text-white shadow-[0_2px_10px_rgba(22,19,17,0.2)]"
            : "bg-[#0C1F3F] border-[#0C1F3F] text-white shadow-[0_2px_10px_rgba(12,31,63,0.2)]"
          : isMainTheme
            ? "bg-white text-[#5C5853] border-[#E4DDD3] hover:text-[#161311] hover:border-[#161311] hover:bg-[#f7f4ef]"
            : "bg-white text-[#5C5853] border-[#E4DDD3] hover:text-[#0C1F3F] hover:border-[#0C1F3F] hover:bg-[#f7f4ef]";

        return (
          <button
            key={src}
            onClick={() => onChange(src)}
            className={`px-4 py-2 border rounded-full text-sm font-bold whitespace-nowrap shrink-0 transition-all duration-200 ${activeClass}`}
          >
            {src === "전체" ? "📰 전체" : src}
          </button>
        );
      })}
    </div>
  );
}
