"use client";

import { useEffect, useMemo, useState } from "react";
import { DbCategory, fetchDbCategories } from "@/lib/categoryTables";
import {
  HomeDisplayGroup,
  fetchHomeDisplayGroups,
  saveHomeDisplayGroups,
} from "@/lib/homeDisplayTables";

const inputStyle = {
  padding: "7px 10px",
  borderRadius: "6px",
  border: "1px solid #ddd",
  fontSize: "13px",
  boxSizing: "border-box" as const,
};

export default function HomeDisplayManager() {
  const [dbCategories, setDbCategories] = useState<DbCategory[]>([]);
  const [groups, setGroups] = useState<HomeDisplayGroup[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [newGroupName, setNewGroupName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const selectedGroup = groups[selectedIndex];

  const availableSubcategories = useMemo(
    () => dbCategories.flatMap((category) => category.subcategories),
    [dbCategories],
  );

  function loadData() {
    setLoading(true);
    Promise.all([fetchDbCategories(), fetchHomeDisplayGroups()])
      .then(([dbData, savedGroups]) => {
        setDbCategories(dbData);
        setGroups(
          savedGroups.length > 0
            ? savedGroups
            : dbData.map((category) => ({
                id: -category.id,
                name: category.name,
                subcategoryIds: category.subcategories.map((subcategory) => subcategory.id),
              })),
        );
        setSelectedIndex(0);
      })
      .catch((error: any) => setMsg("加载失败: " + error.message))
      .finally(() => setLoading(false));
  }

  function confirmAndSet(message: string, action: () => void) {
    if (!confirm(message)) return;
    action();
  }

  function addGroup() {
    const name = newGroupName.trim();
    if (!name) {
      setMsg("展示分组名称不能为空");
      return;
    }
    setGroups((prev) => [...prev, { id: -Date.now(), name, subcategoryIds: [] }]);
    setSelectedIndex(groups.length);
    setNewGroupName("");
  }

  function moveGroup(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= groups.length) return;
    setGroups((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setSelectedIndex(target);
  }

  function toggleSubcategory(subcategoryId: number) {
    setGroups((prev) =>
      prev.map((group, index) => {
        if (index !== selectedIndex) return group;
        const exists = group.subcategoryIds.includes(subcategoryId);
        return {
          ...group,
          subcategoryIds: exists
            ? group.subcategoryIds.filter((id) => id !== subcategoryId)
            : [...group.subcategoryIds, subcategoryId],
        };
      }),
    );
  }

  async function handleSave() {
    if (groups.length === 0) {
      setMsg("至少保留一个首页展示分组");
      return;
    }
    setSaving(true);
    setMsg("");
    try {
      await saveHomeDisplayGroups(
        groups
          .map((group) => ({
            ...group,
            name: group.name.trim(),
            subcategoryIds: group.subcategoryIds.filter((id) =>
              availableSubcategories.some((subcategory) => subcategory.id === id),
            ),
          }))
          .filter((group) => group.name),
      );
      await loadData();
      setMsg("首页展示配置已保存");
    } finally {
      setSaving(false);
    }
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
          <h2 style={{ fontSize: "20px", fontWeight: 700, margin: 0 }}>首页展示配置</h2>
          <p style={{ fontSize: "12px", color: "#777", margin: "4px 0 0" }}>
            只控制首页怎么展示，不改数据库里的分类本身。
          </p>
        </div>
        <button
          onClick={() =>
            confirmAndSet("确认保存当前首页展示配置吗？", handleSave)
          }
          disabled={saving || loading}
          style={{ height: 32, padding: "0 14px", borderRadius: "6px", background: "#9333ea", color: "white", border: "none", cursor: saving || loading ? "not-allowed" : "pointer", fontSize: "13px", fontWeight: 600, opacity: saving || loading ? 0.7 : 1 }}
        >
          {saving ? "保存中..." : "保存展示"}
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
                placeholder="新增首页分组"
                style={{ ...inputStyle, minWidth: 0, flex: 1 }}
              />
              <button
                onClick={() => confirmAndSet(`确认新增分组「${newGroupName.trim()}」吗？`, addGroup)}
                style={{ padding: "0 12px", borderRadius: "6px", border: "1px solid #9333ea", background: "rgba(147,51,234,0.08)", color: "#9333ea", cursor: "pointer", fontSize: "13px" }}
              >
                添加
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {groups.map((group, index) => (
                <button
                  key={`${group.name}-${index}`}
                  onClick={() =>
                    confirmAndSet(`确认切换到分组「${group.name}」吗？`, () => setSelectedIndex(index))
                  }
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "8px",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    border: `1px solid ${selectedIndex === index ? "#9333ea" : "#eee"}`,
                    background: selectedIndex === index ? "rgba(147,51,234,0.08)" : "#fafafa",
                    color: selectedIndex === index ? "#6b21a8" : "#333",
                    cursor: "pointer",
                    textAlign: "left",
                    fontSize: "13px",
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{group.name || "未命名"}</span>
                  <span style={{ color: "#888" }}>{group.subcategoryIds.length}</span>
                </button>
              ))}
            </div>
          </div>

          {selectedGroup && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <input
                  value={selectedGroup.name}
                  onChange={(e) =>
                    setGroups((prev) =>
                      prev.map((group, index) =>
                        index === selectedIndex ? { ...group, name: e.target.value } : group,
                      ),
                    )
                  }
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button
                  onClick={() =>
                    confirmAndSet(
                      `确认将分组「${selectedGroup.name}」上移吗？`,
                      () => moveGroup(selectedIndex, -1),
                    )
                  }
                  disabled={selectedIndex === 0}
                  style={{ padding: "6px 10px", borderRadius: "5px", border: "1px solid #ddd", background: "#fafafa", cursor: selectedIndex === 0 ? "not-allowed" : "pointer", fontSize: "12px" }}
                >
                  上移
                </button>
                <button
                  onClick={() =>
                    confirmAndSet(
                      `确认将分组「${selectedGroup.name}」下移吗？`,
                      () => moveGroup(selectedIndex, 1),
                    )
                  }
                  disabled={selectedIndex === groups.length - 1}
                  style={{ padding: "6px 10px", borderRadius: "5px", border: "1px solid #ddd", background: "#fafafa", cursor: selectedIndex === groups.length - 1 ? "not-allowed" : "pointer", fontSize: "12px" }}
                >
                  下移
                </button>
                <button
                  onClick={() =>
                    confirmAndSet(
                      `确认删除分组「${selectedGroup.name}」吗？`,
                      () =>
                        setGroups((prev) => prev.filter((_, index) => index !== selectedIndex)),
                    )
                  }
                  style={{ padding: "6px 10px", borderRadius: "5px", border: "1px solid #ef4444", background: "rgba(239,68,68,0.08)", color: "#ef4444", cursor: "pointer", fontSize: "12px" }}
                >
                  删除分组
                </button>
              </div>

              <div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "8px", width: "100%" }}>
                  {availableSubcategories.map((subcategory) => {
                    const active = selectedGroup.subcategoryIds.includes(subcategory.id);
                    return (
                      <button
                        key={subcategory.id}
                        onClick={() =>
                          confirmAndSet(
                            `确认${active ? "移除" : "添加"}子分类「${subcategory.name}」到「${selectedGroup.name}」吗？`,
                            () => toggleSubcategory(subcategory.id),
                          )
                        }
                        style={{
                          padding: "8px 10px",
                          borderRadius: "8px",
                          border: `1px solid ${active ? "#9333ea" : "#ddd"}`,
                          background: active ? "rgba(147,51,234,0.1)" : "#fafafa",
                          color: active ? "#6b21a8" : "#555",
                          cursor: "pointer",
                          fontSize: "12px",
                          textAlign: "left",
                        }}
                      >
                        {subcategory.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {msg && (
        <p style={{ margin: "12px 0 0", fontSize: "13px", color: msg.includes("成功") || msg.includes("保存") ? "#16a34a" : "#ef4444" }}>
          {msg}
        </p>
      )}
    </section>
  );
}
