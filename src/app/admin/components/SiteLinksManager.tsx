"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { SiteLink, clearSiteLinksCache, ensureDefaultMascotMessages } from "@/lib/site_links";

type SiteLinkType = SiteLink["type"];

const linkTypes: { value: "all" | SiteLinkType; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "tool", label: "工具补丁" },
  { value: "help", label: "帮助中心" },
  { value: "mascot", label: "仓鼠话" },
];

const typeStyles: Record<SiteLinkType, { background: string; color: string }> = {
  tool: { background: "rgba(245,158,11,0.1)", color: "#f59e0b" },
  help: { background: "rgba(33,150,243,0.1)", color: "#2196f3" },
  mascot: { background: "rgba(216,87,232,0.12)", color: "#d857e8" },
};

function getTypeLabel(type: SiteLinkType) {
  return linkTypes.find((item) => item.value === type)?.label || type;
}

function splitLinkContent(value: string) {
  const parts = value
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : [value];
}

function getDriveLabel(url: string) {
  if (url.includes("pan.quark.cn")) return "夸克";
  if (url.includes("baidu.com")) return "百度";
  if (url.includes("xunlei.com")) return "迅雷";
  if (/^https?:\/\//i.test(url)) return "链接";
  return "说明";
}

function isUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

export default function SiteLinksManager() {
  const [links, setLinks] = useState<SiteLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<"all" | SiteLinkType>("all");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", url: "", type: "tool" as SiteLinkType });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  function getDefaultFormType(type = filterType) {
    return type === "all" ? "tool" : type;
  }

  function resetForm(type = filterType) {
    setForm({ name: "", url: "", type: getDefaultFormType(type) });
  }

  useEffect(() => {
    (async () => {
      await ensureDefaultMascotMessages();
      loadLinks();
    })();
  }, []);

  function loadLinks() {
    setLoading(true);
    supabase
      .from("site_links")
      .select("*")
      .order("type", { ascending: true })
      .order("id", { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          setMsg("加载失败: " + error.message);
          setLinks([]);
          setLoading(false);
          return;
        }
        setLinks((data || []).filter((link) => !link.name.startsWith("__")));
        setLoading(false);
      });
  }

  async function handleSave() {
    if (!form.name.trim() || !form.url.trim()) {
      setMsg(form.type === "mascot" ? "标题和话术内容不能为空" : "名称和链接不能为空");
      return;
    }
    setSaving(true);
    setMsg("");
    if (editingId) {
      const { data, error } = await supabase
        .from("site_links")
        .update({ name: form.name.trim(), url: form.url.trim(), type: form.type })
        .eq("id", editingId)
        .select("id")
        .single();
      if (error) setMsg("更新失败: " + error.message);
      else if (!data) setMsg("更新失败: 未找到这条记录");
      else { clearSiteLinksCache(); setMsg("更新成功"); setEditingId(null); resetForm(); }
    } else {
      const { data, error } = await supabase
        .from("site_links")
        .insert({ name: form.name.trim(), url: form.url.trim(), type: form.type })
        .select("id")
        .single();
      if (error) setMsg("添加失败: " + error.message);
      else if (!data) setMsg("添加失败: 数据库没有返回新增记录");
      else { clearSiteLinksCache(); setMsg("添加成功"); resetForm(); }
    }
    setSaving(false);
    loadLinks();
  }

  async function handleDelete(id: number) {
    if (!confirm("确认删除这条记录？")) return;
    setMsg("");
    const { data, error } = await supabase
      .from("site_links")
      .delete()
      .eq("id", id)
      .select("id");
    if (error) {
      setMsg("删除失败: " + error.message);
      return;
    }
    if (!data || data.length === 0) {
      setMsg("删除失败: 未找到这条记录，或当前账号没有删除权限");
      return;
    }
    clearSiteLinksCache();
    setMsg("删除成功");
    loadLinks();
  }

  function startEdit(link: SiteLink) {
    setEditingId(link.id);
    setForm({ name: link.name, url: link.url, type: link.type });
    setMsg("");
  }

  function handleFilterChange(type: "all" | SiteLinkType) {
    setFilterType(type);
    if (type !== "all" && !editingId) {
      setForm((prev) => ({ ...prev, type }));
    } else if (type === "all" && !editingId) {
      setForm((prev) => ({ ...prev, type: getDefaultFormType(type) }));
    }
  }

  const filtered = filterType === "all" ? links : links.filter((l) => l.type === filterType);

  return (
    <div>
      <div
        className="site-links-header"
        style={{
          background: "rgba(255,255,255,0.94)",
          borderRadius: "10px",
          padding: "14px 16px",
          marginBottom: "16px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          border: "1px solid rgba(255,255,255,0.72)",
        }}
      >
        <h2 className="page-title" style={{ fontSize: "20px", fontWeight: 700, margin: "0 0 12px" }}>工具补丁 & 帮助中心 & 仓鼠话管理</h2>

        {/* 筛选 */}
        <div className="site-links-filter" style={{ display: "flex", gap: "8px" }}>
          {linkTypes.map((item) => (
            <button
              key={item.value}
              onClick={() => handleFilterChange(item.value)}
              style={{
                padding: "5px 14px",
                borderRadius: "6px",
                border: "1px solid",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 600,
                background: filterType === item.value ? "#9333ea" : "white",
                color: filterType === item.value ? "white" : "#666",
                borderColor: filterType === item.value ? "#9333ea" : "#ddd",
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* 添加/编辑表单 */}
      <div
        className="site-links-form"
        style={{
          background: "white",
          borderRadius: "10px",
          padding: "16px",
          marginBottom: "16px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        }}
      >
        <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "12px", color: "#333" }}>
          {editingId ? "编辑记录" : "添加记录"}
        </h3>
        <div className="site-links-form-row" style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as SiteLinkType })}
            className="site-links-select"
            style={{ padding: "7px 10px", borderRadius: "6px", border: "1px solid #ddd", fontSize: "13px" }}
          >
            <option value="tool">工具补丁</option>
            <option value="help">帮助中心</option>
            <option value="mascot">仓鼠话</option>
          </select>
          <input
            type="text"
            placeholder={form.type === "mascot" ? "标题，如：欢迎语" : "名称，如：WinRAR"}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="site-links-name-input"
            style={{ padding: "7px 10px", borderRadius: "6px", border: "1px solid #ddd", fontSize: "13px", width: "160px" }}
          />
          {form.type === "mascot" ? (
            <textarea
              placeholder="仓鼠要说的话..."
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              className="site-links-url-input"
              rows={2}
              style={{ padding: "7px 10px", borderRadius: "6px", border: "1px solid #ddd", fontSize: "13px", flex: 1, minWidth: "240px", resize: "vertical", lineHeight: 1.5 }}
            />
          ) : (
            <input
              type="url"
              placeholder="链接，如：https://"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              className="site-links-url-input"
              style={{ padding: "7px 10px", borderRadius: "6px", border: "1px solid #ddd", fontSize: "13px", flex: 1, minWidth: "200px" }}
            />
          )}
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
              onClick={() => { setEditingId(null); resetForm(); setMsg(""); }}
              style={{ padding: "7px 14px", borderRadius: "6px", background: "#f0f0f0", border: "1px solid #ddd", cursor: "pointer", fontSize: "13px" }}
            >
              取消
            </button>
          )}
        </div>
        {msg && (
          <p className="site-links-msg" style={{ marginTop: "8px", fontSize: "13px", color: msg.includes("成功") ? "#16a34a" : "#ef4444" }}>
            {msg}
          </p>
        )}
      </div>

      {/* 列表 */}
      {loading ? (
        <p style={{ color: "#888", textAlign: "center", padding: "40px" }}>加载中...</p>
      ) : filtered.length === 0 ? (
        <p style={{ color: "#888", textAlign: "center", padding: "40px" }}>暂无记录</p>
      ) : (
        <div className="game-table-wrapper">
          <table className="site-links-table" style={{ width: "100%", borderCollapse: "collapse", background: "white", borderRadius: "10px", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
            <thead>
              <tr style={{ background: "#f5f5f5" }}>
                <th style={{ padding: "10px 14px", textAlign: "left", fontSize: "13px", fontWeight: 600, color: "#555" }}>类型</th>
                <th style={{ padding: "10px 14px", textAlign: "left", fontSize: "13px", fontWeight: 600, color: "#555" }}>名称</th>
                <th style={{ padding: "10px 14px", textAlign: "left", fontSize: "13px", fontWeight: 600, color: "#555" }}>链接 / 话术内容</th>
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
                      background: typeStyles[link.type].background,
                      color: typeStyles[link.type].color,
                    }}>
                      {getTypeLabel(link.type)}
                    </span>
                  </td>
                  <td style={{ padding: "10px 14px", fontSize: "13px", color: "#333" }}>{link.name}</td>
                  <td style={{ padding: "10px 14px", fontSize: "12px" }}>
                    <div className="site-link-card-content">
                      {link.type === "mascot" ? (
                        <p className="site-link-card-text" style={{ margin: 0 }}>{link.url}</p>
                      ) : (
                        splitLinkContent(link.url).map((part, index) =>
                          isUrl(part) ? (
                            <a
                              key={`${link.id}-${part}-${index}`}
                              href={part}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="site-link-card-url"
                            >
                              <span>{getDriveLabel(part)}</span>
                              <small>{part}</small>
                            </a>
                          ) : (
                            <p key={`${link.id}-${part}-${index}`} className="site-link-card-text">
                              {part}
                            </p>
                          ),
                        )
                      )}
                    </div>
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
        </div>
      )}
    </div>
  );
}
