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

type AdminClient = ReturnType<typeof createAdminClient>;

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

function cleanText(value: unknown) {
  return String(value || "").trim();
}

function requirePositiveId(value: unknown, label: string) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`无效的${label}`);
  }
  return id;
}

function uniq(values: string[] | null | undefined) {
  return Array.from(new Set((values || []).map((value) => value.trim()).filter(Boolean)));
}

function replaceValue(
  values: string[] | null | undefined,
  oldValue: string,
  newValue: string,
) {
  return uniq((values || []).map((value) => (value === oldValue ? newValue : value)));
}

async function logCategoryOperation(
  admin: AdminClient,
  params: {
    action: string;
    targetType: string;
    targetId?: number | null;
    targetName?: string | null;
    beforeData?: unknown;
    afterData?: unknown;
  },
) {
  await admin.from("category_operation_logs").insert({
    action: params.action,
    target_type: params.targetType,
    target_id: params.targetId ?? null,
    target_name: params.targetName ?? null,
    before_data: params.beforeData ?? null,
    after_data: params.afterData ?? null,
    actor: "admin",
  });
}

async function fetchGameCategoryRows(admin: AdminClient) {
  const rows: Array<{
    id: number;
    category: string[] | null;
    subcategory: string[] | null;
    category_id?: number | null;
    subcategory_id?: number | null;
  }> = [];
  const batchSize = 1000;
  let page = 0;

  while (true) {
    const from = page * batchSize;
    const to = from + batchSize - 1;
    const { data, error } = await admin
      .from("games")
      .select("id, category, subcategory, category_id, subcategory_id")
      .range(from, to);
    if (error) throw error;
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < batchSize) break;
    page += 1;
  }

  return rows;
}

async function updateGameRows(
  admin: AdminClient,
  matcher: (row: Awaited<ReturnType<typeof fetchGameCategoryRows>>[number]) => boolean,
  updater: (
    row: Awaited<ReturnType<typeof fetchGameCategoryRows>>[number],
  ) => Record<string, unknown>,
) {
  const rows = (await fetchGameCategoryRows(admin)).filter(matcher);
  for (const row of rows) {
    const { error } = await admin.from("games").update(updater(row)).eq("id", row.id);
    if (error) throw error;
  }
  return rows.length;
}

async function getNextSortOrder(
  admin: AdminClient,
  table: "categories" | "subcategories",
  categoryId?: number,
) {
  let query = admin
    .from(table)
    .select("sort_order")
    .order("sort_order", { ascending: false, nullsFirst: false })
    .limit(1);
  if (table === "subcategories" && categoryId) {
    query = query.eq("category_id", categoryId);
  }
  const { data, error } = await query;
  if (error) throw error;
  const current = data?.[0]?.sort_order;
  return typeof current === "number" ? current + 1 : 0;
}

async function createCategory(admin: AdminClient, body: Record<string, unknown>) {
  const name = cleanText(body.name);
  if (!name) throw new Error("主分类名称不能为空");

  const { data: existing, error: existingError } = await admin
    .from("categories")
    .select("id")
    .eq("name", name)
    .limit(1);
  if (existingError) throw existingError;
  if (existing && existing.length > 0) throw new Error("主分类已存在");

  const sortOrder = await getNextSortOrder(admin, "categories");
  const { data, error } = await admin
    .from("categories")
    .insert({ name, sort_order: sortOrder })
    .select("id")
    .single();
  if (error) throw error;

  await logCategoryOperation(admin, {
    action: "create_category",
    targetType: "category",
    targetId: data.id,
    targetName: name,
    afterData: { name },
  });
  return { data };
}

async function renameCategory(admin: AdminClient, body: Record<string, unknown>) {
  const categoryId = requirePositiveId(body.categoryId, "主分类 ID");
  const oldName = cleanText(body.oldName);
  const newName = cleanText(body.newName);
  if (!newName) throw new Error("主分类名称不能为空");
  if (newName === oldName) return { ok: true };

  const { data: existing, error: existingError } = await admin
    .from("categories")
    .select("id")
    .eq("name", newName)
    .neq("id", categoryId)
    .limit(1);
  if (existingError) throw existingError;
  if (existing && existing.length > 0) throw new Error("主分类已存在");

  const { error } = await admin.from("categories").update({ name: newName }).eq("id", categoryId);
  if (error) throw error;

  const { error: rpcError } = await admin.rpc("sync_games_after_category_rename", {
    p_category_id: categoryId,
    p_old_name: oldName,
    p_new_name: newName,
  });
  if (rpcError) {
    await updateGameRows(
      admin,
      (row) => (row.category || []).includes(oldName),
      (row) => ({ category: replaceValue(row.category, oldName, newName) }),
    );
  }

  await logCategoryOperation(admin, {
    action: "rename_category",
    targetType: "category",
    targetId: categoryId,
    targetName: newName,
    beforeData: { name: oldName },
    afterData: { name: newName },
  });
  return { ok: true };
}

async function sortCategories(admin: AdminClient, body: Record<string, unknown>) {
  const ids = Array.isArray(body.ids) ? body.ids.map((id) => Number(id)) : [];
  if (ids.length === 0 || ids.some((id) => !Number.isInteger(id) || id <= 0)) {
    throw new Error("无效的主分类排序数据");
  }

  const whenClauses = ids.map((id, index) => `WHEN ${id} THEN ${index}`).join(" ");
  const inClause = ids.join(",");
  const { error: rpcError } = await admin.rpc("execute_sql", {
    sql: `UPDATE categories SET sort_order = CASE id ${whenClauses} END WHERE id IN (${inClause})`,
  });

  if (rpcError) {
    for (const [index, id] of ids.entries()) {
      const { error } = await admin.from("categories").update({ sort_order: index }).eq("id", id);
      if (error) throw error;
    }
  }
  return { ok: true };
}

async function deleteCategory(admin: AdminClient, body: Record<string, unknown>) {
  const categoryId = requirePositiveId(body.categoryId, "主分类 ID");
  const categoryName = cleanText(body.categoryName);

  const { error: rpcError } = await admin.rpc("clear_games_for_category_delete", {
    p_category_id: categoryId,
    p_category_name: categoryName,
  });
  if (rpcError) {
    await updateGameRows(
      admin,
      (row) => (row.category || []).includes(categoryName) || row.category_id === categoryId,
      () => ({ category: [], category_id: null }),
    );
  }

  const { error } = await admin.from("categories").delete().eq("id", categoryId);
  if (error) throw error;

  await logCategoryOperation(admin, {
    action: "delete_category",
    targetType: "category",
    targetId: categoryId,
    targetName: categoryName,
    beforeData: { name: categoryName },
  });
  return { ok: true };
}

async function createSubcategory(admin: AdminClient, body: Record<string, unknown>) {
  const categoryId = requirePositiveId(body.categoryId, "主分类 ID");
  const categoryName = cleanText(body.categoryName);
  const name = cleanText(body.name);
  if (!name) throw new Error("子分类名称不能为空");

  const { data: existing, error: existingError } = await admin
    .from("subcategories")
    .select("id")
    .eq("category_id", categoryId)
    .eq("name", name)
    .limit(1);
  if (existingError) throw existingError;
  if (existing && existing.length > 0) throw new Error("子分类已存在");

  const sortOrder = await getNextSortOrder(admin, "subcategories", categoryId);
  const { data, error } = await admin
    .from("subcategories")
    .insert({ category_id: categoryId, name, sort_order: sortOrder })
    .select("id")
    .single();
  if (error) throw error;

  await logCategoryOperation(admin, {
    action: "create_subcategory",
    targetType: "subcategory",
    targetId: data.id,
    targetName: name,
    afterData: { categoryId, categoryName, name },
  });
  return { data };
}

async function renameSubcategory(admin: AdminClient, body: Record<string, unknown>) {
  const categoryId = requirePositiveId(body.categoryId, "主分类 ID");
  const subcategoryId = requirePositiveId(body.subcategoryId, "子分类 ID");
  const oldName = cleanText(body.oldName);
  const newName = cleanText(body.newName);
  if (!newName) throw new Error("子分类名称不能为空");
  if (newName === oldName) return { ok: true };

  const { data: existing, error: existingError } = await admin
    .from("subcategories")
    .select("id")
    .eq("category_id", categoryId)
    .eq("name", newName)
    .neq("id", subcategoryId)
    .limit(1);
  if (existingError) throw existingError;
  if (existing && existing.length > 0) throw new Error("子分类已存在");

  const { error } = await admin
    .from("subcategories")
    .update({ name: newName })
    .eq("id", subcategoryId);
  if (error) throw error;

  const { error: rpcError } = await admin.rpc("sync_games_after_subcategory_rename", {
    p_subcategory_id: subcategoryId,
    p_old_name: oldName,
    p_new_name: newName,
  });
  if (rpcError) {
    await updateGameRows(
      admin,
      (row) => (row.subcategory || []).includes(oldName),
      (row) => ({ subcategory: replaceValue(row.subcategory, oldName, newName) }),
    );
  }

  await logCategoryOperation(admin, {
    action: "rename_subcategory",
    targetType: "subcategory",
    targetId: subcategoryId,
    targetName: newName,
    beforeData: { categoryId, name: oldName },
    afterData: { categoryId, name: newName },
  });
  return { ok: true };
}

async function sortSubcategories(admin: AdminClient, body: Record<string, unknown>) {
  const ids = Array.isArray(body.ids) ? body.ids.map((id) => Number(id)) : [];
  if (ids.length === 0 || ids.some((id) => !Number.isInteger(id) || id <= 0)) {
    throw new Error("无效的子分类排序数据");
  }

  const whenClauses = ids.map((id, index) => `WHEN ${id} THEN ${index}`).join(" ");
  const inClause = ids.join(",");
  const { error: rpcError } = await admin.rpc("execute_sql", {
    sql: `UPDATE subcategories SET sort_order = CASE id ${whenClauses} END WHERE id IN (${inClause})`,
  });

  if (rpcError) {
    for (const [index, id] of ids.entries()) {
      const { error } = await admin.from("subcategories").update({ sort_order: index }).eq("id", id);
      if (error) throw error;
    }
  }
  return { ok: true };
}

async function moveSubcategory(admin: AdminClient, body: Record<string, unknown>) {
  const subcategoryId = requirePositiveId(body.subcategoryId, "子分类 ID");
  const subcategoryName = cleanText(body.subcategoryName);
  const fromCategoryId = requirePositiveId(body.fromCategoryId, "原主分类 ID");
  const fromCategoryName = cleanText(body.fromCategoryName);
  const toCategoryId = requirePositiveId(body.toCategoryId, "目标主分类 ID");
  const toCategoryName = cleanText(body.toCategoryName);
  if (fromCategoryId === toCategoryId) return { ok: true, movedGamesCount: 0 };

  const { data: duplicate, error: duplicateError } = await admin
    .from("subcategories")
    .select("id")
    .eq("category_id", toCategoryId)
    .eq("name", subcategoryName)
    .limit(1);
  if (duplicateError) throw duplicateError;
  const targetSubcategoryId = duplicate?.[0]?.id ?? subcategoryId;

  const { error: rpcError } = await admin.rpc("move_subcategory_fast", {
    p_subcategory_id: subcategoryId,
    p_subcategory_name: subcategoryName,
    p_from_category_id: fromCategoryId,
    p_from_category_name: fromCategoryName,
    p_to_category_id: toCategoryId,
    p_to_category_name: toCategoryName,
    p_target_subcategory_id: targetSubcategoryId,
  });

  let movedGamesCount = 0;
  if (rpcError) {
    movedGamesCount = await updateGameRows(
      admin,
      (row) =>
        ((row.category || []).includes(fromCategoryName) &&
          (row.subcategory || []).includes(subcategoryName)) ||
        row.subcategory_id === subcategoryId,
      (row) => ({
        category: replaceValue(row.category, fromCategoryName, toCategoryName),
        category_id: toCategoryId,
        subcategory_id: targetSubcategoryId,
      }),
    );

    if (duplicate && duplicate.length > 0) {
      const { error } = await admin.from("subcategories").delete().eq("id", subcategoryId);
      if (error) throw error;
    } else {
      const { error } = await admin
        .from("subcategories")
        .update({ category_id: toCategoryId })
        .eq("id", subcategoryId);
      if (error) throw error;
    }
  }

  await logCategoryOperation(admin, {
    action: "move_subcategory",
    targetType: "subcategory",
    targetId: subcategoryId,
    targetName: subcategoryName,
    beforeData: { fromCategoryId, fromCategoryName },
    afterData: {
      toCategoryId,
      toCategoryName,
      targetSubcategoryId,
      movedGamesCount,
      deleted: duplicate && duplicate.length > 0,
    },
  });
  return { ok: true, movedGamesCount };
}

async function deleteSubcategory(admin: AdminClient, body: Record<string, unknown>) {
  const subcategoryId = requirePositiveId(body.subcategoryId, "子分类 ID");
  const categoryName = cleanText(body.categoryName);
  const subcategoryName = cleanText(body.subcategoryName);

  const { error: rpcError } = await admin.rpc("clear_games_for_subcategory_delete", {
    p_subcategory_id: subcategoryId,
    p_category_name: categoryName,
    p_subcategory_name: subcategoryName,
  });
  if (rpcError) {
    await updateGameRows(
      admin,
      (row) =>
        ((row.category || []).includes(categoryName) &&
          (row.subcategory || []).includes(subcategoryName)) ||
        row.subcategory_id === subcategoryId,
      () => ({ subcategory: [], subcategory_id: null }),
    );
  }

  const { error } = await admin.from("subcategories").delete().eq("id", subcategoryId);
  if (error) throw error;

  await logCategoryOperation(admin, {
    action: "delete_subcategory",
    targetType: "subcategory",
    targetId: subcategoryId,
    targetName: subcategoryName,
    beforeData: { categoryName, name: subcategoryName },
  });
  return { ok: true };
}

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    const body = await request.json();
    const action = cleanText(body.action);
    const admin = createAdminClient();

    switch (action) {
      case "create-category":
        return Response.json(await createCategory(admin, body));
      case "rename-category":
        return Response.json(await renameCategory(admin, body));
      case "sort-categories":
        return Response.json(await sortCategories(admin, body));
      case "delete-category":
        return Response.json(await deleteCategory(admin, body));
      case "create-subcategory":
        return Response.json(await createSubcategory(admin, body));
      case "rename-subcategory":
        return Response.json(await renameSubcategory(admin, body));
      case "sort-subcategories":
        return Response.json(await sortSubcategories(admin, body));
      case "move-subcategory":
        return Response.json(await moveSubcategory(admin, body));
      case "delete-subcategory":
        return Response.json(await deleteSubcategory(admin, body));
      default:
        return jsonError("未知的分类管理操作");
    }
  } catch (error: any) {
    return jsonError(error.message || "分类管理操作失败", 403);
  }
}
