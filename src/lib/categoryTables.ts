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

const BATCH_SIZE = 1000;
const OPERATOR_NAME = "admin";

function uniq(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function replaceValue(values: string[] | null | undefined, oldValue: string, newValue: string) {
  return uniq((values || []).map((value) => (value === oldValue ? newValue : value)));
}

function removeValue(values: string[] | null | undefined, valueToRemove: string) {
  return uniq((values || []).filter((value) => value !== valueToRemove));
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
      .select("id, category, subcategory")
      .range(from, to);

    if (error) throw error;
    if (!data || data.length === 0) break;
    rows.push(...((data || []) as GameCategoryRow[]));
    if (data.length < BATCH_SIZE) break;
    page += 1;
  }

  return rows;
}

export async function fetchDbCategories() {
  const [categoriesRaw, subcategoriesRaw, games] = await Promise.all([
    fetchCategoriesRaw(),
    fetchSubcategoriesRaw(),
    fetchGameCategoryRows(),
  ]);

  const categoriesById = new Map<number, DbCategory>();
  const categoriesByName = new Map<string, DbCategory>();

  for (const row of categoriesRaw) {
    const category: DbCategory = {
      id: row.id,
      name: row.name,
      subcategories: [],
      gameCount: 0,
    };
    categoriesById.set(row.id, category);
    categoriesByName.set(row.name, category);
  }

  const subcategoriesByCategoryId = new Map<number, DbSubcategory[]>();
  const subcategoryByCategoryName = new Map<string, Map<string, DbSubcategory>>();

  for (const row of subcategoriesRaw) {
    const subcategory: DbSubcategory = {
      id: row.id,
      categoryId: row.category_id,
      name: row.name,
      gameCount: 0,
    };
    const list = subcategoriesByCategoryId.get(row.category_id) || [];
    list.push(subcategory);
    subcategoriesByCategoryId.set(row.category_id, list);

    const category = categoriesById.get(row.category_id);
    if (category) {
      category.subcategories.push(subcategory);
    }

    const byName = subcategoryByCategoryName.get(row.category_id.toString()) || new Map<string, DbSubcategory>();
    byName.set(row.name, subcategory);
    subcategoryByCategoryName.set(row.category_id.toString(), byName);
  }

  const categoryCounts = new Map<string, number>();
  const subcategoryCounts = new Map<number, number>();

  for (const game of games) {
    const gameCategories = uniq(game.category || []);
    const gameSubcategories = uniq(game.subcategory || []);

    for (const categoryName of gameCategories) {
      categoryCounts.set(categoryName, (categoryCounts.get(categoryName) || 0) + 1);

      for (const category of categoriesRaw) {
        if (category.name !== categoryName) continue;
        const subMap =
          subcategoryByCategoryName.get(category.id.toString()) || new Map<string, DbSubcategory>();
        for (const subcategoryName of gameSubcategories) {
          const subcategory = subMap.get(subcategoryName);
          if (!subcategory) continue;
          subcategoryCounts.set(subcategory.id, (subcategoryCounts.get(subcategory.id) || 0) + 1);
        }
      }
    }
  }

  for (const category of categoriesById.values()) {
    category.gameCount = categoryCounts.get(category.name) || 0;
    category.subcategories = category.subcategories
      .map((subcategory) => ({
        ...subcategory,
        gameCount: subcategoryCounts.get(subcategory.id) || 0,
      }))
      .sort((a, b) => a.id - b.id);
  }

  return Array.from(categoriesById.values()).sort((a, b) => {
    const sortDiff = a.id - b.id;
    return sortDiff !== 0 ? sortDiff : a.name.localeCompare(b.name, "zh-CN");
  });
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

  const { error } = await supabase.from("categories").insert({
    name: cleanName,
    sort_order: await getNextCategorySortOrder(),
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

  const { error } = await supabase.from("subcategories").insert({
    category_id: categoryId,
    name: cleanName,
    sort_order: await getNextSubcategorySortOrder(categoryId),
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

  const { error: updateCategoryError } = await supabase
    .from("categories")
    .update({ name: cleanName })
    .eq("id", categoryId);
  if (updateCategoryError) throw updateCategoryError;

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
  subcategoryId: number,
  categoryName: string,
  oldName: string,
  newName: string,
) {
  const cleanName = newName.trim();
  if (!cleanName) throw new Error("子分类名称不能为空");

  const { error: updateSubcategoryError } = await supabase
    .from("subcategories")
    .update({ name: cleanName })
    .eq("id", subcategoryId);
  if (updateSubcategoryError) throw updateSubcategoryError;

  const rows = (await fetchGameCategoryRows()).filter((row) =>
    (row.category || []).includes(categoryName) &&
    (row.subcategory || []).includes(oldName),
  );
  for (const row of rows) {
    const { error } = await supabase
      .from("games")
      .update({ subcategory: replaceValue(row.subcategory, oldName, cleanName) })
      .eq("id", row.id);
    if (error) throw error;
  }

  await logCategoryOperation({
    action: "rename_subcategory",
    targetType: "subcategory",
    targetId: subcategoryId,
    targetName: cleanName,
    beforeData: { categoryName, name: oldName },
    afterData: { categoryName, name: cleanName },
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

  const rows = (await fetchGameCategoryRows()).filter((row) =>
    (row.category || []).includes(fromCategoryName) &&
    (row.subcategory || []).includes(subcategoryName),
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
      .update({ category: nextCategory })
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

  const { data: duplicate, error: duplicateError } = await supabase
    .from("subcategories")
    .select("id")
    .eq("category_id", toCategoryId)
    .eq("name", subcategoryName)
    .limit(1);
  if (duplicateError) throw duplicateError;

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
  const rows = (await fetchGameCategoryRows()).filter((row) =>
    (row.category || []).includes(categoryName),
  );
  for (const row of rows) {
    const { error } = await supabase
      .from("games")
      .update({ category: removeValue(row.category, categoryName) })
      .eq("id", row.id);
    if (error) throw error;
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
  const rows = (await fetchGameCategoryRows()).filter((row) =>
    (row.category || []).includes(categoryName) &&
    (row.subcategory || []).includes(subcategoryName),
  );
  for (const row of rows) {
    const { error } = await supabase
      .from("games")
      .update({ subcategory: removeValue(row.subcategory, subcategoryName) })
      .eq("id", row.id);
    if (error) throw error;
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
