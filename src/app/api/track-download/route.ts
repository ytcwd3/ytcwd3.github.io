import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://mjrqvffiinflzdwnzvte.supabase.co";
const fallbackAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qcnF2ZmZpaW5mbHpkd256dnRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMzEwNzcsImV4cCI6MjA4OTgwNzA3N30.0jg4sfLSp8jxqY5NIRupjkZHG8BjpHFBrdLNKPyCLwA";

const client = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || fallbackAnonKey,
);

const PROVIDERS = new Set(["quark", "baidu", "thunder"]);

export async function POST(request: Request) {
  try {
    const { gameId, provider } = await request.json();

    if (!Number.isInteger(gameId) || gameId <= 0) {
      return Response.json({ error: "Invalid gameId" }, { status: 400 });
    }
    if (!PROVIDERS.has(provider)) {
      return Response.json({ error: "Invalid provider" }, { status: 400 });
    }

    const { error } = await client.rpc("record_download_click", {
      p_game_id: gameId,
      p_provider: provider,
    });

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (error: any) {
    return Response.json({ error: error.message || "Unknown error" }, { status: 500 });
  }
}
