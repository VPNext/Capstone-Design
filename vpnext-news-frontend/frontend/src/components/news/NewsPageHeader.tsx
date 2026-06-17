import { memo, useMemo } from "react";
import NewsSearchBar from "./NewsSearchBar";
import type { NewsPortalVariant } from "./NewsHeroSlider";

interface NewsPageHeaderProps {
  variant: NewsPortalVariant;
  totalItems: number;
  loadedCount?: number;
  title: string;
  subtitle: string;
  searchPlaceholder?: string;
}

const THEME: Record<
  NewsPortalVariant,
  { badge: string; badgeBg: string; accent: string }
> = {
  main: {
    badge: "실시간",
    badgeBg: "bg-[#C13026]",
    accent: "text-[#C13026]",
  },
  analyzed: {
    badge: "AI 분석",
    badgeBg: "bg-[#1A55A8]",
    accent: "text-[#1A55A8]",
  },
};

// today 문자열은 컴포넌트 외부에서 한 번만 계산
const TODAY_STR = new Date().toLocaleDateString("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "short",
});

function NewsPageHeader({
  variant,
  totalItems,
  loadedCount = 0,
  title,
  subtitle,
  searchPlaceholder,
}: NewsPageHeaderProps) {
  const theme = THEME[variant];

  const countLabel = useMemo(() => {
    if (loadedCount <= 0) return null;
    if (totalItems > loadedCount) {
      return `${loadedCount.toLocaleString()} / ${totalItems.toLocaleString()}건`;
    }
    return `${loadedCount.toLocaleString()}건`;
  }, [loadedCount, totalItems]);

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b-2 border-[#111]">
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span
            className={`${theme.badgeBg} text-white text-[11px] font-black px-2.5 py-0.5 rounded tracking-wide`}
          >
            {theme.badge}
          </span>
          <time className="text-xs text-[#888] font-medium">{TODAY_STR}</time>
          {countLabel && (
            <span className="text-xs font-bold text-[#555]">
              · {countLabel}
            </span>
          )}
        </div>
        <h1 className="text-[28px] sm:text-[34px] font-black text-[#111] tracking-tight leading-tight">
          {title}
        </h1>
        <p className="text-[14px] sm:text-[15px] font-medium text-[#666] mt-1.5 leading-relaxed">
          {subtitle}
        </p>
      </div>

      <NewsSearchBar
        variant={variant}
        placeholder={searchPlaceholder}
        className="w-full lg:w-[min(100%,360px)] shrink-0"
      />
    </div>
  );
}

export default memo(NewsPageHeader);
