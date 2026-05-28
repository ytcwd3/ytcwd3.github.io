// 管理后台共享样式常量

export const CAT_RGBA: Record<string, string> = {
  pc: "var(--pc-android-rgb)",
  ns: "var(--nintendo-rgb)",
  handheld: "var(--nintendo-rgb)",
  console: "var(--nintendo-rgb)",
  sony: "var(--sony-rgb)",
  other: "var(--other-rgb)",
};

export const CAT_COLOR: Record<string, string> = {
  pc: "var(--color-pc-android)",
  ns: "var(--color-nintendo)",
  handheld: "var(--color-nintendo)",
  console: "var(--color-nintendo)",
  sony: "var(--color-sony)",
  other: "var(--color-other)",
};

export const PAGE_SIZE = 20;

export const GRADIENT: Record<string, string> = {
  pc: "linear-gradient(135deg, #f59e0b, #fbbf24)",
  ns: "linear-gradient(135deg, #e63946, #f472b6)",
  handheld: "linear-gradient(135deg, #e63946, #f472b6)",
  console: "linear-gradient(135deg, #e63946, #f472b6)",
  sony: "linear-gradient(135deg, #1d4ed8, #3b82f6)",
  other: "linear-gradient(135deg, #059669, #34d399)",
};

export const INPUT_STYLE = {
  width: "100%" as const,
  padding: "7px 10px",
  border: "1px solid var(--border-light)",
  borderRadius: "var(--radius-sm)",
  fontSize: "14px",
  background: "rgba(255,255,255,0.9)",
  color: "var(--text-primary)",
  transition: "all var(--transition-fast)",
  boxSizing: "border-box" as const,
};

export const LABEL_STYLE = {
  display: "block",
  marginBottom: "5px",
  fontSize: "13px",
  color: "var(--text-secondary)",
  fontWeight: 500,
};

export const CARD_STYLE = {
  background: "rgba(255,255,255,0.85)",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  borderRadius: "var(--radius-md)",
  padding: "20px",
  boxShadow: "var(--shadow-md)",
  border: "1px solid rgba(255,255,255,0.6)",
  marginBottom: "20px",
};

export const CARD_STYLE_SM = {
  background: "rgba(255,255,255,0.85)",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  borderRadius: "var(--radius-md)",
  padding: "12px 16px",
  boxShadow: "var(--shadow-md)",
  border: "1px solid rgba(255,255,255,0.6)",
  marginBottom: "16px",
};
