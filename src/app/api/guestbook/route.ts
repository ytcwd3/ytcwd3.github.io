import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const revalidate = 30;

const MEMORY_CACHE_DURATION = 30 * 1000;

let memoryCache = new Map<
  string,
  { data: unknown; timestamp: number }
>();

function cacheHeaders() {
  return {
    "Cache-Control": "public, max-age=10, s-maxage=30, stale-while-revalidate=300",
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.max(1, Math.min(50, parseInt(searchParams.get("pageSize") || "10", 10)));
  const fresh = searchParams.get("fresh") === "1";

  const cacheKey = `${page}:${pageSize}`;
  const now = Date.now();
  const cached = memoryCache.get(cacheKey);
  if (!fresh && cached && now - cached.timestamp < MEMORY_CACHE_DURATION) {
    return NextResponse.json(cached.data, { headers: cacheHeaders() });
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize;

  const { data, error } = await supabase
    .from("guestbook")
    .select("*")
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    return NextResponse.json(
      { error: true },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }

  const rows = data || [];
  const payload = {
    data: rows.slice(0, pageSize),
    hasMore: rows.length > pageSize,
  };
  memoryCache.set(cacheKey, { data: payload, timestamp: now });

  return NextResponse.json(payload, { headers: cacheHeaders() });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body?.name || "").trim();
    const message = String(body?.message || "").trim();

    if (!name || !message) {
      return NextResponse.json(
        { error: "Invalid payload" },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const { data: existing, error: checkError } = await supabase
      .from("guestbook")
      .select("id")
      .eq("name", name)
      .eq("message", message)
      .is("parent_id", null)
      .limit(1);

    if (checkError) {
      return NextResponse.json(
        { error: checkError.message },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );
    }

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { error: "duplicate" },
        { status: 409, headers: { "Cache-Control": "no-store" } },
      );
    }

    const { error } = await supabase
      .from("guestbook")
      .insert([{ name, message }]);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );
    }

    memoryCache.clear();
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Unknown error" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
