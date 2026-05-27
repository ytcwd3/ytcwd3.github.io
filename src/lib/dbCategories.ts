import { supabase } from "./supabase";

export type DbCategory = {
  name: string;
  subcategories: string[];
  subcategoryCounts: Record<string, number>;
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

const DB_CATEGORY_CATALOG_NAME = "__db_category_catalog__";
const BATCH_SIZE = 1000;

function uniq(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function replaceValue(values: string[] | null | undefined, oldValue: string, newValue: string) {
  return uniq((values || []).map((value) => (value === oldValue ? newValue : value)));
}

function removeValue(values: string[] | null | undefined, valueToRemove: string) {
  return uniq((values || []).filter((value) => value !== valueToRemove));
}

async function fetchCategoryCatalog() {
  const { data } = await supabase
    .from("site_links")
    .select("url")
    .eq("name", DB_CATEGORY_CATALOG_NAME)
    .limit(1)
    .maybeSingle();

  if (!data?.url) return [] as DbCategory[];
  try {
    const parsed = JSON.parse(data.url);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => ({
        name: String(item?.name || "").trim(),
        subcategories: uniq(
          Array.isArray(item?.subcategories)
            ? item.subcategories.map((sub: unknown) => String(sub || ""))
            : [],
        ),
        subcategoryCounts: {},
        gameCount: 0,
      }))
      .filter((item) => item.name);
  } catch {
    return [];
  }
}

async function saveCategoryCatalog(categories: DbCategory[]) {
  const payload = JSON.stringify(
    categories.map((category) => ({
      name: category.name,
      subcategories: category.subcategories,
    })),
  );

  const { data, error } = await supabase
    .from("site_links")
    .select("id")
    .eq("name", DB_CATEGORY_CATALOG_NAME)
    .limit(1);
  if (error) throw error;

  if (data && data.length > 0) {
    const { error: updateError } = await supabase
      .from("site_links")
      .update({ url: payload, type: "help" })
      .eq("id", data[0].id);
    if (updateError) throw updateError;
    return;
  }

  const { error: insertError } = await supabase.from("site_links").insert({
    name: DB_CATEGORY_CATALOG_NAME,
    url: payload,
    type: "help",
  });
  if (insertError) throw insertError;
}

async function updateGameRowsByCategoryName(
  oldName: string,
  nextName: string | null,
) {
  const rows = (await fetchGameCategoryRows()).filter((row) =>
    (row.category || []).includes(oldName),
  );

  for (const row of rows) {
    const nextCategory = nextName
      ? replaceValue(row.category, oldName, nextName)
      : removeValue(row.category, oldName);
    const { error } = await supabase
      .from("games")
      .update({ category: nextCategory })
      .eq("id", row.id);
    if (error) throw error;
  }
}

async function updateGameRowsBySubcategoryName(
  oldName: string,
  nextName: string | null,
) {
  const rows = (await fetchGameCategoryRows()).filter((row) =>
    (row.subcategory || []).includes(oldName),
  );

  for (const row of rows) {
    const nextSubcategory = nextName
      ? replaceValue(row.subcategory, oldName, nextName)
      : removeValue(row.subcategory, oldName);
    const { error } = await supabase
      .from("games")
      .update({ subcategory: nextSubcategory })
      .eq("id", row.id);
    if (error) throw error;
  }
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
  const [rows, catalog] = await Promise.all([
    fetchGameCategoryRows(),
    fetchCategoryCatalog(),
  ]);
  const map = new Map<string, DbCategory>();

  for (const item of catalog) {
    map.set(item.name, {
      name: item.name,
      subcategories: uniq(item.subcategories),
      subcategoryCounts: {},
      gameCount: 0,
    });
  }

  for (const row of rows) {
    const categories = uniq(row.category || []);
    const subcategories = uniq(row.subcategory || []);

    for (const categoryName of categories) {
      const current =
        map.get(categoryName) ||
        ({
          name: categoryName,
          subcategories: [],
          subcategoryCounts: {},
          gameCount: 0,
        } satisfies DbCategory);
      current.gameCount += 1;
      current.subcategories = uniq([...current.subcategories, ...subcategories]);
      for (const subcategoryName of subcategories) {
        current.subcategoryCounts[subcategoryName] =
          (current.subcategoryCounts[subcategoryName] || 0) + 1;
      }
      map.set(categoryName, current);
    }
  }

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
}

export async function addDbCategory(name: string) {
  const categories = await fetchDbCategories();
  const cleanName = name.trim();
  if (!cleanName) throw new Error("主分类名称不能为空");
  if (categories.some((category) => category.name === cleanName)) {
    throw new Error("主分类已存在");
  }
  await saveCategoryCatalog([
    ...categories,
    { name: cleanName, subcategories: [], subcategoryCounts: {}, gameCount: 0 },
  ]);
}

export async function addDbSubcategory(categoryName: string, subcategoryName: string) {
  const categories = await fetchDbCategories();
  const cleanName = subcategoryName.trim();
  if (!cleanName) throw new Error("子分类名称不能为空");
  const next = categories.map((category) =>
    category.name === categoryName
      ? { ...category, subcategories: uniq([...category.subcategories, cleanName]) }
      : category,
  );
  await saveCategoryCatalog(next);
}

export async function renameDbCategory(oldName: string, newName: string) {
  const cleanName = newName.trim();
  if (!cleanName) throw new Error("主分类名称不能为空");

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

  const categories = await fetchDbCategories();
  await saveCategoryCatalog(
    categories.map((category) =>
      category.name === oldName ? { ...category, name: cleanName } : category,
    ),
  );
}

export async function renameDbSubcategory(oldName: string, newName: string) {
  const cleanName = newName.trim();
  if (!cleanName) throw new Error("子分类名称不能为空");

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

  const categories = await fetchDbCategories();
  await saveCategoryCatalog(
    categories.map((category) => ({
      ...category,
      subcategories: replaceValue(category.subcategories, oldName, cleanName),
    })),
  );
}

export async function moveDbSubcategoryToCategory(
  subcategoryName: string,
  oldCategoryName: string,
  newCategoryName: string,
  onProgress?: (progress: CategoryMoveProgress) => void,
) {
  const cleanSubcategoryName = subcategoryName.trim();
  const cleanOldCategoryName = oldCategoryName.trim();
  const cleanNewCategoryName = newCategoryName.trim();
  if (!cleanSubcategoryName) throw new Error("子分类名称不能为空");
  if (!cleanNewCategoryName) throw new Error("目标主分类不能为空");
  if (cleanOldCategoryName === cleanNewCategoryName) return;

  const rows = (await fetchGameCategoryRows()).filter((row) =>
    (row.subcategory || []).includes(cleanSubcategoryName),
  );

  onProgress?.({
    total: rows.length,
    done: 0,
    subcategory: cleanSubcategoryName,
    from: cleanOldCategoryName,
    to: cleanNewCategoryName,
  });

  for (const [index, row] of rows.entries()) {
    const withoutOld = removeValue(row.category, cleanOldCategoryName);
    const nextCategory = uniq([...withoutOld, cleanNewCategoryName]);
    const { error } = await supabase
      .from("games")
      .update({ category: nextCategory })
      .eq("id", row.id);
    if (error) throw error;

    onProgress?.({
      total: rows.length,
      done: index + 1,
      current: row.id,
      subcategory: cleanSubcategoryName,
      from: cleanOldCategoryName,
      to: cleanNewCategoryName,
    });
  }

  const categories = await fetchDbCategories();
  const next = categories.map((category) => {
    if (category.name === cleanOldCategoryName) {
      return {
        ...category,
        subcategories: removeValue(category.subcategories, cleanSubcategoryName),
      };
    }
    if (category.name === cleanNewCategoryName) {
      return {
        ...category,
        subcategories: uniq([...category.subcategories, cleanSubcategoryName]),
      };
    }
    return category;
  });
  await saveCategoryCatalog(next);
}

export async function deleteDbCategory(name: string) {
  await updateGameRowsByCategoryName(name, null);

  const categories = await fetchDbCategories();
  await saveCategoryCatalog(categories.filter((category) => category.name !== name));
}

export async function deleteDbSubcategory(name: string) {
  await updateGameRowsBySubcategoryName(name, null);

  const categories = await fetchDbCategories();
  await saveCategoryCatalog(
    categories.map((category) => ({
      ...category,
      subcategories: removeValue(category.subcategories, name),
    })),
  );
}
