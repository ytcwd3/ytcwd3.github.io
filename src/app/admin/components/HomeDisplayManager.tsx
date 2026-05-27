"use client";

import { useEffect, useMemo, useState } from "react";
import { DbCategory, fetchDbCategories } from "@/lib/dbCategories";
import {
  DEFAULT_HOME_CATEGORIES,
  HomeCategory,
  fetchHomeCategories,
  saveHomeCategories,
} from "@/lib/homeCategories";

const inputStyle = {
  padding: "7px 10px",
  borderRadius: "6px",
  border: "1px solid #ddd",
  fontSize: "13px",
  boxSizing: "border-box" as const,
};

export default function HomeDisplayManager() {
  const [dbCategories, setDbCategories] = useState<DbCategory[]>([]);
  const [displayCategories, setDisplayCategories] = useState<HomeCategory[]>(DEFAULT_HOME_CATEGORIES);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [newGroupName, setNewGroupName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const selectedGroup = displayCategories[selectedIndex];
  const allDbTags = useMemo(
    () =>
      Array.from(
        new Set(dbCategories.flatMap((category) => category.subcategories)),
      ).sort((a, b) => a.localeCompare(b, "zh-CN")),
    [dbCategories],
  );

  function loadData() {
    setLoading(true);
    Promise.all([fetchDbCategories(), fetchHomeCategories()])
      .then(([dbData, homeData]) => {
        setDbCategories(dbData);
        setDisplayCategories(homeData);
        setSelectedIndex(0);
      })
      .catch((error: any) => setMsg("加载失败: " + error.message))
      .finally(() => setLoading(false));
  }

  function addGroup() {
    const name = newGroupName.trim();
    if (!name) {
      setMsg("展示大分类名称不能为空");
      return;
    }
    setDisplayCategories((prev) => [...prev, { name, tags: [] }]);
    setSelectedIndex(displayCategories.length);
    setNewGroupName("");
    setMsg("");
  }

  function updateGroupName(value: string) {
    setDisplayCategories((prev) =>
      prev.map((group, index) =>
        index === selectedIndex ? { ...group, name: value } : group,
      ),
    );
  }

  function removeGroup(index: number) {
    if (!confirm("确认删除这个首页展示分组？不会删除数据库分类。")) return;
    setDisplayCategories((prev) => {
      const next = prev.filter((_, i) => i !== index);
      setSelectedIndex(Math.max(0, Math.min(index, next.length - 1)));
      return next.length > 0 ? next : [{ name: "首页分类", tags: [] }];
    });
  }

  function toggleTag(tag: string) {
    setDisplayCategories((prev) =>
      prev.map((group, index) => {
        if (index !== selectedIndex) return group;
        const exists = group.tags.includes(tag);
        return {
          ...group,
          tags: exists
            ? group.tags.filter((item) => item !== tag)
            : [...group.tags, tag],
        };
      }),
    );
  }

  function moveGroup(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= displayCategories.length) return;
    setDisplayCategories((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setSelectedIndex(target);
  }

  async function handleSave() {
    const cleaned = displayCategories
      .map((group) => ({
        name: group.name.trim(),
        tags: group.tags.filter((tag) => allDbTags.includes(tag)),
      }))
      .filter((group) => group.name);
    if (cleaned.length === 0) {
      setMsg("至少保留一个首页展示分组");
      return;
    }

    setSaving(true);
    setMsg("");
    try {
      const saved = await saveHomeCategories(cleaned);
      setDisplayCategories(saved);
      setMsg("首页展示已保存");
    } catch (error: any) {
      setMsg("保存失败: " + error.message);
    } finally {
      setSaving(false);
    }
  }

  function confirmAndSet(message: string, action: () => void) {
    if (!confirm(message)) return;
    action();
  }

  return (
    <section
      style={{
        background: "white",
        borderRadius: "10px",
        padding: "16px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", marginBottom: "14px" }}>
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: 700, margin: 0 }}>首页展示配置</h2>
          <p style={{ fontSize: "12px", color: "#777", margin: "4px 0 0" }}>
            只决定首页怎么分组展示，不新增、不改名、不删除数据库分类。
          </p>
        </div>
        <button
          onClick={() =>
            confirmAndSet(
              "确认保存当前首页展示配置吗？这不会改数据库分类，只会更新首页展示分组。",
              handleSave,
            )
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
                placeholder="新增首页大分类"
                style={{ ...inputStyle, minWidth: 0, flex: 1 }}
              />
              <button
                onClick={() =>
                  confirmAndSet(
                    `确认新增首页大分类「${newGroupName.trim()}」吗？`,
                    addGroup,
                  )
                }
                style={{ padding: "0 12px", borderRadius: "6px", border: "1px solid #9333ea", background: "rgba(147,51,234,0.08)", color: "#9333ea", cursor: "pointer", fontSize: "13px" }}
              >
                添加
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {displayCategories.map((group, index) => (
                <button
                  key={`${group.name}-${index}`}
                  onClick={() =>
                    confirmAndSet(
                      `确认切换到首页展示分组「${group.name}」吗？`,
                      () => setSelectedIndex(index),
                    )
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
                  <span style={{ color: "#888" }}>{group.tags.length}</span>
                </button>
              ))}
            </div>
          </div>

          {selectedGroup && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <input
                  value={selectedGroup.name}
                  onChange={(e) => updateGroupName(e.target.value)}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button
                  onClick={() =>
                    confirmAndSet(
                      `确认将首页展示分组「${selectedGroup.name}」上移吗？`,
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
                      `确认将首页展示分组「${selectedGroup.name}」下移吗？`,
                      () => moveGroup(selectedIndex, 1),
                    )
                  }
                  disabled={selectedIndex === displayCategories.length - 1}
                  style={{ padding: "6px 10px", borderRadius: "5px", border: "1px solid #ddd", background: "#fafafa", cursor: selectedIndex === displayCategories.length - 1 ? "not-allowed" : "pointer", fontSize: "12px" }}
                >
                  下移
                </button>
                <button
                  onClick={() =>
                    confirmAndSet(
                      `确认删除首页展示分组「${selectedGroup.name}」吗？不会删除数据库分类。`,
                      () => removeGroup(selectedIndex),
                    )
                  }
                  style={{ padding: "6px 10px", borderRadius: "5px", border: "1px solid #ef4444", background: "rgba(239,68,68,0.08)", color: "#ef4444", cursor: "pointer", fontSize: "12px" }}
                >
                  删除分组
                </button>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {allDbTags.map((tag) => {
                  const active = selectedGroup.tags.includes(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() =>
                        confirmAndSet(
                          `确认${active ? "移除" : "添加"}首页展示标签「${tag}」吗？`,
                          () => toggleTag(tag),
                        )
                      }
                      style={{
                        padding: "6px 10px",
                        borderRadius: "14px",
                        border: `1px solid ${active ? "#9333ea" : "#ddd"}`,
                        background: active ? "rgba(147,51,234,0.1)" : "#fafafa",
                        color: active ? "#6b21a8" : "#555",
                        cursor: "pointer",
                        fontSize: "12px",
                      }}
                    >
                      {tag}
                    </button>
                  );
                })}
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
