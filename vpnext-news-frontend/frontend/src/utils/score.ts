export interface ScoreColor {
  text: string;
  bg: string;
  border: string;
  hex: string;
  bgHex: string;
}

export const getScoreColor = (score: number): ScoreColor => {
  if (score >= 0.7) {
    return {
      text: "text-emerald-700",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      hex: "#10B981",
      bgHex: "#ECFDF5",
    };
  }
  if (score >= 0.4) {
    return {
      text: "text-amber-700",
      bg: "bg-amber-50",
      border: "border-amber-200",
      hex: "#F59E0B",
      bgHex: "#FFFBEB",
    };
  }
  return {
    text: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
    hex: "#EF4444",
    bgHex: "#FEF2F2",
  };
};
