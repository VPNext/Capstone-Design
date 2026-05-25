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

  // Close mobile menu on route change
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
      activeColor: "#ffffff",
      activeBg: "rgba(255,255,255,0.12)",
      dot: null,
    },
    {
      to: "/analyzed",
      label: "AI 분석 뉴스",
      activeColor: "#38BDF8",
      activeBg: "rgba(56,189,248,0.1)",
      dot: "#38BDF8",
    },
    {
      to: "/cartoons",
      label: "AI 만화",
      activeColor: "#FBBF24",
      activeBg: "rgba(251,191,36,0.1)",
      dot: "#FBBF24",
    },
  ];

  return (
    <>
      <header
        className="sticky top-0 z-50"
        style={{
          background: scrolled ? "rgba(14, 12, 10, 0.92)" : "#0E0C0A",
          backdropFilter: scrolled ? "blur(20px) saturate(180%)" : "none",
          WebkitBackdropFilter: scrolled ? "blur(20px) saturate(180%)" : "none",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          boxShadow: scrolled ? "0 4px 32px rgba(0,0,0,0.4)" : "none",
          transition: "box-shadow 0.35s ease, background 0.35s ease",
          fontFamily: "'Noto Sans KR', sans-serif",
        }}
      >
        {/* ── Date strip ── */}
        <div
          style={{
            borderBottom: "1px solid rgba(255,255,255,0.05)",
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2 flex justify-between items-center">
            <span
              className="text-[10px] tracking-[0.22em] uppercase font-medium"
              style={{ color: "rgba(255,255,255,0.22)" }}
            >
              {todayStr}
            </span>
            <div className="hidden sm:flex items-center gap-3">
              <span
                className="inline-flex items-center gap-1.5 text-[10px] font-black tracking-widest uppercase"
                style={{ color: "rgba(255,255,255,0.2)" }}
              >
                <span
                  className="w-1 h-1 rounded-full"
                  style={{ background: "#38BDF8", opacity: 0.7 }}
                />
                AI 기반 뉴스 정보 플랫폼
              </span>
            </div>
          </div>
        </div>

        {/* ── Main bar ── */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex justify-between items-center gap-6">
          {/* Logo + Nav */}
          <div className="flex items-center gap-8">
            {/* Logo */}
            <Link to="/" className="flex flex-col leading-none group shrink-0">
              <span
                className="font-medium"
                style={{
                  color: "rgba(255,255,255,0.28)",
                  fontSize: "8px",
                  letterSpacing: "0.28em",
                  textTransform: "uppercase",
                  marginBottom: "3px",
                }}
              >
                THE DAILY
              </span>
              <span
                className="flex items-center gap-1.5"
                style={{
                  fontFamily: "'Noto Serif KR', serif",
                  fontSize: "17px",
                  fontWeight: 900,
                  color: "#ffffff",
                  letterSpacing: "-0.02em",
                  transition: "color 0.2s",
                }}
              >
                뉴스 정보
                <span
                  style={{
                    color: "#38BDF8",
                    textShadow: "0 0 20px rgba(56,189,248,0.4)",
                  }}
                >
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
                    className="relative flex items-center gap-1.5 text-sm font-bold px-3.5 py-2 rounded-full transition-all duration-250"
                    style={{
                      color: isActive
                        ? item.activeColor
                        : "rgba(255,255,255,0.45)",
                      background: isActive ? item.activeBg : "transparent",
                      border: isActive
                        ? `1px solid ${item.activeColor}20`
                        : "1px solid transparent",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.color = "#fff";
                        (e.currentTarget as HTMLElement).style.background =
                          "rgba(255,255,255,0.06)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.color =
                          "rgba(255,255,255,0.45)";
                        (e.currentTarget as HTMLElement).style.background =
                          "transparent";
                      }
                    }}
                  >
                    {item.dot && (
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{
                          background: item.dot,
                          boxShadow: isActive ? `0 0 6px ${item.dot}` : "none",
                          opacity: isActive ? 1 : 0.5,
                        }}
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
                <div
                  className="flex items-center gap-2.5 rounded-full px-4 py-2.5"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.18)",
                    width: "270px",
                    backdropFilter: "blur(12px)",
                    transition: "width 0.3s ease",
                  }}
                >
                  <svg
                    className="w-3.5 h-3.5 shrink-0"
                    style={{ color: "rgba(255,255,255,0.35)" }}
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
                    className="flex-1 bg-transparent text-sm outline-none"
                    style={{ color: "#ffffff" }}
                  />
                  <button
                    onClick={() => {
                      setSearchOpen(false);
                      setKeyword("");
                    }}
                    className="flex items-center justify-center w-5 h-5 rounded-full transition-all"
                    style={{ color: "rgba(255,255,255,0.3)" }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.color = "#fff";
                      (e.currentTarget as HTMLElement).style.background =
                        "rgba(255,255,255,0.1)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.color =
                        "rgba(255,255,255,0.3)";
                      (e.currentTarget as HTMLElement).style.background =
                        "transparent";
                    }}
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setSearchOpen(true)}
                  className="flex items-center gap-2 text-sm font-semibold px-3.5 py-2 rounded-full transition-all duration-200"
                  style={{
                    color: "rgba(255,255,255,0.4)",
                    border: "1px solid transparent",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.color = "#fff";
                    (e.currentTarget as HTMLElement).style.background =
                      "rgba(255,255,255,0.07)";
                    (e.currentTarget as HTMLElement).style.borderColor =
                      "rgba(255,255,255,0.1)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.color =
                      "rgba(255,255,255,0.4)";
                    (e.currentTarget as HTMLElement).style.background =
                      "transparent";
                    (e.currentTarget as HTMLElement).style.borderColor =
                      "transparent";
                  }}
                >
                  <svg
                    className="w-4 h-4"
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
                  검색
                </button>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden flex flex-col justify-center items-center gap-1.5 w-9 h-9 rounded-lg transition-all"
              onClick={() => setMobileMenuOpen((v) => !v)}
              style={{ color: "rgba(255,255,255,0.55)" }}
            >
              <span
                className="block h-px w-5 rounded-full transition-all duration-300"
                style={{
                  background: "currentColor",
                  transformOrigin: "center",
                  transform: mobileMenuOpen
                    ? "translateY(5px) rotate(45deg)"
                    : "none",
                }}
              />
              <span
                className="block h-px w-4 rounded-full transition-all duration-200"
                style={{
                  background: "currentColor",
                  opacity: mobileMenuOpen ? 0 : 1,
                }}
              />
              <span
                className="block h-px w-5 rounded-full transition-all duration-300"
                style={{
                  background: "currentColor",
                  transformOrigin: "center",
                  transform: mobileMenuOpen
                    ? "translateY(-5px) rotate(-45deg)"
                    : "none",
                }}
              />
            </button>
          </div>
        </div>

        {/* ── Mobile nav dropdown ── */}
        <div
          className="md:hidden overflow-hidden transition-all duration-300"
          style={{
            maxHeight: mobileMenuOpen ? "280px" : "0",
            borderTop: mobileMenuOpen
              ? "1px solid rgba(255,255,255,0.06)"
              : "none",
          }}
        >
          <div className="px-4 py-4 flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all"
                  style={{
                    color: isActive
                      ? item.activeColor
                      : "rgba(255,255,255,0.5)",
                    background: isActive ? item.activeBg : "transparent",
                  }}
                >
                  {item.dot && (
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: item.dot }}
                    />
                  )}
                  {item.label}
                </Link>
              );
            })}

            {/* Mobile search */}
            <div
              className="flex items-center gap-2.5 mt-3 rounded-xl px-4 py-3"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <svg
                className="w-4 h-4 shrink-0"
                style={{ color: "rgba(255,255,255,0.3)" }}
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
                className="flex-1 bg-transparent text-sm outline-none font-medium"
                style={{ color: "#fff" }}
              />
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
