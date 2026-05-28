"use client";

import { useEffect, useMemo, useState } from "react";
import {
  HomeDisplayGroup,
  HomeDisplaySubcategory,
  addHomeDisplayGroup,
  deleteHomeDisplayGroup,
  fetchHomeDisplayGroups,
  renameHomeDisplayGroup,
  saveHomeDisplayGroupItems,
  updateHomeDisplayGroupSort,
} from "@/lib/homeDisplay";

const inputStyle = {
  padding: "7px 10px",
  borderRadius: "7px",
  border: "1px solid #ddd",
  fontSize: "13px",
  boxSizing: "border-box" as const,
};

export default function HomeDisplayManager() {
  const [groups, setGroups] = useState<HomeDisplayGroup[]>([]);
  const [subcategories, setSubcategories] = useState<HomeDisplaySubcategory[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedSubcategoryIds, setSelectedSubcategoryIds] = useState<Set<number>>(new Set());
  const [selectedSubcategoryOrder, setSelectedSubcategoryOrder] = useState<number[]>([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [msg, setMsg] = useState("");
  const [draggingGroupId, setDraggingGroupId] = useState<number | null>(null);
  const [draggingSubcategoryId, setDraggingSubcategoryId] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === selectedId) || groups[0] || null,
    [groups, selectedId],
  );

  function applySelectedGroup(group: HomeDisplayGroup | null) {
    const orderedIds = group?.subcategories.map((item) => item.id) || [];
    setSelectedSubcategoryIds(new Set(orderedIds));
    setSelectedSubcategoryOrder(orderedIds);
  }

  const orderedSubcategories = useMemo(() => {
    const selected = selectedSubcategoryOrder
      .filter((id) => selectedSubcategoryIds.has(id))
      .map((id) => subcategories.find((subcategory) => subcategory.id === id))
      .filter(Boolean) as HomeDisplaySubcategory[];
    const selectedIdSet = new Set(selected.map((subcategory) => subcategory.id));
    const unselected = subcategories.filter((subcategory) => !selectedIdSet.has(subcategory.id));
    return [...selected, ...unselected];
  }, [selectedSubcategoryOrder, selectedSubcategoryIds, subcategories]);

  function loadData(nextSelectedId?: number | null) {
    setLoading(true);
    fetchHomeDisplayGroups()
      .then((data) => {
        setGroups(data.groups);
        setSubcategories(data.subcategories);
        const nextGroup =
          data.groups.find((group) => group.id === nextSelectedId) ||
          data.groups.find((group) => group.id === selectedId) ||
          data.groups[0] ||
          null;
        setSelectedId(nextGroup?.id ?? null);
        applySelectedGroup(nextGroup);
      })
      .catch((error: any) => setMsg("加载失败: " + error.message))
      .finally(() => setLoading(false));
  }

  async function run(actionName: string, action: () => Promise<number | void>) {
    setSaving(actionName);
    setMsg("");
    try {
      const nextSelectedId = await action();
      await loadData(typeof nextSelectedId === "number" ? nextSelectedId : selectedId);
      setMsg("操作成功");
    } catch (error: any) {
      setMsg("操作失败: " + error.message);
    } finally {
      setSaving("");
    }
  }

  function selectGroup(group: HomeDisplayGroup) {
    if (saving) return;
    setSelectedId(group.id);
    applySelectedGroup(group);
    setMsg("");
  }

  function toggleSubcategory(subcategoryId: number) {
    setSelectedSubcategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(subcategoryId)) {
        next.delete(subcategoryId);
        setSelectedSubcategoryOrder((current) => current.filter((id) => id !== subcategoryId));
      } else {
        next.add(subcategoryId);
        setSelectedSubcategoryOrder((current) =>
          current.includes(subcategoryId) ? current : [...current, subcategoryId],
        );
      }
      return next;
    });
  }

  function moveSelectedSubcategory(subcategoryId: number, direction: -1 | 1) {
    setSelectedSubcategoryOrder((current) => {
      const index = current.indexOf(subcategoryId);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function moveSelectedSubcategoryByDrop(sourceId: number, targetId: number) {
    if (!selectedGroup || sourceId === targetId) return;
    const sourceSelected = selectedSubcategoryIds.has(sourceId);
    const targetSelected = selectedSubcategoryIds.has(targetId);
    const currentSelectedOrder = selectedSubcategoryOrder.filter((id) => selectedSubcategoryIds.has(id));
    const sourceIndex = currentSelectedOrder.indexOf(sourceId);
    const targetIndex = currentSelectedOrder.indexOf(targetId);

    if (sourceSelected && targetSelected) {
      if (sourceIndex < 0 || targetIndex < 0) return;
      const next = [...currentSelectedOrder];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      setSelectedSubcategoryOrder(next);
      run("save-items", () => saveHomeDisplayGroupItems(selectedGroup.id, next));
      return;
    }

    if (!sourceSelected && targetSelected) {
      if (targetIndex < 0) return;
      const nextSelectedIds = new Set(selectedSubcategoryIds);
      nextSelectedIds.add(sourceId);
      const next = [...currentSelectedOrder];
      next.splice(targetIndex, 0, sourceId);
      setSelectedSubcategoryIds(nextSelectedIds);
      setSelectedSubcategoryOrder(next);
      run("save-items", () => saveHomeDisplayGroupItems(selectedGroup.id, next));
    }
  }

  function moveGroup(groupId: number, direction: -1 | 1) {
    const index = groups.findIndex((group) => group.id === groupId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= groups.length) return;
    if (!confirm(`确认调整首页主分类「${groups[index].name}」的展示顺序吗？`)) return;

    const next = [...groups];
    [next[index], next[target]] = [next[target], next[index]];
    run("sort-groups", async () => {
      await updateHomeDisplayGroupSort(
        next.map((group, sortOrder) => ({ ...group, sortOrder })),
      );
      return groupId;
    });
  }

  function moveGroupByDrop(sourceId: number, targetId: number) {
    if (sourceId === targetId) return;
    const sourceIndex = groups.findIndex((group) => group.id === sourceId);
    const targetIndex = groups.findIndex((group) => group.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;
    if (!confirm("确认调整首页主分类展示顺序吗？")) return;

    const next = [...groups];
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);
    run("sort-groups", async () => {
      await updateHomeDisplayGroupSort(
        next.map((group, sortOrder) => ({ ...group, sortOrder })),
      );
      return sourceId;
    });
  }

  function addGroup() {
    const cleanName = newGroupName.trim();
    if (!cleanName) {
      setMsg("请输入首页主分类名称");
      return;
    }
    if (!confirm(`确认新增首页主分类「${cleanName}」？`)) return;
    run("add-group", async () => {
      await addHomeDisplayGroup(cleanName);
      setNewGroupName("");
    });
  }

  function renameGroup() {
    if (!selectedGroup) return;
    const next = prompt("新的首页主分类名称", selectedGroup.name)?.trim();
    if (!next || next === selectedGroup.name) return;
    if (!confirm(`确认把首页主分类「${selectedGroup.name}」改成「${next}」？`)) return;
    run("rename-group", () => renameHomeDisplayGroup(selectedGroup.id, selectedGroup.name, next));
  }

  function deleteGroup() {
    if (!selectedGroup) return;
    if (
      !confirm(
        `确认删除首页主分类「${selectedGroup.name}」？只会删除首页展示分组，不会删除数据库分类和游戏。`,
      )
    ) {
      return;
    }
    run("delete-group", () => deleteHomeDisplayGroup(selectedGroup.id));
  }

  function saveGroupItems() {
    if (!selectedGroup) return;
    if (!confirm(`确认保存「${selectedGroup.name}」的首页子分类分配吗？`)) return;
    run("save-items", () =>
      saveHomeDisplayGroupItems(
        selectedGroup.id,
        selectedSubcategoryOrder.filter((id) => selectedSubcategoryIds.has(id)),
      ),
    );
  }

  return (
    <section
      style={{
        background: "white",
        borderRadius: "10px",
        padding: "14px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        marginBottom: "20px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", marginBottom: "12px" }}>
        <div>
          <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0 }}>首页展示配置</h2>
          <p style={{ fontSize: "12px", color: "#777", margin: "3px 0 0" }}>
            左侧管理首页主分类，右侧勾选和拖动子分类。
          </p>
        </div>
        <button
          onClick={() => loadData(selectedId)}
          disabled={loading || !!saving}
          style={{ height: 32, padding: "0 12px", borderRadius: "7px", border: "1px solid #ddd", background: "#fafafa", cursor: loading || saving ? "not-allowed" : "pointer", fontSize: "13px" }}
        >
          刷新
        </button>
      </div>

      {loading ? (
        <p style={{ color: "#888", textAlign: "center", padding: "20px 0" }}>加载中...</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: "12px", alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", minWidth: 0 }}>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="新增首页主分类"
                style={{ ...inputStyle, minWidth: 0, flex: 1 }}
              />
              <button
                onClick={addGroup}
                disabled={!!saving}
                style={{ height: 34, padding: "0 14px", borderRadius: "8px", border: "1px solid #9333ea", background: "rgba(147,51,234,0.08)", color: "#9333ea", cursor: saving ? "not-allowed" : "pointer", fontSize: "13px", fontWeight: 600 }}
              >
                添加
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
              {groups.map((group) => {
                const active = selectedGroup?.id === group.id;
                return (
                  <div
                    key={group.id}
                    draggable={!saving}
                    onClick={() => selectGroup(group)}
                    onDragStart={() => setDraggingGroupId(group.id)}
                    onDragEnd={() => setDraggingGroupId(null)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      if (!draggingGroupId) return;
                      moveGroupByDrop(draggingGroupId, group.id);
                      setDraggingGroupId(null);
                    }}
                    style={{
                      minHeight: 68,
                      padding: "10px 12px",
                      borderRadius: "10px",
                      border: `1px solid ${active ? "#9333ea" : "#e5e7eb"}`,
                      background: active ? "rgba(147,51,234,0.08)" : "#fafafa",
                      boxShadow: active ? "0 4px 12px rgba(147,51,234,0.12)" : "none",
                      color: active ? "#6b21a8" : "#333",
                      cursor: saving ? "not-allowed" : "grab",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: "6px",
                      opacity: draggingGroupId === group.id ? 0.55 : 1,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "center" }}>
                      <strong style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "13px" }}>
                        {group.name}
                      </strong>
                      <span style={{ flexShrink: 0, color: "#888", fontSize: "11px" }}>{group.subcategories.length} 子类</span>
                    </div>
                    <span style={{ color: "#999", fontSize: "11px" }}>拖动调整位置</span>
                  </div>
                );
              })}
            </div>

            {selectedGroup && (
              <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                <button
                  onClick={() => moveGroup(selectedGroup.id, -1)}
                  disabled={!!saving || groups[0]?.id === selectedGroup.id}
                  style={{ padding: "6px 10px", borderRadius: "7px", border: "1px solid #ddd", background: "#fff", color: "#333", cursor: saving ? "not-allowed" : "pointer", fontSize: "12px" }}
                >
                  上移
                </button>
                <button
                  onClick={() => moveGroup(selectedGroup.id, 1)}
                  disabled={!!saving || groups[groups.length - 1]?.id === selectedGroup.id}
                  style={{ padding: "6px 10px", borderRadius: "7px", border: "1px solid #ddd", background: "#fff", color: "#333", cursor: saving ? "not-allowed" : "pointer", fontSize: "12px" }}
                >
                  下移
                </button>
                <button
                  onClick={renameGroup}
                  disabled={!!saving}
                  style={{ padding: "6px 10px", borderRadius: "7px", border: "1px solid #9333ea", background: "rgba(147,51,234,0.08)", color: "#9333ea", cursor: saving ? "not-allowed" : "pointer", fontSize: "12px" }}
                >
                  改名
                </button>
                <button
                  onClick={deleteGroup}
                  disabled={!!saving}
                  style={{ padding: "6px 10px", borderRadius: "7px", border: "1px solid #ef4444", background: "rgba(239,68,68,0.08)", color: "#ef4444", cursor: saving ? "not-allowed" : "pointer", fontSize: "12px" }}
                >
                  删除
                </button>
                <button
                  onClick={saveGroupItems}
                  disabled={!!saving}
                  style={{ padding: "7px 12px", borderRadius: "7px", border: "none", background: "#9333ea", color: "white", cursor: saving ? "not-allowed" : "pointer", fontSize: "12px", fontWeight: 600 }}
                >
                  {saving === "save-items" ? "保存中..." : "保存分配"}
                </button>
              </div>
            )}
          </div>

          <div style={{ minWidth: 0 }}>
            {selectedGroup ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ fontSize: "12px", color: "#777", fontWeight: 700 }}>
                  {selectedGroup.name} 的子分类
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "8px" }}>
                  {orderedSubcategories.map((subcategory) => {
                    const checked = selectedSubcategoryIds.has(subcategory.id);
                    const assignedElsewhere =
                      subcategory.homeGroupId !== null &&
                      subcategory.homeGroupId !== selectedGroup.id;
                    const assignedGroupName = groups.find((group) => group.id === subcategory.homeGroupId)?.name;
                    const orderIndex = selectedSubcategoryOrder.indexOf(subcategory.id);
                    return (
                      <label
                        key={subcategory.id}
                        draggable={checked && !saving}
                        onDragStart={() => checked && setDraggingSubcategoryId(subcategory.id)}
                        onDragEnd={() => setDraggingSubcategoryId(null)}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => {
                          event.preventDefault();
                          if (!draggingSubcategoryId || !checked) return;
                          moveSelectedSubcategoryByDrop(draggingSubcategoryId, subcategory.id);
                          setDraggingSubcategoryId(null);
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          minHeight: 36,
                          padding: "7px 9px",
                          borderRadius: "8px",
                          border: `1px solid ${checked ? "#9333ea" : "#eee"}`,
                          background: checked ? "rgba(147,51,234,0.08)" : "#fafafa",
                          color: "#333",
                          fontSize: "12px",
                          cursor: saving ? "not-allowed" : "pointer",
                          opacity: draggingSubcategoryId === subcategory.id ? 0.55 : 1,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={!!saving}
                          onChange={() => toggleSubcategory(subcategory.id)}
                        />
                        <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {subcategory.name}
                        </span>
                        {checked && (
                          <span style={{ color: "#999", flexShrink: 0, fontSize: "11px", width: 18, textAlign: "right" }}>
                            {orderIndex >= 0 ? orderIndex + 1 : ""}
                          </span>
                        )}
                        <span style={{ color: "#999", flexShrink: 0, fontSize: "11px" }}>
                          {subcategory.dbCategoryName} / {subcategory.gameCount}游戏
                        </span>
                        {assignedElsewhere && (
                          <span style={{ color: "#999", flexShrink: 0, fontSize: "11px" }}>
                            在 {assignedGroupName}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p style={{ color: "#999", fontSize: "13px" }}>暂无首页主分类</p>
            )}
          </div>
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
