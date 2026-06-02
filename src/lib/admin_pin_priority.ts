import { getAdminAccessToken } from "./admin_auth";
import { clearSiteLinksCache, parsePinPriority } from "./site_links";

async function getAdminHeaders() {
  const token = await getAdminAccessToken();
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
