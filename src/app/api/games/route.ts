import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { encryptData } from "@/lib/encrypt";
import {
  validateRequest,
  checkRateLimit,
  getClientIP,
} from "@/lib/anti-scraping";

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

  const pageStart = (Math.max(1, page) - 1) * pageSize;
  const pageEnd = pageStart + pageSize - 1;

  let query = supabase.from("games").select("*", { count: "exact" });

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

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ data: [], count: 0, error: true });
  }

  // Encrypt the response data so it shows as garbled text in Network tab
  const encrypted = encryptData({ data, count });

  return new NextResponse(encrypted, {
    headers: {
      "Content-Type": "text/plain",
      "X-Protected": "1",
    },
  });
}