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

export default function ImageMatchModal({ onClose, onDone }: ImageMatchModalProps) {
  const [step, setStep] = useState<"intro" | "loading" | "matching" | "done">("intro");
  const [results, setResults] = useState<MatchResult[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cancel, setCancel] = useState(false);
  const [totalGames, setTotalGames] = useState(0);

  const apiKey = process.env.NEXT_PUBLIC_RAWG_API_KEY;

  // 第一步：快速查询需要匹配的游戏数量
  async function getGamesCount(): Promise<number> {
    const { count, error } = await supabase
      .from("games")
      .select("id", { count: "exact", head: true })
      .or("image.is.null,image.eq.");

    if (error) throw error;
    return count || 0;
  }

  // 第二步：获取需要匹配的游戏
  async function getGamesWithoutImages(limit: number): Promise<Game[]> {
    const { data, error } = await supabase
      .from("games")
      .select("id, name")
      .or("image.is.null,image.eq.")
      .order("id", { ascending: true })
      .limit(limit);

    if (error) throw error;
    return (data as Game[]) || [];
  }

  async function startMatching() {
    setStep("loading");

    try {
      // 先查总数
      const count = await getGamesCount();
      setTotalGames(count);

      if (count === 0) {
        setStep("done");
        return;
      }

      // 限制每次处理数量，避免超时
      const LIMIT = 200;
      const games = await getGamesWithoutImages(LIMIT);

      setResults(games.map((g) => ({ name: g.name, status: "pending" as const })));
      setStep("matching");
      setCurrentIndex(0);
      setCancel(false);

      const cache: Record<string, string | null> = {};

      for (let i = 0; i < games.length; i++) {
        if (cancel) break;

        setCurrentIndex(i);
        const game = games[i];

        setResults((prev) =>
          prev.map((r, idx) => (idx === i ? { ...r, status: "pending" } : r)),
        );

        let imageUrl = cache[game.name];
        if (imageUrl === undefined) {
          try {
            const params = new URLSearchParams({
              key: apiKey || "",
              search: game.name,
              page_size: "1",
            });
            const res = await fetch(
              `https://api.rawg.io/api/games?${params.toString()}`,
            );
            const json = await res.json();

            const results_data = json.results as any[];
            if (results_data && results_data.length > 0) {
              const match = results_data[0];
              imageUrl =
                match.background_image ||
                match.background_image_additional ||
                null;
              if (!imageUrl && match.short_screenshots) {
                for (const shot of match.short_screenshots) {
                  if (shot.image) {
                    imageUrl = shot.image;
                    break;
                  }
                }
              }
            } else {
              imageUrl = null;
            }
            cache[game.name] = imageUrl;
          } catch {
            imageUrl = null;
            cache[game.name] = null;
          }

          // API 限速
          await new Promise((r) => setTimeout(r, 120));
        }

        if (imageUrl) {
          const { error } = await supabase
            .from("games")
            .update({ image: imageUrl })
            .eq("id", game.id);

          setResults((prev) =>
            prev.map((r, idx) =>
              idx === i
                ? { ...r, status: "success", image: imageUrl! }
                : r,
            ),
          );
        } else {
          setResults((prev) =>
            prev.map((r, idx) =>
              idx === i
                ? { ...r, status: "failed", message: "未找到匹配图片" }
                : r,
            ),
          );
        }
      }

      setStep("done");
    } catch (err: any) {
      alert("加载失败: " + err.message);
      setStep("intro");
    }
  }

  return (
    <>
      <div
        className="popup-mask modal-overlay"
        style={{ display: "flex" }}
        onClick={onClose}
      >
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
              <div style={{ textAlign: "center", padding: "30px 0" }}>
                <p style={{ fontSize: 36, marginBottom: 12 }}>🖼️</p>
                <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
                  基于 RAWG 游戏数据库自动匹配封面图
                </p>
                <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 20 }}>
                  每次处理 200 个游戏，匹配成功自动更新数据库
                </p>
                <button
                  onClick={startMatching}
                  style={{
                    padding: "10px 32px",
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
            )}

            {step === "loading" && (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <div className="loading" style={{ justifyContent: "center" }} />
                <p style={{ color: "var(--text-secondary)", marginTop: 12, fontSize: 14 }}>
                  正在查询数据（{totalGames} 个游戏待匹配）...
                </p>
              </div>
            )}

            {step === "matching" && (
              <div>
                {/* 进度 */}
                <div style={{ marginBottom: 12 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 12,
                      color: "var(--text-secondary)",
                      marginBottom: 4,
                    }}
                  >
                    <span>处理中 {currentIndex + 1} / {results.length}</span>
                    <span>
                      成功{" "}
                      <b style={{ color: "var(--success-color)" }}>
                        {results.filter((r) => r.status === "success").length}
                      </b>{" "}
                      / 失败{" "}
                      <b style={{ color: "var(--danger-color)" }}>
                        {results.filter((r) => r.status === "failed").length}
                      </b>
                    </span>
                  </div>
                  <div
                    style={{
                      height: 6,
                      background: "rgba(0,0,0,0.08)",
                      borderRadius: 3,
                      overflow: "hidden",
                    }}
                  >
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

                {/* 结果列表 */}
                <div
                  style={{
                    maxHeight: 280,
                    overflow: "auto",
                    border: "1px solid var(--border-light)",
                    borderRadius: 8,
                  }}
                >
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
                        {r.status === "success"
                          ? "✅"
                          : r.status === "failed"
                            ? "❌"
                            : "⏳"}
                      </span>
                      <span
                        style={{
                          flex: 1,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          color:
                            r.status === "failed"
                              ? "var(--danger-color)"
                              : r.status === "success"
                                ? "var(--success-color)"
                                : "var(--text-secondary)",
                        }}
                      >
                        {r.name}
                      </span>
                      {r.image && (
                        <img
                          src={r.image}
                          alt=""
                          style={{ width: 36, height: 24, objectFit: "cover", borderRadius: 3, flexShrink: 0 }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
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
                  {results.filter((r) => r.status === "success").length > 0 ? "🎉" : "😅"}
                </p>
                <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
                  匹配完成！
                </p>
                <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                  成功匹配{" "}
                  <b style={{ color: "var(--success-color)" }}>
                    {results.filter((r) => r.status === "success").length}
                  </b>{" "}
                  个 / 匹配失败{" "}
                  <b style={{ color: "var(--danger-color)" }}>
                    {results.filter((r) => r.status === "failed").length}
                  </b>{" "}
                  个 / 取消{" "}
                  <b style={{ color: "var(--warning-color)" }}>
                    {results.filter((r) => r.status === "pending").length}
                  </b>{" "}
                  个
                </p>
                <p style={{ color: "var(--text-tertiary)", fontSize: 12, marginTop: 8 }}>
                  每次处理 200 个，更多游戏可在结果页继续匹配
                </p>
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
              {step === "done" || step === "intro" ? "关闭" : "取消"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
