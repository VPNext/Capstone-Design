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
    <div className="mt-5 pt-4 border-t border-sky-200/60">
      <form onSubmit={onSubmit} className="flex flex-col gap-2">
        <label className="text-[13px] font-bold text-sky-800 flex items-center gap-1">
          <span>🔍</span> 추가 용어 검색
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={searchEngine}
            onChange={(e) => setSearchEngine(e.target.value)}
            className="text-[13px] bg-white border border-sky-200 px-2 py-1.5 text-slate-700 outline-none focus:border-sky-400 transition-all shrink-0"
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
              className="flex-1 w-full text-[13px] border border-sky-200 px-3 py-1.5 outline-none focus:border-sky-400 transition-all"
              style={{ borderRadius: "8px" }}
            />
            <button
              type="submit"
              className="bg-sky-600 text-white text-[13px] font-bold px-3 py-1.5 hover:bg-sky-700 transition-colors shrink-0"
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
