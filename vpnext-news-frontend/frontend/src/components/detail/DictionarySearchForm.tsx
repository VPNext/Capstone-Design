import type { FormEvent } from "react";

interface DictionarySearchFormProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  searchEngine: string;
  setSearchEngine: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
}

export default function DictionarySearchForm({
  searchTerm,
  setSearchTerm,
  searchEngine,
  setSearchEngine,
  onSubmit,
}: DictionarySearchFormProps) {
  return (
    <div className="mt-6 pt-5 border-t border-sky-100">
      <form onSubmit={onSubmit} className="flex flex-col gap-2">
        <label className="text-[13px] font-semibold text-sky-800 flex items-center gap-1.5 mb-0.5">
          <svg className="w-3.5 h-3.5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          추가 용어 검색
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={searchEngine}
            onChange={(e) => setSearchEngine(e.target.value)}
            className="text-[13px] bg-white border border-sky-200/80 px-3 py-2 text-slate-700 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition-all shrink-0 cursor-pointer"
            style={{ borderRadius: "8px" }}
          >
            <option value="stdict">표준국어대사전</option>
            <option value="opendict">우리말샘</option>
            <option value="google">구글 검색</option>
          </select>
          <div className="flex flex-1 gap-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="궁금한 단어 입력"
              className="flex-1 w-full text-[13px] border border-sky-200/80 px-3 py-2 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition-all text-slate-800"
              style={{ borderRadius: "8px" }}
            />
            <button
              type="submit"
              className="bg-sky-600 hover:bg-sky-700 text-white text-[13px] font-semibold px-4 py-2 transition-all duration-200 shrink-0 shadow-sm active:scale-95 cursor-pointer"
              style={{ borderRadius: "8px" }}
            >
              검색
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
