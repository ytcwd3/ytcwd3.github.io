import { supabase } from "./supabase";

// games 游戏表
// 保存游戏主体信息，包括名称、分类、网盘地址、更新时间、封面、视频和置顶状态。
export interface Game {
  id: number;
  name: string;
  category: string[];
  subcategory: string[];
  category_id?: number | null;
  subcategory_id?: number | null;
  code: string;
  unzipcode: string;
  quarkpan: string;
  quarkcode: string;
  baidupan: string;
  baiducode: string;
  thunderpan: string;
  thundercode: string;
  updatedate: string;
  image?: string;
  video?: string;
  pinned?: boolean;
  pinPriority?: number | null;
  hot?: number;
}

type GameCategoryRow = {
  id: number;
  category: string[] | null;
  subcategory: string[] | null;
  category_id?: number | null;
  subcategory_id?: number | null;
};

const BATCH_SIZE = 1000;

// 读取 games 中的分类字段，用于分类改名、迁移和删除时同步游戏数据。
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

// 批量更新 games 中符合条件的分类字段。
export async function updateGameRows(
  matcher: (row: GameCategoryRow) => boolean,
  updater: (
    row: GameCategoryRow,
  ) => Partial<
    Pick<
      GameCategoryRow,
      "category" | "subcategory" | "category_id" | "subcategory_id"
    >
  >,
) {
  const rows = (await fetchGameCategoryRows()).filter(matcher);
  for (const row of rows) {
    const patch = updater(row);
    const { error } = await supabase
      .from("games")
      .update({
        ...(patch.category !== undefined ? { category: patch.category } : {}),
        ...(patch.subcategory !== undefined
          ? { subcategory: patch.subcategory }
          : {}),
        ...(patch.category_id !== undefined
          ? { category_id: patch.category_id }
          : {}),
        ...(patch.subcategory_id !== undefined
          ? { subcategory_id: patch.subcategory_id }
          : {}),
      })
      .eq("id", row.id);
    if (error) throw error;
  }
}
