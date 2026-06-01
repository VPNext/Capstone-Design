import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="w-full bg-[#f0ece4] border-t border-[#e4ddd3] py-12 px-6 mt-16 font-sans">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
        
        {/* 브랜딩 / 로고 영역 */}
        <div className="flex flex-col items-center md:items-start gap-2">
          <Link 
            to="/" 
            className="font-serif text-2xl font-black tracking-wider text-[#161311] hover:text-[#c13026] transition-colors duration-300"
          >
            VF<span className="text-[#c13026]">NEXT</span>
          </Link>
          <p className="text-xs text-[#706b64] font-medium">
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
