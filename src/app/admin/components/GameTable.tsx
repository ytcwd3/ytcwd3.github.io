"use client";

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
}: GameTableProps) {
  const PAGE_SIZE = 20;
  const startIndex = (currentPage - 1) * PAGE_SIZE + 1;
  const endIndex = Math.min(currentPage * PAGE_SIZE, totalCount);

  return (
    <>
      <div style={{ ...CARD_STYLE, padding: 0, overflow: "hidden" }}>
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
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "rgba(216,87,232,0.06)" }}>
                  {[
                    "ID",
                    "游戏名称",
                    "主分类",
                    "子分类",
                    "提取码",
                    "夸克链接",
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
                        background:
                          idx % 2 === 0
                            ? "rgba(255,255,255,0.5)"
                            : "rgba(255,255,255,0.3)",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background =
                          "rgba(216,87,232,0.05)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background =
                          idx % 2 === 0
                            ? "rgba(255,255,255,0.5)"
                            : "rgba(255,255,255,0.3)")
                      }
                    >
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
                      <td style={{ padding: "11px 14px", fontSize: "14px" }}>
                        <strong style={{ color: "var(--text-primary)" }}>
                          {game.name}
                        </strong>
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
                      <td
                        style={{
                          padding: "11px 14px",
                          fontSize: "13px",
                          fontFamily: "monospace",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {game.code || "-"}
                      </td>
                      <td style={{ padding: "11px 14px", fontSize: "13px" }}>
                        {game.quarkpan ? (
                          <a
                            href={game.quarkpan}
                            target="_blank"
                            className="resource-link"
                          >
                            查看
                          </a>
                        ) : (
                          "-"
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
        )}
      </div>

      {/* Pagination */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: "12px",
          padding: "10px",
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
    </>
  );
}
