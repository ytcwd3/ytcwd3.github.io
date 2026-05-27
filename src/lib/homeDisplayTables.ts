import { supabase } from "./supabase";

export type HomeDisplayGroup = {
  id: number;
  name: string;
  subcategoryIds: number[];
};

type GroupRow = {
  id: number;
  name: string;
  sort_order: number | null;
};

type ItemRow = {
  group_id: number;
  subcategory_id: number;
  sort_order: number | null;
};

export async function fetchHomeDisplayGroups() {
  const [{ data: groupsData, error: groupsError }, { data: itemsData, error: itemsError }] =
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
    ]);

  if (groupsError) throw groupsError;
  if (itemsError) throw itemsError;

  const itemsByGroup = new Map<number, number[]>();
  for (const item of (itemsData || []) as ItemRow[]) {
    const list = itemsByGroup.get(item.group_id) || [];
    list.push(item.subcategory_id);
    itemsByGroup.set(item.group_id, list);
  }

  return ((groupsData || []) as GroupRow[]).map((group) => ({
    id: group.id,
    name: group.name,
    subcategoryIds: itemsByGroup.get(group.id) || [],
  }));
}

export async function saveHomeDisplayGroups(groups: HomeDisplayGroup[]) {
  const { data: existing, error: existingError } = await supabase
    .from("home_category_groups")
    .select("id");
  if (existingError) throw existingError;

  const existingIds = new Set((existing || []).map((row: any) => Number(row.id)));
  const nextIds = new Set(groups.filter((group) => group.id > 0).map((group) => group.id));

  for (const id of existingIds) {
    if (!nextIds.has(id)) {
      const { error } = await supabase.from("home_category_groups").delete().eq("id", id);
      if (error) throw error;
    }
  }

  for (const [index, group] of groups.entries()) {
    let groupId = group.id;
    if (groupId > 0) {
      const { error } = await supabase
        .from("home_category_groups")
        .update({ name: group.name.trim(), sort_order: index })
        .eq("id", groupId);
      if (error) throw error;
    } else {
      const { data, error } = await supabase
        .from("home_category_groups")
        .insert({ name: group.name.trim(), sort_order: index })
        .select("id")
        .single();
      if (error) throw error;
      groupId = data.id;
    }

    const { error: deleteItemsError } = await supabase
      .from("home_category_group_items")
      .delete()
      .eq("group_id", groupId);
    if (deleteItemsError) throw deleteItemsError;

    if (group.subcategoryIds.length > 0) {
      const { error: insertItemsError } = await supabase
        .from("home_category_group_items")
        .insert(
          group.subcategoryIds.map((subcategoryId, itemIndex) => ({
            group_id: groupId,
            subcategory_id: subcategoryId,
            sort_order: itemIndex,
          })),
        );
      if (insertItemsError) throw insertItemsError;
    }
  }
}
