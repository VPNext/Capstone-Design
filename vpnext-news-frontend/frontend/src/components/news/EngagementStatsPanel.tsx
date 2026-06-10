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
    tabActive: "bg-[#161311] text-white",
  },
  analyzed: {
    accent: "#1A55A8",
    accentLight: "#EFF6FF",
    accentBorder: "#BFDBFE",
    bgGradient: "from-[#F9FAFB] to-[#F3F4F6]",
    tabActive: "bg-[#1A55A8] text-white",
  },
};

function EngagementStatsPanel({ theme = "main" }: EngagementStatsPanelProps) {
  const { summary, topViews, topLikes } = useEngagementStats();
  const [activeTab, setActiveTab] = useState<TabType>("views");

  const styles = THEME_STYLES[theme];

  // 각 탭별 표시 데이터 결정
  const getTabItems = (): ArticleEngagementItem[] => {
    switch (activeTab) {
      case "views":
        return topViews;
      case "likes":
        return topLikes;
      default:
        return [];
    }
  };

  const currentItems = getTabItems();
  const hasData = summary.totalViews > 0 || summary.totalLikes > 0;

  if (!hasData) {
    return (
      <div className="bg-white border border-[#E5E5E5] rounded-xl p-6 text-center shadow-sm font-sans mb-6">
        <h3 className="text-base font-bold text-[#333] mb-1">내 활동 통계</h3>
        <p className="text-xs text-[#888] leading-relaxed">
          아직 활동 내역이 없습니다.
          <br />
          기사를 읽거나 좋아요를 눌러 분석 통계를 확인해 보세요.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`bg-white border border-[#E5E5E5] rounded-xl overflow-hidden shadow-sm font-sans mb-6`}
    >
      {/* Panel Header */}
      <div
        className={`p-4 border-b border-[#E5E5E5] bg-gradient-to-r ${styles.bgGradient} flex items-center justify-between`}
      >
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-black text-[#161311]">뉴스 통계</h3>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 divide-x divide-[#EFEFEF] border-b border-[#E5E5E5] bg-white">
        <div className="py-4 px-2 text-center">
          <p className="text-[11px] font-bold text-[#888] tracking-tight mb-1">총 조회한 뉴스</p>
          <p className="text-3xl font-black text-[#111] tabular-nums tracking-tight">
            {summary.totalViews}회
          </p>
        </div>
        <div className="py-4 px-2 text-center">
          <p className="text-[11px] font-bold text-[#888] tracking-tight mb-1">총 누른 좋아요</p>
          <p className="text-3xl font-black tabular-nums tracking-tight" style={{ color: styles.accent }}>
            {summary.totalLikes}개
          </p>
        </div>
        <div className="py-4 px-2 text-center">
          <p className="text-[11px] font-bold text-[#888] tracking-tight mb-1">평균 조회수</p>
          <p className="text-3xl font-black text-[#111] tabular-nums tracking-tight">
            {summary.averageViews}회
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 border-b border-[#EFEFEF] bg-[#FAF9F6] p-1 gap-1">
        <button
          type="button"
          onClick={() => setActiveTab("views")}
          className={`py-2.5 text-xs font-extrabold rounded-lg transition-all tracking-tight ${
            activeTab === "views"
              ? styles.tabActive + " shadow-sm"
              : "text-[#555] hover:bg-[#EFEFEF]"
          }`}
        >
          조회순 TOP 5
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("likes")}
          className={`py-2.5 text-xs font-extrabold rounded-lg transition-all tracking-tight ${
            activeTab === "likes"
              ? styles.tabActive + " shadow-sm"
              : "text-[#555] hover:bg-[#EFEFEF]"
          }`}
        >
          좋아요순 TOP 5
        </button>
      </div>

      {/* Tab Content */}
      <div className="divide-y divide-[#EFEFEF] max-h-[300px] overflow-y-auto">
        {currentItems.length > 0 ? (
          currentItems.map((item, index) => {
            const displayImage = optimizeImageUrl(item.image_url);
            return (
              <Link
                key={`${activeTab}-${item.id}`}
                to={`/news/${item.id}`}
                className="group flex items-center gap-3.5 p-3.5 px-4 hover:bg-[#FAFAFA] transition-colors"
                style={{ "--hover-accent": styles.accent } as React.CSSProperties}
              >
                {/* 순위 표시 */}
                <span
                  className="w-5 shrink-0 text-center text-[16px] font-black tabular-nums"
                  style={{ color: index < 3 ? styles.accent : "#BBB" }}
                >
                  {index + 1}
                </span>

                {/* Thumbnail */}
                <div className="w-[72px] h-[52px] shrink-0 rounded overflow-hidden relative flex items-center justify-center bg-[#EEE]">
                  {displayImage ? (
                    <img
                      src={displayImage}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        const img = e.target as HTMLImageElement;
                        img.style.display = "none";
                        const fallback = img.nextElementSibling as HTMLDivElement;
                        if (fallback) fallback.style.display = "flex";
                      }}
                    />
                  ) : null}
                  <div
                    className="absolute inset-0 flex items-center justify-center bg-gradient-to-tr from-[#F3EFF5] to-[#E5E9F0] select-none"
                    style={{ display: displayImage ? "none" : "flex" }}
                  >
                    <span className="text-[14px] font-black text-[#5C4D66] font-serif leading-none">
                      {item.source ? item.source.charAt(0) : "N"}
                    </span>
                  </div>
                </div>

                {/* Title & Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-[15px] font-black text-[#161311] leading-snug line-clamp-1 group-hover:text-[var(--hover-accent)] group-hover:underline transition-colors duration-150">
                    {item.title}
                  </h4>
                  <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-[#777] font-bold">
                    <span>{item.source}</span>
                    <span className="text-[#DDD]">·</span>
                    <span>{item.published_at?.split("T")[0] || "날짜 미상"}</span>
                  </div>
                </div>

                {/* Stats Badge */}
                <div className="shrink-0 flex items-center gap-1.5 text-xs font-extrabold text-[#444] bg-[#F5F2EC] px-2 py-1 rounded-md tabular-nums">
                  {activeTab === "views" ? (
                    <>
                      <span className="text-[10px] font-bold text-[#888]">조회</span>
                      <span>{item.views}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-[10px] font-bold text-[#888]" style={{ color: styles.accent }}>좋아요</span>
                      <span>{item.likes}</span>
                    </>
                  )}
                </div>
              </Link>
            );
          })
        ) : (
          <div className="p-8 text-center text-xs text-[#888] font-medium">
            {activeTab === "views" ? "아직 조회된 기사가 없습니다." : "좋아요를 받은 기사가 없습니다."}
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(EngagementStatsPanel);
