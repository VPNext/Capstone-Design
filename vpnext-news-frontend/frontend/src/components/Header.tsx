import { useState, useEffect, useCallback, memo } from "react";
import { Link, useLocation } from "react-router-dom";

const todayStr = new Date().toLocaleDateString("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "long",
});

const NAV_ITEMS = [
  {
    to: "/",
    label: "홈",
    activeClass: "text-white bg-white/12 border-white/20",
    dotClass: "",
  },
  {
    to: "/analyzed",
    label: "AI 분석 뉴스",
    activeClass: "text-[#38BDF8] bg-[#38BDF8]/10 border-[#38BDF8]/20",
    dotClass: "bg-[#38BDF8] shadow-[0_0_6px_#38BDF8]",
  },
  {
    to: "/cartoons",
    label: "AI 만화",
    activeClass: "text-[#FBBF24] bg-[#FBBF24]/10 border-[#FBBF24]/20",
    dotClass: "bg-[#FBBF24] shadow-[0_0_6px_#FBBF24]",
  },
];

// Header 내부 네비게이션 아이템 — 불필요한 재렌더 방지용 memo
const NavItem = memo(function NavItem({
  item,
  isActive,
}: {
  item: (typeof NAV_ITEMS)[0];
  isActive: boolean;
}) {
  return (
    <Link
      to={item.to}
      className={`relative flex items-center gap-1.5 text-sm font-bold px-3.5 py-2 rounded-full transition-all duration-200 hover:text-white hover:bg-white/8 ${
        isActive
          ? `${item.activeClass} border`
          : "text-white/55 border border-transparent"
      }`}
    >
      {item.dotClass && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
            isActive ? "opacity-100" : "opacity-50"
          } ${item.dotClass}`}
        />
      )}
      {item.label}
    </Link>
  );
});

// 모바일 네비게이션 아이템
const MobileNavItem = memo(function MobileNavItem({
  item,
  isActive,
  onClick,
}: {
  item: (typeof NAV_ITEMS)[0];
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <Link
      to={item.to}
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all duration-200 ${
        isActive ? item.activeClass + " border" : "text-white/55 bg-transparent"
      }`}
    >
      {item.dotClass && (
        <span
          className={`w-2 h-2 rounded-full shrink-0 ${isActive ? "opacity-100" : "opacity-50"} ${item.dotClass}`}
        />
      )}
      {item.label}
    </Link>
  );
});

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const [scrollProgress, setScrollProgress] = useState(0);
  const isNewsDetailPage = location.pathname.startsWith("/news/");

  // 스크롤 감지 — rAF 기반 쓰로틀링으로 성능 최적화
  useEffect(() => {
    let ticking = false;
    const handler = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrolled(window.scrollY > 8);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  // 경로 변경 시 모바일 메뉴 자동 닫기
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // 상세 페이지 읽기 진행률 바
  useEffect(() => {
    if (!isNewsDetailPage) {
      setScrollProgress(0);
      return;
    }

    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const totalHeight =
            document.documentElement.scrollHeight - window.innerHeight;
          if (totalHeight > 0) {
            setScrollProgress((window.scrollY / totalHeight) * 100);
          } else {
            setScrollProgress(0);
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isNewsDetailPage, location.pathname]);

  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);
  const toggleMobileMenu = useCallback(() => setMobileMenuOpen((v) => !v), []);

  return (
    <>
      <header
        className={`sticky top-0 z-50 transition-all duration-300 font-sans border-b border-white/6 ${
          scrolled
            ? "bg-[#0E0C0A]/95 backdrop-blur-[20px] backdrop-saturate-[180%] shadow-[0_4px_32px_rgba(0,0,0,0.4)]"
            : "bg-[#0E0C0A]"
        }`}
      >
        {/* Date strip — 가독성 향상: 텍스트 명도 상향 */}
        <div className="border-b border-white/5 bg-white/[0.02]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-1.5 flex justify-between items-center">
            <span className="text-[10px] tracking-[0.2em] uppercase font-medium text-white/40">
              {todayStr}
            </span>
            <div className="hidden sm:flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black tracking-widest uppercase text-white/30">
                <span className="w-1 h-1 rounded-full bg-[#38BDF8] opacity-80" />
                AI 기반 뉴스 정보 플랫폼
              </span>
            </div>
          </div>
        </div>

        {/* Main bar */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex justify-between items-center gap-6">
          {/* Logo + Nav */}
          <div className="flex items-center gap-6 lg:gap-8">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group shrink-0" aria-label="뉴스 정보 나침반 홈">
              <div className="relative w-8 h-8 rounded-full border border-white/10 bg-white/5 flex items-center justify-center transition-all duration-300 group-hover:border-[#38BDF8]/40 group-hover:bg-[#38BDF8]/5">
                <svg
                  className="w-5 h-5 text-[#38BDF8] transition-transform duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:rotate-[360deg]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polygon points="12,4 15,12 12,10.5" fill="#38BDF8" stroke="#38BDF8" />
                  <polygon points="12,20 9,12 12,13.5" fill="#94A3B8" stroke="#94A3B8" />
                  <circle cx="12" cy="12" r="1" fill="#fff" />
                </svg>
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-white/35 text-[8px] tracking-[0.28em] uppercase mb-[3px]">
                  THE DAILY
                </span>
                <span className="font-serif text-[17px] font-black text-white tracking-[-0.02em] transition-colors duration-200">
                  뉴스 정보{" "}
                  <span className="text-[#38BDF8] [text-shadow:0_0_20px_rgba(56,189,248,0.4)]">
                    나침반
                  </span>
                </span>
              </div>
            </Link>

            {/* Navigation — desktop */}
            <nav className="hidden md:flex items-center gap-1" aria-label="주요 메뉴">
              {NAV_ITEMS.map((item) => (
                <NavItem
                  key={item.to}
                  item={item}
                  isActive={location.pathname === item.to}
                />
              ))}
            </nav>
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <button
              className="flex flex-col justify-center items-center gap-1.5 w-9 h-9 rounded-lg transition-all text-white/65 hover:text-white hover:bg-white/8"
              onClick={toggleMobileMenu}
              aria-label={mobileMenuOpen ? "메뉴 닫기" : "메뉴 열기"}
              aria-expanded={mobileMenuOpen}
            >
              <span
                className="block h-px w-5 rounded-full transition-all duration-250 bg-current"
                style={{
                  transformOrigin: "center",
                  transform: mobileMenuOpen
                    ? "translateY(5px) rotate(45deg)"
                    : "none",
                }}
              />
              <span
                className={`block h-px w-4 rounded-full transition-all duration-200 bg-current ${
                  mobileMenuOpen ? "opacity-0" : "opacity-100"
                }`}
              />
              <span
                className="block h-px w-5 rounded-full transition-all duration-250 bg-current"
                style={{
                  transformOrigin: "center",
                  transform: mobileMenuOpen
                    ? "translateY(-5px) rotate(-45deg)"
                    : "none",
                }}
              />
            </button>
          </div>
        </div>

        {/* Mobile nav dropdown */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ${
            mobileMenuOpen
              ? "max-h-[280px] border-t border-white/6"
              : "max-h-0 border-t-0"
          }`}
          aria-hidden={!mobileMenuOpen}
        >
          <nav className="px-4 py-4 flex flex-col gap-1" aria-label="모바일 메뉴">
            {NAV_ITEMS.map((item) => (
              <MobileNavItem
                key={item.to}
                item={item}
                isActive={location.pathname === item.to}
                onClick={closeMobileMenu}
              />
            ))}
          </nav>
        </div>

        {/* Reading progress bar for news detail pages */}
        {isNewsDetailPage && (
          <div
            className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-white/5 pointer-events-none"
            role="progressbar"
            aria-valuenow={Math.round(scrollProgress)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="읽기 진행률"
          >
            <div
              className="h-full bg-gradient-to-r from-[#38BDF8] via-[#FBBF24] to-[#38BDF8]"
              style={{
                width: `${scrollProgress}%`,
                transition: "width 60ms linear",
                willChange: "width",
              }}
            />
          </div>
        )}
      </header>
    </>
  );
}
