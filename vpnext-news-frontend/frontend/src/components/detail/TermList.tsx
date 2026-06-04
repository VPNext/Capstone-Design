import { memo } from "react";
import type { DifficultTerm } from "../../types/news";

interface TermListProps {
  terms: DifficultTerm[];
  activeKeyword: string | null;
  onTermClick?: (term: string) => void;
}

const TermList = memo(function TermList({ terms, activeKeyword, onTermClick }: TermListProps) {
  if (!terms || terms.length === 0) {
    return <p className="text-sm text-sky-700 opacity-60">추출된 용어가 없습니다.</p>;
  }

  return (
    <ul className="text-[14px] space-y-3">
      {terms.map((term: DifficultTerm) => {
        const definitionText = term.definition || term.explanation || "";
        const dictUrl = term.dict_link || `https://stdict.korean.go.kr/search/searchResult.do?pageSize=10&searchKeyword=${encodeURIComponent(term.term)}`;
        const searchTitle = term.dict_link ? `${term.term} 뜻 상세 정보 보기` : `${term.term} 국립국어원에서 뜻 찾아보기`;
        const isActive = activeKeyword === term.term;

        return (
          <li 
            key={`term-${term.term}`} 
            id={`sidebar-term-${term.term}`}
            onClick={() => onTermClick?.(term.term)}
            className={`p-3.5 bg-white/70 backdrop-blur-md border rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.01)] transition-all duration-300 hover:shadow-md hover:bg-white cursor-pointer ${
              isActive 
                ? "border-sky-500 bg-sky-50/80 ring-2 ring-sky-300/40 translate-x-1" 
                : "border-sky-100/50"
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-1.5" onClick={(e) => e.stopPropagation()}>
              <a
                href={dictUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sky-700 hover:text-sky-900 transition-colors inline-flex items-center gap-1 font-bold text-[14px] cursor-pointer"
                title={searchTitle}
              >
                {term.term}
                <svg
                  className="w-3 h-3 opacity-60"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
              {term.category && (
                <span
                  className="text-[10px] font-semibold text-sky-600 bg-sky-50 border border-sky-100/60 px-2 py-0.5 rounded-full"
                >
                  {term.category}
                </span>
              )}
            </div>
            <p className="text-[13px] text-slate-600 leading-relaxed font-normal">{definitionText}</p>
          </li>
        );
      })}
    </ul>
  );
});

export default TermList;
