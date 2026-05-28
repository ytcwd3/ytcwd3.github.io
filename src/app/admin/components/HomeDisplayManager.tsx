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
  borderRadius: "6px",
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

  useEffect(() => {
    loadData();
  }, []);

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === selectedId) || groups[0] || null,
    [groups, selectedId],
  );

  const subcategoriesByDbCategory = useMemo(() => {
    const grouped = new Map<string, HomeDisplaySubcategory[]>();
    for (const subcategory of subcategories) {
      const key = subcategory.dbCategoryName || "未分类";
      const list = grouped.get(key) || [];
      list.push(subcategory);
      grouped.set(key, list);
    }
    return Array.from(grouped.entries());
  }, [subcategories]);

  function applySelectedGroup(group: HomeDisplayGroup | null) {
    const orderedIds = group?.subcategories.map((item) => item.id) || [];
    setSelectedSubcategoryIds(new Set(orderedIds));
    setSelectedSubcategoryOrder(orderedIds);
  }

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

  const selectedSubcategories = selectedSubcategoryOrder
    .filter((id) => selectedSubcategoryIds.has(id))
    .map((id) => subcategories.find((subcategory) => subcategory.id === id))
    .filter(Boolean) as HomeDisplaySubcategory[];

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
          <h2 style={{ fontSize: "20px", fontWeight: 700, margin: 0 }}>首页展示配置</h2>
          <p style={{ fontSize: "12px", color: "#777", margin: "4px 0 0" }}>
            首页主分类独立管理，子分类来自 subcategories 表，只决定首页展示分组。
          </p>
        </div>
        <button
          onClick={() => loadData(selectedId)}
          disabled={loading || !!saving}
          style={{ height: 32, padding: "0 12px", borderRadius: "6px", border: "1px solid #ddd", background: "#fafafa", cursor: loading || saving ? "not-allowed" : "pointer", fontSize: "13px" }}
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
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="新增首页主分类"
                style={{ ...inputStyle, minWidth: 0, flex: 1 }}
              />
              <button
                onClick={addGroup}
                disabled={!!saving}
                style={{ padding: "0 12px", borderRadius: "6px", border: "1px solid #9333ea", background: "rgba(147,51,234,0.08)", color: "#9333ea", cursor: saving ? "not-allowed" : "pointer", fontSize: "13px" }}
              >
                添加
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {groups.map((group, index) => (
                <div
                  key={group.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    border: `1px solid ${selectedGroup?.id === group.id ? "#9333ea" : "#eee"}`,
                    background: selectedGroup?.id === group.id ? "rgba(147,51,234,0.08)" : "#fafafa",
                    color: selectedGroup?.id === group.id ? "#6b21a8" : "#333",
                    cursor: saving ? "not-allowed" : "pointer",
                    textAlign: "left",
                    fontSize: "13px",
                  }}
                >
                  <button
                    onClick={() => selectGroup(group)}
                    disabled={!!saving}
                    style={{ flex: 1, minWidth: 0, border: "none", background: "transparent", color: "inherit", cursor: saving ? "not-allowed" : "pointer", textAlign: "left", padding: 0, fontSize: "13px" }}
                  >
                    <span style={{ display: "block", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{group.name}</span>
                    <span style={{ display: "block", color: "#888", marginTop: "2px" }}>{group.subcategories.length} 子类</span>
                  </button>
                  <button
                    onClick={() => moveGroup(group.id, -1)}
                    disabled={!!saving || index === 0}
                    style={{ border: "none", background: "transparent", color: index === 0 ? "#bbb" : "#9333ea", cursor: saving || index === 0 ? "not-allowed" : "pointer", padding: "0 2px", fontSize: "12px" }}
                  >
                    上
                  </button>
                  <button
                    onClick={() => moveGroup(group.id, 1)}
                    disabled={!!saving || index === groups.length - 1}
                    style={{ border: "none", background: "transparent", color: index === groups.length - 1 ? "#bbb" : "#9333ea", cursor: saving || index === groups.length - 1 ? "not-allowed" : "pointer", padding: "0 2px", fontSize: "12px" }}
                  >
                    下
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            {selectedGroup ? (
              <>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "12px" }}>
                  <strong style={{ fontSize: "15px", flex: 1 }}>{selectedGroup.name}</strong>
                  <button
                    onClick={renameGroup}
                    disabled={!!saving}
                    style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #9333ea", background: "rgba(147,51,234,0.08)", color: "#9333ea", cursor: saving ? "not-allowed" : "pointer", fontSize: "12px" }}
                  >
                    改名
                  </button>
                  <button
                    onClick={deleteGroup}
                    disabled={!!saving}
                    style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #ef4444", background: "rgba(239,68,68,0.08)", color: "#ef4444", cursor: saving ? "not-allowed" : "pointer", fontSize: "12px" }}
                  >
                    删除
                  </button>
                  <button
                    onClick={saveGroupItems}
                    disabled={!!saving}
                    style={{ padding: "7px 12px", borderRadius: "6px", border: "none", background: "#9333ea", color: "white", cursor: saving ? "not-allowed" : "pointer", fontSize: "12px", fontWeight: 600 }}
                  >
                    {saving === "save-items" ? "保存中..." : "保存分配"}
                  </button>
                </div>

                <div style={{ marginBottom: "14px", padding: "10px", borderRadius: "8px", border: "1px solid #eee", background: "#fafafa" }}>
                  <div style={{ fontSize: "12px", color: "#777", fontWeight: 700, marginBottom: "8px" }}>
                    当前首页展示顺序
                  </div>
                  {selectedSubcategories.length === 0 ? (
                    <p style={{ margin: 0, color: "#999", fontSize: "12px" }}>这个首页主分类暂未分配子分类</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {selectedSubcategories.map((subcategory, index) => (
                        <div
                          key={subcategory.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "7px 8px",
                            borderRadius: "6px",
                            background: "white",
                            border: "1px solid #eee",
                            fontSize: "12px",
                          }}
                        >
                          <span style={{ width: 24, color: "#999" }}>{index + 1}</span>
                          <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {subcategory.name}
                          </span>
                          <span style={{ color: "#999", flexShrink: 0 }}>{subcategory.dbCategoryName}</span>
                          <button
                            onClick={() => moveSelectedSubcategory(subcategory.id, -1)}
                            disabled={!!saving || index === 0}
                            style={{ border: "none", background: "transparent", color: index === 0 ? "#bbb" : "#9333ea", cursor: saving || index === 0 ? "not-allowed" : "pointer", padding: "0 2px", fontSize: "12px" }}
                          >
                            上移
                          </button>
                          <button
                            onClick={() => moveSelectedSubcategory(subcategory.id, 1)}
                            disabled={!!saving || index === selectedSubcategories.length - 1}
                            style={{ border: "none", background: "transparent", color: index === selectedSubcategories.length - 1 ? "#bbb" : "#9333ea", cursor: saving || index === selectedSubcategories.length - 1 ? "not-allowed" : "pointer", padding: "0 2px", fontSize: "12px" }}
                          >
                            下移
                          </button>
                          <button
                            onClick={() => toggleSubcategory(subcategory.id)}
                            disabled={!!saving}
                            style={{ border: "none", background: "transparent", color: "#ef4444", cursor: saving ? "not-allowed" : "pointer", padding: "0 2px", fontSize: "12px" }}
                          >
                            移除
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {subcategoriesByDbCategory.map(([dbCategoryName, items]) => (
                    <div key={dbCategoryName}>
                      <div style={{ fontSize: "12px", color: "#777", fontWeight: 700, marginBottom: "6px" }}>
                        {dbCategoryName}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "8px" }}>
                        {items.map((subcategory) => {
                          const checked = selectedSubcategoryIds.has(subcategory.id);
                          const assignedElsewhere =
                            subcategory.homeGroupId !== null &&
                            subcategory.homeGroupId !== selectedGroup.id;
                          const assignedGroupName = groups.find((group) => group.id === subcategory.homeGroupId)?.name;
                          return (
                            <label
                              key={subcategory.id}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                padding: "8px 10px",
                                borderRadius: "8px",
                                border: `1px solid ${checked ? "#9333ea" : "#eee"}`,
                                background: checked ? "rgba(147,51,234,0.08)" : "#fafafa",
                                color: "#333",
                                fontSize: "12px",
                                cursor: saving ? "not-allowed" : "pointer",
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
                              {assignedElsewhere && (
                                <span style={{ color: "#999", flexShrink: 0 }}>
                                  在 {assignedGroupName}
                                </span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </>
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
