"use client";

import { useState, useEffect } from "react";
import { Game } from "@/lib/supabase";
import {
  CATEGORY_NAMES,
  DB_TO_UI_KEY,
  CAT_RGBA,
  CARD_STYLE,
} from "./constants";

interface GameTableProps {
  games: Game[];
  loading: boolean;
  currentPage: number;
  totalCount: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onEdit: (game: Game) => void;
  onDelete: (id: number) => void;
  onBatchDelete?: (ids: number[]) => void;
  className?: string;
}

export default function GameTable({
  games,
  loading,
  currentPage,
  totalCount,
  totalPages,
  onPageChange,
  onEdit,
  onDelete,
  onBatchDelete,
  className,
}: GameTableProps) {
  const PAGE_SIZE = 20;
  const startIndex = (currentPage - 1) * PAGE_SIZE + 1;
  const endIndex = Math.min(currentPage * PAGE_SIZE, totalCount);

  // 批量选择
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showBatchBar, setShowBatchBar] = useState(false);
  const [pageInput, setPageInput] = useState(String(currentPage));
  const [pageError, setPageError] = useState("");

  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  const allOnPageSelected =
    games.length > 0 && games.every((g) => selectedIds.has(g.id));

  function toggleAll() {
    if (allOnPageSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        games.forEach((g) => next.delete(g.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        games.forEach((g) => next.add(g.id));
        return next;
      });
    }
  }

  function toggleOne(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // 每次数据变化检测是否显示批量栏，并清理已删除的选中项
  useEffect(() => {
    setShowBatchBar(selectedIds.size > 0);
    // 清理已不在当前页的选中 id（数据删除后自动清空选中状态）
    setSelectedIds((prev) => {
      const currentIds = new Set(games.map((g) => g.id));
      const next = new Set<number>();
      let changed = false;
      prev.forEach((id) => {
        if (currentIds.has(id)) next.add(id);
        else changed = true;
      });
      return changed ? next : prev;
    });
  }, [selectedIds.size, games]);

  function handleBatchDelete() {
    const ids = Array.from(selectedIds);
    onBatchDelete?.(ids);
  }

  return (
    <>
      <div className={`game-table-wrapper ${className || ""}`} style={{ ...CARD_STYLE, padding: 0, overflow: "hidden" }}>
        {loading ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px",
              color: "var(--text-secondary)",
            }}
          >
            <div className="loading" style={{ justifyContent: "center" }} />
            <p style={{ marginTop: "10px", fontSize: "14px" }}>加载中...</p>
          </div>
        ) : games.length === 0 ? (
          <div
            className="empty-state"
            style={{
              padding: "40px",
              textAlign: "center",
              color: "var(--text-secondary)",
            }}
          >
            <div className="empty-state-icon">🎮</div>
            <div className="empty-state-text">暂无数据</div>
            <div className="empty-state-subtext">试试其他分类或关键词搜索</div>
          </div>
        ) : (
          <div className="game-table-both" style={{ display: "contents" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "rgba(216,87,232,0.06)" }}>
                  <th
                    style={{
                      padding: "12px 8px",
                      textAlign: "center",
                      borderBottom: "1px solid var(--border-light)",
                      width: "40px",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={allOnPageSelected}
                      onChange={toggleAll}
                      style={{
                        cursor: "pointer",
                        width: "16px",
                        height: "16px",
                      }}
                    />
                  </th>
                  {[
                    "ID",
                    "游戏名称",
                    "主分类",
                    "子分类",
                    "网盘链接",
                    "更新日期",
                    "操作",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "12px 14px",
                        textAlign: "left",
                        fontWeight: 600,
                        fontSize: "13px",
                        color: "var(--text-secondary)",
                        borderBottom: "1px solid var(--border-light)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {games.map((game, idx) => {
                  const dbCat = game.category?.[0] || "";
                  const catKey = DB_TO_UI_KEY[dbCat] || "pc";

                  return (
                    <tr
                      key={game.id}
                      style={{
                        borderBottom: "1px solid var(--border-light)",
                        transition: "background 0.2s",
                        background: selectedIds.has(game.id)
                          ? "rgba(229,57,53,0.06)"
                          : idx % 2 === 0
                            ? "rgba(255,255,255,0.5)"
                            : "rgba(255,255,255,0.3)",
                      }}
                      onMouseEnter={(e) => {
                        if (!selectedIds.has(game.id)) {
                          e.currentTarget.style.background =
                            "rgba(216,87,232,0.05)";
                        }
                      }}
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = selectedIds.has(
                          game.id,
                        )
                          ? "rgba(229,57,53,0.06)"
                          : idx % 2 === 0
                            ? "rgba(255,255,255,0.5)"
                            : "rgba(255,255,255,0.3)")
                      }
                    >
                      <td style={{ padding: "11px 8px", textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(game.id)}
                          onChange={() => toggleOne(game.id)}
                          style={{
                            cursor: "pointer",
                            width: "16px",
                            height: "16px",
                          }}
                        />
                      </td>
                      <td
                        style={{
                          padding: "11px 14px",
                          fontSize: "13px",
                          color: "var(--text-tertiary)",
                          fontFamily: "monospace",
                        }}
                      >
                        {startIndex + idx}
                      </td>
                      <td style={{ padding: "8px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {game.image ? (
                            <img
                              src={game.image}
                              alt={game.name}
                              style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 6, flexShrink: 0 }}
                              onError={(e) => {
                                const el = e.target as HTMLImageElement;
                                el.style.display = "none";
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: 6,
                                background: `rgba(${CAT_RGBA[catKey]}, 0.15)`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 16,
                                fontWeight: 700,
                                color: `rgba(${CAT_RGBA[catKey]}, 0.9)`,
                                flexShrink: 0,
                              }}
                            >
                              {game.name.charAt(0)}
                            </div>
                          )}
                          <strong style={{ color: "var(--text-primary)", fontSize: "14px" }}>
                            {game.name}
                          </strong>
                        </div>
                      </td>
                      <td style={{ padding: "11px 14px" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 10px",
                            borderRadius: "var(--radius-sm)",
                            fontSize: "12px",
                            fontWeight: 600,
                            background: `rgba(${CAT_RGBA[catKey]}, 0.12)`,
                            color: `rgba(${CAT_RGBA[catKey]}, 0.9)`,
                            border: `1px solid rgba(${CAT_RGBA[catKey]}, 0.25)`,
                          }}
                        >
                          {CATEGORY_NAMES[catKey]}
                        </span>
                      </td>
                      <td style={{ padding: "11px 14px" }}>
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "3px",
                          }}
                        >
                          {(game.subcategory || []).map((s) => (
                            <span
                              key={s}
                              style={{
                                display: "inline-block",
                                padding: "2px 8px",
                                borderRadius: "4px",
                                fontSize: "11px",
                                background: `rgba(${CAT_RGBA[catKey]}, 0.08)`,
                                color: `rgba(${CAT_RGBA[catKey]}, 0.8)`,
                                border: `1px solid rgba(${CAT_RGBA[catKey]}, 0.15)`,
                              }}
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: "11px 14px", fontSize: "12px" }}>
                        {game.quarkpan ? (
                          <a
                            href={game.quarkpan}
                            target="_blank"
                            className="resource-link"
                            style={{ color: "#f59e0b" }}
                          >
                            夸克
                          </a>
                        ) : (
                          <span style={{ color: "var(--text-tertiary)" }}>
                            夸克 无
                          </span>
                        )}{" "}
                        {game.baidupan ? (
                          <a
                            href={game.baidupan}
                            target="_blank"
                            className="resource-link"
                            style={{ color: "#2563eb" }}
                          >
                            百度
                          </a>
                        ) : (
                          <span style={{ color: "var(--text-tertiary)" }}>
                            百度 无
                          </span>
                        )}{" "}
                        {game.thunderpan ? (
                          <a
                            href={game.thunderpan}
                            target="_blank"
                            className="resource-link"
                            style={{ color: "#059669" }}
                          >
                            迅雷
                          </a>
                        ) : (
                          <span style={{ color: "var(--text-tertiary)" }}>
                            迅雷 无
                          </span>
                        )}
                      </td>
                      <td
                        style={{
                          padding: "11px 14px",
                          fontSize: "13px",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {game.updatedate || "-"}
                      </td>
                      <td style={{ padding: "11px 14px" }}>
                        <button
                          onClick={() => onEdit(game)}
                          style={{
                            padding: "5px 12px",
                            background: "rgba(33,150,243,0.1)",
                            color: "var(--color-sony)",
                            border: "1px solid rgba(33,150,243,0.2)",
                            borderRadius: "var(--radius-sm)",
                            cursor: "pointer",
                            fontSize: "12px",
                            fontWeight: 500,
                            marginRight: "5px",
                            transition: "all 0.2s",
                          }}
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => onDelete(game.id)}
                          style={{
                            padding: "5px 12px",
                            background: "rgba(229,57,53,0.08)",
                            color: "var(--color-nintendo)",
                            border: "1px solid rgba(229,57,53,0.15)",
                            borderRadius: "var(--radius-sm)",
                            cursor: "pointer",
                            fontSize: "12px",
                            fontWeight: 500,
                            transition: "all 0.2s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background =
                              "rgba(229,57,53,0.18)";
                            e.currentTarget.style.color = "#e53935";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background =
                              "rgba(229,57,53,0.08)";
                            e.currentTarget.style.color =
                              "var(--color-nintendo)";
                          }}
                        >
                          删除
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="game-card-list">
            {games.map((game) => {
              const dbCat = game.category?.[0] || "";
              const catKey = DB_TO_UI_KEY[dbCat] || "pc";
              return (
                <div className="game-card" key={game.id}>
                  <div className="game-card-header">
                    {game.image ? (
                      <img
                        src={game.image}
                        alt={game.name}
                        className="game-card-thumb"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="game-card-thumb game-card-thumb-placeholder">
                        {game.name.charAt(0)}
                      </div>
                    )}
                    <input
                      type="checkbox"
                      className="game-card-select"
                      checked={selectedIds.has(game.id)}
                      onChange={() => toggleOne(game.id)}
                    />
                    <span className="game-card-name">{game.name}</span>
                    <span
                      className="game-card-cat"
                      style={{
                        background: `rgba(${CAT_RGBA[catKey]}, 0.12)`,
                        color: `rgba(${CAT_RGBA[catKey]}, 0.9)`,
                        border: `1px solid rgba(${CAT_RGBA[catKey]}, 0.25)`,
                      }}
                    >
                      {CATEGORY_NAMES[catKey]}
                    </span>
                  </div>
                  <div className="game-card-row">
                    {(game.subcategory || []).length > 0 && (
                      <>
                        <span className="game-card-row-label">子分类：</span>
                        {(game.subcategory || []).map((s) => (
                          <span key={s}>{s}</span>
                        ))}
                      </>
                    )}
                  </div>
                  <div className="game-card-footer">
                    <div className="game-card-links">
                    {game.quarkpan && (
                      <a href={game.quarkpan} target="_blank" style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b" }}>夸克</a>
                    )}
                    {game.baidupan && (
                      <a href={game.baidupan} target="_blank" style={{ background: "rgba(37,99,235,0.1)", color: "#2563eb" }}>百度</a>
                    )}
                    {game.thunderpan && (
                      <a href={game.thunderpan} target="_blank" style={{ background: "rgba(5,150,105,0.1)", color: "#059669" }}>迅雷</a>
                    )}
                    {game.video && (
                      <a href={game.video} target="_blank" style={{ background: "rgba(229,57,53,0.1)", color: "#e53935" }}>🎬视频</a>
                    )}
                  </div>
                    <div className="game-card-actions">
                      <button
                        onClick={() => onEdit(game)}
                        style={{
                          background: "rgba(33,150,243,0.1)",
                          color: "var(--color-sony)",
                          borderColor: "rgba(33,150,243,0.2)",
                        }}
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => onDelete(game.id)}
                        style={{
                          background: "rgba(229,57,53,0.08)",
                          color: "var(--color-nintendo)",
                          borderColor: "rgba(229,57,53,0.15)",
                        }}
                      >
                        删除
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>)}
      </div>

      {/* Pagination */}
      <div
        className="pagination"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: "12px",
          padding: "10px",
          position: "relative",
        }}
      >
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          style={{
            padding: "6px 16px",
            border: "1px solid var(--border-light)",
            background: currentPage === 1 ? "#e0e0e0" : "white",
            borderRadius: "var(--radius-sm)",
            cursor: currentPage === 1 ? "not-allowed" : "pointer",
            fontSize: "13px",
            fontWeight: 600,
            color: currentPage === 1 ? "#aaa" : "var(--text-primary)",
            opacity: currentPage === 1 ? 0.8 : 1,
            transition: "all 0.2s",
          }}
        >
          上一页
        </button>
        <span
          style={{
            fontSize: "13px",
            color: "var(--text-primary)",
            padding: "4px 12px",
            background: "white",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border-light)",
          }}
        >
          第 {currentPage} / {totalPages} 页 · 共 {totalCount} 条
        </span>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "4px 12px",
            background: "white",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border-light)",
          }}
        >
          <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
            跳至
          </span>
          <input
            type="number"
            min={1}
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const page = parseInt(pageInput, 10);
                if (!isNaN(page) && page >= 1 && page <= totalPages) {
                  onPageChange(page);
                }
              }
            }}
            style={{
              width: "64px",
              padding: "4px 8px",
              fontSize: "13px",
              border: "1px solid var(--border-light)",
              borderRadius: "var(--radius-sm)",
              textAlign: "center",
              outline: "none",
            }}
            onWheel={(e) => e.currentTarget.blur()}
          />
          <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
            页
          </span>
          <button
            onClick={() => {
              const page = parseInt(pageInput, 10);
              if (isNaN(page) || page < 1) {
                setPageError("请输入有效的页码");
              } else if (page > totalPages) {
                setPageError(`最多只能输入第 ${totalPages} 页`);
              } else {
                setPageError("");
                onPageChange(page);
              }
            }}
            style={{
              padding: "4px 12px",
              border: "1px solid var(--border-light)",
              background: "white",
              borderRadius: "var(--radius-sm)",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--text-primary)",
              transition: "0.2s",
            }}
          >
            跳转
          </button>
          {pageError && (
            <span style={{ fontSize: "12px", color: "#ef4444", marginLeft: 4 }}>
              {pageError}
            </span>
          )}
        </div>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          style={{
            padding: "6px 16px",
            border: "1px solid var(--border-light)",
            background: currentPage === totalPages ? "#e0e0e0" : "white",
            borderRadius: "var(--radius-sm)",
            cursor: currentPage === totalPages ? "not-allowed" : "pointer",
            fontSize: "13px",
            fontWeight: 600,
            color: currentPage === totalPages ? "#aaa" : "var(--text-primary)",
            opacity: currentPage === totalPages ? 0.8 : 1,
            transition: "all 0.2s",
          }}
        >
          下一页
        </button>
      </div>

      {/* 批量操作浮动栏 */}
      {showBatchBar && (
        <div
          className="batch-bar"
          style={{
            position: "fixed",
            bottom: "24px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(30,30,40,0.95)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderRadius: "12px",
            padding: "12px 20px",
            display: "flex",
            alignItems: "center",
            gap: "16px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
            zIndex: 1000,
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <span style={{ color: "white", fontSize: "14px", fontWeight: 500 }}>
            已选择{" "}
            <strong style={{ color: "#f472b6" }}>{selectedIds.size}</strong>{" "}
            条数据
          </span>
          <button
            onClick={() => setSelectedIds(new Set())}
            style={{
              padding: "7px 16px",
              background: "rgba(255,255,255,0.1)",
              color: "white",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: 500,
              transition: "all 0.2s",
            }}
          >
            取消选择
          </button>
          <button
            onClick={handleBatchDelete}
            style={{
              padding: "7px 20px",
              background: "linear-gradient(90deg, #e53935, #c62828)",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: 600,
              boxShadow: "0 3px 10px rgba(229,57,53,0.35)",
              transition: "all 0.2s",
            }}
          >
            🗑 批量删除
          </button>
        </div>
      )}
    </>
  );
}
