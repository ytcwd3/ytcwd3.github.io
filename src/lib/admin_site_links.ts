import { supabase } from "./supabase";
import { SiteLink } from "./site_links";

type SiteLinkPayload = Pick<SiteLink, "name" | "url" | "type">;

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

export async function adminCreateSiteLink(payload: SiteLinkPayload) {
  const response = await fetch("/api/admin/site-links", {
    method: "POST",
    headers: await getAdminHeaders(),
    body: JSON.stringify({ payload }),
  });
  return parseAdminResponse(response) as Promise<{ data: { id: number } }>;
}

export async function adminUpdateSiteLink(id: number, payload: SiteLinkPayload) {
  const response = await fetch("/api/admin/site-links", {
    method: "PATCH",
    headers: await getAdminHeaders(),
    body: JSON.stringify({ id, payload }),
  });
  return parseAdminResponse(response) as Promise<{ data: { id: number } }>;
}

export async function adminDeleteSiteLink(id: number) {
  const response = await fetch("/api/admin/site-links", {
    method: "DELETE",
    headers: await getAdminHeaders(),
    body: JSON.stringify({ id }),
  });
  return parseAdminResponse(response) as Promise<{ data: { id: number }[] }>;
}
