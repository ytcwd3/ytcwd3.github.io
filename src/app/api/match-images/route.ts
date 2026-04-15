import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://mjrqvffiinflzdwnzvte.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qcnF2ZmZpaW5mbHpkd256dnRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMzEwNzcsImV4cCI6MjA4OTgwNzA3N30.0jg4sfLSp8jxqY5NIRupjkZHG8BjpHFBrdLNKPyCLwA";
const supabase = createClient(supabaseUrl, supabaseKey);
const RAWG_KEY = process.env.RAWG_API_KEY || "";

// Steam 搜索（并行）
async function searchSteam(name: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(name)}&l=schinese&cc=CN&v=1`,
      { headers: { "User-Agent": "Mozilla/5.0" } },
    );
    const json = await res.json();
    if (json.items && json.items.length > 0) {
      return json.items[0].header_image || json.items[0].tiny_image || null;
    }
  } catch {}
  return null;
}

// RAWG 搜索（并行）
async function searchRawg(name: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.rawg.io/api/games?key=${RAWG_KEY}&search=${encodeURIComponent(name)}&page_size=1`,
    );
    const json = await res.json();
    if (json.results && json.results.length > 0) {
      const g = json.results[0];
      return (
        g.background_image ||
        g.background_image_additional ||
        (g.short_screenshots && g.short_screenshots[0]?.image) ||
        null
      );
    }
  } catch {}
  return null;
}

// 判断是否PC游戏
function isPCGame(subcategory: string[]): boolean {
  const pcSubs = ["必备软件", "各种合集", "网游单机", "横版过关", "平台跳跃",
    "战棋策略", "RPG", "双人", "射击", "动作", "经营", "魂类", "竞速运动",
    "潜行", "解谜", "格斗无双", "恐怖", "不正经", "小游戏", "修改器金手指", "互动影游"];
  return pcSubs.includes(subcategory?.[0] || "");
}

// 每批处理数量（60秒超时内可完成的数量）
const BATCH_SIZE = 30;

// 获取待匹配游戏总数
export async function GET() {
  try {
    const { count } = await supabase
      .from("games")
      .select("id", { count: "exact", head: true })
      .or("image.is.null,image.eq.");

    return Response.json({ total: count || 0 });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// 处理一批游戏
export async function POST() {
  try {
    // 获取一批待匹配游戏
    const { data: games, error } = await supabase
      .from("games")
      .select("id, name, subcategory")
      .or("image.is.null,image.eq.")
      .order("id", { ascending: true })
      .limit(BATCH_SIZE);

    if (error) throw error;
    if (!games || games.length === 0) {
      return Response.json({ done: true, matched: 0, remaining: 0 });
    }

    let matched = 0;
    let failed = 0;

    // 并行处理每批游戏（Steam和Rawg并行）
    const promises = games.map(async (game) => {
      let imageUrl: string | null = null;
      const isPC = isPCGame(game.subcategory || []);

      if (isPC) {
        // PC: Steam + Rawg 并行
        const [steamImg, rawgImg] = await Promise.all([
          searchSteam(game.name),
          searchRawg(game.name),
        ]);
        imageUrl = steamImg || rawgImg;
        // 限速
        await new Promise((r) => setTimeout(r, 100));
      } else {
        // 非PC: 只用Rawg
        imageUrl = await searchRawg(game.name);
        await new Promise((r) => setTimeout(r, 150));
      }

      if (imageUrl) {
        await supabase.from("games").update({ image: imageUrl }).eq("id", game.id);
        return "matched";
      } else {
        return "failed";
      }
    });

    const results = await Promise.all(promises);
    matched = results.filter((r) => r === "matched").length;
    failed = results.filter((r) => r === "failed").length;

    // 获取剩余数量
    const { count: remaining } = await supabase
      .from("games")
      .select("id", { count: "exact", head: true })
      .or("image.is.null,image.eq.");

    return Response.json({
      done: (remaining || 0) === 0,
      matched,
      failed,
      remaining: remaining || 0,
      batchSize: games.length,
    });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
