import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { encryptData } from "@/lib/encrypt";

export async function GET(request: Request) {
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Encrypt the response data so it shows as garbled text in Network tab
  const encrypted = encryptData({ data, count });

  return new NextResponse(encrypted, {
    headers: {
      "Content-Type": "text/plain",
    },
  });
}