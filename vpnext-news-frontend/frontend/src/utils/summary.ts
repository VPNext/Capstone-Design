const ENTITY_MAP: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};

// HTML 엔티티를 디코딩하여 문자열로 변환하는 고속 헬퍼 함수
export const decodeHtmlEntities = (text: string | null): string => {
  if (!text) return "";
  
  let decoded = text.replace(/&[#a-zA-Z0-9]+;/g, (match) => {
    if (ENTITY_MAP[match]) return ENTITY_MAP[match];
    
    if (match.startsWith("&#")) {
      const code = match.slice(2, -1);
      if (code.startsWith("x")) {
        return String.fromCharCode(parseInt(code.slice(1), 16));
      }
      return String.fromCharCode(parseInt(code, 10));
    }
    return match;
  });
  
  // 타이틀 및 일반 텍스트에서도 지저분한 마크다운 기호를 정제
  return decoded.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
};

export const extractImageFromSummary = (rawString: string): string | null => {
  if (!rawString) return null;
  const decoded = decodeHtmlEntities(rawString);
  const imgMatch = decoded.match(/<img[^>]+src=["']([^"']+)["']/i);
  return imgMatch ? imgMatch[1] : null;
};

export const extractTextFromSummary = (rawString: string): string => {
  if (!rawString) return "";
  
  // HTML 디코딩
  const decoded = decodeHtmlEntities(rawString);
  
  // 1. [언론사](url) 마크다운 링크 패턴 제거 및 AI 메타데이터/언론사 접두사/참조 문구 정제
  let cleanText = decoded
    .replace(
      /[\s\n]+(red_flags|summary|score|label|is_subjective)\s*:\s*[\s\S]*$/gi,
      "",
    )
    .replace(/^(red_flags|summary|score|label|is_subjective)\s*:\s*/gi, "")
    .replace(/^\[[^\]]*보도\s*요약\]\s*/gi, "") // "[언론사 보도 요약]" 접두사 완전 정제
    .replace(/[\s\n]*[(\[]?\s*(?:참조|출처|관련\s*(?:기사|뉴스|정보))\s*:\s*[\s\S]*$/gi, "") // "참조:", "출처:", "관련 기사:" 관련 정제
    .replace(/[\s\n]*\((?:참조\s*기사\s*)?하이퍼링크.*?\)/gi, "") // "(참조 기사 하이퍼링크 ...)" 관련 정제
    .replace(/[\s\n]*\((?:참조\s*기사\s*)?하이퍼링크.*?$/gi, "") // 잔여 "(참조 기사 하이퍼링크" 관련 정제
    .replace(/(?:관련\s*|교차\s*분석\s*|비교\s*)?(?:정보|기사|뉴스)는\s*[\s\S]*?참조\s*(?:하여\s*작성되었습니다|하였습니다|했습니다|합니다)\.?/gi, "") // "관련 정보는 ... 참조하였습니다" 정제
    .replace(/,\s*\[[^\]]+\]\([^)]+\)/g, "") // 쉼표 뒤 링크 제거
    .replace(/\[[^\]]+\]\([^)]+\)\s*등의\s+기사와\s+함께\s+분석하여\s+작성되었습니다\.?/g, "")
    .replace(/\[[^\]]+\]\([^)]+\)/g, ""); // 잔여 링크 제거
  
  if (typeof DOMParser !== "undefined") {
    const doc = new DOMParser().parseFromString(cleanText, "text/html");
    cleanText = (doc.body.textContent || "").replace(/\s+/g, " ").trim();
  }
  
  // 2. 혹시 HTML 파싱 후에도 남아있을 수 있는 '등의 기사와 함께 분석...' 꼬리표 텍스트 추가 정제
  cleanText = cleanText
    .replace(/,\s*등의\s+기사와\s+함께\s+분석하여\s+작성되었습니다\.?/g, "")
    .replace(/등의\s+기사와\s+함께\s+분석하여\s+작성되었습니다\.?/g, "");

  // 3. 쉼표, 슬래시, 또는 공백으로 분리된 동일한 언론사명/단어가 연속으로 중복되어 표시되는 오류 방지 (예: SBS, SBS -> SBS)
  cleanText = cleanText.replace(/([가-힣A-Za-z0-9]+)(?:(?:\s*[,/]\s*|\s+)\1)+/g, "$1");
  
  return cleanText;
};
