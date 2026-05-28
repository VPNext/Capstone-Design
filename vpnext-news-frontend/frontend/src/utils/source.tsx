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
  "naver.com": "네이버 뉴스",
  "daum.net": "다음 뉴스",
  "joongdo.co.kr": "중도일보",
  "jeonmae.co.kr": "전국매일신문",
};

// URL로부터 한글 언론사명을 유추하는 선언형 헬퍼 함수
export const getSourceNameFromUrl = (url: string): string => {
  const lowercaseUrl = url.toLowerCase();
  
  // 1. 주요 도메인 맵 매핑 체크
  const matchedDomain = Object.keys(DOMAIN_TO_KOR_MAP).find(domain => 
    lowercaseUrl.includes(domain)
  );
  if (matchedDomain) {
    return DOMAIN_TO_KOR_MAP[matchedDomain];
  }

  // 2. 백엔드/프론트엔드 공통 언론사 영어 키워드 매핑 체크
  const matchedSourceKey = Object.keys(SOURCE_NAME_MAP).find(key =>
    lowercaseUrl.includes(key)
  );
  if (matchedSourceKey) {
    return SOURCE_NAME_MAP[matchedSourceKey];
  }

  try {
    const hostname = new URL(url).hostname.replace("www.", "");
    // 기타 파악 가능한 대표 도메인들
    if (hostname.includes("joongdo")) return "중도일보";
    if (hostname.includes("jeonmae")) return "전국매일신문";
    return hostname;
  } catch (e) {
    return "참조 기사";
  }
};

// 영어 언론사 키워드를 일괄 매칭하기 위한 pre-compiled 정규식
const ENGLISH_SOURCES_REGEX = new RegExp(
  `\\b(${Object.keys(SOURCE_NAME_MAP).join("|")})\\b`,
  "gi"
);

// 영어 언론사명을 가독성 좋은 한글명/대문자명으로 일괄 치환하는 헬퍼 (주소 내 텍스트는 제외)
export const replaceEnglishSourceNames = (text: string): string => {
  if (!text) return "";
  
  // URL 패턴을 기준으로 문장을 분할하여 주소 안의 문자열 치환을 방지
  const urlRegex = /(https?:\/\/[^\s)]+)/gi;
  
  return text.split(urlRegex).map(part => {
    // HTTP/HTTPS 프로토콜로 시작하는 URL 영역은 치환 없이 그대로 유지
    if (part.startsWith("http://") || part.startsWith("https://")) {
      return part;
    }
    
    // 일반 문장 영역만 영문 언론사명을 한글로 일괄 치환
    return part.replace(ENGLISH_SOURCES_REGEX, (match) => 
      SOURCE_NAME_MAP[match.toLowerCase()] || match
    );
  }).join("");
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

  // 2.2 기사 리스트 뒤에 붙은 생 URL 추가 수집 (예: - https://...)
  const rawUrlRegex = /(https?:\/\/[^\s)]+)/gi;
  while ((match = rawUrlRegex.exec(correctedText)) !== null) {
    const url = match[1].trim();
    if (!linksMap.has(url)) {
      const mappedName = getSourceNameFromUrl(url);
      linksMap.set(url, mappedName);
    }
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

  // 5. AI가 비교 분석 시 흔히 작성하는 포털 비교용 문구 및 생 URL 주소와 대시(-), 기타 잔여 참조 기사 텍스트 및 괄호 찌꺼기 정제
  cleanText = cleanText
    .replace(/\s*-\s*https?:\/\/[^\s)]+/gi, "") // 기사 뒤에 붙은 생 URL 및 대시(-) 패턴 제거
    .replace(/\b(?:네이버\s*(뉴스)?|naver|daum|다음\s*(뉴스)?|google|구글)\s*(?:등)?\s*(?:의)?\s*(?:보도\s*(내용)?|기사)?\s*(?:와|과)?\s*(?:비교하여|대조하여|비교해\s*보면|비교했을\s*때|비교해\s*보았습니다)[,.\s]*/gi, "")
    .replace(/(?:참조\s*기사|참조\s*기사\s*하이퍼링크)[\s:]*/gi, "")
    .replace(/[\s\n]*\(참조 기사 하이퍼링크.*?\)/gi, "")
    .replace(/[\s\n]*\(참조 기사 하이퍼링크.*?$/gi, "");

  // 5.5. 기사 리스트 및 참조 기사 텍스트 영역 제거 (줄 단위로 정교하게 필터링)
  const lines = cleanText.split("\n");
  const filteredLines: string[] = [];
  let skipRemaining = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // "기사 1:", "뉴스 1:" 등으로 시작하는 기사 목록 줄 제거
    if (/^(?:기사|뉴스)\s*\d+\s*:/i.test(line)) {
      continue;
    }

    // "🔗 참조 기사", "참조 기사" 등으로 시작하면 그 줄과 그 이후 모든 줄은 참조 기사 목록으로 간주하여 제거
    if (/^(?:🔗\s*)?(?:참조\s*기사|참조\s*뉴스|참조\s*기사\s*하이퍼링크)/i.test(line)) {
      skipRemaining = true;
      break;
    }

    if (!skipRemaining) {
      filteredLines.push(lines[i]);
    }
  }

  cleanText = filteredLines.join("\n");

  // 6. 텍스트 내에 들어있는 영어 언론사명을 한글 및 대문자로 치환하여 가독성 증대
  cleanText = replaceEnglishSourceNames(cleanText);

  // 연속된 공백 라인 정제 및 양 끝 공백 정리 후 마침표 처리
  cleanText = cleanText
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .replace(/[,.\s]+$/, ".");

  // 🔗 참조 기사 목록 생성 시 중복 매체 순번 매핑 최적화
  const nameCounts = new Map<string, number>();
  const tempLinks = Array.from(linksMap.entries()).map(([url, text]) => ({ url, text }));
  
  tempLinks.forEach(link => {
    nameCounts.set(link.text, (nameCounts.get(link.text) || 0) + 1);
  });
  
  const currentIndices = new Map<string, number>();
  const uniqueLinks = tempLinks.map(link => {
    const total = nameCounts.get(link.text) || 1;
    let displayName = link.text;
    if (total > 1) {
      const idx = (currentIndices.get(link.text) || 0) + 1;
      currentIndices.set(link.text, idx);
      displayName = `${link.text} [${idx}]`;
    }
    return { url: link.url, text: displayName };
  });

  return (
    <div>
      {/* 본문 텍스트 - whitespace-pre-wrap을 추가하여 줄바꿈(\n) 레이아웃 보존 */}
      <p className="leading-relaxed mb-3 whitespace-pre-wrap">{cleanText}</p>
      
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
              className="text-[11px] font-semibold px-2.5 py-1 rounded bg-slate-50 hover:bg-slate-100 hover:text-[#1A55A8] text-slate-600 border border-slate-200 hover:border-[#1A55A8]/30 shadow-sm transition-all duration-200 cursor-pointer"
            >
              {link.text}
            </a>
          ))}
        </div>
      )}
    </div>
  );
};
