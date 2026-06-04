import { memo } from "react";
import type { KeyPerson } from "../../types/news";

interface PersonListProps {
  persons: KeyPerson[];
  activeKeyword: string | null;
  onPersonClick?: (name: string) => void;
}

const PersonList = memo(function PersonList({ persons, activeKeyword, onPersonClick }: PersonListProps) {
  if (!persons || persons.length === 0) {
    return <p className="text-sm text-emerald-700 opacity-60">추출된 인물이 없습니다.</p>;
  }

  return (
    <ul className="text-[14px] space-y-3">
      {persons.map((person: KeyPerson) => {
        const isActive = activeKeyword === person.name;

        return (
          <li
            key={`person-${person.name}`}
            id={`sidebar-person-${person.name}`}
            onClick={() => onPersonClick?.(person.name)}
            className={`p-3.5 bg-white/70 backdrop-blur-md border rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.01)] transition-all duration-300 hover:shadow-md hover:bg-white cursor-pointer ${
              isActive 
                ? "border-emerald-500 bg-emerald-50/80 ring-2 ring-emerald-300/40 translate-x-1" 
                : "border-emerald-100/50"
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-1.5" onClick={(e) => e.stopPropagation()}>
              <a
                href={`https://www.google.com/search?q=${encodeURIComponent(person.name)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-emerald-800 hover:text-emerald-900 transition-colors text-[14px] font-bold cursor-pointer"
                title={`${person.name} 구글에서 검색하기`}
              >
                {person.name}
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
              {person.role && (
                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100/60 px-2 py-0.5 rounded-full">
                  {person.role}
                </span>
              )}
            </div>
            <p className="text-[13px] text-slate-700 leading-relaxed font-normal">
              {person.description}
            </p>
            {person.relation && (
              <div className="text-[11px] text-slate-500 mt-2.5 pt-2 border-t border-emerald-100/30 flex items-center gap-1.5">
                <span className="font-semibold text-emerald-700/80">이 기사에서</span>
                <span className="text-slate-600 font-medium">{person.relation}</span>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
});

export default PersonList;
