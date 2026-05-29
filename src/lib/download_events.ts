import { supabase } from "./supabase";

// download_events 下载统计
// 每次点击下载按钮时写入一条记录，用于统计游戏在不同平台的下载行为。
export interface DownloadEvent {
  id: number;
  game_id: number;
  platform: string;
  created_at: string;
}

// 向 download_events 写入一条下载统计。
export async function trackDownload(gameId: number, platform: string) {
  const { error } = await supabase
    .from("download_events")
    .insert({ game_id: gameId, platform });
  return { error };
}
