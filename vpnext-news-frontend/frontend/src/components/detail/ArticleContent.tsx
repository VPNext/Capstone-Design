import { useMemo, useState, useRef, useEffect, memo } from "react";
import { createPortal } from "react-dom";
import type { NewsDetail, DifficultTerm, KeyPerson } from "../../types/news";
import { parseAndRenderSummary } from "../../utils/source";
import { extractImageFromSummary } from "../../utils/summary";

interface ArticleContentProps {
  news: NewsDetail;
  aiSummary: string | null;
}

// 특수 문자 이스케이프 유틸
function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// 툴팁 포털 컴포넌트 (CLS 및 브라우저 리플로우 차단)
interface TooltipPortalProps {
  targetRect: DOMRect | null;
  title: string;
  category?: string;
  description: string;
  link?: string;
  onClose: () => void;
}

function TooltipPortal({
  targetRect,
  title,
  category,
  description,
  link,
  onClose,
}: TooltipPortalProps) {
  const [coords, setCoords] = useState({ top: 0, left: 0, isBottom: true });
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!targetRect || isMobile) return;

    const scrollY = window.scrollY;
    const scrollX = window.scrollX;
    
    // 툴팁 폭/높이 가측정
    const tooltipWidth = 290;
    const tooltipHeight = 135;
    
    let left = targetRect.left + scrollX + targetRect.width / 2 - tooltipWidth / 2;
    let top = targetRect.bottom + scrollY + 8; // 단어 하단에 기본 배치
    let isBottom = true;

    // 우측 오버플로우 방지
    if (left + tooltipWidth > window.innerWidth - 16) {
      left = window.innerWidth - tooltipWidth - 16;
    }
    // 좌측 오버플로우 방지
    if (left < 16) {
      left = 16;
    }
    // 하단 오버플로우 시 위쪽으로 플립(Flip)
    if (targetRect.bottom + tooltipHeight > window.innerHeight + scrollY - 16) {
      top = targetRect.top + scrollY - tooltipHeight - 8;
      isBottom = false;
    }

    setCoords({ top, left, isBottom });

    // 바깥 영역 클릭 시 자동 닫기
    const handleOutsideClick = (e: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [targetRect, isMobile, onClose]);

  if (!targetRect) return null;

  if (isMobile) {
    // 반응형 바텀 시트 형태 (모바일 가장자리 잘림 버그 완벽 제어)
    return createPortal(
      <div 
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 animate-fade-in" 
        onClick={onClose}
      >
        <div 
          className="w-full max-w-md bg-white rounded-t-[28px] p-6 shadow-[0_-8px_32px_rgba(22,19,17,0.15)] animate-slide-up border-t border-[#E4DDD3]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 모바일 바텀시트 탑 앵커 */}
          <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-5" />
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="font-bold text-[18px] text-slate-900">{title}</span>
            {category && (
              <span className="text-[10.5px] font-black uppercase text-sky-700 bg-sky-50 border border-sky-100/80 px-2.5 py-0.5 rounded-full">
                {category}
              </span>
            )}
          </div>
          <p className="text-[14px] text-slate-600 leading-relaxed mb-6 font-normal break-all">
            {description}
          </p>
          <div className="flex gap-3">
            {link && (
              <a
                href={link}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-3.5 text-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all border border-slate-200/50"
              >
                사전 상세정보 보기
              </a>
            )}
            <button
              onClick={onClose}
              className="flex-1 py-3.5 text-center rounded-xl bg-[#161311] text-white text-xs font-bold transition-all"
            >
              확인
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  // 데스크톱: position absolute 오버레이 (CLS 방지 및 본문 리플로우 배제)
  return createPortal(
    <div
      ref={tooltipRef}
      style={{
        position: "absolute",
        top: coords.top,
        left: coords.left,
        width: 290,
        zIndex: 100,
      }}
      className="bg-white border border-[#E4DDD3] rounded-2xl p-4.5 shadow-[0_12px_36px_rgba(22,19,17,0.14)] animate-scale-in text-slate-800 font-sans"
    >
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <span className="font-bold text-[14px] text-slate-900">{title}</span>
        {category && (
          <span className="text-[10px] font-bold text-sky-700 bg-sky-50 border border-sky-100 px-2 py-0.5 rounded-full">
            {category}
          </span>
        )}
      </div>
      <p className="text-[13px] text-slate-600 leading-relaxed mb-3.5 font-normal">
        {description}
      </p>
      {link && (
        <a
          href={link}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-sky-700 hover:text-sky-900 font-bold inline-flex items-center gap-1 cursor-pointer"
        >
          자세히 보기 →
        </a>
      )}
    </div>,
    document.body
  );
}

// 개별 단락 파싱 및 이벤트 위임 렌더러
interface ArticleParagraphsProps {
  content: string;
  difficultTerms: DifficultTerm[];
  keyPersons: KeyPerson[];
}

const ArticleParagraphs = memo(function ArticleParagraphs({
  content,
  difficultTerms,
  keyPersons,
}: ArticleParagraphsProps) {
  // 검색용 정규식 및 치환 매핑 useMemo
  const { regex, termMap, personMap } = useMemo(() => {
    const terms = difficultTerms.map((t) => t.term);
    const persons = keyPersons.map((p) => p.name);
    const allKeywords = Array.from(new Set([...terms, ...persons]))
      .filter(Boolean)
      .sort((a, b) => b.length - a.length); // 긴 단어 우선 매칭

    if (allKeywords.length === 0) {
      return { regex: null, termMap: new Map(), personMap: new Map() };
    }

    const pattern = `(${allKeywords.map((k) => escapeRegExp(k)).join("|")})`;
    const reg = new RegExp(pattern, "g");

    const tMap = new Map(difficultTerms.map((t) => [t.term, t]));
    const pMap = new Map(keyPersons.map((p) => [p.name, p]));

    return { regex: reg, termMap: tMap, personMap: pMap };
  }, [difficultTerms, keyPersons]);

  const paragraphs = useMemo(() => {
    const rawLines = content.split("\n").map((line) => line.trim());
    const cleanLines: string[] = [];

    // 이 패턴들을 가진 줄을 만나면 기사가 끝나고 푸터(저작권, 추천 링크, 투표 등)가 시작된 것으로 간주하고 정지합니다.
    const breakMarkers = [
      /GoodNews\s*paper/i,
      /무단\s*전재.*재배포/i,
      /Copyright/i,
      /기사는\s*어떠셨나요/i,
      /많이\s*본\s*기사/i,
      /오늘의\s*추천기사/i,
      /추천\s*기사\s*더보기/i,
      /해당분야별\s*기사/i,
      /분야별\s*기사/i,
      /^클릭!$/
    ];

    for (let i = 0; i < rawLines.length; i++) {
      const rawLine = rawLines[i];
      if (!rawLine) continue;

      // HTML 태그 및 특수 엔티티 정제
      const line = rawLine
        .replace(/<[^>]*>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();

      if (!line) continue;

      // 본문 하단 푸터 영역 감지 시 루프 중단 (이후 모든 라인 제외)
      if (breakMarkers.some((marker) => marker.test(line))) {
        break;
      }

      // 짧은 라인(100자 미만) 내에 저작권 기호나 투표 기능, 무단전재가 있으면 푸터로 보고 중단
      if (line.length < 100) {
        if (/(?:©|ⓒ)/.test(line)) break;
        if (/무단\s*전재/i.test(line) && (/재배포/i.test(line) || /금지/i.test(line))) {
          break;
        }
        if (/^(좋아요|화나요|슬퍼요|훈훈해요|응원해요|기사추천|추천)\s*\d*$/i.test(line)) {
          break;
        }
      }

      // 단순 숫자 번호 목록 줄 등은 건너뜀
      if (/^\d+$/.test(line)) {
        continue;
      }

      cleanLines.push(line);
    }

    return cleanLines;
  }, [content]);

  // 단락 텍스트 내 키워드를 찾아 span 태그 객체로 치환하는 헬퍼
  const parseParagraph = (text: string, paraIndex: number) => {
    if (!regex) return text;

    const parts = text.split(regex);
    return parts.map((part, i) => {
      if (termMap.has(part)) {
        return (
          <span
            key={`term-${paraIndex}-${i}`}
            data-term-name={part}
            className="text-sky-700 font-semibold underline decoration-dotted decoration-[#38bdf8] hover:text-sky-900 cursor-pointer transition-colors duration-150 inline-block px-[2px] bg-sky-50/40 rounded-[4px]"
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
            className="text-emerald-700 font-semibold underline decoration-dotted decoration-[#34d399] hover:text-emerald-900 cursor-pointer transition-colors duration-150 inline-block px-[2px] bg-emerald-50/40 rounded-[4px]"
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
          key={`para-${i}-${line.slice(0, 8)}`}
          className="text-[#2C2926] text-[16px] leading-[1.85] mb-[1.35em] font-sans font-normal break-keep tracking-[-0.012em]"
        >
          {parseParagraph(line, i)}
        </p>
      ))}
    </>
  );
});

export default function ArticleContent({
  news,
  aiSummary,
}: ArticleContentProps) {
  const finalImage = news.image_url || extractImageFromSummary(news.summary);

  // 툴팁 활성 데이터 상태 (단일 상태로 렌더 트리거 부하 통제)
  const [tooltipData, setTooltipData] = useState<{
    rect: DOMRect;
    title: string;
    category?: string;
    description: string;
    link?: string;
  } | null>(null);

  // AI 3줄 요약 마크다운 파싱 메모
  const parsedSummary = useMemo(() => {
    return parseAndRenderSummary(aiSummary, false);
  }, [aiSummary]);

  // 부모 위임 이벤트 핸들러 (수백 개의 단어마다 이벤트가 바인딩되는 오버헤드 차단)
  const handleArticleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const termName = target.getAttribute("data-term-name");
    const personName = target.getAttribute("data-person-name");

    if (termName && news.difficult_terms) {
      const termObj = news.difficult_terms.find((t) => t.term === termName);
      if (termObj) {
        setTooltipData({
          rect: target.getBoundingClientRect(),
          title: termObj.term,
          category: termObj.category,
          description: termObj.definition || termObj.explanation || "설명 정보가 존재하지 않습니다.",
          link: termObj.dict_link,
        });
      }
    } else if (personName && news.key_persons) {
      const personObj = news.key_persons.find((p) => p.name === personName);
      if (personObj) {
        setTooltipData({
          rect: target.getBoundingClientRect(),
          title: personObj.name,
          category: personObj.role || "주요 인물",
          description: `${personObj.description}${
            personObj.relation ? ` (주요 관계: ${personObj.relation})` : ""
          }`,
          link: `https://www.google.com/search?q=${encodeURIComponent(personObj.name)}`,
        });
      }
    }
  };

  return (
    <article className="flex-1 min-w-0 max-w-[720px] mx-auto">
      {/* 툴팁 오버레이 포털 */}
      {tooltipData && (
        <TooltipPortal
          targetRect={tooltipData.rect}
          title={tooltipData.title}
          category={tooltipData.category}
          description={tooltipData.description}
          link={tooltipData.link}
          onClose={() => setTooltipData(null)}
        />
      )}

      {/* 메인 이미지 - aspect-video 및 bg placeholder 적용하여 CLS 방지 */}
      {finalImage && (
        <figure
          className="mb-8 overflow-hidden rounded-[18px] border border-[#E4DDD3] bg-[#F3F0EB] shadow-[0_4px_24px_rgba(22,19,17,0.06)] aspect-video"
        >
          <img
            src={finalImage}
            alt="뉴스 메인 사진"
            className="w-full h-full object-cover"
            loading="eager"
          />
        </figure>
      )}

      {/* AI 3줄 요약 */}
      {aiSummary && (
        <div className="mb-8 p-5.5 rounded-[18px] bg-[#EFF6FF] border border-[#BFDBFE] shadow-[0_3px_12px_rgba(30,58,95,0.03)]">
          <p
            className="text-[11px] font-black uppercase tracking-widest mb-3 flex items-center gap-1.5 text-[#1A55A8]"
          >
            <svg className="w-3.5 h-3.5 text-[#1A55A8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            AI 3줄 요약
          </p>
          <div
            className="text-[15px] leading-relaxed text-[#1E3A5F] font-sans font-medium"
          >
            {parsedSummary}
          </div>
        </div>
      )}

      {/* 기사 본문 (이벤트 위임 등록) */}
      <div 
        className="border-t border-[#E4DDD3] pt-[28px]"
        onClick={handleArticleClick}
      >
        {news.content ? (
          <div>
            <ArticleParagraphs 
              content={news.content} 
              difficultTerms={news.difficult_terms || []} 
              keyPersons={news.key_persons || []}
            />
          </div>
        ) : (
          <div
            className="p-12 text-center flex flex-col items-center gap-4 bg-[#F0F9FF] border border-[#BAE6FD] rounded-[16px]"
          >
            <svg className="w-10 h-10 text-sky-500 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="text-xl font-bold text-[#161311]">
              본문이 아직 수집되지 않았습니다
            </h3>
            <p className="text-[#5C5853]">
              아래 버튼을 눌러 본문을 가져오고 AI 분석을 시작하세요.
            </p>
          </div>
        )}
      </div>
    </article>
  );
}
