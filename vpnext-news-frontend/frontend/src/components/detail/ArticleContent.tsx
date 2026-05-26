import type { ReactNode } from "react";
import { extractImageFromSummary } from "../../utils/summary";
import type { NewsDetail } from "../../types/news";

// ── [프론트엔드 전용 요약문 보정, 중복 제거 및 링크 파서 함수] ──
export const parseAndRenderSummary = (text: string | null): ReactNode => {
  if (!text) return null;

  // 1. 대괄호 [ 누락 상태 보정
  let correctedText = text.trim();
  if (correctedText.includes("보도 요약]") && !correctedText.startsWith("[")) {
    correctedText = "[" + correctedText;
  }

  // 2. 마크다운 링크 수집 및 중복 제거 (URL 기준 고유 매핑)
  const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  const linksMap = new Map<string, string>(); // URL -> 언론사명
  let match;
  while ((match = linkRegex.exec(correctedText)) !== null) {
    const linkText = match[1];
    const linkUrl = match[2];
    linksMap.set(linkUrl, linkText); // 동일 URL은 하나로 중복 제거됨
  }

  // 3. 지저분한 "(참조 기사 하이퍼링크 ...)" 또는 "(참조 기사 ...)" 문자열을 정규식으로 완전히 제거
  const cleanText = correctedText
    .replace(/[\s\n]*\(참조 기사 하이퍼링크.*?\)/g, "")
    .replace(/[\s\n]*\(참조 기사 하이퍼링크.*?$/g, "");

  const uniqueLinks = Array.from(linksMap.entries()).map(([url, text]) => ({
    text,
    url,
  }));

  return (
    <div>
      {/* 본문 텍스트 */}
      <p className="leading-relaxed mb-3">{cleanText}</p>
      
      {/* 고유 참조 링크 뱃지 리스트 */}
      {uniqueLinks.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-200/50 mt-2">
          <span className="text-[11px] font-bold text-slate-500 self-center">🔗 참조 기사:</span>
          {uniqueLinks.map((link, idx) => (
            <a
              key={idx}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all cursor-pointer"
            >
              {link.text}
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

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
