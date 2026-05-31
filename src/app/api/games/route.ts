import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { encryptData } from "@/lib/encrypt";
import {
  validateRequest,
  checkRateLimit,
  getClientIP,
} from "@/lib/anti-scraping";

const PIN_PRIORITY_PREFIX = "__pin_order__:";
const MEMORY_CACHE_DURATION = 30 * 1000;
const responseCache = new Map<string, { body: string; timestamp: number }>();
let pinPriorityCache: { data: Record<number, number>; timestamp: number } | null = null;

type PinPriorityRow = {
  name: string | null;
  url: string | null;
};

function parsePinPriority(value: string | number | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }
  const parsed = Number(String(value ?? "").trim());
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.floor(parsed));
}

function getResponseHeaders() {
  return {
    "Content-Type": "text/plain",
    "X-Protected": "1",
    "Cache-Control": "public, max-age=30, s-maxage=120, stale-while-revalidate=600",
  };
}

async function fetchPinPriorityMap() {
  const now = Date.now();
  if (pinPriorityCache && now - pinPriorityCache.timestamp < 5 * 60 * 1000) {
    return pinPriorityCache.data;
  }

  const { data, error } = await supabase
    .from("site_links")
    .select("name, url")
    .like("name", `${PIN_PRIORITY_PREFIX}%`);

  if (error) {
    console.warn("置顶顺序加载失败，不阻塞游戏列表:", error);
    return {};
  }

  const map: Record<number, number> = {};
  for (const row of (data || []) as PinPriorityRow[]) {
    const name = String(row.name || "");
    if (!name.startsWith(PIN_PRIORITY_PREFIX)) continue;
    const id = Number(name.slice(PIN_PRIORITY_PREFIX.length));
    if (!Number.isInteger(id) || id <= 0) continue;
    map[id] = parsePinPriority(row.url);
  }

  pinPriorityCache = { data: map, timestamp: now };
  return map;
}

export async function GET(request: Request) {
  // 1. Anti-scraping validation
  const clientIP = getClientIP(request);

  // Check rate limit
  const rateLimitResult = checkRateLimit(clientIP);
  if (!rateLimitResult.valid) {
    return new NextResponse("Rate limit exceeded", { status: 429 });
  }

  // Validate request headers
  const validation = validateRequest(request);
  if (!validation.valid) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // 2. Process query
  const { searchParams } = new URL(request.url);
  const tagValue = searchParams.get("tag");
  const keyword = searchParams.get("keyword");
  const page = parseInt(searchParams.get("page") || "1", 10);
  const sort = searchParams.get("sort") || "updatedate";
  const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
  const includePins = searchParams.get("pins") !== "0";
  const cacheKey = JSON.stringify({
    tagValue,
    keyword,
    page: Math.max(1, page),
    sort,
    pageSize,
    includePins,
  });
  const now = Date.now();
  const cached = responseCache.get(cacheKey);
  if (cached && now - cached.timestamp < MEMORY_CACHE_DURATION) {
    return new NextResponse(cached.body, { headers: getResponseHeaders() });
  }

  const pageStart = (Math.max(1, page) - 1) * pageSize;
  const pageEnd = pageStart + pageSize - 1;

  let query = supabase
    .from("games")
    .select(
      "id, name, category, subcategory, code, unzipcode, quarkpan, quarkcode, baidupan, baiducode, thunderpan, thundercode, updatedate, image, video, pinned",
      { count: "estimated" },
    );

  if (tagValue) {
    query = query.contains("subcategory", [tagValue]);
  }
  if (keyword) {
    query = query.ilike("name", `%${keyword}%`);
  }

  if (sort === "hot") {
    query = query.order("hot", { ascending: false });
  } else {
    query = query.order("updatedate", { ascending: false });
  }

  query = query.range(pageStart, pageEnd);

  const [gamesResult, pinPriorityMap] = await Promise.all([
    query,
    includePins ? fetchPinPriorityMap() : Promise.resolve({} as Record<number, number>),
  ]);
  const { data, count, error } = gamesResult;

  if (error) {
    return NextResponse.json({ data: [], count: 0, error: true });
  }

  // Encrypt the response data so it shows as garbled text in Network tab
  const encrypted = encryptData({ data, count, pinPriorityMap });
  responseCache.set(cacheKey, { body: encrypted, timestamp: now });

  return new NextResponse(encrypted, {
    headers: getResponseHeaders(),
  });
}
