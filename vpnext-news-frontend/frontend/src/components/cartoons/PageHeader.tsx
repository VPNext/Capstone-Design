import { Link } from "react-router-dom";

interface PageHeaderProps {
  count?: number;
}

export default function PageHeader({ count }: PageHeaderProps) {
  return (
    <header className="mb-12">
      {/* 메인 배너 */}
      <div className="relative overflow-hidden mb-7 flex flex-col items-center justify-center text-center py-14 px-6 rounded-[28px] bg-gradient-to-br from-[#0E0C0A] via-[#1A1610] to-[#0E0C0A] shadow-[0_12px_48px_rgba(22,19,17,0.28)]">
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full pointer-events-none bg-[radial-gradient(circle,_rgba(251,191,36,0.07)_0%,_transparent_65%)] translate-x-[30%] -translate-y-[30%]" />
        <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full pointer-events-none bg-[radial-gradient(circle,_rgba(124,58,237,0.09)_0%,_transparent_65%)] -translate-x-[30%] translate-y-[30%]" />
        <div className="absolute top-1/2 left-1/2 w-80 h-80 rounded-full pointer-events-none bg-[radial-gradient(circle,_rgba(56,189,248,0.04)_0%,_transparent_65%)] -translate-x-[50%] -translate-y-[50%]" />

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-5 bg-[#FBBF24]/10 border border-[#FBBF24]/22 rounded-full">
          <div className="w-1.5 h-1.5 rounded-full animate-pulse bg-[#FBBF24]" />
          <span className="font-black text-[10px] uppercase text-[#FBBF24] tracking-[0.24em]">
            AI COMICS GALLERY
          </span>
        </div>

        {/* Title */}
        <h1 className="font-black text-white mb-3 font-serif text-[clamp(28px,5vw,50px)] leading-[1.15] tracking-[-0.02em]">
          AI 만화 모음집
        </h1>
        <p className="max-w-sm leading-relaxed mb-0 text-white/35 text-sm font-sans">
          AI가 뉴스를 읽고 직접 그린 웹툰 갤러리
          <br />
          이미지 생성에는 최대 1분이 걸릴 수 있습니다.
        </p>

        {/* Count pill */}
        {count !== undefined && count > 0 && (
          <div className="mt-6 flex items-center gap-2 px-5 py-2.5 bg-white/5 border border-white/8 rounded-full">
            <span className="text-2xl font-black text-white">{count}</span>
            <span className="text-sm text-white/35">개의 만화 수록</span>
          </div>
        )}
      </div>

      {/* Back link */}
      <div className="flex items-center justify-center">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-bold transition-all duration-200 text-[#9C9891] hover:text-[#161311]"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
          뉴스 목록으로 돌아가기
        </Link>
      </div>
    </header>
  );
}
