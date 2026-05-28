import type { ReactNode } from "react";
import { SOURCE_NAME_MAP } from "../constants/source";

export const DOMAIN_TO_KOR_MAP: Record<string, string> = {
  "hani.co.kr": "한겨레",
  "khan.co.kr": "경향신문",
  "donga.com": "동아일보",
  "sbs.co.kr": "SBS",
  "hankyung.com": "한국경제",
  "mk.co.kr": "매일경제",
  "yonhapnewstv.co.kr": "연합뉴스",
  "yna.co.kr": "연합뉴스",
  "cstimes.com": "컨슈머타임스",
  "fsnews.co.kr": "급식뉴스",
};

// URL로부터 한글 언론사명을 유추하는 선언형 헬퍼 함수
export const getSourceNameFromUrl = (url: string): string => {
  const lowercaseUrl = url.toLowerCase();
  
  const matchedDomain = Object.keys(DOMAIN_TO_KOR_MAP).find(domain => 
    lowercaseUrl.includes(domain)
  );
  
  if (matchedDomain) {
    return DOMAIN_TO_KOR_MAP[matchedDomain];
  }

  try {
    return new URL(url).hostname.replace("www.", "");
  } catch (e) {
    return "참조 기사";
  }
};

// 영어 언론사 키워드를 일괄 매칭하기 위한 pre-compiled 정규식
const ENGLISH_SOURCES_REGEX = new RegExp(
  `\\b(${Object.keys(SOURCE_NAME_MAP).join("|")})\\b`,
  "gi"
);

// 영어 언론사명을 가독성 좋은 한글명/대문자명으로 일괄 치환하는 헬퍼
export const replaceEnglishSourceNames = (text: string): string => {
  if (!text) return "";
  return text.replace(ENGLISH_SOURCES_REGEX, (match) => {
    return SOURCE_NAME_MAP[match.toLowerCase()] || match;
  });
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
