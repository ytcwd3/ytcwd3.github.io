import { supabase } from "./supabase";
import { clearSiteLinksCache, parsePinPriority } from "./site_links";

async function getAdminHeaders() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("未登录或登录已过期");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function saveAdminPinPriority(
  gameId: number,
  pinned: boolean,
  priority: number,
) {
  clearSiteLinksCache();
  const response = await fetch("/api/admin/pin-priority", {
    method: "POST",
    headers: await getAdminHeaders(),
    body: JSON.stringify({
      gameId,
      pinned,
      priority: parsePinPriority(priority),
    }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.error || `置顶顺序保存失败: ${response.status}`);
  }
  return result;
}
