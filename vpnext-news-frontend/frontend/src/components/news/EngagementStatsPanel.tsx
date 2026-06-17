import { useState, memo } from "react";
import { Link } from "react-router-dom";
import { useEngagementStats } from "../../hooks/useArticleEngagement";
import { optimizeImageUrl } from "../../utils/summary";
import type { ArticleEngagementItem } from "../../utils/articleEngagement";

interface EngagementStatsPanelProps {
  theme?: "main" | "analyzed";
}

type TabType = "views" | "likes";

const THEME_STYLES = {
  main: {
    accent: "#C13026",
    accentLight: "#FEF2F2",
    accentBorder: "#FECACA",
    bgGradient: "from-[#FDFBF9] to-[#F7F5F0]",
    tabActive: "bg-[#161311] text-white shadow-sm",
  },
  analyzed: {
    accent: "#1A55A8",
    accentLight: "#EFF6FF",
    accentBorder: "#BFDBFE",
    bgGradient: "from-[#F9FAFB] to-[#F3F4F6]",
    tabActive: "bg-[#1A55A8] text-white shadow-sm",
  },
} as const;

function StatItem({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="py-4 px-2 text-center">
      <p className="text-[10.5px] font-bold text-[#888] tracking-tight mb-1.5 leading-tight">
        {label}
      </p>
      <p
        className="text-2xl font-black tabular-nums tracking-tight leading-none"
        style={accent ? { color: accent } : { color: "#111" }}
      >
        {value.toLocaleString()}
      </p>
    </div>
  );
}

function EngagementStatsPanel({ theme = "main" }: EngagementStatsPanelProps) {
  const { summary, topViews, topLikes } = useEngagementStats();
  const [activeTab, setActiveTab] = useState<TabType>("views");

  const styles = THEME_STYLES[theme];

  const currentItems: ArticleEngagementItem[] =
    activeTab === "views" ? topViews : topLikes;
  const hasData = summary.totalViews > 0 || summary.totalLikes > 0;

  if (!hasData) {
    return (
      <div className="bg-white border border-[#E5E5E5] rounded-xl p-6 text-center shadow-sm font-sans mb-6">
        <h3 className="text-sm font-bold text-[#333] mb-2">내 활동 통계</h3>
        <p className="text-xs text-[#888] leading-relaxed">
          아직 활동 내역이 없습니다.
          <br />
          기사를 읽거나 좋아요를 눌러보세요.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#E5E5E5] rounded-xl overflow-hidden shadow-sm font-sans mb-6">
      {/* Panel Header */}
      <div
        className={`px-4 py-3.5 border-b border-[#E5E5E5] bg-gradient-to-r ${styles.bgGradient}`}
      >
        <h3 className="text-sm font-black text-[#161311]">뉴스 통계</h3>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 divide-x divide-[#EFEFEF] border-b border-[#E5E5E5] bg-white">
        <StatItem label="총 조회" value={summary.totalViews} />
        <StatItem label="총 좋아요" value={summary.totalLikes} accent={styles.accent} />
        <StatItem label="평균 조회" value={summary.averageViews} />
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 border-b border-[#EFEFEF] bg-[#FAF9F6] p-1 gap-1">
        <button
          type="button"
          onClick={() => setActiveTab("views")}
          className={`py-2.5 text-xs font-extrabold rounded-lg transition-all duration-150 tracking-tight ${
            activeTab === "views"
              ? styles.tabActive
              : "text-[#555] hover:bg-[#EFEFEF]"
          }`}
        >
          조회순 TOP 5
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("likes")}
          className={`py-2.5 text-xs font-extrabold rounded-lg transition-all duration-150 tracking-tight ${
            activeTab === "likes"
              ? styles.tabActive
              : "text-[#555] hover:bg-[#EFEFEF]"
          }`}
        >
          좋아요순 TOP 5
        </button>
      </div>

      {/* Tab Content */}
      <div className="divide-y divide-[#EFEFEF] max-h-[320px] overflow-y-auto custom-sidebar-scrollbar">
        {currentItems.length > 0 ? (
          currentItems.map((item, index) => {
            const displayImage = optimizeImageUrl(item.image_url);
            return (
              <Link
                key={`${activeTab}-${item.id}`}
                to={`/news/${item.id}`}
                className="group flex items-center gap-3 p-3.5 px-4 hover:bg-[#FAFAFA] transition-colors duration-150"
              >
                {/* 순위 */}
                <span
                  className="w-5 shrink-0 text-center text-[15px] font-black tabular-nums leading-none"
                  style={{ color: index < 3 ? styles.accent : "#C0B8B0" }}
                  aria-label={`${index + 1}위`}
                >
                  {index + 1}
                </span>

                {/* Thumbnail */}
                <div className="w-[68px] h-[48px] shrink-0 rounded-lg overflow-hidden relative flex items-center justify-center bg-[#EEE]">
                  {displayImage ? (
                    <img
                      src={displayImage}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                      decoding="async"
                      onError={(e) => {
                        const img = e.target as HTMLImageElement;
                        img.style.display = "none";
                        const fallback =
                          img.nextElementSibling as HTMLDivElement;
                        if (fallback) fallback.style.display = "flex";
                      }}
                    />
                  ) : null}
                  <div
                    className="absolute inset-0 flex items-center justify-center bg-gradient-to-tr from-[#F3EFF5] to-[#E5E9F0] select-none"
                    style={{ display: displayImage ? "none" : "flex" }}
                    aria-hidden="true"
                  >
                    <span className="text-[13px] font-black text-[#5C4D66] font-serif leading-none">
                      {item.source ? item.source.charAt(0) : "N"}
                    </span>
                  </div>
                </div>

                {/* Title & Info */}
                <div className="flex-1 min-w-0">
                  <h4
                    className="text-[14px] font-bold text-[#161311] leading-snug line-clamp-2 group-hover:underline transition-colors duration-150 break-keep"
                    style={{
                      textDecorationColor: styles.accent,
                    }}
                  >
                    {item.title}
                  </h4>
                  <div className="flex items-center gap-1.5 mt-0.5 text-[10.5px] text-[#777] font-medium">
                    <span>{item.source}</span>
                    <span className="text-[#DDD]" aria-hidden="true">·</span>
                    <span>{item.published_at?.split("T")[0] || "날짜 미상"}</span>
                  </div>
                </div>

                {/* Stats Badge */}
                <div className="shrink-0 flex flex-col items-end gap-0.5">
                  <span
                    className="text-[10px] font-bold text-[#AAA]"
                  >
                    {activeTab === "views" ? "조회" : "좋아요"}
                  </span>
                  <span
                    className="text-[13px] font-black tabular-nums"
                    style={{ color: activeTab === "likes" ? styles.accent : "#333" }}
                  >
                    {activeTab === "views" ? item.views : item.likes}
                  </span>
                </div>
              </Link>
            );
          })
        ) : (
          <div className="p-8 text-center text-xs text-[#888] font-medium">
            {activeTab === "views"
              ? "아직 조회된 기사가 없습니다."
              : "좋아요를 받은 기사가 없습니다."}
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(EngagementStatsPanel);
