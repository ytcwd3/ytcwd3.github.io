import { supabase } from "./supabase";

export type HomeCategory = {
  name: string;
  tags: string[];
};

export const HOME_CATEGORY_CONFIG_NAME = "__home_categories__";

export const DEFAULT_HOME_CATEGORIES: HomeCategory[] = [
  {
    name: "任天堂",
    tags: [
      "NS",
      "NS乙女",
      "GBA",
      "NDS",
      "3DS",
      "GB",
      "GBC",
      "Wii",
      "NGC",
      "Wii U",
      "FC",
      "N64",
      "SFC",
    ],
  },
  { name: "索尼", tags: ["PS2", "PS3", "PS1", "PSP", "PS Vita", "PS4"] },
  {
    name: "其他平台",
    tags: [
      "MD",
      "SS",
      "DC",
      "Xbox",
      "街机",
      "Neogeo",
      "DOS",
      "文曲星",
      "步步高电子词典",
      "JAVA",
      "J2ME（诺基亚时代java）",
      "安卓",
    ],
  },
  {
    name: "PC及安卓",
    tags: [
      "必备软件",
      "各种合集",
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
      "网游单机",
    ],
  },
];

function normalizeHomeCategories(value: unknown): HomeCategory[] {
  if (!Array.isArray(value)) return DEFAULT_HOME_CATEGORIES;

  const normalized = value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const name = String(record.name || "").trim();
      const tags = Array.isArray(record.tags)
        ? record.tags
            .map((tag) => String(tag || "").trim())
            .filter(Boolean)
        : [];

      if (!name) return null;
      return { name, tags };
    })
    .filter(Boolean) as HomeCategory[];

  return normalized.length > 0 ? normalized : DEFAULT_HOME_CATEGORIES;
}

export function parseHomeCategories(value: string | null | undefined) {
  if (!value) return DEFAULT_HOME_CATEGORIES;

  try {
    return normalizeHomeCategories(JSON.parse(value));
  } catch {
    return DEFAULT_HOME_CATEGORIES;
  }
}

export async function fetchHomeCategories() {
  const { data, error } = await supabase
    .from("site_links")
    .select("url")
    .eq("name", HOME_CATEGORY_CONFIG_NAME)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("加载首页分类配置失败:", error);
    return DEFAULT_HOME_CATEGORIES;
  }

  return parseHomeCategories(data?.url);
}

export async function saveHomeCategories(categories: HomeCategory[]) {
  const normalized = normalizeHomeCategories(categories);
  const payload = JSON.stringify(normalized);

  const { data, error } = await supabase
    .from("site_links")
    .select("id")
    .eq("name", HOME_CATEGORY_CONFIG_NAME)
    .limit(1);

  if (error) throw error;

  if (data && data.length > 0) {
    const { error: updateError } = await supabase
      .from("site_links")
      .update({ url: payload, type: "help" })
      .eq("id", data[0].id);
    if (updateError) throw updateError;
    return normalized;
  }

  const { error: insertError } = await supabase.from("site_links").insert({
    name: HOME_CATEGORY_CONFIG_NAME,
    url: payload,
    type: "help",
  });
  if (insertError) throw insertError;

  return normalized;
}
