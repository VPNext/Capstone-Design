

interface HighlightTextProps {
  text: string;
  keyword: string | null;
}

export default function HighlightText({ text, keyword }: HighlightTextProps) {
  if (!keyword || !text) return <>{text}</>;
  
  // 정규식 특수문자 이스케이프 처리
  const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escapedKeyword})`, "gi"));
  
  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === keyword.toLowerCase() ? (
          <mark key={index}>{part}</mark>
        ) : (
          part
        ),
      )}
    </>
  );
}
