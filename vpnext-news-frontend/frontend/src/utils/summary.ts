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
  const txt = document.createElement("textarea");
  txt.innerHTML = rawString;
  const decoded = txt.value;
  const doc = new DOMParser().parseFromString(decoded, "text/html");
  return (doc.body.textContent || "").replace(/\s+/g, " ").trim();
};

export const decodeHtmlEntities = (text: string | null): string => {
  if (!text) return "";
  const txt = document.createElement("textarea");
  txt.innerHTML = text;
  return txt.value;
};
