import { supabase } from "./supabase";

const PIN_PRIORITY_PREFIX = "__pin_order__:";
let pinPriorityCache: Record<number, number> | null = null;

// site_links 链接管理
// 存放站点可配置链接、工具入口和帮助入口。
export interface SiteLink {
  id: number;
  type: "tool" | "help";
  name: string;
  url: string;
  created_at?: string;
}

// site_links 中用于保存置顶顺序的虚拟记录结构。
type PinPriorityRow = {
  id?: number;
  name: string;
  url: string;
  type?: "tool" | "help";
};

// 用游戏 ID 生成 site_links.name 的存储键。
function getPinPriorityName(gameId: number) {
  return `${PIN_PRIORITY_PREFIX}${gameId}`;
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

  const { data, error } = await supabase
    .from("site_links")
    .select("name, url")
    .like("name", `${PIN_PRIORITY_PREFIX}%`);

  if (error) {
    console.error("加载置顶优先级失败:", error);
    return {} as Record<number, number>;
  }

  const map: Record<number, number> = {};
  for (const row of (data || []) as PinPriorityRow[]) {
    const id = Number(row.name.slice(PIN_PRIORITY_PREFIX.length));
    if (!Number.isInteger(id) || id <= 0) continue;
    map[id] = parsePinPriority(row.url);
  }
  pinPriorityCache = map;
  return map;
}

// 写入或删除 site_links 中的置顶优先级记录。
export async function savePinPriority(
  gameId: number,
  pinned: boolean,
  priority: number,
) {
  const name = getPinPriorityName(gameId);
  pinPriorityCache = null;

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
