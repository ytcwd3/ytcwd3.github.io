import { supabase } from "./supabase";

export type HomeCategory = {
  name: string;
  tags: string[];
};

export type HomeDisplaySubcategory = {
  id: number;
  name: string;
  dbCategoryId: number;
  dbCategoryName: string;
  homeGroupId: number | null;
  sortOrder: number;
};

export type HomeDisplayGroup = {
  id: number;
  name: string;
  sortOrder: number;
  subcategories: HomeDisplaySubcategory[];
};

type GroupRow = {
  id: number;
  name: string;
  sort_order: number | null;
};

type ItemRow = {
  id: number;
  group_id: number;
  subcategory_id: number;
  sort_order: number | null;
};

type SubcategoryRow = {
  id: number;
  name: string;
  category_id: number;
  sort_order: number | null;
  categories?: {
    id: number;
    name: string;
  } | { id: number; name: string }[] | null;
};

type HomeCategoryItemRow = {
  group_id: number;
  sort_order: number | null;
  subcategory_id?: number | null;
  subcategories?: {
    id: number;
    name: string;
  } | { id: number; name: string }[] | null;
};

function parseTags(value: unknown) {
  if (Array.isArray(value)) return uniqTags(value.map((tag) => String(tag)).filter(Boolean));
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return uniqTags(parsed.map((tag) => String(tag)).filter(Boolean));
      }
    } catch {
      return value ? [value] : [];
    }
  }
  return [];
}

function uniqTags(tags: string[]) {
  return Array.from(new Set(tags.map((tag) => tag.trim()).filter(Boolean)));
}

function normalizeHomeCategoryRows(value: unknown): any[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return normalizeHomeCategoryRows(record.get_home_categories_fast || record.data || record.result);
  }
  return [];
}

function bySortThenId<T extends { sortOrder: number; id: number }>(a: T, b: T) {
  const sortDiff = a.sortOrder - b.sortOrder;
  return sortDiff !== 0 ? sortDiff : a.id - b.id;
}

async function fetchHomeGroupsRaw() {
  const { data, error } = await supabase
    .from("home_category_groups")
    .select("id, name, sort_order")
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("id", { ascending: true });
  if (error) throw error;
  return (data || []) as GroupRow[];
}

async function fetchHomeItemsRaw() {
  const { data, error } = await supabase
    .from("home_category_group_items")
    .select("id, group_id, subcategory_id, sort_order")
    .order("group_id", { ascending: true })
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("id", { ascending: true });
  if (error) throw error;
  return (data || []) as ItemRow[];
}

export async function fetchAllHomeDisplaySubcategories() {
  const { data, error } = await supabase
    .from("subcategories")
    .select("id, name, category_id, sort_order, categories(id, name)")
    .order("category_id", { ascending: true })
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("id", { ascending: true });
  if (error) throw error;

  return ((data || []) as unknown as SubcategoryRow[]).map((row) => {
    const category = Array.isArray(row.categories) ? row.categories[0] : row.categories;
    return {
      id: row.id,
      name: row.name,
      dbCategoryId: row.category_id,
      dbCategoryName: category?.name || "",
      homeGroupId: null,
      sortOrder: row.sort_order ?? row.id,
    };
  });
}

export async function fetchHomeDisplayGroups() {
  const [groupsRaw, itemsRaw, subcategories] = await Promise.all([
    fetchHomeGroupsRaw(),
    fetchHomeItemsRaw(),
    fetchAllHomeDisplaySubcategories(),
  ]);

  const subcategoryById = new Map(subcategories.map((item) => [item.id, item]));
  const homeGroupBySubcategoryId = new Map<number, number>();
  const itemSortBySubcategoryId = new Map<number, number>();

  for (const item of itemsRaw) {
    homeGroupBySubcategoryId.set(item.subcategory_id, item.group_id);
    itemSortBySubcategoryId.set(item.subcategory_id, item.sort_order ?? item.id);
  }

  const groups: HomeDisplayGroup[] = groupsRaw
    .map((group) => ({
      id: group.id,
      name: group.name,
      sortOrder: group.sort_order ?? group.id,
      subcategories: itemsRaw
        .filter((item) => item.group_id === group.id)
        .map((item) => {
          const subcategory = subcategoryById.get(item.subcategory_id);
          if (!subcategory) return null;
          return {
            ...subcategory,
            homeGroupId: group.id,
            sortOrder: item.sort_order ?? subcategory.sortOrder,
          };
        })
        .filter(Boolean) as HomeDisplaySubcategory[],
    }))
    .sort(bySortThenId);

  return {
    groups: groups.map((group) => ({
      ...group,
      subcategories: group.subcategories.sort(bySortThenId),
    })),
    subcategories: subcategories.map((subcategory) => ({
      ...subcategory,
      homeGroupId: homeGroupBySubcategoryId.get(subcategory.id) ?? null,
      sortOrder: itemSortBySubcategoryId.get(subcategory.id) ?? subcategory.sortOrder,
    })),
  };
}

export async function fetchHomeCategories() {
  const { data: rpcData, error: rpcError } = await supabase.rpc("get_home_categories_fast");
  const rpcRows = !rpcError ? normalizeHomeCategoryRows(rpcData) : [];
  if (rpcRows.length > 0) {
    const categories = rpcRows.map((item: any) => ({
      name: String(item.name || ""),
      tags: parseTags(item.tags),
    })).filter((category) => category.name);
    if (categories.length === 0 || categories.some((category) => category.tags.length > 0)) {
      return categories;
    }
  }

  const [groupsRaw, { data: itemsData, error: itemsError }] = await Promise.all([
    fetchHomeGroupsRaw(),
    supabase
      .from("home_category_group_items")
      .select("group_id, subcategory_id, sort_order, subcategories(id, name)")
      .order("group_id", { ascending: true })
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("id", { ascending: true }),
  ]);
  if (itemsError) throw itemsError;

  const tagsByGroupId = new Map<number, string[]>();
  const unresolvedRows: HomeCategoryItemRow[] = [];
  const itemRows = (itemsData || []) as unknown as HomeCategoryItemRow[];
  for (const row of itemRows) {
    const subcategory = Array.isArray(row.subcategories) ? row.subcategories[0] : row.subcategories;
    if (!subcategory?.name) {
      unresolvedRows.push(row);
      continue;
    }
    const list = tagsByGroupId.get(row.group_id) || [];
    tagsByGroupId.set(row.group_id, uniqTags([...list, subcategory.name]));
  }

  if (unresolvedRows.length > 0) {
    const ids = Array.from(
      new Set(
        unresolvedRows
          .map((row) => row.subcategory_id)
          .filter((id): id is number => typeof id === "number"),
      ),
    );
    if (ids.length > 0) {
      const { data: subcategoryRows, error: subcategoryError } = await supabase
        .from("subcategories")
        .select("id, name")
        .in("id", ids);
      if (subcategoryError) throw subcategoryError;
      const subcategoryNameById = new Map(
        (subcategoryRows || []).map((row: any) => [Number(row.id), String(row.name || "")]),
      );

      for (const row of unresolvedRows) {
        if (!row.subcategory_id) continue;
        const name = subcategoryNameById.get(row.subcategory_id);
        if (!name) continue;
        const list = tagsByGroupId.get(row.group_id) || [];
        tagsByGroupId.set(row.group_id, uniqTags([...list, name]));
      }
    }
  }

  const groups = groupsRaw
    .map((group) => ({
      id: group.id,
      name: group.name,
      sortOrder: group.sort_order ?? group.id,
      subcategories: [],
    }))
    .sort(bySortThenId);

  return groups.map((group) => ({
    name: group.name,
    tags: tagsByGroupId.get(group.id) || [],
  }));
}

async function getNextHomeGroupSortOrder() {
  const { data, error } = await supabase
    .from("home_category_groups")
    .select("sort_order")
    .order("sort_order", { ascending: false, nullsFirst: false })
    .limit(1);
  if (error) throw error;
  const current = data?.[0]?.sort_order;
  return typeof current === "number" ? current + 1 : 0;
}

export async function addHomeDisplayGroup(name: string) {
  const cleanName = name.trim();
  if (!cleanName) throw new Error("首页主分类名称不能为空");

  const { data: existing, error: existingError } = await supabase
    .from("home_category_groups")
    .select("id")
    .eq("name", cleanName)
    .limit(1);
  if (existingError) throw existingError;
  if (existing && existing.length > 0) throw new Error("首页主分类已存在");

  const sortOrder = await getNextHomeGroupSortOrder();
  const { error } = await supabase.from("home_category_groups").insert({
    name: cleanName,
    sort_order: sortOrder,
  });
  if (error) throw error;
}

export async function renameHomeDisplayGroup(groupId: number, oldName: string, newName: string) {
  const cleanName = newName.trim();
  if (!cleanName) throw new Error("首页主分类名称不能为空");
  if (cleanName === oldName) return;

  const { data: existing, error: existingError } = await supabase
    .from("home_category_groups")
    .select("id")
    .eq("name", cleanName)
    .neq("id", groupId)
    .limit(1);
  if (existingError) throw existingError;
  if (existing && existing.length > 0) throw new Error("首页主分类已存在");

  const { error } = await supabase
    .from("home_category_groups")
    .update({ name: cleanName })
    .eq("id", groupId);
  if (error) throw error;
}

export async function deleteHomeDisplayGroup(groupId: number) {
  const { error } = await supabase
    .from("home_category_groups")
    .delete()
    .eq("id", groupId);
  if (error) throw error;
}

export async function updateHomeDisplayGroupSort(groups: HomeDisplayGroup[]) {
  for (const [index, group] of groups.entries()) {
    const { error } = await supabase
      .from("home_category_groups")
      .update({ sort_order: group.sortOrder ?? index })
      .eq("id", group.id);
    if (error) throw error;
  }
}

export async function saveHomeDisplayGroupItems(groupId: number, subcategoryIds: number[]) {
  const uniqueIds = Array.from(new Set(subcategoryIds));

  if (uniqueIds.length > 0) {
    const { error: removeFromOtherGroupsError } = await supabase
      .from("home_category_group_items")
      .delete()
      .in("subcategory_id", uniqueIds);
    if (removeFromOtherGroupsError) throw removeFromOtherGroupsError;
  }

  const { error: removeCurrentError } = await supabase
    .from("home_category_group_items")
    .delete()
    .eq("group_id", groupId);
  if (removeCurrentError) throw removeCurrentError;

  if (uniqueIds.length === 0) return;

  const rows = uniqueIds.map((subcategoryId, index) => ({
    group_id: groupId,
    subcategory_id: subcategoryId,
    sort_order: index,
  }));

  const { error } = await supabase.from("home_category_group_items").insert(rows);
  if (error) throw error;
}
