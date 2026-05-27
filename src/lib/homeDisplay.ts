import { supabase } from "./supabase";

export type HomeCategory = {
  name: string;
  tags: string[];
};

type HomeGroupRow = {
  id: number;
  name: string;
  sort_order: number | null;
};

type HomeGroupItemRow = {
  group_id: number;
  subcategory_id: number;
  sort_order: number | null;
};

type CategoryRow = {
  id: number;
  name: string;
};

type SubcategoryRow = {
  id: number;
  category_id: number;
  name: string;
};

export async function fetchHomeCategories() {
  const [{ data: groupsData, error: groupsError }, { data: itemsData, error: itemsError }, { data: categoriesData, error: categoriesError }, { data: subcategoriesData, error: subcategoriesError }] =
    await Promise.all([
      supabase
        .from("home_category_groups")
        .select("id, name, sort_order")
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("id", { ascending: true }),
      supabase
        .from("home_category_group_items")
        .select("group_id, subcategory_id, sort_order")
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("id", { ascending: true }),
      supabase.from("categories").select("id, name"),
      supabase.from("subcategories").select("id, category_id, name"),
    ]);

  if (groupsError) throw groupsError;
  if (itemsError) throw itemsError;
  if (categoriesError) throw categoriesError;
  if (subcategoriesError) throw subcategoriesError;

  const categoriesById = new Map<number, CategoryRow>();
  const subcategoriesById = new Map<number, SubcategoryRow>();
  for (const category of (categoriesData || []) as CategoryRow[]) {
    categoriesById.set(category.id, category);
  }
  for (const subcategory of (subcategoriesData || []) as SubcategoryRow[]) {
    subcategoriesById.set(subcategory.id, subcategory);
  }

  const itemsByGroup = new Map<number, number[]>();
  for (const item of (itemsData || []) as HomeGroupItemRow[]) {
    const list = itemsByGroup.get(item.group_id) || [];
    list.push(item.subcategory_id);
    itemsByGroup.set(item.group_id, list);
  }

  const groups = (groupsData || []) as HomeGroupRow[];
  if (groups.length > 0) {
    return groups.map((group) => ({
      name: group.name,
      tags: (itemsByGroup.get(group.id) || [])
        .map((subcategoryId) => subcategoriesById.get(subcategoryId)?.name || "")
        .filter(Boolean),
    }));
  }

  const groupedByCategory = new Map<number, string[]>();
  for (const subcategory of subcategoriesById.values()) {
    const list = groupedByCategory.get(subcategory.category_id) || [];
    list.push(subcategory.name);
    groupedByCategory.set(subcategory.category_id, list);
  }

  return Array.from(categoriesById.values()).map((category) => ({
    name: category.name,
    tags: groupedByCategory.get(category.id) || [],
  }));
}
