import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";

export default function Header() {
  const [keyword, setKeyword] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleSearch = () => {
    const trimmed = keyword.trim();
    if (!trimmed) return;
    navigate(`/?q=${encodeURIComponent(trimmed)}`);
    setSearchOpen(false);
    setKeyword("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSearch();
    if (e.key === "Escape") {
      setSearchOpen(false);
      setKeyword("");
    }
  };

  const todayStr = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  const navItems = [
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

  return (
    <>
      <header
        className={`sticky top-0 z-50 transition-all duration-300 font-sans border-b border-white/6 ${
          scrolled
            ? "bg-[#0E0C0A]/92 backdrop-blur-[20px] backdrop-saturate-[180%] shadow-[0_4px_32px_rgba(0,0,0,0.4)]"
            : "bg-[#0E0C0A]"
        }`}
      >
        {/* Date strip */}
        <div className="border-b border-white/5 bg-white/[0.02]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2 flex justify-between items-center">
            <span className="text-[10px] tracking-[0.22em] uppercase font-medium text-white/22">
              {todayStr}
            </span>
            <div className="hidden sm:flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black tracking-widest uppercase text-white/20">
                <span className="w-1 h-1 rounded-full bg-[#38BDF8] opacity-70" />
                AI 기반 뉴스 정보 플랫폼
              </span>
            </div>
          </div>
        </div>

        {/* Main bar */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex justify-between items-center gap-6">
          {/* Logo + Nav */}
          <div className="flex items-center gap-8">
            {/* Logo */}
            <Link to="/" className="flex flex-col leading-none group shrink-0">
              <span className="text-white/28 text-[8px] tracking-[0.28em] uppercase mb-[3px]">
                THE DAILY
              </span>
              <span className="font-serif text-[17px] font-black text-white tracking-[-0.02em] transition-colors duration-200">
                뉴스 정보{" "}
                <span className="text-[#38BDF8] [text-shadow:0_0_20px_rgba(56,189,248,0.4)]">
                  나침반
                </span>
              </span>
            </Link>

            {/* Navigation — desktop */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`relative flex items-center gap-1.5 text-sm font-bold px-3.5 py-2 rounded-full transition-all duration-250 hover:text-white hover:bg-white/6 ${
                      isActive
                        ? `${item.activeClass} border`
                        : "text-white/45 border border-transparent"
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
              })}
            </nav>
          </div>

          {/* Right side: search + mobile menu toggle */}
          <div className="flex items-center gap-2">
            {/* Search — desktop */}
            <div className="hidden sm:flex items-center">
              {searchOpen ? (
                <div className="flex items-center gap-2.5 rounded-full px-4 py-2.5 bg-white/8 border border-white/18 w-[270px] backdrop-blur-[12px] transition-all duration-300">
                  <svg
                    className="w-3.5 h-3.5 shrink-0 text-white/35"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                    />
                  </svg>
                  <input
                    autoFocus
                    type="text"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="키워드 검색..."
                    className="flex-1 bg-transparent text-sm outline-none text-white"
                  />
                  <button
                    onClick={() => {
                      setSearchOpen(false);
                      setKeyword("");
                    }}
                    className="flex items-center justify-center w-5 h-5 rounded-full transition-all text-white/30 hover:text-white hover:bg-white/10"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setSearchOpen(true)}
                  className="flex items-center gap-2 text-sm font-semibold px-3.5 py-2 rounded-full transition-all duration-200 text-white/40 hover:text-white hover:bg-white/7 border border-transparent hover:border-white/10"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                    />
                  </svg>
                  검색
                </button>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden flex flex-col justify-center items-center gap-1.5 w-9 h-9 rounded-lg transition-all text-white/55"
              onClick={() => setMobileMenuOpen((v) => !v)}
            >
              <span
                className="block h-px w-5 rounded-full transition-all duration-300 bg-current"
                style={{
                  transformOrigin: "center",
                  transform: mobileMenuOpen ? "translateY(5px) rotate(45deg)" : "none",
                }}
              />
              <span
                className={`block h-px w-4 rounded-full transition-all duration-200 bg-current ${
                  mobileMenuOpen ? "opacity-0" : "opacity-100"
                }`}
              />
              <span
                className="block h-px w-5 rounded-full transition-all duration-300 bg-current"
                style={{
                  transformOrigin: "center",
                  transform: mobileMenuOpen ? "translateY(-5px) rotate(-45deg)" : "none",
                }}
              />
            </button>
          </div>
        </div>

        {/* Mobile nav dropdown */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ${
            mobileMenuOpen ? "max-h-[280px] border-t border-white/6" : "max-h-0 border-t-0"
          }`}
        >
          <div className="px-4 py-4 flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                    isActive ? item.activeClass : "text-white/50 bg-transparent"
                  }`}
                >
                  {item.dotClass && (
                    <span className={`w-2 h-2 rounded-full shrink-0 ${isActive ? "opacity-100" : "opacity-50"} ${item.dotClass}`} />
                  )}
                  {item.label}
                </Link>
              );
            })}

            {/* Mobile search */}
            <div className="flex items-center gap-2.5 mt-3 rounded-xl px-4 py-3 bg-white/6 border border-white/8">
              <svg
                className="w-4 h-4 shrink-0 text-white/30"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                />
              </svg>
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="키워드 검색..."
                className="flex-1 bg-transparent text-sm outline-none font-medium text-white"
              />
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
