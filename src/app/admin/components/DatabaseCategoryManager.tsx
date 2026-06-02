"use client";

import { useEffect, useMemo, useState, useRef, TouchEvent, MouseEvent } from "react";
import {
  DbCategory,
  addDbCategory,
  deleteDbCategory,
  fetchDbCategories,
  renameDbCategory,
  updateCategorySortOrder,
} from "@/lib/categories";
import {
  addDbSubcategory,
  deleteDbSubcategory,
  moveDbSubcategoryToCategory,
  renameDbSubcategory,
  updateSubcategorySortOrder,
} from "@/lib/subcategories";

const inputStyle = {
  padding: "7px 10px",
  borderRadius: "6px",
  border: "1px solid #e2e2e2",
  fontSize: "13px",
  boxSizing: "border-box" as const,
  outline: "none",
  transition: "border-color 0.2s",
};

function getClosestNumberDataAttribute(
  target: Element | null,
  selector: string,
  attribute: string,
) {
  const element = target?.closest(selector) as HTMLElement | null;
  const value = element?.dataset?.[attribute];
  return value ? Number(value) : null;
}

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

  // Operation queue lock — prevents concurrent mutations
  const pendingOpsRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Drag state
  const [draggingCategoryId, setDraggingCategoryId] = useState<number | null>(null);
  const [draggingSubcategoryId, setDraggingSubcategoryId] = useState<number | null>(null);
  const [dragOverCategoryId, setDragOverCategoryId] = useState<number | null>(null);
  const [dragOverSubcategoryId, setDragOverSubcategoryId] = useState<number | null>(null);
  const touchDragRef = useRef<{ categoryId: number; startY: number } | null>(null);
  const touchDragStateRef = useRef<{ categoryId: number; subcategoryId: number; startY: number } | null>(null);

  useEffect(() => {
    loadCategories();
    return () => {
      // Cleanup: abort any pending requests on unmount/page change
      abortControllerRef.current?.abort();
    };
  }, []);

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedId) || categories[0],
    [categories, selectedId],
  );

  const isMoving = saving === "move-subcategory";

  function isPending() {
    return pendingOpsRef.current > 0;
  }

  function guardPending() {
    if (isPending()) {
      alert("有操作正在进行中，请等待完成后再进行其他操作");
      return true;
    }
    return false;
  }

  async function loadCategories(options?: { force?: boolean }) {
    if (!options?.force && guardPending()) return;
    // Abort any previous in-flight request
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    pendingOpsRef.current++;
    setLoading(true);
    try {
      const data = await fetchDbCategories(abortControllerRef.current.signal);
      setCategories(data);
      setSelectedId((current) => {
        if (current && data.some((category) => category.id === current)) return current;
        return data[0]?.id ?? null;
      });
    } catch (error: any) {
      if (error.name === "AbortError") return; // Ignore aborted requests
      setMsg("加载失败: " + error.message);
    } finally {
      pendingOpsRef.current--;
      setLoading(false);
    }
  }

  async function run(actionName: string, action: () => Promise<void>) {
    if (guardPending()) return;
    pendingOpsRef.current++;
    setSaving(actionName);
    setMsg("");
    try {
      await action();
      setMsg("操作成功");
      await loadCategories({ force: true });
    } catch (error: any) {
      if (error.name === "AbortError") return;
      setMsg("操作失败: " + error.message);
    } finally {
      pendingOpsRef.current--;
      setSaving("");
    }
  }

  function confirmAndRun(message: string, actionName: string, action: () => Promise<void>) {
    if (guardPending()) return;
    if (!confirm(message)) return;
    run(actionName, action);
  }

  function handleMoveSubcategory(subcategoryId: number, fromCategory: DbCategory, toCategory: DbCategory) {
    if (guardPending()) return;
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

    pendingOpsRef.current++;
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
        setPendingParentBySubcategory((prev) => {
          const next = { ...prev };
          delete next[subcategory.id];
          return next;
        });
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
        if (error.name === "AbortError") return;
        setMsg("迁移失败: " + error.message);
      })
      .finally(() => {
        pendingOpsRef.current--;
        setSaving("");
      });
  }

  function moveCategory(categoryId: number, direction: -1 | 1) {
    if (guardPending()) return;
    const idx = categories.findIndex((c) => c.id === categoryId);
    if (idx < 0) return;
    const nextIdx = idx + direction;
    if (nextIdx < 0 || nextIdx >= categories.length) return;
    const next = [...categories];
    [next[idx], next[nextIdx]] = [next[nextIdx], next[idx]];
    setCategories(next);
    run("sort-category", () => updateCategorySortOrder(next));
  }

  function moveSubcategory(subcategoryId: number, direction: -1 | 1) {
    if (guardPending()) return;
    if (!selectedCategory) return;
    const idx = selectedCategory.subcategories.findIndex((s) => s.id === subcategoryId);
    if (idx < 0) return;
    const nextIdx = idx + direction;
    if (nextIdx < 0 || nextIdx >= selectedCategory.subcategories.length) return;
    const next = [...selectedCategory.subcategories];
    [next[idx], next[nextIdx]] = [next[nextIdx], next[idx]];
    setCategories((prev) =>
      prev.map((c) =>
        c.id === selectedCategory.id ? { ...c, subcategories: next } : c,
      ),
    );
    run("sort-subcategory", () => updateSubcategorySortOrder(next));
  }

  // Category drag handlers
  function handleCategoryDragStart(id: number) {
    setDraggingCategoryId(id);
  }
  function handleCategoryDragOver(e: MouseEvent<HTMLDivElement>, id: number) {
    e.preventDefault();
    setDragOverCategoryId(id);
  }
  function handleCategoryDrop(e: MouseEvent<HTMLDivElement>, targetId: number) {
    e.preventDefault();
    if (!draggingCategoryId || draggingCategoryId === targetId) {
      setDraggingCategoryId(null);
      setDragOverCategoryId(null);
      return;
    }
    const fromIdx = categories.findIndex((c) => c.id === draggingCategoryId);
    const toIdx = categories.findIndex((c) => c.id === targetId);
    if (fromIdx < 0 || toIdx < 0) return;
    const next = [...categories];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    setCategories(next);
    setDraggingCategoryId(null);
    setDragOverCategoryId(null);
    run("sort-category", () => updateCategorySortOrder(next));
  }
  function handleCategoryDragEnd() {
    setDraggingCategoryId(null);
    setDragOverCategoryId(null);
  }
  function handleCategoryTouchStart(id: number, e: TouchEvent<HTMLDivElement>) {
    touchDragRef.current = { categoryId: id, startY: e.touches[0].clientY };
  }
  function handleCategoryTouchMove(e: TouchEvent<HTMLDivElement>) {
    if (!touchDragRef.current) return;
    const el = document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY);
    const categoryId = getClosestNumberDataAttribute(el, "[data-category-id]", "categoryId");
    if (categoryId && categoryId !== touchDragRef.current.categoryId) {
      setDragOverCategoryId(categoryId);
    }
  }
  function handleCategoryTouchEnd() {
    if (touchDragRef.current && dragOverCategoryId && dragOverCategoryId !== touchDragRef.current.categoryId) {
      const fromIdx = categories.findIndex((c) => c.id === touchDragRef.current!.categoryId);
      const toIdx = categories.findIndex((c) => c.id === dragOverCategoryId);
      if (fromIdx >= 0 && toIdx >= 0) {
        const next = [...categories];
        const [moved] = next.splice(fromIdx, 1);
        next.splice(toIdx, 0, moved);
        setCategories(next);
        run("sort-category", () => updateCategorySortOrder(next));
      }
    }
    setDraggingCategoryId(null);
    setDragOverCategoryId(null);
    touchDragRef.current = null;
  }

  // Subcategory drag handlers
  function handleSubcategoryDragStart(id: number) {
    setDraggingSubcategoryId(id);
  }
  function handleSubcategoryDragOver(e: MouseEvent<HTMLDivElement>, id: number) {
    e.preventDefault();
    setDragOverSubcategoryId(id);
  }
  function handleSubcategoryDrop(e: MouseEvent<HTMLDivElement>, targetId: number) {
    e.preventDefault();
    if (!draggingSubcategoryId || draggingSubcategoryId === targetId || !selectedCategory) {
      setDraggingSubcategoryId(null);
      setDragOverSubcategoryId(null);
      return;
    }
    const fromIdx = selectedCategory.subcategories.findIndex((s) => s.id === draggingSubcategoryId);
    const toIdx = selectedCategory.subcategories.findIndex((s) => s.id === targetId);
    if (fromIdx < 0 || toIdx < 0) return;
    const next = [...selectedCategory.subcategories];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    setCategories((prev) =>
      prev.map((c) =>
        c.id === selectedCategory.id ? { ...c, subcategories: next } : c,
      ),
    );
    setDraggingSubcategoryId(null);
    setDragOverSubcategoryId(null);
    run("sort-subcategory", () => updateSubcategorySortOrder(next));
  }
  function handleSubcategoryDragEnd() {
    setDraggingSubcategoryId(null);
    setDragOverSubcategoryId(null);
  }
  function handleSubcategoryTouchStart(id: number, e: TouchEvent<HTMLDivElement>) {
    touchDragStateRef.current = { categoryId: selectedCategory?.id ?? 0, subcategoryId: id, startY: e.touches[0].clientY };
  }
  function handleSubcategoryTouchMove(e: TouchEvent<HTMLDivElement>) {
    if (!touchDragStateRef.current) return;
    const el = document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY);
    const subcategoryId = getClosestNumberDataAttribute(el, "[data-subcategory-id]", "subcategoryId");
    if (subcategoryId && subcategoryId !== touchDragStateRef.current.subcategoryId) {
      setDragOverSubcategoryId(subcategoryId);
    }
  }
  function handleSubcategoryTouchEnd() {
    if (touchDragStateRef.current && dragOverSubcategoryId && dragOverSubcategoryId !== touchDragStateRef.current.subcategoryId) {
      if (!selectedCategory) return;
      const fromIdx = selectedCategory.subcategories.findIndex((s) => s.id === touchDragStateRef.current!.subcategoryId);
      const toIdx = selectedCategory.subcategories.findIndex((s) => s.id === dragOverSubcategoryId);
      if (fromIdx >= 0 && toIdx >= 0) {
        const next = [...selectedCategory.subcategories];
        const [moved] = next.splice(fromIdx, 1);
        next.splice(toIdx, 0, moved);
        setCategories((prev) =>
          prev.map((c) =>
            c.id === selectedCategory.id ? { ...c, subcategories: next } : c,
          ),
        );
        run("sort-subcategory", () => updateSubcategorySortOrder(next));
      }
    }
    setDraggingSubcategoryId(null);
    setDragOverSubcategoryId(null);
    touchDragStateRef.current = null;
  }

  const currentCategory = selectedCategory || null;

  return (
    <section
      className="category-manager-section"
      style={{
        background: "#fff",
        borderRadius: "16px",
        padding: "24px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
        marginBottom: "24px",
        border: "1px solid rgba(0,0,0,0.04)",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", marginBottom: "20px" }}>
        <div>
          <h2 style={{ fontSize: "22px", fontWeight: 700, margin: 0, color: "#1a1a1a", letterSpacing: "-0.3px" }}>数据库分类管理</h2>
          <p style={{ fontSize: "13px", color: "#888", margin: "6px 0 0", lineHeight: "1.4" }}>
            直接管理 categories / subcategories 表，相关游戏数据会同步更新。
          </p>
        </div>
        <button
          onClick={() => loadCategories()}
          disabled={loading && !isMoving}
          style={{
            height: "34px",
            padding: "0 16px",
            borderRadius: "8px",
            border: "1px solid #e2e2e2",
            background: loading && !isMoving ? "#f5f5f5" : "#fff",
            cursor: loading && !isMoving ? "not-allowed" : "pointer",
            fontSize: "13px",
            fontWeight: 500,
            color: loading && !isMoving ? "#aaa" : "#555",
            transition: "all 0.2s",
            flexShrink: 0,
          }}
        >
          🔄 刷新
        </button>
      </div>

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 0", gap: "10px", color: "#888" }}>
          <div style={{ width: "20px", height: "20px", border: "2px solid #e2e2e2", borderTopColor: "#b87dd8", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <span style={{ fontSize: "14px" }}>加载中...</span>
        </div>
      ) : (
        <div
          className="category-manager-layout"
          style={{
            display: "grid",
            gridTemplateColumns: "340px minmax(0, 1fr)",
            alignItems: "start",
            gap: "16px",
          }}
        >
          {/* Left: Main Categories */}
          <div
            className="category-main-panel"
            style={{
              border: "1px solid #e8e8e8",
              borderRadius: "14px",
              background: "rgba(147,51,234,0.05)",
              padding: "14px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "8px",
                marginBottom: "12px",
                padding: "0 2px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#333" }}>主分类</span>
                <span style={{ fontSize: "11px", color: "#aaa", background: "#fff", padding: "2px 6px", borderRadius: "10px", border: "1px solid #e2e2e2" }}>{categories.length} 个</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
              <input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="新增主分类"
                className="cat-list-input"
                style={{ ...inputStyle, flex: 1 }}
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
                style={{
                  padding: "0 14px",
                  borderRadius: "8px",
                  border: "none",
                  background: "rgba(147,51,234,0.1)",
                  color: "#fff",
                  cursor: saving ? "not-allowed" : "pointer",
                  fontSize: "13px",
                  fontWeight: 600,
                  transition: "opacity 0.2s",
                  opacity: saving ? 0.6 : 1,
                  whiteSpace: "nowrap",
                }}
              >
                + 添加
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              {categories.map((category) => {
                const active = selectedCategory?.id === category.id;
                const isDragging = draggingCategoryId === category.id;
                const isDragOver = dragOverCategoryId === category.id;
                return (
                  <div
                    key={category.id}
                    data-category-id={category.id}
                    draggable={!saving && !isMoving}
                    onClick={() => {
                      if (guardPending()) return;
                      setSelectedId(category.id);
                    }}
                    onDragStart={() => handleCategoryDragStart(category.id)}
                    onDragOver={(e) => handleCategoryDragOver(e as unknown as MouseEvent<HTMLDivElement>, category.id)}
                    onDrop={(e) => handleCategoryDrop(e as unknown as MouseEvent<HTMLDivElement>, category.id)}
                    onDragEnd={handleCategoryDragEnd}
                    onTouchStart={(e) => handleCategoryTouchStart(category.id, e)}
                    onTouchMove={handleCategoryTouchMove}
                    onTouchEnd={handleCategoryTouchEnd}
                    className="cat-list-item"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "10px 12px",
                      borderRadius: "10px",
                      border: `1.5px solid ${active ? "#b87dd8" : isDragOver ? "#16a34a" : "transparent"}`,
                      background: active
                        ? "rgba(147,51,234,0.08)"
                        : isDragOver
                        ? "rgba(22,163,74,0.08)"
                        : "#fff",
                      color: active ? "#7c22ce" : "#333",
                      cursor: "pointer",
                      textAlign: "left",
                      opacity: isDragging ? 0.4 : 1,
                      touchAction: "pan-y",
                      boxShadow: active ? "0 2px 8px rgba(147,51,234,0.15)" : "0 1px 3px rgba(0,0,0,0.06)",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <span style={{ cursor: saving || isMoving ? "not-allowed" : "grab", color: active ? "#b87dd8" : "#ccc", fontSize: "14px", flexShrink: 0 }}>⋮⋮</span>
                    <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, gap: "2px" }}>
                      <span className="cat-name" style={{ fontWeight: 600, fontSize: "13px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{category.name}</span>
                      <span className="cat-count" style={{ fontSize: "11px", color: active ? "#b87dd8" : "#aaa" }}>{category.subcategories.length} 子类 · {category.gameCount} 游戏</span>
                    </div>
                    <div className="cat-list-item-btns" style={{ display: "flex", gap: "3px", flexShrink: 0 }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); moveCategory(category.id, -1); }}
                        disabled={!!saving || categories[0]?.id === category.id}
                        style={{ padding: "3px 6px", borderRadius: "5px", border: "1px solid #e2e2e2", background: "#fff", cursor: saving || categories[0]?.id === category.id ? "not-allowed" : "pointer", fontSize: "11px", color: categories[0]?.id === category.id ? "#ddd" : "#888" }}
                        title="上移"
                      >↑</button>
                      <button
                        onClick={(e) => { e.stopPropagation(); moveCategory(category.id, 1); }}
                        disabled={!!saving || categories[categories.length - 1]?.id === category.id}
                        style={{ padding: "3px 6px", borderRadius: "5px", border: "1px solid #e2e2e2", background: "#fff", cursor: saving || categories[categories.length - 1]?.id === category.id ? "not-allowed" : "pointer", fontSize: "11px", color: categories[categories.length - 1]?.id === category.id ? "#ddd" : "#888" }}
                        title="下移"
                      >↓</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Subcategories */}
          {currentCategory && (
            <div
              className="subcategory-panel"
              style={{
                border: "1px solid #e8e8e8",
                borderRadius: "14px",
                background: "#fff",
                padding: "16px",
                minWidth: 0,
              }}
            >
              {/* Panel Header */}
              <div
                className="subcat-panel-header"
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: "12px",
                  marginBottom: "14px",
                  paddingBottom: "12px",
                  borderBottom: "1px solid #f0f0f0",
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: "17px",
                        fontWeight: 700,
                        color: "#1a1a1a",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {currentCategory.name}
                    </h3>
                    <span style={{ fontSize: "11px", color: "#fff", background: "rgba(147,51,234,0.1)", padding: "2px 8px", borderRadius: "10px", flexShrink: 0 }}>
                      {currentCategory.subcategories.length} 子分类
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: "12px", color: "#aaa" }}>
                    共 {currentCategory.gameCount} 个游戏关联
                  </p>
                </div>
                <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                  <button
                    onClick={() => {
                      if (guardPending()) return;
                      const next = prompt("新的主分类名称", currentCategory.name)?.trim();
                      if (!next || next === currentCategory.name) return;
                      confirmAndRun(
                        `确认把主分类「${currentCategory.name}」改成「${next}」？这会批量更新相关游戏数据。`,
                        "rename-category",
                        () => renameDbCategory(currentCategory.id, currentCategory.name, next),
                      );
                    }}
                    style={{ padding: "5px 12px", borderRadius: "8px", border: "1px solid #e2e2e2", background: "#fff", cursor: "pointer", fontSize: "12px", color: "#666", fontWeight: 500 }}
                  >
                    ✏️ 改名
                  </button>
                  <button
                    onClick={() => {
                      if (guardPending()) return;
                      if (confirm(`确认删除主分类「${currentCategory.name}」？相关游戏会移除这个分类值。`)) {
                        run("delete-category", () => deleteDbCategory(currentCategory.id, currentCategory.name));
                      }
                    }}
                    style={{ padding: "5px 12px", borderRadius: "8px", border: "1px solid #fecaca", background: "rgba(239,68,68,0.06)", color: "#dc2626", cursor: "pointer", fontSize: "12px", fontWeight: 500 }}
                  >
                    🗑️ 删除
                  </button>
                </div>
              </div>

              {/* Add Subcategory */}
              <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
                <input
                  value={newSubcategoryName}
                  onChange={(e) => setNewSubcategoryName(e.target.value)}
                  placeholder="新增子分类"
                  className="subcat-list-input"
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
                  style={{
                    padding: "0 14px",
                    borderRadius: "8px",
                    border: "none",
                    background: "rgba(147,51,234,0.1)",
                    color: "#fff",
                    cursor: saving ? "not-allowed" : "pointer",
                    fontSize: "13px",
                    fontWeight: 600,
                    opacity: saving ? 0.6 : 1,
                    whiteSpace: "nowrap",
                  }}
                >
                  + 添加
                </button>
              </div>

              {/* Subcategory Grid */}
              <div>
                {currentCategory.subcategories.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "32px 0", color: "#ccc" }}>
                    <div style={{ fontSize: "32px", marginBottom: "8px" }}>📭</div>
                    <p style={{ fontSize: "13px", color: "#bbb" }}>暂无子分类，点击上方添加</p>
                  </div>
                ) : (
                  <div className="subcat-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                    {currentCategory.subcategories.map((subcategory) => {
                      const parentId = pendingParentBySubcategory[subcategory.id] || currentCategory.id;
                      const isDragging = draggingSubcategoryId === subcategory.id;
                      const isDragOver = dragOverSubcategoryId === subcategory.id;
                      return (
                        <div
                          key={subcategory.id}
                          data-subcategory-id={subcategory.id}
                          draggable={!saving && !isMoving}
                          onDragStart={() => handleSubcategoryDragStart(subcategory.id)}
                          onDragOver={(e) => handleSubcategoryDragOver(e as unknown as MouseEvent<HTMLDivElement>, subcategory.id)}
                          onDrop={(e) => handleSubcategoryDrop(e as unknown as MouseEvent<HTMLDivElement>, subcategory.id)}
                          onDragEnd={handleSubcategoryDragEnd}
                          onTouchStart={(e) => handleSubcategoryTouchStart(subcategory.id, e)}
                          onTouchMove={handleSubcategoryTouchMove}
                          onTouchEnd={handleSubcategoryTouchEnd}
                          className="subcat-item"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "8px",
                            padding: "8px 10px",
                            borderRadius: "8px",
                            border: `1.5px solid ${isDragOver ? "#16a34a" : "#e8e8e8"}`,
                            background: isDragging
                              ? "rgba(147,51,234,0.06)"
                              : isDragOver
                              ? "rgba(22,163,74,0.06)"
                              : "#fafafa",
                            boxSizing: "border-box",
                            opacity: isDragging ? 0.4 : 1,
                            touchAction: "pan-y",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <div className="subcat-info" style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
                            <span style={{ cursor: saving || isMoving ? "not-allowed" : "grab", color: "#ccc", fontSize: "13px", flexShrink: 0 }}>⋮⋮</span>
                            <div className="subcat-name" style={{ fontWeight: 600, fontSize: "13px", color: "#333", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{subcategory.name}</div>
                            <div style={{ fontSize: "12px", color: "#aaa", flexShrink: 0 }}>{subcategory.gameCount}游戏</div>
                          </div>
                          <div className="subcat-actions" style={{ display: "flex", alignItems: "center", gap: "3px", flexShrink: 0 }}>
                            <div className="subcat-move-btns" style={{ display: "flex", gap: "2px", flexShrink: 0 }}>
                              <button onClick={() => moveSubcategory(subcategory.id, -1)} disabled={!!saving || currentCategory.subcategories[0]?.id === subcategory.id} style={{ padding: "2px 5px", borderRadius: "4px", border: "1px solid #e2e2e2", background: "#fff", cursor: saving || currentCategory.subcategories[0]?.id === subcategory.id ? "not-allowed" : "pointer", fontSize: "11px", color: currentCategory.subcategories[0]?.id === subcategory.id ? "#e0e0e0" : "#999" }}>↑</button>
                              <button onClick={() => moveSubcategory(subcategory.id, 1)} disabled={!!saving || currentCategory.subcategories[currentCategory.subcategories.length - 1]?.id === subcategory.id} style={{ padding: "2px 5px", borderRadius: "4px", border: "1px solid #e2e2e2", background: "#fff", cursor: saving || currentCategory.subcategories[currentCategory.subcategories.length - 1]?.id === subcategory.id ? "not-allowed" : "pointer", fontSize: "11px", color: currentCategory.subcategories[currentCategory.subcategories.length - 1]?.id === subcategory.id ? "#e0e0e0" : "#999" }}>↓</button>
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
                              style={{ ...inputStyle, fontSize: "11px", padding: "2px 5px", width: "80px", flexShrink: 0 }}
                            >
                              {categories.map((category) => (
                                <option key={category.id} value={category.id}>{category.name}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => { const target = categories.find((item) => item.id === parentId); if (!target) return; handleMoveSubcategory(subcategory.id, currentCategory, target); }}
                              disabled={!!saving || parentId === currentCategory.id}
                              style={{ border: "none", background: "rgba(147,51,234,0.1)", color: parentId === currentCategory.id ? "#ccc" : "#b87dd8", cursor: saving || parentId === currentCategory.id ? "not-allowed" : "pointer", padding: "2px 6px", borderRadius: "4px", fontSize: "11px", fontWeight: 600, flexShrink: 0 }}
                            >
                              {isMoving ? "迁移中" : "迁移"}
                            </button>
                            <button
                              onClick={() => { if (guardPending()) return; const next = prompt("新的子分类名称", subcategory.name)?.trim(); if (!next || next === subcategory.name) return; confirmAndRun(`确认把子分类「${subcategory.name}」改成「${next}」？这会批量更新相关游戏数据。`, "rename-subcategory", () => renameDbSubcategory(currentCategory.id, subcategory.id, subcategory.name, next)); }}
                              style={{ border: "none", background: "transparent", color: "#999", cursor: "pointer", padding: "2px 4px", borderRadius: "4px", fontSize: "11px", flexShrink: 0 }}
                            >
                              改名
                            </button>
                            <button
                              onClick={() => { if (guardPending()) return; if (confirm(`确认删除子分类「${subcategory.name}」？相关游戏会移除这个子分类值。`)) { run("delete-subcategory", () => deleteDbSubcategory(subcategory.id, currentCategory.name, subcategory.name)); } }}
                              style={{ border: "none", background: "transparent", color: "#dc2626", cursor: "pointer", padding: "2px 4px", borderRadius: "4px", fontSize: "11px", flexShrink: 0 }}
                            >
                              删除
                            </button>
                          </div>
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

      {/* Move Progress */}
      {moveProgress && (
        <div style={{ marginTop: "16px", padding: "14px 16px", borderRadius: "12px", background: "#fafafa", border: "1px solid #e8e8e8" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", marginBottom: "8px", fontSize: "13px", color: "#555" }}>
            <span>正在迁移「{moveProgress.subcategory}」：{moveProgress.from} → {moveProgress.to}</span>
            <span style={{ fontWeight: 600, color: "#9333ea" }}>
              {moveProgress.done} / {moveProgress.total}
              {moveProgress.total > 0 ? ` (${Math.round((moveProgress.done / moveProgress.total) * 100)}%)` : ""}
            </span>
          </div>
          <div style={{ height: "6px", borderRadius: "999px", background: "#e8e8e8", overflow: "hidden" }}>
            <div style={{ height: "100%", width: moveProgress.total > 0 ? `${Math.min(100, (moveProgress.done / moveProgress.total) * 100)}%` : "0%", background: "linear-gradient(90deg, #b87dd8, #c77ddb)", transition: "width 0.3s ease", borderRadius: "999px" }} />
          </div>
          {moveProgress.current && (
            <p style={{ margin: "6px 0 0", fontSize: "11px", color: "#aaa" }}>
              当前处理游戏 ID：{moveProgress.current}
            </p>
          )}
        </div>
      )}

      {msg && (
        <p style={{
          margin: "14px 0 0",
          fontSize: "13px",
          fontWeight: 500,
          color: msg.includes("成功") || msg.includes("完成") ? "#16a34a" : "#dc2626",
          padding: "8px 12px",
          borderRadius: "8px",
          background: msg.includes("成功") || msg.includes("完成") ? "rgba(22,163,74,0.08)" : "rgba(220,38,38,0.08)",
        }}>
          {saving ? "⏳ 处理中..." : msg}
        </p>
      )}
    </section>
  );
}
