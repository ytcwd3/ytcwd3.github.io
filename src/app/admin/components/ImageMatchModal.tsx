"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface MatchResult {
  done: boolean;
  matched: number;
  updated: number;
  skipped: number;
  failed: number;
  remaining: number;
  batchSize: number;
  mode: string;
}

export default function ImageMatchModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [step, setStep] = useState<"intro" | "loading" | "matching" | "done">("intro");
  const [mode, setMode] = useState<"unmatched" | "all">("unmatched");
  const [status, setStatus] = useState({ matched: 0, updated: 0, skipped: 0, failed: 0, total: 0 });
  const [remaining, setRemaining] = useState(0);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [unmatchedTotal, setUnmatchedTotal] = useState(0);
  const runningRef = useRef(true);
  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runBatch = useCallback(async () => {
    if (!runningRef.current) return;

    try {
      const res = await fetch(`/api/match-images?mode=${mode}`, { method: "POST" });
      const json: MatchResult & { error?: string } = await res.json();

      if (json.error) {
        alert("匹配出错: " + json.error);
        setStep("intro");
        return;
      }

      setStatus((prev) => ({
        matched: prev.matched + (json.matched || 0),
        updated: prev.updated + (json.updated || 0),
        skipped: prev.skipped + (json.skipped || 0),
        failed: prev.failed + (json.failed || 0),
        total: prev.total + json.matched + json.updated + json.failed,
      }));
      setRemaining(json.remaining);
      setCurrentBatch((b) => b + 1);

      if (json.done) {
        setStep("done");
        return;
      }

      // 继续下一批
      pollingRef.current = setTimeout(runBatch, 500);
    } catch (err: any) {
      alert("网络错误: " + err.message);
      setStep("intro");
    }
  }, [mode]);

  async function startMatching(selectedMode: "unmatched" | "all") {
    setMode(selectedMode);
    setStep("loading");

    try {
      const res = await fetch(`/api/match-images?mode=${selectedMode}`);
      const json = await res.json();

      if (selectedMode === "unmatched") {
        setUnmatchedTotal(json.total || 0);
        if (json.total === 0) {
          setStatus({ matched: 0, updated: 0, skipped: 0, failed: 0, total: 0 });
          setStep("done");
          return;
        }
        setRemaining(json.total);
      } else {
        setUnmatchedTotal(json.total || 0);
        setRemaining(-1); // all 模式不显示剩余数
      }

      setStatus({ matched: 0, updated: 0, skipped: 0, failed: 0, total: 0 });
      setCurrentBatch(0);
      setStep("matching");
      runningRef.current = true;
      runBatch();
    } catch (err: any) {
      alert("加载失败: " + err.message);
      setStep("intro");
    }
  }

  function stopMatching() {
    runningRef.current = false;
    if (pollingRef.current) {
      clearTimeout(pollingRef.current);
      pollingRef.current = null;
    }
    setStep("done");
  }

  useEffect(() => {
    return () => {
      runningRef.current = false;
      if (pollingRef.current) clearTimeout(pollingRef.current);
    };
  }, []);

  const isAllMode = mode === "all";
  const processed = status.matched + status.updated + status.failed;
  const pct = isAllMode
    ? 0
    : (status.total > 0 && unmatchedTotal > 0
      ? Math.round((status.total / unmatchedTotal) * 100)
      : 0);

  return (
    <>
      <div className="popup-mask modal-overlay" style={{ display: "flex" }} onClick={onClose}>
        <div
          className="popup-content modal-content"
          style={{ maxWidth: 520, maxHeight: "85vh", display: "flex", flexDirection: "column" }}
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
              <div style={{ padding: "10px 0", textAlign: "center" }}>
                <p style={{ fontSize: 40, marginBottom: 12 }}>🖼️</p>
                <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>服务端批量匹配</p>
                <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 20 }}>
                  在服务器端运行，分批处理直至全部完成，不会超时
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, textAlign: "left", marginBottom: 20, padding: "0 10px" }}>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    <b>PC游戏：</b>Steam → steambk → 其他中文站 → RAWG
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    <b>NS/掌机/索尼：</b>中文游戏站 → RAWG
                  </div>
                </div>

                {/* 匹配选项 */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
                  <button
                    onClick={() => startMatching("unmatched")}
                    style={{
                      padding: "12px 24px",
                      background: "linear-gradient(90deg, #2563eb, #7c3aed)",
                      color: "white",
                      border: "none",
                      borderRadius: "var(--radius-md)",
                      cursor: "pointer",
                      fontSize: 14,
                      fontWeight: 600,
                      boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
                    }}
                  >
                    🔍 匹配未匹配图片
                  </button>
                  <button
                    onClick={() => startMatching("all")}
                    style={{
                      padding: "12px 24px",
                      background: "rgba(255,255,255,0.9)",
                      color: "var(--primary-color)",
                      border: "1px solid var(--primary-color)",
                      borderRadius: "var(--radius-md)",
                      cursor: "pointer",
                      fontSize: 14,
                      fontWeight: 600,
                    }}
                  >
                    🔄 重新匹配全部图片
                    <span style={{ display: "block", fontSize: 11, fontWeight: 400, color: "var(--text-secondary)", marginTop: 2 }}>
                      用更优质来源覆盖现有图片
                    </span>
                  </button>
                </div>
              </div>
            )}

            {step === "loading" && (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <div className="loading" style={{ justifyContent: "center" }} />
                <p style={{ color: "var(--text-secondary)", marginTop: 12, fontSize: 14 }}>
                  正在检查游戏数量...
                </p>
              </div>
            )}

            {step === "matching" && (
              <div>
                {/* 进度 */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>
                    <span>第 {currentBatch + 1} 批处理中</span>
                    {!isAllMode && remaining > 0 && (
                      <span>
                        已完成 <b style={{ color: "var(--success-color)" }}>{status.total}</b>
                        {" "}/ 剩余 <b style={{ color: "var(--text-secondary)" }}>{remaining}</b>
                      </span>
                    )}
                    {isAllMode && (
                      <span>
                        已处理 <b style={{ color: "var(--success-color)" }}>{processed}</b>
                      </span>
                    )}
                  </div>
                  {!isAllMode && (
                    <div style={{ height: 8, background: "rgba(0,0,0,0.08)", borderRadius: 4, overflow: "hidden" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${pct}%`,
                          background: "linear-gradient(90deg, #2563eb, #7c3aed)",
                          borderRadius: 4,
                          transition: "width 0.5s ease",
                        }}
                      />
                    </div>
                  )}
                  {isAllMode && (
                    <div style={{ height: 8, background: "rgba(0,0,0,0.08)", borderRadius: 4, overflow: "hidden", position: "relative" }}>
                      <div
                        style={{
                          position: "absolute",
                          height: "100%",
                          width: "100%",
                          background: "linear-gradient(90deg, #2563eb, #7c3aed)",
                          borderRadius: 4,
                          animation: "pulse 1.5s ease-in-out infinite",
                        }}
                      />
                    </div>
                  )}
                  <div style={{ textAlign: "center", fontSize: 20, fontWeight: 700, marginTop: 8, background: "linear-gradient(90deg, #2563eb, #7c3aed)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
                    {isAllMode ? "重新匹配全部中..." : `${pct}%`}
                  </div>
                </div>

                {/* 统计 */}
                {isAllMode ? (
                  /* 全部模式统计 */
                  <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                    <div style={{ flex: "1 1 45%", textAlign: "center", padding: "10px 8px", background: "rgba(34,197,94,0.08)", borderRadius: 8, border: "1px solid rgba(34,197,94,0.15)" }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: "var(--success-color)" }}>{status.matched}</div>
                      <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>新匹配</div>
                    </div>
                    <div style={{ flex: "1 1 45%", textAlign: "center", padding: "10px 8px", background: "rgba(37,99,235,0.08)", borderRadius: 8, border: "1px solid rgba(37,99,235,0.15)" }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: "#2563eb" }}>{status.updated}</div>
                      <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>已更新</div>
                    </div>
                    <div style={{ flex: "1 1 45%", textAlign: "center", padding: "10px 8px", background: "rgba(0,0,0,0.04)", borderRadius: 8, border: "1px solid var(--border-light)" }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-secondary)" }}>{status.skipped}</div>
                      <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>无更优结果</div>
                    </div>
                    <div style={{ flex: "1 1 45%", textAlign: "center", padding: "10px 8px", background: "rgba(239,68,68,0.08)", borderRadius: 8, border: "1px solid rgba(239,68,68,0.15)" }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: "var(--danger-color)" }}>{status.failed}</div>
                      <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>未找到</div>
                    </div>
                  </div>
                ) : (
                  /* 未匹配模式统计 */
                  <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                    <div style={{ flex: 1, textAlign: "center", padding: "10px 8px", background: "rgba(34,197,94,0.08)", borderRadius: 8, border: "1px solid rgba(34,197,94,0.15)" }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: "var(--success-color)" }}>{status.matched}</div>
                      <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>匹配成功</div>
                    </div>
                    <div style={{ flex: 1, textAlign: "center", padding: "10px 8px", background: "rgba(239,68,68,0.08)", borderRadius: 8, border: "1px solid rgba(239,68,68,0.15)" }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: "var(--danger-color)" }}>{status.failed}</div>
                      <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>未找到</div>
                    </div>
                    <div style={{ flex: 1, textAlign: "center", padding: "10px 8px", background: "rgba(0,0,0,0.04)", borderRadius: 8, border: "1px solid var(--border-light)" }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-secondary)" }}>{remaining}</div>
                      <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>待处理</div>
                    </div>
                  </div>
                )}

                <p style={{ fontSize: 12, color: "var(--text-tertiary)", textAlign: "center" }}>
                  页面保持打开，自动处理下一批直到完成
                </p>
              </div>
            )}

            {step === "done" && (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <p style={{ fontSize: 40, marginBottom: 8 }}>
                  {status.matched + status.updated > 0 ? "🎉" : "😅"}
                </p>
                <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>匹配完成！</p>

                {isAllMode ? (
                  <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: "var(--success-color)" }}>{status.matched}</div>
                      <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>新匹配</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: "#2563eb" }}>{status.updated}</div>
                      <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>已更新</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text-secondary)" }}>{status.skipped}</div>
                      <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>无更优结果</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: "var(--danger-color)" }}>{status.failed}</div>
                      <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>未找到</div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: "var(--success-color)" }}>{status.matched}</div>
                      <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>匹配成功</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: "var(--danger-color)" }}>{status.failed}</div>
                      <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>未找到</div>
                    </div>
                  </div>
                )}

                {remaining > 0 && (
                  <p style={{ color: "var(--text-tertiary)", fontSize: 12, marginBottom: 8 }}>
                    还有 {remaining} 个游戏待处理
                  </p>
                )}
                {(status.failed > 0 || status.skipped > 0) && (
                  <p style={{ color: "var(--text-tertiary)", fontSize: 12 }}>
                    中文名搜不到可手动补充
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
            {step === "matching" && (
              <button
                onClick={stopMatching}
                style={{
                  padding: "8px 20px",
                  background: "rgba(255,255,255,0.9)",
                  color: "var(--danger-color)",
                  border: "1px solid var(--danger-color)",
                  borderRadius: "var(--radius-sm)",
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                暂停
              </button>
            )}
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
            {step === "done" && (
              <button
                onClick={() => { setStep("intro"); setStatus({ matched: 0, updated: 0, skipped: 0, failed: 0, total: 0 }); setRemaining(0); setCurrentBatch(0); }}
                style={{
                  padding: "8px 20px",
                  background: "linear-gradient(90deg, #2563eb, #7c3aed)",
                  color: "white",
                  border: "none",
                  borderRadius: "var(--radius-sm)",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                继续匹配
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
