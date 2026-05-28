import { supabase } from "./supabase";

export type DbSubcategory = {
  id: number;
  categoryId: number;
  name: string;
  gameCount: number;
};

export type DbCategory = {
  id: number;
  name: string;
  subcategories: DbSubcategory[];
  gameCount: number;
};

export type CategoryMoveProgress = {
  total: number;
  done: number;
  current?: number;
  subcategory: string;
  from: string;
  to: string;
};

type GameCategoryRow = {
  id: number;
  category: string[] | null;
  subcategory: string[] | null;
  category_id?: number | null;
  subcategory_id?: number | null;
};

type CategoryRow = {
  id: number;
  name: string;
  sort_order: number | null;
};

type SubcategoryRow = {
  id: number;
  category_id: number;
  name: string;
  sort_order: number | null;
};

type GameCategoryCountRow = {
  id: number;
  category_id?: number | null;
  subcategory_id?: number | null;
};

const BATCH_SIZE = 1000;
const OPERATOR_NAME = "admin";

function normalizeDbCategories(value: unknown): DbCategory[] | null {
  if (!Array.isArray(value)) return null;
  return value.map((category: any) => ({
    id: Number(category.id),
    name: String(category.name || ""),
    gameCount: Number(category.gameCount || 0),
    subcategories: Array.isArray(category.subcategories)
      ? category.subcategories.map((subcategory: any) => ({
          id: Number(subcategory.id),
          categoryId: Number(subcategory.categoryId),
          name: String(subcategory.name || ""),
          gameCount: Number(subcategory.gameCount || 0),
        }))
      : [],
  }));
}

function uniq(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function replaceValue(values: string[] | null | undefined, oldValue: string, newValue: string) {
  return uniq((values || []).map((value) => (value === oldValue ? newValue : value)));
}

async function logCategoryOperation(params: {
  action: string;
  targetType: string;
  targetId?: number | null;
  targetName?: string | null;
  beforeData?: unknown;
  afterData?: unknown;
}) {
  const { error } = await supabase.from("category_operation_logs").insert({
    action: params.action,
    target_type: params.targetType,
    target_id: params.targetId ?? null,
    target_name: params.targetName ?? null,
    before_data: params.beforeData ?? null,
    after_data: params.afterData ?? null,
    actor: OPERATOR_NAME,
  });
  if (error) throw error;
}

async function fetchCategoriesRaw() {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, sort_order")
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("id", { ascending: true });
  if (error) throw error;
  return (data || []) as CategoryRow[];
}

async function fetchSubcategoriesRaw() {
  const { data, error } = await supabase
    .from("subcategories")
    .select("id, category_id, name, sort_order")
    .order("category_id", { ascending: true })
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("id", { ascending: true });
  if (error) throw error;
  return (data || []) as SubcategoryRow[];
}

export async function fetchGameCategoryRows() {
  const rows: GameCategoryRow[] = [];
  let page = 0;

  while (true) {
    const from = page * BATCH_SIZE;
    const to = from + BATCH_SIZE - 1;
    const { data, error } = await supabase
      .from("games")
      .select("id, category, subcategory, category_id, subcategory_id")
      .range(from, to);

    if (error) throw error;
    if (!data || data.length === 0) break;
    rows.push(...((data || []) as GameCategoryRow[]));
    if (data.length < BATCH_SIZE) break;
    page += 1;
  }

  return rows;
}

async function fetchGameCategoryCountRows() {
  const rows: GameCategoryCountRow[] = [];
  let page = 0;

  while (true) {
    const from = page * BATCH_SIZE;
    const to = from + BATCH_SIZE - 1;
    const { data, error } = await supabase
      .from("games")
      .select("id, category_id, subcategory_id")
      .range(from, to);

    if (error) throw error;
    if (!data || data.length === 0) break;
    rows.push(...((data || []) as GameCategoryCountRow[]));
    if (data.length < BATCH_SIZE) break;
    page += 1;
  }

  return rows;
}

function buildDbCategoryTree(categoriesRaw: CategoryRow[], subcategoriesRaw: SubcategoryRow[]) {
  const categoriesById = new Map<number, DbCategory>();

  for (const row of categoriesRaw) {
    categoriesById.set(row.id, {
      id: row.id,
      name: row.name,
      subcategories: [],
      gameCount: 0,
    });
  }

  for (const row of subcategoriesRaw) {
    const category = categoriesById.get(row.category_id);
    if (!category) continue;
    category.subcategories.push({
      id: row.id,
      categoryId: row.category_id,
      name: row.name,
      gameCount: 0,
    });
  }

  return Array.from(categoriesById.values())
    .map((category) => ({
      ...category,
      subcategories: category.subcategories.sort((a, b) => a.id - b.id),
    }))
    .sort((a, b) => a.id - b.id || a.name.localeCompare(b.name, "zh-CN"));
}

export async function fetchDbCategoryOptions() {
  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "get_category_tree_fast",
    { include_counts: false },
  );
  if (!rpcError) {
    const normalized = normalizeDbCategories(rpcData);
    if (normalized && normalized.length > 0) return normalized;
  }

  const [categoriesRaw, subcategoriesRaw] = await Promise.all([
    fetchCategoriesRaw(),
    fetchSubcategoriesRaw(),
  ]);
  return buildDbCategoryTree(categoriesRaw, subcategoriesRaw);
}

async function updateGameRows(
  matcher: (row: GameCategoryRow) => boolean,
  updater: (row: GameCategoryRow) => Partial<Pick<GameCategoryRow, "category" | "subcategory" | "category_id" | "subcategory_id">>,
) {
  const rows = (await fetchGameCategoryRows()).filter(matcher);
  for (const row of rows) {
    const patch = updater(row);
    const { error } = await supabase
      .from("games")
      .update({
        ...(patch.category !== undefined ? { category: patch.category } : {}),
        ...(patch.subcategory !== undefined ? { subcategory: patch.subcategory } : {}),
        ...(patch.category_id !== undefined ? { category_id: patch.category_id } : {}),
        ...(patch.subcategory_id !== undefined ? { subcategory_id: patch.subcategory_id } : {}),
      })
      .eq("id", row.id);
    if (error) throw error;
  }
}

async function tryRpc(name: string, params: Record<string, unknown>) {
  const { data, error } = await supabase.rpc(name, params);
  if (error) return null;
  return data;
}

export async function fetchDbCategories() {
  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "get_category_tree_fast",
    { include_counts: true },
  );
  if (!rpcError) {
    const normalized = normalizeDbCategories(rpcData);
    if (normalized && normalized.length > 0) return normalized;
  }

  const [categoriesRaw, subcategoriesRaw, games] = await Promise.all([
    fetchCategoriesRaw(),
    fetchSubcategoriesRaw(),
    fetchGameCategoryCountRows(),
  ]);

  const categories = buildDbCategoryTree(categoriesRaw, subcategoriesRaw);
  const categoryCounts = new Map<number, number>();
  const subcategoryCounts = new Map<number, number>();

  for (const game of games) {
    if (game.category_id) {
      categoryCounts.set(game.category_id, (categoryCounts.get(game.category_id) || 0) + 1);
    }
    if (game.subcategory_id) {
      subcategoryCounts.set(game.subcategory_id, (subcategoryCounts.get(game.subcategory_id) || 0) + 1);
    }
  }

  for (const category of categories) {
    category.gameCount = categoryCounts.get(category.id) || 0;
    category.subcategories = category.subcategories
      .map((subcategory) => ({
        ...subcategory,
        gameCount: subcategoryCounts.get(subcategory.id) || 0,
      }))
      .sort((a, b) => a.id - b.id);
  }

  return categories;
}

async function getNextCategorySortOrder() {
  const { data, error } = await supabase
    .from("categories")
    .select("sort_order")
    .order("sort_order", { ascending: false, nullsFirst: false })
    .limit(1);
  if (error) throw error;
  const current = data?.[0]?.sort_order;
  return typeof current === "number" ? current + 1 : 0;
}

async function getNextSubcategorySortOrder(categoryId: number) {
  const { data, error } = await supabase
    .from("subcategories")
    .select("sort_order")
    .eq("category_id", categoryId)
    .order("sort_order", { ascending: false, nullsFirst: false })
    .limit(1);
  if (error) throw error;
  const current = data?.[0]?.sort_order;
  return typeof current === "number" ? current + 1 : 0;
}

export async function addDbCategory(name: string) {
  const cleanName = name.trim();
  if (!cleanName) throw new Error("主分类名称不能为空");

  const { data: existing, error: existingError } = await supabase
    .from("categories")
    .select("id")
    .eq("name", cleanName)
    .limit(1);
  if (existingError) throw existingError;
  if (existing && existing.length > 0) {
    throw new Error("主分类已存在");
  }

  const sortOrder = await getNextCategorySortOrder();
  const { error } = await supabase.from("categories").insert({
    name: cleanName,
    sort_order: sortOrder,
  });
  if (error) throw error;

  await logCategoryOperation({
    action: "create_category",
    targetType: "category",
    targetName: cleanName,
    afterData: { name: cleanName },
  });
}

export async function addDbSubcategory(categoryId: number, categoryName: string, subcategoryName: string) {
  const cleanName = subcategoryName.trim();
  if (!cleanName) throw new Error("子分类名称不能为空");

  const { data: existing, error: existingError } = await supabase
    .from("subcategories")
    .select("id")
    .eq("category_id", categoryId)
    .eq("name", cleanName)
    .limit(1);
  if (existingError) throw existingError;
  if (existing && existing.length > 0) {
    throw new Error("子分类已存在");
  }

  const sortOrder = await getNextSubcategorySortOrder(categoryId);
  const { error } = await supabase.from("subcategories").insert({
    category_id: categoryId,
    name: cleanName,
    sort_order: sortOrder,
  });
  if (error) throw error;

  await logCategoryOperation({
    action: "create_subcategory",
    targetType: "subcategory",
    targetId: categoryId,
    targetName: cleanName,
    afterData: { categoryId, categoryName, name: cleanName },
  });
}

export async function renameDbCategory(categoryId: number, oldName: string, newName: string) {
  const cleanName = newName.trim();
  if (!cleanName) throw new Error("主分类名称不能为空");

  if (cleanName === oldName) return;

  const { data: existing, error: existingError } = await supabase
    .from("categories")
    .select("id")
    .eq("name", cleanName)
    .neq("id", categoryId)
    .limit(1);
  if (existingError) throw existingError;
  if (existing && existing.length > 0) {
    throw new Error("主分类已存在");
  }

  const { error: updateCategoryError } = await supabase
    .from("categories")
    .update({ name: cleanName })
    .eq("id", categoryId);
  if (updateCategoryError) throw updateCategoryError;

  const rpcResult = await tryRpc("sync_games_after_category_rename", {
    p_category_id: categoryId,
    p_old_name: oldName,
    p_new_name: cleanName,
  });
  if (rpcResult === null) {
    const rows = (await fetchGameCategoryRows()).filter((row) =>
      (row.category || []).includes(oldName),
    );
    for (const row of rows) {
      const { error } = await supabase
        .from("games")
        .update({ category: replaceValue(row.category, oldName, cleanName) })
        .eq("id", row.id);
      if (error) throw error;
    }
  }

  await logCategoryOperation({
    action: "rename_category",
    targetType: "category",
    targetId: categoryId,
    targetName: cleanName,
    beforeData: { name: oldName },
    afterData: { name: cleanName },
  });
}

export async function renameDbSubcategory(
  categoryId: number,
  subcategoryId: number,
  oldName: string,
  newName: string,
) {
  const cleanName = newName.trim();
  if (!cleanName) throw new Error("子分类名称不能为空");

  if (cleanName === oldName) return;

  const { data: existing, error: existingError } = await supabase
    .from("subcategories")
    .select("id")
    .eq("category_id", categoryId)
    .eq("name", cleanName)
    .neq("id", subcategoryId)
    .limit(1);
  if (existingError) throw existingError;
  if (existing && existing.length > 0) {
    throw new Error("子分类已存在");
  }

  const { error: updateSubcategoryError } = await supabase
    .from("subcategories")
    .update({ name: cleanName })
    .eq("id", subcategoryId);
  if (updateSubcategoryError) throw updateSubcategoryError;

  const rpcResult = await tryRpc("sync_games_after_subcategory_rename", {
    p_subcategory_id: subcategoryId,
    p_old_name: oldName,
    p_new_name: cleanName,
  });
  if (rpcResult === null) {
    const rows = (await fetchGameCategoryRows()).filter((row) =>
      (row.subcategory || []).includes(oldName),
    );
    for (const row of rows) {
      const { error } = await supabase
        .from("games")
        .update({ subcategory: replaceValue(row.subcategory, oldName, cleanName) })
        .eq("id", row.id);
      if (error) throw error;
    }
  }

  await logCategoryOperation({
    action: "rename_subcategory",
    targetType: "subcategory",
    targetId: subcategoryId,
    targetName: cleanName,
    beforeData: { categoryId, name: oldName },
    afterData: { categoryId, name: cleanName },
  });
}

export async function moveDbSubcategoryToCategory(
  subcategoryId: number,
  subcategoryName: string,
  fromCategoryId: number,
  fromCategoryName: string,
  toCategoryId: number,
  toCategoryName: string,
  onProgress?: (progress: CategoryMoveProgress) => void,
) {
  if (fromCategoryId === toCategoryId) return;

  const { data: duplicate, error: duplicateError } = await supabase
    .from("subcategories")
    .select("id")
    .eq("category_id", toCategoryId)
    .eq("name", subcategoryName)
    .limit(1);
  if (duplicateError) throw duplicateError;
  const targetSubcategoryId = duplicate?.[0]?.id ?? subcategoryId;

  const rpcResult = await tryRpc("move_subcategory_fast", {
    p_subcategory_id: subcategoryId,
    p_subcategory_name: subcategoryName,
    p_from_category_id: fromCategoryId,
    p_from_category_name: fromCategoryName,
    p_to_category_id: toCategoryId,
    p_to_category_name: toCategoryName,
    p_target_subcategory_id: targetSubcategoryId,
  });
  if (rpcResult !== null) {
    const movedCount = Number((rpcResult as any)?.moved_games_count || 0);
    onProgress?.({
      total: movedCount,
      done: movedCount,
      subcategory: subcategoryName,
      from: fromCategoryName,
      to: toCategoryName,
    });

    await logCategoryOperation({
      action: "move_subcategory",
      targetType: "subcategory",
      targetId: subcategoryId,
      targetName: subcategoryName,
      beforeData: { fromCategoryId, fromCategoryName, toCategoryId, toCategoryName },
      afterData: {
        fromCategoryId,
        fromCategoryName,
        toCategoryId,
        toCategoryName,
        targetSubcategoryId,
        movedGamesCount: movedCount,
        deleted: duplicate && duplicate.length > 0,
      },
    });
    return;
  }

  const rows = (await fetchGameCategoryRows()).filter(
    (row) =>
      ((row.category || []).includes(fromCategoryName) &&
        (row.subcategory || []).includes(subcategoryName)) ||
      row.subcategory_id === subcategoryId,
  );

  onProgress?.({
    total: rows.length,
    done: 0,
    subcategory: subcategoryName,
    from: fromCategoryName,
    to: toCategoryName,
  });

  for (const [index, row] of rows.entries()) {
    const nextCategory = replaceValue(row.category, fromCategoryName, toCategoryName);
    const { error } = await supabase
      .from("games")
      .update({
        category: nextCategory,
        category_id: toCategoryId,
        subcategory_id: targetSubcategoryId,
      })
      .eq("id", row.id);
    if (error) throw error;

    onProgress?.({
      total: rows.length,
      done: index + 1,
      current: row.id,
      subcategory: subcategoryName,
      from: fromCategoryName,
      to: toCategoryName,
    });
  }

  if (duplicate && duplicate.length > 0) {
    const { error } = await supabase.from("subcategories").delete().eq("id", subcategoryId);
    if (error) throw error;
    await logCategoryOperation({
      action: "move_subcategory",
      targetType: "subcategory",
      targetId: subcategoryId,
      targetName: subcategoryName,
      beforeData: { fromCategoryId, fromCategoryName, toCategoryId, toCategoryName },
      afterData: { fromCategoryId, fromCategoryName, toCategoryId, toCategoryName, deleted: true },
    });
    return;
  }

  const { error } = await supabase
    .from("subcategories")
    .update({ category_id: toCategoryId })
    .eq("id", subcategoryId);
  if (error) throw error;

  await logCategoryOperation({
    action: "move_subcategory",
    targetType: "subcategory",
    targetId: subcategoryId,
    targetName: subcategoryName,
    beforeData: { fromCategoryId, fromCategoryName },
    afterData: { toCategoryId, toCategoryName },
  });
}

export async function deleteDbCategory(categoryId: number, categoryName: string) {
  const rpcResult = await tryRpc("clear_games_for_category_delete", {
    p_category_id: categoryId,
    p_category_name: categoryName,
  });
  if (rpcResult === null) {
    await updateGameRows(
      (row) => (row.category || []).includes(categoryName) || row.category_id === categoryId,
      () => ({
        category: [],
        category_id: null,
      }),
    );
  }

  const { error } = await supabase.from("categories").delete().eq("id", categoryId);
  if (error) throw error;

  await logCategoryOperation({
    action: "delete_category",
    targetType: "category",
    targetId: categoryId,
    targetName: categoryName,
    beforeData: { name: categoryName },
  });
}

export async function deleteDbSubcategory(
  subcategoryId: number,
  categoryName: string,
  subcategoryName: string,
) {
  const rpcResult = await tryRpc("clear_games_for_subcategory_delete", {
    p_subcategory_id: subcategoryId,
    p_category_name: categoryName,
    p_subcategory_name: subcategoryName,
  });
  if (rpcResult === null) {
    await updateGameRows(
      (row) =>
        ((row.category || []).includes(categoryName) &&
          (row.subcategory || []).includes(subcategoryName)) ||
        row.subcategory_id === subcategoryId,
      () => ({
        subcategory: [],
        subcategory_id: null,
      }),
    );
  }

  const { error } = await supabase.from("subcategories").delete().eq("id", subcategoryId);
  if (error) throw error;

  await logCategoryOperation({
    action: "delete_subcategory",
    targetType: "subcategory",
    targetId: subcategoryId,
    targetName: subcategoryName,
    beforeData: { categoryName, name: subcategoryName },
  });
}
