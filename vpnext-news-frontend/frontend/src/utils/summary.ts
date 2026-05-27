export const extractImageFromSummary = (rawString: string): string | null => {
  if (!rawString) return null;
  const txt = document.createElement("textarea");
  txt.innerHTML = rawString;
  const decoded = txt.value;
  const imgMatch = decoded.match(/<img[^>]+src=["']([^"']+)["']/i);
  return imgMatch ? imgMatch[1] : null;
};

export const extractTextFromSummary = (rawString: string): string => {
  if (!rawString) return "";
  
  // HTML 디코딩
  const txt = document.createElement("textarea");
  txt.innerHTML = rawString;
  let decoded = txt.value;
  
  // 1. [언론사](url) 마크다운 링크 패턴 제거 (텍스트명만 남기거나 통째로 제거)
  // 요약 카드에서는 지분 확보를 위해 마크다운 링크와 그 주변 조사(등의 기사와 함께...)를 통째로 걷어냅니다.
  decoded = decoded.replace(/,\s*\[[^\]]+\]\([^)]+\)/g, ""); // 쉼표 뒤 링크 제거
  decoded = decoded.replace(/\[[^\]]+\]\([^)]+\)\s*등의\s+기사와\s+함께\s+분석하여\s+작성되었습니다\.?/g, "");
  decoded = decoded.replace(/\[[^\]]+\]\([^)]+\)/g, ""); // 잔여 링크 제거
  
  const doc = new DOMParser().parseFromString(decoded, "text/html");
  let plainText = (doc.body.textContent || "").replace(/\s+/g, " ").trim();
  
  // 2. 혹시 HTML 파싱 후에도 남아있을 수 있는 '등의 기사와 함께 분석...' 꼬리표 텍스트 추가 정제
  plainText = plainText.replace(/,\s*등의\s+기사와\s+함께\s+분석하여\s+작성되었습니다\.?/g, "");
  plainText = plainText.replace(/등의\s+기사와\s+함께\s+분석하여\s+작성되었습니다\.?/g, "");
  
  return plainText;
};

export const decodeHtmlEntities = (text: string | null): string => {
  if (!text) return "";
  const txt = document.createElement("textarea");
  txt.innerHTML = text;
  
  let decoded = txt.value;
  // 타이틀 및 일반 텍스트에서도 지저분한 마크다운 기호를 정제
  decoded = decoded.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  return decoded;
};

