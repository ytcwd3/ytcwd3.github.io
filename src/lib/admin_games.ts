import { supabase } from "./supabase";

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

async function parseAdminResponse(response: Response) {
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.error || `后台接口失败: ${response.status}`);
  }
  return result;
}

export async function adminCreateGame(payload: Record<string, unknown>) {
  const response = await fetch("/api/admin/games", {
    method: "POST",
    headers: await getAdminHeaders(),
    body: JSON.stringify({ payload }),
  });
  return parseAdminResponse(response) as Promise<{ data: { id: number } }>;
}

export async function adminUpdateGame(id: number, payload: Record<string, unknown>) {
  const response = await fetch("/api/admin/games", {
    method: "PATCH",
    headers: await getAdminHeaders(),
    body: JSON.stringify({ id, payload }),
  });
  return parseAdminResponse(response) as Promise<{ data: { id: number } }>;
}

export async function adminDeleteGames(ids: number[]) {
  const response = await fetch("/api/admin/games", {
    method: "DELETE",
    headers: await getAdminHeaders(),
    body: JSON.stringify({ ids }),
  });
  return parseAdminResponse(response) as Promise<{ data: { id: number }[] }>;
}
