import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import type { HomeCategory } from "@/lib/categories";

export const revalidate = 300;

interface CategoryRow {
  id: number;
  name: string | null;
  sort_order: number | null;
}

interface SubcategoryRow {
  id: number;
  category_id: number;
  name: string | null;
  sort_order: number | null;
}

let memoryCache: { data: HomeCategory[]; timestamp: number } | null = null;
const MEMORY_CACHE_DURATION = 5 * 60 * 1000;

function buildHomeCategories(
  categories: CategoryRow[],
  subcategories: SubcategoryRow[],
): HomeCategory[] {
  const subcategoriesByCategory = new Map<number, SubcategoryRow[]>();

  for (const subcategory of subcategories) {
    const list = subcategoriesByCategory.get(subcategory.category_id) || [];
    list.push(subcategory);
    subcategoriesByCategory.set(subcategory.category_id, list);
  }

  return categories.map((category) => ({
    name: String(category.name || ""),
    tags: (subcategoriesByCategory.get(category.id) || [])
      .sort(
        (a, b) =>
          (a.sort_order ?? a.id) - (b.sort_order ?? b.id) ||
          a.id - b.id,
      )
      .map((subcategory) => String(subcategory.name || "")),
  }));
}

export async function GET() {
  const now = Date.now();

  if (memoryCache && now - memoryCache.timestamp < MEMORY_CACHE_DURATION) {
    return NextResponse.json(memoryCache.data, {
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=86400",
      },
    });
  }

  const [categoriesResult, subcategoriesResult] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, sort_order")
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("id", { ascending: true }),
    supabase
      .from("subcategories")
      .select("id, category_id, name, sort_order")
      .order("category_id", { ascending: true })
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("id", { ascending: true }),
  ]);

  if (categoriesResult.error || subcategoriesResult.error) {
    return NextResponse.json(
      { error: true },
      {
        status: 502,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  const data = buildHomeCategories(
    (categoriesResult.data || []) as CategoryRow[],
    (subcategoriesResult.data || []) as SubcategoryRow[],
  );

  memoryCache = { data, timestamp: now };

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=86400",
    },
  });
}
