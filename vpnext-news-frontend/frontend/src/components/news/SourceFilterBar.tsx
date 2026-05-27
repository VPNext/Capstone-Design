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
            className="px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap shrink-0 transition-all duration-200"
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
                  }
            }
            onMouseEnter={(e) => {
              if (!isActive) {
                (e.currentTarget as HTMLElement).style.borderColor = activeBgColor;
                (e.currentTarget as HTMLElement).style.color = activeBgColor;
                (e.currentTarget as HTMLElement).style.background = "#f7f4ef";
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                (e.currentTarget as HTMLElement).style.borderColor = "#E4DDD3";
                (e.currentTarget as HTMLElement).style.color = "#5C5853";
                (e.currentTarget as HTMLElement).style.background = "#fff";
              }
            }}
          >
            {src === "전체" ? "📰 전체" : src}
          </button>
        );
      })}
    </div>
  );
}
