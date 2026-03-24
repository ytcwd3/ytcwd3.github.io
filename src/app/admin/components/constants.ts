// 管理后台共享常量

export const CATEGORY_SUBCATEGORIES: Record<string, string[]> = {
  pc: [
    "必备软件",
    "各种合集",
    "网游单机",
    "横版过关",
    "平台跳跃",
    "战棋策略",
    "RPG",
    "双人",
    "射击",
    "动作",
    "经营",
    "魂类",
    "竞速运动",
    "潜行",
    "解谜",
    "格斗无双",
    "恐怖",
    "不正经",
    "小游戏",
    "修改器金手指",
    "互动影游",
  ],
  ns: ["NS", "NS乙女"],
  handheld: ["3DS", "NDS", "GBA", "GB", "GBC"],
  console: ["Wii U", "NGC", "Wii", "N64", "SFC", "FC"],
  sony: ["PSP", "PS2", "PS3", "PS Vita", "PS1", "PS4"],
  other: [
    "MD",
    "SS",
    "DC",
    "步步高电子词典",
    "街机",
    "Xbox",
    "JAVA",
    "Neogeo",
    "DOS",
    "文曲星",
    "J2ME（诺基亚时代java）",
    "安卓",
  ],
};

export const CATEGORY_DB_VALUE: Record<string, string> = {
  pc: "PC",
  ns: "NS",
  handheld: "任天堂掌机",
  console: "任天堂主机",
  sony: "索尼",
  other: "Ohter",
};

export const DB_TO_UI_KEY: Record<string, string> = {
  PC: "pc",
  NS: "ns",
  任天堂掌机: "handheld",
  任天堂主机: "console",
  索尼: "sony",
  Ohter: "other",
};

export const CATEGORY_NAMES: Record<string, string> = {
  pc: "PC",
  ns: "NS",
  handheld: "任天堂掌机",
  console: "任天堂主机",
  sony: "索尼",
  other: "Other",
};

export const CATEGORY_DISPLAY: Record<string, string> = {
  pc: "PC",
  ns: "NS",
  handheld: "任天堂掌机",
  console: "任天堂主机",
  sony: "索尼",
  other: "Other",
};

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

// Excel 导入映射
export const SHEET_DB_CAT: Record<string, string> = {
  PC: "PC",
  NS: "NS",
  任天堂掌机: "任天堂掌机",
  任天堂主机: "任天堂主机",
  索尼: "索尼",
  other: "Ohter",
};

export const UI_CAT_TO_DB: Record<string, string> = {
  PC: "PC",
  NS: "NS",
  PC及安卓: "PC",
  索尼: "索尼",
  其他平台: "Ohter",
  任天堂: "NS",
};

export const SUBCAT_TO_DB_CAT: Record<string, string> = {
  NS: "NS",
  NS乙女: "NS",
  GBA: "任天堂掌机",
  NDS: "任天堂掌机",
  "3DS": "任天堂掌机",
  GB: "任天堂掌机",
  GBC: "任天堂掌机",
  FC: "任天堂主机",
  SFC: "任天堂主机",
  N64: "任天堂主机",
  NGC: "任天堂主机",
  Wii: "任天堂主机",
  "Wii U": "任天堂主机",
};

export const NS_DEFAULT_SUBCAT = ["NS"];

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
