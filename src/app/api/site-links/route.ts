import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const revalidate = 300;

interface SiteLinkRow {
  id: number;
  type: "tool" | "help" | "mascot" | null;
  name: string | null;
  url: string | null;
  created_at?: string | null;
}

const PIN_PRIORITY_PREFIX = "__pin_order__:";
const MEMORY_CACHE_DURATION = 5 * 60 * 1000;

let memoryCache = new Map<
  string,
  { data: SiteLinkRow[]; timestamp: number }
>();

function cacheKey(type: string) {
  return type || "all";
}

function cacheHeaders() {
  return {
    "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=86400",
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "all";
  const key = cacheKey(type);
  const now = Date.now();

  const cached = memoryCache.get(key);
  if (cached && now - cached.timestamp < MEMORY_CACHE_DURATION) {
    return NextResponse.json(cached.data, { headers: cacheHeaders() });
  }

  let query = supabase
    .from("site_links")
    .select("id, type, name, url, created_at")
    .order("id", { ascending: true });

  if (type === "pin-priority") {
    query = query.like("name", `${PIN_PRIORITY_PREFIX}%`);
  } else if (type === "tool" || type === "help" || type === "mascot") {
    query = query.eq("type", type).not("name", "like", `${PIN_PRIORITY_PREFIX}%`);
  } else if (type !== "all") {
    return NextResponse.json(
      { error: "Invalid type" },
      {
        status: 400,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: true },
      {
        status: 502,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  const rows = (data || []) as SiteLinkRow[];
  memoryCache.set(key, { data: rows, timestamp: now });

  return NextResponse.json(rows, { headers: cacheHeaders() });
}
