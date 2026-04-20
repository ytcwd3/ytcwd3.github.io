import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://mjrqvffiinflzdwnzvte.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qcnF2ZmZpaW5mbHpkd256dnRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMzEwNzcsImV4cCI6MjA4OTgwNzA3N30.0jg4sfLSp8jxqY5NIRupjkZHG8BjpHFBrdLNKPyCLwA";
const supabase = createClient(supabaseUrl, supabaseKey);
const RAWG_KEY = process.env.RAWG_API_KEY || process.env.NEXT_PUBLIC_RAWG_API_KEY || "";

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

// 通用 WordPress 站点图片提取
async function searchWPImage(name: string, baseUrl: string): Promise<string | null> {
  try {
    const res = await fetch(
      `${baseUrl}/wp-json/wp/v2/search?search=${encodeURIComponent(name)}&type=post&per_page=1`,
      { headers: { "User-Agent": "Mozilla/5.0" } },
    );
    if (!res.ok) return null;
    const json = await res.json();
    if (!json || json.length === 0) return null;

    const postId = json[0].id;
    const postRes = await fetch(
      `${baseUrl}/wp-json/wp/v2/posts/${postId}?_fields=featured_media,content`,
      { headers: { "User-Agent": "Mozilla/5.0" } },
    );
    if (!postRes.ok) {
      // 回退：直接从搜索结果提取图片URL（某些WP站点在搜索结果中包含图片信息）
      const firstResult = json[0];
      const title = firstResult.title?.rendered || "";
      // 尝试从URL猜测图片
      return null;
    }
    const postJson = await postRes.json();

    // 优先使用 featured_media URL
    if (postJson.featured_media && postJson.featured_media > 0) {
      try {
        const mediaRes = await fetch(
          `${baseUrl}/wp-json/wp/v2/media/${postJson.featured_media}?_fields=source_url,media_details`,
          { headers: { "User-Agent": "Mozilla/5.0" } },
        );
        if (mediaRes.ok) {
          const media = await mediaRes.json();
          if (media.source_url) return media.source_url;
          if (media.media_details?.sizes?.medium?.source_url) return media.media_details.sizes.medium.source_url;
          if (media.media_details?.sizes?.large?.source_url) return media.media_details.sizes.large.source_url;
          if (media.media_details?.sizes?.thumbnail?.source_url) return media.media_details.sizes.thumbnail.source_url;
        }
      } catch {}
    }

    // 回退：从 content 中提取第一个图片
    const content = postJson.content?.rendered || "";
    const imgMatch = content.match(/https?:\/\/[^\s"'<>]+\.(jpg|jpeg|png|webp)/i);
    if (imgMatch) return imgMatch[0];
  } catch {}
  return null;
}

// 蒸汽游戏宝库 WP REST API（使用 Steam CDN 图片，质量最高）
async function searchSteamBK(name: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://www.steambk.com/wp-json/wp/v2/search?search=${encodeURIComponent(name)}&type=post&per_page=1`,
      { headers: { "User-Agent": "Mozilla/5.0" } },
    );
    const json = await res.json();
    if (json && json.length > 0) {
      const postId = json[0].id;
      const postRes = await fetch(
        `https://www.steambk.com/wp-json/wp/v2/posts/${postId}?_fields=title,content`,
        { headers: { "User-Agent": "Mozilla/5.0" } },
      );
      const postJson = await postRes.json();
      const content = postJson.content?.rendered || "";
      // 优先 Steam header 图片
      const match = content.match(/https:\/\/shared\.cdn\.queniuqe\.com\/store_item_assets\/steam\/apps\/\d+\/[^"]+\.jpg/);
      if (match) return match[0];
      const anyMatch = content.match(/https:\/\/shared\.cdn\.queniuqe\.com\/[^"]+\.jpg/);
      return anyMatch ? anyMatch[0] : null;
    }
  } catch {}
  return null;
}

// PC 游戏额外图源（通用 WP 站点）
async function searchPCSources(name: string): Promise<string | null> {
  const sources = [
    "https://www.fzgamer.com",
    "https://www.laoguan777.com",
    "https://flysheep6.top",
    "https://www.gamer520.com",
    "https://www.ziyxfxs.top",
  ];

  for (const baseUrl of sources) {
    const img = await searchWPImage(name, baseUrl);
    if (img) return img;
  }
  return null;
}

// RAWG 搜索
async function searchRawg(name: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.rawg.io/api/games?key=${RAWG_KEY}&search=${encodeURIComponent(name)}&page_size=1&exclude=stores,genres,tags,developers,publishers,short_screenshots`,
    );
    const json = await res.json();
    if (json.results && json.results.length > 0) {
      const g = json.results[0];
      return (
        g.background_image ||
        g.background_image_additional ||
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
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const mode = url.searchParams.get("mode");

    let query = supabase.from("games").select("id", { count: "exact", head: true });
    if (mode === "all") {
      // 匹配全部游戏
    } else {
      // 只匹配未匹配游戏
      query = query.or("image.is.null,image.eq.");
    }
    const { count } = await query;

    return Response.json({ total: count || 0, mode: mode === "all" ? "all" : "unmatched" });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// 处理一批游戏
export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const mode = url.searchParams.get("mode");

    // 获取一批待匹配游戏
    let query = supabase.from("games").select("id, name, subcategory, image");
    if (mode === "all") {
      query = query.order("id", { ascending: true }).limit(BATCH_SIZE);
    } else {
      query = query.or("image.is.null,image.eq.").order("id", { ascending: true }).limit(BATCH_SIZE);
    }
    const { data: games, error } = await query;

    if (error) throw error;
    if (!games || games.length === 0) {
      return Response.json({ done: true, matched: 0, updated: 0, skipped: 0, remaining: 0 });
    }

    let matched = 0;
    let updated = 0;
    let skipped = 0;

    // 并行处理每批游戏
    const promises = games.map(async (game) => {
      let imageUrl: string | null = null;
      const isPC = isPCGame(game.subcategory || []);

      if (isPC) {
        // PC: Steam + steambk 并行先搜，再尝试其他WP站，最后RAWG
        const [steamImg, bkImg] = await Promise.all([
          searchSteam(game.name),
          searchSteamBK(game.name),
        ]);
        imageUrl = steamImg || bkImg;
        if (!imageUrl) {
          // Steam 和 steambk 都没找到，再试其他中文游戏站
          imageUrl = await searchPCSources(game.name);
        }
        if (!imageUrl) {
          // 最后尝试 RAWG
          imageUrl = await searchRawg(game.name);
        }
        await new Promise((r) => setTimeout(r, 150));
      } else {
        // 非PC: 先尝试 WP 站点，再 RAWG
        imageUrl = await searchPCSources(game.name);
        if (!imageUrl) {
          imageUrl = await searchRawg(game.name);
        }
        await new Promise((r) => setTimeout(r, 150));
      }

      if (imageUrl) {
        const isReMatch = mode === "all" && game.image;
        await supabase.from("games").update({ image: imageUrl }).eq("id", game.id);
        if (isReMatch) {
          return "updated";
        }
        return "matched";
      } else {
        if (mode === "all" && game.image) {
          return "skipped";
        }
        return "failed";
      }
    });

    const results = await Promise.all(promises);
    matched = results.filter((r) => r === "matched").length;
    updated = results.filter((r) => r === "updated").length;
    skipped = results.filter((r) => r === "skipped").length;
    const failed = results.filter((r) => r === "failed").length;

    // 获取剩余数量
    const { count: remaining } = mode === "all"
      ? { count: null }
      : await supabase.from("games").select("id", { count: "exact", head: true }).or("image.is.null,image.eq.");

    return Response.json({
      done: mode === "all" ? (games.length < BATCH_SIZE) : ((remaining || 0) === 0),
      matched,
      updated,
      skipped,
      failed,
      remaining: remaining || 0,
      batchSize: games.length,
      mode: mode === "all" ? "all" : "unmatched",
    });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
