import React from "react";
import NewsPortalFeed from "./NewsPortalFeed";
import NewsPortalSkeleton from "./NewsPortalSkeleton";
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

      {!showSkeleton && error && newsList.length === 0 && (
        <div className="py-16 px-6 text-center border border-[#F5C6C6] rounded-lg bg-[#FFF5F5] text-[#B91C1C]">
          <p className="text-base font-bold">기사 목록을 불러오지 못했습니다</p>
          <p className="text-sm mt-1 mb-5 text-[#DC2626]/80">
            네트워크 연결을 확인한 뒤 다시 시도해 주세요
          </p>
          {handleRetry && (
            <button
              type="button"
              onClick={handleRetry}
              className="px-5 py-2 rounded text-sm font-bold text-white transition-opacity hover:opacity-90 cursor-pointer"
              style={{ backgroundColor: btnBg }}
            >
              다시 시도
            </button>
          )}
        </div>
      )}

      {!showSkeleton && newsList.length > 0 && (
        <NewsPortalFeed
          newsList={newsList}
          keyword={keyword}
          variant={variant}
          hasMore={hasMore}
          loadingMore={loadingMore}
          onLoadMore={onLoadMore}
        />
      )}

      {!showSkeleton && !error && newsList.length === 0 && (
        <div className="py-20 text-center border border-dashed border-[#E5E5E5] rounded-lg text-[#888]">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-base font-bold text-[#333]">검색 결과가 없습니다</p>
        </div>
      )}
    </div>
  );
}
