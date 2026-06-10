import { memo } from "react";
import NewsSearchBar from "./NewsSearchBar";
import type { NewsPortalVariant } from "./NewsHeroSlider";

interface NewsPageHeaderProps {
  variant: NewsPortalVariant;
  totalItems: number;
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

function NewsPageHeader({
  variant,
  totalItems,
  title,
  subtitle,
  searchPlaceholder,
}: NewsPageHeaderProps) {
  const theme = THEME[variant];
  const today = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b-2 border-[#111]">
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className={`${theme.badgeBg} text-white text-[11px] font-black px-2 py-0.5 rounded-sm`}>
            {theme.badge}
          </span>
          <span className="text-xs text-[#888] font-medium">{today}</span>
          {totalItems > 0 && (
            <span className="text-xs font-bold text-[#555]">
              · {totalItems.toLocaleString()}건
            </span>
          )}
        </div>
        <h1 className="text-2xl sm:text-[28px] font-black text-[#111] tracking-tight leading-tight">
          {title}
        </h1>
        <p className="text-sm text-[#666] mt-1">{subtitle}</p>
      </div>

      <NewsSearchBar
        variant={variant}
        placeholder={searchPlaceholder}
        className="w-full lg:w-[min(100%,380px)] shrink-0"
      />
    </div>
  );
}

export default memo(NewsPageHeader);
