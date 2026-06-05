import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="w-full bg-[#f0ece4] border-t border-[#e4ddd3] py-12 px-6 mt-16 font-sans">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
        
        {/* 브랜딩 / 로고 영역 */}
        <div className="flex flex-col items-center md:items-start gap-2">
          <Link to="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="relative w-7 h-7 rounded-full border border-black/10 bg-black/5 flex items-center justify-center transition-all duration-300 group-hover:border-[#c13026]/40 group-hover:bg-[#c13026]/5">
              <svg
                className="w-4 h-4 text-[#c13026] transition-transform duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:rotate-[360deg]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <polygon points="12,4 15,12 12,10.5" fill="#c13026" stroke="#c13026" />
                <polygon points="12,20 9,12 12,13.5" fill="#5c5853" stroke="#5c5853" />
                <circle cx="12" cy="12" r="1" fill="#fff" />
              </svg>
            </div>
            <span className="font-serif text-xl font-black tracking-[-0.02em] text-[#161311] transition-colors duration-200">
              뉴스 정보 <span className="text-[#c13026]">나침반</span>
            </span>
          </Link>
          <p className="text-xs text-[#706b64] font-medium mt-1">
            AI 기반 뉴스 분석 및 4컷 만화 요약 서비스
          </p>
        </div>

        {/* 링크 메뉴 */}
        <div className="flex gap-8 text-xs font-bold text-[#5c5853]">
          <Link to="/" className="hover:text-[#c13026] transition-colors duration-200">
            뉴스 홈
          </Link>
          <Link to="/analyzed" className="hover:text-[#c13026] transition-colors duration-200">
            분석 완료 기사
          </Link>
          <Link to="/cartoons" className="hover:text-[#c13026] transition-colors duration-200">
            4컷 만화 갤러리
          </Link>
        </div>

        {/* 팀 정보 및 소셜/카피라이트 */}
        <div className="flex flex-col items-center md:items-end gap-1.5 text-right">
          <span className="text-xs font-bold text-[#161311] bg-[#e4ddd3] px-3 py-1 rounded-full">
            Designed by Team <strong className="font-black text-[#c13026]">VFNEXT</strong>
          </span>
          <p className="text-[10px] text-[#706b64] font-medium mt-1">
            &copy; {new Date().getFullYear()} VFNEXT. All Rights Reserved.
          </p>
        </div>

      </div>
    </footer>
  );
}
