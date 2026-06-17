import { useMemo, memo } from "react";
import type { DifficultTerm, KeyPerson } from "../../types/news";

interface ArticleParagraphsProps {
  content: string;
  difficultTerms: DifficultTerm[];
  keyPersons: KeyPerson[];
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// 기사 마무리 구문 감지 패턴 (정규식 한 번만 컴파일)
const BREAK_MARKERS = [
  /GoodNews\s*paper/i,
  /무단\s*전재.*재배포/i,
  /Copyright/i,
  /기사는\s*어떠셨나요/i,
  /많이\s*본\s*기사/i,
  /오늘의\s*추천기사/i,
  /추천\s*기사\s*더보기/i,
  /해당분야별\s*기사/i,
  /분야별\s*기사/i,
  /^클릭!$/,
];

const HTML_ENTITIES: Record<string, string> = {
  "&nbsp;": " ",
  "&lt;": "<",
  "&gt;": ">",
  "&amp;": "&",
  "&quot;": '"',
  "&#39;": "'",
};

function cleanLine(rawLine: string): string {
  return rawLine
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;|&lt;|&gt;|&amp;|&quot;|&#39;/g, (m) => HTML_ENTITIES[m] ?? m)
    .trim();
}

const ArticleParagraphs = memo(function ArticleParagraphs({
  content,
  difficultTerms,
  keyPersons,
}: ArticleParagraphsProps) {
  const { regex, termMap, personMap } = useMemo(() => {
    const terms = difficultTerms.map((t) => t.term);
    const persons = keyPersons.map((p) => p.name);
    const allKeywords = Array.from(new Set([...terms, ...persons]))
      .filter(Boolean)
      .sort((a, b) => b.length - a.length);

    if (allKeywords.length === 0) {
      return { regex: null, termMap: new Map<string, DifficultTerm>(), personMap: new Map<string, KeyPerson>() };
    }

    const pattern = `(${allKeywords.map((k) => escapeRegExp(k)).join("|")})`;
    const reg = new RegExp(pattern, "g");

    const tMap = new Map(difficultTerms.map((t) => [t.term, t]));
    const pMap = new Map(keyPersons.map((p) => [p.name, p]));

    return { regex: reg, termMap: tMap, personMap: pMap };
  }, [difficultTerms, keyPersons]);

  const paragraphs = useMemo(() => {
    const rawLines = content.split("\n");
    const cleanLines: string[] = [];

    for (let i = 0; i < rawLines.length; i++) {
      const line = cleanLine(rawLines[i]);
      if (!line) continue;
      if (BREAK_MARKERS.some((marker) => marker.test(line))) break;

      if (line.length < 100) {
        if (/(?:©|ⓒ)/.test(line)) {
          if (/무단|재배포|금지|reserved|copyright/i.test(line)) break;
          continue;
        }
        if (/무단\s*전재/i.test(line) && (/재배포/i.test(line) || /금지/i.test(line))) break;
        if (/^(좋아요|화나요|슬퍼요|훈훈해요|응원해요|기사추천|추천)\s*\d*$/i.test(line)) break;
      }

      if (/^\d+$/.test(line)) continue;

      cleanLines.push(line);
    }

    return cleanLines;
  }, [content]);

  const parseParagraph = (text: string, paraIndex: number) => {
    if (!regex) return text;

    regex.lastIndex = 0; // 글로벌 RegExp 인덱스 초기화
    const parts = text.split(regex);
    return parts.map((part, i) => {
      if (termMap.has(part)) {
        return (
          <span
            key={`term-${paraIndex}-${i}`}
            data-term-name={part}
            className="text-sky-700 font-semibold underline decoration-dotted decoration-sky-400 hover:text-sky-900 cursor-pointer transition-colors duration-150 inline-block px-[2px] bg-sky-50/50 rounded-[3px]"
          >
            {part}
          </span>
        );
      }
      if (personMap.has(part)) {
        return (
          <span
            key={`person-${paraIndex}-${i}`}
            data-person-name={part}
            className="text-emerald-700 font-semibold underline decoration-dotted decoration-emerald-400 hover:text-emerald-900 cursor-pointer transition-colors duration-150 inline-block px-[2px] bg-emerald-50/50 rounded-[3px]"
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <>
      {paragraphs.map((line, i) => (
        <p
          key={`para-${i}`}
          className="text-[#2C2926] text-[17px] leading-[2] mb-[1.5em] font-sans font-normal break-keep tracking-[-0.01em]"
        >
          {parseParagraph(line, i)}
        </p>
      ))}
    </>
  );
});

export default ArticleParagraphs;
