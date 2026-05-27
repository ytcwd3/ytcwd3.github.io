"use client";

import { useEffect, useState } from "react";
import {
  CategoryMoveProgress,
  DbCategory,
  addDbCategory,
  addDbSubcategory,
  deleteDbCategory,
  deleteDbSubcategory,
  fetchDbCategories,
  moveDbSubcategoryToCategory,
  renameDbCategory,
  renameDbSubcategory,
} from "@/lib/dbCategories";

const inputStyle = {
  padding: "7px 10px",
  borderRadius: "6px",
  border: "1px solid #ddd",
  fontSize: "13px",
  boxSizing: "border-box" as const,
};

export default function DatabaseCategoryManager() {
  const [categories, setCategories] = useState<DbCategory[]>([]);
  const [selectedName, setSelectedName] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newSubcategoryName, setNewSubcategoryName] = useState("");
  const [pendingParentBySubcategory, setPendingParentBySubcategory] = useState<
    Record<string, string>
  >({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [moveProgress, setMoveProgress] = useState<CategoryMoveProgress | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    loadCategories();
  }, []);

  const selectedCategory =
    categories.find((category) => category.name === selectedName) || categories[0];
  const isMoving = saving === "move-subcategory";

  function guardMoving() {
    if (!isMoving) return false;
    alert("迁移中暂时无法操作其它的");
    return true;
  }

  function loadCategories() {
    if (guardMoving()) return;
    setLoading(true);
    fetchDbCategories()
      .then((data) => {
        setCategories(data);
        setSelectedName((current) => current || data[0]?.name || "");
      })
      .catch((error: any) => setMsg("加载失败: " + error.message))
      .finally(() => setLoading(false));
  }

  async function run(actionName: string, action: () => Promise<void>) {
    if (guardMoving()) return;
    setSaving(actionName);
    setMsg("");
    try {
      await action();
      setMsg("操作成功");
      loadCategories();
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

  function handleRenameCategory(category: DbCategory) {
    if (guardMoving()) return;
    const next = prompt("新的主分类名称", category.name)?.trim();
    if (!next || next === category.name) return;
    confirmAndRun(
      `确认把主分类「${category.name}」改成「${next}」？这会批量更新相关游戏数据。`,
      "rename-category",
      () => renameDbCategory(category.name, next),
    );
  }

  function handleRenameSubcategory(subcategory: string) {
    if (guardMoving()) return;
    const next = prompt("新的子分类名称", subcategory)?.trim();
    if (!next || next === subcategory) return;
    confirmAndRun(
      `确认把子分类「${subcategory}」改成「${next}」？这会批量更新相关游戏数据。`,
      "rename-subcategory",
      () => renameDbSubcategory(subcategory, next),
    );
  }

  function getSubcategoryCount(category: DbCategory, subcategory: string) {
    return category.subcategoryCounts[subcategory] || 0;
  }

  function handleMoveSubcategory(
    subcategory: string,
    oldCategoryName: string,
    newCategoryName: string,
  ) {
    if (guardMoving()) return;
    if (!newCategoryName || newCategoryName === oldCategoryName) return;
    if (
      !confirm(
        `确认把子分类「${subcategory}」从「${oldCategoryName}」移动到「${newCategoryName}」吗？这会批量更新相关游戏的主分类，数量越多等待越久。`,
      )
    ) {
      return;
    }

    setSaving("move-subcategory");
    setMoveProgress({
      total: 0,
      done: 0,
      subcategory,
      from: oldCategoryName,
      to: newCategoryName,
    });
    setMsg("");
    moveDbSubcategoryToCategory(
      subcategory,
      oldCategoryName,
      newCategoryName,
      setMoveProgress,
    )
      .then(() => {
        setMsg("迁移完成");
        setMoveProgress(null);
        setLoading(true);
        return fetchDbCategories();
      })
      .then((data) => {
        setCategories(data);
        setSelectedName(newCategoryName);
      })
      .catch((error: any) => {
        setMsg("迁移失败: " + error.message);
      })
      .finally(() => {
        setSaving("");
        setLoading(false);
      });
  }

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
            来源：games.category / games.subcategory。改名和删除会批量更新游戏数据。
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
                  key={category.name}
                  onClick={() => {
                    if (guardMoving()) return;
                    setSelectedName(category.name);
                  }}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "8px",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    border: `1px solid ${selectedCategory?.name === category.name ? "#9333ea" : "#eee"}`,
                    background: selectedCategory?.name === category.name ? "rgba(147,51,234,0.08)" : "#fafafa",
                    color: selectedCategory?.name === category.name ? "#6b21a8" : "#333",
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

          {selectedCategory && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <h3 style={{ fontSize: "16px", margin: 0, flex: 1 }}>{selectedCategory.name}</h3>
                <button
                  onClick={() => {
                    if (guardMoving()) return;
                    const next = prompt("新的主分类名称", selectedCategory.name)?.trim();
                    if (!next || next === selectedCategory.name) return;
                    confirmAndRun(
                      `确认把主分类「${selectedCategory.name}」改成「${next}」？这会批量更新相关游戏数据。`,
                      "rename-category",
                      () => renameDbCategory(selectedCategory.name, next),
                    );
                  }}
                  style={{ padding: "5px 10px", borderRadius: "5px", border: "1px solid #9333ea", background: "rgba(147,51,234,0.08)", color: "#9333ea", cursor: "pointer", fontSize: "12px" }}
                >
                  改名
                </button>
                <button
                  onClick={() => {
                    if (guardMoving()) return;
                    if (confirm(`确认删除主分类「${selectedCategory.name}」？相关游戏会移除这个分类值。`)) {
                      run("delete-category", () => deleteDbCategory(selectedCategory.name));
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
                      `确认新增子分类「${newSubcategoryName.trim()}」到「${selectedCategory.name}」？`,
                      "add-subcategory",
                      async () => {
                        await addDbSubcategory(selectedCategory.name, newSubcategoryName);
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
                {selectedCategory.subcategories.length === 0 ? (
                  <p style={{ color: "#999", fontSize: "13px" }}>暂无子分类</p>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                      gap: "8px",
                      width: "100%",
                    }}
                  >
                    {selectedCategory.subcategories.map((subcategory) => (
                      <div
                        key={subcategory}
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
                          <div style={{ fontWeight: 600, color: "#333" }}>{subcategory}</div>
                          <div style={{ color: "#777", marginTop: "2px" }}>
                            {getSubcategoryCount(selectedCategory, subcategory)} 个游戏
                          </div>
                        </div>
                        <select
                          value={pendingParentBySubcategory[subcategory] || selectedCategory.name}
                          onChange={(e) =>
                            guardMoving()
                              ? undefined
                              :
                            setPendingParentBySubcategory((prev) => ({
                              ...prev,
                              [subcategory]: e.target.value,
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
                            <option key={category.name} value={category.name}>
                              父分类：{category.name}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() =>
                            handleMoveSubcategory(
                              subcategory,
                              selectedCategory.name,
                              pendingParentBySubcategory[subcategory] || selectedCategory.name,
                            )
                          }
                          disabled={
                            !!saving ||
                            (pendingParentBySubcategory[subcategory] || selectedCategory.name) ===
                              selectedCategory.name
                          }
                          style={{ border: "none", background: "transparent", color: "#9333ea", cursor: saving ? "not-allowed" : "pointer", padding: "0 2px", fontSize: "12px" }}
                        >
                          {isMoving ? "迁移中" : "改父分类"}
                        </button>
                        <button
                          onClick={() => {
                            if (guardMoving()) return;
                            const next = prompt("新的子分类名称", subcategory)?.trim();
                            if (!next || next === subcategory) return;
                            confirmAndRun(
                              `确认把子分类「${subcategory}」改成「${next}」？这会批量更新相关游戏数据。`,
                              "rename-subcategory",
                              () => renameDbSubcategory(subcategory, next),
                            );
                          }}
                          style={{ border: "none", background: "transparent", color: "#9333ea", cursor: "pointer", padding: "0 2px", fontSize: "12px" }}
                        >
                          改名
                        </button>
                        <button
                          onClick={() => {
                            if (guardMoving()) return;
                            if (confirm(`确认删除子分类「${subcategory}」？相关游戏会移除这个子分类值。`)) {
                              run("delete-subcategory", () => deleteDbSubcategory(subcategory));
                            }
                          }}
                          style={{ border: "none", background: "transparent", color: "#ef4444", cursor: "pointer", padding: "0 2px", fontSize: "12px" }}
                        >
                          删除
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {moveProgress && (
        <div
          style={{
            marginTop: "12px",
            padding: "10px 12px",
            borderRadius: "8px",
            background: "#fafafa",
            border: "1px solid #eee",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "10px",
              marginBottom: "6px",
              fontSize: "12px",
              color: "#555",
            }}
          >
            <span>
              正在迁移「{moveProgress.subcategory}」：{moveProgress.from} → {moveProgress.to}
            </span>
            <span>
              {moveProgress.done} / {moveProgress.total}
              {moveProgress.total > 0
                ? ` (${Math.round((moveProgress.done / moveProgress.total) * 100)}%)`
                : ""}
            </span>
          </div>
          <div
            style={{
              height: "8px",
              borderRadius: "999px",
              background: "#eee",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width:
                  moveProgress.total > 0
                    ? `${Math.min(100, (moveProgress.done / moveProgress.total) * 100)}%`
                    : "0%",
                background: "#9333ea",
                transition: "width 0.2s ease",
              }}
            />
          </div>
          {moveProgress.current && (
            <p style={{ margin: "6px 0 0", fontSize: "12px", color: "#888" }}>
              当前处理游戏 ID：{moveProgress.current}
            </p>
          )}
        </div>
      )}

      {msg && (
        <p style={{ margin: "12px 0 0", fontSize: "13px", color: msg.includes("成功") ? "#16a34a" : "#ef4444" }}>
          {saving ? "处理中..." : msg}
        </p>
      )}
    </section>
  );
}
