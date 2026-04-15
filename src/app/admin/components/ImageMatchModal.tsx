"use client";

import { useState } from "react";
import { supabase, Game } from "@/lib/supabase";

interface ImageMatchModalProps {
  onClose: () => void;
  onDone: () => void;
}

interface MatchResult {
  name: string;
  status: "pending" | "success" | "failed";
  image?: string;
  message?: string;
}

// Steam 搜索（PC游戏优先）
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

// RAWG 搜索（备用）
const RAWG_KEY = process.env.NEXT_PUBLIC_RAWG_API_KEY || "";
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

// 判断游戏平台
function isPCGame(subcategory: string[]): boolean {
  const sub = subcategory?.[0] || "";
  // PC分类的子分类
  const pcSubs = ["必备软件", "各种合集", "网游单机", "横版过关", "平台跳跃",
    "战棋策略", "RPG", "双人", "射击", "动作", "经营", "魂类", "竞速运动",
    "潜行", "解谜", "格斗无双", "恐怖", "不正经", "小游戏", "修改器金手指", "互动影游"];
  return pcSubs.includes(sub);
}

// Steam 匹配策略说明
const STRATEGIES = [
  { icon: "🎮", name: "PC游戏", desc: "优先 Steam → 备用 RAWG", platforms: "PC分类" },
  { icon: "🕹️", name: "NS/掌机/索尼", desc: "使用 RAWG 搜索", platforms: "NS、3DS、GBA、PSP等" },
];

export default function ImageMatchModal({ onClose, onDone }: ImageMatchModalProps) {
  const [step, setStep] = useState<"intro" | "loading" | "matching" | "done">("intro");
  const [results, setResults] = useState<MatchResult[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cancel, setCancel] = useState(false);

  async function getGamesWithoutImages(limit: number): Promise<Game[]> {
    const { data, error } = await supabase
      .from("games")
      .select("id, name, category, subcategory")
      .or("image.is.null,image.eq.")
      .order("id", { ascending: true })
      .limit(limit);

    if (error) throw error;
    return (data as Game[]) || [];
  }

  async function startMatching() {
    setStep("loading");

    try {
      const LIMIT = 200;
      const games = await getGamesWithoutImages(LIMIT);

      if (games.length === 0) {
        setStep("done");
        return;
      }

      setResults(games.map((g) => ({ name: g.name, status: "pending" as const })));
      setStep("matching");
      setCurrentIndex(0);
      setCancel(false);

      for (let i = 0; i < games.length; i++) {
        if (cancel) break;

        setCurrentIndex(i);
        const game = games[i];

        setResults((prev) =>
          prev.map((r, idx) => (idx === i ? { ...r, status: "pending" } : r)),
        );

        let imageUrl: string | null = null;
        const sub = game.subcategory || [];
        const isPC = isPCGame(sub);

        if (isPC) {
          // PC游戏先搜Steam，再备用Rawg
          imageUrl = await searchSteam(game.name);
          if (!imageUrl) {
            await new Promise((r) => setTimeout(r, 200));
            imageUrl = await searchRawg(game.name);
          }
        } else {
          // 非PC用Rawg
          imageUrl = await searchRawg(game.name);
        }

        // RAWG限速
        await new Promise((r) => setTimeout(r, 150));

        if (imageUrl) {
          await supabase.from("games").update({ image: imageUrl }).eq("id", game.id);
          setResults((prev) =>
            prev.map((r, idx) =>
              idx === i ? { ...r, status: "success", image: imageUrl! } : r,
            ),
          );
        } else {
          setResults((prev) =>
            prev.map((r, idx) =>
              idx === i ? { ...r, status: "failed", message: "未找到" } : r,
            ),
          );
        }
      }

      setStep("done");
    } catch (err: any) {
      alert("失败: " + err.message);
      setStep("intro");
    }
  }

  const success = results.filter((r) => r.status === "success").length;
  const failed = results.filter((r) => r.status === "failed").length;
  const pending = results.filter((r) => r.status === "pending").length;

  return (
    <>
      <div className="popup-mask modal-overlay" style={{ display: "flex" }} onClick={onClose}>
        <div
          className="popup-content modal-content"
          style={{ maxWidth: 680, maxHeight: "85vh", display: "flex", flexDirection: "column" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
              paddingBottom: 12,
              borderBottom: "1px solid var(--border-light)",
              flexShrink: 0,
            }}
          >
            <h2
              style={{
                fontSize: "16px",
                fontWeight: 700,
                background: "linear-gradient(90deg, var(--primary-color), var(--accent-color))",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              🎨 批量匹配图片
            </h2>
            <button onClick={onClose} className="close-btn">×</button>
          </div>

          {/* Body */}
          <div style={{ flex: 1, overflow: "auto" }}>
            {step === "intro" && (
              <div style={{ padding: "10px 0" }}>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
                  匹配策略说明：
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
                  {STRATEGIES.map((s) => (
                    <div
                      key={s.name}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 14px",
                        background: "rgba(0,0,0,0.03)",
                        borderRadius: 8,
                        border: "1px solid var(--border-light)",
                      }}
                    >
                      <span style={{ fontSize: 20 }}>{s.icon}</span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</div>
                        <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{s.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 20 }}>
                  每次处理 200 个游戏，中文名搜不到可手动补充
                </p>
                <div style={{ textAlign: "center" }}>
                  <button
                    onClick={startMatching}
                    style={{
                      padding: "10px 40px",
                      background: "linear-gradient(90deg, #2563eb, #7c3aed)",
                      color: "white",
                      border: "none",
                      borderRadius: "var(--radius-md)",
                      cursor: "pointer",
                      fontSize: 15,
                      fontWeight: 600,
                      boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
                    }}
                  >
                    开始匹配
                  </button>
                </div>
              </div>
            )}

            {step === "loading" && (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <div className="loading" style={{ justifyContent: "center" }} />
                <p style={{ color: "var(--text-secondary)", marginTop: 12, fontSize: 14 }}>
                  正在加载待匹配游戏...
                </p>
              </div>
            )}

            {step === "matching" && (
              <div>
                {/* 进度条 */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>
                    <span>处理中 {currentIndex + 1} / {results.length}</span>
                    <span>
                      成功 <b style={{ color: "var(--success-color)" }}>{success}</b>
                      {" "}/ 失败 <b style={{ color: "var(--danger-color)" }}>{failed}</b>
                    </span>
                  </div>
                  <div style={{ height: 6, background: "rgba(0,0,0,0.08)", borderRadius: 3, overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${((currentIndex + 1) / results.length) * 100}%`,
                        background: "linear-gradient(90deg, #2563eb, #7c3aed)",
                        borderRadius: 3,
                        transition: "width 0.2s",
                      }}
                    />
                  </div>
                </div>

                {/* 当前项 */}
                {results[currentIndex] && (
                  <div
                    style={{
                      padding: "8px 12px",
                      background: "rgba(37,99,235,0.05)",
                      borderRadius: 8,
                      marginBottom: 12,
                      fontSize: 13,
                      border: "1px solid rgba(37,99,235,0.1)",
                    }}
                  >
                    正在匹配：<b>{results[currentIndex].name}</b>
                  </div>
                )}

                {/* 结果列表（只显示最近10条）*/}
                <div style={{ maxHeight: 280, overflow: "auto", border: "1px solid var(--border-light)", borderRadius: 8 }}>
                  {results.slice(Math.max(0, currentIndex - 10), currentIndex + 1).map((r, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "5px 12px",
                        borderBottom: "1px solid var(--border-light)",
                        fontSize: 12,
                      }}
                    >
                      <span style={{ fontSize: 13 }}>
                        {r.status === "success" ? "✅" : r.status === "failed" ? "❌" : "⏳"}
                      </span>
                      <span
                        style={{
                          flex: 1,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          color: r.status === "failed" ? "var(--danger-color)"
                            : r.status === "success" ? "var(--success-color)" : "var(--text-secondary)",
                        }}
                      >
                        {r.name}
                      </span>
                      {r.image && (
                        <img
                          src={r.image}
                          alt=""
                          style={{ width: 36, height: 24, objectFit: "cover", borderRadius: 3, flexShrink: 0 }}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      )}
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setCancel(true)}
                  style={{
                    marginTop: 12,
                    padding: "8px 16px",
                    background: "rgba(255,255,255,0.9)",
                    color: "var(--danger-color)",
                    border: "1px solid var(--danger-color)",
                    borderRadius: "var(--radius-sm)",
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  取消
                </button>
              </div>
            )}

            {step === "done" && (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <p style={{ fontSize: 36, marginBottom: 8 }}>
                  {success > 0 ? "🎉" : "😅"}
                </p>
                <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>匹配完成！</p>
                <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                  成功 <b style={{ color: "var(--success-color)" }}>{success}</b>{" "}
                  / 失败 <b style={{ color: "var(--danger-color)" }}>{failed}</b>
                  {pending > 0 && ` / 取消 <b style={{color:"var(--warning-color)"}}>${pending}</b>`}
                </p>
                {failed > 0 && (
                  <p style={{ color: "var(--text-tertiary)", fontSize: 12, marginTop: 8 }}>
                    失败的游戏大多为中文名，可手动去 Steam/Rawg 搜索补充图片
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
              marginTop: 16,
              paddingTop: 12,
              borderTop: "1px solid var(--border-light)",
              flexShrink: 0,
            }}
          >
            <button
              onClick={onClose}
              style={{
                padding: "8px 20px",
                background: "rgba(255,255,255,0.9)",
                color: "var(--text-secondary)",
                border: "1px solid var(--border-light)",
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
