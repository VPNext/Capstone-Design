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
  
  // 1. [언론사](url) 마크다운 링크 패턴 제거 (텍스트명만 남기거나 통째로 제거)
  // 요약 카드에서는 지분 확보를 위해 마크다운 링크와 그 주변 조사(등의 기사와 함께...)를 통째로 걷어냅니다.
  let cleanText = decoded
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
  
  return cleanText;
};
