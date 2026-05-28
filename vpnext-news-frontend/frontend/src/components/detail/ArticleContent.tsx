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
            <span>✨</span> AI 3줄 요약
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
            <div className="text-4xl">✨</div>
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
