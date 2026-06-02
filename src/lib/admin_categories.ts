import { getAdminAccessToken } from "./admin_auth";

async function getAdminHeaders() {
  const token = await getAdminAccessToken();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function runAdminCategoryAction<T = any>(
  action: string,
  payload: Record<string, unknown>,
): Promise<T> {
  const response = await fetch("/api/admin/categories", {
    method: "POST",
    headers: await getAdminHeaders(),
    body: JSON.stringify({ action, ...payload }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.error || `分类管理接口失败: ${response.status}`);
  }
  return result as T;
}
