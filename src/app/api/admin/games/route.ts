import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_ytcwd3_YTCWD3SUPABASE_URL ||
  "https://otqhzzoiuqvchrgnmxsp.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_ytcwd3_YTCWD3SUPABASE_ANON_KEY ||
  "sb_publishable_s4p-cAePvtCcqzvIk3HxFg_U3pHku60";
const serviceRoleKey =
  process.env.YTCWD3_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const ALLOWED_GITHUB_USERS = new Set(["anyebojue", "ytcwd3"]);

function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

async function requireAdmin(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) throw new Error("未登录或登录已过期");

  const authClient = createClient(supabaseUrl, supabaseAnonKey);
  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data.user) throw new Error("登录校验失败");

  const githubUsername =
    data.user.user_metadata?.user_name ||
    data.user.user_metadata?.preferred_username;
  if (!ALLOWED_GITHUB_USERS.has(githubUsername)) {
    throw new Error("当前账号没有后台权限");
  }
}

function createAdminClient() {
  if (!serviceRoleKey) {
    throw new Error("服务端缺少 YTCWD3_SUPABASE_SERVICE_ROLE_KEY 或 SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    const { payload } = await request.json();
    if (!payload || typeof payload !== "object") {
      return jsonError("缺少游戏数据");
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("games")
      .insert([payload])
      .select("id")
      .single();
    if (error) return jsonError(error.message, 500);

    return Response.json({ data });
  } catch (error: any) {
    return jsonError(error.message || "新增失败", 403);
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdmin(request);
    const { id, payload } = await request.json();
    if (!Number.isInteger(id) || id <= 0) return jsonError("无效的游戏 ID");
    if (!payload || typeof payload !== "object") return jsonError("缺少游戏数据");

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("games")
      .update(payload)
      .eq("id", id)
      .select("id")
      .single();
    if (error) return jsonError(error.message, 500);

    return Response.json({ data });
  } catch (error: any) {
    return jsonError(error.message || "更新失败", 403);
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdmin(request);
    const { id, ids } = await request.json();
    const targetIds = Array.isArray(ids) ? ids : [id];
    const cleanIds = targetIds.filter((value) => Number.isInteger(value) && value > 0);
    if (cleanIds.length === 0) return jsonError("缺少要删除的游戏 ID");

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("games")
      .delete()
      .in("id", cleanIds)
      .select("id");
    if (error) return jsonError(error.message, 500);

    return Response.json({ data: data || [] });
  } catch (error: any) {
    return jsonError(error.message || "删除失败", 403);
  }
}
