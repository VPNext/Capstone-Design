import { Link } from "react-router-dom";

export default function Header() {
  return (
    <header className="bg-white/95 backdrop-blur-sm shadow-sm sticky top-0 z-50 border-b border-slate-100">
      <div className="max-w-6xl mx-auto px-6 py-3 flex justify-between items-center">
        {/* 로고 영역 - 폰트 굵기를 검은색 수준으로 높여 강렬한 인상 */}
        <Link
          to="/"
          className="text-2xl font-black text-slate-900 tracking-tighter flex items-center gap-2"
        >
          <span className="text-3xl"></span>
          뉴스 정보 <span className="text-sky-600">나침반</span>
        </Link>

        {/* 검색창 영역 - 입력창과 버튼을 일체형처럼 보이게 디자인 */}
        <div className="relative w-80">
          <input
            type="text"
            placeholder="뉴스 키워드 검색..."
            className="w-full bg-slate-100 border border-slate-200 rounded-full pl-5 pr-12 py-2.5 text-sm focus:outline-none focus:border-sky-400 focus:bg-white focus:ring-1 focus:ring-sky-200 transition"
          />
          <button className="absolute right-1 top-1 bottom-1 bg-sky-600 text-white px-4 rounded-full text-xs font-semibold hover:bg-sky-700 transition flex items-center gap-1.5">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              stroke="currentColor"
              className="w-4 h-4"
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
