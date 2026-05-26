import type { ReactNode } from "react";
import { extractImageFromSummary } from "../../utils/summary";
import type { NewsDetail } from "../../types/news";
import { SOURCE_NAME_MAP } from "../../constants/source";

// URL로부터 한글 언론사명을 유추하는 헬퍼 함수
export const getSourceNameFromUrl = (url: string): string => {
  const lowercaseUrl = url.toLowerCase();
  if (lowercaseUrl.includes("hani.co.kr")) return "한겨레";
  if (lowercaseUrl.includes("khan.co.kr")) return "경향신문";
  if (lowercaseUrl.includes("chosun.com")) return "조선일보";
  if (lowercaseUrl.includes("joongang.co.kr")) return "중앙일보";
  if (lowercaseUrl.includes("donga.com")) return "동아일보";
  if (lowercaseUrl.includes("sbs.co.kr")) return "SBS";
  if (lowercaseUrl.includes("kbs.co.kr")) return "KBS";
  if (lowercaseUrl.includes("mbc.co.kr")) return "MBC";
  if (lowercaseUrl.includes("ytn.co.kr")) return "YTN";
  if (lowercaseUrl.includes("hankyung.com")) return "한국경제";
  if (lowercaseUrl.includes("mk.co.kr")) return "매일경제";
  if (lowercaseUrl.includes("yonhapnewstv.co.kr") || lowercaseUrl.includes("yna.co.kr")) return "연합뉴스";
  if (lowercaseUrl.includes("cstimes.com")) return "컨슈머타임스";
  if (lowercaseUrl.includes("fsnews.co.kr")) return "급식뉴스";

  try {
    const domain = new URL(url).hostname.replace("www.", "");
    return domain;
  } catch (e) {
    return "참조 기사";
  }
};

// 영어 언론사명을 가독성 좋은 한글명/대문자명으로 일괄 치환하는 헬퍼
export const replaceEnglishSourceNames = (text: string): string => {
  let result = text;
  Object.entries(SOURCE_NAME_MAP).forEach(([eng, kor]) => {
    // 단어 앞뒤 경계를 감안하여 매칭 (예: yonhap -> 연합뉴스)
    const regex = new RegExp(`\\b${eng}\\b`, "gi");
    result = result.replace(regex, kor);
  });
  return result;
};

// ── [프론트엔드 전용 요약문 보정, 중복 제거 및 링크 파서 함수] ──
export const parseAndRenderSummary = (
  text: string | null,
  showBadgeList: boolean = true
): ReactNode => {
  if (!text) return null;

  // 1. 대괄호 [ 누락 상태 보정
  let correctedText = text.trim();
  if (correctedText.includes("보도 요약]") && !correctedText.startsWith("[")) {
    correctedText = "[" + correctedText;
  }

  // 2. 마크다운 링크 수집 및 중복 제거 (URL 기준 고유 매핑)
  const linksMap = new Map<string, string>(); // URL -> 언론사명
  let match;

  // 전체 마크다운 링크 패턴 매칭: [텍스트](URL1, URL2, ...) 형태 지원
  const markdownLinkRegex = /\[([^\]]+)\]\(\s*(https?:\/\/[^)]+)\)/gi;
  while ((match = markdownLinkRegex.exec(correctedText)) !== null) {
    const linkText = match[1];
    const rawUrls = match[2];
    const urls = rawUrls.split(/[\s,]+/).map(u => u.trim()).filter(u => /^https?:\/\//i.test(u));
    
    urls.forEach(url => {
      // 1개짜리 링크인 경우 대괄호 안의 이름(예: '한겨레 보도')을 우선 사용,
      // 다중 링크인 경우 URL로부터 언론사명을 유추함
      if (urls.length === 1) {
        const mappedText = SOURCE_NAME_MAP[linkText.toLowerCase()] || linkText;
        linksMap.set(url, mappedText);
      } else {
        const mappedName = getSourceNameFromUrl(url);
        linksMap.set(url, mappedName);
      }
    });
  }

  // 3. AI가 실수로 본문에 쑤셔 넣은 불필요한 메타 JSON 키/값 영역 정제
  // (문장 중간/끝자락에 이물질처럼 삽입된 영역은 통째로 삭제하고, 맨 앞의 접두사는 접두사 텍스트만 제거)
  let cleanText = correctedText
    .replace(/[\s\n]+(?:red_flags|summary|score|label|is_subjective)\s*:\s*[\s\S]*$/gi, "")
    .replace(/^(?:red_flags|summary|score|label|is_subjective)\s*:\s*/gi, "");

  // 4. 지저분한 다중 URL/교차 분석용 마크다운 데이터 영역을 본문 텍스트에서 완전히 제거하거나 단일 링크는 텍스트만 남김
  const parseLinkRegex = /\[([^\]]+)\]\(\s*(https?:\/\/[^)]+)\)/gi;
  cleanText = cleanText.replace(parseLinkRegex, (_, linkText, rawUrls) => {
    const urls = rawUrls.split(/[\s,]+/).map((u: string) => u.trim()).filter((u: string) => /^https?:\/\//i.test(u));
    const trimmedText = linkText.trim();

    // 통째로 지워야 할 조건:
    // - 대괄호 텍스트가 "교차 분석용 뉴스 데이터", "참조 기사", "참조 뉴스", "참조 기사 하이퍼링크" 등을 포함할 때
    // - 또는 괄호 안에 유효한 URL이 2개 이상일 때
    const shouldRemove = /교차\s*분석용|참조\s*기사|참조\s*뉴스|하이퍼링크/i.test(trimmedText) || urls.length >= 2;

    if (shouldRemove) {
      return "";
    } else {
      return trimmedText;
    }
  });

  // 5. 기타 잔여 참조 기사 텍스트 및 괄호 찌꺼기 정제
  cleanText = cleanText
    .replace(/(?:참조\s*기사|참조\s*기사\s*하이퍼링크)[\s:]*/gi, "")
    .replace(/[\s\n]*\(참조 기사 하이퍼링크.*?\)/gi, "")
    .replace(/[\s\n]*\(참조 기사 하이퍼링크.*?$/gi, "");

  // 6. 텍스트 내에 들어있는 영어 언론사명을 한글 및 대문자로 치환하여 가독성 증대
  cleanText = replaceEnglishSourceNames(cleanText);

  // 마지막에 남은 콤마나 공백 등 문장 마침표 정리
  cleanText = cleanText.trim().replace(/[,.\s]+$/, ".");

  const uniqueLinks = Array.from(linksMap.entries()).map(([url, text]) => ({
    text,
    url,
  }));

  return (
    <div>
      {/* 본문 텍스트 */}
      <p className="leading-relaxed mb-3">{cleanText}</p>
      
      {/* 고유 참조 링크 뱃지 리스트 */}
      {showBadgeList && uniqueLinks.length > 0 && (
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
            {parseAndRenderSummary(aiSummary, false)}
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
