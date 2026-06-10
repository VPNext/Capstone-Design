import { memo, useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

type NewsSearchBarVariant = "main" | "analyzed";

interface NewsSearchBarProps {
  className?: string;
  variant?: NewsSearchBarVariant;
  placeholder?: string;
}

const VARIANT_STYLES: Record<
  NewsSearchBarVariant,
  { wrapper: string; input: string; button: string; clear: string }
> = {
  main: {
    wrapper:
      "bg-white border-[#E4DDD3] shadow-[0_2px_12px_rgba(22,19,17,0.06)] focus-within:border-[#C13026]/40 focus-within:shadow-[0_4px_20px_rgba(193,48,38,0.1)]",
    input: "text-[#161311] placeholder:text-[#9C9891]",
    button: "bg-[#161311] hover:bg-[#C13026] text-white",
    clear: "text-[#9C9891] hover:text-[#161311] hover:bg-[#F3F0EB]",
  },
  analyzed: {
    wrapper:
      "bg-white border-[#D4DCE8] shadow-[0_2px_12px_rgba(12,31,63,0.06)] focus-within:border-[#1A55A8]/40 focus-within:shadow-[0_4px_20px_rgba(26,85,168,0.1)]",
    input: "text-[#161311] placeholder:text-[#9C9891]",
    button: "bg-[#0C1F3F] hover:bg-[#1A55A8] text-white",
    clear: "text-[#9C9891] hover:text-[#0C1F3F] hover:bg-[#EEF2F8]",
  },
};

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.5}
        d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
      />
    </svg>
  );
}

function NewsSearchBar({
  className = "",
  variant = "main",
  placeholder = "뉴스 검색",
}: NewsSearchBarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const urlKeyword = searchParams.get("q") || "";
  const [input, setInput] = useState(urlKeyword);

  const targetPath = location.pathname === "/analyzed" ? "/analyzed" : "/";

  useEffect(() => {
    setInput(urlKeyword);
  }, [urlKeyword]);

  const submit = useCallback(() => {
    const trimmed = input.trim();
    navigate(
      trimmed ? `${targetPath}?q=${encodeURIComponent(trimmed)}` : targetPath,
    );
  }, [input, navigate, targetPath]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        submit();
      }
      if (e.key === "Escape") {
        setInput("");
        navigate(targetPath);
      }
    },
    [submit, navigate, targetPath],
  );

  const clear = useCallback(() => {
    setInput("");
    navigate(targetPath);
  }, [navigate, targetPath]);

  const styles = VARIANT_STYLES[variant];

  return (
    <form
      className={`flex items-center gap-2 rounded-2xl border px-3 py-2 transition-all duration-200 ${styles.wrapper} ${className}`}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      role="search"
      aria-label="뉴스 검색"
    >
      <SearchIcon className="w-4 h-4 shrink-0 text-[#9C9891]" />
      <input
        type="search"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`flex-1 min-w-0 bg-transparent text-sm font-medium outline-none ${styles.input}`}
        aria-label="검색어 입력"
      />
      {input.length > 0 && (
        <button
          type="button"
          onClick={clear}
          className={`flex items-center justify-center w-7 h-7 rounded-full transition-colors shrink-0 ${styles.clear}`}
          aria-label="검색어 지우기"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
      <button
        type="submit"
        className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-black transition-colors duration-200 ${styles.button}`}
      >
        검색
      </button>
    </form>
  );
}

export default memo(NewsSearchBar);
