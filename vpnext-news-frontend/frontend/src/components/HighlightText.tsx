

import { useMemo } from "react";

interface HighlightTextProps {
  text: string;
  keyword: string | null;
}

export default function HighlightText({ text, keyword }: HighlightTextProps) {
  // 정규식 이스케이프 처리 및 split 연산을 useMemo로 메모이제이션하여 리렌더링 오버헤드 최소화
  const parts = useMemo(() => {
    if (!keyword || !text) return [text];
    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return text.split(new RegExp(`(${escapedKeyword})`, "gi"));
  }, [text, keyword]);

  if (!keyword || !text) return <>{text}</>;
  
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
