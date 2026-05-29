import React from "react";
import SourceFilterBar from "./SourceFilterBar";
import FeaturedNewsCard from "./FeaturedNewsCard";
import NewsCard from "./NewsCard";
import SkeletonCard from "../SkeletonCard";
import type { NewsItem } from "../../types/news";

interface NewsPageTemplateProps {
  newsList: NewsItem[];
  selectedSource: string;
  loading: boolean;
  page: number;
  totalPages: number;
  keyword: string;
  onChangePage: (page: number) => void;
  handleSourceChange: (src: string) => void;
  isAnalyzedPage: boolean;
  activeBgColor: string;
  banner: React.ReactNode;
  btnBg: string;
  btnHoverBg: string;
  btnBoxShadow: string;
  containerClassName?: string;
  containerStyle?: React.CSSProperties;
  error?: Error | null;
  handleRetry?: () => void;
}

export default function NewsPageTemplate({
  newsList,
  selectedSource,
  loading,
  page,
  totalPages,
  keyword,
  onChangePage,
  handleSourceChange,
  isAnalyzedPage,
  activeBgColor,
  banner,
  btnBg,
  btnHoverBg,
  btnBoxShadow,
  containerClassName = "flex flex-col mt-8 font-sans",
  containerStyle,
  error = null,
  handleRetry,
}: NewsPageTemplateProps) {

  // 페이지네이션 번호 배열 계산 (현재 페이지 기준 좌우 2개씩 노출)
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, page - 2);
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className={containerClassName} style={containerStyle}>
      {/* 상단 배너/타이틀 및 언론사 필터바 */}
      <div className="mb-8">
        {banner}
        
        <SourceFilterBar
          selectedSource={selectedSource}
          onChange={handleSourceChange}
          activeBgColor={activeBgColor}
        />
      </div>

      {/* 로딩 시 스켈레톤 UI 표시 */}
      {loading && (
        <div className="flex flex-col gap-4">
          <SkeletonCard featured />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {/* 에러 발생 시 예외 화면 표시 */}
      {!loading && error && (
        <div className="py-16 px-6 text-center border border-dashed rounded-[20px] border-red-200 bg-red-50/50 text-red-800 my-4">
          <p className="text-5xl mb-4">⚠️</p>
          <p className="text-base font-bold">기사 목록을 불러오는 도중 오류가 발생했습니다.</p>
          <p className="text-xs text-red-600 mt-1 mb-6">
            네트워크 연결 상태를 확인하고 잠시 후 다시 시도해 주세요.
          </p>
          {handleRetry && (
            <button
              onClick={handleRetry}
              className="px-6 py-2.5 rounded-full text-xs font-bold text-white transition-all cursor-pointer shadow-sm bg-[var(--btn-bg)] hover:bg-[var(--btn-hover-bg)] hover:-translate-y-0.5 active:translate-y-0"
              style={{
                "--btn-bg": btnBg,
                "--btn-hover-bg": btnHoverBg,
              } as React.CSSProperties}
            >
              다시 시도
            </button>
          )}
        </div>
      )}

      {/* 뉴스 카드 목록 렌더링 */}
      {!loading && !error && (
        <div className="flex flex-col gap-4">
          {newsList.map((news, index) => {
            // 목록의 첫 번째 뉴스만 Featured 카드(대형 카드)로 크게 렌더링
            if (index === 0) {
              return (
                <FeaturedNewsCard
                  key={news.id}
                  news={news}
                  keyword={keyword}
                  isAnalyzedPage={isAnalyzedPage}
                />
              );
            }

            // 두 번째부터는 일반 카드 형태로 렌더링
            return (
              <NewsCard
                key={news.id}
                news={news}
                keyword={keyword}
                isAnalyzedPage={isAnalyzedPage}
              />
            );
          })}

          {/* 검색이나 필터 결과가 없을 때의 예외 화면 */}
          {newsList.length === 0 && (
            <div className="py-24 text-center border border-dashed rounded-[20px] border-[#E4DDD3] text-[#9C9891]">
              <p className="text-5xl mb-4">🔍</p>
              <p className="text-base font-bold">결과가 없습니다.</p>
              <p className="text-xs mt-1">다른 키워드나 언론사를 선택해 보세요.</p>
            </div>
          )}

          {/* 페이지네이션 컨트롤러 */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-12 py-6 border-t border-[#E4DDD3]/50">
              {/* 이전 페이지 버튼 */}
              <button
                onClick={() => onChangePage(page - 1)}
                disabled={page === 1}
                className="p-2.5 rounded-xl border border-[#E4DDD3] bg-white text-[#5C5853] transition-all disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-[#5C5853] disabled:cursor-not-allowed hover:bg-[#F3F0EB] hover:text-[#161311] cursor-pointer flex items-center justify-center"
                aria-label="이전 페이지"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {/* 페이지 번호들 */}
              <div className="flex items-center gap-1.5">
                {pageNumbers.map((num) => {
                  const isActive = page === num;
                  return (
                    <button
                      key={num}
                      onClick={() => onChangePage(num)}
                      className={`min-w-[40px] h-10 px-3 rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center justify-center ${
                        isActive
                          ? "text-white shadow-md hover:-translate-y-px"
                          : "border border-[#E4DDD3] bg-white text-[#5C5853] hover:bg-[#F3F0EB] hover:text-[#161311]"
                      }`}
                      style={
                        isActive
                          ? ({
                              backgroundColor: btnBg,
                              boxShadow: btnBoxShadow,
                            } as React.CSSProperties)
                          : {}
                      }
                    >
                      {num}
                    </button>
                  );
                })}
              </div>

              {/* 다음 페이지 버튼 */}
              <button
                onClick={() => onChangePage(page + 1)}
                disabled={page === totalPages}
                className="p-2.5 rounded-xl border border-[#E4DDD3] bg-white text-[#5C5853] transition-all disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-[#5C5853] disabled:cursor-not-allowed hover:bg-[#F3F0EB] hover:text-[#161311] cursor-pointer flex items-center justify-center"
                aria-label="다음 페이지"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
