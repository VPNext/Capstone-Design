import { useMemo } from "react";
import type { ReactNode } from "react";
import { extractImageFromSummary } from "../../utils/summary";
import type { NewsDetail } from "../../types/news";
import { parseAndRenderSummary } from "../../utils/source";

interface ArticleContentProps {
  news: NewsDetail;
  aiSummary: string | null;
  renderContent: (content: string) => ReactNode;
}

export default function ArticleContent({
  news,
  aiSummary,
  renderContent,
}: ArticleContentProps) {
  const finalImage = news.image_url || extractImageFromSummary(news.summary);

  // 무거운 정규식 및 파싱 연산을 useMemo로 감싸 렌더링 성능 최적화
  const parsedSummary = useMemo(() => {
    return parseAndRenderSummary(aiSummary, false);
  }, [aiSummary]);

  return (
    <article className="flex-1 min-w-0">
      {/* 메인 이미지 - aspect-video 및 bg placeholder 적용하여 CLS 방지 */}
      {finalImage && (
        <figure
          className="mb-8 overflow-hidden rounded-[18px] border border-[#E4DDD3] bg-[#F3F0EB] shadow-[0_4px_24px_rgba(22,19,17,0.08)] aspect-video"
        >
          <img
            src={finalImage}
            alt="뉴스 메인 사진"
            className="w-full h-full object-cover"
            loading="eager"
          />
        </figure>
      )}

      {/* AI 3줄 요약 */}
      {aiSummary && (
        <div
          className="mb-8 p-5 rounded-[16px]"
          style={{
            background: "#EFF6FF",
            border: "1px solid #BFDBFE",
          }}
        >
          <p
            className="text-[11px] font-black uppercase tracking-widest mb-2.5 flex items-center gap-1.5"
            style={{ color: "#1A55A8" }}
          >
            <svg className="w-3.5 h-3.5 text-[#1A55A8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            AI 3줄 요약
          </p>
          <div
            className="text-[15px] leading-relaxed"
            style={{ color: "#1E3A5F" }}
          >
            {parsedSummary}
          </div>
        </div>
      )}

      {/* 기사 본문 */}
      <div style={{ borderTop: "1px solid #E4DDD3", paddingTop: "28px" }}>
        {news.content ? (
          <div>{renderContent(news.content)}</div>
        ) : (
          <div
            className="p-12 text-center flex flex-col items-center gap-4 bg-[#F0F9FF] border border-[#BAE6FD] rounded-[16px]"
          >
            <svg className="w-10 h-10 text-sky-500 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="text-xl font-bold" style={{ color: "#161311" }}>
              본문이 아직 수집되지 않았습니다
            </h3>
            <p style={{ color: "#5C5853" }}>
              아래 버튼을 눌러 본문을 가져오고 AI 분석을 시작하세요.
            </p>
          </div>
        )}
      </div>
    </article>
  );
}
