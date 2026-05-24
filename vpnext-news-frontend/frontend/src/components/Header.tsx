import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";

export default function Header() {
  const [keyword, setKeyword] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

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

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled ? "shadow-[0_2px_24px_rgba(22,19,17,0.2)]" : ""
      }`}
      style={{
        background: "#141210",
        fontFamily: "'Noto Sans KR', sans-serif",
      }}
    >
      {/* ─── Date strip ──────────────────────────── */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-1.5 flex justify-between items-center">
          <span
            className="text-[10px] tracking-widest uppercase font-medium"
            style={{ color: "rgba(255,255,255,0.28)" }}
          >
            {todayStr}
          </span>
          <span
            className="text-[10px] hidden sm:block"
            style={{ color: "rgba(255,255,255,0.28)" }}
          >
            AI 기반 뉴스 정보 플랫폼
          </span>
        </div>
      </div>

      {/* ─── Main bar ────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex justify-between items-center gap-6">
        {/* Logo + Nav */}
        <div className="flex items-center gap-6 sm:gap-8">
          <Link to="/" className="flex flex-col leading-none group">
            <span
              className="font-medium"
              style={{
                color: "rgba(255,255,255,0.35)",
                fontSize: "9px",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                marginBottom: "2px",
              }}
            >
              THE DAILY
            </span>
            <span
              className="font-black tracking-tight transition-colors duration-200 group-hover:text-amber-300"
              style={{
                fontFamily: "'Noto Serif KR', serif",
                fontSize: "18px",
                color: "#ffffff",
              }}
            >
              뉴스 정보 <span style={{ color: "#38BDF8" }}>나침반</span>
            </span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              to="/"
              className="transition-all duration-200 text-sm font-bold px-3.5 py-2 rounded-full"
              style={
                location.pathname === "/"
                  ? { background: "#ffffff", color: "#141210" }
                  : { color: "rgba(255,255,255,0.55)" }
              }
              onMouseEnter={(e) => {
                if (location.pathname !== "/") {
                  (e.currentTarget as HTMLElement).style.color = "#fff";
                  (e.currentTarget as HTMLElement).style.background =
                    "rgba(255,255,255,0.1)";
                }
              }}
              onMouseLeave={(e) => {
                if (location.pathname !== "/") {
                  (e.currentTarget as HTMLElement).style.color =
                    "rgba(255,255,255,0.55)";
                  (e.currentTarget as HTMLElement).style.background =
                    "transparent";
                }
              }}
            >
              홈
            </Link>
            <Link
              to="/analyzed"
              className="transition-all duration-200 text-sm font-bold px-3.5 py-2 rounded-full flex items-center gap-1.5"
              style={
                location.pathname === "/analyzed"
                  ? { background: "#38BDF8", color: "#0C1F3F" }
                  : { color: "rgba(255,255,255,0.55)" }
              }
              onMouseEnter={(e) => {
                if (location.pathname !== "/analyzed") {
                  (e.currentTarget as HTMLElement).style.color = "#fff";
                  (e.currentTarget as HTMLElement).style.background =
                    "rgba(255,255,255,0.1)";
                }
              }}
              onMouseLeave={(e) => {
                if (location.pathname !== "/analyzed") {
                  (e.currentTarget as HTMLElement).style.color =
                    "rgba(255,255,255,0.55)";
                  (e.currentTarget as HTMLElement).style.background =
                    "transparent";
                }
              }}
            >
              AI 분석 뉴스
            </Link>
            <Link
              to="/cartoons"
              className="transition-all duration-200 text-sm font-bold px-3.5 py-2 rounded-full flex items-center gap-1.5"
              style={
                location.pathname === "/cartoons"
                  ? { background: "#FBBF24", color: "#141210" }
                  : { color: "rgba(255,255,255,0.55)" }
              }
              onMouseEnter={(e) => {
                if (location.pathname !== "/cartoons") {
                  (e.currentTarget as HTMLElement).style.color = "#fff";
                  (e.currentTarget as HTMLElement).style.background =
                    "rgba(255,255,255,0.1)";
                }
              }}
              onMouseLeave={(e) => {
                if (location.pathname !== "/cartoons") {
                  (e.currentTarget as HTMLElement).style.color =
                    "rgba(255,255,255,0.55)";
                  (e.currentTarget as HTMLElement).style.background =
                    "transparent";
                }
              }}
            >
              AI 만화
            </Link>
          </nav>
        </div>

        {/* Search */}
        <div className="hidden sm:flex items-center">
          {searchOpen ? (
            <div
              className="flex items-center gap-2 rounded-full px-4 py-2 transition-all"
              style={{
                background: "rgba(255,255,255,0.12)",
                backdropFilter: "blur(16px)",
                width: "260px",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            >
              <svg
                className="w-3.5 h-3.5 shrink-0"
                style={{ color: "rgba(255,255,255,0.4)" }}
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
                className="text-xl leading-none transition-colors"
                style={{ color: "rgba(255,255,255,0.35)" }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLElement).style.color = "#fff")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLElement).style.color =
                    "rgba(255,255,255,0.35)")
                }
              >
                ×
              </button>
            </div>
          ) : (
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 text-sm font-semibold px-3.5 py-2 rounded-full transition-all duration-200"
              style={{ color: "rgba(255,255,255,0.5)" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.color = "#fff";
                (e.currentTarget as HTMLElement).style.background =
                  "rgba(255,255,255,0.1)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color =
                  "rgba(255,255,255,0.5)";
                (e.currentTarget as HTMLElement).style.background =
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
      </div>
    </header>
  );
}
