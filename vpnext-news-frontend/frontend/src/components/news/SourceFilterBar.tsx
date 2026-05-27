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
  return (
    <div className="flex items-center gap-2 overflow-x-auto pt-1 pb-3 scrollbar-thin">
      {SOURCES.map((src) => {
        const isActive = selectedSource === src;
        return (
          <button
            key={src}
            onClick={() => onChange(src)}
            className="px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap shrink-0 transition-all duration-200 hover:text-[var(--hover-color)] hover:border-[var(--hover-color)] hover:bg-[#f7f4ef]"
            style={
              isActive
                ? {
                    background: activeBgColor,
                    color: "#fff",
                    border: `1.5px solid ${activeBgColor}`,
                    boxShadow: "0 2px 10px rgba(22,19,17,0.2)",
                  }
                : {
                    background: "#fff",
                    color: "#5C5853",
                    border: "1.5px solid #E4DDD3",
                    "--hover-color": activeBgColor, // CSS 변수 선언적 주입
                  } as React.CSSProperties
            }
          >
            {src === "전체" ? "📰 전체" : src}
          </button>
        );
      })}
    </div>
  );
}
