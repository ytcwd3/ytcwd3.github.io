import { supabase } from "./supabase";
import {
  fetchGameCategoryRows,
  updateGameRows,
} from "./games";
import { logCategoryOperation } from "./category_operation_logs";
import {
  fetchSubcategoriesRaw,
  type DbSubcategory,
  type Subcategory,
} from "./subcategories";

// categories 父分类
// 保存首页和后台使用的一级分类，例如「动作」「冒险」「角色扮演」等。
export interface Category {
  id: number;
  name: string;
  sort_order: number | null;
}

// 首页展示用的父分类结构，tags 来自 subcategories。
export interface HomeCategory {
  name: string;
  tags: string[];
}

// 后台分类管理用的父分类结构，包含子分类和游戏数量。
export interface DbCategory {
  id: number;
  name: string;
  sortOrder: number | null;
  subcategories: DbSubcategory[];
  gameCount: number;
}

function uniq(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function replaceValue(
  values: string[] | null | undefined,
  oldValue: string,
  newValue: string,
) {
  return uniq((values || []).map((value) => (value === oldValue ? newValue : value)));
}

let dbCategoriesPending: Promise<DbCategory[]> | null = null;

// 读取 categories 和 subcategories，用于首页分类导航展示。
export async function fetchHomeCategories(): Promise<HomeCategory[]> {
  const { data: categoriesData, error: categoriesError } = await supabase
    .from("categories")
    .select("id, name, sort_order")
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("id", { ascending: true });

  if (categoriesError) throw categoriesError;
  if (!categoriesData || categoriesData.length === 0) return [];

  const subcategories = await fetchSubcategoriesRaw();
  const categories = categoriesData as Category[];

  return categories.map((category) => ({
    name: String(category.name || ""),
    tags: subcategories
      .filter((sub) => sub.category_id === category.id)
      .sort((a, b) => (a.sort_order ?? a.id) - (b.sort_order ?? b.id))
      .map((sub) => String(sub.name || "")),
  }));
}

// 读取 categories 原始数据。
export async function fetchCategoriesRaw(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, sort_order")
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("id", { ascending: true });
  if (error) throw error;
  return (data || []) as Category[];
}

// 把 categories 和 subcategories 组装成后台分类树。
export function buildDbCategoryTree(
  categoriesRaw: Category[],
  subcategoriesRaw: Subcategory[],
) {
  const categoriesById = new Map<number, DbCategory>();

  for (const row of categoriesRaw) {
    categoriesById.set(row.id, {
      id: row.id,
      name: row.name,
      sortOrder: row.sort_order,
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
      sortOrder: row.sort_order,
      gameCount: 0,
    });
  }

  return Array.from(categoriesById.values())
    .map((category) => ({
      ...category,
      subcategories: category.subcategories.sort(
        (a, b) =>
          (a.sortOrder ?? a.id) - (b.sortOrder ?? b.id) ||
          a.id - b.id ||
          a.name.localeCompare(b.name, "zh-CN"),
      ),
    }))
    .sort(
      (a, b) =>
        (a.sortOrder ?? a.id) - (b.sortOrder ?? b.id) ||
        a.id - b.id ||
        a.name.localeCompare(b.name, "zh-CN"),
    );
}

// 读取后台分类管理需要的 categories / subcategories 数据。
export async function fetchDbCategoryOptions(): Promise<DbCategory[]> {
  const [categoriesRaw, subcategoriesRaw] = await Promise.all([
    fetchCategoriesRaw(),
    fetchSubcategoriesRaw(),
  ]);
  return buildDbCategoryTree(categoriesRaw, subcategoriesRaw);
}

// 读取分类树，并结合 games 统计每个父分类和子分类下的游戏数量。
export async function fetchDbCategories(): Promise<DbCategory[]> {
  if (dbCategoriesPending) {
    return dbCategoriesPending.then((data) =>
      data.map((category) => ({
        ...category,
        subcategories: category.subcategories.map((subcategory) => ({ ...subcategory })),
      })),
    );
  }

  dbCategoriesPending = (async () => {
    const [categoriesRaw, subcategoriesRaw, countsResult] = await Promise.all([
      fetchCategoriesRaw(),
      fetchSubcategoriesRaw(),
      supabase.rpc("get_admin_category_counts"),
    ]);

    if (countsResult.error) {
      console.warn("分类数量统计加载失败，不阻塞分类管理:", countsResult.error);
    }

    const categories = buildDbCategoryTree(categoriesRaw, subcategoriesRaw);
    const categoryCounts = new Map<number, number>();
    const subcategoryCounts = new Map<number, number>();
    const counts = countsResult.error ? [] : (countsResult.data || []) as Array<{
      category_id: number | null;
      subcategory_id: number | null;
      category_game_count: number | null;
      subcategory_game_count: number | null;
    }>;

    for (const row of counts) {
      if (row.category_id) {
        categoryCounts.set(row.category_id, row.category_game_count || 0);
      }
      if (row.subcategory_id) {
        subcategoryCounts.set(row.subcategory_id, row.subcategory_game_count || 0);
      }
    }

    for (const category of categories) {
      category.gameCount = categoryCounts.get(category.id) || 0;
      category.subcategories = category.subcategories
        .map((subcategory) => ({
          ...subcategory,
          gameCount: subcategoryCounts.get(subcategory.id) || 0,
        }))
        .sort(
          (a, b) =>
            (a.sortOrder ?? a.id) - (b.sortOrder ?? b.id) ||
            a.id - b.id ||
            a.name.localeCompare(b.name, "zh-CN"),
        );
    }

    return categories.sort(
      (a, b) =>
        (a.sortOrder ?? a.id) - (b.sortOrder ?? b.id) ||
        a.id - b.id ||
        a.name.localeCompare(b.name, "zh-CN"),
    );
  })();

  try {
    const data = await dbCategoriesPending;
    return data.map((category) => ({
      ...category,
      subcategories: category.subcategories.map((subcategory) => ({ ...subcategory })),
    }));
  } finally {
    dbCategoriesPending = null;
  }
}

// 获取 categories 下一条排序值。
async function getNextCategorySortOrder(): Promise<number> {
  const { data, error } = await supabase
    .from("categories")
    .select("sort_order")
    .order("sort_order", { ascending: false, nullsFirst: false })
    .limit(1);
  if (error) throw error;
  const current = data?.[0]?.sort_order;
  return typeof current === "number" ? current + 1 : 0;
}

// 新增父分类。
export async function addDbCategory(name: string): Promise<void> {
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

// 重命名父分类，并同步更新 games 中的冗余分类名称。
export async function renameDbCategory(
  categoryId: number,
  oldName: string,
  newName: string,
): Promise<void> {
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

  const { error: rpcError } = await supabase.rpc(
    "sync_games_after_category_rename",
    {
      p_category_id: categoryId,
      p_old_name: oldName,
      p_new_name: cleanName,
    },
  );
  if (rpcError) {
    const rows = (await fetchGameCategoryRows()).filter((row) =>
      (row.category || []).includes(oldName),
    );
    for (const row of rows) {
      const { error } = await supabase
        .from("games")
        .update({
          category: replaceValue(row.category, oldName, cleanName),
        })
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

// 更新父分类排序。
export async function updateCategorySortOrder(
  categories: DbCategory[],
): Promise<void> {
  for (const [index, category] of categories.entries()) {
    const { error } = await supabase
      .from("categories")
      .update({ sort_order: index })
      .eq("id", category.id);
    if (error) throw error;
  }
}

// 删除父分类，并清理 games 中关联的父分类字段。
export async function deleteDbCategory(
  categoryId: number,
  categoryName: string,
): Promise<void> {
  const { error: rpcError } = await supabase.rpc(
    "clear_games_for_category_delete",
    {
      p_category_id: categoryId,
      p_category_name: categoryName,
    },
  );
  if (rpcError) {
    await updateGameRows(
      (row) =>
        (row.category || []).includes(categoryName) ||
        row.category_id === categoryId,
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
