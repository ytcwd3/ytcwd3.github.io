import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface SiteLinkRow {
  id: number;
  type: "tool" | "help" | "mascot" | null;
  name: string | null;
  url: string | null;
  created_at?: string | null;
}

const PIN_PRIORITY_PREFIX = "__pin_order__:";
function isInternalSiteLink(row: SiteLinkRow) {
  return String(row.name || "").startsWith("__");
}

function cacheHeaders() {
  return {
    "Cache-Control": "no-store",
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "all";

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

  const rows =
    type === "pin-priority"
      ? ((data || []) as SiteLinkRow[])
      : ((data || []) as SiteLinkRow[]).filter((row) => !isInternalSiteLink(row));

  return NextResponse.json(rows, { headers: cacheHeaders() });
}
