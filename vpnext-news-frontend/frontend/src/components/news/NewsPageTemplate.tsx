import React, { useMemo } from "react";
import NewsPortalFeed from "./NewsPortalFeed";
import NewsPortalSkeleton from "./NewsPortalSkeleton";
import type { NewsPortalVariant } from "./NewsHeroSlider";
import type { NewsItem } from "../../types/news";

interface NewsPageTemplateProps {
  newsList: NewsItem[];
  loading: boolean;
  page: number;
  totalPages: number;
  keyword: string;
  onChangePage: (page: number) => void;
  variant: NewsPortalVariant;
  banner: React.ReactNode;
  btnBg: string;
  containerClassName?: string;
  error?: Error | null;
  handleRetry?: () => void;
}

function getPageNumbers(page: number, totalPages: number): number[] {
  const maxVisiblePages = 5;
  let startPage = Math.max(1, page - 2);
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  if (endPage - startPage < maxVisiblePages - 1) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  const pages: number[] = [];
  for (let i = startPage; i <= endPage; i += 1) {
    pages.push(i);
  }
  return pages;
}

export default function NewsPageTemplate({
  newsList,
  loading,
  page,
  totalPages,
  keyword,
  onChangePage,
  variant,
  banner,
  btnBg,
  containerClassName = "flex flex-col mt-6 font-sans",
  error = null,
  handleRetry,
}: NewsPageTemplateProps) {
  const pageNumbers = useMemo(() => getPageNumbers(page, totalPages), [page, totalPages]);

  return (
    <div className={containerClassName}>
      <header className="mb-5">{banner}</header>

      {loading && <NewsPortalSkeleton />}

      {!loading && error && (
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

      {!loading && !error && (
        <>
          <NewsPortalFeed newsList={newsList} keyword={keyword} variant={variant} />

          {totalPages > 1 && (
            <nav
              className="flex justify-center items-center gap-1 mt-8 py-4 border-t border-[#E5E5E5]"
              aria-label="뉴스 페이지"
            >
              <button
                type="button"
                onClick={() => onChangePage(page - 1)}
                disabled={page === 1}
                className="px-3 py-2 text-sm font-bold text-[#666] disabled:opacity-30 hover:text-[#111] cursor-pointer disabled:cursor-not-allowed"
                aria-label="이전 페이지"
              >
                ‹ 이전
              </button>

              <div className="flex items-center gap-0.5 mx-2">
                {pageNumbers.map((num) => {
                  const isActive = page === num;
                  return (
                    <button
                      key={num}
                      type="button"
                      onClick={() => onChangePage(num)}
                      className={`min-w-[36px] h-9 px-2 text-sm font-bold transition-colors cursor-pointer ${
                        isActive
                          ? "text-white"
                          : "text-[#666] hover:text-[#111] hover:bg-[#F5F5F5]"
                      }`}
                      style={isActive ? { backgroundColor: btnBg } : undefined}
                      aria-current={isActive ? "page" : undefined}
                    >
                      {num}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => onChangePage(page + 1)}
                disabled={page === totalPages}
                className="px-3 py-2 text-sm font-bold text-[#666] disabled:opacity-30 hover:text-[#111] cursor-pointer disabled:cursor-not-allowed"
                aria-label="다음 페이지"
              >
                다음 ›
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
