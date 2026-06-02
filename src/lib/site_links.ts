import { supabase } from "./supabase";

const PIN_PRIORITY_PREFIX = "__pin_order__:";
let pinPriorityCache: Record<number, number> | null = null;
const SITE_LINKS_CACHE_DURATION = 5 * 60 * 1000;
const siteLinksCache = new Map<string, { data: SiteLink[]; timestamp: number }>();

export const DEFAULT_MASCOT_MESSAGES = [
  "嗨~我是仓鼠君！有什么游戏找不到吗？",
  "试试点击分类标签哦~ 游戏都在里面呢！",
  "缺游戏？去B站或QQ群找我呀~",
  "这个搜索超好用的，不信你试试？",
  "嘿嘿，看我看我！我超可爱的！",
  "模拟器、固件、金手指...都在置顶词条里！",
  "找不到想要的？加群问问说不定有惊喜~",
  "今天的你也玩游戏玩得很开心吧！",
  "点我点我！我还可以说很多话哦~",
  "有任何问题都可以问我...才怪，我是只仓鼠啦！",
  "欢迎来到单游仓鼠！这里有你想要的游戏~",
  "鼠标点点点~ 好玩的游戏在前面等着你！",
];

// site_links 链接管理
// 存放站点可配置链接、工具入口和帮助入口。
export interface SiteLink {
  id: number;
  type: "tool" | "help" | "mascot";
  name: string;
  url: string;
  created_at?: string;
}

// site_links 中用于保存置顶顺序的虚拟记录结构。
type PinPriorityRow = {
  id?: number;
  name: string;
  url: string;
  type?: "tool" | "help" | "mascot";
};

// 用游戏 ID 生成 site_links.name 的存储键。
function getPinPriorityName(gameId: number) {
  return `${PIN_PRIORITY_PREFIX}${gameId}`;
}

function isInternalSiteLink(row: Pick<SiteLink, "name">) {
  return String(row.name || "").startsWith("__");
}

function getSiteLinksCacheKey(type: string) {
  return type || "all";
}

function readSiteLinksSessionCache(type: string) {
  try {
    const cached = sessionStorage.getItem(`siteLinks:${type}`);
    if (!cached) return null;
    const parsed = JSON.parse(cached) as { data: SiteLink[]; timestamp: number };
    return parsed;
  } catch {
    return null;
  }
}

function writeSiteLinksSessionCache(type: string, value: { data: SiteLink[]; timestamp: number }) {
  try {
    sessionStorage.setItem(`siteLinks:${type}`, JSON.stringify(value));
  } catch {
    // Ignore storage failures.
  }
}

export function clearSiteLinksCache() {
  pinPriorityCache = null;
  siteLinksCache.clear();
  try {
    sessionStorage.removeItem("siteLinks:tool");
    sessionStorage.removeItem("siteLinks:help");
    sessionStorage.removeItem("siteLinks:mascot");
    sessionStorage.removeItem("siteLinks:pin-priority");
    sessionStorage.removeItem("siteLinks:all");
  } catch {
    // Ignore storage failures.
  }
}

async function fetchSiteLinksFromApi(type: string): Promise<SiteLink[]> {
  const key = getSiteLinksCacheKey(type);
  const now = Date.now();

  const cached = siteLinksCache.get(key);
  if (cached && now - cached.timestamp < SITE_LINKS_CACHE_DURATION) {
    return cached.data;
  }

  const sessionCached = readSiteLinksSessionCache(key);
  if (sessionCached && now - sessionCached.timestamp < SITE_LINKS_CACHE_DURATION) {
    siteLinksCache.set(key, sessionCached);
    return sessionCached.data;
  }

  const response = await fetch(`/api/site-links?type=${encodeURIComponent(type)}`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Site links API error: ${response.status}`);
  }

  const data = ((await response.json()) as SiteLink[]).filter(
    (row) => !isInternalSiteLink(row),
  );
  const entry = { data, timestamp: now };
  siteLinksCache.set(key, entry);
  writeSiteLinksSessionCache(key, entry);
  return data;
}

// 把 site_links.url 中保存的顺序值解析为非负整数。
export function parsePinPriority(value: string | number | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }
  const parsed = Number(String(value ?? "").trim());
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.floor(parsed));
}

// 从 site_links 读取所有置顶优先级。
export async function fetchPinPriorityMap() {
  if (pinPriorityCache) return pinPriorityCache;

  let data: SiteLink[];
  try {
    data = await fetchSiteLinksFromApi("pin-priority");
  } catch (error) {
    console.error("加载置顶优先级失败:", error);
    const fallback = await supabase
      .from("site_links")
      .select("name, url")
      .like("name", `${PIN_PRIORITY_PREFIX}%`);
    if (fallback.error) {
      console.error("回退加载置顶优先级失败:", fallback.error);
      return {} as Record<number, number>;
    }
    data = (fallback.data || []) as SiteLink[];
  }

  const map: Record<number, number> = {};
  for (const row of data as PinPriorityRow[]) {
    const id = Number(row.name.slice(PIN_PRIORITY_PREFIX.length));
    if (!Number.isInteger(id) || id <= 0) continue;
    map[id] = parsePinPriority(row.url);
  }
  pinPriorityCache = map;
  return map;
}

export async function fetchSiteLinksByType(type: SiteLink["type"]) {
  try {
    return await fetchSiteLinksFromApi(type);
  } catch (error) {
    console.error(`加载 ${type} 链接失败:`, error);
    const query = supabase
      .from("site_links")
      .select("id, type, name, url, created_at")
      .eq("type", type)
      .not("name", "like", `${PIN_PRIORITY_PREFIX}%`)
      .order("id", { ascending: true });
    const { data, error: fallbackError } = await query;
    if (fallbackError) {
      console.error(`回退加载 ${type} 链接失败:`, fallbackError);
      return [] as SiteLink[];
    }
    return ((data || []) as SiteLink[]).filter((row) => !isInternalSiteLink(row));
  }
}

// 写入或删除 site_links 中的置顶优先级记录。
export async function savePinPriority(
  gameId: number,
  pinned: boolean,
  priority: number,
) {
  const name = getPinPriorityName(gameId);
  clearSiteLinksCache();

  if (!pinned) {
    const { error } = await supabase
      .from("site_links")
      .delete()
      .eq("name", name);
    if (error) throw error;
    return;
  }

  const normalizedPriority = parsePinPriority(priority);
  const { data, error } = await supabase
    .from("site_links")
    .select("id")
    .eq("name", name)
    .limit(1);

  if (error) throw error;

  if (data && data.length > 0) {
    const { error: updateError } = await supabase
      .from("site_links")
      .update({ url: String(normalizedPriority), type: "help" })
      .eq("id", data[0].id);
    if (updateError) throw updateError;
    return;
  }

  const { error: insertError } = await supabase.from("site_links").insert({
    name,
    url: String(normalizedPriority),
    type: "help",
  });
  if (insertError) throw insertError;
}

export async function ensureDefaultMascotMessages() {
  const { data, error } = await supabase
    .from("site_links")
    .select("url")
    .eq("type", "mascot")
    .not("name", "like", `${PIN_PRIORITY_PREFIX}%`);

  if (error) {
    console.error("检查默认仓鼠话失败:", error);
    return;
  }

  const existingMessages = new Set(
    (data || [])
      .map((row) => String(row.url || "").trim())
      .filter(Boolean),
  );
  const missingMessages = DEFAULT_MASCOT_MESSAGES
    .map((message, index) => ({ message, index }))
    .filter(({ message }) => !existingMessages.has(message));

  if (missingMessages.length === 0) return;

  const { error: insertError } = await supabase.from("site_links").insert(
    missingMessages.map(({ message, index }) => ({
      name: `默认仓鼠话术 ${index + 1}`,
      url: message,
      type: "mascot" as const,
    })),
  );

  if (insertError) {
    console.error("初始化默认仓鼠话失败:", insertError);
  }

  clearSiteLinksCache();
}
