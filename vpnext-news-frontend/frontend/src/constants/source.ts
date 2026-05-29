export const SOURCE_NAME_MAP: Record<string, string> = {
  hani: "한겨레",
  mk: "매일경제",
  donga: "동아일보",
  yonhap: "연합뉴스",
  sbs: "SBS",
  chosun: "조선일보",
  kmib: "국민일보",
  naver: "네이버 뉴스",
  khan: "경향신문",
  hankyung: "한국경제",
};

export const SOURCE_BADGE_CLASS: Record<string, string> = {
  hani: "bg-[#d11b1b] text-white",
  naver: "bg-[#03c75a] text-white",
  khan: "bg-[#1b5ac9] text-white",
  donga: "bg-[#6b1fc7] text-white",
  sbs: "bg-[#c41515] text-white",
  hankyung: "bg-[#0b7a7a] text-white",
  mk: "bg-[#3d12c7] text-white",
  yonhap: "bg-[#525252] text-white",
  chosun: "bg-[#002f5a] text-white",
  kmib: "bg-[#0b5c9c] text-white",
};

export const SOURCE_BADGE_CLASS_KO: Record<string, string> = {
  한겨레: "bg-[#d11b1b] text-white",
  "네이버 뉴스": "bg-[#03c75a] text-white",
  경향신문: "bg-[#1b5ac9] text-white",
  동아일보: "bg-[#6b1fc7] text-white",
  SBS: "bg-[#c41515] text-white",
  한국경제: "bg-[#0b7a7a] text-white",
  매일경제: "bg-[#3d12c7] text-white",
  연합뉴스: "bg-[#525252] text-white",
  조선일보: "bg-[#002f5a] text-white",
  국민일보: "bg-[#0b5c9c] text-white",
};

export const SOURCES = ["전체", ...Object.values(SOURCE_NAME_MAP)];
