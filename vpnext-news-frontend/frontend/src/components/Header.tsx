import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function Header() {
  const [keyword, setKeyword] = useState("");
  const navigate = useNavigate();

  const handleSearch = () => {
    const trimmed = keyword.trim();
    if (!trimmed) return;
    // 검색 결과 페이지로 이동 (query string 사용)
    navigate(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <header className="bg-white/95 backdrop-blur-md shadow-sm sticky top-0 z-50 border-b border-slate-200 transition-all">
      <div className="max-w-6xl mx-auto px-6 py-3 flex justify-between items-center gap-8">
        {/* 왼쪽: 로고 및 네비게이션 */}
        <div className="flex items-center gap-10">
          <Link
            to="/"
            className="text-2xl font-black text-slate-900 tracking-tighter flex items-center gap-2"
          >
            뉴스 정보 <span className="text-sky-600">나침반</span>
          </Link>

          {/* GNB (Global Navigation Bar) */}
          <nav className="hidden md:flex items-center gap-6 text-[15px] font-semibold text-slate-600">
            <Link to="/" className="hover:text-sky-600 transition-colors">
              홈
            </Link>
            <Link
              to="/cartoons"
              className="hover:text-sky-600 transition-colors flex items-center gap-1"
            >
              <span>🎨</span> AI 만화 모음집
            </Link>
          </nav>
        </div>

        {/* 오른쪽: 검색창 영역 */}
        <div className="relative w-full max-w-xs hidden sm:block">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="뉴스 키워드 검색..."
            className="w-full bg-slate-100 border border-transparent rounded-full pl-5 pr-12 py-2 text-sm focus:outline-none focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100 transition-all shadow-inner"
          />
          <button
            onClick={handleSearch}
            className="absolute right-1 top-1 bottom-1 bg-sky-600 text-white px-3.5 rounded-full text-xs font-bold hover:bg-sky-700 hover:shadow-md transition-all flex items-center gap-1"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              stroke="currentColor"
              className="w-3.5 h-3.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
              />
            </svg>
            검색
          </button>
        </div>
      </div>
    </header>
  );
}
