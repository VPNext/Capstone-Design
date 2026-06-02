import { useMemo, useState } from "react";
import type { NewsDetail } from "../../types/news";
import { parseAndRenderSummary } from "../../utils/source";
import { extractImageFromSummary, optimizeImageUrl } from "../../utils/summary";
import TooltipPortal from "./TooltipPortal";
import ArticleParagraphs from "./ArticleParagraphs";

interface ArticleContentProps {
  news: NewsDetail;
  aiSummary: string | null;
  onSelectKeyword?: (name: string, type: "term" | "person") => void;
}

export default function ArticleContent({
  news,
  aiSummary,
  onSelectKeyword,
}: ArticleContentProps) {
  const finalImage = optimizeImageUrl(news.image_url) || extractImageFromSummary(news.summary);

  const [tooltipData, setTooltipData] = useState<{
    rect: DOMRect;
    title: string;
    category?: string;
    description: string;
    link?: string;
  } | null>(null);

  const parsedSummary = useMemo(() => {
    return parseAndRenderSummary(aiSummary, false);
  }, [aiSummary]);

  const handleArticleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const termName = target.getAttribute("data-term-name");
    const personName = target.getAttribute("data-person-name");

    if (termName && news.difficult_terms) {
      onSelectKeyword?.(termName, "term");
      const termObj = news.difficult_terms.find((t) => t.term === termName);
      if (termObj) {
        setTooltipData({
          rect: target.getBoundingClientRect(),
          title: termObj.term,
          category: termObj.category,
          description: termObj.definition || termObj.explanation || "설명 정보가 존재하지 않습니다.",
          link: termObj.dict_link,
        });
      }
    } else if (personName && news.key_persons) {
      onSelectKeyword?.(personName, "person");
      const personObj = news.key_persons.find((p) => p.name === personName);
      if (personObj) {
        setTooltipData({
          rect: target.getBoundingClientRect(),
          title: personObj.name,
          category: personObj.role || "주요 인물",
          description: `${personObj.description}${
            personObj.relation ? ` (주요 관계: ${personObj.relation})` : ""
          }`,
          link: `https://www.google.com/search?q=${encodeURIComponent(personObj.name)}`,
        });
      }
    }
  };

  return (
    <article className="flex-1 min-w-0 max-w-[720px] mx-auto">
      {tooltipData && (
        <TooltipPortal
          targetRect={tooltipData.rect}
          title={tooltipData.title}
          category={tooltipData.category}
          description={tooltipData.description}
          link={tooltipData.link}
          onClose={() => setTooltipData(null)}
        />
      )}

      {finalImage && (
        <figure
          className="mb-8 overflow-hidden rounded-[18px] border border-[#E4DDD3] bg-[#F3F0EB] shadow-[0_4px_24px_rgba(22,19,17,0.06)] aspect-video"
        >
          <img
            src={finalImage}
            alt="뉴스 메인 사진"
            className="w-full h-full object-cover"
            loading="eager"
          />
        </figure>
      )}

      {aiSummary && (
        <div className="mb-8 p-5.5 rounded-[18px] bg-[#EFF6FF] border border-[#BFDBFE] shadow-[0_3px_12px_rgba(30,58,95,0.03)]">
          <p
            className="text-[11px] font-black uppercase tracking-widest mb-3 flex items-center gap-1.5 text-[#1A55A8]"
          >
            <svg className="w-3.5 h-3.5 text-[#1A55A8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            AI 3줄 요약
          </p>
          <div
            className="text-[15px] leading-relaxed text-[#1E3A5F] font-sans font-medium"
          >
            {parsedSummary}
          </div>
        </div>
      )}

      <div 
        className="border-t border-[#E4DDD3] pt-[28px]"
        onClick={handleArticleClick}
      >
        {news.content ? (
          <div>
            <ArticleParagraphs 
              content={news.content} 
              difficultTerms={news.difficult_terms || []} 
              keyPersons={news.key_persons || []}
            />
          </div>
        ) : (
          <div
            className="p-12 text-center flex flex-col items-center gap-4 bg-[#F0F9FF] border border-[#BAE6FD] rounded-[16px]"
          >
            <svg className="w-10 h-10 text-sky-500 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="text-xl font-bold text-[#161311]">
              본문이 아직 수집되지 않았습니다
            </h3>
            <p className="text-[#5C5853]">
              아래 버튼을 눌러 본문을 가져오고 AI 분석을 시작하세요.
            </p>
          </div>
        )}
      </div>
    </article>
  );
}
