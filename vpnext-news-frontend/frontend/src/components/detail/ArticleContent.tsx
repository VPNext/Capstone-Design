import type { ReactNode } from "react";
import { extractImageFromSummary } from "../../utils/summary";
import type { NewsDetail } from "../../types/news";

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

  // ── [프론트엔드 전용 요약문 보정 및 링크 파서 함수] ──
  const parseAndRenderSummary = (text: string | null): ReactNode => {
    if (!text) return null;

    // 1. 대괄호 [ 누락 상태 보정
    let correctedText = text.trim();
    if (correctedText.includes("보도 요약]") && !correctedText.startsWith("[")) {
      correctedText = "[" + correctedText;
    }

    // 2. 마크다운 링크 정규식 매칭 및 <a> 태그 변환
    const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(correctedText)) !== null) {
      const matchIndex = match.index;
      
      // 링크 이전의 일반 텍스트 추가
      if (matchIndex > lastIndex) {
        parts.push(correctedText.substring(lastIndex, matchIndex));
      }
      
      // 마크다운 링크를 <a> 태그 컴포넌트로 변환하여 추가
      const linkText = match[1];
      const linkUrl = match[2];
      parts.push(
        <a
          key={matchIndex}
          href={linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#1A55A8] hover:text-[#C13026] hover:underline font-bold inline-flex items-center gap-0.5 mx-0.5"
        >
          {linkText}
        </a>
      );
      lastIndex = linkRegex.lastIndex;
    }

    // 매칭 완료 후 남은 일반 텍스트가 있다면 추가
    if (lastIndex < correctedText.length) {
      parts.push(correctedText.substring(lastIndex));
    }

    return parts.length > 0 ? <>{parts}</> : correctedText;
  };

  return (
    <article className="flex-1 min-w-0">
      {/* 메인 이미지 */}
      {finalImage && (
        <figure
          className="mb-8 overflow-hidden rounded-[18px] border border-[#E4DDD3] shadow-[0_4px_24px_rgba(22,19,17,0.08)]"
        >
          <img
            src={finalImage}
            alt="뉴스 메인 사진"
            className="w-full max-h-[520px] object-cover"
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
          <p
            className="text-[15px] leading-relaxed"
            style={{ color: "#1E3A5F" }}
          >
            {parseAndRenderSummary(aiSummary)}
          </p>
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
