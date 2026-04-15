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
  const [step, setStep] = useState<"loading" | "matching" | "done">("loading");
  const [results, setResults] = useState<MatchResult[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cancel, setCancel] = useState(false);

  const apiKey = process.env.NEXT_PUBLIC_RAWG_API_KEY;

  async function startMatching() {
    // 拉取所有没有图片的游戏
    const gamesWithoutImages: Game[] = [];
    const BATCH = 1000;
    let page = 0;

    while (true) {
      const from = page * BATCH;
      const to = from + BATCH - 1;
      const { data, error } = await supabase
        .from("games")
        .select("*")
        .or(`image.is.null,image.eq.`)
        .order("id", { ascending: true })
        .range(from, to);

      if (error || !data || data.length === 0) break;
      gamesWithoutImages.push(...(data as Game[]));
      if (data.length < BATCH) break;
      page++;
    }

    if (gamesWithoutImages.length === 0) {
      setResults([]);
      setStep("done");
      return;
    }

    // 初始化结果
    setResults(gamesWithoutImages.map((g) => ({ name: g.name, status: "pending" })));
    setStep("matching");
    setCurrentIndex(0);
    setCancel(false);

    let matched = 0;
    let failed = 0;
    const cache: Record<string, string | null> = {};

    for (let i = 0; i < gamesWithoutImages.length; i++) {
      if (cancel) break;

      setCurrentIndex(i);
      const game = gamesWithoutImages[i];

      // 更新状态为处理中
      setResults((prev) =>
        prev.map((r, idx) => (idx === i ? { ...r, status: "pending" } : r)),
      );

      // 先查缓存
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

          // 优先取 background_image，其次 screenshots 截图
          const results_data = json.results as any[];
          if (results_data && results_data.length > 0) {
            const match = results_data[0];
            imageUrl = match.background_image || match.background_image_additional || null;
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

        // API 限速，每秒不超过 10 个请求
        await new Promise((r) => setTimeout(r, 120));
      }

      if (imageUrl) {
        // 更新数据库
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
        matched++;
      } else {
        setResults((prev) =>
          prev.map((r, idx) =>
            idx === i
              ? { ...r, status: "failed", message: "未找到匹配图片" }
              : r,
          ),
        );
        failed++;
      }
    }

    setStep("done");
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
            {step === "loading" && (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <div className="loading" style={{ justifyContent: "center" }} />
                <p style={{ color: "var(--text-secondary)", marginTop: 12, fontSize: 14 }}>
                  正在加载数据...
                </p>
              </div>
            )}

            {step === "matching" && (
              <div>
                {/* 进度条 */}
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
                      {results.filter((r) => r.status === "success").length}{" "}
                      / 失败{" "}
                      {results.filter((r) => r.status === "failed").length}
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
                        background: "linear-gradient(90deg, var(--primary-color), var(--accent-color))",
                        borderRadius: 3,
                        transition: "width 0.2s",
                      }}
                    />
                  </div>
                </div>

                {/* 当前处理项 */}
                {results[currentIndex] && (
                  <div
                    style={{
                      padding: "8px 12px",
                      background: "rgba(147,51,234,0.05)",
                      borderRadius: 8,
                      marginBottom: 12,
                      fontSize: 13,
                      border: "1px solid rgba(147,51,234,0.1)",
                    }}
                  >
                    正在匹配：<b>{results[currentIndex].name}</b>
                  </div>
                )}

                {/* 结果列表（只显示失败和刚成功的）*/}
                <div
                  style={{
                    maxHeight: 300,
                    overflow: "auto",
                    border: "1px solid var(--border-light)",
                    borderRadius: 8,
                  }}
                >
                  {results.map((r, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "6px 12px",
                        borderBottom: i < results.length - 1 ? "1px solid var(--border-light)" : "none",
                        fontSize: 12,
                        opacity: r.status === "pending" && i < currentIndex ? 0.5 : 1,
                      }}
                    >
                      <span style={{ fontSize: 14 }}>
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
                        {r.status === "failed" && r.message && (
                          <span style={{ color: "var(--text-tertiary)" }}>
                            {" "}— {r.message}
                          </span>
                        )}
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
                {results.length === 0 ? (
                  <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
                    所有游戏已有图片，无需匹配 🎉
                  </p>
                ) : (
                  <>
                    <p style={{ fontSize: 36, marginBottom: 8 }}>
                      {results.filter((r) => r.status === "success").length > 0
                        ? "🎉"
                        : "😅"}
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
                  </>
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
              {step === "done" ? "关闭" : "取消"}
            </button>
            {step === "loading" && (
              <button
                onClick={startMatching}
                style={{
                  padding: "8px 20px",
                  background: "linear-gradient(90deg, var(--secondary-color), var(--primary-color))",
                  color: "white",
                  border: "none",
                  borderRadius: "var(--radius-sm)",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                开始匹配
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
