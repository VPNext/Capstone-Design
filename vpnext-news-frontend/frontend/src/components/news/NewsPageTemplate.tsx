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
  isLoadingMore: boolean;
  showLoadMoreBtn: boolean;
  keyword: string;
  lastElementRef: (node: HTMLDivElement | null) => void;
  handleLoadMoreClick: () => void;
  handleSourceChange: (src: string) => void;
  isAnalyzedPage: boolean;
  activeBgColor: string;
  banner: React.ReactNode;
  loadMoreBtnBg: string;
  loadMoreBtnHoverBg: string;
  loadMoreBtnBoxShadow: string;
  containerClassName?: string;
  containerStyle?: React.CSSProperties;
}

export default function NewsPageTemplate({
  newsList,
  selectedSource,
  loading,
  isLoadingMore,
  showLoadMoreBtn,
  keyword,
  lastElementRef,
  handleLoadMoreClick,
  handleSourceChange,
  isAnalyzedPage,
  activeBgColor,
  banner,
  loadMoreBtnBg,
  loadMoreBtnHoverBg,
  loadMoreBtnBoxShadow,
  containerClassName = "flex flex-col mt-8 font-sans",
  containerStyle,
}: NewsPageTemplateProps) {
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

      {/* 첫 로딩 시 스켈레톤 UI 표시 */}
      {loading && (
        <div className="flex flex-col gap-4">
          <SkeletonCard featured />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {/* 뉴스 카드 목록 렌더링 */}
      {!loading && (
        <div className="flex flex-col gap-4">
          {newsList.map((news, index) => {
            const isLast = newsList.length === index + 1;

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

            // 두 번째부터는 일반 카드 형태로 렌더링하고, 마지막 카드에만 무한 스크롤 관측용 ref(innerRef) 주입
            return (
              <NewsCard
                key={news.id}
                news={news}
                keyword={keyword}
                isAnalyzedPage={isAnalyzedPage}
                innerRef={isLast ? lastElementRef : undefined}
              />
            );
          })}

          {/* 검색이나 필터 결과가 없을 때의 예외 화면 */}
          {newsList.length === 0 && (
            <div className="py-24 text-center border border-dashed rounded-[20px] border-[#E4DDD3] text-[#9C9891]">
              <p className="text-5xl mb-4">🔍</p>
              <p className="text-base font-bold">검색 결과가 없습니다.</p>
              <p className="text-xs mt-1">다른 키워드나 언론사를 선택해 보세요.</p>
            </div>
          )}

          {/* 무한 스크롤 추가 페이징 시 아래쪽에 스켈레톤 추가 표시 */}
          {isLoadingMore && (
            <div className="flex flex-col gap-4 mt-2">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          )}

          {/* 더보기 버튼 */}
          {showLoadMoreBtn && (
            <div className="flex justify-center mt-6">
              <button
                onClick={handleLoadMoreClick}
                className="px-8 py-3 rounded-full text-sm font-bold text-white transition-all duration-200"
                style={{
                  background: loadMoreBtnBg,
                  boxShadow: loadMoreBtnBoxShadow,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = loadMoreBtnHoverBg;
                  (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = loadMoreBtnBg;
                  (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                }}
              >
                뉴스 더 불러오기
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
