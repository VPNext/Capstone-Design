import React from "react";
import NewsPortalFeed from "./NewsPortalFeed";
import NewsPortalSkeleton from "./NewsPortalSkeleton";
import EngagementStatsPanel from "./EngagementStatsPanel";
import type { NewsPortalVariant } from "./NewsHeroSlider";
import type { NewsItem } from "../../types/news";

interface NewsPageTemplateProps {
  newsList: NewsItem[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  keyword: string;
  onLoadMore: () => void;
  variant: NewsPortalVariant;
  banner: React.ReactNode;
  btnBg: string;
  containerClassName?: string;
  error?: Error | null;
  handleRetry?: () => void;
}

export default function NewsPageTemplate({
  newsList,
  loading,
  loadingMore,
  hasMore,
  keyword,
  onLoadMore,
  variant,
  banner,
  btnBg,
  containerClassName = "flex flex-col mt-6 font-sans",
  error = null,
  handleRetry,
}: NewsPageTemplateProps) {
  const showSkeleton = loading && newsList.length === 0;

  return (
    <div className={containerClassName}>
      <header className="mb-5">{banner}</header>

      {showSkeleton && <NewsPortalSkeleton />}

      {/* 에러 상태 */}
      {!showSkeleton && error && newsList.length === 0 && (
        <div className="py-16 px-6 text-center border border-[#FECACA] rounded-xl bg-[#FEF2F2]">
          <p className="text-3xl mb-3" aria-hidden="true">😥</p>
          <p className="text-base font-bold text-[#B91C1C] mb-1">
            기사 목록을 불러오지 못했습니다
          </p>
          <p className="text-sm text-[#DC2626]/75 mb-5">
            네트워크 연결을 확인한 뒤 다시 시도해 주세요
          </p>
          {handleRetry && (
            <button
              type="button"
              onClick={handleRetry}
              className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full text-sm font-black text-white transition-opacity hover:opacity-90 cursor-pointer shadow-md"
              style={{ backgroundColor: btnBg }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              다시 시도
            </button>
          )}
        </div>
      )}

      {/* 데이터 있음 */}
      {!showSkeleton && newsList.length > 0 && (
        <div className="flex flex-col lg:flex-row gap-6 items-start w-full">
          <div className="flex-1 w-full min-w-0">
            <NewsPortalFeed
              newsList={newsList}
              keyword={keyword}
              variant={variant}
              hasMore={hasMore}
              loadingMore={loadingMore}
              onLoadMore={onLoadMore}
            />
          </div>
          <div className="w-full lg:w-[360px] xl:w-[380px] shrink-0">
            <EngagementStatsPanel theme={variant} />
          </div>
        </div>
      )}

      {/* 검색 결과 없음 */}
      {!showSkeleton && !error && newsList.length === 0 && (
        <div className="py-24 text-center border border-dashed border-[#E5E5E5] rounded-xl text-[#888] bg-white/40">
          <p className="text-4xl mb-3" aria-hidden="true">🔍</p>
          <p className="text-base font-bold text-[#444] mb-1.5">
            검색 결과가 없습니다
          </p>
          <p className="text-sm text-[#9C9891]">
            다른 키워드로 검색해 보세요
          </p>
        </div>
      )}
    </div>
  );
}
