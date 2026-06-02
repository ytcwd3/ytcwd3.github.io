import { createClient } from "@supabase/supabase-js";
import { parsePinPriority } from "@/lib/site_links";

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
const PIN_PRIORITY_PREFIX = "__pin_order__:";

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
    const { gameId, pinned, priority } = await request.json();
    if (!Number.isInteger(gameId) || gameId <= 0) return jsonError("无效的游戏 ID");

    const admin = createAdminClient();
    const name = `${PIN_PRIORITY_PREFIX}${gameId}`;

    if (!pinned) {
      const { error } = await admin.from("site_links").delete().eq("name", name);
      if (error) return jsonError(error.message, 500);
      return Response.json({ ok: true });
    }

    const normalizedPriority = parsePinPriority(priority);
    const { data: existing, error: selectError } = await admin
      .from("site_links")
      .select("id")
      .eq("name", name)
      .limit(1);
    if (selectError) return jsonError(selectError.message, 500);

    if (existing && existing.length > 0) {
      const { error } = await admin
        .from("site_links")
        .update({ url: String(normalizedPriority), type: "help" })
        .eq("id", existing[0].id);
      if (error) return jsonError(error.message, 500);
      return Response.json({ ok: true });
    }

    const { error } = await admin.from("site_links").insert({
      name,
      url: String(normalizedPriority),
      type: "help",
    });
    if (error) return jsonError(error.message, 500);

    return Response.json({ ok: true });
  } catch (error: any) {
    return jsonError(error.message || "置顶顺序保存失败", 403);
  }
}
