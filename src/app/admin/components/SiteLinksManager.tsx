"use client";

import { useState, useEffect } from "react";
import { supabase, SiteLink } from "@/lib/supabase";

export default function SiteLinksManager() {
  const [links, setLinks] = useState<SiteLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<"all" | "tool" | "help">("all");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", url: "", type: "tool" as "tool" | "help" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    loadLinks();
  }, []);

  function loadLinks() {
    setLoading(true);
    supabase
      .from("site_links")
      .select("*")
      .order("type", { ascending: true })
      .order("id", { ascending: true })
      .then(({ data }) => {
        setLinks(data || []);
        setLoading(false);
      });
  }

  async function handleSave() {
    if (!form.name.trim() || !form.url.trim()) {
      setMsg("名称和链接不能为空");
      return;
    }
    setSaving(true);
    setMsg("");
    if (editingId) {
      const { error } = await supabase
        .from("site_links")
        .update({ name: form.name.trim(), url: form.url.trim(), type: form.type })
        .eq("id", editingId);
      if (error) setMsg("更新失败: " + error.message);
      else { setMsg("更新成功"); setEditingId(null); setForm({ name: "", url: "", type: "tool" }); }
    } else {
      const { error } = await supabase
        .from("site_links")
        .insert({ name: form.name.trim(), url: form.url.trim(), type: form.type });
      if (error) setMsg("添加失败: " + error.message);
      else { setMsg("添加成功"); setForm({ name: "", url: "", type: "tool" }); }
    }
    setSaving(false);
    loadLinks();
  }

  async function handleDelete(id: number) {
    if (!confirm("确认删除这条链接？")) return;
    await supabase.from("site_links").delete().eq("id", id);
    loadLinks();
  }

  function startEdit(link: SiteLink) {
    setEditingId(link.id);
    setForm({ name: link.name, url: link.url, type: link.type });
    setMsg("");
  }

  const filtered = filterType === "all" ? links : links.filter((l) => l.type === filterType);

  return (
    <div style={{ padding: "20px" }}>
      <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "16px" }}>工具补丁 & 帮助中心管理</h2>

      {/* 筛选 */}
      <div style={{ marginBottom: "16px", display: "flex", gap: "8px" }}>
        {(["all", "tool", "help"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            style={{
              padding: "5px 14px",
              borderRadius: "6px",
              border: "1px solid",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: 600,
              background: filterType === t ? "#9333ea" : "white",
              color: filterType === t ? "white" : "#666",
              borderColor: filterType === t ? "#9333ea" : "#ddd",
            }}
          >
            {t === "all" ? "全部" : t === "tool" ? "工具补丁" : "帮助中心"}
          </button>
        ))}
      </div>

      {/* 添加/编辑表单 */}
      <div
        style={{
          background: "white",
          borderRadius: "10px",
          padding: "16px",
          marginBottom: "16px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        }}
      >
        <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "12px", color: "#333" }}>
          {editingId ? "编辑链接" : "添加链接"}
        </h3>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as "tool" | "help" })}
            style={{ padding: "7px 10px", borderRadius: "6px", border: "1px solid #ddd", fontSize: "13px" }}
          >
            <option value="tool">工具补丁</option>
            <option value="help">帮助中心</option>
          </select>
          <input
            type="text"
            placeholder="名称，如：WinRAR"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            style={{ padding: "7px 10px", borderRadius: "6px", border: "1px solid #ddd", fontSize: "13px", width: "160px" }}
          />
          <input
            type="url"
            placeholder="链接，如：https://"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            style={{ padding: "7px 10px", borderRadius: "6px", border: "1px solid #ddd", fontSize: "13px", flex: 1, minWidth: "200px" }}
          />
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: "7px 20px",
              borderRadius: "6px",
              background: "#9333ea",
              color: "white",
              border: "none",
              cursor: saving ? "not-allowed" : "pointer",
              fontSize: "13px",
              fontWeight: 600,
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "保存中..." : editingId ? "更新" : "添加"}
          </button>
          {editingId && (
            <button
              onClick={() => { setEditingId(null); setForm({ name: "", url: "", type: "tool" }); setMsg(""); }}
              style={{ padding: "7px 14px", borderRadius: "6px", background: "#f0f0f0", border: "1px solid #ddd", cursor: "pointer", fontSize: "13px" }}
            >
              取消
            </button>
          )}
        </div>
        {msg && (
          <p style={{ marginTop: "8px", fontSize: "13px", color: msg.includes("成功") ? "#16a34a" : "#ef4444" }}>
            {msg}
          </p>
        )}
      </div>

      {/* 列表 */}
      {loading ? (
        <p style={{ color: "#888", textAlign: "center", padding: "40px" }}>加载中...</p>
      ) : filtered.length === 0 ? (
        <p style={{ color: "#888", textAlign: "center", padding: "40px" }}>暂无链接</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", background: "white", borderRadius: "10px", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              <th style={{ padding: "10px 14px", textAlign: "left", fontSize: "13px", fontWeight: 600, color: "#555" }}>类型</th>
              <th style={{ padding: "10px 14px", textAlign: "left", fontSize: "13px", fontWeight: 600, color: "#555" }}>名称</th>
              <th style={{ padding: "10px 14px", textAlign: "left", fontSize: "13px", fontWeight: 600, color: "#555" }}>链接</th>
              <th style={{ padding: "10px 14px", textAlign: "right", fontSize: "13px", fontWeight: 600, color: "#555" }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((link) => (
              <tr key={link.id} style={{ borderTop: "1px solid #f0f0f0" }}>
                <td style={{ padding: "10px 14px" }}>
                  <span style={{
                    display: "inline-block",
                    padding: "2px 10px",
                    borderRadius: "12px",
                    fontSize: "11px",
                    fontWeight: 600,
                    background: link.type === "tool" ? "rgba(245,158,11,0.1)" : "rgba(33,150,243,0.1)",
                    color: link.type === "tool" ? "#f59e0b" : "#2196f3",
                  }}>
                    {link.type === "tool" ? "工具补丁" : "帮助中心"}
                  </span>
                </td>
                <td style={{ padding: "10px 14px", fontSize: "13px", color: "#333" }}>{link.name}</td>
                <td style={{ padding: "10px 14px", fontSize: "12px" }}>
                  <a href={link.url} target="_blank" rel="noopener noreferrer" style={{ color: "#9333ea", textDecoration: "none", wordBreak: "break-all" }}>
                    {link.url}
                  </a>
                </td>
                <td style={{ padding: "10px 14px", textAlign: "right" }}>
                  <button
                    onClick={() => startEdit(link)}
                    style={{ padding: "4px 12px", borderRadius: "5px", border: "1px solid #9333ea", background: "rgba(147,51,234,0.08)", color: "#9333ea", cursor: "pointer", fontSize: "12px", marginRight: "6px" }}
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleDelete(link.id)}
                    style={{ padding: "4px 12px", borderRadius: "5px", border: "1px solid #ef4444", background: "rgba(239,68,68,0.08)", color: "#ef4444", cursor: "pointer", fontSize: "12px" }}
                  >
                    删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
