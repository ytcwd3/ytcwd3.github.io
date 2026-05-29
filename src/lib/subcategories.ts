import { supabase } from "./supabase";
import { fetchGameCategoryRows, updateGameRows } from "./games";
import { logCategoryOperation } from "./category_operation_logs";

// subcategories 子分类
// 保存父分类下面的二级分类，并通过 category_id 归属到 categories。
export interface Subcategory {
  id: number;
  category_id: number;
  name: string;
  sort_order: number | null;
}

// 后台分类管理用的子分类结构。
export interface DbSubcategory {
  id: number;
  categoryId: number;
  name: string;
  sortOrder: number | null;
  gameCount: number;
}

// 子分类迁移时的进度信息。
interface CategoryMoveProgress {
  total: number;
  done: number;
  current?: number;
  subcategory: string;
  from: string;
  to: string;
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

// 读取 subcategories 原始数据。
export async function fetchSubcategoriesRaw(): Promise<Subcategory[]> {
  const { data, error } = await supabase
    .from("subcategories")
    .select("id, category_id, name, sort_order")
    .order("category_id", { ascending: true })
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("id", { ascending: true });
  if (error) throw error;
  return (data || []) as Subcategory[];
}

// 获取某个父分类下 subcategories 的下一条排序值。
async function getNextSubcategorySortOrder(categoryId: number): Promise<number> {
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

// 新增子分类。
export async function addDbSubcategory(
  categoryId: number,
  categoryName: string,
  subcategoryName: string,
): Promise<void> {
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

// 重命名子分类，并同步更新 games 中的冗余子分类名称。
export async function renameDbSubcategory(
  categoryId: number,
  subcategoryId: number,
  oldName: string,
  newName: string,
): Promise<void> {
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

  const { error: rpcError } = await supabase.rpc(
    "sync_games_after_subcategory_rename",
    {
      p_subcategory_id: subcategoryId,
      p_old_name: oldName,
      p_new_name: cleanName,
    },
  );
  if (rpcError) {
    const rows = (await fetchGameCategoryRows()).filter((row) =>
      (row.subcategory || []).includes(oldName),
    );
    for (const row of rows) {
      const { error } = await supabase
        .from("games")
        .update({
          subcategory: replaceValue(row.subcategory, oldName, cleanName),
        })
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

// 把子分类移动到另一个父分类，并同步修正 games 的分类归属。
export async function moveDbSubcategoryToCategory(
  subcategoryId: number,
  subcategoryName: string,
  fromCategoryId: number,
  fromCategoryName: string,
  toCategoryId: number,
  toCategoryName: string,
  onProgress?: (progress: CategoryMoveProgress) => void,
): Promise<void> {
  if (fromCategoryId === toCategoryId) return;

  const { data: duplicate, error: duplicateError } = await supabase
    .from("subcategories")
    .select("id")
    .eq("category_id", toCategoryId)
    .eq("name", subcategoryName)
    .limit(1);
  if (duplicateError) throw duplicateError;
  const targetSubcategoryId = duplicate?.[0]?.id ?? subcategoryId;

  const { error: rpcError } = await supabase.rpc("move_subcategory_fast", {
    p_subcategory_id: subcategoryId,
    p_subcategory_name: subcategoryName,
    p_from_category_id: fromCategoryId,
    p_from_category_name: fromCategoryName,
    p_to_category_id: toCategoryId,
    p_to_category_name: toCategoryName,
    p_target_subcategory_id: targetSubcategoryId,
  });
  if (!rpcError) {
    const movedCount = Number(0);
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
      beforeData: {
        fromCategoryId,
        fromCategoryName,
        toCategoryId,
        toCategoryName,
      },
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
    const nextCategory = replaceValue(
      row.category,
      fromCategoryName,
      toCategoryName,
    );
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
    const { error } = await supabase
      .from("subcategories")
      .delete()
      .eq("id", subcategoryId);
    if (error) throw error;
    await logCategoryOperation({
      action: "move_subcategory",
      targetType: "subcategory",
      targetId: subcategoryId,
      targetName: subcategoryName,
      beforeData: {
        fromCategoryId,
        fromCategoryName,
        toCategoryId,
        toCategoryName,
      },
      afterData: {
        fromCategoryId,
        fromCategoryName,
        toCategoryId,
        toCategoryName,
        deleted: true,
      },
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

// 更新子分类排序。
export async function updateSubcategorySortOrder(
  subcategories: DbSubcategory[],
): Promise<void> {
  for (const [index, subcategory] of subcategories.entries()) {
    const { error } = await supabase
      .from("subcategories")
      .update({ sort_order: index })
      .eq("id", subcategory.id);
    if (error) throw error;
  }
}

// 删除子分类，并清理 games 中关联的子分类字段。
export async function deleteDbSubcategory(
  subcategoryId: number,
  categoryName: string,
  subcategoryName: string,
): Promise<void> {
  const { error: rpcError } = await supabase.rpc(
    "clear_games_for_subcategory_delete",
    {
      p_subcategory_id: subcategoryId,
      p_category_name: categoryName,
      p_subcategory_name: subcategoryName,
    },
  );
  if (rpcError) {
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
