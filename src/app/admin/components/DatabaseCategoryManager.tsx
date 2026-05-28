"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DbCategory,
  addDbCategory,
  addDbSubcategory,
  deleteDbCategory,
  deleteDbSubcategory,
  fetchDbCategoryOptions,
  fetchDbCategories,
  moveDbSubcategoryToCategory,
  renameDbCategory,
  renameDbSubcategory,
} from "@/lib/categoryTables";

const inputStyle = {
  padding: "7px 10px",
  borderRadius: "6px",
  border: "1px solid #ddd",
  fontSize: "13px",
  boxSizing: "border-box" as const,
};

export default function DatabaseCategoryManager() {
  const [categories, setCategories] = useState<DbCategory[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newSubcategoryName, setNewSubcategoryName] = useState("");
  const [pendingParentBySubcategory, setPendingParentBySubcategory] = useState<
    Record<number, number>
  >({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [moveProgress, setMoveProgress] = useState<any>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    loadCategories();
  }, []);

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedId) || categories[0],
    [categories, selectedId],
  );

  const isMoving = saving === "move-subcategory";

  function guardMoving() {
    if (!isMoving) return false;
    alert("迁移中暂时无法操作其它的");
    return true;
  }

  function loadCategories() {
    if (guardMoving()) return;
    setLoading(true);
    fetchDbCategoryOptions()
      .then((data) => {
        setCategories(data);
        setSelectedId((current) => {
          if (current && data.some((category) => category.id === current)) return current;
          return data[0]?.id ?? null;
        });
        refreshCounts();
      })
      .catch((error: any) => setMsg("加载失败: " + error.message))
      .finally(() => setLoading(false));
  }

  function refreshCounts() {
    fetchDbCategories()
      .then((data) => {
        setCategories(data);
        setSelectedId((current) => {
          if (current && data.some((category) => category.id === current)) return current;
          return data[0]?.id ?? null;
        });
      })
      .catch(() => {
        // 数量不是首屏阻塞项。
      });
  }

  async function run(actionName: string, action: () => Promise<void>) {
    if (guardMoving()) return;
    setSaving(actionName);
    setMsg("");
    try {
      await action();
      setMsg("操作成功");
      await loadCategories();
    } catch (error: any) {
      setMsg("操作失败: " + error.message);
    } finally {
      setSaving("");
    }
  }

  function confirmAndRun(message: string, actionName: string, action: () => Promise<void>) {
    if (guardMoving()) return;
    if (!confirm(message)) return;
    run(actionName, action);
  }

  function getSubcategoryCount(category: DbCategory, subcategoryId: number) {
    return category.subcategories.find((item) => item.id === subcategoryId)?.gameCount || 0;
  }

  function handleMoveSubcategory(subcategoryId: number, fromCategory: DbCategory, toCategory: DbCategory) {
    if (guardMoving()) return;
    if (fromCategory.id === toCategory.id) return;

    const subcategory = fromCategory.subcategories.find((item) => item.id === subcategoryId);
    if (!subcategory) return;

    if (
      !confirm(
        `确认把子分类「${subcategory.name}」从「${fromCategory.name}」移动到「${toCategory.name}」吗？这会批量更新相关游戏的主分类，数量越多等待越久。`,
      )
    ) {
      return;
    }

    setSaving("move-subcategory");
    setMoveProgress({
      total: 0,
      done: 0,
      subcategory: subcategory.name,
      from: fromCategory.name,
      to: toCategory.name,
    });
    setMsg("");
    moveDbSubcategoryToCategory(
      subcategory.id,
      subcategory.name,
      fromCategory.id,
      fromCategory.name,
      toCategory.id,
      toCategory.name,
      setMoveProgress,
    )
      .then(() => {
        setMsg("迁移完成");
        setMoveProgress(null);
        setSelectedId(toCategory.id);
        return fetchDbCategories();
      })
      .then((data) => {
        setCategories(data);
        setSelectedId((current) => {
          if (current && data.some((category) => category.id === current)) return current;
          return data[0]?.id ?? null;
        });
      })
      .catch((error: any) => {
        setMsg("迁移失败: " + error.message);
      })
      .finally(() => {
        setSaving("");
        setLoading(false);
      });
  }

  const currentCategory = selectedCategory || null;

  return (
    <section
      style={{
        background: "white",
        borderRadius: "10px",
        padding: "16px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        marginBottom: "20px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", marginBottom: "14px" }}>
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: 700, margin: 0 }}>数据库分类管理</h2>
          <p style={{ fontSize: "12px", color: "#777", margin: "4px 0 0" }}>
            直接管理 categories / subcategories 表，相关游戏数据会同步更新。
          </p>
        </div>
        <button
          onClick={loadCategories}
          disabled={loading && !isMoving}
          style={{ height: 32, padding: "0 12px", borderRadius: "6px", border: "1px solid #ddd", background: "#fafafa", cursor: loading && !isMoving ? "not-allowed" : "pointer", fontSize: "13px" }}
        >
          刷新
        </button>
      </div>

      {loading ? (
        <p style={{ color: "#888", textAlign: "center", padding: "28px 0" }}>加载中...</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "16px", alignItems: "start" }}>
          <div>
            <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
              <input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="新增主分类"
                style={{ ...inputStyle, minWidth: 0, flex: 1 }}
              />
              <button
                onClick={() =>
                  confirmAndRun(
                    `确认新增主分类「${newCategoryName.trim()}」？`,
                    "add-category",
                    async () => {
                      await addDbCategory(newCategoryName);
                      setNewCategoryName("");
                    },
                  )
                }
                disabled={!!saving}
                style={{ padding: "0 12px", borderRadius: "6px", border: "1px solid #9333ea", background: "rgba(147,51,234,0.08)", color: "#9333ea", cursor: saving ? "not-allowed" : "pointer", fontSize: "13px" }}
              >
                添加
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => {
                    if (guardMoving()) return;
                    setSelectedId(category.id);
                  }}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "8px",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    border: `1px solid ${selectedCategory?.id === category.id ? "#9333ea" : "#eee"}`,
                    background: selectedCategory?.id === category.id ? "rgba(147,51,234,0.08)" : "#fafafa",
                    color: selectedCategory?.id === category.id ? "#6b21a8" : "#333",
                    cursor: "pointer",
                    textAlign: "left",
                    fontSize: "13px",
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{category.name}</span>
                  <span style={{ color: "#888", flexShrink: 0 }}>
                    {category.subcategories.length} 子类 / {category.gameCount} 游戏
                  </span>
                </button>
              ))}
            </div>
          </div>

          {currentCategory && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <input
                  value={currentCategory.name}
                  onChange={(e) => {
                    // 只改草稿显示，不立即提交
                    setCategories((prev) =>
                      prev.map((item) =>
                        item.id === currentCategory.id ? { ...item, name: e.target.value } : item,
                      ),
                    );
                  }}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button
                  onClick={() => {
                    if (guardMoving()) return;
                    const next = prompt("新的主分类名称", currentCategory.name)?.trim();
                    if (!next || next === currentCategory.name) return;
                    confirmAndRun(
                      `确认把主分类「${currentCategory.name}」改成「${next}」？这会批量更新相关游戏数据。`,
                      "rename-category",
                      () => renameDbCategory(currentCategory.id, currentCategory.name, next),
                    );
                  }}
                  style={{ padding: "5px 10px", borderRadius: "5px", border: "1px solid #9333ea", background: "rgba(147,51,234,0.08)", color: "#9333ea", cursor: "pointer", fontSize: "12px" }}
                >
                  改名
                </button>
                <button
                  onClick={() => {
                    if (guardMoving()) return;
                    if (confirm(`确认删除主分类「${currentCategory.name}」？相关游戏会移除这个分类值。`)) {
                      run("delete-category", () => deleteDbCategory(currentCategory.id, currentCategory.name));
                    }
                  }}
                  style={{ padding: "5px 10px", borderRadius: "5px", border: "1px solid #ef4444", background: "rgba(239,68,68,0.08)", color: "#ef4444", cursor: "pointer", fontSize: "12px" }}
                >
                  删除
                </button>
              </div>

              <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
                <input
                  value={newSubcategoryName}
                  onChange={(e) => setNewSubcategoryName(e.target.value)}
                  placeholder="新增子分类"
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button
                  onClick={() =>
                    confirmAndRun(
                      `确认新增子分类「${newSubcategoryName.trim()}」到「${currentCategory.name}」？`,
                      "add-subcategory",
                      async () => {
                        await addDbSubcategory(currentCategory.id, currentCategory.name, newSubcategoryName);
                        setNewSubcategoryName("");
                      },
                    )
                  }
                  disabled={!!saving}
                  style={{ padding: "0 12px", borderRadius: "6px", border: "1px solid #9333ea", background: "rgba(147,51,234,0.08)", color: "#9333ea", cursor: saving ? "not-allowed" : "pointer", fontSize: "13px" }}
                >
                  添加
                </button>
              </div>

              <div>
                {currentCategory.subcategories.length === 0 ? (
                  <p style={{ color: "#999", fontSize: "13px" }}>暂无子分类</p>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "8px", width: "100%" }}>
                    {currentCategory.subcategories.map((subcategory) => {
                      const parentId =
                        pendingParentBySubcategory[subcategory.id] || currentCategory.id;
                      return (
                        <div
                          key={subcategory.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            width: "100%",
                            padding: "8px 10px",
                            borderRadius: "8px",
                            border: "1px solid #eee",
                            background: "#fafafa",
                            fontSize: "12px",
                            boxSizing: "border-box",
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, color: "#333" }}>{subcategory.name}</div>
                            <div style={{ color: "#777", marginTop: "2px" }}>
                              {subcategory.gameCount} 个游戏
                            </div>
                          </div>
                          <select
                            value={parentId}
                            onChange={(e) =>
                              setPendingParentBySubcategory((prev) => ({
                                ...prev,
                                [subcategory.id]: Number(e.target.value),
                              }))
                            }
                            disabled={isMoving}
                            style={{
                              ...inputStyle,
                              width: "160px",
                              flexShrink: 0,
                            }}
                          >
                            {categories.map((category) => (
                              <option key={category.id} value={category.id}>
                                父分类：{category.name}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => {
                              const target = categories.find((item) => item.id === parentId);
                              if (!target) return;
                              handleMoveSubcategory(subcategory.id, currentCategory, target);
                            }}
                            disabled={
                              !!saving || parentId === currentCategory.id
                            }
                            style={{ border: "none", background: "transparent", color: "#9333ea", cursor: saving ? "not-allowed" : "pointer", padding: "0 2px", fontSize: "12px" }}
                          >
                            {isMoving ? "迁移中" : "改父分类"}
                          </button>
                          <button
                            onClick={() => {
                              if (guardMoving()) return;
                              const next = prompt("新的子分类名称", subcategory.name)?.trim();
                              if (!next || next === subcategory.name) return;
                              confirmAndRun(
                                `确认把子分类「${subcategory.name}」改成「${next}」？这会批量更新相关游戏数据。`,
                                "rename-subcategory",
                                () => renameDbSubcategory(currentCategory.id, subcategory.id, subcategory.name, next),
                              );
                            }}
                            style={{ border: "none", background: "transparent", color: "#9333ea", cursor: "pointer", padding: "0 2px", fontSize: "12px" }}
                          >
                            改名
                          </button>
                          <button
                            onClick={() => {
                              if (guardMoving()) return;
                              if (confirm(`确认删除子分类「${subcategory.name}」？相关游戏会移除这个子分类值。`)) {
                                run("delete-subcategory", () =>
                                  deleteDbSubcategory(subcategory.id, currentCategory.name, subcategory.name),
                                );
                              }
                            }}
                            style={{ border: "none", background: "transparent", color: "#ef4444", cursor: "pointer", padding: "0 2px", fontSize: "12px" }}
                          >
                            删除
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {moveProgress && (
        <div style={{ marginTop: "12px", padding: "10px 12px", borderRadius: "8px", background: "#fafafa", border: "1px solid #eee" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", marginBottom: "6px", fontSize: "12px", color: "#555" }}>
            <span>
              正在迁移「{moveProgress.subcategory}」：{moveProgress.from} → {moveProgress.to}
            </span>
            <span>
              {moveProgress.done} / {moveProgress.total}
              {moveProgress.total > 0 ? ` (${Math.round((moveProgress.done / moveProgress.total) * 100)}%)` : ""}
            </span>
          </div>
          <div style={{ height: "8px", borderRadius: "999px", background: "#eee", overflow: "hidden" }}>
            <div style={{ height: "100%", width: moveProgress.total > 0 ? `${Math.min(100, (moveProgress.done / moveProgress.total) * 100)}%` : "0%", background: "#9333ea", transition: "width 0.2s ease" }} />
          </div>
          {moveProgress.current && (
            <p style={{ margin: "6px 0 0", fontSize: "12px", color: "#888" }}>
              当前处理游戏 ID：{moveProgress.current}
            </p>
          )}
        </div>
      )}

      {msg && (
        <p style={{ margin: "12px 0 0", fontSize: "13px", color: msg.includes("成功") || msg.includes("完成") ? "#16a34a" : "#ef4444" }}>
          {saving ? "处理中..." : msg}
        </p>
      )}
    </section>
  );
}
