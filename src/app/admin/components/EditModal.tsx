"use client";

import { useState, useEffect, useRef } from "react";
import { supabase, Game } from "@/lib/supabase";
import { INPUT_STYLE, LABEL_STYLE } from "./constants";

interface EditModalProps {
  game: Game | null;
  onClose: () => void;
  onSaved: () => void;
}

interface FormData {
  name: string;
  category1: string;
  category2: string;
  subcategory1: string;
  subcategory2: string;
  code: string;
  unzipcode: string;
  quarkpan: string;
  baidupan: string;
  thunderpan: string;
  updatedate: string;
}

const UI_CAT_TO_DB: Record<string, string> = {
  PC: "PC",
  NS: "NS",
  PC及安卓: "PC",
  索尼: "索尼",
  其他平台: "Ohter",
  任天堂: "NS",
};

export default function EditModal({ game, onClose, onSaved }: EditModalProps) {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    category1: "",
    category2: "",
    subcategory1: "",
    subcategory2: "",
    code: "",
    unzipcode: "",
    quarkpan: "",
    baidupan: "",
    thunderpan: "",
    updatedate: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (game) {
      const cats = game.category || [];
      const subcats = game.subcategory || [];
      setFormData({
        name: game.name || "",
        category1: cats[0] || "",
        category2: cats[1] || "",
        subcategory1: subcats[0] || "",
        subcategory2: subcats[1] || "",
        code: game.code || "",
        unzipcode: game.unzipcode || "",
        quarkpan: game.quarkpan || "",
        baidupan: game.baidupan || "",
        thunderpan: game.thunderpan || "",
        updatedate: game.updatedate || "",
      });
    } else {
      setFormData({
        name: "",
        category1: "",
        category2: "",
        subcategory1: "",
        subcategory2: "",
        code: "",
        unzipcode: "",
        quarkpan: "",
        baidupan: "",
        thunderpan: "",
        updatedate: new Date().toLocaleDateString("zh-CN").replace(/\//g, "."),
      });
    }
  }, [game]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const category: string[] = [];
    if (formData.category1) {
      const dbCat = UI_CAT_TO_DB[formData.category1];
      if (dbCat) category.push(dbCat);
    }
    if (formData.category2) {
      const dbCat = UI_CAT_TO_DB[formData.category2];
      if (dbCat && !category.includes(dbCat)) category.push(dbCat);
    }

    const subcategory: string[] = [];
    if (formData.subcategory1) subcategory.push(formData.subcategory1);
    if (formData.subcategory2) subcategory.push(formData.subcategory2);

    const gameData = {
      name: formData.name,
      category,
      subcategory,
      code: formData.code,
      unzipcode: formData.unzipcode,
      quarkpan: formData.quarkpan,
      baidupan: formData.baidupan,
      thunderpan: formData.thunderpan,
      updatedate: formData.updatedate,
    };

    try {
      if (game) {
        const { error } = await supabase
          .from("games")
          .update(gameData)
          .eq("id", game.id);
        if (error) throw error;
        alert("更新成功");
      } else {
        const { error } = await supabase.from("games").insert([gameData]);
        if (error) throw error;
        alert("添加成功");
      }
      onSaved();
    } catch (err: any) {
      alert("操作失败: " + err.message);
    }

    setSaving(false);
  }

  return (
    <div className="popup-mask" style={{ display: "flex" }} onClick={onClose}>
      <div
        className="popup-content"
        style={{ maxWidth: 620 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
            paddingBottom: 15,
            borderBottom: "1px solid var(--border-light)",
          }}
        >
          <h2
            style={{
              fontSize: "18px",
              fontWeight: 700,
              background:
                "linear-gradient(90deg, var(--primary-color), var(--accent-color))",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            {game ? "编辑游戏" : "添加游戏"}
          </h2>
          <button onClick={onClose} className="close-btn">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "14px" }}>
            <label style={LABEL_STYLE}>游戏名称 *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
              style={INPUT_STYLE}
            />
          </div>

          <div style={{ display: "flex", gap: "12px", marginBottom: "14px" }}>
            <div style={{ flex: 1 }}>
              <label style={LABEL_STYLE}>主分类 1</label>
              <select
                value={formData.category1}
                onChange={(e) =>
                  setFormData({ ...formData, category1: e.target.value })
                }
                style={INPUT_STYLE}
              >
                <option value="">选择分类</option>
                <option value="PC及安卓">PC及安卓</option>
                <option value="任天堂">任天堂</option>
                <option value="索尼">索尼</option>
                <option value="其他平台">其他平台</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={LABEL_STYLE}>主分类 2</label>
              <select
                value={formData.category2}
                onChange={(e) =>
                  setFormData({ ...formData, category2: e.target.value })
                }
                style={INPUT_STYLE}
              >
                <option value="">无</option>
                <option value="PC及安卓">PC及安卓</option>
                <option value="任天堂">任天堂</option>
                <option value="索尼">索尼</option>
                <option value="其他平台">其他平台</option>
              </select>
            </div>
          </div>

          <div style={{ display: "flex", gap: "12px", marginBottom: "14px" }}>
            <div style={{ flex: 1 }}>
              <label style={LABEL_STYLE}>子分类 1</label>
              <input
                type="text"
                value={formData.subcategory1}
                onChange={(e) =>
                  setFormData({ ...formData, subcategory1: e.target.value })
                }
                placeholder="如: NS, PS4, RPG"
                style={INPUT_STYLE}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={LABEL_STYLE}>子分类 2</label>
              <input
                type="text"
                value={formData.subcategory2}
                onChange={(e) =>
                  setFormData({ ...formData, subcategory2: e.target.value })
                }
                placeholder="如: 动作, 冒险"
                style={INPUT_STYLE}
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: "12px", marginBottom: "14px" }}>
            <div style={{ flex: 1 }}>
              <label style={LABEL_STYLE}>提取码</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value })
                }
                style={INPUT_STYLE}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={LABEL_STYLE}>解压密码</label>
              <input
                type="text"
                value={formData.unzipcode}
                onChange={(e) =>
                  setFormData({ ...formData, unzipcode: e.target.value })
                }
                style={INPUT_STYLE}
              />
            </div>
          </div>

          <div style={{ marginBottom: "14px" }}>
            <label style={LABEL_STYLE}>夸克网盘链接</label>
            <input
              type="url"
              value={formData.quarkpan}
              onChange={(e) =>
                setFormData({ ...formData, quarkpan: e.target.value })
              }
              placeholder="https://pan.quark.cn/s/..."
              style={INPUT_STYLE}
            />
          </div>

          <div style={{ marginBottom: "14px" }}>
            <label style={LABEL_STYLE}>百度网盘链接</label>
            <input
              type="url"
              value={formData.baidupan}
              onChange={(e) =>
                setFormData({ ...formData, baidupan: e.target.value })
              }
              placeholder="https://pan.baidu.com/s/..."
              style={INPUT_STYLE}
            />
          </div>

          <div style={{ marginBottom: "14px" }}>
            <label style={LABEL_STYLE}>迅雷网盘链接</label>
            <input
              type="url"
              value={formData.thunderpan}
              onChange={(e) =>
                setFormData({ ...formData, thunderpan: e.target.value })
              }
              placeholder="https://pan.xunlei.com/s/..."
              style={INPUT_STYLE}
            />
          </div>

          <div style={{ marginBottom: "14px" }}>
            <label style={LABEL_STYLE}>更新日期</label>
            <input
              type="text"
              value={formData.updatedate}
              onChange={(e) =>
                setFormData({ ...formData, updatedate: e.target.value })
              }
              placeholder="2026.3.23"
              style={INPUT_STYLE}
            />
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px",
              marginTop: "20px",
              paddingTop: "15px",
              borderTop: "1px solid var(--border-light)",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              style={{
                padding: "9px 20px",
                background: "rgba(255,255,255,0.9)",
                color: "var(--text-secondary)",
                border: "1px solid var(--border-light)",
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
                fontSize: "13px",
              }}
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: "9px 24px",
                background:
                  "linear-gradient(90deg, var(--success-color), var(--primary-color))",
                color: "white",
                border: "none",
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 600,
                boxShadow: "0 3px 8px rgba(129,199,132,0.3)",
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? "保存中..." : "保存"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
